import { supabase } from '../../db.js';

const transformContact = (row) => {
  if (!row) return null;
  return {
    walletAddress: row.wallet_address,
    walletChain: row.wallet_chain || 'substrate',
    email: row.email,
    notificationsEnabled: row.notifications_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

class WalletContactRepository {
  /**
   * @param {string} address
   * @param {string} [chain='substrate']
   */
  async findByWallet(address, chain = 'substrate') {
    const { data, error } = await supabase
      .from('wallet_contacts')
      .select('*')
      .eq('wallet_address', address)
      .eq('wallet_chain', chain)
      .maybeSingle();
    if (error) throw error;
    return transformContact(data);
  }

  /**
   * @param {string} walletAddress
   * @param {{ email?: string|null, notificationsEnabled?: boolean }} fields
   * @param {string} [chain='substrate']
   *
   * Only the keys present in fields are updated; absent keys retain the
   * existing value. The primary key is composite (wallet_chain, wallet_address).
   */
  async upsertByWallet(walletAddress, fields, chain = 'substrate') {
    const existing = await this.findByWallet(walletAddress, chain);
    const next = {
      wallet_address: walletAddress,
      wallet_chain: chain,
      email: 'email' in fields ? fields.email : (existing?.email ?? null),
      notifications_enabled:
        'notificationsEnabled' in fields
          ? fields.notificationsEnabled
          : (existing?.notificationsEnabled ?? true),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('wallet_contacts')
      .upsert(next, { onConflict: 'wallet_chain,wallet_address' })
      .select('*')
      .single();
    if (error) throw error;
    return transformContact(data);
  }
}

export default new WalletContactRepository();
