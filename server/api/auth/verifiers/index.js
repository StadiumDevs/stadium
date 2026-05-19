/**
 * Sign-in verifier registry.
 *
 * Each verifier exposes `verify({ message, signature, address })` resolving to
 * `{ valid, parsed, normalizedAddress, ... }`. The Solana verifier is added in
 * Phase C — until then `getVerifier('solana')` returns `null` and the caller
 * responds 400.
 */

import { substrateVerifier } from './substrate.verifier.js';
import { ethereumVerifier } from './ethereum.verifier.js';

const verifiers = {
  substrate: substrateVerifier,
  ethereum: ethereumVerifier,
};

/**
 * @param {string} chain
 * @returns {object|null} the verifier, or null if the chain is unsupported
 */
export function getVerifier(chain) {
  return verifiers[chain] || null;
}

export const SUPPORTED_CHAINS = Object.keys(verifiers);
