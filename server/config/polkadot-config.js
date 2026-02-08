/**
 * Polkadot Network Configuration (Backend)
 * 
 * Manages network-specific settings for testnet (Paseo) and mainnet (Polkadot)
 * including multisig addresses and authorized signers.
 */

import dotenv from 'dotenv';

dotenv.config();

// Network environment type: 'testnet' | 'mainnet'
export const NETWORK_ENV = process.env.NETWORK_ENV || 'testnet';

/**
 * Multisig Addresses
 *
 * Testnet: Paseo Asset Hub multisig (generated from admin signatories)
 * Mainnet: Polkadot Asset Hub multisig
 *
 * Generated with threshold=2 from AUTHORIZED_SIGNERS
 * Run `npm run generate:multisig` to verify
 */
export const TESTNET_MULTISIG = '5CSxUh77kKRGZiTsNRv5WMyBfJyFZuQfthJaobUoKB5wEfbc';
export const MAINNET_MULTISIG = '1PFd2NBc6gk1FUPL4y5eWoLWvxuGCxoyC34xtU9sG7TQyPh';

/**
 * Current Multisig Address
 * 
 * Dynamically selected based on NETWORK_ENV
 */
export const CURRENT_MULTISIG = NETWORK_ENV === 'mainnet' 
  ? MAINNET_MULTISIG 
  : TESTNET_MULTISIG;

/**
 * Authorized Signers (from environment variable)
 *
 * These are the addresses that can sign for the multisig
 * Format: Comma-separated list in .env
 * NOTE: Addresses are NOT lowercased - SS58 addresses are case-sensitive with checksums
 */
export const AUTHORIZED_SIGNERS = (process.env.AUTHORIZED_SIGNERS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

/**
 * Legacy admin wallets support (backward compatibility)
 * Falls back to ADMIN_WALLETS if AUTHORIZED_SIGNERS is not set
 */
const LEGACY_ADMIN_WALLETS = (process.env.ADMIN_WALLETS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

/**
 * Get all authorized addresses (signers or legacy admins)
 */
export function getAuthorizedAddresses() {
  return AUTHORIZED_SIGNERS.length > 0 ? AUTHORIZED_SIGNERS : LEGACY_ADMIN_WALLETS;
}

/**
 * Check if an address is authorized to sign for the multisig
 * 
 * @param {string} address - SS58 address to check
 * @returns {boolean} - True if authorized
 */
export function isAuthorizedSigner(address) {
  if (!address) return false;
  
  const normalizedAddress = address.toLowerCase();
  const authorizedAddresses = getAuthorizedAddresses().map(a => a.toLowerCase());
  
  return authorizedAddresses.includes(normalizedAddress);
}

/**
 * RPC Endpoints
 */
export const PASEO_RPC = 'wss://sys.ibp.network/asset-hub-paseo';
export const ASSET_HUB_RPC = 'wss://asset-hub-polkadot-rpc.polkadot.io';

/**
 * Current RPC Endpoint
 */
export const CURRENT_RPC = NETWORK_ENV === 'mainnet' 
  ? ASSET_HUB_RPC 
  : PASEO_RPC;

/**
 * Network Display Names
 */
export const NETWORK_NAMES = {
  testnet: 'Paseo Asset Hub',
  mainnet: 'Polkadot Asset Hub'
};

/**
 * Current Network Display Name
 */
export const CURRENT_NETWORK_NAME = NETWORK_NAMES[NETWORK_ENV] || NETWORK_NAMES.testnet;

/**
 * SS58 Format Codes
 */
export const SS58_FORMATS = {
  paseo: 42,
  polkadot: 0
};

/**
 * Current SS58 Format
 */
export const CURRENT_SS58_FORMAT = NETWORK_ENV === 'mainnet' 
  ? SS58_FORMATS.polkadot 
  : SS58_FORMATS.paseo;

/**
 * Network Configuration Summary
 */
export const NETWORK_CONFIG = {
  environment: NETWORK_ENV,
  networkName: CURRENT_NETWORK_NAME,
  multisigAddress: CURRENT_MULTISIG,
  rpcEndpoint: CURRENT_RPC,
  ss58Format: CURRENT_SS58_FORMAT,
  authorizedSigners: getAuthorizedAddresses().length,
  isMainnet: NETWORK_ENV === 'mainnet',
  isTestnet: NETWORK_ENV === 'testnet'
};

/**
 * Log configuration on startup
 */
console.log('🌐 Polkadot Network Configuration (Backend):');
console.log(`   Environment: ${NETWORK_CONFIG.environment}`);
console.log(`   Network: ${NETWORK_CONFIG.networkName}`);
console.log(`   Multisig: ${NETWORK_CONFIG.multisigAddress}`);
console.log(`   RPC: ${NETWORK_CONFIG.rpcEndpoint}`);
console.log(`   Authorized Signers: ${NETWORK_CONFIG.authorizedSigners}`);
console.log(`   SS58 Format: ${NETWORK_CONFIG.ss58Format}`);

// Export default object
export default {
  NETWORK_ENV,
  TESTNET_MULTISIG,
  MAINNET_MULTISIG,
  CURRENT_MULTISIG,
  AUTHORIZED_SIGNERS,
  getAuthorizedAddresses,
  isAuthorizedSigner,
  PASEO_RPC,
  ASSET_HUB_RPC,
  CURRENT_RPC,
  CURRENT_NETWORK_NAME,
  CURRENT_SS58_FORMAT,
  NETWORK_CONFIG
};

