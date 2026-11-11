// Shared cache for the PUBLIC project list (GET /api/m2-program). The response
// is the same for every caller (no auth, no per-user fields), so one copy per
// query can serve everyone for a short while. Single-project reads are NOT
// cached: requireTeamMemberOrAdmin authorizes from getProjectById's team list.
//
// Cleared by every write in project.repository.js and program.repository.js
// (projects embed program fields), so this instance never serves data older
// than its own last write; other instances catch up within the TTL.
import { createTtlCache } from './ttl-cache.js';

export const PROJECT_LIST_TTL_MS = 60_000;
export const projectListCache = createTtlCache(PROJECT_LIST_TTL_MS);
export const clearProjectListCache = () => projectListCache.clear();
