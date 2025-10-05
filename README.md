# Fireblocks TypeScript SDK Examples

A collection of examples demonstrating the Fireblocks TypeScript SDK for custody operations. This project showcases common workflows including vault management, internal transfers, and external transactions.

## Overview

This project demonstrates:
- Vault account management and filtering
- Internal transfers between vaults
- External transfers to one-time addresses
- Transfers to whitelisted external wallets

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Credentials

Copy the example environment file and add your Fireblocks credentials:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
FIREBLOCKS_API_KEY=your-api-key-here
FIREBLOCKS_SECRET_KEY_PATH=./fireblocks_secret.key
FIREBLOCKS_BASE_PATH=sandbox
```

Place your Fireblocks secret key file in the project root (or update the path in `.env`).

### 3. Run Examples

Each example can be run independently:

```bash
# List vault accounts filtered by name
npm run example:list-default

# List vault accounts that have assets
npm run example:list-assets

# Transfer between vault accounts
npm run example:transfer-vault

# Transfer to a one-time external address
npm run example:transfer-address

# Transfer to a whitelisted external wallet
npm run example:transfer-wallet
```

**Note:** Before running transfer examples, update the hardcoded values (asset IDs, vault IDs, addresses) in the example files to match your workspace configuration.

## Project Structure

```
src/
├── config.ts              # Environment variables and configuration
├── client.ts              # Fireblocks SDK initialization
├── types.ts               # TypeScript type definitions
├── fireblocks/
│   ├── vaults.ts          # Vault account operations
│   ├── transactions.ts    # Transaction creation and management
│   └── wallets.ts         # External wallet operations
└── examples/
    ├── example-list-default-accounts.ts
    ├── example-list-accounts-with-assets.ts
    ├── example-transfer-to-vault.ts
    ├── example-transfer-to-external-address.ts
    └── example-transfer-to-external-wallet.ts
```

### Architecture

- **`config.ts`** - Loads environment variables (API keys, paths, environment selection)
- **`client.ts`** - Initializes the Fireblocks SDK client with credentials
- **`types.ts`** - Shared TypeScript interfaces for type safety
- **`fireblocks/`** - Domain-specific helper functions organized by feature
- **`examples/`** - Runnable example scripts demonstrating different use cases

## Development

### Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

Output will be in the `dist/` directory.

### Code Quality

This project uses ESLint and Prettier for code quality and formatting:

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FIREBLOCKS_API_KEY` | Your Fireblocks API key | Required |
| `FIREBLOCKS_SECRET_KEY_PATH` | Path to your secret key file | `./fireblocks_secret.key` |
| `FIREBLOCKS_BASE_PATH` | Environment (`sandbox` or `production`) | `sandbox` |

## Security Notes

- Never commit your `.env` file or secret key files to version control
- The `.gitignore` is configured to exclude these files
- Use sandbox environment for testing before production
- Review transaction policies and approval flows in your Fireblocks console

## Resources

- [Fireblocks TypeScript SDK Documentation](https://developers.fireblocks.com/reference/typescript-sdk)
- [Fireblocks API Reference](https://developers.fireblocks.com/reference)
- [Fireblocks Developer Portal](https://developers.fireblocks.com/)

## License

This is a demonstration project for internal use.
