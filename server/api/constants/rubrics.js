// Rubrics for tracked programs, keyed by track. Criterion ids and maxima must
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
  // Agentic Commerce (Bitrefill's criteria, each out of 5).
  agentic: [
    { id: 'requirements', max: 5 },
    { id: 'techStack', max: 5 },
    { id: 'innovation', max: 5 },
  ],
};

export const RUBRIC_TRACKS = Object.keys(RUBRICS);

// Ranking rules per track (client: Rubric.tieBreaks / winnerGate in
// programProfiles.ts). Ties go to the first tie-break that differs.
export const RUBRIC_RANKING = {
  privacy: {
    tieBreaks: [
      { kind: 'criterion', id: 'continuing', label: 'Continuing' },
      { kind: 'criterion', id: 'needed', label: 'Needed' },
    ],
    bonusId: 'bonus',
    // An average Works score of 0 can't win.
    winnerGate: {
      criterionId: 'works',
      maxAvg: 0,
      message: "Average Works score is 0: this project can't be selected as a winner.",
    },
  },
  agentic: {
    tieBreaks: [
      { kind: 'criterion', id: 'innovation', label: 'Innovation' },
      { kind: 'criterion', id: 'techStack', label: 'Tech stack' },
    ],
    bonusId: null,
    winnerGate: null,
  },
};

// The "check first" steps a judge ticks before scoring (client carousel).
export const RUBRIC_CHECKS = ['video', 'repo', 'tx'];
