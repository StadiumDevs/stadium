/**
 * Client-side store for the admin session bearer token.
 *
 * After one SIWS sign exchanged via POST /api/admin/session, the server
 * returns a short-lived HMAC-signed token. We stash it in sessionStorage
 * keyed by (chain,address) so subsequent admin requests in this tab can
 * just attach `Authorization: Bearer <token>` without a wallet popup.
 *
 * Expiry is enforced client-side too: if `expiresAt` has passed, we treat
 * the cache as empty and the caller signs again. The server treats the
 * same token as expired independently.
 */

const STORAGE_KEY = 'stadium_admin_session_v1';
// Refresh a little before the server-side TTL fires so the caller doesn't
// race expiry on a 14:59 minute-old token.
const REFRESH_MARGIN_MS = 30_000;

interface StoredSession {
  chain: string;
  address: string;
  token: string;
  expiresAt: string; // ISO
}

function readAll(): StoredSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is StoredSession =>
        s &&
        typeof s.chain === "string" &&
        typeof s.address === "string" &&
        typeof s.token === "string" &&
        typeof s.expiresAt === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(list: StoredSession[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* sessionStorage unavailable — token simply won't persist */
  }
}

const sameKey = (a: { chain: string; address: string }, b: { chain: string; address: string }) =>
  a.chain === b.chain && a.address.toLowerCase() === b.address.toLowerCase();

/** Returns the bearer token for the given account if it's still valid. */
export function readAdminToken(chain: string, address: string): string | null {
  const list = readAll();
  const match = list.find((s) => sameKey(s, { chain, address }));
  if (!match) return null;
  const expMs = new Date(match.expiresAt).getTime();
  if (!Number.isFinite(expMs)) return null;
  if (expMs - REFRESH_MARGIN_MS <= Date.now()) return null;
  return match.token;
}

export function writeAdminToken(args: {
  chain: string;
  address: string;
  token: string;
  expiresAt: string;
}) {
  const list = readAll().filter((s) => !sameKey(s, args));
  list.push(args);
  writeAll(list);
}

export function clearAdminToken(chain?: string, address?: string) {
  if (!chain || !address) {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    return;
  }
  const list = readAll().filter((s) => !sameKey(s, { chain, address }));
  writeAll(list);
}
