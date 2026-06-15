// Mirrors an event's checked-in Luma guests into program_signups so the
// submission gate can verify "only checked-in attendees may submit" without us
// hosting a guest CSV. Pull model: lazy (on a submission cache-miss) + manual
// ("Sync now"). No background timer — freshness only matters at submit time,
// which is exactly when the gate triggers a sync. See luma.client.js.

import { fetchCheckedIn, isConfigured } from './luma.client.js';
import signupRepository from '../repositories/program-signup.repository.js';
import programRepository from '../repositories/program.repository.js';

// One in-flight sync per program. Concurrent submitters that all miss the cache
// share a single Luma sweep instead of stampeding the API.
const inFlight = new Map();

function shortError(err) {
  const msg = (err && err.message ? String(err.message) : 'unknown').slice(0, 60);
  return `error:${msg}`;
}

async function runSync(program) {
  const programId = program.id;
  const eventId = program.lumaEventId;
  let status;
  let result = { total: 0, checkedIn: 0, upserted: 0, removed: 0 };
  try {
    const { total, checkedIn, truncated } = await fetchCheckedIn(eventId);

    if (truncated) {
      // Partial sweep — never trust it enough to overwrite a good cache.
      status = 'truncated';
    } else if (checkedIn.length === 0 && (await signupRepository.countBySource(programId, 'luma_api')) > 0) {
      // Sanity guard: a 0-result sweep against a non-empty cache is almost
      // certainly a wrong event id / revoked key / Luma blip. Keep last-good.
      status = 'empty_guard';
    } else {
      const { upserted, removed } = await signupRepository.replaceLumaGuests(programId, checkedIn);
      status = 'ok';
      result = { total, checkedIn: checkedIn.length, upserted, removed };
    }
  } catch (err) {
    status = shortError(err);
  }

  // Always advance the sync timestamp — even on guard/error — so the gate's TTL
  // moves forward and a stream of cache-misses can't hammer Luma. The live
  // return value (not the stamp) is what the gate reads to detect transients.
  try {
    await programRepository.setGuestSyncState(programId, {
      syncedAt: new Date().toISOString(),
      status,
    });
  } catch {
    // Stamping is best-effort; a failure here must not mask the sync result.
  }
  return { status, ...result };
}

class LumaSyncService {
  // Whether the Luma gate is active for this program: it has an event id AND the
  // server has a LUMA_API_KEY. Until both are true the gate stays in its prior
  // (CSV / test-email) mode so an unconfigured deploy can't lock everyone out.
  isActive(program) {
    return Boolean(program?.lumaEventId) && isConfigured();
  }

  // Sync a program's checked-in guests. Single-flighted per program. Returns
  // { status, total, checkedIn, upserted, removed }. `status` is one of
  // 'ok' | 'truncated' | 'empty_guard' | 'error:<msg>' | 'not_configured'.
  async syncProgram(program) {
    if (!this.isActive(program)) {
      return { status: 'not_configured', total: 0, checkedIn: 0, upserted: 0, removed: 0 };
    }
    const programId = program.id;
    if (inFlight.has(programId)) return inFlight.get(programId);

    const promise = runSync(program).finally(() => inFlight.delete(programId));
    inFlight.set(programId, promise);
    return promise;
  }
}

export default new LumaSyncService();
