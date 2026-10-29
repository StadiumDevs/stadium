import { describe, it, expect } from 'vitest';
import { validateSubmissionDetails, PITCH_MAX } from '../submission.validator.js';
import { trackedProgramFor } from '../../constants/trackedPrograms.js';

const cfg = trackedProgramFor('free-society-hack-2026');
const TXID = 'a'.repeat(64);
const good = (over = {}) => ({
  track: 'privacy',
  themes: ['1. Private payment rails'],
  pitch: 'Shielded ZEC checkout for cafés.',
  team: [{ name: 'Arjun', email: 'Arjun@Example.com', role: 'frontend' }],
  appType: 'web app',
  publicUrl: 'https://chai.example.com',
  demoVideoLength: '1:54',
  technologies: ['WebZjs', 'React'],
  testnetTxid: TXID,
  nextStep: 'Pilot with two cafés by 4 Dec.',
  nextStepLinks: ['https://github.com/zcash/zcash-sdk/issues/1'],
  frictionNotes: 'Faucet was down.',
  frictionAreas: ['Faucet'],
  anonymous: false,
  ...over,
});
const err = (d) => validateSubmissionDetails(cfg, d).error;

describe('validateSubmissionDetails', () => {
  it('accepts a full Privacy entry and normalises it', () => {
    const v = validateSubmissionDetails(cfg, good());
    expect(v.ok).toBe(true);
    expect(v.value).toMatchObject({
      track: 'privacy',
      team: [{ name: 'Arjun', email: 'arjun@example.com', role: 'frontend' }],
      testnetTxid: TXID,
      network: 'testnet (NU7)',
      anonymous: false,
    });
  });

  it('drops unknown keys and never takes server-set fields from the client', () => {
    const v = validateSubmissionDetails(cfg, good({ txCheck: { status: 'verified' }, milestone: { x: 1 }, checkIns: [1], evil: true }));
    expect(v.ok).toBe(true);
    expect(v.value).not.toHaveProperty('txCheck');
    expect(v.value).not.toHaveProperty('milestone');
    expect(v.value).not.toHaveProperty('checkIns');
    expect(v.value).not.toHaveProperty('evil');
  });

  it('requires details and a known track', () => {
    expect(err(undefined)).toMatch(/details are required/);
    expect(err(good({ track: 'defi' }))).toBe('Choose a track');
  });

  it('checks themes (known, required for Privacy, cleared for Agentic)', () => {
    expect(err(good({ themes: [] }))).toBe('Pick at least one theme');
    expect(err(good({ themes: ['9. Made up'] }))).toBe('Unknown theme');
    const agentic = validateSubmissionDetails(cfg, good({ track: 'agentic', themes: ['1. Private payment rails'], testnetTxid: null }));
    expect(agentic.ok).toBe(true);
    expect(agentic.value.themes).toEqual([]);
    expect(agentic.value.testnetTxid).toBeNull();
  });

  it('checks the pitch', () => {
    expect(err(good({ pitch: ' ' }))).toMatch(/pitch is required/);
    expect(err(good({ pitch: 'x'.repeat(PITCH_MAX + 1) }))).toMatch(/140 characters/);
  });

  it('checks the team', () => {
    expect(err(good({ team: Array.from({ length: 6 }, () => ({ name: 'A' })) }))).toMatch(/At most 5/);
    expect(err(good({ team: [{ name: '' }] }))).toMatch(/needs a name/);
    expect(err(good({ team: [{ name: 'A', email: 'nope' }] }))).toMatch(/invalid email/);
  });

  it('checks app type and public URL (apps need one)', () => {
    expect(err(good({ appType: 'spaceship' }))).toMatch(/what kind of project/);
    expect(err(good({ publicUrl: null }))).toMatch(/Apps need a public URL/);
    expect(err(good({ publicUrl: 'ftp://x' }))).toMatch(/must start with http/);
    expect(validateSubmissionDetails(cfg, good({ appType: 'CLI', publicUrl: null })).ok).toBe(true);
  });

  it('requires a 64-hex testnet txid for Privacy and Both', () => {
    expect(err(good({ testnetTxid: '' }))).toMatch(/need one testnet transaction id/);
    expect(err(good({ testnetTxid: 'MOCK-123' }))).toBe('A testnet transaction id is 64 hex characters');
    expect(err(good({ testnetTxid: 'g'.repeat(64) }))).toBe('A testnet transaction id is 64 hex characters');
    expect(err(good({ track: 'both', testnetTxid: '' }))).toMatch(/transaction id/);
    expect(validateSubmissionDetails(cfg, good({ testnetTxid: 'ABCDEF' + '0'.repeat(58) })).ok).toBe(true);
  });

  it('checks technologies, next milestone and links', () => {
    expect(err(good({ technologies: [] }))).toMatch(/every technology/);
    expect(err(good({ nextStep: '' }))).toMatch(/next milestone/);
    expect(err(good({ nextStepLinks: ['not a link'] }))).toMatch(/must start with http/);
  });

  it('checks friction and anonymity', () => {
    expect(err(good({ frictionAreas: ['Weather'] }))).toBe('Unknown friction area');
    expect(err(good({ frictionNotes: 'x'.repeat(2001) }))).toMatch(/2000/);
    expect(err(good({ anonymous: 'yes' }))).toMatch(/anonymous/);
    expect(validateSubmissionDetails(cfg, good({ anonymous: true })).value.anonymous).toBe(true);
  });

  it('refuses a program that is not tracked', () => {
    expect(validateSubmissionDetails(null, good()).ok).toBe(false);
  });
});
