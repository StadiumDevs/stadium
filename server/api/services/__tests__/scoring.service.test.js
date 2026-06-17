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
vi.mock('../../repositories/program-judge-batch.repository.js', () => ({
  default: { listByJudge: vi.fn(), listByProgram: vi.fn(), claim: vi.fn() },
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
const batchRepo = (await import('../../repositories/program-judge-batch.repository.js')).default;
const emailRepo = (await import('../../repositories/program-admin-email.repository.js')).default;
const signupRepo = (await import('../../repositories/program-signup.repository.js')).default;
const projectService = (await import('../project.service.js')).default;

const score = (submissionId, judgeEmail, requirements, techStack, innovation) => ({
  submissionId, judgeEmail, requirements, techStack, innovation,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Sensible defaults; tests override what they care about.
  signupRepo.listEmailsByProgramId.mockResolvedValue(new Set());
  emailRepo.listJudges.mockResolvedValue([]);
  batchRepo.listByJudge.mockResolvedValue([]);
  batchRepo.listByProgram.mockResolvedValue([]);
});

describe('scoringService.leaderboard — coverage gate', () => {
  it('shows live standings (not locked) but flags complete:false until every submission is scored', async () => {
    ballotRepo.listSubmitted.mockResolvedValue([{ judgeEmail: 'a@x.com' }]);
    emailRepo.listJudges.mockResolvedValue([{ email: 'a@x.com' }, { email: 'b@x.com' }]);
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    scoreRepo.listByProgramId.mockResolvedValue([score('s1', 'a@x.com', 2, 5, 5)]); // s2 unscored

    const r = await scoringService.leaderboard('prog-1');
    expect(r.locked).toBe(false);
    expect(r.complete).toBe(false);
    expect(r.submissionsScored).toBe(1);
    expect(r.submissionsTotal).toBe(2);
    expect(r.pendingJudges).toEqual(['b@x.com']);
    expect(r.rows).toHaveLength(2); // both submissions shown, s2 at 0
  });

  it('shows live standings even when no judge has submitted a ballot', async () => {
    ballotRepo.listSubmitted.mockResolvedValue([]);
    emailRepo.listJudges.mockResolvedValue([]);
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }]);
    scoreRepo.listByProgramId.mockResolvedValue([]);

    const r = await scoringService.leaderboard('prog-1');
    expect(r.locked).toBe(false);
    expect(r.complete).toBe(false);
    expect(r.submissionsTotal).toBe(1);
    expect(r.rows).toHaveLength(1);
  });
});

