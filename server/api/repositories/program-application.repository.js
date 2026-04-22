import { supabase } from '../../db.js';

const transform = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    programId: row.program_id,
    projectId: row.project_id,
    status: row.status,
    applicationFields: row.application_fields || {},
    submittedBy: row.submitted_by,
    submittedAt: row.submitted_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNotes: row.review_notes,
  };
};

class ProgramApplicationRepository {
  async listByProgram(programId) {
    const { data, error } = await supabase
      .from('program_applications')
      .select('*')
      .eq('program_id', programId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(transform);
  }

  async listByProject(projectId) {
    const { data, error } = await supabase
      .from('program_applications')
      .select('*')
      .eq('project_id', projectId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(transform);
  }

  async findOne({ programId, projectId }) {
    const { data, error } = await supabase
      .from('program_applications')
      .select('*')
      .eq('program_id', programId)
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  async create({ programId, projectId, applicationFields, submittedBy }) {
    const { data, error } = await supabase
      .from('program_applications')
      .insert({
        program_id: programId,
        project_id: projectId,
        status: 'submitted',
        application_fields: applicationFields || {},
        submitted_by: submittedBy,
      })
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  /** Phase 1: used by admin review flow (#47, Block F). */
  async updateStatus({ id, status, reviewedBy, reviewNotes }) {
    const { data, error } = await supabase
      .from('program_applications')
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }
}

export default new ProgramApplicationRepository();
