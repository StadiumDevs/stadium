/**
 * Polkadot Network Configuration
 * 
 * Manages network-specific settings for testnet (Paseo) and mainnet (Polkadot)
 * including multisig addresses and RPC endpoints.
 */

// Network environment type
export type NetworkEnv = 'testnet' | 'mainnet';

// Get network environment from environment variable (default to testnet for safety)
export const NETWORK_ENV: NetworkEnv = 
  (import.meta.env.VITE_NETWORK_ENV as NetworkEnv) || 'testnet';

/**
 * Multisig Addresses
 * 
 * Testnet: Paseo Asset Hub multisig (generated from admin signatories)
 * Mainnet: Polkadot Asset Hub multisig
 */
export const TESTNET_MULTISIG = '169Lg4Y4YpuW9SdZ9bZSgJZ7nNo9waQNjGraSnvkQFacRtHM';
export const MAINNET_MULTISIG = '5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF';

/**
 * RPC Endpoints
 * 
 * Paseo: Testnet Asset Hub
 * Polkadot: Mainnet Asset Hub
 */
export const PASEO_RPC = 'wss://paseo-asset-hub-rpc.polkadot.io';
export const ASSET_HUB_RPC = 'wss://asset-hub-polkadot-rpc.polkadot.io';

/**
 * Current Multisig Address
 * 
 * Dynamically selected based on NETWORK_ENV
 */
export const CURRENT_MULTISIG = NETWORK_ENV === 'mainnet' 
  ? MAINNET_MULTISIG 
  : TESTNET_MULTISIG;

/**
 * Current RPC Endpoint
 * 
 * Dynamically selected based on NETWORK_ENV
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
} as const;

/**
 * Current Network Display Name
 */
export const CURRENT_NETWORK_NAME = NETWORK_NAMES[NETWORK_ENV];

/**
 * SS58 Format Codes
 * 
 * Used for address encoding/decoding
 */
export const SS58_FORMATS = {
  paseo: 42,        // Paseo testnet
  polkadot: 0,      // Polkadot mainnet
  kusama: 2,        // Kusama
  substrate: 42     // Generic Substrate
} as const;

/**
 * Current SS58 Format
 */
export const CURRENT_SS58_FORMAT = NETWORK_ENV === 'mainnet' 
  ? SS58_FORMATS.polkadot 
  : SS58_FORMATS.paseo;

/**
 * USDC Asset ID on Asset Hub
 * 
 * Different asset IDs for testnet vs mainnet
 */
export const USDC_ASSET_IDS = {
  testnet: 1984,    // Paseo Asset Hub USDC asset ID (example, verify actual ID)
  mainnet: 1337     // Polkadot Asset Hub USDC asset ID (verify actual ID)
} as const;

/**
 * Current USDC Asset ID
 */
export const CURRENT_USDC_ASSET_ID = NETWORK_ENV === 'mainnet'
  ? USDC_ASSET_IDS.mainnet
  : USDC_ASSET_IDS.testnet;

/**
 * Network Configuration Summary
 * 
 * Useful for logging and debugging
 */
export const NETWORK_CONFIG = {
  environment: NETWORK_ENV,
  networkName: CURRENT_NETWORK_NAME,
  multisigAddress: CURRENT_MULTISIG,
  rpcEndpoint: CURRENT_RPC,
  ss58Format: CURRENT_SS58_FORMAT,
  usdcAssetId: CURRENT_USDC_ASSET_ID
} as const;

/**
 * Subscan URLs for transaction viewing
 */
export const SUBSCAN_URLS = {
  testnet: 'https://paseo.subscan.io',
  mainnet: 'https://assethub-polkadot.subscan.io'
} as const;

/**
 * Current Subscan URL
 */
export const CURRENT_SUBSCAN_URL = SUBSCAN_URLS[NETWORK_ENV];

/**
 * Helper function to get transaction URL
 */
export function getTransactionUrl(extrinsicHash: string): string {
  return `${CURRENT_SUBSCAN_URL}/extrinsic/${extrinsicHash}`;
}

/**
 * Helper function to get account URL
 */
export function getAccountUrl(address: string): string {
  return `${CURRENT_SUBSCAN_URL}/account/${address}`;
}

/**
 * Helper function to check if running on mainnet
 */
export function isMainnet(): boolean {
  return NETWORK_ENV === 'mainnet';
}

/**
 * Helper function to check if running on testnet
 */
export function isTestnet(): boolean {
  return NETWORK_ENV === 'testnet';
}

/**
 * Log network configuration on import (development only)
 */
if (import.meta.env.DEV) {
  console.log('🌐 Polkadot Network Configuration:', NETWORK_CONFIG);
}

// Export all constants as a single config object for convenience
export default {
  NETWORK_ENV,
  TESTNET_MULTISIG,
  MAINNET_MULTISIG,
  CURRENT_MULTISIG,
  PASEO_RPC,
  ASSET_HUB_RPC,
  CURRENT_RPC,
  CURRENT_NETWORK_NAME,
  CURRENT_SS58_FORMAT,
  CURRENT_USDC_ASSET_ID,
  CURRENT_SUBSCAN_URL,
  getTransactionUrl,
  getAccountUrl,
  isMainnet,
  isTestnet,
  NETWORK_CONFIG
};

