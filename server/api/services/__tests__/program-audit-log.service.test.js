import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/program-audit-log.repository.js', () => ({
  default: { insert: vi.fn(), listByProgramId: vi.fn() },
}));

const repo = (await import('../../repositories/program-audit-log.repository.js')).default;
const { default: service } = await import('../program-audit-log.service.js');

beforeEach(() => vi.clearAllMocks());

describe('logSafe', () => {
  it('inserts a normalised row when programId + action are present', async () => {
    repo.insert.mockResolvedValue({ id: 'audit-1' });
    const out = await service.logSafe({
      programId: 'bitrefill-2026',
      actor: { chain: 'substrate', wallet: '5Alice' },
      action: 'sponsor.add',
      targetType: 'sponsor',
      targetId: 'sponsor-1',
      metadata: { name: 'Bitrefill' },
    });
    expect(out).toEqual({ id: 'audit-1' });
    expect(repo.insert).toHaveBeenCalledWith({
      programId: 'bitrefill-2026',
      actorChain: 'substrate',
      actorWallet: '5Alice',
      action: 'sponsor.add',
      targetType: 'sponsor',
      targetId: 'sponsor-1',
      metadata: { name: 'Bitrefill' },
    });
  });

  it('skips the write when programId is missing', async () => {
    const out = await service.logSafe({ action: 'x' });
    expect(out).toBeNull();
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('skips the write when action is missing', async () => {
    const out = await service.logSafe({ programId: 'x' });
    expect(out).toBeNull();
    expect(repo.insert).not.toHaveBeenCalled();
  });

  it('returns null and never throws when the insert errors', async () => {
    repo.insert.mockRejectedValue(new Error('DB down'));
    const out = await service.logSafe({
      programId: 'bitrefill-2026',
      action: 'sponsor.add',
    });
    expect(out).toBeNull();
  });

  it('stringifies non-string targetId so JSONB queries stay sane', async () => {
    repo.insert.mockResolvedValue({ id: 'audit-2' });
    await service.logSafe({
      programId: 'p',
      action: 'a',
      targetId: 42,
    });
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: '42' }),
    );
  });

  it('passes through null targetId without stringifying', async () => {
    repo.insert.mockResolvedValue({ id: 'audit-3' });
    await service.logSafe({
      programId: 'p',
      action: 'signups.import',
      targetId: null,
    });
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: null }),
    );
  });
});

describe('listByProgramId', () => {
  it('passes through to the repository', async () => {
    repo.listByProgramId.mockResolvedValue([{ id: 'a' }]);
    const out = await service.listByProgramId('p', { limit: 10 });
    expect(repo.listByProgramId).toHaveBeenCalledWith('p', { limit: 10 });
    expect(out).toEqual([{ id: 'a' }]);
  });
});
