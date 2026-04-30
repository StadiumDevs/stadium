import { supabase } from '../../db.js';

const transformContact = (row) => {
  if (!row) return null;
  return {
    walletAddress: row.wallet_address,
    email: row.email,
    notificationsEnabled: row.notifications_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

class WalletContactRepository {
  async findByWallet(address) {
    const { data, error } = await supabase
      .from('wallet_contacts')
      .select('*')
      .eq('wallet_address', address)
      .maybeSingle();
    if (error) throw error;
    return transformContact(data);
  }

  async upsertByWallet(walletAddress, fields) {
    // fields shape: { email?: string|null, notificationsEnabled?: boolean }
    // Only the keys present in fields are updated; absent keys retain the existing value.
    const existing = await this.findByWallet(walletAddress);
    const next = {
      wallet_address: walletAddress,
      email: 'email' in fields ? fields.email : (existing?.email ?? null),
      notifications_enabled:
        'notificationsEnabled' in fields
          ? fields.notificationsEnabled
          : (existing?.notificationsEnabled ?? true),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('wallet_contacts')
      .upsert(next, { onConflict: 'wallet_address' })
      .select('*')
      .single();
    if (error) throw error;
    return transformContact(data);
  }
}

export default new WalletContactRepository();
