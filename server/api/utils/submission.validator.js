// Validation for public project submissions and judge scores.
// Pure functions — no DB, no I/O — so they're trivially unit-testable and
// reusable from the controller.

import { RUBRICS, RUBRIC_CHECKS } from '../constants/rubrics.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Max length of the project brief; mirrored by BRIEF_MAX in the client form.
const BRIEF_MAX = 500;

// Submissions are grouped into fixed batches of this size for judge claiming.
// Mirrored client-side in client/src/lib/constants.ts.
export const BATCH_SIZE = 10;

// Fallback prize tiers when a program hasn't configured its own. Bitrefill's
// hackathon awards EUR giftcards. Mirrored client-side in client/src/lib/constants.ts.
export const DEFAULT_PRIZE_TIERS = [
  { amount: 500, currency: 'EUR', label: 'Bitrefill giftcard' },
  { amount: 200, currency: 'EUR', label: 'Bitrefill giftcard' },
  { amount: 100, currency: 'EUR', label: 'Bitrefill giftcard' },
];

// A program's effective tiers: its own if configured, else the default set.
export function prizeTiersFor(program) {
  const tiers = program?.prizeTiers;
  return Array.isArray(tiers) && tiers.length ? tiers : DEFAULT_PRIZE_TIERS;
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

const isHttpUrl = (v) => {
  const s = str(v);
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};

// Caps for the post-submission feedback payload. Feedback is free-form JSONB
// (the question set is program-specific and lives client-side), so the server
// validates structure + bounds rather than exact option text — this avoids
// client/server drift while still rejecting junk. Unknown keys are dropped.
const FEEDBACK_TEXT_MAX = 1000;
const FEEDBACK_MAX_SURFACES = 20;
const FEEDBACK_STRING_KEYS = [
  'agentEnv',
  'deadlineStatus',
  'biggestBlocker',
  'couldntHandle',
  'wouldKeepBuilding',
];

// Validate the optional feedback object. Returns { ok, value } where value is
// null (no feedback) or a normalized object, or { ok: false, error }.
export function validateFeedback(feedback) {
  if (feedback === undefined || feedback === null) return { ok: true, value: null };
  if (typeof feedback !== 'object' || Array.isArray(feedback)) {
    return { ok: false, error: 'feedback must be an object' };
  }

  const out = {};

  if (feedback.surfaces !== undefined) {
    if (!Array.isArray(feedback.surfaces)) {
      return { ok: false, error: 'feedback.surfaces must be an array' };
    }
    if (feedback.surfaces.length > FEEDBACK_MAX_SURFACES) {
      return { ok: false, error: 'Too many feedback surfaces selected' };
    }
    const surfaces = [];
    for (const s of feedback.surfaces) {
      const v = str(s);
      if (!v || v.length > FEEDBACK_TEXT_MAX) {
        return { ok: false, error: 'feedback.surfaces entries must be non-empty strings' };
      }
      surfaces.push(v);
    }
    out.surfaces = surfaces;
  }

  if (feedback.surfacesPrimary !== undefined && feedback.surfacesPrimary !== null) {
    const primary = str(feedback.surfacesPrimary);
    if (primary && (!out.surfaces || !out.surfaces.includes(primary))) {
      return { ok: false, error: 'feedback.surfacesPrimary must be one of the selected surfaces' };
    }
    out.surfacesPrimary = primary || null;
  } else {
    out.surfacesPrimary = null;
  }

  for (const key of FEEDBACK_STRING_KEYS) {
    if (feedback[key] === undefined || feedback[key] === null) continue;
    if (typeof feedback[key] !== 'string') {
      return { ok: false, error: `feedback.${key} must be a string` };
    }
    const v = feedback[key].trim();
    if (v.length > FEEDBACK_TEXT_MAX) {
      return { ok: false, error: `feedback.${key} is too long` };
    }
    out[key] = v;
  }

  return { ok: true, value: out };
}

// Returns { ok: true, value } with trimmed/normalized fields, or
// { ok: false, error } with a human-readable message.
export function validateSubmission(body = {}) {
  const submitterName = str(body.submitterName);
  const lumaEmail = str(body.lumaEmail);
  const projectTitle = str(body.projectTitle);
  const projectBrief = str(body.projectBrief);
  const videoUrl = str(body.videoUrl);
  const githubUrl = str(body.githubUrl);

  if (!submitterName || submitterName.length > 200) {
    return { ok: false, error: 'Your name is required (max 200 characters)' };
  }
  if (!lumaEmail || !EMAIL_RE.test(lumaEmail)) {
    return { ok: false, error: 'A valid email is required' };
  }
  if (!projectTitle || projectTitle.length > 200) {
    return { ok: false, error: 'A project title is required (max 200 characters)' };
  }
  if (!projectBrief || projectBrief.length > BRIEF_MAX) {
    return { ok: false, error: `A short brief of what your project does is required (max ${BRIEF_MAX} characters)` };
  }
  if (!isHttpUrl(videoUrl)) {
    return { ok: false, error: 'A valid video demo link (http/https) is required' };
  }
  if (!isHttpUrl(githubUrl)) {
    return { ok: false, error: 'A valid GitHub URL (http/https) is required' };
  }

  const fb = validateFeedback(body.feedback);
  if (!fb.ok) return { ok: false, error: fb.error };

  return {
    ok: true,
    value: {
      submitterName,
      lumaEmail,
      projectTitle,
      projectBrief,
      videoUrl,
      githubUrl,
      feedback: fb.value,
      agreedToTerms: body.agreedToTerms === true,
    },
  };
}

// Validate a prize assignment against a program's tiers.
// `body.prize === null` clears the award. Otherwise `body.amount` must match a
// configured tier; the stored prize snapshots that tier's currency + label so
// later edits to the program's tiers don't rewrite already-awarded prizes.
// Returns { ok: true, value } where value is null (cleared) or { amount, currency, label }.
export function validatePrize(body = {}, tiers = []) {
  if (body.prize === null) {
    return { ok: true, value: null };
  }
  const amount = body.amount;
  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    return { ok: false, error: 'A prize amount is required' };
  }
  const tier = (tiers || []).find((t) => t.amount === amount);
  if (!tier) {
    return { ok: false, error: 'Prize amount does not match a configured tier for this program' };
  }
  return { ok: true, value: { amount: tier.amount, currency: tier.currency, label: tier.label } };
}

