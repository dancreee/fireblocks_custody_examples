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
      const ethInfo: any = await this.getPerpInfo(HL_ASSET_INDICES.ETH);
      const exchangeClient = await this.ensureExchangeClient();

      // Determine order direction: positive amount = long, negative = short
      const isLong = amount.isPositive();
      const size = amount.abs().decimalPlaces(4).toString();

      // Apply slippage: buy higher, sell lower
      const slippageFactor = isLong ? 1.005 : 0.995;
      const limitPrice = new BigNumber(ethInfo.markPx)
        .times(slippageFactor)
        .decimalPlaces(1)
        .toString();

      const res = await exchangeClient.order({
        orders: [
          {
            a: HL_ASSET_INDICES.ETH,
            b: isLong, // true = buy/long, false = sell/short
            p: limitPrice,
            s: size,
            r: false,
            t: { limit: { tif: "Ioc" } },
          },
        ],
        grouping: "na",
      });

      // Check for errors and throw them if found
      for (const status of res.response.data.statuses) {
        if ("error" in status) {
          throw new Error((status as { error: string }).error);
        }
      }

      return {
        hash: "",
        gasUsed: new BigNumber(0),
        outputAmount: amount,
      };
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

  private async ensureExchangeClient(): Promise<hl.ExchangeClient> {
    if (this.exchangeClient) {
      return this.exchangeClient;
    }

    // Initialize ExchangeClient with Fireblocks signer
    this.exchangeClient = new hl.ExchangeClient({
      wallet: this.signer,
      transport: new hl.HttpTransport(),
    });

    return this.exchangeClient;
  }
}
