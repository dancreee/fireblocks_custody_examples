/**
 * Example: Approve ERC20 Token Spending
 *
 * This example demonstrates how to approve a spender (like Aave Pool) to spend
 * your ERC20 tokens (like WETH). This is required before interacting with DeFi
 * protocols that need to transfer tokens on your behalf.
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with ERC20 tokens (e.g., WETH)
 *
 * Common Use Cases:
 * - Approve Aave Pool to spend WETH before supply()
 * - Approve Uniswap Router to spend tokens before swap()
 * - Approve any DeFi protocol that needs token access
 *
 * NOTE: Update the following values before running:
 * - TOKEN_ADDRESS: The ERC20 token contract (currently WETH on Sepolia)
 * - SPENDER_ADDRESS: Who can spend your tokens (currently Aave Pool)
 * - APPROVE_AMOUNT: How much to approve (use MaxUint256 for unlimited)
 * - VAULT_ID: Source vault ID (currently "0")
 *
 * Usage:
 *   npm run example:approve-erc20
 */

import { ethers } from "ethers";
import { initializeFireblocks } from "examples/Fireblocks-SDK-examples/client";
import { createContractCall } from "examples/Fireblocks-SDK-examples/fireblocks/contracts";
import { monitorTransaction } from "examples/Fireblocks-SDK-examples/fireblocks/monitor";

// Example: Approve Aave Pool to spend WETH on Sepolia
const TOKEN_ADDRESS = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c"; // WETH on Sepolia
const SPENDER_ADDRESS = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951"; // Aave Pool on Sepolia

// ERC20 ABI - approve function
const ERC20_ABI = ["function approve(address spender, uint256 amount)"];

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Configuration
    const VAULT_ID = "0"; // Source vault ID

    // Approve amount - match what you plan to supply
    // NOTE: You'll need to approve again if you want to supply more later
    const APPROVE_AMOUNT = ethers.parseEther("0.01");

    console.log("\nPreparing ERC20 approval transaction...");
    console.log(`Token: ${TOKEN_ADDRESS}`);
    console.log(`Spender: ${SPENDER_ADDRESS}`);
    console.log(`Amount: ${ethers.formatEther(APPROVE_AMOUNT)} WETH`);

    // Encode the approve function call
    const iface = new ethers.Interface(ERC20_ABI);
    const encodedData = iface.encodeFunctionData("approve", [
      SPENDER_ADDRESS,
      APPROVE_AMOUNT,
    ]);

    console.log("\nEncoded contract call data:", encodedData);

    // Create the contract call transaction through Fireblocks
    const txResult = await createContractCall(
      fireblocks,
      "ETH_TEST5", // Sepolia testnet asset (for gas)
      TOKEN_ADDRESS, // ERC20 token contract address
      encodedData, // ABI-encoded function call
      VAULT_ID, // Source vault
      "0", // No ETH value needed (not payable)
      "Approve ERC20 token spending"
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

    console.log(
      `\n💡 The spender (${SPENDER_ADDRESS}) can now spend your tokens!`
    );
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
