import { supabase } from '../../db.js';
import { createTtlCache } from '../utils/ttl-cache.js';
import { clearProjectListCache } from '../utils/project-list-cache.js';

// Every column transformProgram reads. Deliberately NOT stats_snapshot: that
// JSONB is large and only getStatsSnapshot needs it. Never select('*') here.
const PROGRAM_COLUMNS = [
  'id', 'name', 'slug', 'program_type', 'description', 'status', 'owner',
  'applications_open_at', 'applications_close_at', 'event_starts_at', 'event_ends_at',
  'location', 'max_applicants', 'event_url', 'cover_image_url', 'content', 'prize_tiers',
  'results_published_at', 'results_ranking', 'stats_published_at', 'luma_event_id',
  'last_guest_sync_at', 'last_guest_sync_status', 'honorary_mentions', 'gallery_url',
  'judging_in_progress', 'created_at', 'updated_at',
].join(',');

// Program rows are public (GET /api/programs/:slug has no auth), so a short
// shared cache is safe. It saves the lookup that almost every request makes
// (auth middleware + controller). Writes through this repo clear it at once;
// other server instances see changes within the TTL.
const PROGRAM_CACHE_TTL_MS = 30_000;
const programCache = createTtlCache(PROGRAM_CACHE_TTL_MS);
const statsSnapshotCache = createTtlCache(PROGRAM_CACHE_TTL_MS);
const clone = (v) => (v == null ? v : structuredClone(v));
const cached = async (key, load) => {
  const hit = programCache.get(key);
  if (hit !== undefined) return clone(hit);
  const value = await load();
  programCache.set(key, value);
  return clone(value);
};
// Project lists embed program fields (name, status, dates), so clear them too.
const invalidate = () => {
  programCache.clear();
  clearProjectListCache();
};

// Transform Supabase row (snake_case) to API format (camelCase).
const transformProgram = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    programType: row.program_type,
    description: row.description,
    status: row.status,
    owner: row.owner,
    applicationsOpenAt: row.applications_open_at,
    applicationsCloseAt: row.applications_close_at,
    eventStartsAt: row.event_starts_at,
    eventEndsAt: row.event_ends_at,
    location: row.location,
    maxApplicants: row.max_applicants,
    eventUrl: row.event_url ?? null,
    coverImageUrl: row.cover_image_url ?? null,
    content: row.content ?? null,
    prizeTiers: row.prize_tiers ?? null,
    resultsPublishedAt: row.results_published_at ?? null,
    resultsRanking: row.results_ranking ?? null,
    // The stats snapshot itself is read with getStatsSnapshot (it's large).
    statsPublishedAt: row.stats_published_at ?? null,
    lumaEventId: row.luma_event_id ?? null,
    lastGuestSyncAt: row.last_guest_sync_at ?? null,
    lastGuestSyncStatus: row.last_guest_sync_status ?? null,
    honoraryMentions: row.honorary_mentions ?? null,
    galleryUrl: row.gallery_url ?? null,
    judgingInProgress: row.judging_in_progress ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toSnakeCase = (data) => {
  const row = {};
  if ('id' in data) row.id = data.id;
  if ('name' in data) row.name = data.name;
  if ('slug' in data) row.slug = data.slug;
  if ('programType' in data) row.program_type = data.programType;
  if ('description' in data) row.description = data.description ?? null;
  if ('status' in data) row.status = data.status;
  if ('owner' in data) row.owner = data.owner ?? 'webzero';
  if ('applicationsOpenAt' in data) row.applications_open_at = data.applicationsOpenAt ?? null;
  if ('applicationsCloseAt' in data) row.applications_close_at = data.applicationsCloseAt ?? null;
  if ('eventStartsAt' in data) row.event_starts_at = data.eventStartsAt ?? null;
  if ('eventEndsAt' in data) row.event_ends_at = data.eventEndsAt ?? null;
  if ('location' in data) row.location = data.location ?? null;
  if ('maxApplicants' in data) row.max_applicants = data.maxApplicants ?? null;
  if ('eventUrl' in data) row.event_url = data.eventUrl ?? null;
  if ('coverImageUrl' in data) row.cover_image_url = data.coverImageUrl ?? null;
  if ('content' in data) row.content = data.content ?? null;
  if ('prizeTiers' in data) row.prize_tiers = data.prizeTiers ?? null;
  // Normalize an empty/whitespace luma_event_id to null (gate stays off).
  if ('lumaEventId' in data) {
    const v = typeof data.lumaEventId === 'string' ? data.lumaEventId.trim() : data.lumaEventId;
    row.luma_event_id = v || null;
  }
  if ('honoraryMentions' in data) row.honorary_mentions = data.honoraryMentions ?? null;
  if ('galleryUrl' in data) row.gallery_url = data.galleryUrl ?? null;
  if ('judgingInProgress' in data) row.judging_in_progress = !!data.judgingInProgress;
  return row;
};

