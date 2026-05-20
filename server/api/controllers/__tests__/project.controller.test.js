import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/project.service.js', () => ({
  default: { updateProject: vi.fn(), getProjectById: vi.fn(), createProject: vi.fn() },
}));
vi.mock('../../services/project-update.service.js', () => ({
  default: { listByProject: vi.fn(), create: vi.fn() },
}));
vi.mock('../../services/funding-signal.service.js', () => ({
  default: { getByProject: vi.fn(), upsert: vi.fn() },
}));
vi.mock('../../services/payment.service.js', () => ({
  default: { parseBalance: vi.fn(), constructTransfer: vi.fn() },
}));
vi.mock('../../services/notification.service.js', () => ({
  default: { notifyProjectTeam: vi.fn() },
}));
vi.mock('../../../config/polkadot-config.js', () => ({
  getAuthorizedAddresses: vi.fn(() => []),
}));

const projectService = (await import('../../services/project.service.js')).default;
const notificationService = (await import('../../services/notification.service.js')).default;
const projectController = (await import('../project.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe('ProjectController.createProject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 201 when payload is valid', async () => {
    const created = { id: 'test-project', projectName: 'Test Project' };
    projectService.createProject.mockResolvedValue(created);
    const req = { body: { projectName: 'Test Project' } };
    const res = mockRes();
    await projectController.createProject(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: created });
    expect(projectService.createProject).toHaveBeenCalledWith({ projectName: 'Test Project' });
  });

  it('returns 400 when projectName is missing', async () => {
    const req = { body: {} };
    const res = mockRes();
    await projectController.createProject(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(projectService.createProject).not.toHaveBeenCalled();
  });

  it('returns 400 when teamMembers contains an invalid entry', async () => {
    const req = { body: { projectName: 'Test Project', teamMembers: [{ name: '' }] } };
    const res = mockRes();
    await projectController.createProject(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(projectService.createProject).not.toHaveBeenCalled();
  });

  it('returns 500 when service throws', async () => {
    projectService.createProject.mockRejectedValue(new Error('db error'));
    const req = { body: { projectName: 'Test Project' } };
    const res = mockRes();
    await projectController.createProject(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('ProjectController.approveM2', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 and calls notifyProjectTeam with m2_approved', async () => {
    const updated = { id: 'proj-1', m2Status: 'completed' };
    projectService.updateProject.mockResolvedValue(updated);
    notificationService.notifyProjectTeam.mockResolvedValue([]);
    const req = { params: { projectId: 'proj-1' } };
    const res = mockRes();
    await projectController.approveM2(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: updated });
    expect(notificationService.notifyProjectTeam).toHaveBeenCalledWith('proj-1', 'm2_approved', 'proj-1', {});
  });

  it('returns 200 even when notifyProjectTeam rejects', async () => {
    projectService.updateProject.mockResolvedValue({ id: 'proj-1', m2Status: 'completed' });
    notificationService.notifyProjectTeam.mockRejectedValue(new Error('boom'));
    const req = { params: { projectId: 'proj-1' } };
    const res = mockRes();
    await projectController.approveM2(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 404 when project is not found', async () => {
    projectService.updateProject.mockResolvedValue(null);
    const req = { params: { projectId: 'nope' } };
    const res = mockRes();
    await projectController.approveM2(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(notificationService.notifyProjectTeam).not.toHaveBeenCalled();
  });
});

describe('ProjectController.requestChanges', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 200 and calls notifyProjectTeam with m2_changes_requested', async () => {
    const updated = { id: 'proj-1', m2Status: 'building' };
    projectService.updateProject.mockResolvedValue(updated);
    notificationService.notifyProjectTeam.mockResolvedValue([]);
    const req = { params: { projectId: 'proj-1' }, body: { feedback: 'Fix the docs' } };
    const res = mockRes();
    await projectController.requestChanges(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: updated });
    expect(notificationService.notifyProjectTeam).toHaveBeenCalledWith(
      'proj-1',
      'm2_changes_requested',
      expect.stringMatching(/^proj-1:/),
      expect.objectContaining({ feedback: 'Fix the docs' }),
    );
  });

  it('returns 200 even when notifyProjectTeam rejects', async () => {
    projectService.updateProject.mockResolvedValue({ id: 'proj-1', m2Status: 'building' });
    notificationService.notifyProjectTeam.mockRejectedValue(new Error('boom'));
    const req = { params: { projectId: 'proj-1' }, body: { feedback: 'Some feedback' } };
    const res = mockRes();
    await projectController.requestChanges(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('returns 422 when feedback is missing', async () => {
    const req = { params: { projectId: 'proj-1' }, body: {} };
    const res = mockRes();
    await projectController.requestChanges(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
    expect(notificationService.notifyProjectTeam).not.toHaveBeenCalled();
  });

  it('returns 404 when project is not found', async () => {
    projectService.updateProject.mockResolvedValue(null);
    const req = { params: { projectId: 'nope' }, body: { feedback: 'some feedback' } };
    const res = mockRes();
    await projectController.requestChanges(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(notificationService.notifyProjectTeam).not.toHaveBeenCalled();
  });
});
