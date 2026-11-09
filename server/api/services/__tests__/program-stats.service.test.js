import { describe, it, expect } from 'vitest';
import { categorize, computeChecks, computeStats, statsFingerprint, suggestCategory } from '../program-stats.service.js';
import { FSH_CATEGORIES, PROGRAM_STATS } from '../../constants/programStats.js';
import { FSH_FINAL_TITLES } from './fixtures/fsh-final-titles.js';

const config = PROGRAM_STATS['free-society-hack-2026'];
const program = { slug: 'free-society-hack-2026' };
const NOW = new Date('2026-11-09T10:00:00Z');
const crit = (t) => {
  const c = { bonus: 0 };
  let left = t;
  for (const id of ['works', 'private', 'easy', 'needed', 'continuing']) {
    c[id] = Math.min(3, left);
    left -= c[id];
  }
  return c;
};

/** A submission like the repository returns it. */
const sub = (id, track, over = {}) => ({
  id,
  projectTitle: over.title ?? id,
  submitterName: over.name ?? `Lead ${id}`,
  lumaEmail: over.email ?? `${id}@x.io`,
  videoUrl: 'videoUrl' in over ? over.videoUrl : 'https://v.example/1',
  githubUrl: 'githubUrl' in over ? over.githubUrl : `https://github.com/x/${id}`,
  projectBrief: 'projectBrief' in over ? over.projectBrief : 'A brief.',
  prizes: over.prizes ?? {},
  ecosystemPrize: !!over.ecosystemPrize,
  status: 'submitted',
  details: {
    track,
    pitch: 'pitch' in over ? over.pitch : 'A pitch.',
    publicUrl: 'publicUrl' in over ? over.publicUrl : `https://${id}.example`,
    nextStep: 'nextStep' in over ? over.nextStep : 'Ship to mainnet.',
    team: over.team ?? [],
    anonymous: !!over.anonymous,
    milestone: over.milestone ?? null,
    frictionNotes: 'SECRET FRICTION TEXT',
    bitrefillFeedback: { worked: 'SECRET WORKED', didnt: 'SECRET DIDNT' },
  },
});
const sc = (submissionId, judgeEmail, total) => ({ submissionId, judgeEmail, track: 'privacy', criteria: crit(total) });
const judges = [
  { email: 'j1@x', name: 'J1', tracks: ['privacy'] },
  { email: 'j2@x', name: 'J2', tracks: ['privacy'] },
];
const PRIZE = (label, amount) => ({ label, amount, currency: 'USD' });

const fixture = () => {
  const submissions = [
    sub('priv-a', 'privacy', {
      title: 'Ghost Layer',
      prizes: { privacy: PRIZE('Privacy: 1st', 1300) },
      ecosystemPrize: true,
      team: [{ name: 'Madhanraj', email: 'MADHAN@x.io' }],
    }),
    sub('priv-b', 'privacy', { title: 'Zsol', githubUrl: null, videoUrl: null }),
    sub('both-c', 'both', {
      title: 'GiftRelay',
      prizes: { agentic: PRIZE('Agentic Commerce: 2nd', 800) },
      team: [{ name: 'Madhanraj M', email: 'madhan@x.io' }],
    }),
    sub('agent-d', 'agentic', {
      title: 'Pegasus',
      prizes: { agentic: PRIZE('Agentic Commerce: 1st', 1000) },
      team: [{ name: 'Madhanraj M.', email: 'madhan@x.io' }],
    }),
    sub('agent-e', 'agentic', { title: 'Z-Pay', pitch: '', projectBrief: null, nextStep: '' }),
    sub('priv-f', 'privacy', { title: 'Mystery Thing', pitch: 'A private wallet over the Nym mixnet.' }),
  ];
  const scores = [
    sc('priv-a', 'j1@x', 13), sc('priv-a', 'j2@x', 11),
    sc('priv-b', 'j1@x', 8),
    sc('both-c', 'j1@x', 10), sc('both-c', 'j2@x', 9),
    // A Privacy score on an Agentic-only entry must never surface.
    sc('agent-d', 'j1@x', 15),
  ];
  const ratings = [];
  for (const id of ['priv-a', 'priv-b', 'priv-f']) {
    ratings.push({ submissionId: id, category: 'overall', score: 5 }, { submissionId: id, category: 'tools', score: 4 });
  }
  ratings.push({ submissionId: 'priv-a', category: 'support', score: 3 }); // n = 1: suppressed
  ratings.push({ submissionId: 'both-c', category: 'overall', score: 2 });
  return { submissions, scores, ratings };
};
const run = (f = fixture()) => computeStats({ program, submissions: f.submissions, scores: f.scores, judges, ratings: f.ratings, config, now: NOW });

