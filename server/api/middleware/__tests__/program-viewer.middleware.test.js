import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the SIWS / chain stack so importing the middleware doesn't pull real
// crypto, and so the wallet fallback path can run without a signature.
vi.mock('@talismn/siws', () => ({
  verifySIWS: vi.fn(),
  parseMessage: vi.fn(),
  SiwsMessage: vi.fn(),
}));
vi.mock('@polkadot/util-crypto', () => ({
  cryptoWaitReady: vi.fn().mockResolvedValue(true),
  signatureVerify: vi.fn(),
  decodeAddress: vi.fn(),
}));
vi.mock('@polkadot/util', () => ({ u8aToHex: vi.fn() }));
vi.mock('chalk', () => {
  const passthrough = (s) => s;
  return { default: new Proxy(passthrough, { get: () => passthrough }) };
});
vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));
vi.mock('../../../config/polkadot-config.js', () => ({
  getAuthorizedAddresses: () => ['5FakeAdmin1'],
  CURRENT_MULTISIG: '5FakeMultisig',
  NETWORK_CONFIG: { networkName: 'testnet', environment: 'development' },
}));
vi.mock('../../auth/authorizedSigners.js', () => ({
  isAuthorizedSigner: vi.fn(),
  authorizedSignerCount: () => 1,
}));
vi.mock('../../services/project.service.js', () => ({ default: { getProjectById: vi.fn() } }));
vi.mock('../../auth/nonceStore.js', () => ({ consumeNonce: vi.fn() }));
vi.mock('../../repositories/program.repository.js', () => ({ default: { findBySlug: vi.fn() } }));
vi.mock('../../repositories/program-admin.repository.js', () => ({ default: { isAdmin: vi.fn() } }));
vi.mock('../../repositories/app-admin.repository.js', () => ({
  default: { isAppAdmin: vi.fn().mockResolvedValue(false) },
}));
vi.mock('../../repositories/global-admin.repository.js', () => ({
  default: { isGlobalAdmin: vi.fn().mockResolvedValue(false) },
}));

// The two pieces this middleware adds on top of requireProgramAdmin.
vi.mock('../../auth/supabaseUser.js', () => ({
  getSupabaseUser: vi.fn(),
  extractSupabaseToken: (req) => req.headers?.['x-supabase-token'] ?? null,
}));
vi.mock('../../repositories/program-admin-email.repository.js', () => ({
  default: { findGrant: vi.fn() },
}));

const { requireProgramViewer } = await import('../auth.middleware.js');
const programRepository = (await import('../../repositories/program.repository.js')).default;
const programAdminEmailRepository = (
  await import('../../repositories/program-admin-email.repository.js')
).default;
const { getSupabaseUser } = await import('../../auth/supabaseUser.js');

function makeReq(overrides = {}) {
  return { method: 'GET', originalUrl: '/api/test', headers: {}, params: { slug: 'dogfooding' }, ...overrides };
}
function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    ended: false,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
    end() { res.ended = true; return res; },
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  programRepository.findBySlug.mockResolvedValue({ id: 'prog-1', slug: 'dogfooding', name: 'Dogfooding' });
});

describe('requireProgramViewer — social (email) path', () => {
  it('passes a valid Supabase token whose email is an ADMIN-role grant (view-only)', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'sb-user-1', email: 'Partner@Example.com' });
    programAdminEmailRepository.findGrant.mockResolvedValue({ email: 'partner@example.com', role: 'admin' });

    const req = makeReq({ headers: { 'x-supabase-token': 'valid-token' } });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramViewer('slug')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBeNull();
    expect(req.user).toMatchObject({
      email: 'Partner@Example.com',
      programId: 'prog-1',
      viewOnly: true,
      isGlobalAdmin: false,
      role: 'admin',
    });
  });

  it('does NOT grant a judge-role email the viewer surface (least privilege)', async () => {
    // A judge can score (requireProgramJudge) but must not see applicant PII /
    // signups / inbox / audit / admin roster. Falls back to the wallet gate,
    // which denies a wallet-less email session.
    getSupabaseUser.mockResolvedValue({ id: 'sb-user-2', email: 'judge@example.com' });
    programAdminEmailRepository.findGrant.mockResolvedValue({ email: 'judge@example.com', role: 'judge' });

    const req = makeReq({ headers: { 'x-supabase-token': 'valid-token' } });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramViewer('slug')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('404s when the program does not exist (token valid)', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'sb-user-1', email: 'partner@example.com' });
    programRepository.findBySlug.mockResolvedValue(null);

    const req = makeReq({ headers: { 'x-supabase-token': 'valid-token' } });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramViewer('slug')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('falls back to wallet auth (and is rejected) when the email has no grant', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'sb-user-1', email: 'stranger@example.com' });
    programAdminEmailRepository.findGrant.mockResolvedValue(null);

    // No x-siws-auth header -> wallet path denies.
    const req = makeReq({ headers: { 'x-supabase-token': 'valid-token' } });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramViewer('slug')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('falls back to wallet auth when the Supabase token is invalid', async () => {
    getSupabaseUser.mockResolvedValue(null);

    const req = makeReq({ headers: { 'x-supabase-token': 'garbage' } });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramViewer('slug')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(programAdminEmailRepository.findGrant).not.toHaveBeenCalled();
  });

  it('falls back to wallet auth when no Supabase token is present', async () => {
    const req = makeReq({ headers: {} });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramViewer('slug')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(getSupabaseUser).not.toHaveBeenCalled();
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('400s when the slug param is missing', async () => {
    const req = makeReq({ params: {} });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramViewer('slug')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});
