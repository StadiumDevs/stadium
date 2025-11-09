# Blockspace Stadium Scripts

Utility scripts for testing and development.

## 📁 Scripts

### `generate-test-multisig.ts`

Generates multisig addresses for Paseo Asset Hub testing.

**Purpose:**
- Calculate multisig addresses from admin signatories
- Verify deterministic address generation
- Test different multisig configurations

**Usage:**

```bash
# Install dependencies first (from scripts directory)
cd scripts
npm install

# Run the script
npm run multisig

# Or directly with tsx
npx tsx generate-test-multisig.ts
```

**Output:**
- 2-of-2 multisig address (1-of-2 threshold)
- 3-of-3 multisig address (1-of-3 threshold) using admin addresses
- Verification of deterministic generation
- Formatted summary with all details

**Configuration:**
- `THRESHOLD`: Set to 1 (any signer can execute)
- `PASEO_ASSET_HUB_SS58_FORMAT`: Set to 42
- `ADMIN_ADDRESSES`: Uses addresses from VITE_ADMIN_ADDRESSES

**Example Output:**
```
╔════════════════════════════════════════════════════════════════╗
║  Paseo Asset Hub Multisig Address Generator                   ║
╚════════════════════════════════════════════════════════════════╝

🔐 Test Scenario 1: 2-of-2 Multisig (1-of-2 Threshold)
══════════════════════════════════════════════════════════════════

📊 Configuration:
   Threshold: 1-of-2
   Total Signatories: 2

👥 Signatories:
   1. 5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF
   2. 5DoFNTnkUcyXWpNqP5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9

💰 Multisig Address (Paseo Asset Hub):
   5DTestMultisigAddressHere...

✅ This address can be used to:
   • Receive funds on Paseo Asset Hub
   • Execute transactions with 1 signature(s)
   • Test multisig payment flows
```

## 🔧 Requirements

- Node.js 18+
- TypeScript 5+
- @polkadot/util-crypto

## 📚 API

The script can also be imported as a module:

```typescript
import { generateMultisigAddress, PASEO_ASSET_HUB_SS58_FORMAT } from './generate-test-multisig';

const multisigAddr = generateMultisigAddress(
  ['address1', 'address2', 'address3'],
  1, // threshold
  PASEO_ASSET_HUB_SS58_FORMAT
);
```

## 🧪 Testing

The script includes built-in verification:
- Determinism test (same input produces same output)
- Multiple scenarios (2-of-2, 3-of-3)
- Address sorting verification

## 📝 Notes

- Addresses are automatically sorted lexicographically (required for multisig)
- The multisig derivation follows Substrate's standard algorithm
- Format 42 is specific to Paseo Asset Hub (testnet)
- Threshold of 1 means any single signer can execute transactions