describe('scoringService.leaderboard — tally + per-judge breakdown', () => {
  it('counts email-judge scores live (excludes wallet/admin preview), ranks by mean', async () => {
    emailRepo.listJudges.mockResolvedValue([{ email: 'a@x.com' }, { email: 'b@x.com' }]);
    ballotRepo.listSubmitted.mockResolvedValue([{ judgeEmail: 'a@x.com' }, { judgeEmail: 'b@x.com' }]);
    submissionRepo.listByProgramId.mockResolvedValue([
      { id: 's1', projectTitle: 'Alpha', submitterName: 'A', githubUrl: 'g1', videoUrl: 'v1' },
      { id: 's2', projectTitle: 'Beta', submitterName: 'B', githubUrl: 'g2', videoUrl: 'v2' },
    ]);
    scoreRepo.listByProgramId.mockResolvedValue([
      score('s1', 'a@x.com', 2, 5, 5), // 12
      score('s1', 'b@x.com', 2, 5, 3), // 10  -> mean 11
      score('s2', 'a@x.com', 1, 3, 2), // 6
      score('s2', 'b@x.com', 1, 3, 2), // 6  -> mean 6
      score('s2', '5WalletAdmin', 2, 5, 5), // wallet (no @) -> NOT counted
    ]);

    const r = await scoringService.leaderboard('prog-1');
    expect(r.locked).toBe(false);
    expect(r.complete).toBe(true);
    expect(r.rows[0]).toMatchObject({ rank: 1, submissionId: 's1', avgTotal: 11, judgeCount: 2 });
    // Wallet-admin preview score is ignored -> s2 stays at 2 judges / mean 6.
    expect(r.rows[1]).toMatchObject({ rank: 2, submissionId: 's2', avgTotal: 6, judgeCount: 2 });
    expect(r.rows[1].judgeScores).toHaveLength(2);
    expect(r.rows[1].judgeScores.every((s) => s.judgeEmail.includes('@'))).toBe(true);
  });

  it("includes the viewing judge's own score per row (for inline edit from results)", async () => {
    emailRepo.listJudges.mockResolvedValue([{ email: 'a@x.com' }, { email: 'b@x.com' }]);
    ballotRepo.listSubmitted.mockResolvedValue([]);
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1', projectTitle: 'Alpha' }, { id: 's2', projectTitle: 'Beta' }]);
    scoreRepo.listByProgramId.mockResolvedValue([
      score('s1', 'a@x.com', 2, 5, 5),
      score('s2', 'b@x.com', 1, 1, 1),
    ]);

    const r = await scoringService.leaderboard('prog-1', 'a@x.com');
    const byId = Object.fromEntries(r.rows.map((row) => [row.submissionId, row]));
    expect(byId.s1.myScore).toMatchObject({ requirements: 2, techStack: 5, innovation: 5 });
    expect(byId.s2.myScore).toBeNull(); // a@x.com didn't score s2
  });

  it('breaks ties by innovation then tech stack', async () => {
    emailRepo.listJudges.mockResolvedValue([{ email: 'a@x.com' }]);
    ballotRepo.listSubmitted.mockResolvedValue([{ judgeEmail: 'a@x.com' }]);
    submissionRepo.listByProgramId.mockResolvedValue([
      { id: 's1', projectTitle: 'Alpha' },
      { id: 's2', projectTitle: 'Beta' },
    ]);
    scoreRepo.listByProgramId.mockResolvedValue([
      score('s1', 'a@x.com', 2, 4, 2),
      score('s2', 'a@x.com', 2, 2, 4),
    ]);

    const r = await scoringService.leaderboard('prog-1');
    expect(r.rows[0].submissionId).toBe('s2');
    expect(r.rows[1].submissionId).toBe('s1');
  });

  it('surfaces each submission\'s paid flag (payout tracking)', async () => {
    emailRepo.listJudges.mockResolvedValue([{ email: 'a@x.com' }]);
    ballotRepo.listSubmitted.mockResolvedValue([{ judgeEmail: 'a@x.com' }]);
    submissionRepo.listByProgramId.mockResolvedValue([
      { id: 's1', projectTitle: 'Alpha', paid: true },
      { id: 's2', projectTitle: 'Beta' }, // no paid field -> defaults false
    ]);
    scoreRepo.listByProgramId.mockResolvedValue([
      score('s1', 'a@x.com', 2, 5, 5),
      score('s2', 'a@x.com', 1, 1, 1),
    ]);

    const r = await scoringService.leaderboard('prog-1');
    const byId = Object.fromEntries(r.rows.map((row) => [row.submissionId, row]));
    expect(byId.s1.paid).toBe(true);
    expect(byId.s2.paid).toBe(false);
  });
});

describe('scoringService.submitBallot — scoped to claimed batches', () => {
  it('blocks when a claimed-batch submission is unscored', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    batchRepo.listByJudge.mockResolvedValue([1]); // both s1,s2 are batch 1
    scoreRepo.listByJudge.mockResolvedValue([{ submissionId: 's1' }]);

    const r = await scoringService.submitBallot('prog-1', 'a@x.com');
    expect(r.ok).toBe(false);
    expect(r.missing).toBe(1);
    expect(ballotRepo.markSubmitted).not.toHaveBeenCalled();
  });

  it('marks submitted when all claimed-batch submissions are scored', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    batchRepo.listByJudge.mockResolvedValue([1]);
    scoreRepo.listByJudge.mockResolvedValue([{ submissionId: 's1' }, { submissionId: 's2' }]);

    const r = await scoringService.submitBallot('prog-1', 'a@x.com');
    expect(r.ok).toBe(true);
    expect(ballotRepo.markSubmitted).toHaveBeenCalledWith('prog-1', 'a@x.com');
  });

  it('refuses to submit when the judge has claimed no batch', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }]);
    batchRepo.listByJudge.mockResolvedValue([]);
    scoreRepo.listByJudge.mockResolvedValue([]);

    const r = await scoringService.submitBallot('prog-1', 'a@x.com');
    expect(r.ok).toBe(false);
    expect(r.noClaims).toBe(true);
    expect(ballotRepo.markSubmitted).not.toHaveBeenCalled();
  });
});

