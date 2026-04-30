import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/wallet-contact.service.js', () => ({
  default: {
    getPublicContact: vi.fn(),
    updateContact: vi.fn(),
  },
}));

vi.mock('../../utils/validation.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    validateSS58: vi.fn(),
    validateEmail: vi.fn(),
  };
});

const walletContactService = (await import('../../services/wallet-contact.service.js')).default;
const { validateSS58, validateEmail } = await import('../../utils/validation.js');
const controller = (await import('../wallet-contact.controller.js')).default;

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('walletContactController.getContact', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when the address is not valid SS58', async () => {
    validateSS58.mockReturnValue(false);
    const req = { params: { address: 'bad-addr' } };
    const res = mockRes();

    await controller.getContact(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Invalid wallet address' });
  });

  it('returns 200 with default shape for unknown wallet and no email key', async () => {
    validateSS58.mockReturnValue(true);
    walletContactService.getPublicContact.mockResolvedValue({
      emailSet: false,
      notificationsEnabled: true,
    });
    const req = { params: { address: '5Alice' } };
    const res = mockRes();

    await controller.getContact(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe('success');
    expect(body.data.email_set).toBe(false);
    expect(body.data.notifications_enabled).toBe(true);
    expect(body.data).not.toHaveProperty('email');
  });

  it('returns 200 with emailSet: true for existing wallet and no email key', async () => {
    validateSS58.mockReturnValue(true);
    walletContactService.getPublicContact.mockResolvedValue({
      emailSet: true,
      notificationsEnabled: false,
    });
    const req = { params: { address: '5Alice' } };
    const res = mockRes();

    await controller.getContact(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.data.email_set).toBe(true);
    expect(body.data.notifications_enabled).toBe(false);
    expect(body.data).not.toHaveProperty('email');
  });
});

describe('walletContactController.updateContact', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with public shape for valid email PUT', async () => {
    validateSS58.mockReturnValue(true);
    validateEmail.mockReturnValue({ valid: true, normalised: 'alice@example.com' });
    walletContactService.updateContact.mockResolvedValue({
      emailSet: true,
      notificationsEnabled: true,
    });
    const req = {
      params: { address: '5Alice' },
      body: { email: 'Alice@Example.com', notifications_enabled: true },
    };
    const res = mockRes();

    await controller.updateContact(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe('success');
    expect(body.data.email_set).toBe(true);
    expect(body.data.notifications_enabled).toBe(true);
    expect(body.data).not.toHaveProperty('email');
    expect(walletContactService.updateContact).toHaveBeenCalledWith('5Alice', {
      email: 'alice@example.com',
      notificationsEnabled: true,
    });
  });

  it('returns 422 for malformed email', async () => {
    validateEmail.mockReturnValue({ valid: false, error: 'email must be a valid email address' });
    const req = {
      params: { address: '5Alice' },
      body: { email: 'not-an-email' },
    };
    const res = mockRes();

    await controller.updateContact(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe('error');
    expect(body.message).toBe('email must be a valid email address');
  });

  it('returns 200 when only notifications_enabled is set (no email field)', async () => {
    walletContactService.updateContact.mockResolvedValue({
      emailSet: false,
      notificationsEnabled: false,
    });
    const req = {
      params: { address: '5Alice' },
      body: { notifications_enabled: false },
    };
    const res = mockRes();

    await controller.updateContact(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(walletContactService.updateContact).toHaveBeenCalledWith('5Alice', {
      email: undefined,
      notificationsEnabled: false,
    });
  });

  it('returns 422 when notifications_enabled is not boolean', async () => {
    const req = {
      params: { address: '5Alice' },
      body: { notifications_enabled: 'yes' },
    };
    const res = mockRes();

    await controller.updateContact(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json.mock.calls[0][0].status).toBe('error');
  });
});
