import { supabase } from '../../db.js';

const transform = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    isSeeking: row.is_seeking,
    fundingType: row.funding_type,
    amountRange: row.amount_range,
    description: row.description,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
};

class FundingSignalRepository {
  async getByProject(projectId) {
    const { data, error } = await supabase
      .from('project_funding_signals')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  /**
   * Upsert by project_id. Matches the UNIQUE (project_id) constraint.
   */
  async upsert({ projectId, isSeeking, fundingType, amountRange, description, updatedBy }) {
    const row = {
      project_id: projectId,
      is_seeking: Boolean(isSeeking),
      funding_type: fundingType || null,
      amount_range: amountRange || null,
      description: description || null,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('project_funding_signals')
      .upsert(row, { onConflict: 'project_id' })
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }
}

export default new FundingSignalRepository();
