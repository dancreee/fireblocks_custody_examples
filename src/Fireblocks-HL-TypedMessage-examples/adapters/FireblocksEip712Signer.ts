import { ethers } from "ethers";
import { Fireblocks, TransactionOperation, TransactionStateEnum, TransactionRequest, TransferPeerPathType } from "@fireblocks/ts-sdk";
import { readFileSync } from "fs";
import * as path from "path";
import { FireblocksSignerConfig } from "../types";

/**
 * FireblocksEip712Signer
 *
 * An ethers.js Signer implementation that routes EIP-712 typed data signing
 * through Fireblocks TYPED_MESSAGE operations. This allows Hyperliquid
 * off-chain signatures to be created using Fireblocks custody.
 *
 * Key features:
 * - Derives address from Fireblocks vault automatically
 * - Signs EIP-712 messages via Fireblocks API
 * - Polls for signature completion
 */
export class FireblocksEip712Signer implements ethers.Signer {
  private fireblocks: Fireblocks;
  private vaultAccountId: number;
  private address?: string;

  // Required by ethers.Signer interface
  // We don't use a blockchain provider since Hyperliquid is its own L1
  // and Fireblocks handles all signing
  provider: null = null;

  constructor(config: FireblocksSignerConfig) {
    // Initialize Fireblocks SDK
    const secretKey = readFileSync(path.resolve(config.secretKeyPath), "utf8");
    this.fireblocks = new Fireblocks({
      apiKey: config.apiKey,
      basePath: config.apiBaseUrl,
      secretKey: secretKey,
    });

    this.vaultAccountId = config.vaultAccountId;
  }

  /**
   * Get the Ethereum address for this signer.
   * Derives the address from Fireblocks vault account (ETH asset).
   * The same address works for Ethereum, Arbitrum and Hyperliquid.
   */
  async getAddress(): Promise<string> {
    if (this.address) {
      return this.address;
    }

    try {
      // Use the paginated addresses API to get vault addresses
      const response = await this.fireblocks.vaults.getVaultAccountAssetAddressesPaginated({
        vaultAccountId: this.vaultAccountId.toString(),
        assetId: "ETH",
      });

      const addresses = response.data.addresses;
      if (!addresses || addresses.length === 0) {
        throw new Error(
          `No ETH addresses found for vault account ${this.vaultAccountId}. ` +
          `Ensure ETH asset is activated in Fireblocks.`
        );
      }

      this.address = addresses[0].address;

      if (!this.address) {
        throw new Error(`ETH address exists but has no value for vault ${this.vaultAccountId}`);
      }

      return this.address;
    } catch (error: any) {
      throw new Error(`Failed to derive address from Fireblocks: ${error.message || error}`);
    }
  }

