import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../db.js', () => ({
  supabase: { from: vi.fn() },
}));

const { supabase } = await import('../../../db.js');
const repo = (await import('../notification.repository.js')).default;

function makeChain(overrides = {}) {
  const chain = {
    insert: vi.fn(() => chain),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => chain),
    ...overrides,
  };
  return chain;
}

const baseRow = {
  id: 'uuid-1',
  recipient_wallet: '5Alice',
  event_type: 'application_accepted',
  source_id: 'proj-1',
  payload: { projectName: 'Test' },
  status: 'queued',
  provider_message_id: null,
  error: null,
  created_at: '2026-05-11T00:00:00Z',
  sent_at: null,
};

const transformedRow = {
  id: 'uuid-1',
  recipientWallet: '5Alice',
  eventType: 'application_accepted',
  sourceId: 'proj-1',
  payload: { projectName: 'Test' },
  status: 'queued',
  providerMessageId: null,
  error: null,
  createdAt: '2026-05-11T00:00:00Z',
  sentAt: null,
};

describe('NotificationRepository.insertOrGetExisting', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the transformed row on a successful insert', async () => {
    const chain = makeChain({
      single: vi.fn(() => Promise.resolve({ data: baseRow, error: null })),
    });
    supabase.from.mockReturnValue(chain);

    const result = await repo.insertOrGetExisting({
      recipient: '5Alice',
      eventType: 'application_accepted',
      sourceId: 'proj-1',
      payload: { projectName: 'Test' },
      status: 'queued',
    });

    expect(result).toEqual(transformedRow);
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient_wallet: '5Alice',
        event_type: 'application_accepted',
        source_id: 'proj-1',
        status: 'queued',
      }),
    );
  });

  it('falls back to SELECT when insert returns a 23505 unique-violation', async () => {
    const uniqueError = Object.assign(new Error('duplicate key'), { code: '23505' });

    // First call: insert chain returns 23505 error
    const insertChain = makeChain({
      single: vi.fn(() => Promise.resolve({ data: null, error: uniqueError })),
    });

    // Second call: select chain returns existing row
    const selectChain = makeChain({
      single: vi.fn(() => Promise.resolve({ data: baseRow, error: null })),
    });

    supabase.from
      .mockReturnValueOnce(insertChain)
      .mockReturnValueOnce(selectChain);

    const result = await repo.insertOrGetExisting({
      recipient: '5Alice',
      eventType: 'application_accepted',
      sourceId: 'proj-1',
      payload: { projectName: 'Test' },
      status: 'queued',
    });

    expect(result).toEqual(transformedRow);
    expect(selectChain.eq).toHaveBeenCalledWith('recipient_wallet', '5Alice');
    expect(selectChain.eq).toHaveBeenCalledWith('event_type', 'application_accepted');
    expect(selectChain.eq).toHaveBeenCalledWith('source_id', 'proj-1');
  });

  it('rethrows when insert returns a non-23505 error', async () => {
    const dbError = Object.assign(new Error('connection failed'), { code: '08006' });
    const chain = makeChain({
      single: vi.fn(() => Promise.resolve({ data: null, error: dbError })),
    });
    supabase.from.mockReturnValue(chain);

    await expect(
      repo.insertOrGetExisting({
        recipient: '5Alice',
        eventType: 'application_accepted',
        sourceId: 'proj-1',
        payload: {},
        status: 'queued',
      }),
    ).rejects.toThrow('connection failed');
  });
});

describe('NotificationRepository.markSent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates status to sent and returns the transformed row', async () => {
    const sentRow = {
      ...baseRow,
      status: 'sent',
      provider_message_id: 'msg-abc',
      sent_at: '2026-05-11T01:00:00Z',
    };
    const chain = makeChain({
      single: vi.fn(() => Promise.resolve({ data: sentRow, error: null })),
    });
    supabase.from.mockReturnValue(chain);

    const result = await repo.markSent('uuid-1', 'msg-abc');

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'sent',
        provider_message_id: 'msg-abc',
        sent_at: expect.any(String),
      }),
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'uuid-1');
    expect(result).toMatchObject({
      id: 'uuid-1',
      status: 'sent',
      providerMessageId: 'msg-abc',
    });
  });
});

describe('NotificationRepository.markFailed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates status to failed with error message and returns the transformed row', async () => {
    const failedRow = {
      ...baseRow,
      status: 'failed',
      error: 'delivery_failed',
    };
    const chain = makeChain({
      single: vi.fn(() => Promise.resolve({ data: failedRow, error: null })),
    });
    supabase.from.mockReturnValue(chain);

    const result = await repo.markFailed('uuid-1', 'delivery_failed');

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: 'delivery_failed',
      }),
    );
    expect(chain.eq).toHaveBeenCalledWith('id', 'uuid-1');
    expect(result).toMatchObject({
      id: 'uuid-1',
      status: 'failed',
      error: 'delivery_failed',
    });
  });
});
