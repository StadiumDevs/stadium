import { addressInList } from './addressUtils'

// Get admin addresses from environment variable
const adminAddressesEnv = import.meta.env.VITE_ADMIN_ADDRESSES || ''

export const ADMIN_ADDRESSES = adminAddressesEnv
  .split(',')
  .map(addr => addr.trim())
  .filter(addr => addr.length > 0)

/**
 * Check if wallet address has admin access.
 * Compares decoded public keys so different SS58 prefixes still match.
 */
export const isAdmin = (walletAddress?: string): boolean => {
  return addressInList(walletAddress, ADMIN_ADDRESSES)
}
