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
    validateAddress: vi.fn(),
    validateEmail: vi.fn(),
  };
});

const walletContactService = (await import('../../services/wallet-contact.service.js')).default;
const { validateAddress, validateEmail } = await import('../../utils/validation.js');
const controller = (await import('../wallet-contact.controller.js')).default;

function mockRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('walletContactController.getContact', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when the address is invalid for its chain', async () => {
    validateAddress.mockReturnValue(false);
    const req = { params: { address: 'bad-addr' }, query: {} };
    const res = mockRes();

    await controller.getContact(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Invalid wallet address' });
  });

  it('returns 400 for an unsupported chain', async () => {
    validateAddress.mockReturnValue(true);
    const req = { params: { address: '5Alice' }, query: { chain: 'bitcoin' } };
    const res = mockRes();

    await controller.getContact(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ status: 'error', message: 'Invalid chain' });
  });

  it('returns 200 with default shape for unknown wallet and no email key', async () => {
    validateAddress.mockReturnValue(true);
    walletContactService.getPublicContact.mockResolvedValue({
      emailSet: false,
      notificationsEnabled: true,
    });
    const req = { params: { address: '5Alice' }, query: {} };
    const res = mockRes();

    await controller.getContact(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.status).toBe('success');
    expect(body.data.email_set).toBe(false);
    expect(body.data.notifications_enabled).toBe(true);
    expect(body.data).not.toHaveProperty('email');
    // chain defaults to substrate when no ?chain= is given
    expect(walletContactService.getPublicContact).toHaveBeenCalledWith('5Alice', 'substrate');
  });

  it('returns 200 with emailSet: true for existing wallet and no email key', async () => {
    validateAddress.mockReturnValue(true);
    walletContactService.getPublicContact.mockResolvedValue({
      emailSet: true,
      notificationsEnabled: false,
    });
    const req = { params: { address: '5Alice' }, query: {} };
    const res = mockRes();

    await controller.getContact(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const body = res.json.mock.calls[0][0];
    expect(body.data.email_set).toBe(true);
    expect(body.data.notifications_enabled).toBe(false);
    expect(body.data).not.toHaveProperty('email');
  });

  it('passes an explicit ?chain= through to the service', async () => {
    validateAddress.mockReturnValue(true);
    walletContactService.getPublicContact.mockResolvedValue({ emailSet: false, notificationsEnabled: true });
    const req = { params: { address: '0xabc' }, query: { chain: 'ethereum' } };
    const res = mockRes();

    await controller.getContact(req, res);

    expect(walletContactService.getPublicContact).toHaveBeenCalledWith('0xabc', 'ethereum');
  });
});

describe('walletContactController.updateContact', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with public shape for valid email PUT', async () => {
    validateEmail.mockReturnValue({ valid: true, normalised: 'alice@example.com' });
    walletContactService.updateContact.mockResolvedValue({
      emailSet: true,
      notificationsEnabled: true,
    });
    const req = {
      params: { address: '5Alice' },
      user: { address: '5Alice', chain: 'substrate' },
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
    expect(walletContactService.updateContact).toHaveBeenCalledWith(
      '5Alice',
      { email: 'alice@example.com', notificationsEnabled: true },
      'substrate',
    );
  });

  it('uses the signer chain from req.user', async () => {
    validateEmail.mockReturnValue({ valid: true, normalised: 'a@b.com' });
    walletContactService.updateContact.mockResolvedValue({ emailSet: true, notificationsEnabled: true });
    const req = {
      params: { address: '0xabc' },
      user: { address: '0xabc', chain: 'ethereum' },
      body: { email: 'a@b.com' },
    };
    const res = mockRes();

    await controller.updateContact(req, res);

    expect(walletContactService.updateContact).toHaveBeenCalledWith(
      '0xabc',
      expect.any(Object),
      'ethereum',
    );
  });

  it('returns 422 for malformed email', async () => {
    validateEmail.mockReturnValue({ valid: false, error: 'email must be a valid email address' });
    const req = {
      params: { address: '5Alice' },
      user: { address: '5Alice', chain: 'substrate' },
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
      user: { address: '5Alice', chain: 'substrate' },
      body: { notifications_enabled: false },
    };
    const res = mockRes();

    await controller.updateContact(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    // email was not in req.body so it must not appear in the fields passed to service
    expect(walletContactService.updateContact).toHaveBeenCalledWith(
      '5Alice',
      { notificationsEnabled: false },
      'substrate',
    );
    expect(walletContactService.updateContact.mock.calls[0][1]).not.toHaveProperty('email');
    // validateEmail must not have been called when email is absent from the body
    expect(validateEmail).not.toHaveBeenCalled();
  });

  it('returns 422 when notifications_enabled is not boolean', async () => {
    const req = {
      params: { address: '5Alice' },
      user: { address: '5Alice', chain: 'substrate' },
      body: { notifications_enabled: 'yes' },
    };
    const res = mockRes();

    await controller.updateContact(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json.mock.calls[0][0].status).toBe('error');
  });

  it('partial PUT with only email does not pass notificationsEnabled to service', async () => {
    // Regression: PUT { email } must not silently default notificationsEnabled.
    validateEmail.mockReturnValue({ valid: true, normalised: 'new@example.com' });
    walletContactService.updateContact.mockResolvedValue({
      emailSet: true,
      notificationsEnabled: false,
    });
    const req = {
      params: { address: '5Alice' },
      user: { address: '5Alice', chain: 'substrate' },
      body: { email: 'new@example.com' },
    };
    const res = mockRes();

    await controller.updateContact(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const calledFields = walletContactService.updateContact.mock.calls[0][1];
    // notificationsEnabled must not be present — the repo will handle preservation
    expect(calledFields).not.toHaveProperty('notificationsEnabled');
    expect(calledFields).toHaveProperty('email', 'new@example.com');
  });
});
