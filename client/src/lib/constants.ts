import { decodeAddress } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'

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
  if (!walletAddress) return false
  try {
    const pubkey = u8aToHex(decodeAddress(walletAddress))
    return ADMIN_ADDRESSES.some(admin => {
      try {
        return u8aToHex(decodeAddress(admin)) === pubkey
      } catch { return false }
    })
  } catch { return false }
}

