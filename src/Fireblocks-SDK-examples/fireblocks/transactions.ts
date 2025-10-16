import { Fireblocks, TransferPeerPathType, CreateTransactionResponse } from "@fireblocks/ts-sdk";
import { TransactionDestination } from "../types";

/**
 * Creates a transaction to transfer assets from a vault account to various destination types.
 *
 * Supports three types of destinations:
 * - Vault account (internal transfer between vaults)
 * - External wallet (whitelisted external wallet)
 * - One-time address (ad-hoc external address)
 *
 * @param {Fireblocks} fireblocks - The initialized Fireblocks SDK client
 * @param {string} assetId - The asset identifier (e.g., "ETH_TEST5", "BTC", "USDC")
 * @param {string} amount - The amount to transfer as a string (e.g., "0.001")
 * @param {string} srcVaultId - The source vault account ID
 * @param {TransactionDestination} destination - The destination configuration
 * @param {string} destination.vaultId - Target vault account ID (for internal transfers)
 * @param {string} destination.externalWalletId - External wallet ID (for whitelisted wallets)
 * @param {string} destination.oneTimeAddress - External address (for one-time transfers)
 * @param {string} [note] - Optional transaction note (defaults to "Transaction created via Fireblocks SDK")
 * @returns {Promise<CreateTransactionResponse>} The transaction result from the Fireblocks API
 * @throws {Error} If no valid destination type is provided
 *
 * @example
 * ```typescript
 * // Transfer to another vault
 * await createTransaction(fireblocks, "ETH_TEST5", "0.001", "0", { vaultId: "1" });
 *
 * // Transfer to a one-time external address
 * await createTransaction(fireblocks, "ETH_TEST5", "0.001", "0", {
 *   oneTimeAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
 * });
 *
 * // Transfer to a whitelisted external wallet
 * await createTransaction(fireblocks, "ETH_TEST5", "0.001", "0", {
 *   externalWalletId: "wallet-123"
 * }, "Payment to vendor");
 * ```
 */
export async function createTransaction(
  fireblocks: Fireblocks,
  assetId: string,
  amount: string,
  srcVaultId: string,
  destination: TransactionDestination,
  note?: string
): Promise<CreateTransactionResponse> {
  let destinationConfig;

  if (destination.vaultId) {
    destinationConfig = {
      type: TransferPeerPathType.VaultAccount,
      id: String(destination.vaultId),
    };
  } else if (destination.externalWalletId) {
    destinationConfig = {
      type: TransferPeerPathType.ExternalWallet,
      id: String(destination.externalWalletId),
    };
  } else if (destination.oneTimeAddress) {
    destinationConfig = {
      type: TransferPeerPathType.OneTimeAddress,
      oneTimeAddress: {
        address: destination.oneTimeAddress,
      },
    };
  } else {
    throw new Error("Must provide either vaultId, externalWalletId, or oneTimeAddress");
  }

  const payload = {
    assetId,
    amount,
    source: {
      type: TransferPeerPathType.VaultAccount,
      id: String(srcVaultId),
    },
    destination: destinationConfig,
    note: note || "Transaction created via Fireblocks SDK",
  };

  const result = await fireblocks.transactions.createTransaction({
    transactionRequest: payload,
  });

  return result.data;
}
