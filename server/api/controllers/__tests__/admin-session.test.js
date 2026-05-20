import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const FRESH_SECRET = 'x'.repeat(40);

vi.mock('../../middleware/auth.middleware.js', () => ({
  authenticateRequest: vi.fn(),
}));

const { authenticateRequest } = await import('../../middleware/auth.middleware.js');
const { createAdminSession } = await import('../admin-session.controller.js');
const { _resetCacheForTests, verifySessionToken } = await import('../../auth/sessionToken.js');

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = FRESH_SECRET;
  delete process.env.ADMIN_SESSION_TTL_SECONDS;
  _resetCacheForTests();
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.ADMIN_SESSION_SECRET;
  _resetCacheForTests();
});

describe('createAdminSession', () => {
  it('returns 401 when the SIWS header is missing', async () => {
    const req = { headers: {} };
    const res = mockRes();
    await createAdminSession(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(authenticateRequest).not.toHaveBeenCalled();
  });

  it('forwards authenticateRequest failure status + body verbatim', async () => {
    authenticateRequest.mockResolvedValue({
      ok: false,
      status: 403,
      body: { status: 'error', message: 'bad signature' },
    });
    const req = { headers: { 'x-siws-auth': 'fake' } };
    const res = mockRes();
    await createAdminSession(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'bad signature' });
  });

  it('issues a verifiable token on successful SIWS auth', async () => {
    authenticateRequest.mockResolvedValue({
      ok: true,
      chain: 'substrate',
      parsed: { address: '5Alice' },
      normalizedAddress: '5alice',
    });
    const req = { headers: { 'x-siws-auth': 'good-siws' } };
    const res = mockRes();
    await createAdminSession(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toMatchObject({
      status: 'success',
      data: expect.objectContaining({
        token: expect.any(String),
        address: '5Alice',
        chain: 'substrate',
        expiresAt: expect.any(String),
      }),
    });
    const v = verifySessionToken(payload.data.token);
    expect(v).toMatchObject({ valid: true, address: '5Alice', chain: 'substrate' });
  });
});
