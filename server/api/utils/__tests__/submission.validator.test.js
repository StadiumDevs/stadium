import { describe, it, expect } from 'vitest';
import {
  validateSubmission,
  validateScore,
  validatePrize,
  prizeTiersFor,
  DEFAULT_PRIZE_TIERS,
  MAX_TOTAL_SCORE,
} from '../submission.validator.js';

const goodSubmission = {
  submitterName: '  Ada Lovelace ',
  lumaEmail: 'Ada@Example.com',
  projectTitle: 'Analytical Engine',
  projectBrief: '  A general-purpose mechanical computer. It runs programs from punched cards.  ',
  videoUrl: 'https://youtu.be/demo',
  githubUrl: 'https://github.com/ada/engine',
};

describe('validateSubmission', () => {
  it('accepts a well-formed submission and trims fields', () => {
    const r = validateSubmission(goodSubmission);
    expect(r.ok).toBe(true);
    expect(r.value.submitterName).toBe('Ada Lovelace');
    expect(r.value.projectTitle).toBe('Analytical Engine');
    expect(r.value.projectBrief).toBe('A general-purpose mechanical computer. It runs programs from punched cards.');
  });

  it('rejects a missing name', () => {
    expect(validateSubmission({ ...goodSubmission, submitterName: '   ' }).ok).toBe(false);
  });

  it('rejects a missing brief', () => {
    expect(validateSubmission({ ...goodSubmission, projectBrief: '   ' }).ok).toBe(false);
  });

  it('rejects an overly long brief', () => {
    expect(validateSubmission({ ...goodSubmission, projectBrief: 'x'.repeat(501) }).ok).toBe(false);
  });

  it('rejects a malformed email', () => {
    expect(validateSubmission({ ...goodSubmission, lumaEmail: 'not-an-email' }).ok).toBe(false);
  });

  it('rejects non-http video / github urls', () => {
    expect(validateSubmission({ ...goodSubmission, videoUrl: 'javascript:alert(1)' }).ok).toBe(false);
    expect(validateSubmission({ ...goodSubmission, githubUrl: 'ftp://x/y' }).ok).toBe(false);
    expect(validateSubmission({ ...goodSubmission, githubUrl: 'github.com/no-scheme' }).ok).toBe(false);
  });
});

describe('validatePrize', () => {
  const tiers = [
    { amount: 500, currency: 'EUR', label: 'Bitrefill giftcard' },
    { amount: 100, currency: 'EUR', label: 'Bitrefill giftcard' },
  ];

  it('accepts an amount that matches a tier and snapshots its currency + label', () => {
    const r = validatePrize({ amount: 500 }, tiers);
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({ amount: 500, currency: 'EUR', label: 'Bitrefill giftcard' });
  });

  it('clears the award when prize is explicitly null', () => {
    const r = validatePrize({ prize: null }, tiers);
    expect(r.ok).toBe(true);
    expect(r.value).toBe(null);
  });

  it('rejects an amount not present in the tiers', () => {
    expect(validatePrize({ amount: 250 }, tiers).ok).toBe(false);
  });

  it('rejects a non-positive or non-integer amount', () => {
    expect(validatePrize({ amount: 0 }, tiers).ok).toBe(false);
    expect(validatePrize({ amount: -100 }, tiers).ok).toBe(false);
    expect(validatePrize({ amount: 50.5 }, tiers).ok).toBe(false);
    expect(validatePrize({ amount: '500' }, tiers).ok).toBe(false);
  });

  it('prizeTiersFor falls back to the default tiers when unset', () => {
    expect(prizeTiersFor({ prizeTiers: null })).toBe(DEFAULT_PRIZE_TIERS);
    expect(prizeTiersFor({ prizeTiers: [] })).toBe(DEFAULT_PRIZE_TIERS);
    expect(prizeTiersFor({ prizeTiers: tiers })).toBe(tiers);
  });
});

describe('validateScore', () => {
  it('accepts in-range integer scores', () => {
    const r = validateScore({ requirements: 2, techStack: 5, innovation: 4, notes: 'solid' });
    expect(r.ok).toBe(true);
    expect(r.value.notes).toBe('solid');
  });

  it('max total is 12', () => {
    expect(MAX_TOTAL_SCORE).toBe(12);
  });

  it('rejects out-of-range values', () => {
    expect(validateScore({ requirements: 3, techStack: 5, innovation: 5 }).ok).toBe(false); // req max 2
    expect(validateScore({ requirements: 2, techStack: 6, innovation: 5 }).ok).toBe(false); // tech max 5
    expect(validateScore({ requirements: 2, techStack: 5, innovation: -1 }).ok).toBe(false);
  });

  it('rejects non-integer values', () => {
    expect(validateScore({ requirements: 1.5, techStack: 5, innovation: 5 }).ok).toBe(false);
    expect(validateScore({ requirements: '2', techStack: 5, innovation: 5 }).ok).toBe(false);
  });

  it('rejects overly long notes', () => {
    expect(validateScore({ requirements: 1, techStack: 1, innovation: 1, notes: 'x'.repeat(5001) }).ok).toBe(false);
  });
});
