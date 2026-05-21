import { supabase } from '../../db.js';

const transform = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    programId: row.program_id,
    actorChain: row.actor_chain,
    actorWallet: row.actor_wallet,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
};

class ProgramAuditLogRepository {
  async listByProgramId(programId, { limit = 100 } = {}) {
    const { data, error } = await supabase
      .from('program_audit_log')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(transform);
  }

  async insert({ programId, actorChain, actorWallet, action, targetType, targetId, metadata }) {
    const { data, error } = await supabase
      .from('program_audit_log')
      .insert({
        program_id: programId,
        actor_chain: actorChain ?? null,
        actor_wallet: actorWallet ?? null,
        action,
        target_type: targetType ?? null,
        target_id: targetId ?? null,
        metadata: metadata ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }
}

export default new ProgramAuditLogRepository();
