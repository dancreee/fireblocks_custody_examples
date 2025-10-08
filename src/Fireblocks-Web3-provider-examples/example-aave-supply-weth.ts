/**
 * Example: Supply WETH to Aave V3 Pool using Fireblocks Web3 Provider with ethers.js
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with WETH tokens (from wrapping ETH first)
 * - WETH approval for the Aave Pool contract (run example:web3-approve-erc20 first)
 * - Fireblocks TAP policy / whitelist configured to allow contract calls to Aave Pool
 *
 * Aave V3 Sepolia Addresses:
 * - Pool: 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951
 * - WETH: 0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c
 *
 * ⚠️ SECURITY NOTE:
 * The onBehalfOf parameter allows you to specify who receives the aTokens.
 * Always ensure this is set to your own vault address to prevent sending
 * aTokens to an unintended recipient.
 *
 * NOTE: Update the following values before running:
 * - vaultAccountId: Source vault account ID (currently 0)
 * - SUPPLY_AMOUNT: Amount of WETH to deposit (currently "0.01")
 *
 * Usage:
 *   npm run example:web3-aave-supply
 */

import { ethers } from "ethers";
import { FireblocksWeb3Provider, ChainId, ApiBaseUrl } from "@fireblocks/fireblocks-web3-provider";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH } from "@/config";
import { readFileSync } from "fs";
import * as path from "path";

// Aave V3 Sepolia contract addresses
const AAVE_POOL = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
const WETH_ADDRESS = "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c";

// Aave Pool ABI - supply function
const POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
];

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
    const signerAddress = await signer.getAddress();
    console.log("Signer address:", signerAddress);

    // Configuration
    const SUPPLY_AMOUNT = "0.01"; // Amount of WETH to supply

    console.log("\nPreparing Aave supply transaction...");
    console.log(`Pool: ${AAVE_POOL}`);
    console.log(`WETH Asset: ${WETH_ADDRESS}`);
    console.log(`Amount: ${SUPPLY_AMOUNT} WETH`);
    console.log(`On Behalf Of: ${signerAddress} (your vault)`);

    console.log(
      "\n⚠️  IMPORTANT: Before running this transaction, ensure you have approved the Aave Pool to spend your WETH!"
    );
    console.log("Run: npm run example:web3-approve-erc20");

    // Create contract instance
    const aavePool = new ethers.Contract(AAVE_POOL, POOL_ABI, signer);

    // Call supply function
    const tx = await aavePool.supply(
      WETH_ADDRESS, // asset address
      ethers.parseEther(SUPPLY_AMOUNT), // amount in wei
      signerAddress, // address to receive aTokens (your vault)
      0 // referralCode (0 for no referral)
    );

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
    console.log("\n💡 Check your aWETH balance at https://app.aave.com (testnet mode)");

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();