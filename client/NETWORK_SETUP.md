# Network Configuration Setup

This guide explains how to configure the application for testnet (Paseo) or mainnet (Polkadot).

## Environment Variable

The application uses `VITE_NETWORK_ENV` to determine which network to use.

### Setup

Create or update `client/.env.local`:

```bash
# For testnet (Paseo Asset Hub)
VITE_NETWORK_ENV=testnet

# For mainnet (Polkadot Asset Hub)
# VITE_NETWORK_ENV=mainnet
```

**⚠️ Important:** `.env.local` is gitignored for security. Each developer/deployment must create their own.

## Quick Setup Commands

```bash
# Navigate to client directory
cd client

# Create .env.local for TESTNET (recommended for development)
echo "VITE_NETWORK_ENV=testnet" > .env.local

# OR create .env.local for MAINNET (production only)
echo "VITE_NETWORK_ENV=mainnet" > .env.local
```

## Network Configurations

### Testnet (Paseo Asset Hub)
```
Network: Paseo Asset Hub
Environment: testnet
Multisig: 169Lg4Y4YpuW9SdZ9bZSgJZ7nNo9waQNjGraSnvkQFacRtHM
RPC: wss://paseo-asset-hub-rpc.polkadot.io
SS58 Format: 42
Subscan: https://paseo.subscan.io
```

### Mainnet (Polkadot Asset Hub)
```
Network: Polkadot Asset Hub  
Environment: mainnet
Multisig: 5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF
RPC: wss://asset-hub-polkadot-rpc.polkadot.io
SS58 Format: 0
Subscan: https://assethub-polkadot.subscan.io
```

## Usage in Code

```typescript
import {
  NETWORK_ENV,
  CURRENT_MULTISIG,
  CURRENT_RPC,
  CURRENT_NETWORK_NAME,
  isTestnet,
  isMainnet,
  getTransactionUrl
} from '@/lib/polkadot-config';

// Check current environment
console.log('Network:', CURRENT_NETWORK_NAME);
console.log('Multisig:', CURRENT_MULTISIG);

// Conditional logic
if (isTestnet()) {
  console.log('Running on Paseo testnet');
}

// Generate transaction URL
const txUrl = getTransactionUrl('0x123...');
console.log('View transaction:', txUrl);
```

## Default Behavior

If `VITE_NETWORK_ENV` is not set, the application defaults to **testnet** for safety.

## Verification

After setup, restart your dev server and check the console for:

```
🌐 Polkadot Network Configuration: {
  environment: 'testnet',
  networkName: 'Paseo Asset Hub',
  multisigAddress: '169Lg4Y4YpuW9SdZ9bZSgJZ7nNo9waQNjGraSnvkQFacRtHM',
  rpcEndpoint: 'wss://paseo-asset-hub-rpc.polkadot.io',
  ...
}
```

## Deployment

### Development/Staging
Always use `testnet` for development and staging environments.

### Production
Only use `mainnet` in production after thorough testing on testnet.

**⚠️ Warning:** Ensure your deployment environment sets `VITE_NETWORK_ENV=mainnet` explicitly for production.

