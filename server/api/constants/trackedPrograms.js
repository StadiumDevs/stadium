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
    // Prize payouts (terms: "Claiming your prize"). WebZero pays the Privacy
    // prizes and the Ecosystem Prize in USDC; Bitrefill pays its own track.
    // The winning point person sends the details by detailsDeadline.
    payout: {
      currency: 'USDC',
      paidBy: { privacy: 'WebZero', agentic: 'Bitrefill', ecosystem: 'WebZero' },
      // The Ecosystem Prize when flagged on a podium project (a further USD 100).
      ecosystemAmount: 100,
      detailsDeadline: '2026-11-19',
      // Who is emailed when a winner sends or changes their payout details.
      // PAYOUT_NOTIFY_EMAILS (comma-separated) overrides it.
      notify: ['info@joinwebzero.com', 'sacha@joinwebzero.com'],
      // USDC on Ethereum only. Other networks are defined in payout.service.js (NETWORKS) if ever needed.
      networks: ['ethereum'],
    },
    themes: ['1. Private payment rails', '2. The first five minutes', '3. Privacy beyond the transaction'],
    appTypes: ['web app', 'mobile app', 'SDK or library', 'CLI', 'agent', 'other'],
    // Teammates besides the point person: solo or a team of up to 4.
    maxTeam: 3,
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

// Builder writes (submit, drafts, feedback, edit access) on a tracked program
// close at the program's eventEndsAt ("Event ends at" in the admin UI). No end
// date set means open. Judges and admins keep working after it.
export const submissionsClosed = (config, program, now = Date.now()) =>
  !!config && !!program?.eventEndsAt && now >= Date.parse(program.eventEndsAt);

// A draft still unfinalized once submissions have closed: abandoned. It isn't
// judged, public or counted in any final list (the row is kept).
export const isAbandoned = (submission, config, program, now = Date.now()) =>
  submission?.status === 'draft' && submissionsClosed(config, program, now);

// Counts as an entry: not abandoned and not a test entry (an organiser trying
// the form). Leaderboards, the public list and the stats use only these.
export const isCountedEntry = (submission, config, program, now = Date.now()) =>
  !isAbandoned(submission, config, program, now) && submission?.isTestEntry !== true;

// The batch a submission belongs to, from its first submission time.
export function batchFor(batches, createdAt) {
  if (!Array.isArray(batches) || batches.length === 0) return null;
  const at = Date.parse(createdAt);
  if (!Number.isFinite(at)) return batches[batches.length - 1].id;
  const hit = batches.find((b) => b.until && at <= Date.parse(b.until));
  return (hit ?? batches[batches.length - 1]).id;
}