// Rubric bounds — the single source of truth, also mirrored by DB CHECKs.
export const SCORE_BOUNDS = {
  requirements: { min: 0, max: 2 },
  techStack: { min: 0, max: 5 },
  innovation: { min: 0, max: 5 },
};
export const MAX_TOTAL_SCORE =
  SCORE_BOUNDS.requirements.max + SCORE_BOUNDS.techStack.max + SCORE_BOUNDS.innovation.max;

const isNumInRange = (v, { min, max }) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// Scores accept one decimal place (e.g. 4.3). Round half-up to 1dp so the
// validator and the NUMERIC(3,1) column agree on the stored value.
const roundTo1dp = (v) => Math.round(v * 10) / 10;

export function validateScore(body = {}) {
  const out = {};
  for (const key of ['requirements', 'techStack', 'innovation']) {
    const value = body[key];
    if (!isNumInRange(value, SCORE_BOUNDS[key])) {
      const { min, max } = SCORE_BOUNDS[key];
      return { ok: false, error: `${key} must be a number between ${min} and ${max}` };
    }
    out[key] = roundTo1dp(value);
  }
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notes.length > 5000) {
    return { ok: false, error: 'Notes must be 5000 characters or fewer' };
  }
  return { ok: true, value: { ...out, notes } };
}

// Rubric scores (tracked programs). Partial is allowed: each criterion is an
// integer 0..max or null (not scored yet), so a judge's work can autosave.
// `revisit` is the judge's own "come back to this" mark; `checks` records
// what they looked at before scoring (video, repo, tx).
export function validateRubricScore(track, body = {}) {
  const rubric = RUBRICS[track];
  if (!rubric) return { ok: false, error: `Unknown track: ${track}` };
  const input = body.criteria;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'criteria must be an object' };
  }
  const criteria = {};
  for (const [key, value] of Object.entries(input)) {
    const c = rubric.find((x) => x.id === key);
    if (!c) return { ok: false, error: `Unknown criterion for ${track}: ${key}` };
    if (value === null) {
      criteria[key] = null;
      continue;
    }
    if (!Number.isInteger(value) || value < 0 || value > c.max) {
      return { ok: false, error: `${key} must be a whole number between 0 and ${c.max}` };
    }
    criteria[key] = value;
  }
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notes.length > 5000) {
    return { ok: false, error: 'Notes must be 5000 characters or fewer' };
  }
  let session = null;
  if (body.session !== undefined && body.session !== null && body.session !== '') {
    if (typeof body.session !== 'string' || !/^[a-z0-9-]{1,32}$/.test(body.session)) {
      return { ok: false, error: 'session must be up to 32 lowercase letters, digits or dashes' };
    }
    session = body.session;
  }
  if (body.revisit !== undefined && typeof body.revisit !== 'boolean') {
    return { ok: false, error: 'revisit must be true or false' };
  }
  const checks = {};
  if (body.checks !== undefined && body.checks !== null) {
    if (typeof body.checks !== 'object' || Array.isArray(body.checks)) {
      return { ok: false, error: 'checks must be an object' };
    }
    for (const [key, value] of Object.entries(body.checks)) {
      if (!RUBRIC_CHECKS.includes(key)) return { ok: false, error: `Unknown check: ${key}` };
      if (typeof value !== 'boolean') return { ok: false, error: `${key} check must be true or false` };
      checks[key] = value;
    }
  }
  return { ok: true, value: { criteria, notes, session, revisit: body.revisit === true, checks } };
}

