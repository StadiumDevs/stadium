import { supabase } from '../../db.js';

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
  return row;
};

class ProgramRepository {
  async list({ status } = {}) {
    let query = supabase.from('programs').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(transformProgram);
  }

  async findById(id) {
    const { data, error } = await supabase.from('programs').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return transformProgram(data);
  }

  async findBySlug(slug) {
    const { data, error } = await supabase.from('programs').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return transformProgram(data);
  }

  async create(payload) {
    const row = toSnakeCase(payload);
    const { data, error } = await supabase.from('programs').insert(row).select('*').single();
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
      .select('*')
      .single();
    if (error) throw error;
    return transformProgram(data);
  }
}

export default new ProgramRepository();
