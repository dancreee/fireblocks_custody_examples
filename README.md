# Fireblocks TypeScript Examples

Examples demonstrating Fireblocks SDK, Web3 Provider, and Hyperliquid EIP-712 integration for custody operations and DeFi.

## Setup

```bash
npm install
cp .env.example .env
# Add your credentials to .env
```

Required env vars:
- `FIREBLOCKS_API_KEY` - Fireblocks API key
- `FIREBLOCKS_SECRET_KEY_PATH` - Path to secret key file
- `FIREBLOCKS_BASE_PATH` - API base path (sandbox/production)
- `ALCHEMY_API_KEY` - Alchemy key for Ethereum/Arbitrum RPC

## Examples

### Fireblocks SDK

```bash
npm run example:list-default          # List vault accounts by name
npm run example:list-assets           # List vaults with assets
npm run example:transfer-vault        # Internal transfer
npm run example:transfer-address      # Transfer to external address
npm run example:transfer-wallet       # Transfer to whitelisted wallet
npm run example:wrap-eth              # Wrap ETH to WETH
npm run example:unwrap-weth           # Unwrap WETH to ETH
npm run example:aave-supply           # Supply WETH to Aave V3
npm run example:aave-withdraw         # Withdraw WETH from Aave V3
npm run example:approve-erc20         # Approve ERC20 spending
```

### Web3 Provider (ethers.js)

```bash
npm run example:web3-send-tx          # Send ETH transaction
npm run example:web3-wrap-eth         # Wrap ETH to WETH
npm run example:web3-unwrap-weth      # Unwrap WETH to ETH
npm run example:web3-approve-erc20    # Approve ERC20 spending
npm run example:web3-aave-supply      # Supply WETH to Aave V3
npm run example:web3-aave-withdraw    # Withdraw WETH from Aave V3
npm run example:web3-hl-deposit       # Deposit USDC to Hyperliquid
```

**Note:** Update vault IDs, addresses, and amounts in example files before running.

### Hyperliquid + Fireblocks EIP-712

EIP-712 signing for Hyperliquid perps via Fireblocks custody. Requires USDC on Hyperliquid mainnet.

```bash
npm run example:hl-account    # View account balance and positions
npm run example:hl-order      # Place long/short orders (requires Fireblocks approval)
npm run example:hl-withdraw   # Withdraw USDC to Arbitrum (requires Fireblocks approval)
```

## Project Structure

```
src/
├── config.ts                                    # Environment config
├── Fireblocks-SDK-examples/                     # SDK-based examples
│   ├── fireblocks/                              # SDK helper modules
│   └── example-*.ts                             # Example scripts
├── Fireblocks-Web3-provider-examples/           # Web3 provider examples
│   └── example-*.ts                             # Example scripts
└── Fireblocks-HL-TypedMessage-examples/         # Hyperliquid EIP-712 examples
    ├── adapters/
    │   ├── FireblocksEip712Signer.ts            # EIP-712 signer
    │   └── HyperliquidAdapter.ts                # Hyperliquid adapter
    ├── types/                                   # Type definitions
    └── example-*.ts                             # Example scripts
```

## Development

```bash
npm run build      # Compile TypeScript
npm run lint       # Run ESLint
npm run format     # Format with Prettier
```

## Resources

- [Fireblocks TypeScript SDK](https://developers.fireblocks.com/reference/typescript-sdk)
- [Fireblocks Web3 Provider](https://developers.fireblocks.com/docs/ethereum-development-web3-provider)
- [Fireblocks API Reference](https://developers.fireblocks.com/reference)
- [Hyperliquid Documentation](https://hyperliquid.gitbook.io/hyperliquid-docs)
- [@nktkas/hyperliquid SDK](https://github.com/nktkas/hyperliquid)
