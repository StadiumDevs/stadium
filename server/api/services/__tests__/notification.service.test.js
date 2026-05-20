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

vi.mock('../project.service.js', () => ({
  default: { getProjectById: vi.fn() },
}));

const walletContactRepo = (await import('../../repositories/wallet-contact.repository.js')).default;
const notificationRepo = (await import('../../repositories/notification.repository.js')).default;
const { getEmailTransport } = await import('../email-transport.js');
const projectService = (await import('../project.service.js')).default;
const service = (await import('../notification.service.js')).default;

const WALLET = '5Alice';
const EVENT_TYPE = 'application_accepted';
const SOURCE_ID = 'proj-1';
const PAYLOAD = { projectName: 'Test', programName: 'Dogfooding' };

const queuedRow = {
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

const sentRow = { ...queuedRow, status: 'sent', providerMessageId: 'res_test_default' };

const mockTransport = { send: vi.fn().mockResolvedValue({ id: 'res_test_default' }) };

describe('NotificationService.notify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEmailTransport.mockResolvedValue(mockTransport);
    notificationRepo.markSent.mockResolvedValue(sentRow);
    notificationRepo.markFailed.mockResolvedValue({ ...queuedRow, status: 'failed' });
  });

  it('inserts with status skipped and error no_contact when no wallet_contacts row exists', async () => {
    walletContactRepo.findByWallet.mockResolvedValue(null);
    notificationRepo.insertOrGetExisting.mockResolvedValue({ ...queuedRow, status: 'skipped', error: 'no_contact' });

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
    notificationRepo.insertOrGetExisting.mockResolvedValue({ ...queuedRow, status: 'skipped', error: 'opted_out' });

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
    notificationRepo.insertOrGetExisting.mockResolvedValue(queuedRow);

    await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);

    expect(notificationRepo.insertOrGetExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'queued',
        error: null,
      }),
    );
  });

  it('does not re-send on a duplicate notify call — repo dedupe returns an already-sent row', async () => {
    walletContactRepo.findByWallet.mockResolvedValue({
      walletAddress: WALLET,
      email: 'a@b.com',
      notificationsEnabled: true,
    });
    // First call: a fresh queued row → triggers a send.
    // Second call: the repo's unique index dedupes and hands back the
    // already-sent row → notify() must return it without sending again.
    notificationRepo.insertOrGetExisting
      .mockResolvedValueOnce(queuedRow)
      .mockResolvedValueOnce(sentRow);

    const first = await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);
    const second = await service.notify(WALLET, EVENT_TYPE, SOURCE_ID, PAYLOAD);

    expect(notificationRepo.insertOrGetExisting).toHaveBeenCalledTimes(2);
    // The send + markSent fire exactly once, on the first call only.
    expect(mockTransport.send).toHaveBeenCalledTimes(1);
    expect(notificationRepo.markSent).toHaveBeenCalledTimes(1);
    expect(first.status).toBe('sent');
    expect(second.status).toBe('sent');
    expect(second).toBe(sentRow);
  });
});

describe('NotificationService.notifyProjectTeam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEmailTransport.mockResolvedValue(mockTransport);
    notificationRepo.markSent.mockResolvedValue(sentRow);
    notificationRepo.markFailed.mockResolvedValue({ ...queuedRow, status: 'failed' });
  });

  it('calls notify once per non-null team member wallet', async () => {
    projectService.getProjectById.mockResolvedValue({
      projectName: 'My Project',
      teamMembers: [
        { walletAddress: '5Alice' },
        { walletAddress: null },
        { walletAddress: '5Bob' },
      ],
    });
    walletContactRepo.findByWallet.mockResolvedValue(null);
    notificationRepo.insertOrGetExisting.mockResolvedValue({ ...queuedRow, status: 'skipped', error: 'no_contact' });

    const results = await service.notifyProjectTeam('proj-1', 'm2_approved', 'proj-1', {});

    expect(results).toHaveLength(2);
    expect(walletContactRepo.findByWallet).toHaveBeenCalledTimes(2);
    expect(walletContactRepo.findByWallet).toHaveBeenCalledWith('5Alice');
    expect(walletContactRepo.findByWallet).toHaveBeenCalledWith('5Bob');
  });

  it('enriches payload with projectName from the fetched project', async () => {
    projectService.getProjectById.mockResolvedValue({
      projectName: 'My Project',
      teamMembers: [{ walletAddress: '5Alice' }],
    });
    walletContactRepo.findByWallet.mockResolvedValue(null);
    notificationRepo.insertOrGetExisting.mockResolvedValue({ ...queuedRow, status: 'skipped', error: 'no_contact' });

    await service.notifyProjectTeam('proj-1', 'm2_approved', 'proj-1', { extra: 'data' });

    expect(notificationRepo.insertOrGetExisting).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ projectName: 'My Project', extra: 'data' }),
      }),
    );
  });

  it('returns [] when the project has no team members', async () => {
    projectService.getProjectById.mockResolvedValue({ projectName: 'My Project', teamMembers: [] });
    const results = await service.notifyProjectTeam('proj-1', 'm2_approved', 'proj-1', {});
    expect(results).toEqual([]);
    expect(walletContactRepo.findByWallet).not.toHaveBeenCalled();
  });

  it('returns [] when getProjectById returns null', async () => {
    projectService.getProjectById.mockResolvedValue(null);
    const results = await service.notifyProjectTeam('proj-1', 'm2_approved', 'proj-1', {});
    expect(results).toEqual([]);
  });

  it('returns [] and does not throw when getProjectById rejects', async () => {
    projectService.getProjectById.mockRejectedValue(new Error('db error'));
    const results = await service.notifyProjectTeam('proj-1', 'm2_approved', 'proj-1', {});
    expect(results).toEqual([]);
  });
});
