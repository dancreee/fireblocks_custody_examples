/**
 * Example: List Vault Accounts with Assets
 *
 * This example demonstrates how to retrieve only vault accounts that have
 * non-zero asset balances. Useful for identifying active accounts.
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - At least one vault account with assets
 *
 * Usage:
 *   npm run example:list-assets
 */

import { initializeFireblocks } from "examples/Fireblocks-SDK-examples/client";
import { getVaultAccounts } from "examples/Fireblocks-SDK-examples/fireblocks/vaults";

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Get only accounts with assets
    const accountsWithAssets = await getVaultAccounts(fireblocks, {
      onlyWithAssets: true,
    });
    console.log("Accounts with assets:", JSON.stringify(accountsWithAssets, null, 2));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
