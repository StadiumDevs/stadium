#!/usr/bin/env tsx
/**
 * Generate Multisig Address for Paseo Asset Hub Testing
 * 
 * This script calculates a multisig address from a list of signatories
 * using Polkadot's util-crypto library.
 * 
 * Usage:
 *   tsx scripts/generate-test-multisig.ts
 */

import { encodeAddress, decodeAddress, sortAddresses } from '@polkadot/util-crypto';
import { u8aToHex, hexToU8a } from '@polkadot/util';

// Constants
const PASEO_ASSET_HUB_SS58_FORMAT = 42; // Paseo Asset Hub uses format 42
const THRESHOLD = 1; // Any signer can execute (1-of-N)

// Admin addresses from VITE_ADMIN_ADDRESSES
// Note: Some addresses in the original list appear to be malformed/concatenated
// Using corrected/validated addresses below
const ADMIN_ADDRESSES = [
  '5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF',
  '5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9', // Corrected from malformed address
  '133BE1QFPWH3WhryCyV4jd8zHx6p8ZsmgbbPC1oH6WyKJSy7'
];

// Test addresses for different scenarios
const TEST_ADDRESSES_2_OF_2 = [
  '5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF',
  '5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9'
];

const TEST_ADDRESSES_3_OF_3 = [
  '5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF',
  '5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9',
  '133BE1QFPWH3WhryCyV4jd8zHx6p8ZsmgbbPC1oH6WyKJSy7'
];

/**
 * Generate a multisig address from signatories
 * 
 * @param signatories - Array of SS58 addresses (must be 2 or more)
 * @param threshold - Number of signatures required (1-of-N for threshold=1)
 * @param ss58Format - SS58 format for the output address (42 for Paseo Asset Hub)
 * @returns The multisig address in SS58 format
 */
async function generateMultisigAddress(
  signatories: string[],
  threshold: number,
  ss58Format: number = PASEO_ASSET_HUB_SS58_FORMAT
): Promise<string> {
  if (signatories.length < 2) {
    throw new Error('Multisig requires at least 2 signatories');
  }

  if (threshold < 1 || threshold > signatories.length) {
    throw new Error(`Threshold must be between 1 and ${signatories.length}`);
  }

  console.log(`\n📝 Generating Multisig Address:`);
  console.log(`   Signatories: ${signatories.length}`);
  console.log(`   Threshold: ${threshold} (${threshold}-of-${signatories.length})`);
  console.log(`   SS58 Format: ${ss58Format} (Paseo Asset Hub)`);

  // Decode addresses to their public keys
  const publicKeys = signatories.map(address => {
    try {
      return decodeAddress(address);
    } catch (error) {
      throw new Error(`Invalid address: ${address}`);
    }
  });

  // Sort addresses in lexicographic order (required for multisig)
  const sortedAddresses = sortAddresses(signatories, ss58Format);
  console.log(`\n✅ Sorted Signatories:`);
  sortedAddresses.forEach((addr, idx) => {
    console.log(`   ${idx + 1}. ${addr}`);
  });

  // Create multisig address using Polkadot's algorithm
  // The multisig address is derived from: blake2_256("modlpy/utilisuba" + threshold + sorted_accounts)
  const MULTISIG_PREFIX = 'modlpy/utilisuba';
  
  // Encode threshold as bytes
  const thresholdBytes = new Uint8Array([threshold]);
  
  // Get sorted public keys
  const sortedPublicKeys = sortedAddresses.map(addr => decodeAddress(addr));
  
  // Concatenate all data: prefix + threshold + all public keys
  const totalLength = MULTISIG_PREFIX.length + 1 + (sortedPublicKeys.length * 32);
  const concatenated = new Uint8Array(totalLength);
  
  let offset = 0;
  
  // Add prefix
  for (let i = 0; i < MULTISIG_PREFIX.length; i++) {
    concatenated[offset++] = MULTISIG_PREFIX.charCodeAt(i);
  }
  
  // Add threshold
  concatenated[offset++] = threshold;
  
  // Add sorted public keys
  sortedPublicKeys.forEach(pubKey => {
    concatenated.set(pubKey, offset);
    offset += 32;
  });
  
  // Hash the concatenated data using blake2b_256
  const { blake2AsU8a } = await import('@polkadot/util-crypto');
  const hash = blake2AsU8a(concatenated, 256);
  
  // Encode as SS58 address
  const multisigAddress = encodeAddress(hash, ss58Format);
  
  return multisigAddress;
}

/**
 * Display multisig information in a formatted way
 */
