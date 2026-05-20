/**
 * Chain-aware authorized-signer (admin) list.
 *
 * `AUTHORIZED_SIGNERS` (or legacy `ADMIN_WALLETS`) is a comma-separated list.
 * Each entry is either `chain:address` or a bare address. A bare address is
 * treated as `substrate`, so existing `.env` files keep working unchanged.
 *
 *   AUTHORIZED_SIGNERS=5Grw...,ethereum:0xAbC...,solana:7Np...
 *
 * Authorization compares the normalized form of an address (see normalize.js),
 * so an admin only matches on the same chain they signed in with — an address
 * valid on chain X cannot be spoofed via chain Y.
 */

import { normalizeAddress } from './normalize.js';

const CHAINS = ['substrate', 'ethereum', 'solana'];

/**
 * Parse one raw entry into `{ chain, address }`. Untagged ⇒ substrate.
 * @param {string} raw
 * @returns {{ chain: string, address: string }|null}
 */
function parseEntry(raw) {
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const colon = trimmed.indexOf(':');
  if (colon > 0) {
    const tag = trimmed.slice(0, colon).toLowerCase();
    if (CHAINS.includes(tag)) {
      return { chain: tag, address: trimmed.slice(colon + 1).trim() };
    }
  }
  return { chain: 'substrate', address: trimmed };
}

/**
 * Parse a comma-separated signer list into normalized `{ chain, normalized }`
 * entries, dropping anything that fails to normalize for its chain.
 *
 * @param {string} raw
 * @returns {Array<{ chain: string, normalized: string }>}
 */
export function parseAuthorizedSigners(raw) {
  return String(raw || '')
    .split(',')
    .map(parseEntry)
    .filter(Boolean)
    .map(({ chain, address }) => ({ chain, normalized: normalizeAddress(chain, address) }))
    .filter((entry) => entry.normalized != null);
}

/**
 * Whether `(chain, address)` is present in a parsed signer list.
 * @param {Array<{ chain: string, normalized: string }>} list
 * @param {string} chain
 * @param {string} address
 * @returns {boolean}
 */
export function matchSigner(list, chain, address) {
  const normalized = normalizeAddress(chain, address);
  if (!normalized) return false;
  return list.some((entry) => entry.chain === chain && entry.normalized === normalized);
}

// Built once at module load (matches polkadot-config.js).
const AUTHORIZED = parseAuthorizedSigners(
  process.env.AUTHORIZED_SIGNERS || process.env.ADMIN_WALLETS || '',
);

/**
 * Whether a signer is an authorized admin on the given chain.
 * @param {string} chain
 * @param {string} address
 * @returns {boolean}
 */
export function isAuthorizedSigner(chain, address) {
  return matchSigner(AUTHORIZED, chain, address);
}

/** Count of configured authorized signers across all chains. */
export function authorizedSignerCount() {
  return AUTHORIZED.length;
}
