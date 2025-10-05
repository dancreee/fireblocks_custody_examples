import { Fireblocks, BasePath } from "@fireblocks/ts-sdk";
import { readFileSync } from "fs";
import * as path from "path";
import { API_KEY, SECRET_KEY_PATH, BASE_PATH } from "@/config";

/**
 * Initializes and returns a configured Fireblocks SDK client instance.
 *
 * This function reads the API credentials from environment variables and
 * the secret key from the file system, then creates a Fireblocks client
 * configured for either sandbox or production environment.
 *
 * @returns {Fireblocks} A configured Fireblocks SDK client instance
 * @throws {Error} If the secret key file cannot be read or credentials are invalid
 *
 * @example
 * ```typescript
 * const fireblocks = initializeFireblocks();
 * const vaults = await fireblocks.vaults.getPagedVaultAccounts({});
 * ```
 */
export function initializeFireblocks(): Fireblocks {
  return new Fireblocks({
    apiKey: API_KEY,
    basePath: BASE_PATH === "sandbox" ? BasePath.Sandbox : BasePath.US,
    secretKey: readFileSync(path.resolve(SECRET_KEY_PATH), "utf8"),
  });
}