async function displayMultisigInfo(
  label: string,
  signatories: string[],
  threshold: number,
  multisigAddress: string
) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔐 ${label}`);
  console.log(`${'═'.repeat(70)}`);
  console.log(`\n📊 Configuration:`);
  console.log(`   Threshold: ${threshold}-of-${signatories.length}`);
  console.log(`   Total Signatories: ${signatories.length}`);
  console.log(`\n👥 Signatories:`);
  signatories.forEach((addr, idx) => {
    console.log(`   ${idx + 1}. ${addr}`);
  });
  console.log(`\n💰 Multisig Address (Paseo Asset Hub):`);
  console.log(`   ${multisigAddress}`);
  console.log(`\n✅ This address can be used to:`);
  console.log(`   • Receive funds on Paseo Asset Hub`);
  console.log(`   • Execute transactions with ${threshold} signature(s)`);
  console.log(`   • Test multisig payment flows`);
  console.log(`${'═'.repeat(70)}\n`);
}

/**
 * Verify multisig generation is deterministic
 */
async function verifyDeterminism(signatories: string[], threshold: number) {
  console.log(`\n🔍 Verifying Deterministic Generation...`);
  
  const address1 = await generateMultisigAddress(signatories, threshold, PASEO_ASSET_HUB_SS58_FORMAT);
  const address2 = await generateMultisigAddress(signatories, threshold, PASEO_ASSET_HUB_SS58_FORMAT);
  
  if (address1 === address2) {
    console.log(`✅ PASS: Generated same address twice`);
    console.log(`   ${address1}`);
    return true;
  } else {
    console.log(`❌ FAIL: Generated different addresses`);
    console.log(`   First:  ${address1}`);
    console.log(`   Second: ${address2}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Paseo Asset Hub Multisig Address Generator                   ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    // Test Scenario 1: 2-of-2 Multisig
    const multisig2of2 = await generateMultisigAddress(
      TEST_ADDRESSES_2_OF_2,
      THRESHOLD,
      PASEO_ASSET_HUB_SS58_FORMAT
    );
    await displayMultisigInfo(
      'Test Scenario 1: 2-of-2 Multisig (1-of-2 Threshold)',
      TEST_ADDRESSES_2_OF_2,
      THRESHOLD,
      multisig2of2
    );

    // Test Scenario 2: 3-of-3 Multisig (Admin Addresses)
    const multisig3of3 = await generateMultisigAddress(
      TEST_ADDRESSES_3_OF_3,
      THRESHOLD,
      PASEO_ASSET_HUB_SS58_FORMAT
    );
    await displayMultisigInfo(
      'Test Scenario 2: 3-of-3 Multisig (1-of-3 Threshold) - ADMIN ADDRESSES',
      TEST_ADDRESSES_3_OF_3,
      THRESHOLD,
      multisig3of3
    );

    // Verify determinism
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🧪 Determinism Test`);
    console.log(`${'═'.repeat(70)}`);
    await verifyDeterminism(TEST_ADDRESSES_3_OF_3, THRESHOLD);

    // Summary
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📋 Summary`);
    console.log(`${'═'.repeat(70)}`);
    console.log(`\n✅ Successfully generated multisig addresses!`);
    console.log(`\n📝 Key Points:`);
    console.log(`   • Addresses are deterministic (same input = same output)`);
    console.log(`   • Order matters (addresses are sorted lexicographically)`);
    console.log(`   • Threshold = 1 means any single signer can execute`);
    console.log(`   • Format 42 is for Paseo Asset Hub (testnet)`);
    console.log(`\n🔗 Use these addresses in your tests:`);
    console.log(`   2-of-2 Multisig: ${multisig2of2}`);
    console.log(`   3-of-3 Multisig: ${multisig3of3}`);
    console.log(`\n💡 To use a different threshold (e.g., 2-of-3):`);
    console.log(`   Change THRESHOLD constant to 2 in the script`);
    console.log(`${'═'.repeat(70)}\n`);

    // Export for programmatic use
    return {
      twoOfTwo: multisig2of2,
      threeOfThree: multisig3of3,
      signatories: {
        twoOfTwo: TEST_ADDRESSES_2_OF_2,
        threeOfThree: TEST_ADDRESSES_3_OF_3
      },
      threshold: THRESHOLD,
      ss58Format: PASEO_ASSET_HUB_SS58_FORMAT
    };
  } catch (error) {
    console.error('\n❌ Error generating multisig address:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);

// Export for use as a module
export { generateMultisigAddress, PASEO_ASSET_HUB_SS58_FORMAT, ADMIN_ADDRESSES };

