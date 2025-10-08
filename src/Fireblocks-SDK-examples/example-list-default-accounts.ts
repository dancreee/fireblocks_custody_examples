/**
 * Example: List Vault Accounts Filtered by Name
 *
 * This example demonstrates how to retrieve vault accounts and filter them by name.
 * Useful for finding specific vaults when you have many accounts in your workspace.
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - At least one vault account in your workspace
 *
 * Usage:
 *   npm run example:list-default
 */

import { initializeFireblocks } from "examples/Fireblocks-SDK-examples/client";
import { getVaultAccounts } from "examples/Fireblocks-SDK-examples/fireblocks/vaults";

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Get vault accounts filtered to "Default"
    const defaultAccounts = await getVaultAccounts(fireblocks, {
      nameFilter: "Default",
    });
    console.log("Default Vault Account:", JSON.stringify(defaultAccounts, null, 2));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
