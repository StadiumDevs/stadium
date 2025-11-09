# Backend Network Configuration Setup

This guide explains how to configure the backend server for testnet (Paseo) or mainnet (Polkadot).

## Environment Variables

The backend uses the following environment variables in `.env`:

```bash
# Network environment: 'testnet' or 'mainnet'
NETWORK_ENV=testnet

# Authorized signers (comma-separated list of addresses)
# These are the addresses that can sign for the multisig
AUTHORIZED_SIGNERS=5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF,5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9,133BE1QFPWH3WhryCyV4jd8zHx6p8ZsmgbbPC1oH6WyKJSy7

# Legacy admin wallets support (for backward compatibility)
# Falls back to this if AUTHORIZED_SIGNERS is not set
ADMIN_WALLETS=

# Other configuration
MONGO_URI=mongodb://localhost:27017/stadium
EXPECTED_DOMAIN=localhost
PORT=3000
NODE_ENV=development
```

## Quick Setup

### Testnet (Development/Staging)

Create or update `server/.env`:

```bash
NETWORK_ENV=testnet
AUTHORIZED_SIGNERS=5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF,5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9,133BE1QFPWH3WhryCyV4jd8zHx6p8ZsmgbbPC1oH6WyKJSy7
MONGO_URI=mongodb://localhost:27017/stadium
EXPECTED_DOMAIN=localhost
```

### Mainnet (Production)

```bash
NETWORK_ENV=mainnet
AUTHORIZED_SIGNERS=<production-authorized-addresses>
MONGO_URI=<production-mongodb-uri>
EXPECTED_DOMAIN=<production-domain>
```

## Configuration Details

### NETWORK_ENV

- **testnet**: Uses Paseo Asset Hub multisig (`169Lg4Y4YpuW9SdZ9bZSgJZ7nNo9waQNjGraSnvkQFacRtHM`)
- **mainnet**: Uses Polkadot Asset Hub multisig (`5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF`)
- **Default**: Falls back to `testnet` if not set

### AUTHORIZED_SIGNERS

- Comma-separated list of SS58 addresses
- These addresses can sign transactions for the multisig
- Used for admin authentication in payment confirmation
- Must match the signatories configured for the multisig

**Example:**
```
AUTHORIZED_SIGNERS=addr1,addr2,addr3
```

### Admin Authorization Flow

1. Admin signs in with their wallet (SIWS)
2. Server verifies the signature
3. Server checks if the address is in `AUTHORIZED_SIGNERS`
4. If authorized, allows admin actions (payment confirmation, etc.)

## How It Works

The backend uses `server/config/polkadot-config.js` which:

1. Reads `NETWORK_ENV` from environment
2. Selects the appropriate multisig address
3. Loads authorized signers from `AUTHORIZED_SIGNERS`
4. Provides helper functions for authorization checks

### Usage in Code

```javascript
import { 
  isAuthorizedSigner, 
  CURRENT_MULTISIG, 
  NETWORK_CONFIG 
} from '../config/polkadot-config.js';

// Check if address is authorized
if (isAuthorizedSigner(address)) {
  // Allow admin action
}

// Get current multisig
console.log('Multisig:', CURRENT_MULTISIG);

// Get network info
console.log('Network:', NETWORK_CONFIG);
```

## Startup Verification

When the server starts, you should see:

```
🌐 Polkadot Network Configuration (Backend):
   Environment: testnet
   Network: Paseo Asset Hub
   Multisig: 169Lg4Y4YpuW9SdZ9bZSgJZ7nNo9waQNjGraSnvkQFacRtHM
   RPC: wss://paseo-asset-hub-rpc.polkadot.io
   Authorized Signers: 3
   SS58 Format: 42

[AuthMiddleware] Configuration:
  Network: Paseo Asset Hub
  Multisig: 169Lg4Y4YpuW9SdZ9bZSgJZ7nNo9waQNjGraSnvkQFacRtHM
  Authorized Signers: 3
```

## Security Notes

1. **Never commit `.env` files to git** - they contain sensitive configuration
2. **Use different multisigs for testnet and mainnet**
3. **Verify authorized signers** before deploying to production
4. **Test on testnet first** before using mainnet configuration

## Backward Compatibility

The backend supports legacy `ADMIN_WALLETS` environment variable:

- If `AUTHORIZED_SIGNERS` is set, it takes precedence
- If `AUTHORIZED_SIGNERS` is empty, falls back to `ADMIN_WALLETS`
- Allows gradual migration from old configuration

## Deployment Checklist

- [ ] Set `NETWORK_ENV` to appropriate value
- [ ] Configure `AUTHORIZED_SIGNERS` with correct addresses
- [ ] Verify multisig address matches expected value
- [ ] Test admin authentication flow
- [ ] Verify payment confirmation works
- [ ] Check server logs for correct network config

