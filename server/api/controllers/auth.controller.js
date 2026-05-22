import { getSupabaseUser, extractSupabaseToken } from '../auth/supabaseUser.js';
import { authenticateRequest } from '../middleware/auth.middleware.js';
import { issueSessionToken } from '../auth/sessionToken.js';
import identityLinkService from '../services/identity-link.service.js';

class AuthController {
  /**
   * POST /api/auth/link-wallet — link the signed-in Supabase user to a wallet.
   * Requires BOTH a valid Supabase session (`x-supabase-token`) AND a fresh
   * SIWS wallet signature (`x-siws-auth`), proving ownership of each. On
   * success, returns the same HMAC session bearer the SIWS admin flow issues,
   * scoped to the wallet — so every existing route middleware works unchanged.
   */
  async linkWallet(req, res) {
    try {
      const user = await getSupabaseUser(extractSupabaseToken(req));
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Invalid or missing social session' });
      }
      const siwsHeader = req.headers['x-siws-auth'];
      if (!siwsHeader) {
        return res.status(401).json({ status: 'error', message: 'Missing wallet signature (x-siws-auth)' });
      }
      const auth = await authenticateRequest(siwsHeader, { checkDomain: true });
      if (!auth.ok) {
        return res.status(auth.status).json(auth.body);
      }
      const walletChain = auth.chain;
      const wallet = auth.parsed.address;
      await identityLinkService.linkWallet({
        supabaseUserId: user.id,
        email: user.email,
        walletChain,
        wallet,
      });
      const { token, expiresAt } = issueSessionToken({ address: wallet, chain: walletChain });
      return res.status(200).json({
        status: 'success',
        data: { token, address: wallet, chain: walletChain, expiresAt },
      });
    } catch (error) {
      console.error('❌ Error linking wallet:', error);
      res.status(500).json({ status: 'error', message: 'Failed to link wallet' });
    }
  }

  /**
   * POST /api/auth/session-from-social — exchange a Supabase session for a
   * wallet-scoped session bearer, if a wallet is already linked. Returns 409
   * `{ needsLink: true }` when the user must link a wallet first.
   */
  async sessionFromSocial(req, res) {
    try {
      const user = await getSupabaseUser(extractSupabaseToken(req));
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Invalid or missing social session' });
      }
      const link = await identityLinkService.getLinkedWallet(user.id);
      if (!link) {
        return res.status(409).json({
          status: 'error',
          needsLink: true,
          message: 'No wallet linked to this account yet',
        });
      }
      const { token, expiresAt } = issueSessionToken({ address: link.wallet, chain: link.walletChain });
      return res.status(200).json({
        status: 'success',
        data: { token, address: link.wallet, chain: link.walletChain, expiresAt },
      });
    } catch (error) {
      console.error('❌ Error creating session from social:', error);
      res.status(500).json({ status: 'error', message: 'Failed to create session' });
    }
  }
}

export default new AuthController();