class ProgramRepository {
  async list({ status } = {}) {
    return cached(`list:${status ?? ''}`, async () => {
      let query = supabase.from('programs').select(PROGRAM_COLUMNS).order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(transformProgram);
    });
  }

  async findById(id) {
    return cached(`id:${id}`, async () => {
      const { data, error } = await supabase.from('programs').select(PROGRAM_COLUMNS).eq('id', id).maybeSingle();
      if (error) throw error;
      return transformProgram(data);
    });
  }

  async findBySlug(slug) {
    return cached(`slug:${slug}`, async () => {
      const { data, error } = await supabase.from('programs').select(PROGRAM_COLUMNS).eq('slug', slug).maybeSingle();
      if (error) throw error;
      return transformProgram(data);
    });
  }

  async create(payload) {
    const row = toSnakeCase(payload);
    const { data, error } = await supabase.from('programs').insert(row).select(PROGRAM_COLUMNS).single();
    invalidate();
    if (error) throw error;
    return transformProgram(data);
  }

  async updateBySlug(slug, patch) {
    const row = toSnakeCase(patch);
    row.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('programs')
      .update(row)
      .eq('slug', slug)
      .select(PROGRAM_COLUMNS)
      .single();
    invalidate();
    if (error) throw error;
    return transformProgram(data);
  }

  // Record the outcome of a Luma guest sync. `status` is a short machine string
  // ('ok', 'empty_guard', 'truncated', 'error:<reason>') the admin UI surfaces.
  // We always stamp last_guest_sync_at so the gate's TTL advances even on a
  // guarded/failed sweep (prevents a hot retry loop on every miss).
  async setGuestSyncState(programId, { syncedAt, status }) {
    const { error } = await supabase
      .from('programs')
      .update({ last_guest_sync_at: syncedAt, last_guest_sync_status: status })
      .eq('id', programId);
    invalidate();
    if (error) throw error;
  }

  // Publish/unpublish the public results: set or clear results_published_at,
  // with the ranking snapshot (how each track was ranked) stored alongside.
  async setResultsPublished(slug, publishedAt, ranking = null) {
    const { data, error } = await supabase
      .from('programs')
      .update({ results_published_at: publishedAt, results_ranking: ranking, updated_at: new Date().toISOString() })
      .eq('slug', slug)
      .select(PROGRAM_COLUMNS)
      .single();
    invalidate();
    if (error) throw error;
    return transformProgram(data);
  }

  // The published stats snapshot, or null.
  async getStatsSnapshot(slug) {
    const hit = statsSnapshotCache.get(slug);
    if (hit !== undefined) return clone(hit);
    const { data, error } = await supabase.from('programs').select('stats_snapshot').eq('slug', slug).maybeSingle();
    if (error) throw error;
    statsSnapshotCache.set(slug, data?.stats_snapshot ?? null);
    return clone(data?.stats_snapshot ?? null);
  }

  // Publish the stats page: store the snapshot and when it was taken.
  async setStatsSnapshot(slug, snapshot, publishedAt) {
    const { data, error } = await supabase
      .from('programs')
      .update({ stats_snapshot: snapshot, stats_published_at: publishedAt, updated_at: new Date().toISOString() })
      .eq('slug', slug)
      .select(PROGRAM_COLUMNS)
      .single();
    statsSnapshotCache.delete(slug);
    invalidate();
    if (error) throw error;
    return transformProgram(data);
  }

  // Tests: drop every cached program row.
  clearCache() {
    invalidate();
    statsSnapshotCache.clear();
  }
}

export default new ProgramRepository();
