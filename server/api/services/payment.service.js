/**
 * Payment Service
 *
 * Handles multisig transactions on Asset Hub (testnet/mainnet)
 * for sending DOT, USDT, and USDC to project teams
 */

import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider/web';
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat';
import { dot } from '@polkadot-api/descriptors';
import crypto from 'crypto';
import chalk from 'chalk';
import {
  CURRENT_MULTISIG,
  CURRENT_RPC,
  NETWORK_CONFIG,
  getAuthorizedAddresses
} from '../../config/polkadot-config.js';

const log = (message) => console.log(chalk.cyan(`[PaymentService] ${message}`));
const logError = (message) => console.log(chalk.red(`[PaymentService] ${message}`));
const logSuccess = (message) => console.log(chalk.green(`[PaymentService] ${message}`));

class PaymentService {
  constructor() {
    this.client = null;
    this.api = null;
  }

  /**
   * Initialize connection to Asset Hub
   */
  async connect() {
    if (this.api) {
      log('Already connected to Asset Hub');
      return this.api;
    }

    try {
      log(`Connecting to ${NETWORK_CONFIG.networkName} at ${CURRENT_RPC}...`);

      const wsProvider = getWsProvider(CURRENT_RPC);
      this.client = createClient(withPolkadotSdkCompat(wsProvider));
      this.api = this.client.getTypedApi(dot);

      // Wait for first block to ensure connection is ready
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 15000);
        this.client.finalizedBlock$.subscribe({
          next: (block) => {
            clearTimeout(timeout);
            logSuccess(`Connected to ${NETWORK_CONFIG.networkName} at block #${block.number}`);
            resolve();
          },
          error: reject
        });
      });

      return this.api;
    } catch (error) {
      logError(`Failed to connect: ${error.message}`);
      this.disconnect();
      throw error;
    }
  }

  /**
   * Disconnect from Asset Hub
   */
  disconnect() {
    if (this.client) {
      log('Disconnecting from Asset Hub...');
      this.client.destroy();
      this.client = null;
      this.api = null;
    }
  }

  /**
   * Construct an unsigned transfer transaction
   * Frontend will sign this with the user's browser wallet
   *
   * @param {string} recipient - SS58 address to send to
   * @param {bigint} amount - Amount in plancks (1 DOT = 10^10 plancks)
   * @returns {Promise<Object>} Unsigned transaction details for frontend signing
   */
  async constructTransfer(recipient, amount) {
    try {
      log(`Constructing transfer transaction:`);
      log(`  To: ${recipient}`);
      log(`  Amount: ${this.formatBalance(amount)} DOT`);

      const api = await this.connect();

      // Create the transfer call using the typed API
      log('Creating transfer transaction...');
      const transferTx = api.tx.Balances.transfer_keep_alive({
        dest: { type: 'Id', value: recipient },
        value: amount
      });

      log('Transfer transaction created successfully');

      // Get the encoded call data
      const callData = await transferTx.getEncodedData();
      const callDataHex = typeof callData === 'string' ? callData :
                         callData.asHex ? callData.asHex() :
                         '0x' + Array.from(new Uint8Array(callData)).map(b => b.toString(16).padStart(2, '0')).join('');
      log(`Encoded call data: ${callDataHex.slice(0, 42)}...`);

      // Return transaction details for frontend to sign
      const result = {
        status: 'constructed',
        to: recipient,
        amount: amount.toString(),
        amountFormatted: this.formatBalance(amount),
        network: NETWORK_CONFIG.networkName,
        rpc: CURRENT_RPC,
        message: 'Transaction constructed successfully. Sign with your browser wallet to submit.',
        callData: {
          pallet: 'Balances',
          method: 'transfer_keep_alive',
          encoded: callDataHex
        }
      };

      logSuccess('Transfer transaction constructed (ready for wallet signing)');
      return result;

    } catch (error) {
      logError(`Failed to construct transfer: ${error.message}`);
      throw new Error(`Transaction construction failed: ${error.message}`);
    } finally {
      this.disconnect();
    }
  }

  /**
   * Get Subscan URL for transaction
   * @param {string} txHash - Transaction hash
   * @returns {string} Subscan URL
   */
  getSubscanUrl(txHash) {
    if (NETWORK_CONFIG.isTestnet) {
      return `https://assethub-paseo.subscan.io/extrinsic/${txHash}`;
    } else {
      return `https://assethub-polkadot.subscan.io/extrinsic/${txHash}`;
    }
  }

  /**
   * Format balance from plancks to DOT
   * @param {bigint} amount - Amount in plancks
   * @returns {string} Formatted balance
   */
  formatBalance(amount) {
    const DOT_DECIMALS = 10;
    const divisor = BigInt(10 ** DOT_DECIMALS);
    const whole = amount / divisor;
    const fraction = amount % divisor;
    return `${whole}.${fraction.toString().padStart(DOT_DECIMALS, '0')}`;
  }

  /**
   * Parse balance from DOT to plancks
   * @param {number|string} dot - Amount in DOT
   * @returns {bigint} Amount in plancks
   */
  parseBalance(dot) {
    const DOT_DECIMALS = 10;
    const dotString = String(dot);
    const [whole = '0', fraction = '0'] = dotString.split('.');
    const paddedFraction = fraction.padEnd(DOT_DECIMALS, '0').slice(0, DOT_DECIMALS);
    return BigInt(whole) * BigInt(10 ** DOT_DECIMALS) + BigInt(paddedFraction);
  }

  /**
   * Get multisig info
   */
  getMultisigInfo() {
    return {
      address: CURRENT_MULTISIG,
      network: NETWORK_CONFIG.networkName,
      rpc: CURRENT_RPC,
      threshold: 2,
      signatories: getAuthorizedAddresses(),
      signatoriesCount: getAuthorizedAddresses().length
    };
  }

  /**
   * Prepare multisig transaction data using utility.batch_all
   * This constructs a batched call and returns data needed for the frontend
   * to initiate a multisig transaction
   *
   * @param {string|Array} recipient - Recipient address or array of recipients
   * @param {bigint|Array} amount - Amount in plancks or array of amounts
   * @param {string} initiatorAddress - Address of the signer initiating the multisig
   * @returns {Promise<Object>} Multisig transaction data
   */
  async prepareMultisigTransaction(recipient, amount, initiatorAddress) {
    try {
      log('===== MULTISIG TRANSACTION PREPARATION (using utility.batch_all) =====');
      log('This creates a single batched multisig transaction.');
      log('All operations in the batch will execute atomically.');
      log('');
      log('Transaction details:');
      log(`  Initiator: ${initiatorAddress}`);

      // Handle single or multiple recipients
      const recipients = Array.isArray(recipient) ? recipient : [recipient];
      const amounts = Array.isArray(amount) ? amount : [amount];

      if (recipients.length !== amounts.length) {
        throw new Error('Recipients and amounts arrays must have the same length');
      }

      recipients.forEach((addr, idx) => {
        log(`  Transfer ${idx + 1}: ${this.formatBalance(amounts[idx])} DOT → ${addr}`);
      });

      const api = await this.connect();

      // Create transfer calls for each recipient
      // In polkadot-api, we need to get the decodedCall to pass to batch
      const transferCalls = await Promise.all(
        recipients.map(async (addr, idx) => {
          const tx = api.tx.Balances.transfer_keep_alive({
            dest: { type: 'Id', value: addr },
            value: amounts[idx]
          });
          return tx.decodedCall;
        })
      );

      // Wrap all transfers in a utility.batch_all call
      log('');
      log(`Creating utility.batch_all with ${transferCalls.length} transfer(s)...`);
      const batchCall = api.tx.Utility.batch_all({
        calls: transferCalls
      });

      // Get encoded call data from the batch
      const callData = await batchCall.getEncodedData();
      const callDataHex = typeof callData === 'string' ? callData :
                         callData.asHex ? callData.asHex() :
                         '0x' + Array.from(new Uint8Array(callData)).map(b => b.toString(16).padStart(2, '0')).join('');

      // Get the call hash (Blake2-256 hash of the call data)
      const callHash = this.getCallHash(callDataHex);

      // Get all signatories and sort them
      const allSignatories = getAuthorizedAddresses();
      const sortedSignatories = [...allSignatories].sort();

      // Get other signatories (excluding the initiator)
      const otherSignatories = sortedSignatories.filter(
        addr => addr.toLowerCase() !== initiatorAddress.toLowerCase()
      );

      log(`Call hash: ${callHash}`);
      log(`Threshold: 2 out of ${sortedSignatories.length} signatories required`);
      log(`Other signatories (excluding initiator): ${otherSignatories.length}`);
      log('');

      const result = {
        callData: callDataHex,
        callHash,
        threshold: 2,
        allSignatories: sortedSignatories,
        otherSignatories,
        recipients,
        amounts: amounts.map(a => a.toString()),
        amountsFormatted: amounts.map(a => this.formatBalance(a)),
        totalAmount: amounts.reduce((sum, a) => sum + a, BigInt(0)).toString(),
        totalAmountFormatted: this.formatBalance(amounts.reduce((sum, a) => sum + a, BigInt(0))),
        batchSize: recipients.length,
        network: NETWORK_CONFIG.networkName,
        networkEnv: NETWORK_CONFIG.isTestnet ? 'testnet' : 'mainnet',
        rpc: CURRENT_RPC,
        multisigAddress: CURRENT_MULTISIG
      };

      logSuccess('Batched multisig transaction prepared successfully!');
      log('');
      log('Next steps:');
      log('  1. Initiator signs and submits the multisig transaction (asMulti)');
      log('  2. Second signer approves the transaction (approveAsMulti or final asMulti)');
      log('  3. Once threshold is reached, all batched transfers execute atomically');
      log('');
      log('After submission, view transaction on Subscan:');
      log(`  ${this.getSubscanUrl('[transaction-hash]')}`);
      log('');
      return result;

    } catch (error) {
      logError(`Failed to prepare multisig transaction: ${error.message}`);
      throw new Error(`Multisig preparation failed: ${error.message}`);
    } finally {
      this.disconnect();
    }
  }

  /**
   * Compute Blake2-256 hash of call data
   * @param {string} callDataHex - Hex-encoded call data
   * @returns {string} Blake2-256 hash
   */
  getCallHash(callDataHex) {
    const callDataBytes = Buffer.from(callDataHex.replace('0x', ''), 'hex');
    const hash = crypto.createHash('blake2b512').update(callDataBytes).digest();
    // Take first 32 bytes (256 bits)
    return '0x' + hash.slice(0, 32).toString('hex');
  }

  /**
   * Get sorted list of other signatories (excluding current signer)
   * @param {string} currentSigner - Current signer address
   * @returns {Array<string>} Sorted list of other signatories
   */
  getOtherSignatories(currentSigner) {
    const allSignatories = getAuthorizedAddresses();
    const sortedSignatories = [...allSignatories].sort();
    return sortedSignatories.filter(
      addr => addr.toLowerCase() !== currentSigner.toLowerCase()
    );
  }
}

export default new PaymentService();
