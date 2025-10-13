/**
 * Example: Approve ERC20 Token Spending using Fireblocks Web3 Provider with ethers.js
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with ERC20 tokens (e.g., WETH)
 * - Fireblocks TAP policy configured to allow token approvals
 *
 * Common Use Cases:
 * - Approve Aave Pool to spend WETH before supply()
 * - Approve Uniswap Router to spend tokens before swap()
 * - Approve any DeFi protocol that needs token access
 *
 * NOTE: Update the following values before running:
 * - vaultAccountId: Source vault account ID (currently 0)
 * - TOKEN_ADDRESS: The ERC20 token contract (currently WETH on Mainnet)
 * - SPENDER_ADDRESS: Who can spend your tokens (currently Aave Pool)
 * - APPROVE_AMOUNT: How much to approve (currently "0.01")
 *
 * Usage:
 *   npm run example:web3-approve-erc20
 */

import { ethers } from "ethers";
import { FireblocksWeb3Provider, ChainId, ApiBaseUrl } from "@fireblocks/fireblocks-web3-provider";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH, ETH_RPC_URL } from "@/config";
import { readFileSync } from "fs";
import * as path from "path";

// Example: Approve Aave Pool to spend WETH on Mainnet
const TOKEN_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH on Mainnet
const SPENDER_ADDRESS = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"; // Aave Pool on Mainnet

// ERC20 ABI - approve function
const ERC20_ABI = ["function approve(address spender, uint256 amount) returns (bool)"];

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
    const APPROVE_AMOUNT = "0.01"; // Amount to approve

    console.log("\nPreparing ERC20 approval transaction...");
    console.log(`Token: ${TOKEN_ADDRESS}`);
    console.log(`Spender: ${SPENDER_ADDRESS}`);
    console.log(`Amount: ${APPROVE_AMOUNT} WETH`);

    // Create contract instance
    const tokenContract = new ethers.Contract(TOKEN_ADDRESS, ERC20_ABI, signer);

    // Call approve function
    const tx = await tokenContract.approve(
      SPENDER_ADDRESS,
      ethers.parseEther(APPROVE_AMOUNT)
    );

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
    console.log(`\n💡 The spender (${SPENDER_ADDRESS}) can now spend your tokens!`);

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
