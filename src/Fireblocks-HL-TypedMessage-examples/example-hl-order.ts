/**
 * Interactive Hyperliquid Order Placement
 *
 * This script allows you to:
 * - Open a long position (buy)
 * - Open a short position (sell)
 * - Close an existing position
 * - Specify custom order size
 *
 * Usage:
 *   npm run example:hl-order
 */

import BigNumber from "bignumber.js";
import { HyperliquidAdapter } from "./adapters/HyperliquidAdapter";
import { BasePath } from "@fireblocks/ts-sdk";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH } from "@/config";
import * as readline from "readline";

const VAULT_ACCOUNT_ID = 0;

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
    console.log("=== Hyperliquid Order Placement ===\n");

    const adapter = new HyperliquidAdapter({
      apiKey: API_KEY,
      secretKeyPath: SECRET_KEY_PATH,
      vaultAccountId: VAULT_ACCOUNT_ID,
      apiBaseUrl: BASE_PATH.includes("sandbox") ? BasePath.Sandbox : BasePath.US,
    });

    const account = await adapter.getAddress();
    console.log(`Account: ${account}\n`);

    // Get current position
    const accountInfo = await adapter.getAccountInfo();
    const ethPosition = accountInfo.assetPositions.find(
      (p: any) => p.position.coin === "ETH"
    );

    const ethInfo: any = await adapter.getPerpInfo(1);
    console.log(`ETH Mark Price: ${ethInfo.markPx}`);

    if (ethPosition) {
      const currentSize = new BigNumber(ethPosition.position.szi);
      const direction = currentSize.isPositive() ? "LONG" : "SHORT";
      console.log(`Current Position: ${direction} ${currentSize.abs().toString()} ETH`);
      console.log(`Entry Price: ${ethPosition.position.entryPx}`);
      console.log(`Unrealized PnL: ${ethPosition.position.unrealizedPnl}\n`);
    } else {
      console.log("Current Position: None\n");
    }

    // Show menu
    console.log("Options:");
    console.log("  1. Open LONG (buy)");
    console.log("  2. Open SHORT (sell)");
    if (ethPosition) {
      console.log("  3. CLOSE position");
    }
    console.log("  4. Exit\n");

    const choice = await prompt("Select option (1-4): ");

    if (choice === "4") {
      console.log("Exiting...");
      process.exit(0);
    }

    let orderSize: BigNumber;

    if (choice === "3" && ethPosition) {
      // Close position: reverse the current size
      const currentSize = new BigNumber(ethPosition.position.szi);
      orderSize = currentSize.negated();
      console.log(`\nClosing position: ${orderSize.abs().toString()} ETH`);
    } else if (choice === "1" || choice === "2") {
      // Get size from user
      const sizeInput = await prompt("\nEnter size (ETH, e.g., 0.01): ");
      const size = new BigNumber(sizeInput);

      if (size.isNaN() || size.isLessThanOrEqualTo(0)) {
        console.error("Invalid size. Must be a positive number.");
        process.exit(1);
      }

      // Set direction: choice 1 = long (positive), choice 2 = short (negative)
      orderSize = choice === "1" ? size : size.negated();

      const direction = choice === "1" ? "LONG" : "SHORT";
      console.log(`\nOrder: ${direction} ${size.toString()} ETH`);
    } else {
      console.error("Invalid option.");
      process.exit(1);
    }

    console.log("\n⏳ Placing order (approve on Fireblocks)...\n");

    await adapter.adjustExposure(orderSize);

    console.log("✅ Order placed successfully!\n");

    // Show updated position
    const updatedAccountInfo = await adapter.getAccountInfo();
    const updatedPosition = updatedAccountInfo.assetPositions.find(
      (p: any) => p.position.coin === "ETH"
    );

    console.log("Updated Position:");
    if (!updatedPosition) {
      console.log("  No open position");
    } else {
      const size = new BigNumber(updatedPosition.position.szi);
      const direction = size.isPositive() ? "LONG" : "SHORT";
      console.log(`  ${direction} ${size.abs().toString()} ETH`);
      console.log(`  Entry Price: ${updatedPosition.position.entryPx}`);
      console.log(`  Unrealized PnL: ${updatedPosition.position.unrealizedPnl}`);
    }

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