/**
 * POST /api/admin/session — exchange one SIWS signature for a bearer token.
 *
 * The body of the SIWS message must carry the existing
 * "Perform administrative action on Stadium" statement and an expirationTime;
 * the same nonce-replay and statement-validation rules apply as for any
 * admin-gated route. The middleware authorization (= is this wallet an admin)
 * is intentionally NOT enforced here: the session is for whoever can present a
 * valid SIWS; downstream middleware still gates per-route based on the
 * address claimed by the token. (i.e. holding a token does not, by itself,
 * make you an admin — the route-level requireAdmin / requireProgramAdmin
 * still runs.)
 */

import { authenticateRequest } from '../middleware/auth.middleware.js';
import { issueSessionToken } from '../auth/sessionToken.js';

export async function createAdminSession(req, res) {
  try {
    const authHeader = req.headers['x-siws-auth'];
    if (!authHeader) {
      return res
        .status(401)
        .json({ status: 'error', message: 'Missing SIWS auth header' });
    }

    // This endpoint takes a one-time SIWS sign (no bearer fallback) so each
    // session is anchored in a fresh wallet signature. The nonce store will
    // reject re-use, and the SIWS expirationTime caps how stale the message
    // can be — both already enforced by authenticateRequest.
    const auth = await authenticateRequest(authHeader, { checkDomain: true });
    if (!auth.ok) {
      return res.status(auth.status).json(auth.body);
    }

    const { chain, parsed } = auth;
    const { token, expiresAt } = issueSessionToken({ address: parsed.address, chain });
    res.status(200).json({
      status: 'success',
      data: {
        token,
        address: parsed.address,
        chain,
        expiresAt,
      },
    });
  } catch (error) {
    console.error('❌ Error creating admin session:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create admin session' });
  }
}
