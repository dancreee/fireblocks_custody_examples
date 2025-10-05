/**
 * Example: Transfer to One-Time External Address
 *
 * This example demonstrates how to transfer assets to an external blockchain
 * address that is not whitelisted. This requires additional approval steps
 * depending on your workspace's transaction authorization policy.
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Source vault (ID: "0") with sufficient balance
 * - Valid external address for the asset's blockchain
 *
 * NOTE: Update the following values before running:
 * - assetId: Currently set to "ETH_TEST5" (Sepolia testnet)
 * - amount: Currently set to "0.01"
 * - srcVaultId: Source vault ID (currently "0")
 * - destination.oneTimeAddress: Target address (currently a test address)
 *
 * Usage:
 *   npm run example:transfer-address
 */

import { initializeFireblocks } from "@/client";
import { createTransaction } from "@/fireblocks/transactions";

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Create a transaction to an external address (one-time)
    const txResult = await createTransaction(
      fireblocks,
      "ETH_TEST5",
      "0.01",
      "0",
      { oneTimeAddress: "0x0eFe1191e2e498aE1aaDddc12A7E9De36b60829e" },
      "Send to external address"
    );
    console.log("Transaction Result:", JSON.stringify(txResult, null, 2));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
