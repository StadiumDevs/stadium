// AI feedback: the prompt (normalized scores, anonymized notes, no emails),
// the Claude call (structured output, refusal and format errors), and the
// admin endpoints (platform admin only, publish gate, draft vs published).
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../program.service.js', () => ({ default: { findBySlug: vi.fn() } }));
vi.mock('../../repositories/program-submission.repository.js', () => ({
  default: { findById: vi.fn(), listByProgramId: vi.fn(async () => []), updateTracked: vi.fn(async (id, x) => ({ id, projectTitle: 'P', details: { track: 'privacy' }, ...x })) },
}));
vi.mock('../../repositories/submission-rubric-score.repository.js', () => ({ default: { listByProgram: vi.fn(async () => []) } }));
vi.mock('../public-scores.service.js', () => ({ loadPublicScores: vi.fn() }));
vi.mock('../program-audit-log.service.js', () => ({ default: { logSafe: vi.fn() } }));

const svc = await import('../ai-feedback.service.js');
const { buildPrompt, cleanFeedback, generateFeedback, setAiClient } = svc;
const programService = (await import('../program.service.js')).default;
const repo = (await import('../../repositories/program-submission.repository.js')).default;
const scoresRepo = (await import('../../repositories/submission-rubric-score.repository.js')).default;
const { loadPublicScores } = await import('../public-scores.service.js');
const auditLog = (await import('../program-audit-log.service.js')).default;
const controller = (await import('../../controllers/ai-feedback.controller.js')).default;
const { toPublicSubmission } = await import('../../utils/public-submission.js');

const SCORE = {
  score: 12.4, max: 16, judges: 5,
  criteria: [
    { id: 'works', score: 2.8, max: 3, trackAvg: 1.9 },
    { id: 'needed', score: 1.1, max: 3, trackAvg: 1.6 },
  ],
};
const project = { title: 'Chai Ledger', pitch: 'Shielded café payments', description: 'Contact me at owner@chai.io', track: 'privacy', score: SCORE, notes: ['Great demo, see priya@judges.org', 'Needs real users'] };
const FEEDBACK = { summary: 'Solid shielded payments demo.', strengths: ['Working core flow'], improvements: ['Show real demand'] };
const fakeClient = (response) => ({ beta: { messages: { parse: vi.fn(async () => response) } } });

describe('prompt', () => {
  it('carries the normalized scores with track averages, anonymized notes, no emails', () => {
    const p = buildPrompt(project);
    expect(p).toContain('Total judge score (normalized average across all judges): 12.4 / 16');
    expect(p).toContain('Works: how much of the demonstrated core flow is real?: this project 2.8, track average 1.9, max 3');
    expect(p).toContain('- Judge A: Great demo');
    expect(p).toContain('- Judge B: Needs real users');
    expect(p).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });

  it('cleanFeedback trims, caps to 3 items and needs a summary', () => {
    expect(cleanFeedback({ summary: ' Hi ', strengths: ['a', ' ', 'b', 'c', 'd'], improvements: [] })).toEqual({ summary: 'Hi', strengths: ['a', 'b', 'c'], improvements: [] });
    expect(() => cleanFeedback({ summary: '  ', strengths: [], improvements: [] })).toThrow();
  });
});

describe('generateFeedback', () => {
  it('calls Claude with structured output and the refusal fallback, returns cleaned feedback', async () => {
    const c = fakeClient({ stop_reason: 'end_turn', parsed_output: FEEDBACK });
    setAiClient(c);
    expect(await generateFeedback(project)).toEqual(FEEDBACK);
    const args = c.beta.messages.parse.mock.calls[0][0];
    expect(args.model).toBe('claude-opus-5-5');
    expect(args.fallbacks).toBe('default');
    expect(args.betas).toEqual(['server-side-fallback-2026-07-01']);
    expect(args.output_config.format).toBeTruthy();
    expect(args.messages[0].content).toContain('Judge A');
  });

  it('a refusal or an unparsed response is an error', async () => {
    setAiClient(fakeClient({ stop_reason: 'refusal', parsed_output: null }));
    await expect(generateFeedback(project)).rejects.toMatchObject({ status: 422 });
    setAiClient(fakeClient({ stop_reason: 'end_turn', parsed_output: null }));
    await expect(generateFeedback(project)).rejects.toMatchObject({ status: 502 });
  });
});

