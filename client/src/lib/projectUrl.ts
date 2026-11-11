// Project page URLs keep at most MAX_ID_WORDS words of the id before its random
// suffix: 'zcash-now-a-keyless-mcp-server-…-70fbde' -> 'zcash-now-a-keyless-mcp-server-70fbde'.
// The server resolves the short form back to the full id; old full links work.
// Mirrors server/api/utils/id.js (shortenId).
export const MAX_ID_WORDS = 6;

const SUFFIX_RE = /^[0-9a-f]{6}$/;
const SLUG_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The URL form of an id; ids already short (or not slug-plus-suffix) are unchanged. */
export function shortenId(id: string): string {
  if (!SLUG_ID_RE.test(id)) return id;
  const parts = id.split("-");
  const suffix = parts[parts.length - 1];
  if (parts.length - 1 <= MAX_ID_WORDS || !SUFFIX_RE.test(suffix)) return id;
  return [...parts.slice(0, MAX_ID_WORDS), suffix].join("-");
}

/** A tracked program's project (winner) page. */
export const projectPath = (programSlug: string, id: string) =>
  `/programs/${programSlug}/projects/${shortenId(id)}`;
