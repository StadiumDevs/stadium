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

  it('returns valid:false for an invalid signature', async () => {
    parseMessage.mockReturnValue({ statement: 'Sign in to Stadium', address: '5Abc', domain: 'localhost' });
    signatureVerify.mockReturnValue({ isValid: false });

    const result = await substrateVerifier.verify(INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid signature/i);
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

  // --- Regression tests: wallet-spoofing (see commit / PR description) ---

  it('verifies the signature against parsed.address (from message body), NOT the header address', async () => {
    // Attacker scenario: client says they are "5Attacker" but the signed SIWS
    // body claims "5Victim". signatureVerify must be called against the body
    // address, otherwise the attacker (who signed with their own key) would
    // pass and the middleware would mint a session for the victim.
    parseMessage.mockReturnValue({
      statement: 'Sign in to Stadium',
      address: '5Victim',
      domain: 'localhost',
    });
    signatureVerify.mockReturnValue({ isValid: false }); // signature does NOT verify under 5Victim
    decodeAddress.mockReturnValue(new Uint8Array([0xde, 0xad]));
    u8aToHex.mockReturnValue('0xdead');

    const result = await substrateVerifier.verify({
      message: 'siws-message',
      signature: '0xattackerSig',
      address: '5Attacker', // header says attacker — must be ignored
    });

    expect(result.valid).toBe(false);
    expect(signatureVerify).toHaveBeenCalledWith('siws-message', '0xattackerSig', '5Victim');
  });

  it('ignores the header address even when it differs from parsed.address (valid signature path)', async () => {
    // Mirror of the previous test, with a passing signature. Confirms identity
    // is taken from parsed.address regardless of what the header claims.
    parseMessage.mockReturnValue({
      statement: 'Sign in to Stadium',
      address: '5Real',
      domain: 'localhost',
    });
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    decodeAddress.mockReturnValue(new Uint8Array([0xbe, 0xef]));
    u8aToHex.mockReturnValue('0xbeef');

    const result = await substrateVerifier.verify({
      message: 'siws-message',
      signature: '0xsig',
      address: '5Spoofed', // misleading header value
    });

    expect(result.valid).toBe(true);
    expect(signatureVerify).toHaveBeenCalledWith('siws-message', '0xsig', '5Real');
    expect(result.parsed.address).toBe('5Real');
    expect(result.normalizedAddress).toBe('0xbeef');
  });

  it('rejects messages whose body has no address line', async () => {
    parseMessage.mockReturnValue({ statement: 'Sign in to Stadium', domain: 'localhost' });

    const result = await substrateVerifier.verify(INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/missing an address line/i);
    expect(signatureVerify).not.toHaveBeenCalled();
  });
});
