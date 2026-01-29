# Asset Hub Paseo Testnet Setup Guide

This guide walks you through setting up and testing the multisig payment functionality on Asset Hub Paseo testnet.

## Prerequisites

- MongoDB running locally
- Node.js installed
- Access to one of the authorized signer accounts

## Configuration Overview

The system uses a 2-of-3 multisig on Asset Hub Paseo:

**Authorized Signers:**
- `5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF`
- `5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9`
- `133BE1QFPWH3WhryCyV4jd8zHx6p8ZsmgbbPC1oH6WyKJSy7`

**Multisig Address (Testnet):**
`5CSxUh77kKRGZiTsNRv5WMyBfJyFZuQfthJaobUoKB5wEfbc`

## Step 1: Configure Environment

Your `.env` file should have these settings:

```bash
# MongoDB
MONGO_URI=mongodb://localhost:27017/blockspace-stadium

# Admin Configuration
ADMIN_WALLETS=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9
DISABLE_SIWS_DOMAIN_CHECK=true
NODE_ENV=development

# Network Configuration
NETWORK_ENV=testnet

# Authorized Multisig Signers
AUTHORIZED_SIGNERS=5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF,5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9,133BE1QFPWH3WhryCyV4jd8zHx6p8ZsmgbbPC1oH6WyKJSy7

# Admin Private Key (TESTNET ONLY!)
ADMIN_PRIVATE_KEY=
```

## Step 2: Get Your Admin Private Key

You need the private key (seed phrase) for one of the authorized signers.

### Option A: If you already have it
Simply add it to `ADMIN_PRIVATE_KEY` in your `.env` file.

### Option B: Generate a new test account

⚠️ **Only do this if you're creating a NEW authorized signer for testing!**

```bash
npm run generate:test-account
```

This will generate a 12-word mnemonic and Paseo address. You'll need to:
1. Copy the mnemonic to `ADMIN_PRIVATE_KEY` in `.env`
2. Update `AUTHORIZED_SIGNERS` to include this new address
3. Regenerate the multisig address by running:
   ```bash
   npm run generate:multisig
   ```

## Step 3: Fund Your Admin Account

Your admin account needs testnet DOT to pay transaction fees.

1. **Get your admin's Paseo address** (one of the AUTHORIZED_SIGNERS)

2. **Visit the Paseo faucet:**
   https://faucet.polkadot.io/paseo

3. **Request testnet DOT**
   - Paste your admin's address
   - Request tokens (usually ~10 DOT)

4. **Verify balance on Subscan:**
   ```
   https://assethub-paseo.subscan.io/account/YOUR_ADDRESS
   ```

   ⚠️ **Important:** Check the balance on **Asset Hub Paseo**, not regular Paseo!

## Step 4: Test Transaction Submission

### Start the server

```bash
npm run dev
```

### Access the Admin UI

1. Navigate to the admin panel in your browser
2. Sign in with your admin wallet (one of the AUTHORIZED_SIGNERS)
3. Find the "Test Payment" functionality
4. Click **🧪 Test Payment**

### In the Test Payment Modal

1. **Enter a recipient address** (can be another authorized signer)
2. **Amount is fixed at 0.1 DOT** for testing
3. **Click "Test Send"**

### Expected Result

You should see a response with:
- Transaction hash
- Block hash
- Subscan URL to view the transaction

Example response:
```json
{
  "status": "finalized",
  "txHash": "0x1234...",
  "blockHash": "0x5678...",
  "subscanUrl": "https://assethub-paseo.subscan.io/extrinsic/0x1234...",
  "details": {
    "from": "5Di7WRCj...",
    "to": "5GE6ptWS...",
    "amount": "1000000000",
    "fee": "123456"
  }
}
```

## Step 5: Verify on Subscan

1. Click the Subscan URL from the response
2. Verify the transaction shows as **Success**
3. Check:
   - Sender address matches your admin
   - Recipient address is correct
   - Amount is 0.1 DOT (1,000,000,000 plancks)

## Troubleshooting

### Error: "Admin private key not configured"
- Add your mnemonic or hex private key to `ADMIN_PRIVATE_KEY` in `.env`
- Restart the server

### Error: "Invalid mnemonic or private key"
- Ensure you're using a valid 12 or 24-word mnemonic
- OR a 0x-prefixed hex private key
- Check for extra spaces or typos

### Error: "Insufficient balance"
- Your admin account needs testnet DOT
- Visit the faucet: https://faucet.polkadot.io/paseo
- Verify balance on Asset Hub Paseo (not regular Paseo!)

### Error: "Transaction timeout"
- Network might be congested
- Try again after a few minutes
- Check if Asset Hub Paseo RPC is responding:
  ```bash
  npm run test:transaction
  ```

### Error: "Invalid checksum"
- DO NOT lowercase SS58 addresses
- Addresses are case-sensitive
- Copy addresses exactly as provided

## Network Information

**Asset Hub Paseo (Testnet):**
- RPC: `wss://asset-hub-paseo-rpc.n.dwellir.com`
- Explorer: https://assethub-paseo.subscan.io/
- Chain ID: Asset Hub Paseo
- SS58 Format: 42

**Asset Hub Polkadot (Mainnet):**
- RPC: `wss://asset-hub-polkadot-rpc.polkadot.io`
- Explorer: https://assethub-polkadot.subscan.io/
- Chain ID: Asset Hub Polkadot
- SS58 Format: 0

## Security Warnings

⚠️ **CRITICAL - Read before proceeding:**

1. **TESTNET ONLY**
   - The `ADMIN_PRIVATE_KEY` is for TESTNET only
   - NEVER use this configuration on mainnet
   - NEVER commit private keys to git

2. **Environment File**
   - `.env` is gitignored - verify it's not tracked
   - Never share your `.env` file
   - Keep private keys secure

3. **Switching to Mainnet**
   - Remove `ADMIN_PRIVATE_KEY` from `.env`
   - Set `NETWORK_ENV=mainnet`
   - Use proper key management (HSM, hardware wallet, etc.)
   - Test thoroughly on testnet first!

## Next Steps

After successful testnet testing:

1. ✅ Verify multiple transactions work
2. ✅ Test error handling (invalid address, insufficient balance)
3. ✅ Confirm transactions appear on Subscan
4. 📝 Document mainnet deployment process
5. 🔐 Set up proper key management for production
6. 🚀 Switch to `NETWORK_ENV=mainnet`

## Useful Scripts

```bash
# Generate test account (new mnemonic)
npm run generate:test-account

# Verify multisig addresses
npm run generate:multisig

# Test blockchain connection
npm run test:transaction

# Reset database and seed test data
npm run db:reset
```

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in server logs
3. Verify network connectivity to Asset Hub Paseo
4. Check Subscan for blockchain status
