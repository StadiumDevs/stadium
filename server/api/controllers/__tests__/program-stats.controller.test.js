import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({ default: { findBySlug: vi.fn() } }));
vi.mock('../../repositories/program.repository.js', () => ({ default: { getStatsSnapshot: vi.fn(), setStatsSnapshot: vi.fn() } }));
vi.mock('../../repositories/program-submission.repository.js', () => ({ default: { listByProgramId: vi.fn() } }));
vi.mock('../../repositories/submission-rubric-score.repository.js', () => ({ default: { listByProgram: vi.fn() } }));
vi.mock('../../repositories/program-admin-email.repository.js', () => ({ default: { listJudges: vi.fn() } }));
vi.mock('../../repositories/submission-experience-rating.repository.js', () => ({ default: { listByProgramId: vi.fn() } }));
vi.mock('../../services/program-audit-log.service.js', () => ({ default: { logSafe: vi.fn() } }));

const { default: programService } = await import('../../services/program.service.js');
const { default: programRepo } = await import('../../repositories/program.repository.js');
const { default: submissionRepo } = await import('../../repositories/program-submission.repository.js');
const { default: scoreRepo } = await import('../../repositories/submission-rubric-score.repository.js');
const { default: judgeRepo } = await import('../../repositories/program-admin-email.repository.js');
const { default: ratingRepo } = await import('../../repositories/submission-experience-rating.repository.js');
const { default: controller } = await import('../program-stats.controller.js');

const SLUG = 'free-society-hack-2026';
const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};
const admin = { params: { slug: SLUG }, user: { address: '5Admin', isGlobalAdmin: true } };
const programAdmin = { params: { slug: SLUG }, user: { address: '5Prog', isGlobalAdmin: false } };
const crit = { works: 3, private: 3, easy: 2, needed: 2, continuing: 2, bonus: 0 };
const sub = (id, title, track, over = {}) => ({
  id, projectTitle: title, submitterName: id, lumaEmail: `${id}@x.io`, status: 'submitted', prizes: {}, ecosystemPrize: false,
  videoUrl: null, githubUrl: null, details: { track, pitch: 'p', team: [] }, ...over,
});
let scores;

beforeEach(() => {
  vi.clearAllMocks();
  programService.findBySlug.mockResolvedValue({ id: 'p1', slug: SLUG, statsPublishedAt: null });
  submissionRepo.listByProgramId.mockResolvedValue([
    sub('a', 'Zsol', 'privacy'),
    sub('b', 'Pegasus', 'agentic'),
    sub('t', 'Example Project', 'both', { isTestEntry: true }),
  ]);
  scores = [
    { submissionId: 'a', judgeEmail: 'j1@x', track: 'privacy', criteria: crit },
    { submissionId: 't', judgeEmail: 'j1@x', track: 'privacy', criteria: crit },
  ];
  scoreRepo.listByProgram.mockImplementation(async () => scores);
  judgeRepo.listJudges.mockResolvedValue([{ email: 'j1@x', tracks: [] }]);
  ratingRepo.listByProgramId.mockResolvedValue([]);
  programRepo.setStatsSnapshot.mockImplementation(async (_slug, _s, at) => ({ statsPublishedAt: at }));
});

