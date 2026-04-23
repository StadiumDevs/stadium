import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({
  default: {
    findBySlug: vi.fn(),
    create: vi.fn(),
    updateBySlug: vi.fn(),
  },
}));
vi.mock('../../services/project.service.js', () => ({
  default: { getProjectById: vi.fn() },
}));
vi.mock('../../services/program-application.service.js', () => ({
  default: {
    listByProgram: vi.fn(),
    listByProject: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

const programService = (await import('../../services/program.service.js')).default;
const programController = (await import('../program.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

const validPayload = {
  name: 'Dogfooding 2026',
  slug: 'dogfooding-2026',
  programType: 'dogfooding',
  status: 'draft',
  description: 'A week in Berlin.',
  applicationsOpenAt: '2026-04-22T00:00:00Z',
  applicationsCloseAt: '2026-05-30T23:59:59Z',
  eventStartsAt: '2026-06-13T00:00:00Z',
  eventEndsAt: '2026-06-19T23:59:59Z',
  location: 'Berlin',
};

describe('ProgramController.createProgram', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 422 when name is missing', async () => {
    const req = { body: { ...validPayload, name: '' } };
    const res = mockRes();
    await programController.createProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 for non-kebab slug', async () => {
    const req = { body: { ...validPayload, slug: 'Not Valid Slug' } };
    const res = mockRes();
    await programController.createProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 for invalid programType', async () => {
    const req = { body: { ...validPayload, programType: 'bogus' } };
    const res = mockRes();
    await programController.createProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when applications window is inverted', async () => {
    const req = {
      body: {
        ...validPayload,
        applicationsOpenAt: '2026-06-01T00:00:00Z',
        applicationsCloseAt: '2026-05-01T00:00:00Z',
      },
    };
    const res = mockRes();
    await programController.createProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 409 on slug pre-check conflict', async () => {
    programService.findBySlug.mockResolvedValue({ id: 'existing' });
    const req = { body: validPayload };
    const res = mockRes();
    await programController.createProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'slug_conflict' }));
  });

  it('returns 409 on DB unique_violation race', async () => {
    programService.findBySlug.mockResolvedValue(null);
    const err = Object.assign(new Error('dup'), { code: '23505' });
    programService.create.mockRejectedValue(err);
    const req = { body: validPayload };
    const res = mockRes();
    await programController.createProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('creates the program with an id and owner=webzero', async () => {
    programService.findBySlug.mockResolvedValue(null);
    programService.create.mockImplementation((p) => Promise.resolve({ ...p, createdAt: 'now' }));
    const req = { body: validPayload };
    const res = mockRes();
    await programController.createProgram(req, res);
    expect(programService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Dogfooding 2026',
        slug: 'dogfooding-2026',
        programType: 'dogfooding',
        owner: 'webzero',
      }),
    );
    const call = programService.create.mock.calls[0][0];
    expect(typeof call.id).toBe('string');
    expect(call.id.length).toBeGreaterThan(0);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('ProgramController.updateProgram', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when program is unknown', async () => {
    programService.findBySlug.mockResolvedValue(null);
    const req = { params: { slug: 'nope' }, body: { name: 'new' } };
    const res = mockRes();
    await programController.updateProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 422 when partial payload is invalid', async () => {
    programService.findBySlug.mockResolvedValue({ slug: 's', name: 'n' });
    const req = { params: { slug: 's' }, body: { programType: 'bogus' } };
    const res = mockRes();
    await programController.updateProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 409 when the new slug collides with a different program', async () => {
    programService.findBySlug
      .mockResolvedValueOnce({ slug: 'old', name: 'old' })
      .mockResolvedValueOnce({ slug: 'new', name: 'other' });
    const req = { params: { slug: 'old' }, body: { slug: 'new' } };
    const res = mockRes();
    await programController.updateProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('updates on valid patch', async () => {
    programService.findBySlug.mockResolvedValue({ slug: 's', name: 'n' });
    programService.updateBySlug.mockResolvedValue({ slug: 's', name: 'updated' });
    const req = { params: { slug: 's' }, body: { name: 'updated' } };
    const res = mockRes();
    await programController.updateProgram(req, res);
    expect(programService.updateBySlug).toHaveBeenCalledWith('s', { name: 'updated' });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
