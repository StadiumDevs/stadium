import { decodeAddress } from '@polkadot/util-crypto'
import { u8aToHex } from '@polkadot/util'
import bs58 from 'bs58'

export type AddrChain = 'substrate' | 'ethereum' | 'solana'

/**
 * Reduce an address to its canonical comparison form for the given chain:
 *   - substrate: decoded public key hex (cross-prefix safe)
 *   - ethereum:  lowercased 0x address (EIP-55 checksum is display-only)
 *   - solana:    canonical base58 of the 32-byte ed25519 public key
 *
 * Returns null when the address is invalid for the chain.
 */
export function normalizeAddr(address?: string | null, chain: AddrChain = 'substrate'): string | null {
  if (!address) return null
  if (chain === 'ethereum') {
    const eth = address.trim()
    return /^0x[a-fA-F0-9]{40}$/.test(eth) ? eth.toLowerCase() : null
  }
  if (chain === 'solana') {
    try {
      const decoded = bs58.decode(address.trim())
      return decoded.length === 32 ? bs58.encode(decoded) : null
    } catch {
      return null
    }
  }
  // substrate — SS58 is base58, never 0x-prefixed hex
  if (/^0x/i.test(address.trim())) return null
  try {
    return u8aToHex(decodeAddress(address))
  } catch {
    return null
  }
}

/**
 * Compare two addresses on the same chain. For substrate this matches across
 * SS58 prefixes; for ethereum it is case-insensitive. Falls back to
 * case-insensitive string comparison when an address cannot be normalized.
 */
export function addressesEqual(
  a?: string | null,
  b?: string | null,
  chain: AddrChain = 'substrate'
): boolean {
  if (!a || !b) return false
  const na = normalizeAddr(a, chain)
  const nb = normalizeAddr(b, chain)
  if (na && nb) return na === nb
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * Check if an address exists in a list of addresses or objects with
 * walletAddress. List objects may carry their own `walletChain`; otherwise the
 * `chain` argument applies to every entry.
 */
export function addressInList(
  address: string | undefined | null,
  list: Array<{ walletAddress?: string; walletChain?: AddrChain } | string>,
  chain: AddrChain = 'substrate'
): boolean {
  if (!address) return false
  return list.some(item => {
    if (typeof item === 'string') {
      return addressesEqual(address, item, chain)
    }
    return addressesEqual(address, item.walletAddress, item.walletChain || chain)
  })
}
