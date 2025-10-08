/**
 * Example: Wrap ETH to WETH using Fireblocks Web3 Provider with ethers.js
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with sufficient ETH_TEST5 balance
 * - Fireblocks TAP policy configured to allow contract calls to WETH
 *
 * WETH Contract (Aave's WETH on Sepolia):
 * - Address: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c
 * - Function: deposit() payable
 *
 * NOTE: Update the following values before running:
 * - vaultAccountId: Source vault account ID (currently 0)
 * - WRAP_AMOUNT: Amount of ETH to wrap (currently "0.01")
 *
 * Usage:
 *   npm run example:web3-wrap-eth
 */

import { ethers } from "ethers";
import { FireblocksWeb3Provider, ChainId, ApiBaseUrl } from "@fireblocks/fireblocks-web3-provider";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH } from "@/config";
import { readFileSync } from "fs";
import * as path from "path";

// Aave's WETH contract on Sepolia
const WETH_CONTRACT = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";

// WETH ABI - deposit function
const WETH_ABI = ["function deposit() payable"];

async function main() {
  try {
    console.log("Initializing Fireblocks Web3 Provider...");

    // Read the API secret key
    const apiSecret = readFileSync(path.resolve(SECRET_KEY_PATH), "utf8");

    // Create the Fireblocks Web3 Provider
    const eip1193Provider = new FireblocksWeb3Provider({
      apiKey: API_KEY,
      privateKey: apiSecret,
      chainId: ChainId.SEPOLIA, // Sepolia testnet
      vaultAccountIds: 0, // Source vault account ID
      apiBaseUrl: BASE_PATH === "sandbox" ? ApiBaseUrl.Sandbox : ApiBaseUrl.Production,
    });

    // Wrap with ethers.js provider
    const provider = new ethers.BrowserProvider(eip1193Provider);
    const signer = await provider.getSigner();

    console.log("✅ Fireblocks Web3 Provider initialized!");
    console.log("Signer address:", await signer.getAddress());

    // Configuration
    const WRAP_AMOUNT = "0.01"; // Amount of ETH to wrap

    console.log("\nPreparing ETH wrap transaction...");
    console.log(`WETH Contract: ${WETH_CONTRACT}`);
    console.log(`Amount: ${WRAP_AMOUNT} ETH`);

    // Create contract instance
    const wethContract = new ethers.Contract(WETH_CONTRACT, WETH_ABI, signer);

    // Call deposit function with ETH value
    const tx = await wethContract.deposit({
      value: ethers.parseEther(WRAP_AMOUNT),
    });

    console.log("\n✅ Transaction sent!");
    console.log("Transaction hash:", tx.hash);
    console.log(`Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);

    // Wait for confirmation
    console.log("\n⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log("\n✅ Transaction confirmed!");
    console.log(`Block number: ${receipt?.blockNumber}`);
    console.log(`Gas used: ${receipt?.gasUsed.toString()}`);
    console.log(`Status: ${receipt?.status === 1 ? "Success" : "Failed"}`);
    console.log(`\n💡 Successfully wrapped ${WRAP_AMOUNT} ETH to WETH!`);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
