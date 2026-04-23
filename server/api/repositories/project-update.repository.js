import { supabase } from '../../db.js';

const transformUpdate = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    body: row.body,
    linkUrl: row.link_url,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
};

class ProjectUpdateRepository {
  async listByProject(projectId, { limit = 100 } = {}) {
    const { data, error } = await supabase
      .from('project_updates')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(transformUpdate);
  }

  async create({ projectId, body, linkUrl, createdBy }) {
    const { data, error } = await supabase
      .from('project_updates')
      .insert({
        project_id: projectId,
        body,
        link_url: linkUrl || null,
        created_by: createdBy,
      })
      .select('*')
      .single();
    if (error) throw error;
    return transformUpdate(data);
  }
}

export default new ProjectUpdateRepository();
