import crypto from 'crypto';

// Slugify arbitrary text to lowercase kebab-case
export const generateSlug = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// IDs (and so page URLs like /programs/:slug/projects/:id) keep at most this
// many words of the slug before the random suffix: long project titles made
// unwieldy URLs.
export const MAX_ID_WORDS = 6;

const limitWords = (slug, maxWords = MAX_ID_WORDS) => slug.split('-').filter(Boolean).slice(0, maxWords).join('-');

// The random suffix generateId appends by default (3 bytes = 6 hex chars).
const SUFFIX_RE = /^[0-9a-f]{6}$/;
const SLUG_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The URL form of an ID: the first MAX_ID_WORDS words plus its random suffix,
 * e.g. 'zcash-now-a-keyless-mcp-server-…-70fbde' -> 'zcash-now-a-keyless-mcp-server-70fbde'.
 * IDs that are already short, or not slug-plus-suffix, come back unchanged.
 * Mirrored by client/src/lib/projectUrl.ts.
 */
export const shortenId = (id, maxWords = MAX_ID_WORDS) => {
  if (typeof id !== 'string' || !SLUG_ID_RE.test(id)) return id;
  const parts = id.split('-');
  const suffix = parts[parts.length - 1];
  if (parts.length - 1 <= maxWords || !SUFFIX_RE.test(suffix)) return id;
  return [...parts.slice(0, maxWords), suffix].join('-');
};

/**
 * For a shortened ID, the parts needed to find the full one: { prefix, suffix }
 * (full ID = prefix-<more words>-suffix). null when the value can't be a
 * shortened ID (wrong shape, or not exactly MAX_ID_WORDS words).
 */
export const parseShortId = (value, maxWords = MAX_ID_WORDS) => {
  if (typeof value !== 'string' || !SLUG_ID_RE.test(value)) return null;
  const parts = value.split('-');
  const suffix = parts[parts.length - 1];
  if (parts.length - 1 !== maxWords || !SUFFIX_RE.test(suffix)) return null;
  return { prefix: parts.slice(0, -1).join('-'), suffix };
};

// Create a short hex string; default ~6 chars (3 bytes)
export const generateShortRandom = (numBytes = 3) => crypto.randomBytes(numBytes).toString('hex');

// General-purpose ID generator for projects, team members, etc.
// Usage: generateId('Project Name'), generateId('Alice', { randomBytes: 4 })
export const generateId = (text, options = {}) => {
  const { randomBytes = 3, slugify = true } = options;
  const base = slugify ? (limitWords(generateSlug(text)) || generateShortRandom(6)) : (text || generateShortRandom(6));
  return `${base}-${generateShortRandom(randomBytes)}`;
};