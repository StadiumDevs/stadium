import { supabase } from '../../db.js';
import { generateId } from '../utils/id.js';

// Luma email is the natural key within a program; store it lowercased so the
// per-program UNIQUE constraint is case-insensitive.
const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const transform = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    programId: row.program_id,
    submitterName: row.submitter_name,
    lumaEmail: row.luma_email,
    projectTitle: row.project_title,
    videoUrl: row.video_url,
    githubUrl: row.github_url,
    promotedProjectId: row.promoted_project_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

class ProgramSubmissionRepository {
  async listByProgramId(programId) {
    const { data, error } = await supabase
      .from('program_submissions')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(transform);
  }

  async findById(id) {
    const { data, error } = await supabase
      .from('program_submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  async findByEmail(programId, email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const { data, error } = await supabase
      .from('program_submissions')
      .select('*')
      .eq('program_id', programId)
      .eq('luma_email', normalized)
      .maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  // Returns { submission, duplicate }. Duplicate is decided up front (one
  // submission per Luma email per program) so the controller can answer 409
  // without leaning on the DB error text.
  async create({ programId, submitterName, lumaEmail, projectTitle, videoUrl, githubUrl }) {
    const normalized = normalizeEmail(lumaEmail);
    const existing = await this.findByEmail(programId, normalized);
    if (existing) return { submission: existing, duplicate: true };

    const { data, error } = await supabase
      .from('program_submissions')
      .insert({
        id: generateId(projectTitle),
        program_id: programId,
        submitter_name: submitterName,
        luma_email: normalized,
        project_title: projectTitle,
        video_url: videoUrl,
        github_url: githubUrl,
      })
      .select('*')
      .single();
    if (error) throw error;
    return { submission: transform(data), duplicate: false };
  }

  async setPromotedProject(id, projectId) {
    const { data, error } = await supabase
      .from('program_submissions')
      .update({ promoted_project_id: projectId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  async countByProgramId(programId) {
    const { count, error } = await supabase
      .from('program_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId);
    if (error) throw error;
    return count ?? 0;
  }
}

export default new ProgramSubmissionRepository();
