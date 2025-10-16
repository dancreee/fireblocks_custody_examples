/**
 * Example: Supply WETH to Aave V3 Pool on Sepolia
 *
 * This example demonstrates how to deposit WETH into the Aave V3 lending pool
 * on Sepolia testnet. This is step 2 after wrapping ETH to WETH.
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with WETH tokens (from wrapping ETH first)
 * - WETH approval for the Aave Pool contract (can be done via Fireblocks)
 *
 * Aave V3 Sepolia Addresses:
 * - Pool: 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
 * - WETH: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c
 *
 * ⚠️ SECURITY WARNING:
 * The onBehalfOf parameter is encoded in contractCallData and CANNOT be
 * validated by Fireblocks TAP policies. An attacker with API access could
 * potentially call this with their own address as onBehalfOf.
 *
 * Mitigations:
 * - Manually verify encoded data before approval
 *
 * NOTE: Update the following values before running:
 * - srcVaultId: Source vault ID (currently "0")
 * - amount: Amount of WETH to deposit (currently "0.001")
 * - onBehalfOf: Address to receive aTokens (your vault's Sepolia address)
 *
 * Usage:
 *   npm run example:aave-supply
 */

import { ethers } from "ethers";
import { initializeFireblocks } from "./client";
import { createContractCall } from "./fireblocks/contracts";
import { monitorTransaction } from "./fireblocks/monitor";

// Aave V3 Sepolia contract addresses
const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
const WETH_ADDRESS = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";

// Aave Pool ABI - supply function
const POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
];

async function main() {
  try {
    const fireblocks = initializeFireblocks();
    console.log("Fireblocks SDK initialized successfully!");

    // Configuration
    const VAULT_ID = "0"; // Source vault ID
    const SUPPLY_AMOUNT = ethers.parseEther("0.001"); // Amount in wei

    // IMPORTANT: Replace this with your vault's Sepolia address
    // This is where the aWETH tokens will be sent
    // TODO - verify if we can use TAP to enforce onBehalfOf
    const ON_BEHALF_OF = "0x3D1C5D76E9028B2A12E5e81dcbC865fa7d3684D1";

    console.log("\nPreparing Aave supply transaction...");
    console.log(`Pool: ${AAVE_POOL}`);
    console.log(`WETH Asset: ${WETH_ADDRESS}`);
    console.log(`Amount: ${ethers.formatEther(SUPPLY_AMOUNT)} WETH`);
    console.log(`On Behalf Of: ${ON_BEHALF_OF}`);

    // Encode the supply function call
    const iface = new ethers.Interface(POOL_ABI);
    const encodedData = iface.encodeFunctionData("supply", [
      WETH_ADDRESS, // asset address
      SUPPLY_AMOUNT, // amount in wei
      ON_BEHALF_OF, // address to receive aTokens
      0, // referralCode (0 for no referral)
    ]);

    console.log("\nEncoded contract call data:", encodedData);

    console.log(
      "\n⚠️  IMPORTANT: Before running this transaction, you must approve the Aave Pool to spend your WETH!"
    );
    console.log("You can do this by creating an ERC20 approve transaction in Fireblocks:");
    console.log(`- Token: WETH (${WETH_ADDRESS})`);
    console.log(`- Spender: Aave Pool (${AAVE_POOL})`);
    console.log(`- Amount: ${ethers.formatEther(SUPPLY_AMOUNT)} or more`);

    // Create the contract call transaction through Fireblocks
    const txResult = await createContractCall(
      fireblocks,
      "ETH_TEST5", // Sepolia testnet asset (for gas)
      AAVE_POOL, // Aave Pool contract address
      encodedData, // ABI-encoded function call
      VAULT_ID, // Source vault
      undefined, // No ETH value needed (not payable)
      "Supply WETH to Aave V3 on Sepolia"
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
    console.log("\n💡 Check your aWETH balance at https://app.aave.com (testnet mode)");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
