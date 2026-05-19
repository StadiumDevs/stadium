import { describe, it, expect } from 'vitest';
import { parseAuthorizedSigners, matchSigner } from '../authorizedSigners.js';

// Well-known dev addresses (Alice / Bob) — valid SS58 so normalization succeeds.
const ALICE = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
const BOB = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
const ETH = '0x1111111111111111111111111111111111111111';

describe('parseAuthorizedSigners', () => {
  it('treats a bare address as a substrate signer', () => {
    const list = parseAuthorizedSigners(ALICE);
    expect(list).toHaveLength(1);
    expect(list[0].chain).toBe('substrate');
  });

  it('parses chain-tagged entries', () => {
    const list = parseAuthorizedSigners(`${ALICE}, ethereum:${ETH}`);
    const chains = list.map((e) => e.chain).sort();
    expect(chains).toEqual(['ethereum', 'substrate']);
  });

  it('drops an untagged Ethereum address (it fails substrate normalization)', () => {
    expect(parseAuthorizedSigners(ETH)).toEqual([]);
  });

  it('drops entries that fail normalization for their tagged chain', () => {
    expect(parseAuthorizedSigners('ethereum:not-an-address')).toEqual([]);
  });

  it('returns an empty list for empty input', () => {
    expect(parseAuthorizedSigners('')).toEqual([]);
    expect(parseAuthorizedSigners(undefined)).toEqual([]);
  });
});

describe('matchSigner', () => {
  const list = parseAuthorizedSigners(`${ALICE}, ethereum:${ETH}`);

  it('matches a configured substrate signer', () => {
    expect(matchSigner(list, 'substrate', ALICE)).toBe(true);
  });

  it('matches a configured ethereum signer case-insensitively', () => {
    expect(matchSigner(list, 'ethereum', ETH.toUpperCase().replace('0X', '0x'))).toBe(true);
  });

  it('rejects an address that is not configured', () => {
    expect(matchSigner(list, 'substrate', BOB)).toBe(false);
  });

  it('rejects a configured address presented on the wrong chain', () => {
    expect(matchSigner(list, 'ethereum', ALICE)).toBe(false);
    expect(matchSigner(list, 'substrate', ETH)).toBe(false);
  });
});
