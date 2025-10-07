/**
 * Transaction monitoring utilities for tracking Fireblocks transactions
 * from creation through approval, signing, broadcasting, and on-chain confirmation.
 */

import { Fireblocks, TransactionStateEnum } from "@fireblocks/ts-sdk";
import { ethers } from "ethers";

// Type alias for transaction status
type TransactionStatus =
  (typeof TransactionStateEnum)[keyof typeof TransactionStateEnum];

/**
 * Terminal transaction states that indicate completion
 */
const TERMINAL_STATES: TransactionStatus[] = [
  TransactionStateEnum.Completed,
  TransactionStateEnum.Failed,
  TransactionStateEnum.Rejected,
  TransactionStateEnum.Cancelled,
  TransactionStateEnum.Blocked,
];

export interface OnChainDetails {
  txHash?: string;
  blockNumber?: number;
  confirmations?: number;
}

export interface MonitorResult extends OnChainDetails {
  id: string;
  status: TransactionStatus;
  error?: string;
}

/**
 * Monitors a Fireblocks transaction until it reaches a terminal state,
 * then optionally waits for on-chain confirmation.
 *
 * @param fireblocks - Initialized Fireblocks SDK instance
 * @param txId - Transaction ID from createTransaction
 * @param options - Monitoring options
 * @returns Final transaction status with on-chain details
 */
export async function monitorTransaction(
  fireblocks: Fireblocks,
  txId: string,
  options: {
    pollInterval?: number; // Milliseconds between status checks (default: 2000)
    waitForConfirmations?: number; // Number of on-chain confirmations to wait for (default: 1)
    rpcUrl?: string; // Ethereum RPC URL for on-chain monitoring (optional)
  } = {}
): Promise<MonitorResult> {
  const { pollInterval = 2000, waitForConfirmations = 1, rpcUrl } = options;

  // Phase 1: Monitor Fireblocks internal status
  let currentStatus: string | undefined;
  let txHash: string | undefined;

  while (true) {
    const txInfo = await fireblocks.transactions.getTransaction({ txId });
    const tx = txInfo.data;

    currentStatus = tx.status;

    // Capture transaction hash when available
    if (tx.txHash && !txHash) {
      txHash = tx.txHash;
    }

    // Check if we've reached a terminal state
    if (TERMINAL_STATES.includes(currentStatus as any)) {
      // Failed/rejected states
      if (
        currentStatus === TransactionStateEnum.Failed ||
        currentStatus === TransactionStateEnum.Rejected ||
        currentStatus === TransactionStateEnum.Cancelled ||
        currentStatus === TransactionStateEnum.Blocked
      ) {
        return {
          id: txId,
          status: currentStatus as TransactionStatus,
          txHash,
          error: `Transaction ${currentStatus.toLowerCase()}`,
        };
      }

      // Success - transaction completed in Fireblocks
      break;
    }

    // Wait before next poll
    await sleep(pollInterval);
  }

  // Phase 2: Monitor on-chain confirmation (if RPC URL provided and we have a tx hash)
  if (rpcUrl && txHash) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);

      // Wait for transaction to be mined
      const receipt = await provider.waitForTransaction(
        txHash,
        waitForConfirmations
      );

      if (!receipt) {
        return {
          id: txId,
          status: currentStatus as TransactionStatus,
          txHash,
          error: "Transaction receipt not found",
        };
      }

      const blockNumber = receipt.blockNumber;
      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - blockNumber + 1;

      return {
        id: txId,
        status: currentStatus as TransactionStatus,
        txHash,
        blockNumber,
        confirmations,
      };
    } catch (error) {
      return {
        id: txId,
        status: currentStatus as TransactionStatus,
        txHash,
        error: `On-chain monitoring failed: ${error}`,
      };
    }
  }

  // No on-chain monitoring requested or no tx hash available
  return {
    id: txId,
    status: currentStatus as TransactionStatus,
    txHash,
  };
}

/**
 * Sleep utility for polling intervals
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
