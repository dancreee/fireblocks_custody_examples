/**
 * Stage 3: Standalone Fireblocks EIP-712 Signing Test
 *
 * Steps:
 * 1) Instantiates FireblocksEip712Signer
 * 2) Builds a minimal EIP-712 domain/types/message (not HL-specific)
 * 3) Calls signTypedData and waits for mobile approval
 * 4) Verifies the signature is 65 bytes with 0x prefix
 * 5) Logs domain, chainId, txId (from signer logs) and signature
 *
 * Usage:
 *   npm run example:hl-test-signing
 */

import { ethers } from "ethers";
import { BasePath } from "@fireblocks/ts-sdk";
import { FireblocksEip712Signer } from "./adapters/FireblocksEip712Signer";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH } from "@/config";

// Update this to your vault account ID before running
const VAULT_ACCOUNT_ID = 0;

async function main() {
  try {
    // 1) Instantiate signer
    const signer = new FireblocksEip712Signer({
      apiKey: API_KEY,
      secretKeyPath: SECRET_KEY_PATH,
      vaultAccountId: VAULT_ACCOUNT_ID,
      apiBaseUrl: BASE_PATH.includes("sandbox") ? BasePath.Sandbox : BasePath.US,
    });

    const addr = await signer.getAddress();
    console.log(`Signer address: ${addr}`);

    // 2) Minimal EIP-712 typed data
    const chainId = 42161;
    const domain: ethers.TypedDataDomain = {
      name: "Test",
      version: "1",
      chainId,
    };

    const types: Record<string, ethers.TypedDataField[]> = {
      TestMessage: [
        { name: "from", type: "address" },
        { name: "contents", type: "string" },
        { name: "value", type: "uint256" },
      ],
    };

    const message = {
      from: addr,
      contents: "Hello from Fireblocks",
      value: 12345,
    };

    console.log("Requesting signature via Fireblocks\n");

    // 3) Sign via Fireblocks
    const signature = await signer.signTypedData(domain, types, message);

    // 4) Verify signature format (strict 65-byte validation)
    if (!signature.startsWith("0x")) {
      throw new Error("Signature missing 0x prefix");
    }
    const bytes = signature.slice(2);
    if (bytes.length !== 130) {
      throw new Error(`Signature length invalid: ${bytes.length} hex chars (expected 130 for 65-byte signature)`);
    }

    // 5) Log result
    console.log("\n✓ Signature received and validated");
    console.log(`Length: ${bytes.length} hex chars (65-byte r,s,v signature)`);
    console.log(`Signature: ${signature}`);
    process.exit(0);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
