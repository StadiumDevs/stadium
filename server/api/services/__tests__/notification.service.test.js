import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/wallet-contact.repository.js', () => ({
  default: { findByWallet: vi.fn() },
}));

vi.mock('../../repositories/notification.repository.js', () => ({
  default: { insertOrGetExisting: vi.fn() },
}));

const walletContactRepo = (await import('../../repositories/wallet-contact.repository.js')).default;
const notificationRepo = (await import('../../repositories/notification.repository.js')).default;
const service = (await import('../notification.service.js')).default;

const WALLET = '5Alice';
const EVENT_TYPE = 'application_accepted';
const SOURCE_ID = 'proj-1';
const PAYLOAD = { projectName: 'Test' };

const existingRow = {
  id: 'uuid-1',
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

describe('NotificationService.notify', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts with status skipped and error no_contact when no wallet_contacts row exists', async () => {
    walletContactRepo.findByWallet.mockResolvedValue(null);
    notificationRepo.insertOrGetExisting.mockResolvedValue({ ...existingRow, status: 'skipped', error: 'no_contact' });

    await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);

    expect(notificationRepo.insertOrGetExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: WALLET,
        eventType: EVENT_TYPE,
        sourceId: SOURCE_ID,
        payload: PAYLOAD,
        status: 'skipped',
        error: 'no_contact',
      }),
    );
  });

  it('inserts with status skipped and error opted_out when notificationsEnabled is false', async () => {
    walletContactRepo.findByWallet.mockResolvedValue({
      walletAddress: WALLET,
      email: 'a@b.com',
      notificationsEnabled: false,
    });
    notificationRepo.insertOrGetExisting.mockResolvedValue({ ...existingRow, status: 'skipped', error: 'opted_out' });

    await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);

    expect(notificationRepo.insertOrGetExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'skipped',
        error: 'opted_out',
      }),
    );
  });

  it('inserts with status queued and error null when contact has email and notificationsEnabled is true', async () => {
    walletContactRepo.findByWallet.mockResolvedValue({
      walletAddress: WALLET,
      email: 'a@b.com',
      notificationsEnabled: true,
    });
    notificationRepo.insertOrGetExisting.mockResolvedValue(existingRow);

    await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);

    expect(notificationRepo.insertOrGetExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'queued',
        error: null,
      }),
    );
  });

  it('returns the row from insertOrGetExisting on duplicate notify calls (repo dedupes)', async () => {
    walletContactRepo.findByWallet.mockResolvedValue({
      walletAddress: WALLET,
      email: 'a@b.com',
      notificationsEnabled: true,
    });
    notificationRepo.insertOrGetExisting.mockResolvedValue(existingRow);

    const first = await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);
    const second = await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);

    // Service calls insertOrGetExisting once per notify invocation
    expect(notificationRepo.insertOrGetExisting).toHaveBeenCalledTimes(2);
    // Both calls return the same existing row (repo-layer idempotency)
    expect(first).toEqual(existingRow);
    expect(second).toEqual(existingRow);
  });
});
