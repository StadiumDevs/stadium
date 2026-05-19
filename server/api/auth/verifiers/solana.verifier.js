/**
 * Solana (Sign-In With Solana) signature verifier.
 *
 * The wallet signs a SIWE-style plaintext message with `signMessage`, which
 * produces an ed25519 signature over the UTF-8 message bytes. We verify it
 * offline with tweetnacl — no RPC access is needed.
 *
 * The message format is fixed (see solanaProvider.ts on the client):
 *
 *   {domain} wants you to sign in with your Solana account:
 *   {address}
 *
 *   {statement}
 *
 *   URI: {uri}
 *   Version: 1
 *   Nonce: {nonce}
 *   Issued At: {issuedAt}
 *   Expiration Time: {expirationTime}
 */

import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { normalizeAddress } from '../normalize.js';

const HEADER_RE = /^(.+) wants you to sign in with your Solana account:$/;

/**
 * Parse the fixed Solana sign-in message format.
 * @param {string} message
 * @returns {{ domain, address, statement, uri?, nonce?, issuedAt?, expirationTime? }|null}
 */
function parseSolanaMessage(message) {
  const lines = String(message).split('\n');
  const header = HEADER_RE.exec(lines[0] || '');
  if (!header) return null;

  const address = (lines[1] || '').trim();
  if (!address) return null;

  // lines[2] is blank, lines[3] is the statement, lines[4] is blank.
  const statement = (lines[3] || '').trim();

  const fields = {};
  for (const line of lines.slice(4)) {
    const sep = line.indexOf(': ');
    if (sep > 0) {
      fields[line.slice(0, sep).trim()] = line.slice(sep + 2).trim();
    }
  }

  return {
    domain: header[1],
    address,
    statement,
    uri: fields.URI,
    nonce: fields.Nonce,
    issuedAt: fields['Issued At'],
    expirationTime: fields['Expiration Time'],
  };
}

export const solanaVerifier = {
  chain: 'solana',

  /**
   * @param {{ message: string, signature: string, address: string }} input
   * @returns {Promise<import('./substrate.verifier.js').VerifyResult>}
   */
  async verify({ message, signature }) {
    const parsed = parseSolanaMessage(message);
    if (!parsed) {
      return { valid: false, error: 'Malformed Solana sign-in message' };
    }

    let pubkey;
    let sigBytes;
    try {
      pubkey = bs58.decode(parsed.address);
      sigBytes = bs58.decode(signature);
    } catch {
      return { valid: false, error: 'Invalid base58 in address or signature' };
    }
    if (pubkey.length !== 32) {
      return { valid: false, error: 'Invalid Solana public key' };
    }

    let ok = false;
    try {
      ok = nacl.sign.detached.verify(new TextEncoder().encode(message), sigBytes, pubkey);
    } catch {
      return { valid: false, error: 'Invalid signature' };
    }
    if (!ok) {
      return { valid: false, error: 'Invalid signature' };
    }

    if (parsed.expirationTime) {
      const exp = new Date(parsed.expirationTime).getTime();
      if (Number.isFinite(exp) && exp < Date.now()) {
        return { valid: false, error: 'Sign-in message has expired' };
      }
    }

    return {
      valid: true,
      parsed,
      normalizedAddress: normalizeAddress('solana', parsed.address),
    };
  },
};

export default solanaVerifier;
