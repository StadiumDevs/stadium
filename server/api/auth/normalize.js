/**
 * Per-chain address normalization.
 *
 * Two addresses identify the same account when their normalized forms are
 * strictly equal. Each chain has its own canonical form:
 *   - substrate: decoded public key as hex (cross-prefix safe, e.g. SS58 42 vs 0)
 *   - ethereum:  lowercased 0x address (added in Phase B)
 *   - solana:    canonical base58 of the 32-byte public key (added in Phase C)
 *
 * Returns `null` when the address cannot be decoded for the given chain.
 */

import { decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import bs58 from 'bs58';

/**
 * @param {string} chain - 'substrate' | 'ethereum' | 'solana'
 * @param {string} address
 * @returns {string|null} normalized address, or null if invalid for the chain
 */
export function normalizeAddress(chain, address) {
  if (!address) return null;

  switch (chain) {
    case 'substrate':
      // SS58 addresses are base58 — never 0x-prefixed hex. `decodeAddress`
      // leniently accepts raw hex, so reject it explicitly to avoid an
      // Ethereum address being mistaken for a Substrate one.
      if (/^0x/i.test(String(address).trim())) return null;
      try {
        return u8aToHex(decodeAddress(address));
      } catch {
        return null;
      }
    case 'ethereum': {
      // EIP-55 checksum is display-only; lowercase is the canonical compare form.
      const eth = String(address).trim();
      return /^0x[a-fA-F0-9]{40}$/.test(eth) ? eth.toLowerCase() : null;
    }
    case 'solana': {
      // Canonical base58 of the 32-byte ed25519 public key.
      try {
        const decoded = bs58.decode(String(address).trim());
        return decoded.length === 32 ? bs58.encode(decoded) : null;
      } catch {
        return null;
      }
    }
    default:
      return null;
  }
}
