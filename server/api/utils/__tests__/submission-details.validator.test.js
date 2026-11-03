import { describe, it, expect } from 'vitest';
import { validateSubmissionDetails, validateSubmission, videoOptionalFor, PITCH_MAX } from '../submission.validator.js';
import { trackedProgramFor } from '../../constants/trackedPrograms.js';

const cfg = trackedProgramFor('free-society-hack-2026');
const TXID = 'a'.repeat(64);
const good = (over = {}) => ({
  privacyNote: 'Amounts and memos are shielded; our server stores order ids next to emails.', bitrefillFeedback: { worked: 'The MCP was quick to set up.', didnt: 'Test products were hard to find.' }, track: 'privacy',
  themes: ['1. Private payment rails'],
  pitch: 'Shielded ZEC checkout for cafés.',
  team: [{ name: 'Arjun', email: 'Arjun@Example.com', role: 'frontend' }],
  appType: 'web app',
  publicUrl: 'https://chai.example.com',
  demoVideoLength: '1:54',
  technologies: ['WebZjs', 'React'],
  testnetTxid: TXID,
  nextStep: 'Pilot with two cafés by 4 Dec.',
  contact: { app: 'telegram', handle: 'arjun_builds' },
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
    const v = validateSubmissionDetails(cfg, good({ txCheck: { status: 'verified' }, milestone: { x: 1 }, checkIns: [1], evil: true })); // checkIns: an old/unknown key
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
    // Solo or a team of up to 4: the point person plus 3 teammates.
    expect(err(good({ team: Array.from({ length: 4 }, () => ({ name: 'A' })) }))).toMatch(/team of up to 4/);
    expect(validateSubmissionDetails(cfg, good({ team: Array.from({ length: 3 }, () => ({ name: 'A' })) })).ok).toBe(true);
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

  it('checks feedback and anonymity; old area tags are ignored', () => {
    const v = validateSubmissionDetails(cfg, good({ frictionAreas: ['Weather'] }));
    expect(v.ok).toBe(true);
    expect(v.value).not.toHaveProperty('frictionAreas');
    expect(err(good({ frictionNotes: 'x'.repeat(2001) }))).toMatch(/2000/);
    expect(err(good({ anonymous: 'yes' }))).toMatch(/anonymous/);
    expect(validateSubmissionDetails(cfg, good({ anonymous: true })).value.anonymous).toBe(true);
  });

  it('requires a privacy and trust note for Privacy and Both, and drops it for Agentic', () => {
    expect(err(good({ privacyNote: '' }))).toMatch(/privacy and trust note/);
    expect(err(good({ track: 'both', privacyNote: '  ' }))).toMatch(/privacy and trust note/);
    expect(err(good({ privacyNote: 'x'.repeat(3001) }))).toMatch(/3000/);
    expect(validateSubmissionDetails(cfg, good()).value.privacyNote).toMatch(/^Amounts and memos/);
    const agentic = validateSubmissionDetails(cfg, good({ track: 'agentic', themes: [], testnetTxid: null }));
    expect(agentic.ok).toBe(true);
    expect(agentic.value.privacyNote).toBeNull();
  });

  it('requires the Bitrefill feedback (worked and didnt) for Agentic and Both, and drops it for Privacy', () => {
    const ag = (fb) => err(good({ track: 'agentic', themes: [], testnetTxid: null, bitrefillFeedback: fb }));
    expect(ag(undefined)).toMatch(/Bitrefill feedback/);
    expect(ag({ worked: 'MCP', didnt: '' })).toMatch(/Bitrefill feedback/);
    expect(ag({ worked: 'x'.repeat(2001), didnt: 'y' })).toMatch(/2000/);
    expect(err(good({ track: 'both', bitrefillFeedback: null }))).toMatch(/Bitrefill feedback/);
    const both = validateSubmissionDetails(cfg, good({ track: 'both', bitrefillFeedback: { worked: ' MCP ', didnt: 'Docs', extra: 1 } }));
    expect(both.value.bitrefillFeedback).toEqual({ worked: 'MCP', didnt: 'Docs' });
    expect(validateSubmissionDetails(cfg, good()).value.bitrefillFeedback).toBeNull();
  });

  it('the demo video is optional for Privacy only (stored empty), still checked when given', () => {
    const base = { submitterName: 'A', lumaEmail: 'a@x.com', projectTitle: 'T', projectBrief: 'b', githubUrl: 'https://github.com/x/y', ratings: { overall: 4, organisation: 5, support: 4, tools: 3 } };
    expect(videoOptionalFor(cfg, { track: 'privacy' })).toBe(true);
    expect(videoOptionalFor(cfg, { track: 'both' })).toBe(false);
    expect(videoOptionalFor(cfg, { track: 'agentic' })).toBe(false);
    expect(videoOptionalFor(null, { track: 'privacy' })).toBe(false);
    const ok = validateSubmission(base, { videoOptional: true });
    expect(ok.ok).toBe(true);
    expect(ok.value.videoUrl).toBe('');
    expect(validateSubmission(base).ok).toBe(false);
    expect(validateSubmission({ ...base, videoUrl: 'javascript:alert(1)' }, { videoOptional: true }).ok).toBe(false);
  });

  it('refuses a program that is not tracked', () => {
    expect(validateSubmissionDetails(null, good()).ok).toBe(false);
  });
});

