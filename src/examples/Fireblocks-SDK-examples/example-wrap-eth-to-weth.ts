/**
 * Example: Wrap ETH to WETH on Sepolia
 *
 * This example demonstrates how to wrap native ETH into WETH (Wrapped ETH)
 * by depositing ETH into the WETH contract. This is step 1 before depositing
 * into DeFi protocols like Aave.
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with sufficient ETH_TEST5 balance
 *
 * WETH Contract (Aave's WETH on Sepolia):
 * - Address: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c
 * - Function: deposit() payable
 *
 * ⚠️ SECURITY NOTE:
 * This is the safest DeFi interaction example as the WETH deposit() function
 * has no parameters - you always receive the WETH tokens directly.
 * The other examples (supply/withdraw) contain address parameters that
 * Fireblocks TAP policies cannot validate (they're encoded in contractCallData)
 *
 * NOTE: Update the following values before running:
 * - srcVaultId: Source vault ID (currently "1")
 * - amount: Amount of ETH to wrap (currently "0.001")
 *
 * Usage:
 *   npm run example:wrap-eth
 */

import { ethers } from "ethers";
import { initializeFireblocks } from "@/client";
import { createContractCall } from "@/fireblocks/contracts";
import { monitorTransaction } from "@/fireblocks/monitor";

// Aave's WETH contract on Sepolia
const WETH_CONTRACT = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";

// WETH ABI - deposit function
const WETH_ABI = ["function deposit() payable"];

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Configuration
    const VAULT_ID = "0"; // Source vault ID
    const WRAP_AMOUNT = "0.01"; // Amount of ETH to wrap

    console.log("\nPreparing ETH wrap transaction...");
    console.log(`WETH Contract: ${WETH_CONTRACT}`);
    console.log(`Amount: ${WRAP_AMOUNT} ETH`);

    // Encode the deposit function call
    const iface = new ethers.Interface(WETH_ABI);
    const encodedData = iface.encodeFunctionData("deposit", []);

    console.log("\nEncoded contract call data:", encodedData);

    // Create the contract call transaction through Fireblocks
    const txResult = await createContractCall(
      fireblocks,
      "ETH_TEST5", // Sepolia testnet asset
      WETH_CONTRACT, // WETH contract address
      encodedData, // ABI-encoded function call
      VAULT_ID, // Source vault
      WRAP_AMOUNT, // Amount to send (payable)
      "Wrap ETH to WETH on Sepolia"
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
