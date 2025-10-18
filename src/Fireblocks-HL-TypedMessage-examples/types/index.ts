import BN from "bignumber.js";

/**
 * Configuration for FireblocksEip712Signer
 */
export interface FireblocksSignerConfig {
  apiKey: string;
  secretKeyPath: string;
  vaultAccountId: number;
  apiBaseUrl: string;
}

/**
 * Transaction result returned by adapter methods
 * Matches the shape from existing HyperLiquidAdapter
 */
export interface TxResult {
  hash: string;
  gasUsed: BN;
  outputAmount: BN;
}
