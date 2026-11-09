// The client playground keeps a TypeScript copy of the normalization
// (client/src/lib/scoreNormalization.ts) because mock mode has no server.
// This test runs both copies on the same random tracks and requires identical
// output, so the two can't drift apart.
import { describe, it, expect } from 'vitest';
import * as server from '../score-normalization.service.js';
import * as client from '../../../../client/src/lib/scoreNormalization.ts';
import { RUBRICS } from '../../constants/rubrics.js';

const rng = (seed) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

const randomScores = (r, track) => {
  const criteria = RUBRICS[track];
  const nJudges = 1 + Math.floor(r() * 6);
  const nProjects = 3 + Math.floor(r() * 30);
  const scores = [];
  for (let p = 0; p < nProjects; p += 1) {
    for (let j = 0; j < nJudges; j += 1) {
      if (r() < 0.4) continue;
      const c = {};
      for (const k of criteria) c[k.id] = (k.min ?? 0) + Math.floor(r() * (k.max - (k.min ?? 0) + 1));
      scores.push({ submissionId: `p${p}`, judgeEmail: `j${j}`, criteria: c, ...(r() < 0.05 ? { abstained: true } : {}) });
    }
  }
  return scores;
};

const plain = (out) => ({
  ...out,
  projects: [...out.projects].map(([id, p]) => [id, p]),
});

describe('server and client normalization agree', () => {
  const configs = [
    {},
    { method: 'zscore' },
    { lowCountBias: 'shrink' },
    { minScoresPerJudge: 0 },
    { minJudges: 1, minScoresForZ: 3 },
  ];
  for (const config of configs) {
    it(`identical on 200 random tracks (${JSON.stringify(config)})`, () => {
      const r = rng(99);
      for (let t = 0; t < 200; t += 1) {
        const track = t % 2 ? 'privacy' : 'agentic';
        const scores = randomScores(r, track);
        const args = { criteria: RUBRICS[track], bonusIds: track === 'privacy' ? ['bonus'] : [], scores, config };
        expect(plain(client.normalizeTrack(args))).toEqual(plain(server.normalizeTrack(args)));
      }
    });
  }

  it('same defaults', () => {
    expect({ ...client.DEFAULT_NORMALIZATION }).toEqual({ ...server.DEFAULT_NORMALIZATION });
  });
});
