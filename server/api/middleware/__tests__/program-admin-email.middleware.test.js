import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the SIWS / chain stack so importing the middleware doesn't pull real
// crypto, and so the wallet fallback path runs without a signature.
vi.mock('@talismn/siws', () => ({ verifySIWS: vi.fn(), parseMessage: vi.fn(), SiwsMessage: vi.fn() }));
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
vi.mock('../../auth/supabaseUser.js', () => ({
  getSupabaseUser: vi.fn(),
  extractSupabaseToken: (req) => req.headers?.['x-supabase-token'] ?? null,
}));
vi.mock('../../repositories/program-admin-email.repository.js', () => ({
  default: { findGrant: vi.fn() },
}));

const { requireProgramAdmin } = await import('../auth.middleware.js');
const programRepository = (await import('../../repositories/program.repository.js')).default;
const programAdminEmailRepository = (
  await import('../../repositories/program-admin-email.repository.js')
).default;
const { getSupabaseUser } = await import('../../auth/supabaseUser.js');

function makeReq(overrides = {}) {
  return { method: 'PATCH', originalUrl: '/api/test', headers: {}, params: { slug: 'bitrefill-2026' }, ...overrides };
}
function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
    end() { return res; },
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  programRepository.findBySlug.mockResolvedValue({ id: 'prog-1', slug: 'bitrefill-2026', name: 'Bitrefill' });
});

describe('requireProgramAdmin — social (email) admin path', () => {
  it('grants WRITE access to a valid ADMIN-role email (not view-only)', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'sb-1', email: 'Organizer@Example.com' });
    programAdminEmailRepository.findGrant.mockResolvedValue({ email: 'organizer@example.com', role: 'admin' });

    const req = makeReq({ headers: { 'x-supabase-token': 'valid-token' } });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramAdmin('slug')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBeNull();
    expect(req.user).toMatchObject({
      email: 'Organizer@Example.com',
      programId: 'prog-1',
      role: 'admin',
      isGlobalAdmin: false,
      viewOnly: false,
    });
  });

  it('does NOT grant a judge-role email admin access (falls to wallet, rejected)', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'sb-2', email: 'judge@example.com' });
    programAdminEmailRepository.findGrant.mockResolvedValue({ email: 'judge@example.com', role: 'judge' });

    const req = makeReq({ headers: { 'x-supabase-token': 'valid-token' } });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramAdmin('slug')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('404s when the program does not exist (token valid)', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'sb-1', email: 'organizer@example.com' });
    programRepository.findBySlug.mockResolvedValue(null);

    const req = makeReq({ headers: { 'x-supabase-token': 'valid-token' } });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramAdmin('slug')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
  });

  it('falls back to the wallet gate (rejected) when the email has no grant', async () => {
    getSupabaseUser.mockResolvedValue({ id: 'sb-1', email: 'stranger@example.com' });
    programAdminEmailRepository.findGrant.mockResolvedValue(null);

    const req = makeReq({ headers: { 'x-supabase-token': 'valid-token' } });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramAdmin('slug')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('falls back to the wallet gate when no Supabase token is present', async () => {
    const req = makeReq({ headers: {} });
    const res = makeRes();
    const next = vi.fn();

    await requireProgramAdmin('slug')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(getSupabaseUser).not.toHaveBeenCalled();
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
