// The privacy track tech review section: the converter, the counts the brief
// fixes, row matching, the version swap, and client/server parity.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { convertReviewMarkdown, reviewJson } from '../../../scripts/convert-privacy-review.js';
import { loadPrivacyReview, matchReviewRows, buildPrivacyReview, privacyReviewChecks, normalizeRepo } from '../privacy-review.service.js';
import { buildStats, computeChecks } from '../program-stats.service.js';
import { PROGRAM_STATS } from '../../constants/programStats.js';
import * as client from '../../../../client/src/lib/privacyReview.ts';
import { FSH_FINAL_TITLES } from './fixtures/fsh-final-titles.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const SLUG = 'free-society-hack-2026';
const DIR = path.resolve(here, '../../../fixtures', SLUG, 'privacy-track-review');
const TEST_ROOT = path.resolve(here, 'fixtures/privacy-review');
const md = fs.readFileSync(path.join(DIR, 'v1.0.md'), 'utf8');
const review = loadPrivacyReview(SLUG, PROGRAM_STATS[SLUG].privacyReview);

const sub = (id, projectTitle, track, githubUrl = null, prizes = {}) => ({ id, projectTitle, githubUrl, prizes, details: { track } });
const board = { rows: [], normalization: null };
const statsConfig = { ...PROGRAM_STATS[SLUG], scoreMax: 16 };

describe('privacy review: the fixture', () => {
  it('the committed JSON is exactly what the converter makes from the committed markdown', () => {
    expect(fs.readFileSync(path.join(DIR, 'v1.0.json'), 'utf8')).toBe(reviewJson(md));
  });

  it('the program config points at v1.0', () => {
    expect(review.version.version).toBe('1.0');
    expect(review.version.generatedDate).toBe('9 Nov 2026');
    expect(review.version.generatedBy.startsWith('Claude')).toBe(true);
  });

  it('counts recomputed from Dataset A equal the brief and the file', () => {
    const readable = review.projects.filter((p) => p.readable);
    const tool = (k) => readable.filter((p) => p.tools[k]).length;
    const nym = (s) => readable.filter((p) => p.nym === s).length;
    expect(review.projects.length).toBe(48);
    expect(readable.length).toBe(45);
    expect(tool('noirWallet')).toBe(11);
    expect(nym('Built in')).toBe(7);
    expect(nym('Through zingo-cli')).toBe(3);
    expect(nym('Built in') + nym('Through zingo-cli')).toBe(10);
    expect(readable.filter((p) => p.webzjs === 'Used (patched build)').map((p) => p.shortName)).toEqual(['Z-Pay']);
    expect(review.upstream.filter((u) => u.duringHack).length).toBe(7);
    expect(new Set(review.upstream.filter((u) => u.duringHack).map((u) => u.project)).size).toBe(4);
    expect(readable.filter((p) => p.zips.includes(321)).length).toBe(26);
    expect(review.projects.filter((p) => p.afterDeadline).length).toBe(14);
    const memos = review.shieldedFeatures.find((f) => f.feature === 'Encrypted memos');
    expect([memos.count, memos.of]).toEqual([44, 45]);
    expect(review.headline).toMatchObject({ submissions: 48, readable: 45, noirWallet: 11, nymRouted: 10, nymBuiltIn: 7, nymThroughZingo: 3, webzjs: 1, upstreamDuringHack: 7, upstreamTeams: 4 });
  });

  it('keeps the three unreadable rows with their reasons', () => {
    expect(review.notReadable.map((r) => r.shortName)).toEqual(['Obscura', 'Cloister', 'ZapOut']);
    for (const r of review.notReadable) expect(r.reason).toBeTruthy();
  });

  it('keeps the Secret Bankroll caveat and leaves "zcash-now" in friction unresolved', () => {
    expect(review.upstreamCaveats['Secret Bankroll']).toMatch(/teammate/);
    const names = review.friction.flatMap((f) => f.projects);
    expect(names.filter((p) => p.shortName === null).map((p) => p.name)).toEqual(expect.arrayContaining(['zcash-now']));
    expect(names.filter((p) => p.shortName === null).every((p) => p.name === 'zcash-now')).toBe(true);
  });

  it('refuses to convert a file whose datasets disagree with its stated counts', () => {
    // Drop Noir Wallet from Munim: the dataset now says 10, section 3 still says 11.
    const doctored = md.replace('| Munim | Munim | Both | https://github.com/0xStoneyStark/munim | 99fe253 | 04 Nov 23:51 |  | TypeScript | Y |', '| Munim | Munim | Both | https://github.com/0xStoneyStark/munim | 99fe253 | 04 Nov 23:51 |  | TypeScript |  |');
    expect(doctored).not.toBe(md);
    expect(() => convertReviewMarkdown(doctored)).toThrow(/Use Noir Wallet in code: computed 10, file states 11/);
  });

  it('never publishes the test entry name', () => {
    expect(JSON.stringify(review)).not.toContain('Example Project');
  });
});

