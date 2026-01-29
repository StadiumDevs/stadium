/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔑 TEST ACCOUNT GENERATOR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Generates a test account mnemonic for use on Paseo testnet
 *
 * USAGE:
 *   npm run generate:test-account
 *
 * SECURITY WARNING:
 *   - This is for TESTNET ONLY!
 *   - NEVER use this for mainnet or real funds
 *   - The generated mnemonic should only be funded with testnet tokens
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { mnemonicGenerate } from '@polkadot/util-crypto';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/keyring';
import chalk from 'chalk';

async function generateTestAccount() {
  console.log(chalk.bold.cyan('\n🔑 TEST ACCOUNT GENERATOR\n'));
  console.log(chalk.gray('═'.repeat(80)));

  // Wait for crypto to be ready
  await cryptoWaitReady();

  // Generate a random mnemonic
  const mnemonic = mnemonicGenerate(12);

  // Create keyring and add account
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 42 }); // 42 = Paseo
  const account = keyring.addFromMnemonic(mnemonic);

  console.log();
  console.log(chalk.green('✅ Test account generated successfully!\n'));

  console.log(chalk.bold('📝 Mnemonic (12 words):'));
  console.log(chalk.yellow(`   ${mnemonic}\n`));

  console.log(chalk.bold('👤 Paseo Address:'));
  console.log(chalk.white(`   ${account.address}\n`));

  console.log(chalk.gray('═'.repeat(80)));
  console.log(chalk.bold('\n📋 Next Steps:\n'));

  console.log(chalk.white('1. Copy the mnemonic above'));
  console.log(chalk.white('2. Add it to your server/.env file:'));
  console.log(chalk.gray(`   TEST_MNEMONIC="${mnemonic}"`));
  console.log();

  console.log(chalk.white('3. Fund the account with Paseo testnet DOT:'));
  console.log(chalk.cyan('   https://faucet.polkadot.io/paseo'));
  console.log(chalk.gray(`   Paste address: ${account.address}`));
  console.log();

  console.log(chalk.white('4. Verify balance on Subscan:'));
  console.log(chalk.cyan(`   https://assethub-paseo.subscan.io/account/${account.address}`));
  console.log();

  console.log(chalk.gray('═'.repeat(80)));
  console.log(chalk.bold.yellow('\n⚠️  SECURITY WARNINGS:\n'));
  console.log(chalk.yellow('   • This is for TESTNET ONLY!'));
  console.log(chalk.yellow('   • NEVER use this mnemonic on mainnet'));
  console.log(chalk.yellow('   • NEVER send real funds to this address'));
  console.log(chalk.yellow('   • Keep the mnemonic in .env (which is gitignored)'));
  console.log();
}

generateTestAccount()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(chalk.red('\n❌ Error:'), err);
    process.exit(1);
  });
