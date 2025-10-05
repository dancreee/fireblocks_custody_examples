import "dotenv/config";

export const API_KEY = process.env.FIREBLOCKS_API_KEY || "";
export const SECRET_KEY_PATH = process.env.FIREBLOCKS_SECRET_KEY_PATH || "./fireblocks_secret.key";
export const BASE_PATH = process.env.FIREBLOCKS_BASE_PATH || "sandbox";
