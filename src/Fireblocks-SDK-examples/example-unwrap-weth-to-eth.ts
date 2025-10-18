/**
 * Example: Unwrap WETH to ETH on Sepolia
 *
 * This example demonstrates how to unwrap WETH (Wrapped ETH) back to native ETH
 * by withdrawing from the WETH contract. Useful after withdrawing from DeFi protocols.
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with WETH balance (from wrapping or DeFi withdrawals)
 *
 * WETH Contract (Aave's WETH on Sepolia):
 * - Address: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c
 * - Function: withdraw(uint256 amount)
 *
 * ⚠️ SECURITY NOTE:
 * This is safe - the withdraw() function sends ETH directly to msg.sender (your vault).
 * No parameters control the recipient address.
 *
 * NOTE: Update the following values before running:
 * - srcVaultId: Source vault ID (currently "0")
 * - amount: Amount of WETH to unwrap (currently "0.001")
 *
 * Usage:
 *   npm run example:unwrap-weth
 */

import { ethers } from "ethers";
import { initializeFireblocks } from "./client";
import { createContractCall } from "./fireblocks/contracts";
import { monitorTransaction } from "./fireblocks/monitor";

// Aave's WETH contract on Sepolia
const WETH_CONTRACT = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";

// WETH ABI - withdraw function
const WETH_ABI = ["function withdraw(uint256 wad)"];

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Configuration
    const VAULT_ID = "0"; // Source vault ID
    const UNWRAP_AMOUNT = ethers.utils.parseEther("0.001"); // Amount in wei

    console.log("\nPreparing WETH unwrap transaction...");
    console.log(`WETH Contract: ${WETH_CONTRACT}`);
    console.log(`Amount: ${ethers.utils.formatEther(UNWRAP_AMOUNT)} WETH`);

    // Encode the withdraw function call
    const iface = new ethers.utils.Interface(WETH_ABI);
    const encodedData = iface.encodeFunctionData("withdraw", [UNWRAP_AMOUNT]);

    console.log("\nEncoded contract call data:", encodedData);

    // Create the contract call transaction through Fireblocks
    const txResult = await createContractCall(
      fireblocks,
      "ETH_TEST5", // Sepolia testnet asset (for gas)
      WETH_CONTRACT, // WETH contract address
      encodedData, // ABI-encoded function call
      VAULT_ID, // Source vault
      undefined, // No ETH value needed (not payable)
      "Unwrap WETH to ETH on Sepolia"
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
      console.log(`Block: ${result.blockNumber} (${result.confirmations} confirmations)`);
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
