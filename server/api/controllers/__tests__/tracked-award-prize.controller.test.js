// Awarding a track prize: prefixed tiers belong to their track; a tier with no
// track prefix ("Zcash ecosystem prize", as saved in production) belongs to the
// Ecosystem track (Privacy for FSH), limited to the number of copies saved.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tierBelongsToTrack, tierLimit } from '../../utils/track-prize-tiers.js';
import { trackedProgramFor } from '../../constants/trackedPrograms.js';

vi.mock('../../services/program.service.js', () => ({ default: { findBySlug: vi.fn() } }));
vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: { findById: vi.fn(), listByProgramId: vi.fn(async () => []), updateTracked: vi.fn(async (id, x) => ({ id, ...x })) },
}));
vi.mock('../../repositories/submission-rubric-score.repository.js', () => ({ default: { listByProgram: vi.fn(async () => []) } }));
vi.mock('../../repositories/program-admin-email.repository.js', () => ({ default: { listJudges: vi.fn(async () => []) } }));
vi.mock('../../services/tx-check.service.js', () => ({ checkAndStore: vi.fn() }));
vi.mock('../../auth/supabaseUser.js', () => ({ extractSupabaseToken: vi.fn(), getSupabaseUser: vi.fn() }));
vi.mock('../../services/program-audit-log.service.js', () => ({ default: { logSafe: vi.fn() } }));

const programService = (await import('../../services/program.service.js')).default;
const submissionRepo = (await import('../../repositories/program-submission.repository.js')).default;
const scoreRepo = (await import('../../repositories/submission-rubric-score.repository.js')).default;
const controller = (await import('../tracked-results.controller.js')).default;

// The production FSH prize config (9 Nov 2026).
const PROD_TIERS = [
  { label: 'Privacy: top prize', amount: 1300, currency: 'USDC' },
  { label: 'Privacy: second prize', amount: 300, currency: 'USDC' },
  { label: 'Privacy: third prize', amount: 200, currency: 'USDC' },
  { label: 'Agentic Commerce: most innovative', amount: 1000, currency: 'USD' },
  { label: 'Agentic Commerce: second', amount: 800, currency: 'USD' },
  { label: 'Agentic Commerce: third', amount: 600, currency: 'USD' },
  { label: 'Agentic Commerce: best feedback', amount: 100, currency: 'USD' },
  { label: 'Zcash ecosystem prize', amount: 100, currency: 'USDC' },
  { label: 'Zcash ecosystem prize', amount: 100, currency: 'USDC' },
];
const ECO = PROD_TIERS[7];
const FSH = { id: 'fsh', slug: 'free-society-hack-2026', prizeTiers: PROD_TIERS };
const tracked = trackedProgramFor(FSH.slug);
const ADMIN = { isGlobalAdmin: true, address: '5Admin', chain: 'polkadot' };
const full = { works: 2, private: 2, easy: 2, needed: 2, continuing: 2, bonus: 0 };
const entry = (id, track = 'privacy', prizes = {}) => ({ id, programId: 'fsh', details: { track, pitch: 'x' }, prizes, status: 'submitted' });

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};
const award = async (id, track, amount) => {
  const res = mockRes();
  await controller.awardPrize({ params: { slug: FSH.slug, submissionId: id, track }, body: { amount }, user: ADMIN }, res);
  return res;
};

beforeEach(() => {
  vi.clearAllMocks();
  programService.findBySlug.mockResolvedValue(FSH);
  scoreRepo.listByProgram.mockResolvedValue(
    ['a', 'b', 'c', 'g'].map((id) => ({ submissionId: id, judgeEmail: 'j@x', track: id === 'g' ? 'agentic' : 'privacy', criteria: id === 'g' ? { requirements: 4, techStack: 4, innovation: 4 } : full })),
  );
});

describe('tier rule', () => {
  it('unprefixed tiers belong to the Ecosystem track only', () => {
    expect(tierBelongsToTrack(ECO, 'privacy', tracked)).toBe(true);
    expect(tierBelongsToTrack(ECO, 'agentic', tracked)).toBe(false);
    expect(tierBelongsToTrack(PROD_TIERS[0], 'privacy', tracked)).toBe(true);
    expect(tierBelongsToTrack(PROD_TIERS[0], 'agentic', tracked)).toBe(false);
    expect(tierBelongsToTrack(PROD_TIERS[6], 'agentic', tracked)).toBe(true);
  });

  it('an unprefixed tier is limited to the copies saved; configured limits win', () => {
    expect(tierLimit(ECO, 'privacy', tracked, PROD_TIERS)).toBe(2);
    expect(tierLimit(PROD_TIERS[0], 'privacy', tracked, PROD_TIERS)).toBe(1);
    expect(tierLimit(PROD_TIERS[1], 'privacy', tracked, PROD_TIERS)).toBe(2);
  });
});

describe('awardPrize with the production tiers', () => {
  it('awards the Zcash ecosystem prize on Privacy to a non-podium project', async () => {
    submissionRepo.findById.mockResolvedValue(entry('a'));
    const res = await award('a', 'privacy', 100);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.updateTracked).toHaveBeenCalledWith('a', expect.objectContaining({ prizes: { privacy: { amount: 100, currency: 'USDC', label: 'Zcash ecosystem prize' } } }));
  });

  it('amount 100 on Agentic is still "best feedback", never the ecosystem prize', async () => {
    submissionRepo.findById.mockResolvedValue(entry('g', 'agentic'));
    const res = await award('g', 'agentic', 100);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(submissionRepo.updateTracked.mock.calls[0][1].prizes.agentic.label).toBe('Agentic Commerce: best feedback');
  });

  it('refuses a third ecosystem prize (two saved in the config)', async () => {
    submissionRepo.findById.mockResolvedValue(entry('c'));
    submissionRepo.listByProgramId.mockResolvedValue([
      entry('a', 'privacy', { privacy: { ...ECO } }),
      entry('b', 'privacy', { privacy: { ...ECO } }),
      entry('c'),
    ]);
    const res = await award('c', 'privacy', 100);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json.mock.calls[0][0].message).toBe('Zcash ecosystem prize already has 2 winners. Clear one first.');
  });

  it('prefixed tiers behave as before', async () => {
    submissionRepo.findById.mockResolvedValue(entry('a'));
    expect((await award('a', 'privacy', 1300)).status).toHaveBeenCalledWith(200);
    expect((await award('a', 'privacy', 1000)).status).toHaveBeenCalledWith(400);
  });
});
