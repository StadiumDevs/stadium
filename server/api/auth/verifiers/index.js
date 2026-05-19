/**
 * Sign-in verifier registry.
 *
 * Each verifier exposes `verify({ message, signature, address })` resolving to
 * `{ valid, parsed, normalizedAddress, ... }`. `getVerifier` returns `null` for
 * an unsupported chain and the caller responds 400.
 */

import { substrateVerifier } from './substrate.verifier.js';
import { ethereumVerifier } from './ethereum.verifier.js';
import { solanaVerifier } from './solana.verifier.js';

const verifiers = {
  substrate: substrateVerifier,
  ethereum: ethereumVerifier,
  solana: solanaVerifier,
};

/**
 * @param {string} chain
 * @returns {object|null} the verifier, or null if the chain is unsupported
 */
export function getVerifier(chain) {
  return verifiers[chain] || null;
}

export const SUPPORTED_CHAINS = Object.keys(verifiers);
