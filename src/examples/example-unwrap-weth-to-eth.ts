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
 * - amount: Amount of WETH to unwrap (currently "0.01")
 *
 * Usage:
 *   npm run example:unwrap-weth
 */

import { ethers } from "ethers";
import { initializeFireblocks } from "@/client";
import { createContractCall } from "@/fireblocks/contracts";

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
    const UNWRAP_AMOUNT = ethers.parseEther("0.02"); // Amount in wei

    console.log("\nPreparing WETH unwrap transaction...");
    console.log(`WETH Contract: ${WETH_CONTRACT}`);
    console.log(`Amount: ${ethers.formatEther(UNWRAP_AMOUNT)} WETH`);

    // Encode the withdraw function call
    const iface = new ethers.Interface(WETH_ABI);
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

    console.log("\n✅ Unwrap transaction created successfully!");
    console.log("Transaction ID:", txResult.id);
    console.log("Status:", txResult.status);
    console.log("\nFull transaction details:");
    console.log(JSON.stringify(txResult, null, 2));

    console.log("\n📝 Next steps:");
    console.log("1. Check transaction status in Fireblocks console");
    console.log("2. After confirmation, your vault will have ETH (not WETH)");
    console.log("3. WETH tokens will be burned and ETH returned to your vault");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
