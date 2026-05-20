import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  issueSessionToken,
  verifySessionToken,
  extractBearerToken,
  _resetCacheForTests,
} from '../sessionToken.js';

const FRESH_SECRET = 'x'.repeat(40);

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = FRESH_SECRET;
  delete process.env.ADMIN_SESSION_TTL_SECONDS;
  _resetCacheForTests();
});

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET;
  delete process.env.ADMIN_SESSION_TTL_SECONDS;
  _resetCacheForTests();
});

describe('issueSessionToken + verifySessionToken', () => {
  it('round-trips an address + chain through the token', () => {
    const { token, expiresAt } = issueSessionToken({ address: '5Alice', chain: 'substrate' });
    expect(token.split('.').length).toBe(2);
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

    const v = verifySessionToken(token);
    expect(v).toMatchObject({ valid: true, address: '5Alice', chain: 'substrate' });
    expect(v.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects a tampered payload', () => {
    const { token } = issueSessionToken({ address: '5Alice', chain: 'substrate' });
    const [_payload, sig] = token.split('.');
    void _payload;
    // Replace the payload with one that says we're Bob — signature won't match.
    const fakePayload = Buffer.from(
      JSON.stringify({ address: '5Bob', chain: 'substrate', iat: 0, exp: 9999999999 }),
    ).toString('base64url');
    const v = verifySessionToken(`${fakePayload}.${sig}`);
    expect(v).toMatchObject({ valid: false, reason: 'bad_signature' });
  });

  it('rejects malformed tokens', () => {
    expect(verifySessionToken('').valid).toBe(false);
    expect(verifySessionToken('no-dot').valid).toBe(false);
    expect(verifySessionToken('a.b').valid).toBe(false);
  });

  it('rejects a token signed with a different secret', () => {
    const { token } = issueSessionToken({ address: '5Alice', chain: 'substrate' });
    process.env.ADMIN_SESSION_SECRET = 'y'.repeat(40);
    _resetCacheForTests();
    const v = verifySessionToken(token);
    expect(v).toMatchObject({ valid: false, reason: 'bad_signature' });
  });

  it('rejects an expired token', () => {
    process.env.ADMIN_SESSION_TTL_SECONDS = '1';
    _resetCacheForTests();
    const { token } = issueSessionToken({ address: '5Alice', chain: 'substrate' });
    // Move the clock past the TTL.
    const original = Date.now;
    Date.now = () => original.call(Date) + 2000;
    try {
      const v = verifySessionToken(token);
      expect(v).toMatchObject({ valid: false, reason: 'expired' });
    } finally {
      Date.now = original;
    }
  });

  it('throws on issue when the secret is missing or too short', () => {
    process.env.ADMIN_SESSION_SECRET = 'short';
    _resetCacheForTests();
    expect(() => issueSessionToken({ address: 'a', chain: 'substrate' })).toThrow(
      /ADMIN_SESSION_SECRET/,
    );
  });

  it('uses the configured TTL when present', () => {
    process.env.ADMIN_SESSION_TTL_SECONDS = '60';
    _resetCacheForTests();
    const { token } = issueSessionToken({ address: 'a', chain: 'substrate' });
    const v = verifySessionToken(token);
    expect(v.valid).toBe(true);
    expect(v.exp - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(60);
    expect(v.exp - Math.floor(Date.now() / 1000)).toBeGreaterThan(0);
  });
});

describe('extractBearerToken', () => {
  it('reads Authorization: Bearer …', () => {
    const req = { headers: { authorization: 'Bearer abc.def' } };
    expect(extractBearerToken(req)).toBe('abc.def');
  });

  it('returns null when the header is missing or non-bearer', () => {
    expect(extractBearerToken({ headers: {} })).toBeNull();
    expect(extractBearerToken({ headers: { authorization: 'Basic abc' } })).toBeNull();
    expect(extractBearerToken({})).toBeNull();
  });
});
