/**
 * Test: Hyperliquid Markets (Read-Only)
 *
 * This script tests the read-only getPerpMarkets() method.
 * No signing or Fireblocks approval required.
 *
 * Usage:
 *   npm run example:hl-markets
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

    // Fetch all perpetual markets
    console.log("Fetching perp markets...\n");
    const [meta, contexts] = await adapter.getPerpMarkets();

    console.log(`Found ${meta.length} perpetual markets:\n`);

    // Display first 10 markets
    const displayCount = Math.min(10, meta.length);
    for (let i = 0; i < displayCount; i++) {
      const market: any = meta[i];
      const context: any = contexts[i];
      console.log(`[${i}] ${market.name}`);
      console.log(`    Mark Price: ${context.markPx}`);
      console.log(`    Size Decimals: ${market.szDecimals}`);
    }

    if (meta.length > displayCount) {
      console.log(`\n... and ${meta.length - displayCount} more markets`);
    }

    await adapter.closeConnection();
    process.exit(0);
  } catch (error: any) {
    console.error(`Error: ${error.message || error}`);
    process.exit(1);
  }
}

main();
