import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/program-signup.repository.js', () => ({
  default: { listByProgramId: vi.fn() },
}));

const signupRepository = (await import('../../repositories/program-signup.repository.js')).default;
const signupService = (await import('../program-signup.service.js')).default;

const signup = (raw) => ({ id: Math.random().toString(36), email: 'x@y.z', rawRow: raw });

describe('ProgramSignupService.projectSummaryByProgramId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns [] when there are no signups', async () => {
    signupRepository.listByProgramId.mockResolvedValue([]);
    expect(await signupService.projectSummaryByProgramId('p1')).toEqual([]);
  });

  it('returns [] when no raw_row column mentions "project"', async () => {
    signupRepository.listByProgramId.mockResolvedValue([
      signup({ Name: 'Ada', Telegram: '@ada' }),
    ]);
    expect(await signupService.projectSummaryByProgramId('p1')).toEqual([]);
  });

  it('aggregates by the project column, sorted by count desc then alpha', async () => {
    signupRepository.listByProgramId.mockResolvedValue([
      signup({ Name: 'A', 'Which project would you like to try?': 'Proof of Thought' }),
      signup({ Name: 'B', 'Which project would you like to try?': 'Chain of Providence' }),
      signup({ Name: 'C', 'Which project would you like to try?': 'Proof of Thought' }),
      signup({ Name: 'D', 'Which project would you like to try?': 'Proof of Thought' }),
      signup({ Name: 'E', 'Which project would you like to try?': 'Chain of Providence' }),
    ]);
    const result = await signupService.projectSummaryByProgramId('p1');
    expect(result).toEqual([
      { project: 'Proof of Thought', count: 3 },
      { project: 'Chain of Providence', count: 2 },
    ]);
  });

  it('trims values, ignores empty/whitespace/non-string, and never leaks PII', async () => {
    signupRepository.listByProgramId.mockResolvedValue([
      signup({ 'Project pick': '  Sproto Gremlins  ' }),
      signup({ 'Project pick': '' }),
      signup({ 'Project pick': '   ' }),
      signup({ 'Project pick': 42 }),
      signup({ 'Project pick': 'Sproto Gremlins' }),
      signup(null),
    ]);
    const result = await signupService.projectSummaryByProgramId('p1');
    expect(result).toEqual([{ project: 'Sproto Gremlins', count: 2 }]);
    // PII-free: every entry has only the two safe keys.
    for (const row of result) {
      expect(Object.keys(row).sort()).toEqual(['count', 'project']);
    }
  });
});
