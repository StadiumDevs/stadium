/**
 * Substrate (SIWS — Sign-In With Substrate) signature verifier.
 *
 * Verifies an sr25519/ed25519 signature over a SIWS message using
 * `@polkadot/util-crypto`, and parses the message with `@talismn/siws`.
 */

import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';
import { parseMessage } from '@talismn/siws';
import { normalizeAddress } from '../normalize.js';

/**
 * @typedef {Object} VerifyResult
 * @property {boolean} valid
 * @property {string} [error]
 * @property {string} [crypto]
 * @property {object} [parsed]            parsed message { statement, address, domain, ... }
 * @property {string|null} [normalizedAddress]
 */

export const substrateVerifier = {
  chain: 'substrate',

  /**
   * @param {{ message: string, signature: string, address: string }} input
   * @returns {Promise<VerifyResult>}
   */
  async verify({ message, signature, address }) {
    await cryptoWaitReady();

    const result = signatureVerify(message, signature, address);
    if (!result?.isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    const parsed = parseMessage(message);
    return {
      valid: true,
      crypto: result.crypto,
      parsed,
      normalizedAddress: normalizeAddress('substrate', parsed.address),
    };
  },
};

export default substrateVerifier;