describe('scoringService.claimBatch — least-covered pick', () => {
  it('claims the least-covered batch the judge does not already hold', async () => {
    // 25 submissions -> 3 batches. Batch 1 has 2 claims, batch 2 has 1, batch 3 has 0.
    submissionRepo.listByProgramId.mockResolvedValue(
      Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, lumaEmail: `e${i}@x.com` })),
    );
    batchRepo.listByProgram.mockResolvedValue([
      { judgeEmail: 'x@x.com', batchNumber: 1 },
      { judgeEmail: 'y@x.com', batchNumber: 1 },
      { judgeEmail: 'x@x.com', batchNumber: 2 },
    ]);
    batchRepo.listByJudge.mockResolvedValue([]); // this judge holds none
    ballotRepo.find.mockResolvedValue(null);

    const r = await scoringService.claimBatch('prog-1', 'me@x.com');
    expect(r.claimed).toBe(3); // batch 3 has the fewest claims
    expect(batchRepo.claim).toHaveBeenCalledWith('prog-1', 'me@x.com', 3);
  });

  it('rejects an out-of-range explicit batch number', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }]); // 1 batch
    batchRepo.listByProgram.mockResolvedValue([]);
    batchRepo.listByJudge.mockResolvedValue([]);

    const r = await scoringService.claimBatch('prog-1', 'me@x.com', 5);
    expect(r.invalid).toBe(true);
    expect(batchRepo.claim).not.toHaveBeenCalled();
  });
});

describe('scoringService.isJudgingComplete — coverage', () => {
  it('true only when every submission has a score from a submitted judge', async () => {
    ballotRepo.listSubmitted.mockResolvedValue([{ judgeEmail: 'a@x.com' }]);
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    scoreRepo.listByProgramId.mockResolvedValue([
      score('s1', 'a@x.com', 2, 5, 5),
      score('s2', 'a@x.com', 1, 3, 2),
    ]);
    expect(await scoringService.isJudgingComplete('prog-1')).toBe(true);
  });

  it('false when a submission is left unscored', async () => {
    ballotRepo.listSubmitted.mockResolvedValue([{ judgeEmail: 'a@x.com' }]);
    submissionRepo.listByProgramId.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
    scoreRepo.listByProgramId.mockResolvedValue([score('s1', 'a@x.com', 2, 5, 5)]);
    expect(await scoringService.isJudgingComplete('prog-1')).toBe(false);
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

describe('scoringService.listForJudge — eligibility + batches', () => {
  it('flags ineligible submissions, tags batch numbers, still lists all', async () => {
    submissionRepo.listByProgramId.mockResolvedValue([
      { id: 's1', lumaEmail: 'in@x.com', projectTitle: 'In' },
      { id: 's2', lumaEmail: 'out@x.com', projectTitle: 'Out' },
    ]);
    scoreRepo.listByJudge.mockResolvedValue([]);
    signupRepo.listEmailsByProgramId.mockResolvedValue(new Set(['In@x.com'])); // case-insensitive
    ballotRepo.find.mockResolvedValue(null);
    ballotRepo.listSubmitted.mockResolvedValue([]);

    const r = await scoringService.listForJudge('prog-1', 'judge@x.com');
    expect(r.submissions.find((s) => s.id === 's1').eligible).toBe(true);
    expect(r.submissions.find((s) => s.id === 's2').eligible).toBe(false);
    expect(r.submissions).toHaveLength(2);
    expect(r.submissions.every((s) => s.batchNumber === 1)).toBe(true); // 2 subs -> batch 1
    expect(r.batchSize).toBe(10);
    expect(r.batches).toHaveLength(1);
    expect(r.locked).toBe(false);
  });
});