describe('validateMilestonePatch', async () => {
  const { validateMilestonePatch } = await import('../submission.validator.js');
  it('builders may change only the sentence and the delivery link', () => {
    expect(validateMilestonePatch({ sentence: ' Ship v1. ', deliveryLink: 'https://x.dev' }, 'builder')).toEqual({ ok: true, value: { sentence: 'Ship v1.', deliveryLink: 'https://x.dev' } });
    expect(validateMilestonePatch({ partnerName: 'ZecHub' }, 'builder').error).toMatch(/only change/);
    expect(validateMilestonePatch({ deliveryLink: 'ftp://x' }, 'builder').error).toMatch(/http/);
    expect(validateMilestonePatch({ sentence: '' }, 'builder').error).toMatch(/required/);
  });
  it('admins may change everything, with types checked', () => {
    expect(validateMilestonePatch({ partnerName: 'ZecHub', agreedAt: '2026-11-12', partnerConfirmed: true, payoutStatus: 'released' }, 'admin').ok).toBe(true);
    expect(validateMilestonePatch({ payoutStatus: 'paid' }, 'admin').error).toMatch(/payoutStatus/);
    expect(validateMilestonePatch({ agreedAt: 'soon' }, 'admin').error).toMatch(/date/);
    expect(validateMilestonePatch({ evil: 1 }, 'admin').error).toMatch(/Unknown/);
  });
});

describe('validateSubmissionDetails / validateSubmission: drafts', () => {


  it('a draft may leave required fields empty', () => {
    const d = validateSubmissionDetails(cfg, { track: 'both' }, { draft: true });
    expect(d.ok).toBe(true);
    expect(d.value).toMatchObject({ track: 'both', pitch: '', testnetTxid: null, privacyNote: null, bitrefillFeedback: null });
    expect(validateSubmissionDetails(cfg, undefined, { draft: true }).ok).toBe(true);
    expect(validateSubmissionDetails(cfg, {}, { draft: true }).value.track).toBeNull();
    const s = validateSubmission({ submitterName: 'P', lumaEmail: 'p@x.com', projectTitle: 'T' }, { draft: true });
    expect(s.ok).toBe(true);
  });

  it('a draft still checks what is present', () => {
    expect(validateSubmissionDetails(cfg, { track: 'privacy', testnetTxid: 'nope' }, { draft: true }).ok).toBe(false);
    expect(validateSubmissionDetails(cfg, { track: 'mystery' }, { draft: true }).ok).toBe(false);
    expect(validateSubmissionDetails(cfg, { themes: ['Not a theme'] }, { draft: true }).ok).toBe(false);
    expect(validateSubmission({ submitterName: 'P', lumaEmail: 'p@x.com', projectTitle: 'T', githubUrl: 'ftp://x' }, { draft: true }).ok).toBe(false);
    expect(validateSubmission({ submitterName: 'P', lumaEmail: 'p@x.com' }, { draft: true }).ok).toBe(false);
  });

  it('without draft, the same partial entry is refused', () => {
    expect(validateSubmissionDetails(cfg, { track: 'both' }).ok).toBe(false);
    expect(validateSubmission({ submitterName: 'P', lumaEmail: 'p@x.com', projectTitle: 'T' }).ok).toBe(false);
  });
});

