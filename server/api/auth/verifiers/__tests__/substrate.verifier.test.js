import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@polkadot/util-crypto', () => ({
  cryptoWaitReady: vi.fn().mockResolvedValue(true),
  signatureVerify: vi.fn(),
  decodeAddress: vi.fn(),
}));

vi.mock('@talismn/siws', () => ({
  parseMessage: vi.fn(),
}));

vi.mock('@polkadot/util', () => ({
  u8aToHex: vi.fn(),
}));

import { signatureVerify, decodeAddress } from '@polkadot/util-crypto';
import { parseMessage } from '@talismn/siws';
import { u8aToHex } from '@polkadot/util';
import { substrateVerifier } from '../substrate.verifier.js';

const INPUT = { message: 'siws-message', signature: '0xsig', address: '5Abc' };

describe('substrateVerifier.verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid:false for an invalid signature and does not parse the message', async () => {
    signatureVerify.mockReturnValue({ isValid: false });

    const result = await substrateVerifier.verify(INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid signature/i);
    expect(parseMessage).not.toHaveBeenCalled();
  });

  it('returns valid:true with parsed message and normalized address for a valid signature', async () => {
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Sign in to Stadium',
      address: '5Abc',
      domain: 'localhost',
    });
    decodeAddress.mockReturnValue(new Uint8Array([0xde, 0xad]));
    u8aToHex.mockReturnValue('0xdead');

    const result = await substrateVerifier.verify(INPUT);

    expect(result.valid).toBe(true);
    expect(result.crypto).toBe('sr25519');
    expect(result.parsed.statement).toBe('Sign in to Stadium');
    expect(result.normalizedAddress).toBe('0xdead');
  });

  it('returns normalizedAddress:null when the parsed address cannot be decoded', async () => {
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({ statement: 'Sign in to Stadium', address: 'bad', domain: 'localhost' });
    decodeAddress.mockImplementation(() => { throw new Error('Invalid SS58'); });

    const result = await substrateVerifier.verify(INPUT);

    expect(result.valid).toBe(true);
    expect(result.normalizedAddress).toBeNull();
  });
});
