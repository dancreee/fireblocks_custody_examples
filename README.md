# Fireblocks TypeScript Examples

Examples demonstrating Fireblocks SDK and Web3 Provider for custody operations, vault management, and DeFi interactions.

## Setup

```bash
npm install
cp .env.example .env
# Add your credentials to .env
```

Required env vars: `FIREBLOCKS_API_KEY`, `FIREBLOCKS_SECRET_KEY_PATH`, `FIREBLOCKS_BASE_PATH`

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
```

**Note:** Update vault IDs, addresses, and amounts in example files before running.

## Project Structure

```
src/
├── config.ts                           # Environment config
├── examples/
│   ├── Fireblocks-SDK-examples/       # SDK-based examples
│   └── Fireblocks-Web3-provider-examples/  # ethers.js Web3 provider examples
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
