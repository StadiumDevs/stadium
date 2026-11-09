import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/program-submission.repository.js', () => ({ default: { listByProgramId: vi.fn() } }));
vi.mock('../../repositories/submission-rubric-score.repository.js', () => ({ default: { listByProgram: vi.fn() } }));
vi.mock('../../repositories/program-admin-email.repository.js', () => ({ default: { listJudges: vi.fn() } }));

const { default: submissionRepo } = await import('../../repositories/program-submission.repository.js');
const { default: scoreRepo } = await import('../../repositories/submission-rubric-score.repository.js');
const { default: judgeRepo } = await import('../../repositories/program-admin-email.repository.js');
const { rankingSnapshot, snapshotForProgram } = await import('../results-ranking.service.js');

const crit = { works: 2, private: 2, easy: 2, needed: 2, continuing: 2, bonus: 0 };
const sub = (id, track) => ({ id, projectTitle: id, status: 'submitted', details: { track }, prizes: {}, ecosystemPrize: false });

describe('rankingSnapshot', () => {
  const on = { normalization: { enabled: true, available: true, method: 'offset' } };
  const unavailable = { normalization: { enabled: true, available: false, method: 'offset' } };

  it('records normalized + method per track, raw where the track could not normalize', () => {
    expect(rankingSnapshot({ privacy: on, agentic: unavailable }, true)).toEqual({
      privacy: { normalized: true, method: 'offset' },
      agentic: { normalized: false, method: null },
    });
  });

  it('records raw for every track when the admin published with the toggle off', () => {
    expect(rankingSnapshot({ privacy: on }, false)).toEqual({ privacy: { normalized: false, method: null } });
  });
});

describe('snapshotForProgram', () => {
  beforeEach(() => vi.clearAllMocks());

  it('gates each track on its own scoring judges (Privacy 2 judges, Agentic none)', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([sub('a', 'privacy'), sub('b', 'both')]);
    scoreRepo.listByProgram.mockResolvedValue([
      { submissionId: 'a', judgeEmail: 'j1@x', track: 'privacy', criteria: crit },
      { submissionId: 'b', judgeEmail: 'j2@x', track: 'privacy', criteria: crit },
    ]);
    judgeRepo.listJudges.mockResolvedValue([{ email: 'j1@x', tracks: [] }, { email: 'j2@x', tracks: [] }]);
    const snap = await snapshotForProgram({ program: { id: 'p1' }, tracked: {}, normalized: true });
    expect(snap).toEqual({ privacy: { normalized: true, method: 'offset' }, agentic: { normalized: false, method: null } });
  });
});
