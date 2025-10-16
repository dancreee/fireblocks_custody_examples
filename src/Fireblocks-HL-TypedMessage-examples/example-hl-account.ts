/**
 * Test: Hyperliquid Account Info (Read-Only)
 *
 * This script tests the read-only getAccountInfo() and getOpenOrders() methods.
 * No signing or Fireblocks approval required.
 *
 * Usage:
 *   npm run example:hl-account
 */

import { HyperliquidAdapter } from "./adapters/HyperliquidAdapter";
import { BasePath } from "@fireblocks/ts-sdk";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH } from "@/config";

const VAULT_ACCOUNT_ID = 0;

async function main() {
  try {
    // Initialize adapter
    const adapter = new HyperliquidAdapter({
      apiKey: API_KEY,
      secretKeyPath: SECRET_KEY_PATH,
      vaultAccountId: VAULT_ACCOUNT_ID,
      apiBaseUrl: BASE_PATH.includes("sandbox") ? BasePath.Sandbox : BasePath.US,
    });

    // Get account address from Fireblocks
    const account = await adapter.getAddress();
    console.log(`Account: ${account}\n`);

    // Fetch account state
    console.log("Fetching account info...\n");
    const accountInfo = await adapter.getAccountInfo();

    // Display margin summary
    console.log("Margin Summary:");
    console.log(`  Account Value: ${accountInfo.marginSummary.accountValue}`);
    console.log(`  Total Margin Used: ${accountInfo.marginSummary.totalMarginUsed}`);
    console.log(`  Total Raw USD: ${accountInfo.marginSummary.totalRawUsd}`);

    // Display positions
    console.log(`\nPositions (${accountInfo.assetPositions.length}):`);
    if (accountInfo.assetPositions.length === 0) {
      console.log("  No open positions");
    } else {
      for (const position of accountInfo.assetPositions) {
        console.log(`  ${position.position.coin}`);
        console.log(`    Size: ${position.position.szi}`);
        console.log(`    Entry Price: ${position.position.entryPx || "N/A"}`);
        console.log(`    Unrealized PnL: ${position.position.unrealizedPnl}`);
      }
    }

    // Fetch open orders
    console.log("\nFetching open orders...\n");
    const openOrders = await adapter.getOpenOrders();

    console.log(`Open Orders (${openOrders.length}):`);
    if (openOrders.length === 0) {
      console.log("  No open orders");
    } else {
      for (const order of openOrders) {
        console.log(`  Order ${order.oid}`);
        console.log(`    Coin: ${order.coin}`);
        console.log(`    Side: ${order.side}`);
        console.log(`    Size: ${order.sz}`);
        console.log(`    Limit Price: ${order.limitPx}`);
      }
    }

    await adapter.closeConnection();
    process.exit(0);
  } catch (error: any) {
    console.error(`Error: ${error.message || error}`);
    process.exit(1);
  }
}

main();
