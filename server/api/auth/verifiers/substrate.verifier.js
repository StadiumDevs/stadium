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
   * SECURITY: the signature must be verified against the address claimed INSIDE
   * the SIWS message body (`parsed.address`), not against whatever address the
   * client supplies in the request header. If we verified against the header
   * address, an attacker could sign a message with their own key while putting
   * a victim's address in the message body — the signature would still verify
   * (against the attacker's address), and the middleware would then trust
   * `parsed.address` (the victim) as the identity. The header `address` field
   * is accepted for backwards compatibility with the request shape but is
   * intentionally ignored here.
   *
   * Mirrors the ethereum verifier (ecrecover → compare to `fields.address`)
   * and the solana verifier (derive pubkey from `parsed.address`). All three
   * chains now share the invariant: the signing wallet is the wallet named in
   * the signed message — there is no second, header-only source of identity.
   *
   * @param {{ message: string, signature: string, address?: string }} input
   * @returns {Promise<VerifyResult>}
   */
  async verify({ message, signature }) {
    await cryptoWaitReady();

    const parsed = parseMessage(message);
    if (!parsed?.address || typeof parsed.address !== 'string') {
      return { valid: false, error: 'SIWS message is missing an address line' };
    }

    let result;
    try {
      result = signatureVerify(message, signature, parsed.address);
    } catch (e) {
      return { valid: false, error: `Signature verification threw: ${e.message}` };
    }
    if (!result?.isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return {
      valid: true,
      crypto: result.crypto,
      parsed,
      normalizedAddress: normalizeAddress('substrate', parsed.address),
    };
  },
};

export default substrateVerifier;