describe('validateSubmission / validateSubmissionDetails: links typed without https://', () => {
  const base = { submitterName: 'P', lumaEmail: 'p@x.com', projectTitle: 'T' };

  // Regression: phones send "github.com/x"; the draft save behind SUBMIT FEEDBACK was refused.
  it('a draft with a scheme-less GitHub link is saved with https://', () => {
    const v = validateSubmission({ ...base, githubUrl: 'github.com/team/app' }, { draft: true });
    expect(v.ok).toBe(true);
    expect(v.value.githubUrl).toBe('https://github.com/team/app');
  });

  it('a full submission normalises the GitHub and video links too', () => {
    const v = validateSubmission(
      { ...base, projectBrief: 'B', githubUrl: ' github.com/team/app ', videoUrl: 'youtu.be/abc' },
      { ratingsOptional: true },
    );
    expect(v.ok).toBe(true);
    expect(v.value).toMatchObject({ githubUrl: 'https://github.com/team/app', videoUrl: 'https://youtu.be/abc' });
  });

  it('keeps http:// links and still refuses other schemes and junk', () => {
    expect(validateSubmission({ ...base, githubUrl: 'http://github.com/x' }, { draft: true }).value.githubUrl).toBe('http://github.com/x');
    expect(validateSubmission({ ...base, githubUrl: 'ftp://github.com/x' }, { draft: true }).ok).toBe(false);
    expect(validateSubmission({ ...base, githubUrl: 'not a link' }, { draft: true }).ok).toBe(false);
  });

  it('normalises the public URL and next-milestone links', () => {
    const v = validateSubmissionDetails(cfg, good({ publicUrl: 'chai.example.com', nextStepLinks: ['github.com/zcash/x/issues/1'] }));
    expect(v.ok).toBe(true);
    expect(v.value.publicUrl).toBe('https://chai.example.com');
    expect(v.value.nextStepLinks).toEqual(['https://github.com/zcash/x/issues/1']);
  });
});

describe('validateSubmissionDetails: viewing key and wallet birth height', () => {
  const UFVK = 'uviewtest1' + 'q'.repeat(200);

  it('both are optional', () => {
    const v = validateSubmissionDetails(cfg, good());
    expect(v.ok).toBe(true);
    expect(v.value).toMatchObject({ viewingKey: null, birthHeight: null });
    expect(validateSubmissionDetails(cfg, good({ viewingKey: '  ', birthHeight: '' })).value).toMatchObject({ viewingKey: null, birthHeight: null });
  });

  it('accepts a uviewtest key and a whole-number height (string or number)', () => {
    const v = validateSubmissionDetails(cfg, good({ viewingKey: ` ${UFVK} `, birthHeight: '3100000' }));
    expect(v.ok).toBe(true);
    expect(v.value).toMatchObject({ viewingKey: UFVK, birthHeight: 3100000 });
    expect(validateSubmissionDetails(cfg, good({ birthHeight: 42 })).value.birthHeight).toBe(42);
    expect(validateSubmissionDetails(cfg, good({ birthHeight: 0 })).value.birthHeight).toBe(0);
  });

  it('refuses a key that is not a testnet UFVK', () => {
    const msg = /must start with uviewtest/;
    expect(err(good({ viewingKey: 'uview1' + 'q'.repeat(50) }))).toMatch(msg); // mainnet
    expect(err(good({ viewingKey: 'utest1abc' }))).toMatch(msg); // an address, not a key
    expect(err(good({ viewingKey: 'uviewtest1 abc' }))).toMatch(msg);
    expect(err(good({ viewingKey: 'uviewtest1' + 'q'.repeat(1000) }))).toMatch(msg);
  });

  it('refuses a height that is not a whole number', () => {
    for (const h of ['-1', '1.5', 'abc', '3e6', -1, 1.5, true]) {
      expect(err(good({ birthHeight: h }))).toBe('The wallet birth height must be a whole number');
    }
  });

  it('kept for Both and for a draft with no track, dropped for Agentic', () => {
    expect(validateSubmissionDetails(cfg, good({ track: 'both', viewingKey: UFVK, birthHeight: 5 })).value).toMatchObject({ viewingKey: UFVK, birthHeight: 5 });
    expect(validateSubmissionDetails(cfg, { viewingKey: UFVK, birthHeight: '7' }, { draft: true }).value).toMatchObject({ viewingKey: UFVK, birthHeight: 7 });
    const a = validateSubmissionDetails(cfg, good({ track: 'agentic', themes: [], viewingKey: UFVK, birthHeight: 5 }));
    expect(a.ok).toBe(true);
    expect(a.value).toMatchObject({ viewingKey: null, birthHeight: null });
  });

  it('a draft still checks a key that is present', () => {
    expect(validateSubmissionDetails(cfg, { track: 'privacy', viewingKey: 'nope' }, { draft: true }).ok).toBe(false);
  });
});

