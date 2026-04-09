import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the module under test
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

vi.mock('@polkadot/util', () => ({
  u8aToHex: vi.fn(),
}));

vi.mock('chalk', () => {
  const passthrough = (s) => s;
  const chalk = new Proxy(passthrough, {
    get: () => passthrough,
  });
  return { default: chalk };
});

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

vi.mock('../../../config/polkadot-config.js', () => ({
  getAuthorizedAddresses: () => ['5FakeAdmin1'],
  isAuthorizedSigner: vi.fn(),
  CURRENT_MULTISIG: '5FakeMultisig',
  NETWORK_CONFIG: { networkName: 'testnet', environment: 'development' },
}));

vi.mock('../../services/project.service.js', () => ({
  default: {
    getProjectById: vi.fn(),
  },
}));

// Now import what we need
import { verifySIWS, parseMessage } from '@talismn/siws';
import { signatureVerify, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { isAuthorizedSigner } from '../../../config/polkadot-config.js';
import projectService from '../../services/project.service.js';

// Import middleware under test
const { requireAdmin, requireTeamMemberOrAdmin } = await import('../auth.middleware.js');

// Helpers
function makeReq(overrides = {}) {
  return {
    method: 'POST',
    originalUrl: '/api/test',
    headers: {},
    params: {},
    ...overrides,
  };
}

function makeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) { res.statusCode = code; return res; },
    json(data) { res.body = data; return res; },
  };
  return res;
}

function encodePayload(payload) {
  return btoa(JSON.stringify(payload));
}

const VALID_PAYLOAD = {
  message: 'fake-siws-message',
  signature: '0xfakesig',
  address: '5FakeAdmin1',
};

// ─── requireAdmin ────────────────────────────────────────────

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: non-production
    process.env.NODE_ENV = 'test';
    process.env.DISABLE_SIWS_DOMAIN_CHECK = 'true';
  });

  it('returns 401 when auth header is missing', async () => {
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() with dev-bypass in non-production', async () => {
    const req = makeReq({ headers: { 'x-siws-auth': 'dev-bypass' } });
    const res = makeRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.adminAddress).toBe('5FakeAdmin1');
  });

  it('returns 400 for invalid base64', async () => {
    const req = makeReq({ headers: { 'x-siws-auth': '!!!invalid-base64!!!' } });
    const res = makeRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Base64/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON', async () => {
    const req = makeReq({ headers: { 'x-siws-auth': btoa('not-json') } });
    const res = makeRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Malformed/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 for incomplete payload (missing fields)', async () => {
    const req = makeReq({
      headers: { 'x-siws-auth': encodePayload({ message: 'x' }) },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Incomplete/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for valid signature but invalid statement', async () => {
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Some invalid statement',
      address: '5FakeAdmin1',
      domain: 'localhost',
    });

    const req = makeReq({
      headers: { 'x-siws-auth': encodePayload(VALID_PAYLOAD) },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Invalid statement/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for valid signature + valid statement but unauthorized address', async () => {
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Perform administrative action on Stadium',
      address: '5FakeAdmin1',
      domain: 'localhost',
    });
    isAuthorizedSigner.mockReturnValue(false);

    const req = makeReq({
      headers: { 'x-siws-auth': encodePayload(VALID_PAYLOAD) },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not authorized/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.user for fully valid request', async () => {
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Perform administrative action on Stadium',
      address: '5FakeAdmin1',
      domain: 'localhost',
    });
    isAuthorizedSigner.mockReturnValue(true);

    const req = makeReq({
      headers: { 'x-siws-auth': encodePayload(VALID_PAYLOAD) },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      address: '5FakeAdmin1',
      multisig: '5FakeMultisig',
      network: 'development',
    });
  });
});

// ─── requireTeamMemberOrAdmin ────────────────────────────────

describe('requireTeamMemberOrAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.DISABLE_SIWS_DOMAIN_CHECK = 'true';
  });

  it('returns 400 when projectId is missing', async () => {
    const req = makeReq({
      params: {},
      headers: { 'x-siws-auth': encodePayload(VALID_PAYLOAD) },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireTeamMemberOrAdmin(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() with dev-bypass in non-production', async () => {
    const req = makeReq({
      params: { projectId: 'proj-1' },
      headers: { 'x-siws-auth': 'dev-bypass' },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireTeamMemberOrAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.auth).toEqual({ address: '5FakeAdmin1', isAdmin: true });
  });

  it('calls next() when signer is an authorized admin', async () => {
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Perform administrative action on Stadium',
      address: '5FakeAdmin1',
      domain: 'localhost',
    });
    isAuthorizedSigner.mockReturnValue(true);

    const req = makeReq({
      params: { projectId: 'proj-1' },
      headers: { 'x-siws-auth': encodePayload(VALID_PAYLOAD) },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireTeamMemberOrAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      address: '5FakeAdmin1',
      multisig: '5FakeMultisig',
      network: 'development',
    });
  });

  it('calls next() when signer is a team member (public key match)', async () => {
    const teamPubkey = '0xabcdef1234567890';
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Perform administrative action on Stadium',
      address: '5TeamMember1',
      domain: 'localhost',
    });
    isAuthorizedSigner.mockReturnValue(false);
    decodeAddress.mockReturnValue(new Uint8Array([0xab, 0xcd]));
    u8aToHex.mockReturnValue(teamPubkey);
    projectService.getProjectById.mockResolvedValue({
      teamMembers: [{ walletAddress: '5TeamMember1' }],
    });

    const req = makeReq({
      params: { projectId: 'proj-1' },
      headers: { 'x-siws-auth': encodePayload({ ...VALID_PAYLOAD, address: '5TeamMember1' }) },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireTeamMemberOrAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ address: '5TeamMember1' });
  });

  it('returns 403 when signer is neither admin nor team member', async () => {
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Perform administrative action on Stadium',
      address: '5Stranger',
      domain: 'localhost',
    });
    isAuthorizedSigner.mockReturnValue(false);
    decodeAddress.mockImplementation((addr) => {
      if (addr === '5Stranger') return new Uint8Array([0x01]);
      return new Uint8Array([0x02]);
    });
    u8aToHex.mockImplementation((arr) => {
      if (arr[0] === 0x01) return '0x01';
      return '0x02';
    });
    projectService.getProjectById.mockResolvedValue({
      teamMembers: [{ walletAddress: '5OtherMember' }],
    });

    const req = makeReq({
      params: { projectId: 'proj-1' },
      headers: { 'x-siws-auth': encodePayload({ ...VALID_PAYLOAD, address: '5Stranger' }) },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireTeamMemberOrAdmin(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
