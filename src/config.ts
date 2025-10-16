import "dotenv/config";

export const API_KEY = process.env.FIREBLOCKS_API_KEY || "";
export const SECRET_KEY_PATH = process.env.FIREBLOCKS_SECRET_KEY_PATH || "./fireblocks_secret.key";
export const BASE_PATH = process.env.FIREBLOCKS_BASE_PATH || "sandbox";
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
export const ETH_RPC_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
export const ARB_RPC_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
