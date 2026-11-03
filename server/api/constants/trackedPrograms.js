// Tracked programs (submissions with tracks, a per-track rubric, live judging).
// Keyed by program slug. Must match client/src/lib/programProfiles.ts: the
// client renders the form and judging, the server validates what it stores.
export const TRACKED_PROGRAMS = {
  'free-society-hack-2026': {
    // Submission tracks; "both" is judged in privacy and agentic.
    submissionTracks: ['privacy', 'agentic', 'both'],
    judgedTracks: ['privacy', 'agentic'],
    // Tracks whose entries need a testnet transaction id.
    txidTracks: ['privacy', 'both'],
    // Tracks whose entries need a privacy and trust note (judges score Private from it).
    privacyNoteTracks: ['privacy', 'both'],
    // Tracks whose entries need the Bitrefill feedback (what worked, what didn't).
    bitrefillFeedbackTracks: ['agentic', 'both'],
    // Tracks whose entries must answer the Bitrefill survey (submissionFeedback.ts
    // on the client) to finalize.
    bitrefillSurveyTracks: ['agentic', 'both'],
    // Tracks where the demo video is optional (strongly preferred). Agentic
    // needs a video or a live link showing the agent make a purchase.
    videoOptionalTracks: ['privacy'],
    // Prize tiers belong to a track by their label prefix (programs.prize_tiers).
    prizePrefixes: { privacy: 'Privacy:', agentic: 'Agentic Commerce:' },
    // How many projects may win each tier, by amount (USD). Privacy: one top,
    // two second, two third. Agentic: one of each.
    tierLimits: {
      privacy: { 1300: 1, 300: 2, 200: 2 },
      agentic: { 1000: 1, 800: 1, 600: 1, 100: 1 },
    },
    // The Ecosystem Prize: a flag on up to two Privacy podium projects.
    ecosystem: { track: 'privacy', maxFlags: 2, label: 'Ecosystem Prize' },
    themes: ['1. Private payment rails', '2. The first five minutes', '3. Privacy beyond the transaction'],
    appTypes: ['web app', 'mobile app', 'SDK or library', 'CLI', 'agent', 'other'],
    // Teammates besides the point person: solo or a team of up to 4.
    maxTeam: 3,
    // Builders can't create or save submissions after this (Thu 5 Nov 00:00
    // IST). Judges and admins keep working after it.
    submissionsCloseAt: '2026-11-04T18:30:00Z',
    // Judging batches, in order. A submission joins the first batch whose
    // `until` is at or after its first submission time; the last batch takes
    // the rest. "Evening judging: projects in by Wed 4 Nov 20:00 IST".
    judgingBatches: [
      { id: 'evening', label: 'Evening', until: '2026-11-04T20:00:00+05:30' },
      { id: 'morning', label: 'Morning', until: null },
    ],
  },
};

export const trackedProgramFor = (slug) => TRACKED_PROGRAMS[slug] ?? null;

// Builder writes (submit, drafts, feedback, edit access) are closed once the
// tracked program's submissionsCloseAt has passed.
export const submissionsClosed = (config, now = Date.now()) =>
  !!config?.submissionsCloseAt && now >= Date.parse(config.submissionsCloseAt);

// The batch a submission belongs to, from its first submission time.
export function batchFor(batches, createdAt) {
  if (!Array.isArray(batches) || batches.length === 0) return null;
  const at = Date.parse(createdAt);
  if (!Number.isFinite(at)) return batches[batches.length - 1].id;
  const hit = batches.find((b) => b.until && at <= Date.parse(b.until));
  return (hit ?? batches[batches.length - 1]).id;
}
