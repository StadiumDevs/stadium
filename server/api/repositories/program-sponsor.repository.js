import { supabase } from '../../db.js';

// Transform Supabase row (snake_case) to API format (camelCase).
const transformSponsor = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    programId: row.program_id,
    name: row.name,
    submissionTarget: row.submission_target,
    targetProfiles: Array.isArray(row.target_profiles) ? row.target_profiles : [],
    applicationInstructions: row.application_instructions,
    followUpNotes: row.follow_up_notes,
    applyUrl: row.apply_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const toSnakeCase = (data) => {
  const row = {};
  if ('programId' in data) row.program_id = data.programId;
  if ('name' in data) row.name = data.name;
  if ('submissionTarget' in data) row.submission_target = data.submissionTarget ?? null;
  if ('targetProfiles' in data) row.target_profiles = Array.isArray(data.targetProfiles) ? data.targetProfiles : [];
  if ('applicationInstructions' in data) row.application_instructions = data.applicationInstructions ?? null;
  if ('followUpNotes' in data) row.follow_up_notes = data.followUpNotes ?? null;
  if ('applyUrl' in data) row.apply_url = data.applyUrl ?? null;
  return row;
};

class ProgramSponsorRepository {
  async listByProgramId(programId) {
    const { data, error } = await supabase
      .from('program_sponsors')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(transformSponsor);
  }

  async findById(id) {
    const { data, error } = await supabase
      .from('program_sponsors')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return transformSponsor(data);
  }

  async create(payload) {
    const row = toSnakeCase(payload);
    const { data, error } = await supabase
      .from('program_sponsors')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    return transformSponsor(data);
  }

  async update(id, patch) {
    const row = toSnakeCase(patch);
    row.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('program_sponsors')
      .update(row)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transformSponsor(data);
  }

  async delete(id) {
    const { error } = await supabase
      .from('program_sponsors')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
}

export default new ProgramSponsorRepository();
