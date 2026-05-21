import { supabase } from '../../db.js';
import { normalizeAddress } from '../auth/normalize.js';

const transform = (row) => {
  if (!row) return null;
  return {
    walletChain: row.wallet_chain,
    wallet: row.wallet,
    label: row.label,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
};

class GlobalAdminRepository {
  async list() {
    const { data, error } = await supabase
      .from('global_admins')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(transform);
  }

  async add({ walletChain, wallet, label, addedBy }) {
    const normalized = normalizeAddress(walletChain, wallet);
    if (!normalized) return null;
    const { data, error } = await supabase
      .from('global_admins')
      .upsert(
        {
          wallet_chain: walletChain,
          wallet: normalized,
          label: label ?? null,
          added_by: addedBy ?? null,
        },
        { onConflict: 'wallet_chain,wallet' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  async remove(walletChain, wallet) {
    const normalized = normalizeAddress(walletChain, wallet);
    if (!normalized) return false;
    const { error } = await supabase
      .from('global_admins')
      .delete()
      .eq('wallet_chain', walletChain)
      .eq('wallet', normalized);
    if (error) throw error;
    return true;
  }

  async isGlobalAdmin(walletChain, wallet) {
    const normalized = normalizeAddress(walletChain, wallet);
    if (!normalized) return false;
    const { data, error } = await supabase
      .from('global_admins')
      .select('wallet')
      .eq('wallet_chain', walletChain)
      .eq('wallet', normalized)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }
}

export default new GlobalAdminRepository();
