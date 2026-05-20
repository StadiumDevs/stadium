import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({
  default: {
    findBySlug: vi.fn(),
  },
}));
vi.mock('../../services/program-sponsor.service.js', () => ({
  default: {
    listByProgramId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('../../services/program-application.service.js', () => ({
  default: {
    listByProgram: vi.fn(),
    listByProject: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock('../../services/project.service.js', () => ({
  default: { getProjectById: vi.fn() },
}));
vi.mock('../../services/notification.service.js', () => ({
  default: { notifyOnApplicationStatusChange: vi.fn() },
}));
vi.mock('../../repositories/program-admin.repository.js', () => ({
  default: {
    listByProgram: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  },
}));

const programService = (await import('../../services/program.service.js')).default;
const sponsorService = (await import('../../services/program-sponsor.service.js')).default;
const programController = (await import('../program.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.end = vi.fn(() => res);
  return res;
};

const PROGRAM = { id: 'dogfooding-2026-berlin', slug: 'dogfooding-2026-berlin', name: 'Dogfooding 2026' };

describe('ProgramController.listSponsors', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when the program is unknown', async () => {
    programService.findBySlug.mockResolvedValue(null);
    const req = { params: { slug: 'nope' } };
    const res = mockRes();
    await programController.listSponsors(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the program sponsors', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    sponsorService.listByProgramId.mockResolvedValue([
      { id: 'a', name: 'Bitrefill', targetProfiles: ['developer'] },
    ]);
    const req = { params: { slug: PROGRAM.slug } };
    const res = mockRes();
    await programController.listSponsors(req, res);
    expect(sponsorService.listByProgramId).toHaveBeenCalledWith(PROGRAM.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'success', data: expect.any(Array) }),
    );
  });
});

describe('ProgramController.createSponsor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 422 when name is missing', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    const req = { params: { slug: PROGRAM.slug }, body: { name: '' } };
    const res = mockRes();
    await programController.createSponsor(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when submissionTarget is negative', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    const req = {
      params: { slug: PROGRAM.slug },
      body: { name: 'Bitrefill', submissionTarget: -1 },
    };
    const res = mockRes();
    await programController.createSponsor(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when applyUrl is malformed', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    const req = {
      params: { slug: PROGRAM.slug },
      body: { name: 'Bitrefill', applyUrl: 'ftp://nope' },
    };
    const res = mockRes();
    await programController.createSponsor(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('creates the sponsor with programId stamped from the URL', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    sponsorService.create.mockImplementation((p) => Promise.resolve({ id: 'new', ...p }));
    const body = {
      name: 'Bitrefill',
      submissionTarget: 10,
      targetProfiles: ['developer', 'designer'],
      applicationInstructions: 'Email apply@bitrefill.com',
      applyUrl: 'https://bitrefill.com/apply',
    };
    const req = { params: { slug: PROGRAM.slug }, body };
    const res = mockRes();
    await programController.createSponsor(req, res);
    expect(sponsorService.create).toHaveBeenCalledWith(
      expect.objectContaining({ ...body, programId: PROGRAM.id }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('ProgramController.updateSponsor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when the sponsor does not belong to the program', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    sponsorService.findById.mockResolvedValue({ id: 'x', programId: 'other-program' });
    const req = {
      params: { slug: PROGRAM.slug, sponsorId: 'x' },
      body: { name: 'patched' },
    };
    const res = mockRes();
    await programController.updateSponsor(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(sponsorService.update).not.toHaveBeenCalled();
  });

  it('returns 422 when a partial patch fails validation', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    sponsorService.findById.mockResolvedValue({ id: 'x', programId: PROGRAM.id });
    const req = {
      params: { slug: PROGRAM.slug, sponsorId: 'x' },
      body: { applyUrl: 'not-a-url' },
    };
    const res = mockRes();
    await programController.updateSponsor(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('applies a valid partial patch', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    sponsorService.findById.mockResolvedValue({ id: 'x', programId: PROGRAM.id });
    sponsorService.update.mockResolvedValue({ id: 'x', name: 'Bitrefill', followUpNotes: 'Send recap' });
    const req = {
      params: { slug: PROGRAM.slug, sponsorId: 'x' },
      body: { followUpNotes: 'Send recap' },
    };
    const res = mockRes();
    await programController.updateSponsor(req, res);
    expect(sponsorService.update).toHaveBeenCalledWith('x', { followUpNotes: 'Send recap' });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('ProgramController.deleteSponsor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when sponsor belongs to a different program', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    sponsorService.findById.mockResolvedValue({ id: 'x', programId: 'other-program' });
    const req = { params: { slug: PROGRAM.slug, sponsorId: 'x' } };
    const res = mockRes();
    await programController.deleteSponsor(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(sponsorService.delete).not.toHaveBeenCalled();
  });

  it('deletes and returns 204', async () => {
    programService.findBySlug.mockResolvedValue(PROGRAM);
    sponsorService.findById.mockResolvedValue({ id: 'x', programId: PROGRAM.id });
    sponsorService.delete.mockResolvedValue();
    const req = { params: { slug: PROGRAM.slug, sponsorId: 'x' } };
    const res = mockRes();
    await programController.deleteSponsor(req, res);
    expect(sponsorService.delete).toHaveBeenCalledWith('x');
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
