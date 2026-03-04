import { decodeAddress } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'

/**
 * Compare two SS58 addresses by their decoded public keys.
 * Works across different SS58 prefixes (Polkadot, Kusama, Substrate generic, etc.).
 * Falls back to case-insensitive string comparison if decoding fails.
 */
export function addressesEqual(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  try {
    return u8aToHex(decodeAddress(a)) === u8aToHex(decodeAddress(b))
  } catch {
    return a.toLowerCase() === b.toLowerCase()
  }
}

/**
 * Check if an address exists in a list of addresses or objects with walletAddress.
 * Supports both string arrays (e.g. ADMIN_ADDRESSES) and object arrays (e.g. teamMembers).
 */
export function addressInList(
  address: string | undefined | null,
  list: Array<{ walletAddress?: string } | string>
): boolean {
  if (!address) return false
  return list.some(item => {
    const addr = typeof item === 'string' ? item : item.walletAddress
    return addressesEqual(address, addr)
  })
}
