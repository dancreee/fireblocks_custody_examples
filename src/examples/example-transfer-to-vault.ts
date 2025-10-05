/**
 * Example: Transfer Assets Between Vaults
 *
 * This example demonstrates how to transfer assets from one vault account
 * to another within the same Fireblocks workspace (internal transfer).
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Source vault (ID: "0") with sufficient balance
 * - Destination vault (ID: "1") created in your workspace
 *
 * NOTE: Update the following values before running:
 * - assetId: Currently set to "ETH_TEST5" (Sepolia testnet)
 * - amount: Currently set to "0.01"
 * - srcVaultId: Source vault ID (currently "0")
 * - destination.vaultId: Target vault ID (currently "1")
 *
 * Usage:
 *   npm run example:transfer-vault
 */

import { initializeFireblocks } from "@/client";
import { createTransaction } from "@/fireblocks/transactions";

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Create a transaction to another vault
    const txResult = await createTransaction(
      fireblocks,
      "ETH_TEST5",
      "0.01",
      "0",
      { vaultId: "1" },
      "Test transaction from POC"
    );
    console.log("Transaction Result:", JSON.stringify(txResult, null, 2));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
