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
}

export default new ProgramRepository();
