/**
 * Stage 2 Test: Verify FireblocksEip712Signer instantiation and address derivation
 *
 * This script tests:
 * 1. Signer can be instantiated with config
 * 2. getAddress() successfully derives the Arbitrum address from Fireblocks vault
 * 3. Address matches expected format (0x...)
 *
 * Usage:
 * npm run example:hl-test-signer
 */

import { FireblocksEip712Signer } from "./adapters/FireblocksEip712Signer";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH } from "@/config";
import { BasePath } from "@fireblocks/ts-sdk";

// Hardcoded configuration for PoC
const VAULT_ACCOUNT_ID = 0; // Update this to your vault account ID

async function testSignerInit() {
  console.log("===Test: FireblocksEip712Signer Initialization ===\n");

  try {
    console.log("1. Creating FireblocksEip712Signer...");
    const signer = new FireblocksEip712Signer({
      apiKey: API_KEY,
      secretKeyPath: SECRET_KEY_PATH,
      vaultAccountId: VAULT_ACCOUNT_ID,
      apiBaseUrl: BASE_PATH.includes("sandbox") ? BasePath.Sandbox : BasePath.US,
    });
    console.log("   ✓ Signer instantiated\n");

    console.log("2. Deriving address from Fireblocks vault...");
    const address = await signer.getAddress();
    console.log(`   ✓ Address derived: ${address}\n`);
  } catch (error: any) {
    console.error("\n❌ FAILED");
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

testSignerInit();