// Tracked-program submission fields (`details`), mirroring the client form
// (client/src/components/program/tracked/trackedForm.ts). Unknown keys are
// dropped, and server-set fields (txCheck, milestone, checkIns) are never
// taken from the client.
export const PITCH_MAX = 140;
const TXID_RE = /^[0-9a-f]{64}$/i;
const isApp = (appType) => /app/i.test(appType);
const strList = (v) => (Array.isArray(v) ? v : []);

export function validateSubmissionDetails(config, details) {
  if (!config) return { ok: false, error: 'This program does not take tracked submissions' };
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return { ok: false, error: 'Submission details are required for this program' };
  }
  const d = details;
  const track = str(d.track);
  if (!config.submissionTracks.includes(track)) return { ok: false, error: 'Choose a track' };
  const judgesPrivacy = track !== 'agentic';

  const themes = strList(d.themes).map(str).filter(Boolean);
  if (themes.some((t) => !config.themes.includes(t))) return { ok: false, error: 'Unknown theme' };
  if (judgesPrivacy && themes.length === 0) return { ok: false, error: 'Pick at least one theme' };

  const pitch = str(d.pitch);
  if (!pitch) return { ok: false, error: 'A one-line pitch is required' };
  if (pitch.length > PITCH_MAX) return { ok: false, error: `The pitch must be ${PITCH_MAX} characters or fewer` };

  if (!Array.isArray(d.team ?? [])) return { ok: false, error: 'team must be a list' };
  const rawTeam = d.team ?? [];
  if (rawTeam.length > config.maxTeam) return { ok: false, error: `At most ${config.maxTeam} teammates` };
  const team = [];
  for (const m of rawTeam) {
    const name = str(m?.name);
    const email = str(m?.email);
    const role = str(m?.role);
    if (!name || name.length > 100) return { ok: false, error: 'Each teammate needs a name (max 100 characters)' };
    if (email && !EMAIL_RE.test(email)) return { ok: false, error: `Teammate ${name} has an invalid email` };
    if (role.length > 60) return { ok: false, error: 'A teammate role is max 60 characters' };
    team.push({ name, email: email ? email.toLowerCase() : null, role: role || null });
  }

  const appType = str(d.appType);
  if (!config.appTypes.includes(appType)) return { ok: false, error: 'Say what kind of project it is' };
  const publicUrl = str(d.publicUrl) || null;
  if (publicUrl && !isHttpUrl(publicUrl)) return { ok: false, error: 'The public URL must start with http:// or https://' };
  if (isApp(appType) && !publicUrl) return { ok: false, error: 'Apps need a public URL (http/https)' };

  const demoVideoLength = str(d.demoVideoLength) || null;
  if (demoVideoLength && demoVideoLength.length > 10) return { ok: false, error: 'Video length is max 10 characters (e.g. 1:54)' };

  const technologies = strList(d.technologies).map(str).filter(Boolean);
  if (technologies.length === 0) return { ok: false, error: 'List every technology you used' };
  if (technologies.length > 20 || technologies.some((t) => t.length > 60)) {
    return { ok: false, error: 'Technologies: at most 20, each max 60 characters' };
  }

  const txidRequired = config.txidTracks.includes(track);
  const testnetTxid = txidRequired ? str(d.testnetTxid) || null : null;
  if (txidRequired && !testnetTxid) return { ok: false, error: 'Privacy entries need one testnet transaction id' };
  if (testnetTxid && !TXID_RE.test(testnetTxid)) {
    return { ok: false, error: 'A testnet transaction id is 64 hex characters' };
  }

  const nextStep = str(d.nextStep);
  if (!nextStep) return { ok: false, error: 'A next milestone for the 30 days is required' };
  if (nextStep.length > 1000) return { ok: false, error: 'The next milestone is max 1000 characters' };
  const nextStepLinks = strList(d.nextStepLinks).map(str).filter(Boolean);
  if (nextStepLinks.length > 10) return { ok: false, error: 'At most 10 next-milestone links' };
  if (nextStepLinks.some((l) => !isHttpUrl(l))) {
    return { ok: false, error: 'Each next-milestone link must start with http:// or https://' };
  }

  const frictionAreas = strList(d.frictionAreas).map(str).filter(Boolean);
  if (frictionAreas.some((a) => !config.frictionAreas.includes(a))) return { ok: false, error: 'Unknown friction area' };
  const frictionNotes = str(d.frictionNotes) || null;
  if (frictionNotes && frictionNotes.length > 2000) return { ok: false, error: 'Friction notes are max 2000 characters' };

  if (d.anonymous !== undefined && typeof d.anonymous !== 'boolean') {
    return { ok: false, error: 'anonymous must be true or false' };
  }

  return {
    ok: true,
    value: {
      track,
      themes: judgesPrivacy ? themes : [],
      pitch,
      team,
      appType,
      publicUrl,
      demoVideoLength,
      technologies,
      network: judgesPrivacy ? 'testnet (NU7)' : null,
      pool: judgesPrivacy ? 'Orchard, unified addresses' : null,
      testnetTxid,
      nextStep,
      nextStepLinks,
      frictionNotes,
      frictionAreas,
      anonymous: d.anonymous === true,
    },
  };
}
