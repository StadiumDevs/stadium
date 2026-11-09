// Rubrics for tracked programs, keyed by track. Criterion ids and ranges must
// match client/src/lib/programProfiles.ts (PRIVACY_RUBRIC, AGENTIC_RUBRIC):
// the client renders the levels, the server validates what it stores.
export const RUBRICS = {
  // Free Society Hack Privacy track: five criteria 0-3 plus a 0/1 Bonus.
  privacy: [
    { id: 'works', max: 3 },
    { id: 'private', max: 3 },
    { id: 'easy', max: 3 },
    { id: 'needed', max: 3 },
    { id: 'continuing', max: 3 },
    { id: 'bonus', max: 1 },
  ],
  // Agentic Commerce (Bitrefill's criteria): each scored 1 to 5, max 15.
  agentic: [
    { id: 'requirements', min: 1, max: 5 },
    { id: 'techStack', min: 1, max: 5 },
    { id: 'innovation', min: 1, max: 5 },
  ],
};

export const RUBRIC_TRACKS = Object.keys(RUBRICS);

// Per-judge normalization (score-normalization.service.js; client:
// Rubric.normalization in programProfiles.ts). method: 'offset' (judge-offset
// model: projects every scoring judge scored keep their raw average) or
// 'zscore'. Needs `minJudges` judges with scores in the track; judges under
// `minScoresPerJudge` scores get bias 0 ('zero') or a shrunk one ('shrink').
const NORMALIZATION = Object.freeze({
  enabled: true,
  method: 'offset',
  minJudges: 2,
  minScoresPerJudge: 8,
  lowCountBias: 'zero',
  minScoresForZ: 8,
});

// Ranking rules per track (client: Rubric.tieBreaks / winnerGate in
// programProfiles.ts). Ties go to the first tie-break that differs.
export const RUBRIC_RANKING = {
  privacy: {
    tieBreaks: [
      { kind: 'criterion', id: 'continuing', label: 'Continuing' },
      { kind: 'criterion', id: 'needed', label: 'Needed' },
    ],
    bonusId: 'bonus',
    normalization: NORMALIZATION,
    // An average Works score of 0 can't win (read from raw averages).
    winnerGate: {
      criterionId: 'works',
      maxAvg: 0,
      message: "Average Works score is 0: this project can't be selected as a winner.",
    },
  },
  agentic: {
    // Bitrefill's rule: ties go to the higher How innovative score.
    tieBreaks: [{ kind: 'criterion', id: 'innovation', label: 'How innovative' }],
    bonusId: null,
    normalization: NORMALIZATION,
    winnerGate: null,
  },
};

// The "check first" steps a judge ticks before scoring (client carousel).
export const RUBRIC_CHECKS = ['video', 'repo', 'tx'];
