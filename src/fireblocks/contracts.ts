import { Fireblocks, CreateTransactionResponse } from "@fireblocks/ts-sdk";

/**
 * Creates a contract call transaction through Fireblocks.
 *
 * This function allows you to interact with smart contracts on various blockchains
 * by creating a contract call transaction that will be signed by the Fireblocks vault.
 *
 * @param {Fireblocks} fireblocks - The initialized Fireblocks SDK client
 * @param {string} assetId - The asset identifier for the blockchain (e.g., "ETH_TEST5" for Sepolia)
 * @param {string} contractAddress - The smart contract address to interact with
 * @param {string} abiFunction - The ABI-encoded function call data (use ethers.js or web3.js to encode)
 * @param {string} srcVaultId - The source vault account ID
 * @param {string} [amount] - Optional amount to send with the transaction (for payable functions)
 * @param {string} [note] - Optional transaction note
 * @returns {Promise<CreateTransactionResponse>} The transaction result from the Fireblocks API
 *
 * @example
 * ```typescript
 * import { ethers } from "ethers";
 *
 * // Encode the function call
 * const iface = new ethers.Interface(["function deposit() payable"]);
 * const data = iface.encodeFunctionData("deposit", []);
 *
 * // Create the contract call
 * const txResult = await createContractCall(
 *   fireblocks,
 *   "ETH_TEST5",
 *   "0x1234...5678",
 *   data,
 *   "0",
 *   "0.01",
 *   "Deposit to protocol"
 * );
 * ```
 */
export async function createContractCall(
  fireblocks: Fireblocks,
  assetId: string,
  contractAddress: string,
  abiFunction: string,
  srcVaultId: string,
  amount?: string,
  note?: string
): Promise<CreateTransactionResponse> {
  const payload = {
    assetId,
    source: {
      type: "VAULT_ACCOUNT" as const,
      id: String(srcVaultId),
    },
    destination: {
      type: "ONE_TIME_ADDRESS" as const,
      oneTimeAddress: {
        address: contractAddress,
      },
    },
    amount: amount || "0",
    note: note || "Contract call via Fireblocks SDK",
    extraParameters: {
      contractCallData: abiFunction,
    },
  };

  const result = await fireblocks.transactions.createTransaction({
    transactionRequest: payload,
  });

  return result.data;
}