describe('categories (title-based, from the brief)', () => {
  it('maps all 62 real titles from the final CSV to the brief\'s category; only the test entry is unmatched', () => {
    expect(FSH_FINAL_TITLES).toHaveLength(63);
    for (const [title, , expected] of FSH_FINAL_TITLES) {
      expect(categorize(FSH_CATEGORIES, { id: title, projectTitle: title }).id, title).toBe(expected);
    }
    expect(FSH_FINAL_TITLES.filter(([, , c]) => c === 'uncategorized').map(([t]) => t)).toEqual(['Example Project']);
    expect(FSH_FINAL_TITLES.filter(([t]) => t.startsWith('zcash-now')).map(([, , c]) => c)).toEqual(['devtools-education', 'devtools-education']);
  });

  it('an id in the map beats the title, and no title matches two categories', () => {
    const cats = [{ ...FSH_CATEGORIES[0], ids: ['abc'] }, ...FSH_CATEGORIES.slice(1)];
    expect(categorize(cats, { id: 'abc', projectTitle: 'Zsol' }).id).toBe(FSH_CATEGORIES[0].id);
    for (const [title] of FSH_FINAL_TITLES) {
      const hits = FSH_CATEGORIES.filter((c) => categorize([c], { id: 'x', projectTitle: title }).id === c.id);
      expect(hits.length, title).toBeLessThanOrEqual(1);
    }
  });

  it('matches whole words only: "Zsol" does not match "Zsolana"', () => {
    expect(categorize(FSH_CATEGORIES, { id: 'x', projectTitle: 'Zsolana' }).id).toBe('uncategorized');
    expect(categorize(FSH_CATEGORIES, { id: 'x', projectTitle: 'Courier: private agentic commerce gateway' }).id).toBe('private-shopping');
  });

  it('suggests a category for an unmatched project from its text', () => {
    expect(suggestCategory(FSH_CATEGORIES, { projectTitle: 'Mystery Thing', details: { pitch: 'A private wallet over the Nym mixnet.' } })).toBe('Wallet and network privacy');
  });
});

describe('computeStats', () => {
  it('headline: counts, hackers by email, teams, per track, multi-team hackers', () => {
    const s = run();
    expect(s.headline).toEqual({
      submissions: 6,
      // 6 leads + Madhanraj (one email, three spellings, three teams)
      hackers: 7,
      teams: 6,
      byTrack: { privacy: 3, both: 1, agentic: 2 },
      multiTeamHackers: 1,
    });
    expect(s.multiTeam.hackers).toHaveLength(1);
    expect(s.multiTeam.hackers[0].name).toBe('Madhanraj M.');
    expect(s.multiTeam.hackers[0].projects.map((p) => p.title)).toEqual(['Ghost Layer', 'GiftRelay', 'Pegasus']);
  });

  it('multi-team names stay private when an entry is anonymous', () => {
    const f = fixture();
    f.submissions[3].details.anonymous = true;
    expect(run(f).multiTeam.hackers[0].name).toBeNull();
  });

  it('winners per track, best prize first; Agentic winners have no score', () => {
    const s = run();
    expect(s.winners.privacy).toHaveLength(1);
    expect(s.winners.privacy[0]).toMatchObject({ place: 1, ecosystemPrize: true, project: { title: 'Ghost Layer', linkable: true } });
    expect(typeof s.winners.privacy[0].score).toBe('number');
    expect(s.winners.agentic.map((w) => [w.place, w.project.title, w.score])).toEqual([
      [1, 'Pegasus', null],
      [2, 'GiftRelay', null],
    ]);
  });

  it('Agentic-only projects: no score anywhere, but in counts and categories', () => {
    const s = run();
    const agentOnly = ['agent-d', 'agent-e'];
    for (const r of s.composite.filter((x) => agentOnly.includes(x.project.id))) {
      expect(r.noJudgeScore).toBe(true);
      expect(r.breakdown.judge).toBeNull();
    }
    for (const c of s.topByCategory) {
      expect(c.scored.some((x) => agentOnly.includes(x.project.id))).toBe(false);
      expect(c.unscored.some((x) => agentOnly.includes(x.id))).toBe(false);
    }
    const guard = s.topByCategory.find((c) => c.id === 'agent-guardrails');
    expect(guard.notJudged.map((p) => p.id)).toEqual(['agent-d']);
    expect(s.perCategory.find((c) => c.id === 'agent-guardrails').segments.find((x) => x.track === 'agentic').count).toBe(1);
    expect(s.unscoredNote).toBe('Not scored (Agentic Commerce, judged by Bitrefill)');
  });

  it('composite: weights out of 100, and no-judge projects scaled on the other signals', () => {
    const s = run();
    const byId = Object.fromEntries(s.composite.map((r) => [r.project.id, r]));
    // priv-a: judge 45 × 12/16 = 33.75 (both judges scored it, so raw = normalized),
    // Ecosystem Prize 20, next step 20, all three shipped 15.
    expect(byId['priv-a'].breakdown).toEqual({ judge: 33.8, support: 20, milestone: 20, shipped: { publicUrl: 5, demoVideo: 5, repo: 5 } });
    expect(byId['priv-a'].score).toBe(88.8);
    // agent-e: no next step, no support, shipped 15 of 15 → 15/55 × 100.
    expect(byId['agent-e']).toMatchObject({ noJudgeScore: true, score: 27.3 });
    // agent-d: next step 20 + shipped 15 → 35/55 × 100.
    expect(byId['agent-d'].score).toBe(63.6);
    // A Privacy project with no scores is also ranked without the judge signal.
    expect(byId['priv-f'].noJudgeScore).toBe(true);
    expect(s.composite.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    for (let i = 1; i < s.composite.length; i += 1) expect(s.composite[i].score).toBeLessThanOrEqual(s.composite[i - 1].score);
  });

  it('a partner on the milestone counts as support', () => {
    const f = fixture();
    f.submissions[1].details.milestone = { partnerName: 'ZecHub', partnerProject: null };
    expect(run(f).composite.find((r) => r.project.id === 'priv-b').breakdown.support).toBe(20);
  });

  it('top per category: scored by normalized total, winners marked, unscored listed beneath', () => {
    const s = run();
    const proofs = s.topByCategory.find((c) => c.id === 'proofs');
    expect(proofs.scored.map((x) => x.project.title)).toEqual(['Zsol']);
    const wallet = s.topByCategory.find((c) => c.id === 'wallet-network');
    expect(wallet.scored[0]).toMatchObject({ winner: true, project: { title: 'Ghost Layer' } });
    const unc = s.topByCategory.find((c) => c.id === 'uncategorized');
    expect(unc.unscored.map((p) => p.title)).toEqual(['Mystery Thing']);
  });

  it('feedback: numeric only, per track, under 3 responses suppressed, tracks with none flagged', () => {
    const s = run();
    const all = s.feedback.groups.find((g) => g.id === 'all');
    const overall = all.questions.find((q) => q.id === 'overall');
    expect(overall).toMatchObject({ n: 4, avg: 4.3, suppressed: false, distribution: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 3 } });
    expect(all.questions.find((q) => q.id === 'support')).toMatchObject({ suppressed: true, n: 0, avg: null });
    expect(s.feedback.groups.find((g) => g.id === 'agentic')).toMatchObject({ none: true, questions: [] });
    expect(s.feedback.groups.find((g) => g.id === 'both').questions.every((q) => q.suppressed)).toBe(true);
  });

  it('never contains free text, emails or feedback answers', () => {
    const json = JSON.stringify(run());
    for (const secret of ['SECRET', '@x.io', 'MADHAN@', 'lumaEmail', 'frictionNotes']) expect(json).not.toContain(secret);
  });

  it('changes when a score changes (fingerprint ignores the generation time)', () => {
    const a = run();
    const b = computeStats({ ...fixture(), program, judges, config, now: new Date('2027-01-01T00:00:00Z'), submissions: fixture().submissions, scores: fixture().scores, ratings: fixture().ratings });
    expect(statsFingerprint(a)).toBe(statsFingerprint(b));
    const f = fixture();
    f.scores[2] = sc('priv-b', 'j1@x', 3);
    expect(statsFingerprint(run(f))).not.toBe(statsFingerprint(a));
  });
});

