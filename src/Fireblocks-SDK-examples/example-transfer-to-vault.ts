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
 * - amount: Currently set to "0.001"
 * - srcVaultId: Source vault ID (currently "0")
 * - destination.vaultId: Target vault ID (currently "1")
 *
 * Usage:
 *   npm run example:transfer-vault
 */

import { initializeFireblocks } from "examples/Fireblocks-SDK-examples/client";
import { createTransaction } from "examples/Fireblocks-SDK-examples/fireblocks/transactions";
import { monitorTransaction } from "examples/Fireblocks-SDK-examples/fireblocks/monitor";

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Create a transaction to another vault
    const txResult = await createTransaction(
      fireblocks,
      "ETH_TEST5",
      "0.001",
      "0",
      { vaultId: "1" },
      "Test transaction from POC"
    );

    console.log("\n✅ Transaction created!");
    console.log("Transaction ID:", txResult.id);

    if (!txResult.id) {
      throw new Error("Transaction ID not returned from Fireblocks");
    }

    // Monitor transaction until completion
    console.log("\n⏳ Waiting for transaction to complete...");
    const result = await monitorTransaction(fireblocks, txResult.id, {
      rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
      waitForConfirmations: 1,
    });

    if (result.error) {
      console.error(`\n❌ Transaction failed: ${result.error}`);
      process.exit(1);
    }

    console.log("\n✅ Transaction complete!");
    console.log(`Status: ${result.status}`);
    if (result.txHash) {
      console.log(`Tx Hash: ${result.txHash}`);
      console.log(`Etherscan: https://sepolia.etherscan.io/tx/${result.txHash}`);
    }
    if (result.blockNumber) {
      console.log(
        `Block: ${result.blockNumber} (${result.confirmations} confirmations)`
      );
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
