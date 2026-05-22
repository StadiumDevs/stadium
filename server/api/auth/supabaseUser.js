import { supabase } from '../../db.js';

/**
 * Verify a Supabase Auth (GoTrue) access token and return the user, or null.
 *
 * Uses `supabase.auth.getUser(token)`, which validates the JWT against the
 * project's GoTrue endpoint — no local JWT secret needed. The wallet remains
 * the authorization principal; this only establishes WHO signed in socially.
 *
 * @param {string|null|undefined} token
 * @returns {Promise<{ id: string, email: string|null } | null>}
 */
export async function getSupabaseUser(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

/** Extract a Supabase token from the `x-supabase-token` header (Bearer optional). */
export function extractSupabaseToken(req) {
  const h = req.headers?.['x-supabase-token'];
  if (typeof h !== 'string') return null;
  return h.replace(/^Bearer\s+/i, '').trim() || null;
}
