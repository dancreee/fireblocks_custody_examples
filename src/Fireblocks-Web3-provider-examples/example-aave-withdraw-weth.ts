/**
 * Example: Withdraw WETH from Aave V3 Pool using Fireblocks Web3 Provider with ethers.js
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with aWETH tokens (from depositing WETH into Aave)
 * - Fireblocks TAP policy configured to allow contract calls to Aave V3 Pool Contract
 *
 * Aave V3 Mainnet Addresses:
 * - Pool: 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
 * - WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
 *
 * ⚠️ SECURITY NOTE:
 * The 'to' address parameter specifies where the withdrawn WETH will be sent.
 * Always ensure this is set to your own vault address to prevent sending
 * funds to an unintended recipient.
 *
 * NOTE: Update the following values before running:
 * - vaultAccountId: Source vault account ID (currently 0)
 * - WITHDRAW_AMOUNT: Amount to withdraw or use MAX_UINT256 for full balance
 *
 * Usage:
 *   npm run example:web3-aave-withdraw
 */

import { ethers } from "ethers";
import { FireblocksWeb3Provider, ChainId, ApiBaseUrl } from "@fireblocks/fireblocks-web3-provider";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH, ETH_RPC_URL } from "../config";
import { readFileSync } from "fs";
import * as path from "path";

// Aave V3 Mainnet contract addresses
const AAVE_POOL = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Aave Pool ABI - withdraw function
const POOL_ABI = ["function withdraw(address asset, uint256 amount, address to) returns (uint256)"];

// Max uint256 - used to withdraw all available balance
const MAX_UINT256 = ethers.constants.MaxUint256;

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
    const provider = new ethers.providers.Web3Provider(eip1193Provider);
    const signer = provider.getSigner();

    console.log("✅ Fireblocks Web3 Provider initialized!");
    const signerAddress = await signer.getAddress();
    console.log("Signer address:", signerAddress);

    // Configuration
    // Withdraw amount options:
    // 1. Use MAX_UINT256 to withdraw ALL available WETH
    // 2. Use specific amount like "0.001"
    const WITHDRAW_AMOUNT = MAX_UINT256; // Withdraw all

    console.log("\nPreparing Aave withdrawal transaction...");
    console.log(`Pool: ${AAVE_POOL}`);
    console.log(`WETH Asset: ${WETH_ADDRESS}`);
    console.log(
      `Amount: ${WITHDRAW_AMOUNT === MAX_UINT256 ? "ALL (max uint256)" : ethers.utils.formatEther(WITHDRAW_AMOUNT) + " WETH"}`
    );
    console.log(`To Address: ${signerAddress} (your vault)`);

    // Create contract instance
    const aavePool = new ethers.Contract(AAVE_POOL, POOL_ABI, signer);

    // Call withdraw function
    const tx = await aavePool.withdraw(
      WETH_ADDRESS, // asset address
      WITHDRAW_AMOUNT, // amount (or max uint256 for all)
      signerAddress // address to receive WETH (your vault)
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
    console.log("\n💡 Check your Aave position at https://app.aave.com");

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
