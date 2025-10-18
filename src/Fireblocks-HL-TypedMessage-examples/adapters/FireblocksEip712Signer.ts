import { ethers } from "ethers";
import {
  Fireblocks,
  TransactionOperation,
  TransactionStateEnum,
  TransactionRequest,
  TransferPeerPathType,
} from "@fireblocks/ts-sdk";
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
export class FireblocksEip712Signer extends ethers.Signer {
  private static readonly POLL_INTERVAL_MS = 5000;
  private static readonly MAX_POLL_ATTEMPTS = 120; // 10 minutes max

  private fireblocks: Fireblocks;
  private vaultAccountId: number;
  private address?: string;

  constructor(config: FireblocksSignerConfig) {
    super();

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
   * Derives address from Fireblocks vault ETH asset.
   * Works for Ethereum, Arbitrum, and Hyperliquid.
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
      if (!addresses || addresses.length === 0 || !addresses[0].address) {
        throw new Error(
          `No ETH addresses found for vault account ${this.vaultAccountId}. ` +
            `Ensure ETH asset is activated in Fireblocks.`
        );
      }

      this.address = addresses[0].address;
      return this.address;
    } catch (error: any) {
      throw new Error(`Failed to derive address from Fireblocks: ${error.message || error}`);
    }
  }

  /**
   * Signs EIP-712 typed data via Fireblocks TYPED_MESSAGE operation.
   * Polls until signature is approved/rejected on Fireblocks mobile.
   * Returns 65-byte signature (0x-prefixed).
   */
  async _signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    message: Record<string, any>
  ): Promise<string> {
    const typedDataObject = this.buildTypedDataObject(domain, types, message);

    try {
      // Create Fireblocks TYPED_MESSAGE transaction
      const transactionRequest: TransactionRequest = {
        operation: TransactionOperation.TypedMessage,
        source: {
          type: TransferPeerPathType.VaultAccount,
          id: this.vaultAccountId.toString(),
        },
        assetId: "ETH", // ETH should always be used in Fireblocks for typed message signing
        note: `HL ${domain.name || "EIP-712"} signature`,
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
      throw new Error(`Fireblocks signing failed: ${error?.message || error}`);
    }
  }

  /**
   * Polls Fireblocks tx until COMPLETED/FAILED/CANCELLED.
   * Max 10 minutes (120 attempts * 5s interval).
   */
  private async pollForSignature(txId: string): Promise<string> {
    for (let attempt = 0; attempt < FireblocksEip712Signer.MAX_POLL_ATTEMPTS; attempt++) {
      await this.sleep(FireblocksEip712Signer.POLL_INTERVAL_MS);

      const response = await this.fireblocks.transactions.getTransaction({ txId });
      const txInfo: any = response.data;
      const status = txInfo.status;

      if (status === TransactionStateEnum.Completed) {
        const signedMessages = (txInfo as any).signedMessages;
        if (!signedMessages || signedMessages.length === 0) {
          throw new Error("Transaction completed but no signed messages found");
        }
        return this.normalizeSignature(signedMessages[0]?.signature);
      }

      if (
        status === TransactionStateEnum.Failed ||
        status === TransactionStateEnum.Cancelled ||
        status === TransactionStateEnum.Blocked
      ) {
        const details = [txInfo.subStatus || "No subStatus"];
        const sysMsgs = (txInfo as any).systemMessages;
        if (Array.isArray(sysMsgs) && sysMsgs.length > 0) {
          details.push(sysMsgs.join("; "));
        }
        throw new Error(`Transaction ${status.toLowerCase()}: ${details.join(" | ")}`);
      }

      // Continue polling for other states (SUBMITTED, PENDING_SIGNATURE, etc.)
    }

    const timeoutSeconds =
      (FireblocksEip712Signer.MAX_POLL_ATTEMPTS * FireblocksEip712Signer.POLL_INTERVAL_MS) / 1000;
    throw new Error(`Signature polling timeout after ${timeoutSeconds} seconds`);
  }

  /**
   * Normalizes Fireblocks sig to EIP-712 format (65 bytes, v=27/28).
   */
  private normalizeSignature(sig: any): string {
    if (!sig || typeof sig !== "object") {
      throw new Error(
        `Invalid signature format from Fireblocks: expected object, got ${typeof sig}`
      );
    }

    // Fireblocks returns { r, s, v, fullSig }
    const fullSig = sig.fullSig;
    if (typeof fullSig !== "string" || fullSig.length !== 128) {
      throw new Error(
        `Invalid fullSig from Fireblocks: expected 128 hex chars, got ${fullSig?.length || 0}`
      );
    }

    // v is 0 or 1, normalize to 27 or 28 for EIP-712
    const v = typeof sig.v === "number" ? sig.v : 0;
    if (v !== 0 && v !== 1) {
      throw new Error(`Invalid signature v value: expected 0 or 1, got ${v}`);
    }

    const vNormalized = v + 27;
    const vHex = vNormalized.toString(16);
    const normalized = `0x${fullSig}${vHex}`;

    if (normalized.length !== 132) {
      throw new Error(
        `Invalid signature length: expected 132 chars (0x + 130 hex), got ${normalized.length}`
      );
    }

    return normalized;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildTypedDataObject(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    message: Record<string, any>
  ): {
    types: Record<string, ethers.TypedDataField[]>;
    domain: ethers.TypedDataDomain;
    primaryType: string;
    message: Record<string, any>;
  } {
    const domainType: ethers.TypedDataField[] = [];
    if (domain.name !== undefined) domainType.push({ name: "name", type: "string" });
    if (domain.version !== undefined) domainType.push({ name: "version", type: "string" });
    if (domain.chainId !== undefined) domainType.push({ name: "chainId", type: "uint256" });
    if ((domain as any).verifyingContract !== undefined)
      domainType.push({ name: "verifyingContract", type: "address" });
    if ((domain as any).salt !== undefined) domainType.push({ name: "salt", type: "bytes32" });

    const typesWithDomain: Record<string, ethers.TypedDataField[]> = types.EIP712Domain
      ? types
      : { ...types, EIP712Domain: domainType };

    const primaryType =
      Object.keys(typesWithDomain).find((t) => t !== "EIP712Domain") || "EIP712Domain";

    return { types: typesWithDomain, domain, primaryType, message };
  }

  // Required ethers.Signer abstract methods (must implement, throw errors for unsupported)

  async signTransaction(transaction: ethers.providers.TransactionRequest): Promise<string> {
    throw new Error("signTransaction not supported - use _signTypedData for Hyperliquid");
  }

  async signMessage(message: string | Uint8Array): Promise<string> {
    throw new Error("signMessage not supported - use _signTypedData for Hyperliquid");
  }

  connect(provider: ethers.providers.Provider): ethers.Signer {
    throw new Error("connect not supported - FireblocksSigner is provider-less");
  }

  // Override concrete ethers.Signer methods to prevent misuse
  // These methods have default implementations in the parent class that require a provider,
  // but Hyperliquid is not EVM-compatible and doesn't use these operations

  async getBalance(blockTag?: ethers.providers.BlockTag): Promise<ethers.BigNumber> {
    throw new Error("getBalance not supported - Hyperliquid is not EVM-compatible");
  }

  async getTransactionCount(blockTag?: ethers.providers.BlockTag): Promise<number> {
    throw new Error("getTransactionCount not supported - Hyperliquid manages nonces internally");
  }

  async estimateGas(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>
  ): Promise<ethers.BigNumber> {
    throw new Error("estimateGas not supported - Hyperliquid has no gas fees");
  }

  async call(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>,
    blockTag?: ethers.providers.BlockTag
  ): Promise<string> {
    throw new Error("call not supported - use _signTypedData for Hyperliquid");
  }

  async sendTransaction(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>
  ): Promise<ethers.providers.TransactionResponse> {
    throw new Error("sendTransaction not supported - use _signTypedData for Hyperliquid");
  }

  async getChainId(): Promise<number> {
    throw new Error("getChainId not supported - Hyperliquid is not EVM-compatible");
  }

  async getGasPrice(): Promise<ethers.BigNumber> {
    throw new Error("getGasPrice not supported - Hyperliquid has no gas fees");
  }

  async getFeeData(): Promise<ethers.providers.FeeData> {
    throw new Error("getFeeData not supported - Hyperliquid has no gas fees");
  }

  async resolveName(name: string): Promise<string> {
    throw new Error("resolveName not supported - ENS not available on Hyperliquid");
  }

  checkTransaction(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>
  ): ethers.utils.Deferrable<ethers.providers.TransactionRequest> {
    throw new Error("checkTransaction not supported - use _signTypedData for Hyperliquid");
  }

  async populateTransaction(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>
  ): Promise<ethers.providers.TransactionRequest> {
    throw new Error("populateTransaction not supported - use _signTypedData for Hyperliquid");
  }
}