describe('admin endpoints', () => {
  const ADMIN = { isGlobalAdmin: true, address: '5Admin' };
  const PROGRAM = { id: 'fsh', slug: 'free-society-hack-2026', resultsPublishedAt: '2026-11-09T10:00:00Z' };
  const sub = { id: 's1', programId: 'fsh', projectTitle: 'Chai Ledger', projectBrief: 'b', details: { track: 'privacy', pitch: 'p' }, aiFeedback: null };
  const res = () => {
    const r = {};
    r.status = vi.fn(() => r);
    r.json = vi.fn(() => r);
    return r;
  };
  const call = async (fn, { user = ADMIN, body = {}, params = {} } = {}) => {
    const r = res();
    await controller[fn]({ params: { slug: PROGRAM.slug, submissionId: 's1', ...params }, body, user }, r);
    return r;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    programService.findBySlug.mockResolvedValue(PROGRAM);
    repo.findById.mockResolvedValue(sub);
    loadPublicScores.mockResolvedValue({ bySubmission: new Map([['s1', { privacy: SCORE }]]), judgesByTrack: { privacy: 5 } });
    scoresRepo.listByProgram.mockResolvedValue([
      { submissionId: 's1', track: 'privacy', judgeEmail: 'j1@x.io', notes: 'Great demo' },
      { submissionId: 's1', track: 'privacy', judgeEmail: 'j2@x.io', notes: '' },
      { submissionId: 'other', track: 'privacy', judgeEmail: 'j1@x.io', notes: 'Not this one' },
    ]);
    setAiClient(fakeClient({ stop_reason: 'end_turn', parsed_output: FEEDBACK }));
  });

  it('only platform admins; only after results are published; 503 without a key', async () => {
    expect((await call('generate', { user: { address: '5Prog' } })).status).toHaveBeenCalledWith(403);
    programService.findBySlug.mockResolvedValue({ ...PROGRAM, resultsPublishedAt: null });
    expect((await call('generate')).status).toHaveBeenCalledWith(409);
    programService.findBySlug.mockResolvedValue(PROGRAM);
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    expect((await call('generate')).status).toHaveBeenCalledWith(503);
  });

  it("generate stores a draft from this project's notes only (not published), audit-logged", async () => {
    const r = await call('generate');
    expect(r.status).toHaveBeenCalledWith(200);
    const saved = repo.updateTracked.mock.calls[0][1].aiFeedback;
    expect(saved.draft).toEqual(FEEDBACK);
    expect(saved.published).toBeUndefined();
    expect(auditLog.logSafe).toHaveBeenCalledWith(expect.objectContaining({ action: 'tracked.ai_feedback_generate', metadata: expect.objectContaining({ notes: 1 }) }));
  });

  it('edits are validated; publish copies drafts; unpublish clears', async () => {
    expect((await call('update', { body: { draft: { summary: '', strengths: [], improvements: [] } } })).status).toHaveBeenCalledWith(400);
    expect((await call('update', { body: { draft: { summary: 'Edited', strengths: ['x'], improvements: [] } } })).status).toHaveBeenCalledWith(200);
    repo.listByProgramId.mockResolvedValue([{ ...sub, aiFeedback: { draft: FEEDBACK } }, { ...sub, id: 's2', aiFeedback: null }]);
    const pub = await call('publish');
    expect(pub.json.mock.calls[0][0].data.count).toBe(1);
    const published = repo.updateTracked.mock.calls.at(-1)[1].aiFeedback;
    expect(published.published).toEqual(FEEDBACK);
    repo.listByProgramId.mockResolvedValue([{ ...sub, aiFeedback: { draft: FEEDBACK, published: FEEDBACK } }]);
    await call('unpublish');
    expect(repo.updateTracked.mock.calls.at(-1)[1].aiFeedback.published).toBeNull();
  });
});

describe('public serializer', () => {
  const s = { id: 's1', projectTitle: 'P', details: { track: 'privacy' }, prizes: {}, aiFeedback: { draft: { summary: 'draft only' }, published: FEEDBACK } };
  it('exposes only the published feedback, only once results are published, never the draft', () => {
    expect(toPublicSubmission(s, { published: true }).aiFeedback).toEqual(FEEDBACK);
    expect(toPublicSubmission(s, { published: false })).not.toHaveProperty('aiFeedback');
    expect(JSON.stringify(toPublicSubmission(s, { published: true }))).not.toContain('draft only');
    expect(toPublicSubmission({ ...s, aiFeedback: { draft: FEEDBACK } }, { published: true })).not.toHaveProperty('aiFeedback');
  });
});
