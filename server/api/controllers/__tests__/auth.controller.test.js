import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../auth/supabaseUser.js', () => ({
  getSupabaseUser: vi.fn(),
  extractSupabaseToken: vi.fn(() => 'supabase-token'),
}));
vi.mock('../../middleware/auth.middleware.js', () => ({
  authenticateRequest: vi.fn(),
}));
vi.mock('../../auth/sessionToken.js', () => ({
  issueSessionToken: vi.fn(() => ({ token: 'bearer.xyz', expiresAt: '2026-01-01T00:00:00.000Z' })),
}));
vi.mock('../../services/identity-link.service.js', () => ({
  default: { getLinkedWallet: vi.fn(), linkWallet: vi.fn() },
}));

const { getSupabaseUser } = await import('../../auth/supabaseUser.js');
const { authenticateRequest } = await import('../../middleware/auth.middleware.js');
const identityLinkService = (await import('../../services/identity-link.service.js')).default;
const authController = (await import('../auth.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

beforeEach(() => vi.clearAllMocks());

describe('AuthController.linkWallet', () => {
  it('401 when the social session is invalid', async () => {
    getSupabaseUser.mockResolvedValue(null);
    const res = mockRes();
    await authController.linkWallet({ headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('401 when the wallet signature header is missing', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'u1', email: 'a@b.co' });
    const res = mockRes();
    await authController.linkWallet({ headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('propagates a SIWS verification failure', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'u1', email: 'a@b.co' });
    authenticateRequest.mockResolvedValue({ ok: false, status: 403, body: { status: 'error', message: 'bad sig' } });
    const res = mockRes();
    await authController.linkWallet({ headers: { 'x-siws-auth': 'sig' } }, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(identityLinkService.linkWallet).not.toHaveBeenCalled();
  });

  it('links the wallet and returns a session bearer on success', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'u1', email: 'a@b.co' });
    authenticateRequest.mockResolvedValue({ ok: true, chain: 'substrate', parsed: { address: '5Grw...' } });
    identityLinkService.linkWallet.mockResolvedValue({});
    const res = mockRes();
    await authController.linkWallet({ headers: { 'x-siws-auth': 'sig' } }, res);
    expect(identityLinkService.linkWallet).toHaveBeenCalledWith({
      supabaseUserId: 'u1', email: 'a@b.co', walletChain: 'substrate', wallet: '5Grw...',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.data).toMatchObject({ token: 'bearer.xyz', address: '5Grw...', chain: 'substrate' });
  });
});

describe('AuthController.sessionFromSocial', () => {
  it('401 when the social session is invalid', async () => {
    getSupabaseUser.mockResolvedValue(null);
    const res = mockRes();
    await authController.sessionFromSocial({ headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('409 needsLink when no wallet is linked', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'u1', email: 'a@b.co' });
    identityLinkService.getLinkedWallet.mockResolvedValue(null);
    const res = mockRes();
    await authController.sessionFromSocial({ headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0]).toMatchObject({ needsLink: true });
  });

  it('returns a wallet-scoped session bearer when linked', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'u1', email: 'a@b.co' });
    identityLinkService.getLinkedWallet.mockResolvedValue({ wallet: '5Grw...', walletChain: 'substrate' });
    const res = mockRes();
    await authController.sessionFromSocial({ headers: {} }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data).toMatchObject({ token: 'bearer.xyz', address: '5Grw...', chain: 'substrate' });
  });
});
