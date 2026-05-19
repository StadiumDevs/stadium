/**
 * Single-use sign-in nonce store — anti-replay (issue #88).
 *
 * Each `x-siws-auth` message carries a client-generated nonce. The first time a
 * nonce is presented it is recorded; any later presentation is a replay and is
 * rejected. Rows expire with the owning message, so the table self-prunes.
 */

import { supabase } from '../../db.js';

// Fraction of consume calls that also sweep expired rows.
const CLEANUP_PROBABILITY = 0.05;

/**
 * Record a nonce as used.
 *
 * @param {string} nonce
 * @param {number|string|Date} expiresAt - when the owning message expires
 * @returns {Promise<{ ok: boolean, reason?: 'missing-nonce'|'replay' }>}
 *   `{ ok: true }` the first time a nonce is seen; `{ ok: false, reason }`
 *   if the nonce is absent or has already been used.
 */
export async function consumeNonce(nonce, expiresAt) {
  if (!nonce || typeof nonce !== 'string') {
    return { ok: false, reason: 'missing-nonce' };
  }

  const { error } = await supabase
    .from('auth_nonces')
    .insert({ nonce, expires_at: new Date(expiresAt).toISOString() });

  if (error) {
    // 23505 = unique_violation — the nonce has already been used.
    if (error.code === '23505') {
      return { ok: false, reason: 'replay' };
    }
    throw error;
  }

  if (Math.random() < CLEANUP_PROBABILITY) {
    try {
      await supabase.from('auth_nonces').delete().lt('expires_at', new Date().toISOString());
    } catch {
      // Best-effort cleanup — never fail a request over it.
    }
  }

  return { ok: true };
}
