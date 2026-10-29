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
    // Tracks where the demo video is optional (strongly preferred). Agentic
    // needs a video or a live link showing the agent make a purchase.
    videoOptionalTracks: ['privacy'],
    themes: ['1. Private payment rails', '2. The first five minutes', '3. Privacy beyond the transaction'],
    appTypes: ['web app', 'mobile app', 'SDK or library', 'CLI', 'agent', 'other'],
    maxTeam: 5,
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

// The batch a submission belongs to, from its first submission time.
export function batchFor(batches, createdAt) {
  if (!Array.isArray(batches) || batches.length === 0) return null;
  const at = Date.parse(createdAt);
  if (!Number.isFinite(at)) return batches[batches.length - 1].id;
  const hit = batches.find((b) => b.until && at <= Date.parse(b.until));
  return (hit ?? batches[batches.length - 1]).id;
}
