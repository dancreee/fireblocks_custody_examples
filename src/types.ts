export interface VaultAccount {
  id?: string;
  name?: string;
  hiddenOnUI?: boolean;
  autoFuel?: boolean;
  assets?: Array<{
    id?: string;
    total?: string;
    balance?: string;
    lockedAmount?: string;
    available?: string;
    pending?: string;
    frozen?: string;
    staked?: string;
    blockHeight?: string;
    blockHash?: string;
  }>;
}

export interface GetVaultAccountsOptions {
  nameFilter?: string;
  onlyWithAssets?: boolean;
}

export interface TransactionDestination {
  vaultId?: string;           // For vault account transfers
  externalWalletId?: string;  // For whitelisted external wallets
  oneTimeAddress?: string;    // For one-time external addresses
}
