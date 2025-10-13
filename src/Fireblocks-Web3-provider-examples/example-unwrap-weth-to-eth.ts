/**
 * Example: Unwrap WETH to ETH using Fireblocks Web3 Provider with ethers.js
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with WETH balance (from wrapping or DeFi withdrawals)
 * - Fireblocks TAP policy configured to allow contract calls to WETH
 *
 * WETH Contract (Mainnet):
 * - Address: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
 * - Function: withdraw(uint256 amount)
 *
 * ⚠️ SECURITY NOTE:
 * This is safe - the withdraw() function sends ETH directly to msg.sender (your vault).
 * No parameters control the recipient address.
 *
 * NOTE: Update the following values before running:
 * - vaultAccountId: Source vault account ID (currently 0)
 * - UNWRAP_AMOUNT: Amount of WETH to unwrap (currently "0.001")
 *
 * Usage:
 *   npm run example:web3-unwrap-weth
 */

import { ethers } from "ethers";
import { FireblocksWeb3Provider, ChainId, ApiBaseUrl } from "@fireblocks/fireblocks-web3-provider";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH, ETH_RPC_URL } from "@/config";
import { readFileSync } from "fs";
import * as path from "path";

// WETH contract on Mainnet
const WETH_CONTRACT = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// WETH ABI - withdraw function
const WETH_ABI = ["function withdraw(uint256 wad)"];

async function main() {
  try {
    console.log("Initializing Fireblocks Web3 Provider...");

    // Read the API secret key
    const apiSecret = readFileSync(path.resolve(SECRET_KEY_PATH), "utf8");

    // Create the Fireblocks Web3 Provider
    const eip1193Provider = new FireblocksWeb3Provider({
      apiKey: API_KEY,
      privateKey: apiSecret,
      chainId: ChainId.MAINNET, // Ethereum Mainnet
      vaultAccountIds: 0, // Source vault account ID
      apiBaseUrl: BASE_PATH === "sandbox" ? ApiBaseUrl.Sandbox : ApiBaseUrl.Production,
      rpcUrl: ETH_RPC_URL, // Alchemy RPC for reading chain data
    });

    // Wrap with ethers.js provider
    const provider = new ethers.BrowserProvider(eip1193Provider);
    const signer = await provider.getSigner();

    console.log("✅ Fireblocks Web3 Provider initialized!");
    console.log("Signer address:", await signer.getAddress());

    // Configuration
    const UNWRAP_AMOUNT = "0.001"; // Amount of WETH to unwrap

    console.log("\nPreparing WETH unwrap transaction...");
    console.log(`WETH Contract: ${WETH_CONTRACT}`);
    console.log(`Amount: ${UNWRAP_AMOUNT} WETH`);

    // Create contract instance
    const wethContract = new ethers.Contract(WETH_CONTRACT, WETH_ABI, signer);

    // Call withdraw function
    const tx = await wethContract.withdraw(ethers.parseEther(UNWRAP_AMOUNT));

    console.log("\n✅ Transaction sent!");
    console.log("Transaction hash:", tx.hash);
    console.log(`Etherscan: https://etherscan.io/tx/${tx.hash}`);

    // Wait for confirmation
    console.log("\n⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log("\n✅ Transaction confirmed!");
    console.log(`Block number: ${receipt?.blockNumber}`);
    console.log(`Gas used: ${receipt?.gasUsed.toString()}`);
    console.log(`Status: ${receipt?.status === 1 ? "Success" : "Failed"}`);
    console.log(`\n💡 Successfully unwrapped ${UNWRAP_AMOUNT} WETH to ETH!`);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
