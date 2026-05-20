import { supabase } from '../../db.js';
import { normalizeAddress } from '../auth/normalize.js';

const transform = (row) => {
  if (!row) return null;
  return {
    programId: row.program_id,
    walletChain: row.wallet_chain,
    wallet: row.wallet,
    createdAt: row.created_at,
  };
};

class ProgramAdminRepository {
  async list(programId) {
    const { data, error } = await supabase
      .from('program_admins')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(transform);
  }

  async add(programId, walletChain, walletAddress) {
    const normalized = normalizeAddress(walletChain, walletAddress);
    if (!normalized) return null;
    const { data, error } = await supabase
      .from('program_admins')
      .upsert(
        { program_id: programId, wallet_chain: walletChain, wallet: normalized },
        { onConflict: 'program_id,wallet_chain,wallet' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  async remove(programId, walletChain, walletAddress) {
    const normalized = normalizeAddress(walletChain, walletAddress);
    if (!normalized) return false;
    const { error } = await supabase
      .from('program_admins')
      .delete()
      .eq('program_id', programId)
      .eq('wallet_chain', walletChain)
      .eq('wallet', normalized);
    if (error) throw error;
    return true;
  }

  async isAdmin(programId, walletChain, walletAddress) {
    const normalized = normalizeAddress(walletChain, walletAddress);
    if (!normalized) return false;
    const { data, error } = await supabase
      .from('program_admins')
      .select('wallet')
      .eq('program_id', programId)
      .eq('wallet_chain', walletChain)
      .eq('wallet', normalized)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }
}

export default new ProgramAdminRepository();
