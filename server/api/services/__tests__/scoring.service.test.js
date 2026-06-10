import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: { listByProgramId: vi.fn(), findById: vi.fn(), setPromotedProject: vi.fn() },
}));
vi.mock('../project.service.js', () => ({ default: { createProject: vi.fn() } }));
vi.mock('../../repositories/submission-score.repository.js', () => ({
  default: { listByProgramId: vi.fn(), listByJudge: vi.fn() },
}));
vi.mock('../../repositories/program-judge-ballot.repository.js', () => ({
  default: { find: vi.fn(), listSubmitted: vi.fn(), markSubmitted: vi.fn() },
}));
vi.mock('../../repositories/program-admin-email.repository.js', () => ({
  default: { listJudges: vi.fn() },
}));
vi.mock('../../repositories/program-signup.repository.js', () => ({
  default: { listEmailsByProgramId: vi.fn() },
}));

const scoringService = (await import('../scoring.service.js')).default;
const submissionRepo = (await import('../../repositories/program-submission.repository.js')).default;
const scoreRepo = (await import('../../repositories/submission-score.repository.js')).default;
const ballotRepo = (await import('../../repositories/program-judge-ballot.repository.js')).default;
const emailRepo = (await import('../../repositories/program-admin-email.repository.js')).default;
const signupRepo = (await import('../../repositories/program-signup.repository.js')).default;
const projectService = (await import('../project.service.js')).default;

const score = (submissionId, judgeEmail, requirements, techStack, innovation) => ({
  submissionId, judgeEmail, requirements, techStack, innovation,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no signups loaded (eligibility flags compute as false). Individual
  // tests override when they care about eligibility.
  signupRepo.listEmailsByProgramId.mockResolvedValue(new Set());
});

describe('scoringService.leaderboard — gating', () => {
  it('locks until every registered judge has submitted', async () => {
    emailRepo.listJudges.mockResolvedValue([
      { email: 'a@x.com' }, { email: 'b@x.com' }, { email: 'c@x.com' },
    ]);
    ballotRepo.listSubmitted.mockResolvedValue([
      { judgeEmail: 'a@x.com' }, { judgeEmail: 'b@x.com' },
    ]);
    submissionRepo.listByProgramId.mockResolvedValue([]);
    scoreRepo.listByProgramId.mockResolvedValue([]);

    const r = await scoringService.leaderboard('prog-1');
    expect(r.locked).toBe(true);
    expect(r.submitted).toBe(2);
    expect(r.total).toBe(3);
    expect(r.pending).toEqual(['c@x.com']);
  });

  it('locks when there are no registered judges', async () => {
    emailRepo.listJudges.mockResolvedValue([]);
    ballotRepo.listSubmitted.mockResolvedValue([]);
    submissionRepo.listByProgramId.mockResolvedValue([]);
    scoreRepo.listByProgramId.mockResolvedValue([]);

    const r = await scoringService.leaderboard('prog-1');
    expect(r.locked).toBe(true);
    expect(r.total).toBe(0);
  });
});

describe('scoringService.leaderboard — tally', () => {
  it('ranks by mean total once all judges submitted, ignoring non-registered scores', async () => {
    emailRepo.listJudges.mockResolvedValue([{ email: 'a@x.com' }, { email: 'b@x.com' }]);
    ballotRepo.listSubmitted.mockResolvedValue([
      { judgeEmail: 'a@x.com' }, { judgeEmail: 'b@x.com' },
    ]);
    submissionRepo.listByProgramId.mockResolvedValue([
      { id: 's1', projectTitle: 'Alpha', submitterName: 'A', githubUrl: 'g1', videoUrl: 'v1' },
      { id: 's2', projectTitle: 'Beta', submitterName: 'B', githubUrl: 'g2', videoUrl: 'v2' },
    ]);
    scoreRepo.listByProgramId.mockResolvedValue([
      // s1: judge a=12, b=10 -> mean 11 ; s2: a=6, b=6 -> mean 6
      score('s1', 'a@x.com', 2, 5, 5),
      score('s1', 'b@x.com', 2, 5, 3),
      score('s2', 'a@x.com', 1, 3, 2),
      score('s2', 'b@x.com', 1, 3, 2),
      // a wallet-admin (not a registered judge) score must be ignored
      score('s2', '5WalletAdmin', 2, 5, 5),
    ]);

    const r = await scoringService.leaderboard('prog-1');
    expect(r.locked).toBe(false);
    expect(r.rows[0]).toMatchObject({ rank: 1, submissionId: 's1', avgTotal: 11, judgeCount: 2 });
    expect(r.rows[1]).toMatchObject({ rank: 2, submissionId: 's2', avgTotal: 6, judgeCount: 2 });
  });

  it('breaks ties by innovation then tech stack', async () => {
    emailRepo.listJudges.mockResolvedValue([{ email: 'a@x.com' }]);
    ballotRepo.listSubmitted.mockResolvedValue([{ judgeEmail: 'a@x.com' }]);
    submissionRepo.listByProgramId.mockResolvedValue([
      { id: 's1', projectTitle: 'Alpha' },
      { id: 's2', projectTitle: 'Beta' },
    ]);
    scoreRepo.listByProgramId.mockResolvedValue([
      // both total 8, but s2 has higher innovation
      score('s1', 'a@x.com', 2, 4, 2),
      score('s2', 'a@x.com', 2, 2, 4),
    ]);

    const r = await scoringService.leaderboard('prog-1');
    expect(r.rows[0].submissionId).toBe('s2');
    expect(r.rows[1].submissionId).toBe('s1');
  });
});