describe('ProgramStatsController', () => {
  it('preview and publish are platform-admin only', async () => {
    for (const fn of ['preview', 'publish']) {
      const res = mockRes();
      await controller[fn](programAdmin, res);
      expect(res.status).toHaveBeenCalledWith(403);
    }
    expect(programRepo.setStatsSnapshot).not.toHaveBeenCalled();
  });

  it('404s a program without a stats config', async () => {
    const res = mockRes();
    await controller.getPublished({ params: { slug: 'bitrefill' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('public: 404 before publishing, the snapshot after', async () => {
    let res = mockRes();
    await controller.getPublished({ params: { slug: SLUG } }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    programService.findBySlug.mockResolvedValue({ id: 'p1', slug: SLUG, statsPublishedAt: '2026-11-09T10:00:00.000Z' });
    programRepo.getStatsSnapshot.mockResolvedValue({ headline: { submissions: 2 } });
    res = mockRes();
    await controller.getPublished({ params: { slug: SLUG } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data).toEqual({ stats: { headline: { submissions: 2 } }, publishedAt: '2026-11-09T10:00:00.000Z' });
  });

  it('preview: live stats exclude the test entry and carry the checks', async () => {
    const res = mockRes();
    await controller.preview(admin, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.stats.headline.submissions).toBe(2);
    expect(data.checks.testEntries).toEqual(['Example Project']);
    expect(data.changedSincePublish).toBe(false);
    expect(JSON.stringify(data.stats)).not.toContain('Example Project');
  });

  it('publish stores the snapshot without the checks; a later score change shows "changed since publish"', async () => {
    let res = mockRes();
    await controller.publish(admin, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const [slug, snapshot, publishedAt] = programRepo.setStatsSnapshot.mock.calls[0];
    expect(slug).toBe(SLUG);
    expect(snapshot.checks).toBeUndefined();
    // The composite ranking is admin only: never in the published snapshot or response.
    expect(snapshot).not.toHaveProperty('composite');
    expect(res.json.mock.calls[0][0].data.stats).not.toHaveProperty('composite');
    expect(publishedAt).toBe(snapshot.generatedAt);

    programService.findBySlug.mockResolvedValue({ id: 'p1', slug: SLUG, statsPublishedAt: publishedAt });
    programRepo.getStatsSnapshot.mockResolvedValue(snapshot);
    res = mockRes();
    await controller.preview(admin, res);
    expect(res.json.mock.calls[0][0].data.changedSincePublish).toBe(false);
    // The admin preview keeps it (for the CSV download).
    expect(res.json.mock.calls[0][0].data.stats.composite.length).toBeGreaterThan(0);

    scores[0] = { ...scores[0], criteria: { ...crit, works: 0 } };
    res = mockRes();
    await controller.preview(admin, res);
    expect(res.json.mock.calls[0][0].data.changedSincePublish).toBe(true);
    // The public endpoint still serves the stored snapshot.
    res = mockRes();
    await controller.getPublished({ params: { slug: SLUG } }, res);
    expect(res.json.mock.calls[0][0].data.stats).toEqual(snapshot);
    // An older snapshot that still has the composite is served without it.
    programRepo.getStatsSnapshot.mockResolvedValue({ ...snapshot, composite: [{ rank: 1 }] });
    res = mockRes();
    await controller.getPublished({ params: { slug: SLUG } }, res);
    expect(res.json.mock.calls[0][0].data.stats).not.toHaveProperty('composite');
  });
});

describe('GET stats/llms.txt', () => {
  const textRes = () => {
    const res = mockRes();
    res.set = vi.fn(() => res);
    res.send = vi.fn(() => res);
    return res;
  };

  it('404 before publishing', async () => {
    const res = textRes();
    await controller.getLlms({ params: { slug: SLUG } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('serves the published snapshot as plain text, without emails', async () => {
    const pub = mockRes();
    await controller.publish(admin, pub);
    const snapshot = pub.json.mock.calls[0][0].data.stats;
    programService.findBySlug.mockResolvedValue({ id: 'p1', slug: SLUG, name: 'Free Society Hack', statsPublishedAt: '2026-11-09T10:00:00.000Z' });
    programRepo.getStatsSnapshot.mockResolvedValue(snapshot);
    const res = textRes();
    await controller.getLlms({ params: { slug: SLUG } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
    expect(res.set).toHaveBeenCalledWith('Content-Disposition', `inline; filename="${SLUG}-stats-llms-2026-11-09.txt"`);
    const text = res.send.mock.calls[0][0];
    expect(text).toContain('Format: stats-llms v1');
    expect(text).toContain('Snapshot published: 2026-11-09T10:00:00.000Z');
    expect(text).toContain('/programs/free-society-hack-2026/stats');
    // Package names (@noir-wallet/sdk) and X handles may appear; emails never.
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(text).not.toContain('x.io');
    expect(text).not.toContain('Example Project');
  });
});
