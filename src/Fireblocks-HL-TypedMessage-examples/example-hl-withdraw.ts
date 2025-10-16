/**
 * Hyperliquid Withdrawal Example
 *
 * This script demonstrates withdrawing USDC from Hyperliquid to Arbitrum
 * using Fireblocks custody for EIP-712 signature signing.
 *
 * The withdrawal process:
 * 1. Creates a withdrawal request signed via Fireblocks
 * 2. Hyperliquid L1 validators sign and submit to bridge contract
 *
 * Usage:
 *   npm run example:hl-withdraw
 */

import BigNumber from "bignumber.js";
import { HyperliquidAdapter } from "./adapters/HyperliquidAdapter";
import { BasePath } from "@fireblocks/ts-sdk";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH } from "@/config";
import * as readline from "readline";

const VAULT_ACCOUNT_ID = 0;
const HL_WITHDRAW_FEE_USDC = 1;

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  try {
    console.log("=== Hyperliquid Withdrawal ===\n");

    const adapter = new HyperliquidAdapter({
      apiKey: API_KEY,
      secretKeyPath: SECRET_KEY_PATH,
      vaultAccountId: VAULT_ACCOUNT_ID,
      apiBaseUrl: BASE_PATH.includes("sandbox") ? BasePath.Sandbox : BasePath.US,
    });

    const account = await adapter.getAddress();
    console.log(`Account: ${account}`);

    // Get current account balance
    const accountInfo = await adapter.getAccountInfo();
    const withdrawable = new BigNumber(accountInfo.withdrawable);

    console.log(`Available Balance: ${withdrawable.toString()} USDC`);
    console.log(`Withdrawal Fee: ${HL_WITHDRAW_FEE_USDC} USDC`);

    // Validate balance
    if (withdrawable.isLessThanOrEqualTo(HL_WITHDRAW_FEE_USDC)) {
      console.error(`❌ Insufficient balance. Need more than ${HL_WITHDRAW_FEE_USDC} USDC to withdraw.`);
      process.exit(1);
    }

    // Prompt for amount
    const amountInput = await prompt("Enter withdrawal amount (USDC): ");
    const amount = new BigNumber(amountInput);

    // Validate input
    if (amount.isNaN() || amount.isLessThanOrEqualTo(0)) {
      console.error("❌ Invalid amount. Must be a positive number.");
      process.exit(1);
    }

    if (amount.isGreaterThan(withdrawable)) {
      console.error(`❌ Amount exceeds available balance (${withdrawable.toString()} USDC).`);
      process.exit(1);
    }

    if (amount.isLessThanOrEqualTo(HL_WITHDRAW_FEE_USDC)) {
      console.error(`❌ Amount must be greater than withdrawal fee (${HL_WITHDRAW_FEE_USDC} USDC).`);
      process.exit(1);
    }

    // Calculate net amount
    const netAmount = amount.minus(HL_WITHDRAW_FEE_USDC);

    console.log("\n--- Withdrawal Summary ---");
    console.log(`Gross Amount: ${amount.toString()} USDC`);
    console.log(`Fee: ${HL_WITHDRAW_FEE_USDC} USDC`);
    console.log(`Net Amount: ${netAmount.toString()} USDC`);
    console.log("--------------------------\n");

    const confirm = await prompt("Confirm withdrawal? (yes/no): ");
    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("Withdrawal cancelled.");
      process.exit(0);
    }

    console.log("\n⏳ Initiating withdrawal (approve on Fireblocks)...\n");

    const result = await adapter.initiateWithdrawal(amount);

    console.log("✅ Withdrawal initiated successfully!\n");
    console.log("--- Withdrawal Details ---");
    console.log(`Net Amount: ${result.outputAmount.toString()} USDC`);
    console.log("--------------------------\n");

    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message || error}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