describe('privacy review: matching rows to submissions', () => {
  it('normalizes repo URLs (case, trailing / and .git)', () => {
    expect(normalizeRepo('https://GitHub.com/Foo/Bar.git/')).toBe('https://github.com/foo/bar');
    expect(normalizeRepo('https://github.com/foo/bar/')).toBe('https://github.com/foo/bar');
    expect(normalizeRepo('  ')).toBeNull();
  });

  it('matches by repo first, then by exact title; ignores Agentic Commerce-only', () => {
    const subs = [
      sub('a', 'Chupke renamed', 'both', 'https://GITHUB.com/bilgin-kocak/chupke.git/'), // repo match despite the new title
      sub('b', 'Obscura', 'both'), // no repo in the review: title match
      sub('c', 'Keyo', 'agentic', 'https://github.com/The-x-35/keyo'), // agentic only: ignored
    ];
    const rows = Object.fromEntries(matchReviewRows(review, subs).map((r) => [r.shortName, r]));
    expect(rows.Chupke).toMatchObject({ status: 'matched', by: 'repo', submissionId: 'a' });
    expect(rows.Obscura).toMatchObject({ status: 'matched', by: 'title', submissionId: 'b' });
    expect(rows.Keyo.status).toBe('unmatched');
  });

  it('matches the two zcash-now entries by their own repos', () => {
    const subs = [
      sub('d', 'zcash-now', 'privacy', 'https://github.com/dexalien/zcash-now'),
      sub('s', 'zcash-now', 'privacy', 'https://github.com/sachindkagrawal15/zcash-now/'),
    ];
    const rows = Object.fromEntries(matchReviewRows(review, subs).map((r) => [r.shortName, r]));
    expect(rows['zcash-now (dexalien)']).toMatchObject({ status: 'matched', submissionId: 'd' });
    expect(rows['zcash-now (Sachin)']).toMatchObject({ status: 'matched', submissionId: 's' });
  });

  it('flags rows that match more than one submission, and submissions claimed by two rows', () => {
    const subs = [sub('x', 'Hisaab', 'privacy'), sub('y', 'Hisaab', 'privacy'), sub('m', 'Mirage', 'privacy', 'https://github.com/vipenl26/zpulse')];
    const checks = privacyReviewChecks(review, subs);
    expect(checks.ambiguous.map((r) => r.shortName)).toEqual(expect.arrayContaining(['Hisaab', 'Mirage', 'zpulse']));
    expect(checks.matched).toBe(0);
    expect(checks.unmatched.length + checks.ambiguous.length).toBe(48);
  });

  it('links a name only when it matched one submission with a project page', () => {
    const subs = [sub('w', 'Vouch', 'both', 'https://github.com/SATISH-JALAN/vouch-zcash', { privacy: { label: 'P', amount: 1, currency: 'USD' } }), sub('n', 'Zool', 'privacy')];
    const { refs } = buildPrivacyReview(review, subs);
    expect(refs.Vouch).toEqual({ id: 'w', title: 'Vouch', track: 'both', linkable: true });
    expect(refs.Zool).toMatchObject({ id: 'n', linkable: false });
    expect(refs.Obscura).toEqual({ id: 'review:Obscura', title: 'Obscura', track: 'both', linkable: false });
    expect(Object.keys(refs)).toHaveLength(48);
  });

  it('every row matches exactly one real submission by title (fsh-final-titles)', () => {
    const subs = FSH_FINAL_TITLES.filter(([t]) => t !== 'Example Project').map(([title, track], i) => sub(`r${i}`, title, track));
    const checks = privacyReviewChecks(review, subs);
    expect(checks.unmatched).toEqual([]);
    expect(checks.ambiguous).toEqual([]);
    expect(checks.matched).toBe(48);
  });
});

