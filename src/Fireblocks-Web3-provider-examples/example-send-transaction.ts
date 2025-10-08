/**
 * Example: Send ETH Transaction using Fireblocks Web3 Provider with ethers.js
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with sufficient ETH_TEST5 balance
 * - Fireblocks TAP policy configured to allow transfers to destination address
 *
 * NOTE: Update the following values before running:
 * - vaultAccountId: Source vault account ID (currently 0)
 * - RECIPIENT_ADDRESS: Destination address (currently set to Vault ID 1)
 * - SEND_AMOUNT: Amount to send (currently "0.01")
 *
 * Usage:
 *   npm run example:web3-send-tx
 */

import { ethers } from "ethers";
import { FireblocksWeb3Provider, ChainId, ApiBaseUrl } from "@fireblocks/fireblocks-web3-provider";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH } from "@/config";
import { readFileSync } from "fs";
import * as path from "path";

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
    const RECIPIENT_ADDRESS = "0xD49249Ee400A874BdC28cc5F587A2154b2b3b047"; // Vault ID 1 Eth Sepolia Address
    const SEND_AMOUNT = "0.01"; // Amount in ETH

    console.log("\nPreparing transaction...");
    console.log(`From: ${await signer.getAddress()}`);
    console.log(`To: ${RECIPIENT_ADDRESS}`);
    console.log(`Amount: ${SEND_AMOUNT} ETH`);

    // Create transaction
    const tx = await signer.sendTransaction({
      to: RECIPIENT_ADDRESS,
      value: ethers.parseEther(SEND_AMOUNT),
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

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();