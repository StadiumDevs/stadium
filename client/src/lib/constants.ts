import { addressesEqual, type AddrChain } from './addressUtils'

/**
 * Admin wallet configuration.
 *
 * `VITE_ADMIN_ADDRESSES` is a comma-separated list. Each entry is either
 * `chain:address` or a bare address (bare ⇒ substrate, so existing config
 * keeps working). Example:
 *   VITE_ADMIN_ADDRESSES=5Grw...,ethereum:0xAbC...
 */

export interface AdminEntry {
  chain: AddrChain
  address: string
}

const CHAINS: AddrChain[] = ['substrate', 'ethereum', 'solana']

function parseEntry(raw: string): AdminEntry | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const colon = trimmed.indexOf(':')
  if (colon > 0) {
    const tag = trimmed.slice(0, colon).toLowerCase() as AddrChain
    if (CHAINS.includes(tag)) {
      return { chain: tag, address: trimmed.slice(colon + 1).trim() }
    }
  }
  return { chain: 'substrate', address: trimmed }
}

const adminAddressesEnv = import.meta.env.VITE_ADMIN_ADDRESSES || ''

export const ADMIN_ADDRESSES: AdminEntry[] = adminAddressesEnv
  .split(',')
  .map(parseEntry)
  .filter((entry): entry is AdminEntry => entry !== null)

/**
 * Check if a wallet address has admin access on the given chain.
 * An address only matches an admin entry on the same chain.
 */
export const isAdmin = (walletAddress?: string, chain: AddrChain = 'substrate'): boolean => {
  if (!walletAddress) return false
  return ADMIN_ADDRESSES.some(
    entry => entry.chain === chain && addressesEqual(entry.address, walletAddress, chain)
  )
}

/**
 * Prize-tier types and fallback set for program judging.
 * A program may configure its own `prizeTiers`; when it hasn't, the UI falls
 * back to these (Bitrefill EUR giftcards). Mirrors DEFAULT_PRIZE_TIERS in
 * server/api/utils/submission.validator.js.
 */
export interface PrizeTier {
  amount: number
  currency: string
  label: string
}

export const DEFAULT_PRIZE_TIERS: PrizeTier[] = [
  { amount: 500, currency: 'EUR', label: 'Bitrefill giftcard' },
  { amount: 200, currency: 'EUR', label: 'Bitrefill giftcard' },
  { amount: 100, currency: 'EUR', label: 'Bitrefill giftcard' },
]

/** A program's effective tiers: its own if configured, else the default set. */
export const prizeTiersFor = (tiers?: PrizeTier[] | null): PrizeTier[] =>
  tiers && tiers.length ? tiers : DEFAULT_PRIZE_TIERS
