import { supabase } from '../../db.js';

const transform = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    currentStatus: row.current_status,
    wantSupport: row.want_support,
    supportFor: row.support_for,
    nextStepUrl: row.next_step_url,
    submittedBy: row.submitted_by,
    submittedByChain: row.submitted_by_chain,
    createdAt: row.created_at,
  };
};

class ProjectContinuationRepository {
  async listByProjectId(projectId) {
    const { data, error } = await supabase
      .from('project_continuations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(transform);
  }

  async create({
    projectId, currentStatus, wantSupport, supportFor, nextStepUrl, submittedBy, submittedByChain,
  }) {
    const { data, error } = await supabase
      .from('project_continuations')
      .insert({
        project_id: projectId,
        current_status: currentStatus,
        want_support: !!wantSupport,
        support_for: supportFor ?? null,
        next_step_url: nextStepUrl ?? null,
        submitted_by: submittedBy,
        submitted_by_chain: submittedByChain,
      })
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }
}

export default new ProjectContinuationRepository();
