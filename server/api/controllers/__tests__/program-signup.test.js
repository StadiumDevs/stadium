import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({
  default: { findBySlug: vi.fn() },
}));
vi.mock('../../services/program-signup.service.js', () => ({
  default: {
    listByProgramId: vi.fn(),
    countByProgramId: vi.fn(),
    planImport: vi.fn(),
    commitImport: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('../../repositories/program-signup.repository.js', () => ({
  default: { findById: vi.fn(), lastImportedAt: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../services/program-application.service.js', () => ({
  default: { listByProgram: vi.fn(), listByProject: vi.fn(), findOne: vi.fn(), create: vi.fn() },
}));
vi.mock('../../services/project.service.js', () => ({
  default: { getProjectById: vi.fn() },
}));
vi.mock('../../services/notification.service.js', () => ({
  default: { notifyOnApplicationStatusChange: vi.fn() },
}));
vi.mock('../../repositories/program-admin.repository.js', () => ({
  default: { listByProgram: vi.fn(), add: vi.fn(), remove: vi.fn() },
}));

const programService = (await import('../../services/program.service.js')).default;
const signupService = (await import('../../services/program-signup.service.js')).default;
const signupRepository = (await import('../../repositories/program-signup.repository.js')).default;
const programController = (await import('../program.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.end = vi.fn(() => res);
  return res;
};

const PROGRAM = { id: 'bitrefill-2026', slug: 'bitrefill-2026', name: 'Bitrefill 2026' };

describe('ProgramController.listSignups', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when the program is unknown', async () => {
    programService.findBySlug.mockResolvedValue(null);
    const req = { params: { slug: 'nope' } };
    const res = mockRes();
    await programController.listSignups(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns signups with a count meta', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    signupService.listByProgramId.mockResolvedValue([
      { id: 'a', email: 'alice@example.com' },
      { id: 'b', email: 'bob@example.com' },
    ]);
    const req = { params: { slug: PROGRAM.slug } };
    const res = mockRes();
    await programController.listSignups(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: expect.any(Array),
        meta: expect.objectContaining({ count: 2 }),
      }),
    );
  });
});

describe('ProgramController.importSignups', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 422 when the body has neither csv text nor a csv field', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    const req = { params: { slug: PROGRAM.slug }, body: {}, query: {} };
    const res = mockRes();
    await programController.importSignups(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when the csv body is whitespace only', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    const req = { params: { slug: PROGRAM.slug }, body: '   ', query: {} };
    const res = mockRes();
    await programController.importSignups(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('routes to planImport when dry_run=true and never inserts', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    signupService.planImport.mockResolvedValue({
      totalParsed: 3,
      skippedNoEmail: 0,
      duplicates: 1,
      newCount: 2,
      newRows: [
        { email: 'a@x.com', programId: PROGRAM.id },
        { email: 'b@x.com', programId: PROGRAM.id },
      ],
      newPreview: [{ email: 'a@x.com' }, { email: 'b@x.com' }],
      duplicatePreview: [{ email: 'dup@x.com' }],
    });
    const req = {
      params: { slug: PROGRAM.slug },
      body: { csv: 'Name,Email\nA,a@x.com\nB,b@x.com\nDup,dup@x.com' },
      query: { dry_run: 'true' },
    };
    const res = mockRes();
    await programController.importSignups(req, res);
    expect(signupService.planImport).toHaveBeenCalled();
    expect(signupService.commitImport).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.dryRun).toBe(true);
    expect(payload.data.newCount).toBe(2);
    expect(payload.data.duplicates).toBe(1);
    // The wire payload should not include the full newRows array.
    expect(payload.data.newRows).toBeUndefined();
    expect(payload.data.inserted).toEqual([]);
  });

  it('routes to commitImport when dry_run is absent and returns inserted', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    signupService.commitImport.mockResolvedValue({
      totalParsed: 2,
      skippedNoEmail: 0,
      duplicates: 0,
      newCount: 2,
      newRows: [],
      newPreview: [],
      duplicatePreview: [],
      inserted: [
        { id: '1', email: 'a@x.com' },
        { id: '2', email: 'b@x.com' },
      ],
    });
    const req = {
      params: { slug: PROGRAM.slug },
      body: 'Name,Email\nA,a@x.com\nB,b@x.com',
      query: {},
    };
    const res = mockRes();
    await programController.importSignups(req, res);
    expect(signupService.commitImport).toHaveBeenCalled();
    expect(signupService.planImport).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.data.dryRun).toBe(false);
    expect(payload.data.inserted).toHaveLength(2);
  });
});

describe('ProgramController.deleteSignup', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when the signup belongs to another program', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    signupRepository.findById.mockResolvedValue({ id: 'x', programId: 'other' });
    const req = { params: { slug: PROGRAM.slug, signupId: 'x' } };
    const res = mockRes();
    await programController.deleteSignup(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(signupService.delete).not.toHaveBeenCalled();
  });

  it('deletes and returns 204', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    signupRepository.findById.mockResolvedValue({ id: 'x', programId: PROGRAM.id });
    signupService.delete.mockResolvedValue();
    const req = { params: { slug: PROGRAM.slug, signupId: 'x' } };
    const res = mockRes();
    await programController.deleteSignup(req, res);
    expect(signupService.delete).toHaveBeenCalledWith('x');
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
