import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('viem', () => ({
  recoverMessageAddress: vi.fn(),
}));

vi.mock('viem/siwe', () => ({
  parseSiweMessage: vi.fn(),
}));

import { recoverMessageAddress } from 'viem';
import { parseSiweMessage } from 'viem/siwe';
import { ethereumVerifier } from '../ethereum.verifier.js';

const ADDR = '0xAbC0000000000000000000000000000000000001';
const INPUT = { message: 'siwe-message', signature: '0xsig', address: ADDR };

describe('ethereumVerifier.verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid:false for a message that omits the address/domain', async () => {
    parseSiweMessage.mockReturnValue({ statement: 'Sign in to Stadium' });

    const result = await ethereumVerifier.verify(INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Malformed/i);
    expect(recoverMessageAddress).not.toHaveBeenCalled();
  });

  it('returns valid:false when the recovered address does not match the message', async () => {
    parseSiweMessage.mockReturnValue({ address: ADDR, domain: 'localhost', statement: 'Sign in to Stadium' });
    recoverMessageAddress.mockResolvedValue('0xDEAd000000000000000000000000000000000002');

    const result = await ethereumVerifier.verify(INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/does not match/i);
  });

  it('returns valid:false when signature recovery throws', async () => {
    parseSiweMessage.mockReturnValue({ address: ADDR, domain: 'localhost', statement: 'Sign in to Stadium' });
    recoverMessageAddress.mockRejectedValue(new Error('bad signature'));

    const result = await ethereumVerifier.verify(INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid signature/i);
  });

  it('returns valid:false for an expired message', async () => {
    parseSiweMessage.mockReturnValue({
      address: ADDR,
      domain: 'localhost',
      statement: 'Sign in to Stadium',
      expirationTime: new Date(Date.now() - 60_000),
    });
    recoverMessageAddress.mockResolvedValue(ADDR.toLowerCase());

    const result = await ethereumVerifier.verify(INPUT);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });

  it('returns valid:true with parsed message and lowercased normalized address', async () => {
    parseSiweMessage.mockReturnValue({
      address: ADDR,
      domain: 'localhost',
      statement: 'Perform administrative action on Stadium',
      nonce: 'abc123',
      uri: 'https://localhost',
      expirationTime: new Date(Date.now() + 60_000),
    });
    // Recovered address matches but with different casing — must still verify.
    recoverMessageAddress.mockResolvedValue(ADDR.toLowerCase());

    const result = await ethereumVerifier.verify(INPUT);

    expect(result.valid).toBe(true);
    expect(result.parsed.statement).toBe('Perform administrative action on Stadium');
    expect(result.parsed.domain).toBe('localhost');
    expect(result.normalizedAddress).toBe(ADDR.toLowerCase());
  });
});
