// The client playground builds the stats page itself (client/src/lib/
// programStats.ts and programStatsConfig.ts). These checks keep that copy
// identical to the server's.
import { describe, it, expect } from 'vitest';
import * as server from '../program-stats.service.js';
import { PROGRAM_STATS } from '../../constants/programStats.js';
import { computeLeaderboard } from '../rubric-leaderboard.service.js';
import * as client from '../../../../client/src/lib/programStats.ts';
import { PROGRAM_STATS as CLIENT_PROGRAM_STATS } from '../../../../client/src/lib/programStatsConfig.ts';
import { FSH_FINAL_TITLES } from './fixtures/fsh-final-titles.js';
import { loadPrivacyReview } from '../privacy-review.service.js';

const SLUG = 'free-society-hack-2026';
const config = { ...PROGRAM_STATS[SLUG], scoreMax: 16 };
const review = loadPrivacyReview(SLUG, PROGRAM_STATS[SLUG].privacyReview);
const rng = (seed) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

const randomProgram = (r) => {
  const titles = FSH_FINAL_TITLES.filter(() => r() < 0.6);
  const people = Array.from({ length: 12 }, (_, i) => ({ name: `Person ${i}`, email: `p${i}@x.io` }));
  const submissions = titles.map(([title, track], i) => ({
    id: `s${i}`,
    projectTitle: r() < 0.1 ? `Unknown ${i}` : title,
    submitterName: `Lead ${i}`,
    lumaEmail: `lead${i}@x.io`,
    videoUrl: r() < 0.8 ? 'https://v/x' : null,
    githubUrl: r() < 0.9 ? `https://github.com/x/${i}` : null,
    projectBrief: r() < 0.9 ? 'brief' : null,
    prizes: r() < 0.15 ? { [track === 'agentic' ? 'agentic' : 'privacy']: { label: 'Prize', amount: Math.floor(r() * 5) * 100 + 100, currency: 'USD' } } : {},
    ecosystemPrize: r() < 0.1,
    status: 'submitted',
    details: {
      track: track === 'both' && r() < 0.2 ? 'privacy' : track,
      pitch: r() < 0.9 ? 'A private wallet for agents' : '',
      publicUrl: r() < 0.7 ? `https://x${i}.io` : null,
      nextStep: r() < 0.8 ? 'next' : '',
      team: people.filter(() => r() < 0.1),
      anonymous: r() < 0.1,
      milestone: r() < 0.1 ? { partnerName: 'ZecHub' } : null,
    },
  }));
  const judges = ['a@x', 'b@x', 'c@x'].map((email) => ({ email, tracks: ['privacy'] }));
  const scores = [];
  for (const s of submissions) {
    for (const j of judges) {
      if (r() < 0.5) continue;
      const c = {};
      for (const k of ['works', 'private', 'easy', 'needed', 'continuing']) c[k] = Math.floor(r() * 4);
      c.bonus = r() < 0.3 ? 1 : 0;
      scores.push({ submissionId: s.id, judgeEmail: j.email, track: 'privacy', criteria: c });
    }
  }
  const ratings = [];
  for (const s of submissions) {
    if (r() < 0.3) continue;
    for (const q of ['overall', 'organisation', 'support', 'tools']) if (r() < 0.9) ratings.push({ submissionId: s.id, category: q, score: 1 + Math.floor(r() * 5) });
  }
  return { submissions, judges, scores, ratings };
};

describe('stats: server and client agree', () => {
  it('the config is identical', () => {
    expect(JSON.parse(JSON.stringify(CLIENT_PROGRAM_STATS))).toEqual(JSON.parse(JSON.stringify(PROGRAM_STATS)));
  });

  it('identical stats and checks on 60 random programs', () => {
    const r = rng(7);
    const now = new Date('2026-11-09T10:00:00Z');
    for (let t = 0; t < 60; t += 1) {
      const { submissions, judges, scores, ratings } = randomProgram(r);
      const board = computeLeaderboard({ track: 'privacy', submissions, scores, judges, now });
      const args = { program: { slug: SLUG }, submissions, board, ratings, config, review: t % 2 ? review : null, now };
      const a = server.buildStats(args);
      const b = client.buildStats(args);
      expect(b).toEqual(a);
      const testEntries = [{ projectTitle: 'Example Project' }];
      expect(client.computeChecks({ counted: submissions, testEntries, stats: b, config, review: args.review })).toEqual(
        server.computeChecks({ counted: submissions, testEntries, stats: a, config, review: args.review }),
      );
      expect(client.statsFingerprint(b)).toBe(server.statsFingerprint(a));
    }
  });

  it('categorize agrees on every real title', () => {
    for (const [title] of FSH_FINAL_TITLES) {
      const s = { id: title, projectTitle: title, details: { pitch: '' } };
      expect(client.categorize(config.categories, s)).toEqual(server.categorize(config.categories, s));
      expect(client.suggestCategory(config.categories, s)).toBe(server.suggestCategory(config.categories, s));
    }
  });
});