describe('withScheme', async () => {
  const { withScheme } = await import('../submission.validator.js');
  it('adds https:// only to something that looks like a domain', () => {
    expect(withScheme('github.com/a/b')).toBe('https://github.com/a/b');
    expect(withScheme('www.youtube.com')).toBe('https://www.youtube.com');
    expect(withScheme('//github.com/a')).toBe('https://github.com/a');
    expect(withScheme('not-a-url')).toBe('not-a-url');
    expect(withScheme('hello world.com')).toBe('hello world.com');
    expect(withScheme('https://x.io')).toBe('https://x.io');
    expect(withScheme('javascript:alert(1)')).toBe('javascript:alert(1)');
    expect(withScheme('')).toBe('');
  });
});

describe('validateSubmissionDetails: Telegram / WhatsApp contact', () => {
  it('is required on a final submission', () => {
    expect(err(good({ contact: undefined }))).toMatch(/Telegram or WhatsApp contact is required/);
    expect(err(good({ contact: { app: 'telegram', handle: '' } }))).toMatch(/Telegram or WhatsApp contact is required/);
  });

  it('is optional on a draft, but checked when filled in', () => {
    const r = validateSubmissionDetails(cfg, good({ contact: undefined }), { draft: true });
    expect(r.ok).toBe(true);
    expect(r.value.contact).toBeNull();
    expect(validateSubmissionDetails(cfg, { contact: { app: 'telegram', handle: 'ab' } }, { draft: true }).ok).toBe(false);
  });

  it('rejects an unknown app', () => {
    expect(err(good({ contact: { app: 'signal', handle: '+41791234567' } }))).toMatch(/Choose Telegram or WhatsApp/);
  });

  it('checks a Telegram username and stores it without the @', () => {
    expect(err(good({ contact: { app: 'telegram', handle: 'ab' } }))).toMatch(/Telegram username/);
    expect(err(good({ contact: { app: 'telegram', handle: 'bad name!' } }))).toMatch(/Telegram username/);
    const r = validateSubmissionDetails(cfg, good({ contact: { app: 'telegram', handle: ' @Arjun_Builds ' } }));
    expect(r.value.contact).toEqual({ app: 'telegram', handle: 'Arjun_Builds' });
  });

  it('checks a WhatsApp number', () => {
    expect(err(good({ contact: { app: 'whatsapp', handle: 'call me' } }))).toMatch(/WhatsApp number/);
    expect(err(good({ contact: { app: 'whatsapp', handle: '123' } }))).toMatch(/WhatsApp number/);
    const r = validateSubmissionDetails(cfg, good({ contact: { app: 'whatsapp', handle: '+41 79 123 45 67' } }));
    expect(r.value.contact).toEqual({ app: 'whatsapp', handle: '+41 79 123 45 67' });
  });
});
