import { describe, it, expect } from 'vitest';
import { parsePayload, AuthPayloadError } from '../parsePayload.js';

function encode(payload) {
  return btoa(JSON.stringify(payload));
}

const VALID = { message: 'msg', signature: '0xsig', address: '5Abc' };

describe('parsePayload', () => {
  it('decodes a valid payload and defaults chain to substrate', () => {
    const result = parsePayload(encode(VALID));
    expect(result).toEqual({ chain: 'substrate', ...VALID });
  });

  it('preserves an explicit chain field', () => {
    const result = parsePayload(encode({ ...VALID, chain: 'ethereum' }));
    expect(result.chain).toBe('ethereum');
  });

  it('throws AuthPayloadError(400) for invalid base64', () => {
    expect(() => parsePayload('!!!invalid-base64!!!')).toThrow(AuthPayloadError);
    try {
      parsePayload('!!!invalid-base64!!!');
    } catch (e) {
      expect(e.status).toBe(400);
      expect(e.message).toMatch(/Base64/i);
    }
  });

  it('throws AuthPayloadError(400) for malformed JSON', () => {
    try {
      parsePayload(btoa('not-json'));
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(AuthPayloadError);
      expect(e.status).toBe(400);
      expect(e.message).toMatch(/Malformed/i);
    }
  });

  it('throws AuthPayloadError(400) for an incomplete payload', () => {
    for (const partial of [{ message: 'm' }, { message: 'm', signature: 's' }, {}]) {
      try {
        parsePayload(encode(partial));
        throw new Error('should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AuthPayloadError);
        expect(e.message).toMatch(/Incomplete/i);
      }
    }
  });
});
