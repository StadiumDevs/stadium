// Shared caches for PUBLIC tracked-program data: the public submissions list
// and the published scores. Both are identical for every visitor (no emails,
// no per-user fields), so one copy can serve everyone for a short while
// instead of re-reading every submission and rubric score per page view.
//
// Any write to program_submissions or submission_rubric_scores clears them
// (see the repositories), so this instance never serves data older than its
// own last write; other instances catch up within the TTL.
import { createTtlCache } from './ttl-cache.js';

export const PUBLIC_DATA_TTL_MS = 60_000;

export const publicScoresCache = createTtlCache(PUBLIC_DATA_TTL_MS);
export const publicSubmissionsCache = createTtlCache(PUBLIC_DATA_TTL_MS);

export function clearPublicDataCaches() {
  publicScoresCache.clear();
  publicSubmissionsCache.clear();
}
