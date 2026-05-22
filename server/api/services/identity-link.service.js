import identityLinkRepository from '../repositories/identity-link.repository.js';
import walletContactRepository from '../repositories/wallet-contact.repository.js';

class IdentityLinkService {
  async getLinkedWallet(supabaseUserId) {
    return identityLinkRepository.findBySupabaseUser(supabaseUserId);
  }

  /**
   * Link a Supabase user to a wallet (the authorization principal). Optionally
   * mirrors the social email into wallet_contacts so the wallet has an email on
   * file — best-effort, never blocks the link.
   */
  async linkWallet({ supabaseUserId, email, walletChain, wallet }) {
    const row = await identityLinkRepository.upsert({ supabaseUserId, email, walletChain, wallet });
    if (email) {
      try {
        await walletContactRepository.upsertByWallet(wallet, { email }, walletChain);
      } catch {
        // Optional email mirror — a failure here must not fail the link.
      }
    }
    return row;
  }
}

export default new IdentityLinkService();
