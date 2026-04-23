import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/project.service.js', () => ({
  default: {
    getProjectById: vi.fn(),
  },
}));

vi.mock('../../services/project-update.service.js', () => ({
  default: {
    listByProject: vi.fn(),
    create: vi.fn(),
  },
}));

// Payment service is imported transitively via the controller — stub it so
// its polkadot-api side effects don't fire during unit tests.
vi.mock('../../services/payment.service.js', () => ({
  default: {
    constructTransfer: vi.fn(),
    prepareMultisigTransaction: vi.fn(),
  },
}));

const projectService = (await import('../../services/project.service.js')).default;
const projectUpdateService = (await import('../../services/project-update.service.js')).default;
const projectController = (await import('../project.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe('ProjectController.getProjectUpdates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when project does not exist', async () => {
    projectService.getProjectById.mockResolvedValue(null);
    const req = { params: { projectId: 'nope' } };
    const res = mockRes();
    await projectController.getProjectUpdates(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(projectUpdateService.listByProject).not.toHaveBeenCalled();
  });

  it('returns 200 with empty array when no updates exist', async () => {
    projectService.getProjectById.mockResolvedValue({ id: 'p1' });
    projectUpdateService.listByProject.mockResolvedValue([]);
    const req = { params: { projectId: 'p1' } };
    const res = mockRes();
    await projectController.getProjectUpdates(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: [] });
  });

  it('returns 200 with the update list when updates exist', async () => {
    const updates = [
      { id: 'u1', projectId: 'p1', body: 'hello', linkUrl: null, createdBy: 'addr', createdAt: 't1' },
    ];
    projectService.getProjectById.mockResolvedValue({ id: 'p1' });
    projectUpdateService.listByProject.mockResolvedValue(updates);
    const req = { params: { projectId: 'p1' } };
    const res = mockRes();
    await projectController.getProjectUpdates(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: updates });
  });
});

describe('ProjectController.postProjectUpdate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when project does not exist', async () => {
    projectService.getProjectById.mockResolvedValue(null);
    const req = { params: { projectId: 'nope' }, body: { body: 'hi' }, user: { address: 'a' } };
    const res = mockRes();
    await projectController.postProjectUpdate(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 422 when body is empty', async () => {
    projectService.getProjectById.mockResolvedValue({ id: 'p1' });
    const req = { params: { projectId: 'p1' }, body: { body: '' }, user: { address: 'a' } };
    const res = mockRes();
    await projectController.postProjectUpdate(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when body exceeds 2000 chars', async () => {
    projectService.getProjectById.mockResolvedValue({ id: 'p1' });
    const longBody = 'x'.repeat(2001);
    const req = { params: { projectId: 'p1' }, body: { body: longBody }, user: { address: 'a' } };
    const res = mockRes();
    await projectController.postProjectUpdate(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when linkUrl is malformed', async () => {
    projectService.getProjectById.mockResolvedValue({ id: 'p1' });
    const req = {
      params: { projectId: 'p1' },
      body: { body: 'ok', linkUrl: 'not-a-url' },
      user: { address: 'a' },
    };
    const res = mockRes();
    await projectController.postProjectUpdate(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('creates an update on valid payload and returns 201', async () => {
    projectService.getProjectById.mockResolvedValue({ id: 'p1' });
    const created = { id: 'u1', projectId: 'p1', body: 'hi', linkUrl: null, createdBy: 'addr' };
    projectUpdateService.create.mockResolvedValue(created);
    const req = {
      params: { projectId: 'p1' },
      body: { body: '  hi  ', linkUrl: '' },
      user: { address: 'addr' },
    };
    const res = mockRes();
    await projectController.postProjectUpdate(req, res);
    expect(projectUpdateService.create).toHaveBeenCalledWith({
      projectId: 'p1',
      body: 'hi',
      linkUrl: null,
      createdBy: 'addr',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: created });
  });

  it('passes linkUrl through after trimming when present', async () => {
    projectService.getProjectById.mockResolvedValue({ id: 'p1' });
    projectUpdateService.create.mockResolvedValue({ id: 'u1' });
    const req = {
      params: { projectId: 'p1' },
      body: { body: 'hi', linkUrl: '  https://example.com/post  ' },
      user: { address: 'addr' },
    };
    const res = mockRes();
    await projectController.postProjectUpdate(req, res);
    expect(projectUpdateService.create).toHaveBeenCalledWith(
      expect.objectContaining({ linkUrl: 'https://example.com/post' }),
    );
  });
});
