import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/wallet-contact.repository.js', () => ({
  default: { findByWallet: vi.fn() },
}));

vi.mock('../../repositories/notification.repository.js', () => ({
  default: {
    insertOrGetExisting: vi.fn(),
    markSent: vi.fn(),
    markFailed: vi.fn(),
  },
}));

vi.mock('../email-transport.js', () => ({
  getEmailTransport: vi.fn(),
}));

const walletContactRepo = (await import('../../repositories/wallet-contact.repository.js')).default;
const notificationRepo = (await import('../../repositories/notification.repository.js')).default;
const { getEmailTransport } = await import('../email-transport.js');
const service = (await import('../notification.service.js')).default;

const WALLET = '5Bob';
const EVENT_TYPE = 'application_accepted';
const SOURCE_ID = 'proj-2';
const PAYLOAD = { projectName: 'Demo', programName: 'Dogfooding' };
const EMAIL = 'bob@example.com';

const queuedRow = {
  id: 'uuid-2',
  recipientWallet: WALLET,
  eventType: EVENT_TYPE,
  sourceId: SOURCE_ID,
  payload: PAYLOAD,
  status: 'queued',
  providerMessageId: null,
  error: null,
  createdAt: '2026-05-11T00:00:00Z',
  sentAt: null,
};

const sentRow = { ...queuedRow, status: 'sent', providerMessageId: 'res_abc' };
const failedRow = { ...queuedRow, status: 'failed', error: 'send failed' };
const providerNotConfiguredRow = { ...queuedRow, status: 'failed', error: 'provider_not_configured' };

describe('NotificationService send path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    walletContactRepo.findByWallet.mockResolvedValue({
      walletAddress: WALLET,
      email: EMAIL,
      notificationsEnabled: true,
    });
    notificationRepo.insertOrGetExisting.mockResolvedValue(queuedRow);
  });

  it('happy path — markSent called with rowId and provider message id; returned row status is sent', async () => {
    const mockTransport = { send: vi.fn().mockResolvedValue({ id: 'res_abc' }) };
    getEmailTransport.mockResolvedValue(mockTransport);
    notificationRepo.markSent.mockResolvedValue(sentRow);

    const result = await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);

    expect(notificationRepo.markSent).toHaveBeenCalledWith('uuid-2', 'res_abc');
    expect(result.status).toBe('sent');
  });

  it('provider 4xx — markFailed called; notify does not throw', async () => {
    const sendError = new Error('4xx bad request');
    const mockTransport = { send: vi.fn().mockRejectedValue(sendError) };
    getEmailTransport.mockResolvedValue(mockTransport);
    notificationRepo.markFailed.mockResolvedValue(failedRow);

    const result = await expect(
      service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD),
    ).resolves.toBeDefined();

    expect(notificationRepo.markFailed).toHaveBeenCalledWith('uuid-2', '4xx bad request');
    return result;
  });

  it('RESEND_API_KEY unset — getEmailTransport returns null — markFailed called with provider_not_configured', async () => {
    getEmailTransport.mockResolvedValue(null);
    notificationRepo.markFailed.mockResolvedValue(providerNotConfiguredRow);

    const result = await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);

    expect(notificationRepo.markFailed).toHaveBeenCalledWith('uuid-2', 'provider_not_configured');
    expect(result.status).toBe('failed');
  });

  it('no network — fetch is never called with api.resend.com during a happy-path run', async () => {
    const mockTransport = { send: vi.fn().mockResolvedValue({ id: 'res_net' }) };
    getEmailTransport.mockResolvedValue(mockTransport);
    notificationRepo.markSent.mockResolvedValue({ ...queuedRow, status: 'sent', providerMessageId: 'res_net' });

    const fetchSpy = vi.spyOn(global, 'fetch');

    await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);

    const resendCalls = fetchSpy.mock.calls.filter(
      ([url]) => typeof url === 'string' && url.includes('api.resend.com'),
    );
    expect(resendCalls).toHaveLength(0);

    fetchSpy.mockRestore();
  });
});

