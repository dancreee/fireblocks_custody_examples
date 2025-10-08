import { Fireblocks, UnmanagedWallet } from "@fireblocks/ts-sdk";

/**
 * Retrieves all external wallets configured in the Fireblocks workspace.
 *
 * External wallets are whitelisted addresses that can be used as transaction
 * destinations without requiring manual approval for each transaction.
 *
 * @param {Fireblocks} fireblocks - The initialized Fireblocks SDK client
 * @returns {Promise<UnmanagedWallet[]>} Array of external wallet objects
 *
 * @example
 * ```typescript
 * const wallets = await getExternalWallets(fireblocks);
 * console.log(`Found ${wallets.length} external wallets`);
 * ```
 */
export async function getExternalWallets(fireblocks: Fireblocks): Promise<UnmanagedWallet[]> {
  const result = await fireblocks.externalWallets.getExternalWallets();
  return result.data || [];
}

/**
 * Finds an external wallet by its display name and returns its ID.
 *
 * This is a convenience function to look up wallet IDs by name, which is
 * useful when you want to reference wallets by their human-readable names
 * rather than remembering their IDs.
 *
 * @param {Fireblocks} fireblocks - The initialized Fireblocks SDK client
 * @param {string} name - The exact name of the external wallet to find
 * @returns {Promise<string | null>} The wallet ID if found, null otherwise
 *
 * @example
 * ```typescript
 * const walletId = await findExternalWalletByName(fireblocks, "My Ledger Wallet");
 * if (walletId) {
 *   console.log(`Wallet ID: ${walletId}`);
 * } else {
 *   console.log("Wallet not found");
 * }
 * ```
 */
export async function findExternalWalletByName(fireblocks: Fireblocks, name: string) {
  const wallets = await getExternalWallets(fireblocks);
  const wallet = wallets.find((w) => w.name === name);
  return wallet?.id || null;
}
