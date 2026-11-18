import { supabase } from '../../db.js';

// Single-use SIWS nonces (anti-replay, #88). Logic lives in api/auth/nonceStore.js.
class NonceRepository {
  /** Insert a nonce. Returns Supabase's `{ error }` (23505 = already used). */
  async insert(nonce, expiresAtIso) {
    const { error } = await supabase
      .from('auth_nonces')
      .insert({ nonce, expires_at: expiresAtIso });
    return { error };
  }

  /** Delete nonces that expired before `nowIso`. */
  async deleteExpired(nowIso) {
    await supabase.from('auth_nonces').delete().lt('expires_at', nowIso);
  }
}

export default new NonceRepository();
