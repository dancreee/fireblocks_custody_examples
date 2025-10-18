/**
 * Example: Deposit USDC to Hyperliquid via Bridge2 (from Arbitrum)
 *
 * Prerequisites:
 * - Fireblocks API credentials configured in .env
 * - Vault account with USDC balance on Arbitrum
 * - Minimum 5 USDC required (amounts less than 5 USDC will be lost)
 * - Fireblocks TAP policy configured to allow ERC20 transfers 
 * - (Note this requires you whitelist the Bridge2 contract as "External" with "USD Coin" address, NOT "Contract" with "ETH/Arb chain" address)
 *
 * How it works:
 * 1. Transfer USDC from your Arbitrum address to Hyperliquid's Bridge2 contract
 * 2. Hyperliquid validators detect the transfer and credit your Hyperliquid account
 * 3. Your Hyperliquid address is the same as your Arbitrum address
 *
 * NOTE: Update the following values before running:
 * - vaultAccountId: Source vault account ID (currently 0)
 * - DEPOSIT_AMOUNT: Amount to deposit in USDC (currently "5" - minimum allowed)
 *
 * Bridge2 Contract: https://arbiscan.io/address/0x2df1c51e09aecf9cacb7bc98cb1742757f163df7
 * USDC Contract: https://arbiscan.io/address/0xaf88d065e77c8cc2239327c5edb3a432268e5831
 *
 * Usage:
 *   npm run example:web3-hl-deposit
 */

import { ethers } from "ethers";
import { FireblocksWeb3Provider, ChainId, ApiBaseUrl } from "@fireblocks/fireblocks-web3-provider";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH, ARB_RPC_URL } from "@/config";
import { readFileSync } from "fs";
import * as path from "path";

// Hyperliquid Bridge2 contract on Arbitrum
const BRIDGE2_ADDRESS = "0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7";

// Native USDC on Arbitrum
const USDC_ADDRESS = "0xaf88d065e77c8cc2239327c5edb3a432268e5831";

// Minimum deposit amount (enforced by Hyperliquid)
const MIN_DEPOSIT_USDC = 5;

// ERC20 ABI - transfer function
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function main() {
  try {
    // Read the API secret key
    const apiSecret = readFileSync(path.resolve(SECRET_KEY_PATH), "utf8");

    // Create the Fireblocks Web3 Provider for Arbitrum
    const eip1193Provider = new FireblocksWeb3Provider({
      apiKey: API_KEY,
      privateKey: apiSecret,
      chainId: ChainId.ARBITRUM, // Arbitrum Mainnet (42161)
      vaultAccountIds: 0, // Source vault account ID
      apiBaseUrl: BASE_PATH === "sandbox" ? ApiBaseUrl.Sandbox : ApiBaseUrl.Production,
      rpcUrl: ARB_RPC_URL, // Alchemy RPC for Arbitrum
    });

    // Wrap with ethers.js provider
    const provider = new ethers.providers.Web3Provider(eip1193Provider);
    const signer = provider.getSigner();

    const signerAddress = await signer.getAddress();
    console.log(`Signer address: ${signerAddress} (same for Arbitrum & Hyperliquid)\n`);

    // Configuration
    const DEPOSIT_AMOUNT = "5"; // Amount in USDC (minimum 5)

    // Validate minimum deposit amount
    const depositAmountNum = parseFloat(DEPOSIT_AMOUNT);
    if (depositAmountNum < MIN_DEPOSIT_USDC) {
      throw new Error(
        `Deposit amount must be at least ${MIN_DEPOSIT_USDC} USDC. ` +
        `Amounts less than ${MIN_DEPOSIT_USDC} USDC will be lost.`
      );
    }

    // Create USDC contract instance
    const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);

    // Check USDC balance
    const decimals = await usdcContract.decimals();
    const balance = await usdcContract.balanceOf(signerAddress);
    const balanceFormatted = ethers.utils.formatUnits(balance, decimals);

    // Validate sufficient balance
    const depositAmountWei = ethers.utils.parseUnits(DEPOSIT_AMOUNT, decimals);
    if (balance < depositAmountWei) {
      throw new Error(
        `Insufficient USDC balance. Required: ${DEPOSIT_AMOUNT} USDC, Available: ${balanceFormatted} USDC`
      );
    }

    console.log(`Depositing ${DEPOSIT_AMOUNT} USDC to Hyperliquid Bridge2...`);
    console.log(`Current balance: ${balanceFormatted} USDC\n`);

    // Transfer USDC to Bridge2 contract
    const tx = await usdcContract.transfer(BRIDGE2_ADDRESS, depositAmountWei);

    console.log(`Transaction hash: ${tx.hash}`);
    console.log(`Arbiscan: https://arbiscan.io/tx/${tx.hash}`);

    // Wait for confirmation
    console.log("\n⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log(`\n✅ Transaction confirmed.`);
    console.log(`Block: ${receipt?.blockNumber} | Gas: ${receipt?.gasUsed.toString()}`);
    console.log(`💡 Run: npm run example:hl-account (to verify balance)`);

  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error);
    process.exit(1);
  }
}

main();
