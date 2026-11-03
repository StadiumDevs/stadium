// Validation for public project submissions and judge scores.
// Pure functions — no DB, no I/O — so they're trivially unit-testable and
// reusable from the controller.

import { RUBRICS, RUBRIC_CHECKS } from '../constants/rubrics.js';
import { EXPERIENCE_RATING_CATEGORIES, RATING_MIN, RATING_MAX } from '../constants/experienceRatings.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CONTACT_APPS = ['telegram', 'whatsapp'];
const TELEGRAM_RE = /^@?[A-Za-z0-9_]{5,32}$/;
const WHATSAPP_RE = /^\+?\d[\d\s().-]{6,19}$/;

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

// A link typed without a scheme ("github.com/x", common on phones) gets
// https:// in front; anything with a scheme is left for isHttpUrl to judge.
export const withScheme = (v) => {
  const s = str(v);
  if (!s || /^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  // Only something that looks like a domain ("github.com/…"); "not-a-url" stays invalid.
  const bare = s.replace(/^\/+/, '');
  return /^[^\s/.]+(\.[^\s/.]+)+(\/|$)/.test(bare) ? `https://${bare}` : s;
};

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

// The answers the Bitrefill survey must have to finalize (couldntHandle is
// optional). Run on a feedback object already normalized by validateFeedback
// (or one stored that way). Returns { ok } or { ok: false, error }.
const SURVEY_REQUIRED_KEYS = [
  ['agentEnv', 'which agent environment you used'],
  ['deadlineStatus', 'where you landed by the deadline'],
  ['biggestBlocker', 'your biggest blocker'],
  ['wouldKeepBuilding', 'whether you would keep building on Bitrefill'],
];
const SURVEY_ERROR = 'Agentic Commerce entries need the Bitrefill survey';
export function validateRequiredSurvey(feedback) {
  const fb = feedback && typeof feedback === 'object' && !Array.isArray(feedback) ? feedback : {};
  const surfaces = Array.isArray(fb.surfaces) ? fb.surfaces.filter((x) => typeof x === 'string' && x.trim()) : [];
  if (surfaces.length === 0) return { ok: false, error: `${SURVEY_ERROR}: which Bitrefill surfaces you built with` };
  if (!fb.surfacesPrimary || !surfaces.includes(fb.surfacesPrimary)) {
    return { ok: false, error: `${SURVEY_ERROR}: star the surface you relied on most` };
  }
  for (const [key, what] of SURVEY_REQUIRED_KEYS) {
    if (typeof fb[key] !== 'string' || !fb[key].trim()) return { ok: false, error: `${SURVEY_ERROR}: ${what}` };
  }
  return { ok: true };
}

// Tracked programs: the survey belongs to some tracks only (FSH: Agentic and
// Both, `bitrefillSurveyTracks`). Mutates `value` (validateSubmission's output):
// other tracks store no survey; a save that didn't send one keeps what's
// stored (the key is dropped so the update leaves it alone); finalizing a
// survey track needs a complete one (sent now, or `stored`).
// `sent`: the request body had a feedback object. Returns { ok } or { ok: false, error }.
const hasSurveyAnswers = (fb) =>
  !!fb && ((Array.isArray(fb.surfaces) && fb.surfaces.length > 0) || Object.values(fb).some((v) => typeof v === 'string' && v.trim()));

export function applyTrackedSurvey(config, track, value, { sent, draft = false, stored = null } = {}) {
  const tracks = config?.bitrefillSurveyTracks;
  if (!tracks) return { ok: true };
  if (track && !tracks.includes(track)) {
    value.feedback = null;
    return { ok: true };
  }
  // A draft save with a blank survey (e.g. an older device copy restored
  // without it) never wipes answers already stored.
  if (sent && draft && !hasSurveyAnswers(value.feedback)) sent = false;
  if (!sent) delete value.feedback;
  if (!draft && track) {
    const check = validateRequiredSurvey(sent ? value.feedback : stored);
    if (!check.ok) return check;
  }
  return { ok: true };
}

// Validate the builder's event ratings: { overall: 4, organisation: 5, ... }.
// Every category is required unless `required` is false (then an absent object
// is fine, but a present one must still be complete and valid). Returns
// { ok, value } where value is null or the normalized ratings, or { ok: false, error }.
export function validateExperienceRatings(ratings, { required = true } = {}) {
  if (ratings === undefined || ratings === null) {
    return required ? { ok: false, error: 'Please rate the event (every category, 1 to 5)' } : { ok: true, value: null };
  }
  if (typeof ratings !== 'object' || Array.isArray(ratings)) {
    return { ok: false, error: 'ratings must be an object' };
  }
  for (const key of Object.keys(ratings)) {
    if (!EXPERIENCE_RATING_CATEGORIES.includes(key)) {
      return { ok: false, error: `Unknown rating category: ${String(key).slice(0, 64)}` };
    }
  }
  const out = {};
  for (const key of EXPERIENCE_RATING_CATEGORIES) {
    const v = ratings[key];
    if (!Number.isInteger(v) || v < RATING_MIN || v > RATING_MAX) {
      return { ok: false, error: `Please rate the event (every category, ${RATING_MIN} to ${RATING_MAX})` };
    }
    out[key] = v;
  }
  return { ok: true, value: out };
}

// Returns { ok: true, value } with trimmed/normalized fields, or
// { ok: false, error } with a human-readable message.
// `videoOptional`: a tracked track where the demo video is optional (stored as '').
export const EVENT_LIKED_MAX = 500;

// `ratingsOptional`: accept a body without event ratings (refusals stored before
// ratings existed, drafts, and updates after the feedback was submitted).
// `draft`: a tracked draft save. Only the name, email and title are required;
// anything else present must still be well-formed.
export function validateSubmission(body = {}, { videoOptional = false, ratingsOptional = false, draft = false } = {}) {
  const submitterName = str(body.submitterName);
  const lumaEmail = str(body.lumaEmail);
  const projectTitle = str(body.projectTitle);
  const projectBrief = str(body.projectBrief);
  const videoUrl = withScheme(body.videoUrl);
  const githubUrl = withScheme(body.githubUrl);

  if (!submitterName || submitterName.length > 200) {
    return { ok: false, error: 'Your name is required (max 200 characters)' };
  }
  if (!lumaEmail || !EMAIL_RE.test(lumaEmail)) {
    return { ok: false, error: 'A valid email is required' };
  }
  if (!projectTitle || projectTitle.length > 200) {
    return { ok: false, error: 'A project title is required (max 200 characters)' };
  }
  if ((!draft && !projectBrief) || projectBrief.length > BRIEF_MAX) {
    return { ok: false, error: `A short brief of what your project does is required (max ${BRIEF_MAX} characters)` };
  }
  if (videoUrl ? !isHttpUrl(videoUrl) : !(videoOptional || draft)) {
    return { ok: false, error: 'A valid video demo link (http/https) is required' };
  }
  if (githubUrl ? !isHttpUrl(githubUrl) : !draft) {
    return { ok: false, error: 'A valid GitHub URL (http/https) is required' };
  }

  const fb = validateFeedback(body.feedback);
  if (!fb.ok) return { ok: false, error: fb.error };

  const rt = validateExperienceRatings(body.ratings, { required: !(ratingsOptional || draft) });
  if (!rt.ok) return { ok: false, error: rt.error };

  // Optional: "Anything you especially liked about the event?"
  const eventLiked = str(body.eventLiked);
  if (eventLiked.length > EVENT_LIKED_MAX) {
    return { ok: false, error: `What you liked about the event is max ${EVENT_LIKED_MAX} characters` };
  }

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
      ratings: rt.value,
      eventLiked: eventLiked || null,
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
// integer min..max (min defaults to 0) or null (not scored yet), so a judge's work can autosave.
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
    const min = c.min ?? 0;
    if (!Number.isInteger(value) || value < min || value > c.max) {
      return { ok: false, error: `${key} must be a whole number between ${min} and ${c.max}` };
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
// dropped, and server-set fields (txCheck, milestone) are never
// taken from the client.
export const PITCH_MAX = 140;
const TXID_RE = /^[0-9a-f]{64}$/i;
// Optional unified full viewing key (testnet) and the wallet's birth height,
// so judges can see the payment's amount and memo. Never public.
const VIEWING_KEY_RE = /^uviewtest[0-9a-z]+$/i;
export const VIEWING_KEY_MAX = 1000;
const isApp = (appType) => /app/i.test(appType);
const strList = (v) => (Array.isArray(v) ? v : []);
export const PRIVACY_NOTE_MAX = 3000;
export const BITREFILL_FEEDBACK_MAX = 2000;

// Whether the demo video is optional for this submission (tracked programs
// only: the Privacy track). Called before validateSubmission.
export const videoOptionalFor = (config, details) =>
  !!config && (config.videoOptionalTracks ?? []).includes(str(details?.track));

// `draft`: a draft save. Required fields may be missing; whatever is present is
// still checked (lengths, formats, known themes and app types).
export function validateSubmissionDetails(config, details, { draft = false } = {}) {
  if (!config) return { ok: false, error: 'This program does not take tracked submissions' };
  if (draft && (details === undefined || details === null)) details = {};
  if (!details || typeof details !== 'object' || Array.isArray(details)) {
    return { ok: false, error: 'Submission details are required for this program' };
  }
  const d = details;
  const track = str(d.track);
  const need = !draft;
  if (track ? !config.submissionTracks.includes(track) : need) return { ok: false, error: 'Choose a track' };
  const judgesPrivacy = track !== 'agentic';

  const themes = strList(d.themes).map(str).filter(Boolean);
  if (themes.some((t) => !config.themes.includes(t))) return { ok: false, error: 'Unknown theme' };
  if (need && judgesPrivacy && themes.length === 0) return { ok: false, error: 'Pick at least one theme' };

  const pitch = str(d.pitch);
  if (need && !pitch) return { ok: false, error: 'A one-line pitch is required' };
  if (pitch.length > PITCH_MAX) return { ok: false, error: `The pitch must be ${PITCH_MAX} characters or fewer` };

  if (!Array.isArray(d.team ?? [])) return { ok: false, error: 'team must be a list' };
  const rawTeam = d.team ?? [];
  if (rawTeam.length > config.maxTeam) {
    return { ok: false, error: `Solo or a team of up to ${config.maxTeam + 1}: at most ${config.maxTeam} teammates besides the point person` };
  }
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
  if (appType ? !config.appTypes.includes(appType) : need) return { ok: false, error: 'Say what kind of project it is' };
  const publicUrl = withScheme(d.publicUrl) || null;
  if (publicUrl && !isHttpUrl(publicUrl)) return { ok: false, error: 'The public URL must start with http:// or https://' };
  if (need && isApp(appType) && !publicUrl) return { ok: false, error: 'Apps need a public URL (http/https)' };

  const demoVideoLength = str(d.demoVideoLength) || null;
  if (demoVideoLength && demoVideoLength.length > 10) return { ok: false, error: 'Video length is max 10 characters (e.g. 1:54)' };

  const technologies = strList(d.technologies).map(str).filter(Boolean);
  if (need && technologies.length === 0) return { ok: false, error: 'List every technology you used' };
  if (technologies.length > 20 || technologies.some((t) => t.length > 60)) {
    return { ok: false, error: 'Technologies: at most 20, each max 60 characters' };
  }

  // A draft with no track yet keeps every track's fields.
  const txidTrack = config.txidTracks.includes(track) || (draft && !track);
  const testnetTxid = txidTrack ? str(d.testnetTxid) || null : null;
  if (need && txidTrack && !testnetTxid) return { ok: false, error: 'Privacy entries need one testnet transaction id' };
  if (testnetTxid && !TXID_RE.test(testnetTxid)) {
    return { ok: false, error: 'A testnet transaction id is 64 hex characters' };
  }

  const viewingKey = txidTrack ? str(d.viewingKey) || null : null;
  if (viewingKey && (viewingKey.length > VIEWING_KEY_MAX || !VIEWING_KEY_RE.test(viewingKey))) {
    return { ok: false, error: 'The viewing key must start with uviewtest (a testnet unified full viewing key)' };
  }
  const rawBirth = txidTrack ? d.birthHeight : null;
  let birthHeight = null;
  if (rawBirth !== undefined && rawBirth !== null && rawBirth !== '') {
    const b = typeof rawBirth === 'number' ? String(rawBirth) : str(rawBirth);
    if (!/^\d{1,10}$/.test(b)) return { ok: false, error: 'The wallet birth height must be a whole number' };
    birthHeight = Number(b);
  }

  const nextStep = str(d.nextStep);
  if (need && !nextStep) return { ok: false, error: 'A next milestone for the 30 days is required' };
  if (nextStep.length > 1000) return { ok: false, error: 'The next milestone is max 1000 characters' };
  const nextStepLinks = strList(d.nextStepLinks).map(withScheme).filter(Boolean);
  if (nextStepLinks.length > 10) return { ok: false, error: 'At most 10 next-milestone links' };
  if (nextStepLinks.some((l) => !isHttpUrl(l))) {
    return { ok: false, error: 'Each next-milestone link must start with http:// or https://' };
  }

  // Builder feedback is free text (no area tags; any old frictionAreas are ignored).
  const frictionNotes = str(d.frictionNotes) || null;
  if (frictionNotes && frictionNotes.length > 2000) return { ok: false, error: 'Friction notes are max 2000 characters' };

  // Privacy and trust note: judges score Private from it.
  const noteTrack = (config.privacyNoteTracks ?? []).includes(track) || (draft && !track);
  const privacyNote = noteTrack ? str(d.privacyNote) || null : null;
  if (need && noteTrack && !privacyNote) {
    return { ok: false, error: 'Privacy entries need a privacy and trust note' };
  }
  if (privacyNote && privacyNote.length > PRIVACY_NOTE_MAX) {
    return { ok: false, error: `The privacy and trust note is max ${PRIVACY_NOTE_MAX} characters` };
  }

  // Bitrefill feedback (Agentic Commerce): what worked, what didn't.
  const feedbackTrack = (config.bitrefillFeedbackTracks ?? []).includes(track) || (draft && !track);
  let bitrefillFeedback = null;
  if (feedbackTrack) {
    const raw = d.bitrefillFeedback && typeof d.bitrefillFeedback === 'object' ? d.bitrefillFeedback : {};
    const worked = str(raw.worked);
    const didnt = str(raw.didnt);
    if (need && (!worked || !didnt)) {
      return { ok: false, error: "Agentic Commerce entries need the Bitrefill feedback: what worked and what didn't" };
    }
    if (worked.length > BITREFILL_FEEDBACK_MAX || didnt.length > BITREFILL_FEEDBACK_MAX) {
      return { ok: false, error: `Each Bitrefill feedback answer is max ${BITREFILL_FEEDBACK_MAX} characters` };
    }
    bitrefillFeedback = worked || didnt ? { worked, didnt } : null;
  }

  // Telegram or WhatsApp, to reach the top teams on demo day. Admins only.
  const rawContact = d.contact && typeof d.contact === 'object' && !Array.isArray(d.contact) ? d.contact : {};
  const contactApp = str(rawContact.app);
  let contactHandle = str(rawContact.handle);
  let contact = null;
  if (contactApp || contactHandle) {
    if (!CONTACT_APPS.includes(contactApp)) return { ok: false, error: 'Choose Telegram or WhatsApp for the contact' };
    if (!contactHandle) return { ok: false, error: 'A Telegram or WhatsApp contact is required' };
    if (contactApp === 'telegram') {
      if (!TELEGRAM_RE.test(contactHandle)) {
        return { ok: false, error: 'A Telegram username is 5–32 letters, digits or _ (e.g. @username)' };
      }
      contactHandle = contactHandle.replace(/^@/, '');
    } else if (!WHATSAPP_RE.test(contactHandle)) {
      return { ok: false, error: 'A WhatsApp number needs the country code (e.g. +41 79 123 45 67)' };
    }
    contact = { app: contactApp, handle: contactHandle };
  } else if (need) {
    return { ok: false, error: 'A Telegram or WhatsApp contact is required' };
  }

  if (d.anonymous !== undefined && typeof d.anonymous !== 'boolean') {
    return { ok: false, error: 'anonymous must be true or false' };
  }

  return {
    ok: true,
    value: {
      track: track || null,
      themes: judgesPrivacy ? themes : [],
      pitch,
      team,
      appType,
      publicUrl,
      demoVideoLength,
      technologies,
      network: judgesPrivacy ? 'testnet (NU7)' : null,
      pool: judgesPrivacy ? 'shielded (Ironwood), unified addresses' : null,
      testnetTxid,
      viewingKey,
      birthHeight,
      nextStep,
      nextStepLinks,
      frictionNotes,
      privacyNote,
      bitrefillFeedback,
      contact,
      anonymous: d.anonymous === true,
    },
  };
}

// Ecosystem Prize milestone edits. Builders (verified email) may change only
// the sentence and the delivery link; admins may change everything.
const MILESTONE_BUILDER_KEYS = ['sentence', 'deliveryLink'];
const MILESTONE_ADMIN_KEYS = [
  ...MILESTONE_BUILDER_KEYS,
  'partnerName',
  'partnerProject',
  'agreedAt',
  'checkedInAt',
  'partnerConfirmed',
  'partnerConfirmedAt',
  'loungeDate',
  'payoutStatus',
  'payoutReleasedAt',
];
const MILESTONE_DATE_KEYS = ['agreedAt', 'checkedInAt', 'partnerConfirmedAt', 'loungeDate', 'payoutReleasedAt'];
const PAYOUT_STATUSES = ['pending', 'released', 'not_completed'];

export function validateMilestonePatch(patch, role) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, error: 'A milestone update is required' };
  }
  const allowed = role === 'admin' ? MILESTONE_ADMIN_KEYS : MILESTONE_BUILDER_KEYS;
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    if (!allowed.includes(key)) {
      return { ok: false, error: role === 'admin' ? `Unknown milestone field: ${key}` : `Builders can only change the sentence and the delivery link` };
    }
    if (key === 'sentence') {
      const v = str(value);
      if (!v || v.length > 500) return { ok: false, error: 'The milestone sentence is required (max 500 characters)' };
      out.sentence = v;
    } else if (key === 'deliveryLink') {
      const v = str(value);
      if (v && !isHttpUrl(v)) return { ok: false, error: 'The delivery link must start with http:// or https://' };
      out.deliveryLink = v || null;
    } else if (MILESTONE_DATE_KEYS.includes(key)) {
      if (value === null || value === '') out[key] = null;
      else if (typeof value === 'string' && Number.isFinite(Date.parse(value))) out[key] = value;
      else return { ok: false, error: `${key} must be a date or null` };
    } else if (key === 'partnerConfirmed') {
      if (value !== null && typeof value !== 'boolean') return { ok: false, error: 'partnerConfirmed must be true, false or null' };
      out.partnerConfirmed = value;
    } else if (key === 'payoutStatus') {
      if (!PAYOUT_STATUSES.includes(value)) return { ok: false, error: `payoutStatus must be one of ${PAYOUT_STATUSES.join(', ')}` };
      out.payoutStatus = value;
    } else {
      const v = str(value);
      if (v.length > 200) return { ok: false, error: `${key} is max 200 characters` };
      out[key] = v || null;
    }
  }
  return { ok: true, value: out };
}