describe('privacy review: in the stats and checks', () => {
  const subs = [sub('a', 'Chupke', 'both', 'https://github.com/bilgin-kocak/chupke')];
  const program = { slug: SLUG };
  const now = new Date('2026-11-09T10:00:00Z');

  it('is in the stats when the config has a version, and absent otherwise', () => {
    const withReview = buildStats({ program, submissions: subs, board, ratings: [], config: statsConfig, review, now });
    expect(withReview.privacyReview.version.version).toBe('1.0');
    expect(withReview.privacyReview.refs.Chupke.id).toBe('a');
    const without = buildStats({ program, submissions: subs, board, ratings: [], config: statsConfig, now });
    expect(without).not.toHaveProperty('privacyReview');
  });

  it('match problems go to the admin checks only', () => {
    const stats = buildStats({ program, submissions: subs, board, ratings: [], config: statsConfig, review, now });
    const checks = computeChecks({ counted: subs, stats, config: statsConfig, review });
    expect(checks.privacyReview).toMatchObject({ version: '1.0', total: 48, matched: 1, byRepo: 1 });
    expect(checks.privacyReview.unmatched).toHaveLength(47);
    expect(JSON.stringify(stats)).not.toContain('"unmatched"');
  });

  it('swapping in v1.1 changes the section and its footer data through config only', () => {
    const v11 = loadPrivacyReview(SLUG, { version: '1.1' }, TEST_ROOT);
    const stats = buildStats({ program, submissions: subs, board, ratings: [], config: { ...statsConfig, privacyReview: { version: '1.1' } }, review: v11, now });
    expect(stats.privacyReview.version).toMatchObject({ version: '1.1', generatedDate: '12 Nov 2026', reposReadDate: '9 Nov 2026' });
    expect(stats.privacyReview.version.changelog[0].version).toBe('1.1');
    const v11md = fs.readFileSync(path.join(TEST_ROOT, SLUG, 'privacy-track-review', 'v1.1.md'), 'utf8');
    expect(fs.readFileSync(path.join(TEST_ROOT, SLUG, 'privacy-track-review', 'v1.1.json'), 'utf8')).toBe(reviewJson(v11md));
  });
});

describe('privacy review: server and client agree', () => {
  const rng = (seed) => {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  };

  it('identical matches, refs and checks on 50 random submission sets', () => {
    const r = rng(11);
    for (let t = 0; t < 50; t += 1) {
      const subs = [];
      review.projects.forEach((p, i) => {
        const roll = r();
        const track = r() < 0.1 ? 'agentic' : p.track;
        const prizes = r() < 0.2 ? { privacy: { label: 'P', amount: 1, currency: 'USD' } } : {};
        if (roll < 0.35 && p.repo) subs.push(sub(`s${i}`, `Renamed ${i}`, track, r() < 0.5 ? `${p.repo.toUpperCase()}.git/` : p.repo, prizes));
        else if (roll < 0.7) subs.push(sub(`s${i}`, p.title, track, null, prizes));
        else if (roll < 0.8) subs.push(sub(`s${i}a`, p.title, track), sub(`s${i}b`, p.title, track));
      });
      expect(client.matchReviewRows(review, subs)).toEqual(matchReviewRows(review, subs));
      expect(client.buildPrivacyReview(review, subs)).toEqual(buildPrivacyReview(review, subs));
      expect(client.privacyReviewChecks(review, subs)).toEqual(privacyReviewChecks(review, subs));
      expect(client.normalizeRepo(subs[0]?.githubUrl)).toBe(normalizeRepo(subs[0]?.githubUrl));
    }
  });
});
