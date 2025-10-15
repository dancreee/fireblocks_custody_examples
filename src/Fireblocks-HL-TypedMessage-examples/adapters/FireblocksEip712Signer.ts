import { ethers } from "ethers";
import { Fireblocks, TransactionOperation, TransactionStateEnum, TransactionRequest, TransferPeerPathType } from "@fireblocks/ts-sdk";
import crypto from "crypto";
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
 * - Assembles 65-byte signatures from r, s, v components
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

    // Generate human-readable note for Fireblocks audit trail
    const note = this.generateTransactionNote(domain, message);

    // Build a full EIP-712 object (domain/types/primaryType/message)
    const typedDataObject = this.buildTypedDataObject(domain, types, message);

    // Basic logging per implementation plan
    const domainName = domain.name || "Unknown";
    const chainId = domain.chainId || "Unknown";
    console.log(`[FB-Signer] signTypedData → domain=${domainName} chainId=${chainId} addr=${address}`);

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

      // Poll for completion
      const txId = createResponse.data.id!;
      console.log(`[FB-Signer] created txId=${txId}`);
      const signature = await this.pollForSignature(txId);
      console.log(`[FB-Signer] COMPLETED txId=${txId}`);
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

      let txInfo: any;
      try {
        const response = await this.fireblocks.transactions.getTransaction({ txId });
        txInfo = response.data;
      } catch (err: any) {
        const details = this.formatFireblocksError(err);
        console.log(`[FB-Signer] polling error txId=${txId} → ${details}`);
        continue; // transient poll error; try again
      }
      const status = txInfo.status;

      if (status === TransactionStateEnum.Completed) {
        // Extract signature from signedMessages
        const signedMessages = (txInfo as any).signedMessages;
        if (!signedMessages || signedMessages.length === 0) {
          throw new Error("Transaction completed but no signed messages found");
        }

        const fbSigContainer = signedMessages[0];
        const normalized = this.normalizeSignatureFromFireblocks(fbSigContainer);
        if (!normalized) {
          const availableKeys = Object.keys(fbSigContainer || {}).join(",");
          throw new Error(`Invalid signature format from Fireblocks (keys: ${availableKeys})`);
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

      // Periodic status log to aid debugging
      if (attempt % 3 === 0) {
        console.log(`[FB-Signer] polling txId=${txId} status=${status}`);
      }

      // Continue polling for other states (SUBMITTED, PENDING_SIGNATURE, etc.)
    }

    throw new Error(`Signature polling timeout after ${maxAttempts * pollInterval / 1000} seconds`);
  }

  /**
   * Generate human-readable note for Fireblocks transaction audit trail.
   * Examples: "HL order: ETH-PERP buy 0.5" or "HL withdrawal: 10 USDC"
   */
  private generateTransactionNote(domain: ethers.TypedDataDomain, message: Record<string, any>): string {
    const domainName = domain.name || "Unknown";

    // Try to extract meaningful info from message
    if (message.action) {
      const action = message.action;
      if (action.type === "order" && action.orders) {
        const order = action.orders[0];
        const side = order.isBuy ? "buy" : "sell";
        const coin = order.coin || "unknown";
        const size = order.sz || "unknown";
        return `HL order: ${coin} ${side} ${size}`;
      }
      if (action.type === "withdraw3" || action.type === "withdraw") {
        const amount = action.amount || action.usd || "unknown";
        return `HL withdrawal: ${amount} USDC`;
      }
    }

    // Fallback
    return `HL EIP-712 signature: ${domainName}`;
  }

  /**
   * Sleep helper for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Build a well-formed EIP-712 object ensuring EIP712Domain exists when missing.
   */
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

  /**
   * Normalize Fireblocks signature shapes to a 65-byte 0x-prefixed hex string.
   * Accepts r/s/v objects, fullSig, or raw hex string (64-byte or 65-byte).
   */
  private normalizeSignatureFromFireblocks(signedMessageEntry: any): string | null {
    if (!signedMessageEntry) return null;
    const sig = signedMessageEntry.signature;

    // Case 1: signature is already a hex string
    if (typeof sig === "string") {
      const normalized = this.ensureHexWith0x(sig);
      // If it's 64 bytes (128 hex chars + 0x), add default v=27
      if (normalized.length === 130) {
        return `${normalized}1b`; // 27 in hex
      }
      return normalized;
    }

    // Case 2: fullSig provided
    if (sig && typeof sig.fullSig === "string") {
      const normalized = this.ensureHexWith0x(sig.fullSig);
      // If it's 64 bytes (128 hex chars + 0x), add default v=27
      if (normalized.length === 130) {
        return `${normalized}1b`; // 27 in hex
      }
      return normalized;
    }

    // Case 3: r/s/v provided (or just r/s)
    if (sig && (sig.r || sig.s)) {
      const r = this.strip0x(sig.r || "").padStart(64, "0");
      const s = this.strip0x(sig.s || "").padStart(64, "0");

      let vNum: number;
      if (sig.v !== undefined) {
        // v is explicitly provided
        if (typeof sig.v === "string") {
          vNum = sig.v.startsWith("0x") ? parseInt(sig.v, 16) : parseInt(sig.v, 10);
        } else {
          vNum = Number(sig.v);
        }
        if (!Number.isFinite(vNum)) {
          // Invalid v, use default
          vNum = 27;
        }
      } else {
        // v not provided, use default for EIP-712
        vNum = 27;
      }

      const vHex = vNum.toString(16).padStart(2, "0");
      const combined = `0x${r}${s}${vHex}`;

      // Strict validation: signature must be exactly 132 chars (0x + 130 hex chars = 65 bytes)
      if (combined.length !== 132) {
        throw new Error(
          `Invalid signature length: expected 132 chars (0x + 130 hex), got ${combined.length}. ` +
          `Signature: ${combined}`
        );
      }
      return combined;
    }

    return null;
  }

  private ensureHexWith0x(value: string): string {
    return value.startsWith("0x") ? value : `0x${value}`;
  }

  private strip0x(value: string): string {
    return value && value.startsWith("0x") ? value.slice(2) : value || "";
  }

  /**
   * Best-effort extraction of useful error details from Fireblocks SDK/HTTP client errors.
   */
  private formatFireblocksError(error: any): string {
    try {
      // Axios-like shape
      const status = error?.response?.status;
      const statusText = error?.response?.statusText;
      const data = error?.response?.data;
      const message = error?.message || error?.toString?.() || "Unknown error";
      if (status || data) {
        const body = typeof data === "string" ? data : JSON.stringify(data);
        return `[${status || ""} ${statusText || ""}] ${message} ${body ? `- body: ${body}` : ""}`.trim();
      }
      // Fetch-like shape
      const fbCode = error?.code || error?.name;
      const fbMsg = error?.message;
      if (fbCode || fbMsg) {
        return `${fbCode || ""} ${fbMsg || ""}`.trim();
      }
      return message;
    } catch {
      return error?.message || "Unexpected error";
    }
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
