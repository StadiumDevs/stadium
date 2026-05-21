import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  const chalk = new Proxy(passthrough, { get: () => passthrough });
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
  default: { getProjectById: vi.fn() },
}));

vi.mock('../../auth/nonceStore.js', () => ({
  consumeNonce: vi.fn(),
}));

vi.mock('../../repositories/program.repository.js', () => ({
  default: { findBySlug: vi.fn() },
}));

vi.mock('../../repositories/app-admin.repository.js', () => ({
  default: { isAppAdmin: vi.fn().mockResolvedValue(false) },
}));

vi.mock('../../repositories/global-admin.repository.js', () => ({
  default: { isGlobalAdmin: vi.fn().mockResolvedValue(false) },
}));

vi.mock('../../repositories/program-admin.repository.js', () => ({
  default: { isAdmin: vi.fn() },
}));

import { parseMessage, verifySIWS } from '@talismn/siws';
import { signatureVerify, decodeAddress } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import { consumeNonce } from '../../auth/nonceStore.js';

const { requireOwnWallet } = await import('../auth.middleware.js');

function makeReq(overrides = {}) {
  return {
    method: 'PUT',
    originalUrl: '/api/wallet-contacts/5Alice',
    headers: {},
    params: { address: '5Alice' },
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
  address: '5Alice',
};

describe('requireOwnWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.DISABLE_SIWS_DOMAIN_CHECK = 'true';
    consumeNonce.mockResolvedValue({ ok: true });
  });

  it('returns 401 when x-siws-auth header is missing', async () => {
    const req = makeReq({ headers: {} });
    const res = makeRes();
    const next = vi.fn();

    await requireOwnWallet(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.user with dev-bypass in non-production', async () => {
    const req = makeReq({ headers: { 'x-siws-auth': 'dev-bypass' }, params: { address: '5Alice' } });
    const res = makeRes();
    const next = vi.fn();

    await requireOwnWallet(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ address: '5Alice', chain: 'substrate' });
  });

  it('returns 400 for invalid base64', async () => {
    const req = makeReq({ headers: { 'x-siws-auth': '!!!invalid-base64!!!' } });
    const res = makeRes();
    const next = vi.fn();

    await requireOwnWallet(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Base64/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when statement is not in VALID_STATEMENTS', async () => {
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Some unknown statement',
      address: '5Alice',
      domain: 'localhost',
    });

    const req = makeReq({ headers: { 'x-siws-auth': encodePayload(VALID_PAYLOAD) } });
    const res = makeRes();
    const next = vi.fn();

    await requireOwnWallet(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Invalid statement/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when signer pubkey matches target wallet pubkey', async () => {
    const pubkey = '0xabcdef';
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Update notification preferences for wallet on Stadium',
      address: '5Alice',
      domain: 'localhost',
      expirationTime: new Date(Date.now() + 600000).toISOString(),
    });
    decodeAddress.mockReturnValue(new Uint8Array([0xab, 0xcd]));
    u8aToHex.mockReturnValue(pubkey);

    const req = makeReq({
      headers: { 'x-siws-auth': encodePayload(VALID_PAYLOAD) },
      params: { address: '5Alice' },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireOwnWallet(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ address: '5Alice', chain: 'substrate' });
  });

  it('returns 403 with reason not-your-wallet when signer does not match target', async () => {
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Update notification preferences for wallet on Stadium',
      address: '5Bob',
      domain: 'localhost',
      expirationTime: new Date(Date.now() + 600000).toISOString(),
    });
    decodeAddress.mockImplementation((addr) => {
      if (addr === '5Alice') return new Uint8Array([0x01]);
      return new Uint8Array([0x02]);
    });
    u8aToHex.mockImplementation((arr) => {
      if (arr[0] === 0x01) return '0x01';
      return '0x02';
    });

    const req = makeReq({
      headers: { 'x-siws-auth': encodePayload({ ...VALID_PAYLOAD, address: '5Bob' }) },
      params: { address: '5Alice' },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireOwnWallet(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.reason).toBe('not-your-wallet');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 with domain mismatch message when domain check is enabled and domain is wrong', async () => {
    process.env.DISABLE_SIWS_DOMAIN_CHECK = 'false';
    process.env.EXPECTED_DOMAIN = 'stadium.app';

    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Update notification preferences for wallet on Stadium',
      address: '5Alice',
      domain: 'evil.com',
    });

    const req = makeReq({ headers: { 'x-siws-auth': encodePayload(VALID_PAYLOAD) } });
    const res = makeRes();
    const next = vi.fn();

    await requireOwnWallet(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/Invalid domain/i);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 with message Invalid wallet address when route param is invalid SS58', async () => {
    signatureVerify.mockReturnValue({ isValid: true, crypto: 'sr25519' });
    parseMessage.mockReturnValue({
      statement: 'Update notification preferences for wallet on Stadium',
      address: '5Alice',
      domain: 'localhost',
      expirationTime: new Date(Date.now() + 600000).toISOString(),
    });
    decodeAddress.mockImplementation((addr) => {
      if (addr === 'not-a-wallet') throw new Error('Invalid SS58 address');
      return new Uint8Array([0xab]);
    });
    u8aToHex.mockReturnValue('0xab');

    const req = makeReq({
      headers: { 'x-siws-auth': encodePayload({ ...VALID_PAYLOAD, address: '5Alice' }) },
      params: { address: 'not-a-wallet' },
    });
    const res = makeRes();
    const next = vi.fn();

    await requireOwnWallet(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid wallet address');
    expect(next).not.toHaveBeenCalled();
  });
});
