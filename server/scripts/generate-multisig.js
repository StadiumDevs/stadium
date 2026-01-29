/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 MULTISIG ADDRESS GENERATOR & VERIFIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This script generates multisig addresses from authorized signers and
 * verifies they match the addresses configured in polkadot-config.js
 *
 * USAGE:
 *   npm run generate:multisig
 *
 * OR:
 *   node scripts/generate-multisig.js
 *
 * REQUIREMENTS:
 *   - AUTHORIZED_SIGNERS env variable (comma-separated addresses)
 *   - Threshold (default: 2)
 *   - SS58 format code (42 for Paseo/testnet, 0 for Polkadot mainnet)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { encodeAddress, sortAddresses, decodeAddress, createKeyMulti } from '@polkadot/util-crypto';
import chalk from 'chalk';
import {
  TESTNET_MULTISIG,
  MAINNET_MULTISIG,
  SS58_FORMATS
} from '../config/polkadot-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

const THRESHOLD = 2; // Number of signatures required

// Get authorized signers from env
const getAuthorizedSigners = () => {
  const signers = (process.env.AUTHORIZED_SIGNERS || process.env.ADMIN_WALLETS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (signers.length === 0) {
    console.error(chalk.red('\n❌ ERROR: No authorized signers found!'));
    console.error(chalk.yellow('\nPlease set AUTHORIZED_SIGNERS or ADMIN_WALLETS in your .env file:'));
    console.error(chalk.gray('  AUTHORIZED_SIGNERS=address1,address2,address3\n'));
    process.exit(1);
  }

  return signers;
};

// ═══════════════════════════════════════════════════════════════════════════
// Multisig Address Generation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate a multisig address from a list of signatories
 *
 * @param {string[]} addresses - Array of SS58 addresses
 * @param {number} threshold - Number of required signatures
 * @param {number} ss58Format - SS58 format code (42 for Paseo, 0 for Polkadot)
 * @returns {string} - Multisig SS58 address
 */
function createMultisigAddress(addresses, threshold, ss58Format) {
  // Sort addresses in the correct order for the multisig
  const sortedAddresses = sortAddresses(addresses, ss58Format);

  // Create the multisig using the official @polkadot/util-crypto function
  const multisigPublicKey = createKeyMulti(sortedAddresses, threshold);

  // Encode the multisig public key with the correct SS58 format
  const multisigAddress = encodeAddress(multisigPublicKey, ss58Format);

  return multisigAddress;
}


// ═══════════════════════════════════════════════════════════════════════════
// Verification & Display
// ═══════════════════════════════════════════════════════════════════════════

async function generateAndVerify() {
  console.log(chalk.bold.cyan('\n🔐 MULTISIG ADDRESS GENERATOR\n'));
  console.log(chalk.gray('═'.repeat(80)));

  // Get signers
  const signers = getAuthorizedSigners();

  console.log(chalk.bold('\n📋 Configuration:'));
  console.log(chalk.gray('   Threshold:'), chalk.white(THRESHOLD));
  console.log(chalk.gray('   Signatories:'), chalk.white(signers.length));
  console.log();

  // Display signatories
  signers.forEach((signer, index) => {
    console.log(chalk.gray(`   ${index + 1}.`), chalk.white(signer));
  });

  console.log(chalk.gray('\n' + '═'.repeat(80)));

  // Generate for Testnet (Paseo)
  console.log(chalk.bold.yellow('\n🧪 TESTNET (Paseo Asset Hub)'));
  console.log(chalk.gray('   SS58 Format:'), chalk.white(SS58_FORMATS.paseo));

  try {
    const testnetMultisig = createMultisigAddress(signers, THRESHOLD, SS58_FORMATS.paseo);
    const testnetMatches = testnetMultisig === TESTNET_MULTISIG;

    console.log(chalk.gray('   Generated:'), chalk.white(testnetMultisig));
    console.log(chalk.gray('   Expected:'), chalk.white(TESTNET_MULTISIG));
    console.log(chalk.gray('   Status:'), testnetMatches ? chalk.green('✅ MATCH') : chalk.red('❌ MISMATCH'));

    if (!testnetMatches) {
      console.log(chalk.yellow('\n⚠️  Warning: Generated testnet address does not match config!'));
      console.log(chalk.gray('   Update TESTNET_MULTISIG in config/polkadot-config.js to:'));
      console.log(chalk.cyan(`   ${testnetMultisig}`));
    }
  } catch (error) {
    console.log(chalk.red('   Error:'), error.message);
  }

  // Generate for Mainnet (Polkadot)
  console.log(chalk.bold.green('\n🌐 MAINNET (Polkadot Asset Hub)'));
  console.log(chalk.gray('   SS58 Format:'), chalk.white(SS58_FORMATS.polkadot));

  try {
    const mainnetMultisig = createMultisigAddress(signers, THRESHOLD, SS58_FORMATS.polkadot);
    const mainnetMatches = mainnetMultisig === MAINNET_MULTISIG;

    console.log(chalk.gray('   Generated:'), chalk.white(mainnetMultisig));
    console.log(chalk.gray('   Expected:'), chalk.white(MAINNET_MULTISIG));
    console.log(chalk.gray('   Status:'), mainnetMatches ? chalk.green('✅ MATCH') : chalk.red('❌ MISMATCH'));

    if (!mainnetMatches) {
      console.log(chalk.yellow('\n⚠️  Warning: Generated mainnet address does not match config!'));
      console.log(chalk.gray('   Update MAINNET_MULTISIG in config/polkadot-config.js to:'));
      console.log(chalk.cyan(`   ${mainnetMultisig}`));
    }
  } catch (error) {
    console.log(chalk.red('   Error:'), error.message);
  }

  console.log(chalk.gray('\n' + '═'.repeat(80)));

  // Next steps
  console.log(chalk.bold('\n💡 Next Steps:\n'));
  console.log(chalk.gray('   1. Verify addresses on Subscan:'));
  console.log(chalk.cyan('      • Testnet: https://paseo.subscan.io/account/' + TESTNET_MULTISIG));
  console.log(chalk.cyan('      • Mainnet: https://assethub-polkadot.subscan.io/account/' + MAINNET_MULTISIG));
  console.log(chalk.gray('\n   2. Update .env with NETWORK_ENV:'));
  console.log(chalk.white('      NETWORK_ENV=testnet  # or mainnet'));
  console.log(chalk.gray('\n   3. Ensure AUTHORIZED_SIGNERS is set:'));
  console.log(chalk.white('      AUTHORIZED_SIGNERS=' + signers.join(',')));
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════════
// Execute
// ═══════════════════════════════════════════════════════════════════════════

generateAndVerify().catch(err => {
  console.error(chalk.red('\n❌ Fatal error:'), err);
  process.exit(1);
});