describe('computeChecks', () => {
  it('reports count mismatches, duplicates, uncategorized projects, gaps and excluded test entries', () => {
    const f = fixture();
    f.submissions.push(sub('dup', 'privacy', { title: 'Zsol copy', githubUrl: 'https://github.com/x/priv-a/' }));
    const stats = computeStats({ program, submissions: f.submissions, scores: f.scores, judges, ratings: f.ratings, config, now: NOW });
    const checks = computeChecks({ counted: f.submissions, testEntries: [{ projectTitle: 'Example Project' }], stats, config });
    expect(checks.mismatches).toContain('Submissions: 7 in the database, 62 expected');
    expect(checks.mismatches.some((m) => m.startsWith('Privacy: 4'))).toBe(true);
    expect(checks.mismatches).toContain('Expected Sarnav Kansal on more than one team');
    expect(checks.duplicates).toEqual(['Same repo: "Ghost Layer" and "Zsol copy"']);
    expect(checks.uncategorized).toEqual([{ id: 'priv-f', title: 'Mystery Thing', suggested: 'Wallet and network privacy' }]);
    expect(checks.gaps.noDescription).toEqual(['Z-Pay']);
    expect(checks.gaps.noRepo).toEqual(['Zsol']);
    expect(checks.gaps.noDemoVideo).toEqual(['Zsol']);
    expect(checks.testEntries).toEqual(['Example Project']);
  });

  it('passes on data matching the final CSV counts (62; 24 / 24 / 14)', () => {
    const subs = FSH_FINAL_TITLES.filter(([t]) => t !== 'Example Project').map(([title, track], i) =>
      sub(`s${i}`, track, { title, email: `lead${i}@x.io`, githubUrl: `https://github.com/x/s${i}` }),
    );
    const stats = computeStats({ program, submissions: subs, scores: [], judges, ratings: [], config, now: NOW });
    const checks = computeChecks({ counted: subs, stats, config });
    expect(stats.headline.byTrack).toEqual({ privacy: 24, both: 24, agentic: 14 });
    expect(checks.mismatches.filter((m) => !/team/.test(m))).toEqual([]);
    expect(checks.uncategorized).toEqual([]);
    expect(checks.duplicates).toEqual([]);
  });
});
