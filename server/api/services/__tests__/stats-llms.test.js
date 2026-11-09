// The stats page llms.txt: versioned, timestamped, complete, no emails or
// normalization details, and identical on server and client.
import { describe, it, expect } from 'vitest';
import { renderStatsLlms, STATS_LLMS_FORMAT } from '../stats-llms.service.js';
import { buildStats } from '../program-stats.service.js';
import { loadPrivacyReview } from '../privacy-review.service.js';
import { computeLeaderboard } from '../rubric-leaderboard.service.js';
import { PROGRAM_STATS } from '../../constants/programStats.js';
import * as client from '../../../../client/src/lib/statsLlms.ts';

const SLUG = 'free-society-hack-2026';
const config = { ...PROGRAM_STATS[SLUG], scoreMax: 16 };
const review = loadPrivacyReview(SLUG, config.privacyReview);
const crit = (v) => ({ works: v, private: v, easy: v, needed: v, continuing: v, bonus: 0 });
const sub = (id, title, track, over = {}) => ({
  id,
  projectTitle: title,
  submitterName: `Lead ${id}`,
  lumaEmail: `${id}@example.com`,
  videoUrl: 'https://v/x',
  githubUrl: null,
  projectBrief: 'b',
  prizes: {},
  ecosystemPrize: false,
  details: { track, pitch: 'p', team: [{ name: 'Mate', email: `mate-${id}@example.com` }], nextStep: 'next' },
  ...over,
});
const submissions = [
  sub('a', 'Z-Pay — shielded checkout, without a merchant app', 'privacy', { githubUrl: 'https://github.com/Jmohak2004/zcash', prizes: { privacy: { label: 'Privacy: top prize', amount: 1000, currency: 'USD' } } }),
  sub('b', 'Pegasus', 'both', { githubUrl: 'https://github.com/Dijo-404/pegasus' }),
  sub('c', 'Errand', 'agentic', { prizes: { agentic: { label: 'Agentic Commerce: second', amount: 500, currency: 'USD' } } }),
];
const judges = ['j1@example.com', 'j2@example.com', 'j3@example.com'].map((email) => ({ email, tracks: ['privacy'] }));
const scores = [
  { submissionId: 'a', judgeEmail: 'j1@example.com', track: 'privacy', criteria: crit(3) },
  { submissionId: 'a', judgeEmail: 'j2@example.com', track: 'privacy', criteria: crit(2) },
  { submissionId: 'b', judgeEmail: 'j3@example.com', track: 'privacy', criteria: crit(1) },
];
const now = new Date('2026-11-09T10:00:00Z');
const board = computeLeaderboard({ track: 'privacy', submissions, scores, judges, now });
const ratings = ['overall', 'organisation', 'support', 'tools'].flatMap((q) => submissions.map((s, i) => ({ submissionId: s.id, category: q, score: 1 + i })));
const stats = buildStats({ program: { slug: SLUG }, submissions, board, ratings, config, review, now });
const args = { program: { name: 'Free Society Hack', slug: SLUG }, stats, publishedAt: '2026-11-09T10:05:00.000Z', url: `https://stadium.joinwebzero.com/programs/${SLUG}/stats` };
const text = renderStatsLlms(args);

describe('stats llms.txt', () => {
  it('is versioned and timestamped', () => {
    expect(text).toContain(`Format: ${STATS_LLMS_FORMAT}`);
    expect(text).toContain('Snapshot published: 2026-11-09T10:05:00.000Z');
    expect(text).toContain('Snapshot generated: 2026-11-09T10:00:00.000Z');
    expect(text).toContain('Privacy track tech review: v1.0 (generated 9 Nov 2026)');
    expect(text).toContain(args.url);
  });

  it('covers every section of the page', () => {
    for (const h of [
      '## Prize winners', '## Headline numbers', '## Submissions per track', '## Top projects per score criterion', '### Works (out of 3)',
      '## Submissions per category, split by track', '## Top scored projects per category', '## Privacy track tech review',
      '### How projects reach Zcash', '### Nym in practice', '### ChainSafe WebZjs', '### Agent and crypto building blocks',
      '### Shielded features used in code', '### Which ZIPs the projects cite', '### Projects building on new or draft ZIPs', '### Findings',
      '### What slowed teams down', '### PRs and issues in other repos', '### Every submission', '### How this was checked',
      '## Event feedback (anonymized)',
    ]) expect(text).toContain(h);
    expect(text).toContain('1. Z-Pay — shielded checkout, without a merchant app · Privacy: top prize (1000 USD) · score 12.5 / 16');
    expect(text).toContain('- Noir Wallet: 11 · ');
    // Admin-only ranking and the Nym "Not used" bar are not on the page, so not here either.
    expect(text).not.toContain('likelihood to continue');
    expect(text).not.toMatch(/multiple teams|more than one team/i);
    expect(text).not.toContain('- Not used:');
    expect(text).toContain('- Built in: 7 · ');
    expect(text).toContain('- ZIP 321 · Payment request URIs · Payments UX · Payment links and QR codes: 26 · ');
    expect(text).toContain('https://zips.z.cash/zip-0068');
    expect(text).toContain('Track review v1.0, generated 9 Nov 2026 by Claude from repo snapshots.');
    expect(text.match(/^\| (?!Project|---)/gm)).toHaveLength(48);
  });

  it('has no emails and nothing about normalization', () => {
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(text.toLowerCase()).not.toContain('normaliz');
  });

  it('server and client render identical text', () => {
    expect(client.renderStatsLlms(args)).toBe(text);
    expect(client.STATS_LLMS_FORMAT).toBe(STATS_LLMS_FORMAT);
    const noReview = { ...args, stats: buildStats({ program: { slug: SLUG }, submissions: [], board: { rows: [], normalization: null }, ratings: [], config, now }) };
    expect(client.renderStatsLlms(noReview)).toBe(renderStatsLlms(noReview));
  });
});
