/**
 * Ethereum (SIWE — Sign-In With Ethereum, EIP-4361) signature verifier.
 *
 * The wallet signs the EIP-4361 message with `personal_sign` (EIP-191). We
 * parse the message with viem's SIWE utilities and recover the signing address
 * offline with `recoverMessageAddress` — no RPC/chain access is needed for
 * externally-owned accounts (the only accounts a browser extension exposes).
 */

import { recoverMessageAddress } from 'viem';
import { parseSiweMessage } from 'viem/siwe';
import { normalizeAddress } from '../normalize.js';

export const ethereumVerifier = {
  chain: 'ethereum',

  /**
   * @param {{ message: string, signature: string, address: string }} input
   * @returns {Promise<import('./substrate.verifier.js').VerifyResult>}
   */
  async verify({ message, signature }) {
    const fields = parseSiweMessage(message);
    if (!fields?.address || !fields?.domain) {
      return { valid: false, error: 'Malformed SIWE message' };
    }

    let recovered;
    try {
      recovered = await recoverMessageAddress({ message, signature });
    } catch (e) {
      return { valid: false, error: `Invalid signature: ${e.message}` };
    }

    if (recovered.toLowerCase() !== fields.address.toLowerCase()) {
      return { valid: false, error: 'Signature does not match the message address' };
    }

    // Reject stale / not-yet-valid messages (partial replay mitigation).
    const now = Date.now();
    if (fields.expirationTime && fields.expirationTime.getTime() < now) {
      return { valid: false, error: 'Sign-in message has expired' };
    }
    if (fields.notBefore && fields.notBefore.getTime() > now) {
      return { valid: false, error: 'Sign-in message is not yet valid' };
    }

    const parsed = {
      statement: fields.statement,
      address: fields.address,
      domain: fields.domain,
      nonce: fields.nonce,
      uri: fields.uri,
      issuedAt: fields.issuedAt,
      expirationTime: fields.expirationTime,
    };

    return {
      valid: true,
      parsed,
      normalizedAddress: normalizeAddress('ethereum', fields.address),
    };
  },
};

export default ethereumVerifier;
