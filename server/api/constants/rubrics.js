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
  // Agentic Commerce (Bitrefill's criteria).
  agentic: [
    { id: 'requirements', max: 2 },
    { id: 'techStack', max: 5 },
    { id: 'innovation', max: 5 },
  ],
};

export const RUBRIC_TRACKS = Object.keys(RUBRICS);

// The "check first" steps a judge ticks before scoring (client carousel).
export const RUBRIC_CHECKS = ['video', 'repo', 'tx'];
