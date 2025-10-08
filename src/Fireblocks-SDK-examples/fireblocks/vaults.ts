import { Fireblocks } from "@fireblocks/ts-sdk";
import { VaultAccount, GetVaultAccountsOptions } from "examples/Fireblocks-SDK-examples/types";

/**
 * Retrieves vault accounts from Fireblocks with optional filtering.
 *
 * This function fetches all vault accounts and applies optional filters
 * to narrow down results by name or to show only accounts with assets.
 *
 * @param {Fireblocks} fireblocks - The initialized Fireblocks SDK client
 * @param {GetVaultAccountsOptions} options - Optional filtering parameters
 * @param {string} options.nameFilter - Filter accounts by name (case-insensitive partial match)
 * @param {boolean} options.onlyWithAssets - If true, only return accounts with non-zero asset balances
 * @returns {Promise<VaultAccount[]>} Array of vault accounts matching the filter criteria
 *
 * @example
 * ```typescript
 * // Get all accounts with "Default" in the name
 * const defaultAccounts = await getVaultAccounts(fireblocks, {
 *   nameFilter: "Default"
 * });
 *
 * // Get only accounts that have assets
 * const accountsWithAssets = await getVaultAccounts(fireblocks, {
 *   onlyWithAssets: true
 * });
 * ```
 */
export async function getVaultAccounts(
  fireblocks: Fireblocks,
  options: GetVaultAccountsOptions = {}
): Promise<VaultAccount[]> {
  const response = await fireblocks.vaults.getPagedVaultAccounts({});
  let accounts: VaultAccount[] = response.data?.accounts || [];

  // Filter by name if provided
  if (options.nameFilter) {
    accounts = accounts.filter((account) =>
      account.name?.toLowerCase().includes(options.nameFilter!.toLowerCase())
    );
  }

  // Filter to only accounts with assets if requested
  if (options.onlyWithAssets) {
    accounts = accounts.filter((account) => {
      return account.assets?.some((asset) => parseFloat(asset.total || "0") > 0);
    });
  }

  return accounts;
}