  /**
   * Sign typed data (EIP-712) via Fireblocks TYPED_MESSAGE operation.
   * This is the public method required by ethers.Signer interface.
   *
   * @param domain - EIP-712 domain (e.g., { name: "Exchange", chainId: 1337 })
   * @param types - EIP-712 types definition
   * @param message - The message to sign
   * @returns 65-byte signature as hex string with 0x prefix
   */
  async signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    message: Record<string, any>
  ): Promise<string> {
    const address = await this.getAddress();

    const note = this.generateTransactionNote(domain, message);
    const typedDataObject = this.buildTypedDataObject(domain, types, message);

    try {
      // Create Fireblocks TYPED_MESSAGE transaction
      const transactionRequest: TransactionRequest = {
        operation: TransactionOperation.TypedMessage,
        source: {
          type: TransferPeerPathType.VaultAccount,
          id: this.vaultAccountId.toString(),
        },
        assetId: "ETH", // ETH should always be used in FB for typed message signing
        note: note,
        extraParameters: {
          rawMessageData: {
            messages: [
              {
                content: typedDataObject,
                type: "EIP712",
              },
            ],
          },
        },
      };

      const createResponse = await this.fireblocks.transactions.createTransaction({
        transactionRequest,
      });

      const txId = createResponse.data.id!;
      const signature = await this.pollForSignature(txId);
      return signature;
    } catch (error: any) {
      const details = this.formatFireblocksError(error);
      throw new Error(`Fireblocks signing failed: ${details}`);
    }
  }

  /**
   * Poll Fireblocks transaction until COMPLETED status.
   */
  private async pollForSignature(txId: string): Promise<string> {
    const pollInterval = 5000; // 5 seconds
    const maxAttempts = 120; // 10 minutes max (5s * 120 = 600s)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(pollInterval);

      const response = await this.fireblocks.transactions.getTransaction({ txId });
      const txInfo: any = response.data;
      const status = txInfo.status;

      if (status === TransactionStateEnum.Completed) {
        const signedMessages = (txInfo as any).signedMessages;
        if (!signedMessages || signedMessages.length === 0) {
          throw new Error("Transaction completed but no signed messages found");
        }

        const sig = signedMessages[0]?.signature;
        if (!sig || typeof sig !== "object") {
          throw new Error(`Invalid signature format from Fireblocks: expected object, got ${typeof sig}`);
        }

        // Fireblocks returns { r, s, v, fullSig }
        // fullSig is 64 bytes (128 hex chars), v needs to be appended
        const fullSig = sig.fullSig;
        if (typeof fullSig !== "string" || fullSig.length !== 128) {
          throw new Error(`Invalid fullSig from Fireblocks: expected 128 hex chars, got ${fullSig?.length || 0}`);
        }

        // v is 0 or 1, normalize to 27 or 28 for EIP-712
        const v = typeof sig.v === "number" ? sig.v : 0;
        const vNormalized = v + 27;
        const vHex = vNormalized.toString(16);

        const normalized = `0x${fullSig}${vHex}`;
        if (normalized.length !== 132) {
          throw new Error(`Invalid signature length: expected 132 chars (0x + 130 hex), got ${normalized.length}`);
        }
        return normalized;
      }

      if (
        status === TransactionStateEnum.Failed ||
        status === TransactionStateEnum.Cancelled ||
        status === TransactionStateEnum.Blocked
      ) {
        const sub = txInfo.subStatus || 'No subStatus';
        const sysMsgs = (txInfo as any).systemMessages;
        const sys = Array.isArray(sysMsgs) && sysMsgs.length > 0 ? ` | systemMessages: ${sysMsgs.join('; ')}` : '';
        throw new Error(`Transaction ${status.toLowerCase()}: ${sub}${sys}`);
      }

      // Continue polling for other states (SUBMITTED, PENDING_SIGNATURE, etc.)
    }

    throw new Error(`Signature polling timeout after ${maxAttempts * pollInterval / 1000} seconds`);
  }

  private generateTransactionNote(domain: ethers.TypedDataDomain, message: Record<string, any>): string {
    const domainName = domain.name || "Unknown";

    // Note: @nktkas/hyperliquid hashes the action data into message.connectionId,
    // so the actual order/withdrawal details are not available in the EIP-712 message.
    // The message only contains { source: "a", connectionId: hash(action) }

    // For L1 actions (orders, cancels, etc), the message structure is:
    // { source: "a" | "b", connectionId: bytes32 }
    // The connectionId is a hash that includes the action, nonce, and optionally vault/expiry

    if (message.connectionId) {
      const connId = message.connectionId.toString().substring(0, 10);
      return `HL L1 action signature (${domainName}, id: ${connId}...)`;
    }

    return `HL EIP-712 signature: ${domainName}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private buildTypedDataObject(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    message: Record<string, any>
  ): { types: Record<string, ethers.TypedDataField[]>; domain: ethers.TypedDataDomain; primaryType: string; message: Record<string, any> } {
    const domainType: ethers.TypedDataField[] = [];
    if (domain.name !== undefined) domainType.push({ name: "name", type: "string" });
    if (domain.version !== undefined) domainType.push({ name: "version", type: "string" });
    if (domain.chainId !== undefined) domainType.push({ name: "chainId", type: "uint256" });
    if ((domain as any).verifyingContract !== undefined) domainType.push({ name: "verifyingContract", type: "address" });
    if ((domain as any).salt !== undefined) domainType.push({ name: "salt", type: "bytes32" });

    const typesWithDomain: Record<string, ethers.TypedDataField[]> = types.EIP712Domain
      ? types
      : { ...types, EIP712Domain: domainType };

    const primaryType = Object.keys(typesWithDomain).find((t) => t !== "EIP712Domain") || "EIP712Domain";

    return { types: typesWithDomain, domain, primaryType, message };
  }

  private formatFireblocksError(error: any): string {
    return error?.message || String(error);
  }

  // Required ethers.Signer methods (not used for HL, throw errors)

  async signTransaction(transaction: ethers.TransactionRequest): Promise<string> {
    throw new Error("signTransaction not supported - use signTypedData for Hyperliquid");
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    throw new Error("signMessage not supported - use signTypedData for Hyperliquid");
  }

  connect(provider: ethers.Provider): ethers.Signer {
    throw new Error("connect not supported - FireblocksSigner is provider-less");
  }

  async getNonce(blockTag?: ethers.BlockTag): Promise<number> {
    throw new Error("getNonce not supported - Hyperliquid manages nonces internally");
  }

  async populateCall(tx: ethers.TransactionRequest): Promise<ethers.TransactionLike> {
    throw new Error("populateCall not supported - use signTypedData for Hyperliquid");
  }

  async populateTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionLike> {
    throw new Error("populateTransaction not supported - use signTypedData for Hyperliquid");
  }

  async estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    throw new Error("estimateGas not supported - Hyperliquid has no gas");
  }

  async call(tx: ethers.TransactionRequest): Promise<string> {
    throw new Error("call not supported - use signTypedData for Hyperliquid");
  }

  async resolveName(name: string): Promise<null | string> {
    throw new Error("resolveName not supported");
  }

  async sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    throw new Error("sendTransaction not supported - use signTypedData for Hyperliquid");
  }

  async populateAuthorization(authorization: any): Promise<any> {
    throw new Error("populateAuthorization not supported");
  }

  async authorize(authorization: ethers.AuthorizationRequest): Promise<ethers.Authorization> {
    throw new Error("authorize not supported");
  }
}
