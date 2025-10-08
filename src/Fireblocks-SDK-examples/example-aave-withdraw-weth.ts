/**
 * Example: Withdraw WETH from Aave V3 Pool on Sepolia
 *
 * This example demonstrates how to withdraw your WETH from the Aave V3 lending
 * pool back to your Fireblocks vault. You can then unwrap WETH back to ETH if needed.
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with aWETH tokens (from depositing WETH into Aave)
 * - Your vault must have supplied WETH to Aave first
 *
 * Aave V3 Sepolia Addresses:
 * - Pool: 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
 * - WETH: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c
 *
 * ⚠️ SECURITY WARNING:
 * The 'to' address parameter is encoded in contractCallData and CANNOT be
 * validated by Fireblocks TAP policies. An attacker with API access could
 * potentially call this with their own address as the recipient.
 *
 * Mitigations:
 * - Manually verify encoded data before approval
 * - Deploy a custom wrapper contract that enforces to = msg.sender
 *
 * How it works:
 * - Aave burns your aWETH tokens
 * - You receive WETH back to the specified address
 * - Use type(uint256).max to withdraw all available balance
 *
 * NOTE: Update the following values before running:
 * - srcVaultId: Source vault ID (currently "0")
 * - amount: Amount to withdraw (use MAX_UINT256 for full balance)
 * - to: Address to receive WETH (your vault's Sepolia address)
 *
 * Usage:
 *   npm run example:aave-withdraw
 */

import { ethers } from "ethers";
import { initializeFireblocks } from "examples/Fireblocks-SDK-examples/client";
import { createContractCall } from "examples/Fireblocks-SDK-examples/fireblocks/contracts";
import { monitorTransaction } from "examples/Fireblocks-SDK-examples/fireblocks/monitor";

// Aave V3 Sepolia contract addresses
const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
const WETH_ADDRESS = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";

// Aave Pool ABI - withdraw function
const POOL_ABI = ["function withdraw(address asset, uint256 amount, address to)"];

// Max uint256 - used to withdraw all available balance
const MAX_UINT256 = ethers.MaxUint256;

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Configuration
    const VAULT_ID = "0"; // Source vault ID

    // IMPORTANT: Replace this with your vault's Sepolia address
    // This is where the WETH will be sent
    // TODO verify we can use TAP to enforce to_address?
    const TO_ADDRESS = "0x3D1C5D76E9028B2A12E5e81dcbC865fa7d3684D1";

    // Withdraw amount options:
    // 1. Use MAX_UINT256 to withdraw ALL available WETH
    // 2. Use specific amount like ethers.parseEther("0.001")
    const WITHDRAW_AMOUNT = MAX_UINT256; // Withdraw all

    console.log("\nPreparing Aave withdrawal transaction...");
    console.log(`Pool: ${AAVE_POOL}`);
    console.log(`WETH Asset: ${WETH_ADDRESS}`);
    console.log(
      `Amount: ${WITHDRAW_AMOUNT === MAX_UINT256 ? "ALL (max uint256)" : ethers.formatEther(WITHDRAW_AMOUNT) + " WETH"}`
    );
    console.log(`To Address: ${TO_ADDRESS}`);

    // Encode the withdraw function call
    const iface = new ethers.Interface(POOL_ABI);
    const encodedData = iface.encodeFunctionData("withdraw", [
      WETH_ADDRESS, // asset address
      WITHDRAW_AMOUNT, // amount (or max uint256 for all)
      TO_ADDRESS, // address to receive WETH
    ]);

    console.log("\nEncoded contract call data:", encodedData);

    // Create the contract call transaction through Fireblocks
    const txResult = await createContractCall(
      fireblocks,
      "ETH_TEST5", // Sepolia testnet asset (for gas)
      AAVE_POOL, // Aave Pool contract address
      encodedData, // ABI-encoded function call
      VAULT_ID, // Source vault
      undefined, // No ETH value needed (not payable)
      "Withdraw WETH from Aave V3 on Sepolia"
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
      "\n💡 Check your Aave position at https://app.aave.com (testnet mode)"
    );
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
