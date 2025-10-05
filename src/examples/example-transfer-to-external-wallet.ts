/**
 * Example: Transfer to Whitelisted External Wallet
 *
 * This example demonstrates how to transfer assets to a whitelisted external
 * wallet. External wallets must be added and approved in your Fireblocks
 * console before they can be used as transaction destinations.
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Source vault (ID: "0") with sufficient balance
 * - External wallet named "Dane Rabby Sepolia Testnet" configured in Fireblocks
 *
 * NOTE: Update the following values before running:
 * - assetId: Currently set to "ETH_TEST5" (Sepolia testnet)
 * - amount: Currently set to "0.01"
 * - srcVaultId: Source vault ID (currently "0")
 * - wallet name: Currently "Dane Rabby Sepolia Testnet"
 *
 * Usage:
 *   npm run example:transfer-wallet
 */

import { initializeFireblocks } from "@/client";
import { createTransaction } from "@/fireblocks/transactions";
import { findExternalWalletByName } from "@/fireblocks/wallets";

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Create a transaction to an external wallet (whitelisted)
    // First, find the wallet ID by name
    const walletId = await findExternalWalletByName(fireblocks, "Dane Rabby Sepolia Testnet");
    if (!walletId) {
      throw new Error("External wallet not found");
    }

    const txResult = await createTransaction(
      fireblocks,
      "ETH_TEST5",
      "0.01",
      "0",
      { externalWalletId: walletId },
      "Send to external wallet on Sepolia"
    );
    console.log("Transaction Result:", JSON.stringify(txResult, null, 2));
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
