// Validation for public project submissions and judge scores.
// Pure functions — no DB, no I/O — so they're trivially unit-testable and
// reusable from the controller.

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

  return {
    ok: true,
    value: { submitterName, lumaEmail, projectTitle, projectBrief, videoUrl, githubUrl },
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

const isIntInRange = (v, { min, max }) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export function validateScore(body = {}) {
  const { requirements, techStack, innovation } = body;
  for (const [key, value] of Object.entries({ requirements, techStack, innovation })) {
    if (!isIntInRange(value, SCORE_BOUNDS[key])) {
      const { min, max } = SCORE_BOUNDS[key];
      return { ok: false, error: `${key} must be an integer between ${min} and ${max}` };
    }
  }
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notes.length > 5000) {
    return { ok: false, error: 'Notes must be 5000 characters or fewer' };
  }
  return { ok: true, value: { requirements, techStack, innovation, notes } };
}
