import BigNumber from "bignumber.js";
import * as hl from "@nktkas/hyperliquid";
import { FireblocksEip712Signer } from "./FireblocksEip712Signer";
import { FireblocksSignerConfig, TxResult } from "../types";

export enum HL_ASSET_INDICES {
  BTC = 0,
  ETH = 1,
  HYPE = 159,
}

/**
 * HyperliquidAdapter with Fireblocks custody
 */
export class HyperliquidAdapter {
  private account: string | null = null;
  private signer: FireblocksEip712Signer;
  private infoClient: hl.InfoClient;
  private exchangeClient: hl.ExchangeClient | null = null;

  constructor(fbSignerOpts: FireblocksSignerConfig) {
    this.signer = new FireblocksEip712Signer(fbSignerOpts);

    // Initialize InfoClient for read-only operations
    this.infoClient = new hl.InfoClient({
      transport: new hl.HttpTransport(),
    });
  }

  /**
   * Get the Hyperliquid account address (derived from Fireblocks vault)
   */
  async getAddress(): Promise<string> {
    if (this.account) {
      return this.account;
    }
    this.account = await this.signer.getAddress();
    return this.account;
  }

  async getAccountInfo() {
    const account = await this.getAddress();
    const accountState = await this.infoClient.clearinghouseState({ user: account });
    return accountState;
  }

  async getPerpMarkets() {
    const [meta, contexts] = await this.infoClient.metaAndAssetCtxs();
    return [meta.universe, contexts];
  }

  async getPerpInfo(index: HL_ASSET_INDICES) {
    const [meta, contexts] = await this.getPerpMarkets();
    if (index < 0 || index >= meta.length) {
      throw new Error(`Invalid market index ${index}`);
    }
    return contexts[index];
  }

  async getOpenOrders() {
    const account = await this.getAddress();
    const orders = await this.infoClient.frontendOpenOrders({ user: account });
    return orders;
  }

  async adjustExposure(amount: BigNumber): Promise<TxResult> {
    try {
      const ethInfo = await this.getPerpInfo(HL_ASSET_INDICES.ETH);
      const exchangeClient = await this.ensureExchangeClient();

      // TODO: Implement order placement with Fireblocks signing
      // This will be implemented in Stage 5
      throw new Error("adjustExposure not yet implemented (Stage 5)");
    } catch (e) {
      throw e;
    }
  }

  async initiateWithdrawal(amount: BigNumber): Promise<TxResult> {
    try {
      const exchangeClient = await this.ensureExchangeClient();

      // TODO: Implement withdrawal with Fireblocks signing
      // This will be implemented in Stage 6
      throw new Error("initiateWithdrawal not yet implemented (Stage 6)");
    } catch (e) {
      throw e;
    }
  }

  async closeConnection() {
    // No-op for now
  }

  private async ensureExchangeClient(): Promise<hl.ExchangeClient> {
    if (this.exchangeClient) {
      return this.exchangeClient;
    }

    // Stage 5: Initialize ExchangeClient with Fireblocks signer
    throw new Error("ExchangeClient initialization not yet implemented (Stage 5)");
  }
}
