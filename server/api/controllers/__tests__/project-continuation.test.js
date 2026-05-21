import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/project.service.js', () => ({
  default: { getProjectById: vi.fn() },
}));
vi.mock('../../services/project-update.service.js', () => ({
  default: { listByProject: vi.fn(), create: vi.fn() },
}));
vi.mock('../../services/funding-signal.service.js', () => ({
  default: { get: vi.fn(), upsert: vi.fn() },
}));
vi.mock('../../services/payment.service.js', () => ({ default: {} }));
vi.mock('../../services/notification.service.js', () => ({ default: { notifyProjectTeam: vi.fn() } }));
vi.mock('../../repositories/project-continuation.repository.js', () => ({
  default: { create: vi.fn(), listByProjectId: vi.fn() },
}));

const projectService = (await import('../../services/project.service.js')).default;
const continuationRepo = (await import('../../repositories/project-continuation.repository.js')).default;
const ctrl = (await import('../project.controller.js')).default;

const mockRes = () => {
  const r = {};
  r.status = vi.fn(() => r);
  r.json = vi.fn(() => r);
  return r;
};

const PROJECT = { id: 'plata-mia', projectName: 'Plata Mia' };

beforeEach(() => vi.clearAllMocks());

describe('listContinuations', () => {
  it('returns 404 when the project is unknown', async () => {
    projectService.getProjectById.mockResolvedValue(null);
    const res = mockRes();
    await ctrl.listContinuations({ params: { projectId: 'nope' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the list newest-first via the repo', async () => {
    projectService.getProjectById.mockResolvedValue(PROJECT);
    continuationRepo.listByProjectId.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    const res = mockRes();
    await ctrl.listContinuations({ params: { projectId: PROJECT.id } }, res);
    expect(continuationRepo.listByProjectId).toHaveBeenCalledWith(PROJECT.id);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('createContinuation', () => {
  it('returns 404 when the project is unknown', async () => {
    projectService.getProjectById.mockResolvedValue(null);
    const res = mockRes();
    await ctrl.createContinuation(
      { params: { projectId: 'nope' }, body: { currentStatus: 'OK' } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 422 when currentStatus is empty', async () => {
    projectService.getProjectById.mockResolvedValue(PROJECT);
    const res = mockRes();
    await ctrl.createContinuation(
      { params: { projectId: PROJECT.id }, body: { currentStatus: '' } },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 422 when nextStepUrl is malformed', async () => {
    projectService.getProjectById.mockResolvedValue(PROJECT);
    const res = mockRes();
    await ctrl.createContinuation(
      {
        params: { projectId: PROJECT.id },
        body: { currentStatus: 'shipping', nextStepUrl: 'ftp://nope' },
      },
      res,
    );
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('creates with the submitter wallet stamped from req.user', async () => {
    projectService.getProjectById.mockResolvedValue(PROJECT);
    continuationRepo.create.mockImplementation((p) => Promise.resolve({ id: 'c1', ...p }));
    const res = mockRes();
    await ctrl.createContinuation(
      {
        params: { projectId: PROJECT.id },
        body: {
          currentStatus: 'Shipping M2.5, looking at grants.',
          wantSupport: true,
          supportFor: 'Grant intros',
          nextStepUrl: 'https://blog.platamia.io/m25',
        },
        user: { address: '5Alice', chain: 'substrate' },
      },
      res,
    );
    expect(continuationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: PROJECT.id,
        currentStatus: 'Shipping M2.5, looking at grants.',
        wantSupport: true,
        supportFor: 'Grant intros',
        nextStepUrl: 'https://blog.platamia.io/m25',
        submittedBy: '5Alice',
        submittedByChain: 'substrate',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('defaults wantSupport to false and trims free-text fields', async () => {
    projectService.getProjectById.mockResolvedValue(PROJECT);
    continuationRepo.create.mockImplementation((p) => Promise.resolve({ id: 'c2', ...p }));
    const res = mockRes();
    await ctrl.createContinuation(
      {
        params: { projectId: PROJECT.id },
        body: { currentStatus: '  trimmed  ', supportFor: '   ' },
        user: { address: '5Bob', chain: 'ethereum' },
      },
      res,
    );
    expect(continuationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStatus: 'trimmed',
        wantSupport: false,
        supportFor: null,
        nextStepUrl: null,
        submittedByChain: 'ethereum',
      }),
    );
  });
});
