/**
 * Admin session tokens — HMAC-signed bearer tokens with TTL.
 *
 * Solves the per-action signature popup problem: after one SIWS sign, the
 * admin trades it for a short-lived bearer token. Subsequent admin actions
 * send `Authorization: Bearer <token>` and the auth middleware accepts it
 * without going through the wallet again.
 *
 * Why HMAC and not JWT? No dependency churn. Node's crypto is enough and
 * keeps the verifier surface small. Format:
 *   base64url(json_payload).base64url(hmac_sha256(secret, payload))
 *
 * Payload shape: { address, chain, iat, exp } — exp is unix seconds.
 *
 * Secret comes from ADMIN_SESSION_SECRET (require ≥ 32 chars at startup).
 * TTL is ADMIN_SESSION_TTL_SECONDS, default 900 (15 minutes).
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_TTL_SECONDS = 15 * 60;
const MIN_SECRET_LENGTH = 32;

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const b64urlDecode = (str) => Buffer.from(str, 'base64url');

let cachedSecret = null;
function getSecret() {
  if (cachedSecret) return cachedSecret;
  const raw = process.env.ADMIN_SESSION_SECRET;
  if (!raw || raw.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `ADMIN_SESSION_SECRET must be set to a string of at least ${MIN_SECRET_LENGTH} characters`,
    );
  }
  cachedSecret = Buffer.from(raw, 'utf8');
  return cachedSecret;
}

function getTtlSeconds() {
  const v = Number(process.env.ADMIN_SESSION_TTL_SECONDS);
  if (Number.isFinite(v) && v > 0 && v <= 24 * 3600) return v;
  return DEFAULT_TTL_SECONDS;
}

/**
 * Fail fast at server boot if ADMIN_SESSION_SECRET is missing or too short,
 * rather than at the first admin sign-in (when getSecret() would otherwise
 * throw). Call this once during startup.
 */
export function assertSessionSecret() {
  getSecret();
}

/** Allow tests to reset module-scoped caches between cases. */
export function _resetCacheForTests() {
  cachedSecret = null;
}

/**
 * Issue a session token for an authenticated admin wallet.
 *
 * @param {{ address: string, chain: 'substrate'|'ethereum'|'solana' }} subject
 * @returns {{ token: string, expiresAt: string }}
 */
export function issueSessionToken({ address, chain }) {
  if (!address || typeof address !== 'string') throw new Error('address required');
  if (!chain || typeof chain !== 'string') throw new Error('chain required');
  const secret = getSecret();
  const ttl = getTtlSeconds();
  const now = Math.floor(Date.now() / 1000);
  const payload = { address, chain, iat: now, exp: now + ttl };
  const payloadStr = b64url(JSON.stringify(payload));
  const sig = b64url(createHmac('sha256', secret).update(payloadStr).digest());
  return {
    token: `${payloadStr}.${sig}`,
    expiresAt: new Date((now + ttl) * 1000).toISOString(),
  };
}

/**
 * Verify a bearer token. Returns `{ valid, reason?, address?, chain?, exp? }`.
 *
 * Constant-time signature comparison; no timing oracle on the HMAC. Caller
 * receives a typed `reason` so failure modes can be distinguished in tests
 * and logged usefully ('malformed', 'bad_signature', 'expired').
 */
export function verifySessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'malformed' };
  }
  const [payloadStr, sigStr] = token.split('.', 2);
  if (!payloadStr || !sigStr) return { valid: false, reason: 'malformed' };

  let secret;
  try {
    secret = getSecret();
  } catch {
    return { valid: false, reason: 'no_secret' };
  }

  const expected = createHmac('sha256', secret).update(payloadStr).digest();
  let actual;
  try {
    actual = b64urlDecode(sigStr);
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (expected.length !== actual.length) return { valid: false, reason: 'bad_signature' };
  if (!timingSafeEqual(expected, actual)) return { valid: false, reason: 'bad_signature' };

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadStr).toString('utf8'));
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  if (
    typeof payload.address !== 'string' ||
    typeof payload.chain !== 'string' ||
    typeof payload.exp !== 'number'
  ) {
    return { valid: false, reason: 'malformed' };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSeconds) return { valid: false, reason: 'expired' };

  return {
    valid: true,
    address: payload.address,
    chain: payload.chain,
    exp: payload.exp,
  };
}

/**
 * Read `Authorization: Bearer <token>` from a request. Returns the raw
 * token string or null if not present.
 */
export function extractBearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization;
  if (typeof header !== 'string') return null;
  const m = header.match(/^Bearer\s+(\S+)\s*$/);
  return m ? m[1] : null;
}
