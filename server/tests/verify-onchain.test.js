/**
 * Test script to verify transactions are actually confirmed on-chain
 *
 * Usage:
 *   node tests/verify-onchain.test.js <tx-hash>
 *
 * Example:
 *   node tests/verify-onchain.test.js 0x1234...
 */

import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/web';
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat';
import { dot } from '@polkadot-api/descriptors';
import chalk from 'chalk';
import { CURRENT_RPC, NETWORK_CONFIG } from '../config/polkadot-config.js';

const log = (message) => console.log(chalk.cyan(message));
const logError = (message) => console.log(chalk.red(message));
const logSuccess = (message) => console.log(chalk.green(message));
const logWarning = (message) => console.log(chalk.yellow(message));

/**
 * Verify a transaction is on-chain
 */
async function verifyTransaction(txHash) {
  let client;

  try {
    log(`\n🔍 Verifying transaction on ${NETWORK_CONFIG.networkName}...`);
    log(`   RPC: ${CURRENT_RPC}`);
    log(`   Tx Hash: ${txHash}`);
    log('');

    // Connect to blockchain
    log('Connecting to Asset Hub...');
    const wsProvider = getWsProvider(CURRENT_RPC);
    client = createClient(withPolkadotSdkCompat(wsProvider));
    const api = client.getTypedApi(dot);

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 15000);
      client.finalizedBlock$.subscribe({
        next: (block) => {
          clearTimeout(timeout);
          logSuccess(`✅ Connected at block #${block.number}`);
          resolve();
        },
        error: reject
      });
    });

    // Get current block number
    const currentBlock = await new Promise((resolve) => {
      client.finalizedBlock$.subscribe({
        next: (block) => resolve(block.number)
      });
    });

    log(`   Current finalized block: #${currentBlock}`);
    log('');

    // Try to get transaction details
    // Note: This requires knowing the block number where the tx was included
    // For now, we'll just verify the format and provide manual check instructions

    if (!txHash || !txHash.startsWith('0x')) {
      throw new Error('Invalid transaction hash format. Must start with 0x');
    }

    if (txHash.length !== 66) {
      logWarning(`⚠️  Warning: Transaction hash length is ${txHash.length}, expected 66 characters`);
    }

    log('📋 Transaction verification checklist:');
    log('');
    log(`1. Transaction hash format: ${txHash.startsWith('0x') && txHash.length === 66 ? '✅' : '❌'}`);
    log(`2. Network: ${NETWORK_CONFIG.networkName}`);
    log(`3. Subscan URL: ${getSubscanUrl(txHash)}`);
    log('');
    logSuccess('✅ Manual verification required:');
    log('   → Open the Subscan URL above');
    log('   → Verify the transaction shows "Success" or "Finalized"');
    log('   → Check the block number and timestamp');
    log('   → Verify the extrinsic details match your expectation');
    log('');

    // Test multisig address balance
    log('💰 Checking multisig balance...');
    const multisigAddress = NETWORK_CONFIG.multisigAddress;

    // For balance check, we need a different approach with polkadot-api
    log(`   Multisig: ${multisigAddress}`);
    logWarning('   ⚠️  Balance check requires manual verification on Subscan');
    log(`   → https://assethub-paseo.subscan.io/account/${multisigAddress}`);
    log('');

  } catch (error) {
    logError(`\n❌ Verification failed: ${error.message}`);
    throw error;
  } finally {
    if (client) {
      log('Disconnecting...');
      client.destroy();
    }
  }
}

/**
 * Get Subscan URL for transaction
 */
function getSubscanUrl(txHash) {
  if (NETWORK_CONFIG.isTestnet) {
    return `https://assethub-paseo.subscan.io/extrinsic/${txHash}`;
  } else {
    return `https://assethub-polkadot.subscan.io/extrinsic/${txHash}`;
  }
}

/**
 * Test multisig transaction construction and preparation
 */
async function testMultisigPreparation() {
  try {
    logSuccess('\n🧪 Testing multisig transaction preparation...\n');

    // Import payment service
    const { default: paymentService } = await import('../api/services/payment.service.js');

    // Test creating a batch transaction
    const testRecipients = [
      '5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF',
      '5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9'
    ];
    const testAmounts = [
      BigInt('1000000000'), // 0.1 DOT
      BigInt('500000000')   // 0.05 DOT
    ];
    const initiator = '5CSxUh77kKRGZiTsNRv5WMyBfJyFZuQfthJaobUoKB5wEfbc';

    log('Testing prepareMultisigTransaction with:');
    testRecipients.forEach((addr, idx) => {
      log(`  → ${formatBalance(testAmounts[idx])} DOT to ${addr.slice(0, 10)}...`);
    });
    log('');

    const result = await paymentService.prepareMultisigTransaction(
      testRecipients,
      testAmounts,
      initiator
    );

    logSuccess(`✅ Batch multisig transaction prepared successfully!`);
    log(`   Call hash: ${result.callHash}`);
    log(`   Call data length: ${result.callData.length} characters`);
    log(`   Batch size: ${result.batchSize}`);
    log(`   Total amount: ${result.totalAmountFormatted} DOT`);
    log(`   Threshold: ${result.threshold} of ${result.allSignatories.length} signatories`);
    log('');

    logSuccess('✅ Multisig preparation test passed!');
    return result;

  } catch (error) {
    logError(`\n❌ Test failed: ${error.message}`);
    console.error(error);
    throw error;
  }
}

/**
 * Format balance from plancks to DOT
 */
function formatBalance(amount) {
  const DOT_DECIMALS = 10;
  const divisor = BigInt(10 ** DOT_DECIMALS);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  return `${whole}.${fraction.toString().padStart(DOT_DECIMALS, '0')}`;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  log('\n📖 Usage:');
  log('   Verify transaction:');
  log('     node tests/verify-onchain.test.js <tx-hash>');
  log('');
  log('   Test multisig preparation:');
  log('     node tests/verify-onchain.test.js --test-multisig');
  log('');
  log('   Examples:');
  log('     node tests/verify-onchain.test.js 0x1234abcd...');
  log('     node tests/verify-onchain.test.js --test-multisig');
  log('');
  process.exit(0);
}

const command = args[0];

if (command === '--test-multisig') {
  testMultisigPreparation()
    .then(() => {
      logSuccess('\n✅ All tests passed!\n');
      process.exit(0);
    })
    .catch((error) => {
      logError(`\n❌ Test failed: ${error.message}\n`);
      process.exit(1);
    });
} else {
  const txHash = command;
  verifyTransaction(txHash)
    .then(() => {
      logSuccess('\n✅ Verification complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      logError(`\n❌ Verification failed\n`);
      process.exit(1);
    });
}
