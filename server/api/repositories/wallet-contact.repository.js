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

const toSnakeCase = (address, { email, notificationsEnabled }) => ({
  wallet_address: address,
  email: email !== undefined ? email : null,
  notifications_enabled: notificationsEnabled !== undefined ? notificationsEnabled : true,
  updated_at: new Date().toISOString(),
});

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

  async upsertByWallet(address, { email, notificationsEnabled }) {
    const row = toSnakeCase(address, { email, notificationsEnabled });
    const { data, error } = await supabase
      .from('wallet_contacts')
      .upsert(row, { onConflict: 'wallet_address' })
      .select('*')
      .single();
    if (error) throw error;
    return transformContact(data);
  }
}

export default new WalletContactRepository();
