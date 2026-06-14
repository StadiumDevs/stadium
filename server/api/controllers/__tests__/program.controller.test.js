import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the service module before importing the controller.
vi.mock('../../services/program.service.js', () => ({
  default: {
    list: vi.fn(),
    findBySlug: vi.fn(),
  },
}));

vi.mock('../../services/program-asset.service.js', () => ({
  default: {
    isAllowedImageMime: vi.fn(),
    uploadCover: vi.fn(),
  },
  MAX_COVER_BYTES: 5 * 1024 * 1024,
}));

const programService = (await import('../../services/program.service.js')).default;
const programAssetService = (await import('../../services/program-asset.service.js')).default;
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

describe('ProgramController.uploadCoverImage', () => {
  beforeEach(() => vi.clearAllMocks());

  const pngFile = (size = 1024) => ({ mimetype: 'image/png', size, buffer: Buffer.alloc(0) });

  it('returns 422 when no file is provided', async () => {
    const req = { params: { slug: 'bitrefill-2026' }, file: undefined };
    const res = mockRes();
    await programController.uploadCoverImage(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(programAssetService.uploadCover).not.toHaveBeenCalled();
  });

  it('returns 422 for an unsupported mime type', async () => {
    programAssetService.isAllowedImageMime.mockReturnValue(false);
    const req = { params: { slug: 'bitrefill-2026' }, file: { mimetype: 'application/pdf', size: 10 } };
    const res = mockRes();
    await programController.uploadCoverImage(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(programAssetService.uploadCover).not.toHaveBeenCalled();
  });

  it('returns 422 when the file exceeds the size cap', async () => {
    programAssetService.isAllowedImageMime.mockReturnValue(true);
    const req = { params: { slug: 'bitrefill-2026' }, file: pngFile(6 * 1024 * 1024) };
    const res = mockRes();
    await programController.uploadCoverImage(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(programAssetService.uploadCover).not.toHaveBeenCalled();
  });

  it('returns 404 when the program does not exist', async () => {
    programAssetService.isAllowedImageMime.mockReturnValue(true);
    programService.findBySlug.mockResolvedValue(null);
    const req = { params: { slug: 'nope' }, file: pngFile() };
    const res = mockRes();
    await programController.uploadCoverImage(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(programAssetService.uploadCover).not.toHaveBeenCalled();
  });

  it('uploads and returns 201 with the public URL on success', async () => {
    programAssetService.isAllowedImageMime.mockReturnValue(true);
    programService.findBySlug.mockResolvedValue({ id: 'bitrefill-2026', slug: 'bitrefill-2026' });
    programAssetService.uploadCover.mockResolvedValue('https://cdn.example/program-assets/bitrefill-2026/cover-x.png');
    const req = { params: { slug: 'bitrefill-2026' }, file: pngFile() };
    const res = mockRes();
    await programController.uploadCoverImage(req, res);
    expect(programAssetService.uploadCover).toHaveBeenCalledWith({
      programId: 'bitrefill-2026',
      buffer: req.file.buffer,
      contentType: 'image/png',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      status: 'success',
      data: { url: 'https://cdn.example/program-assets/bitrefill-2026/cover-x.png' },
    });
  });

  it('returns 500 when the upload throws', async () => {
    programAssetService.isAllowedImageMime.mockReturnValue(true);
    programService.findBySlug.mockResolvedValue({ id: 'bitrefill-2026', slug: 'bitrefill-2026' });
    programAssetService.uploadCover.mockRejectedValue(new Error('storage down'));
    const req = { params: { slug: 'bitrefill-2026' }, file: pngFile() };
    const res = mockRes();
    await programController.uploadCoverImage(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
