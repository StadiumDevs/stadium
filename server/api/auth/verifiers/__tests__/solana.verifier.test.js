import { describe, it, expect } from 'vitest';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { solanaVerifier } from '../solana.verifier.js';

function buildMessage({ domain = 'localhost', address, statement = 'Sign in to Stadium', expirationTime }) {
  return [
    `${domain} wants you to sign in with your Solana account:`,
    address,
    '',
    statement,
    '',
    'URI: https://localhost',
    'Version: 1',
    'Nonce: abc123',
    'Issued At: 2026-01-01T00:00:00.000Z',
    ...(expirationTime ? [`Expiration Time: ${expirationTime}`] : []),
  ].join('\n');
}

describe('solanaVerifier.verify', () => {
  const keypair = nacl.sign.keyPair();
  const address = bs58.encode(keypair.publicKey);

  const sign = (message) =>
    bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), keypair.secretKey));

  it('verifies a correctly signed message', async () => {
    const message = buildMessage({ address });
    const result = await solanaVerifier.verify({ message, signature: sign(message), address });

    expect(result.valid).toBe(true);
    expect(result.parsed.statement).toBe('Sign in to Stadium');
    expect(result.parsed.domain).toBe('localhost');
    expect(result.normalizedAddress).toBe(address);
  });

  it('rejects a tampered message (signature no longer matches)', async () => {
    const signature = sign(buildMessage({ address }));
    const tampered = buildMessage({ address, statement: 'Drain the treasury on Stadium' });
    const result = await solanaVerifier.verify({ message: tampered, signature, address });

    expect(result.valid).toBe(false);
  });

  it('rejects a malformed message', async () => {
    const result = await solanaVerifier.verify({
      message: 'not a sign-in message',
      signature: 'x',
      address,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Malformed/i);
  });

  it('rejects a signature produced by a different key', async () => {
    const message = buildMessage({ address });
    const other = nacl.sign.keyPair();
    const wrongSig = bs58.encode(
      nacl.sign.detached(new TextEncoder().encode(message), other.secretKey),
    );
    const result = await solanaVerifier.verify({ message, signature: wrongSig, address });

    expect(result.valid).toBe(false);
  });

  it('rejects an expired message', async () => {
    const message = buildMessage({
      address,
      expirationTime: new Date(Date.now() - 60_000).toISOString(),
    });
    const result = await solanaVerifier.verify({ message, signature: sign(message), address });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/expired/i);
  });
});