describe('scoringService.submitBallot', () => {
  it('blocks submission until every submission is scored', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    scoreRepo.listByJudge.mockResolvedValue([{ submissionId: 's1' }]);

    const r = await scoringService.submitBallot('prog-1', 'a@x.com');
    expect(r.ok).toBe(false);
    expect(r.missing).toBe(1);
    expect(ballotRepo.markSubmitted).not.toHaveBeenCalled();
  });

  it('marks the ballot submitted when all are scored', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    scoreRepo.listByJudge.mockResolvedValue([{ submissionId: 's1' }, { submissionId: 's2' }]);

    const r = await scoringService.submitBallot('prog-1', 'a@x.com');
    expect(r.ok).toBe(true);
    expect(ballotRepo.markSubmitted).toHaveBeenCalledWith('prog-1', 'a@x.com');
  });
});

describe('scoringService.promoteToProject', () => {
  const program = { id: 'prog-1', slug: 'bitrefill-2026', name: 'Bitrefill 2026' };

  it('creates a Stadium project from the submission and links it back', async () => {
    submissionRepo.findById.mockResolvedValue({
      id: 'sub-1', programId: 'prog-1', projectTitle: 'Aurora Pay',
      submitterName: 'Ada', lumaEmail: 'ada@x.com', videoUrl: 'https://v', githubUrl: 'https://gh',
    });
    projectService.createProject.mockResolvedValue({ id: 'aurora-pay-ab12' });

    const r = await scoringService.promoteToProject(program, 'sub-1');

    expect(r.project.id).toBe('aurora-pay-ab12');
    expect(projectService.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'Aurora Pay',
        projectRepo: 'https://gh',
        demoUrl: 'https://v',
        hackathon: { id: 'bitrefill-2026', name: 'Bitrefill 2026' },
        program: { id: 'prog-1' },
        teamMembers: [expect.objectContaining({ name: 'Ada' })],
      }),
    );
    expect(submissionRepo.setPromotedProject).toHaveBeenCalledWith('sub-1', 'aurora-pay-ab12');
  });

  it('is idempotent — returns the existing project without creating a second', async () => {
    submissionRepo.findById.mockResolvedValue({ id: 'sub-1', programId: 'prog-1', promotedProjectId: 'existing-1' });
    const r = await scoringService.promoteToProject(program, 'sub-1');
    expect(r.alreadyPromoted).toBe(true);
    expect(r.projectId).toBe('existing-1');
    expect(projectService.createProject).not.toHaveBeenCalled();
  });

  it('404s a submission from another program', async () => {
    submissionRepo.findById.mockResolvedValue({ id: 'sub-1', programId: 'other' });
    const r = await scoringService.promoteToProject(program, 'sub-1');
    expect(r.notFound).toBe(true);
  });
});

describe('scoringService.listForJudge — eligibility flag', () => {
  it('flags submissions whose Luma email is not in signups (advisory, still listed)', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([
      { id: 's1', lumaEmail: 'in@x.com', projectTitle: 'In' },
      { id: 's2', lumaEmail: 'out@x.com', projectTitle: 'Out' },
    ]);
    scoreRepo.listByJudge.mockResolvedValue([]);
    signupRepo.listEmailsByProgramId.mockResolvedValue(new Set(['In@x.com'])); // case-insensitive
    ballotRepo.find.mockResolvedValue(null);

    const r = await scoringService.listForJudge('prog-1', 'judge@x.com');
    expect(r.submissions.find((s) => s.id === 's1').eligible).toBe(true);
    expect(r.submissions.find((s) => s.id === 's2').eligible).toBe(false);
    expect(r.submissions).toHaveLength(2); // ineligible still listed
    expect(r.locked).toBe(false);
  });
});
