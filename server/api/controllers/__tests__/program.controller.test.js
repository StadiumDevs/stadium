import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the service module before importing the controller.
vi.mock('../../services/program.service.js', () => ({
  default: {
    list: vi.fn(),
    findBySlug: vi.fn(),
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

describe('ProgramController.list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with an empty data array when no programs exist', async () => {
    programService.list.mockResolvedValue([]);
    const req = { query: {} };
    const res = mockRes();
    await programController.list(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: [] });
    expect(programService.list).toHaveBeenCalledWith({ status: undefined });
  });

  it('returns 200 with the list when programs exist', async () => {
    const programs = [
      { id: 'dogfooding-2026', name: 'Dogfooding 2026', slug: 'dogfooding-2026', status: 'open' },
    ];
    programService.list.mockResolvedValue(programs);
    const req = { query: {} };
    const res = mockRes();
    await programController.list(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: programs });
  });

  it('forwards a valid status filter to the service', async () => {
    programService.list.mockResolvedValue([]);
    const req = { query: { status: 'open' } };
    const res = mockRes();
    await programController.list(req, res);
    expect(programService.list).toHaveBeenCalledWith({ status: 'open' });
  });

  it('returns 400 for an invalid status filter', async () => {
    const req = { query: { status: 'bogus' } };
    const res = mockRes();
    await programController.list(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(programService.list).not.toHaveBeenCalled();
  });

  it('returns 500 when the service throws', async () => {
    programService.list.mockRejectedValue(new Error('boom'));
    const req = { query: {} };
    const res = mockRes();
    await programController.list(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('ProgramController.getBySlug', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 with the program when found', async () => {
    const program = { id: 'dogfooding-2026', slug: 'dogfooding-2026', name: 'Dogfooding 2026' };
    programService.findBySlug.mockResolvedValue(program);
    const req = { params: { slug: 'dogfooding-2026' } };
    const res = mockRes();
    await programController.getBySlug(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: program });
  });

  it('returns 404 when the program is not found', async () => {
    programService.findBySlug.mockResolvedValue(null);
    const req = { params: { slug: 'nonexistent' } };
    const res = mockRes();
    await programController.getBySlug(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
