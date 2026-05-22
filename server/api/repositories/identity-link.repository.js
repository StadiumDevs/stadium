import { supabase } from '../../db.js';

const transform = (row) =>
  row
    ? {
        supabaseUserId: row.supabase_user_id,
        email: row.email,
        walletChain: row.wallet_chain || 'substrate',
        wallet: row.wallet,
      }
    : null;

class IdentityLinkRepository {
  async findBySupabaseUser(supabaseUserId) {
    const { data, error } = await supabase
      .from('auth_identity_links')
      .select('*')
      .eq('supabase_user_id', supabaseUserId)
      .maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  async upsert({ supabaseUserId, email, walletChain, wallet }) {
    const { data, error } = await supabase
      .from('auth_identity_links')
      .upsert(
        {
          supabase_user_id: supabaseUserId,
          email: email ?? null,
          wallet_chain: walletChain,
          wallet,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'supabase_user_id' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }
}

export default new IdentityLinkRepository();
