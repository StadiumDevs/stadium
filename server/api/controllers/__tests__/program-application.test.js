import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/program.service.js', () => ({
  default: { findBySlug: vi.fn() },
}));
vi.mock('../../services/project.service.js', () => ({
  default: { getProjectById: vi.fn() },
}));
vi.mock('../../services/program-application.service.js', () => ({
  default: { listByProgram: vi.fn(), listByProject: vi.fn(), findOne: vi.fn(), create: vi.fn() },
}));

const programService = (await import('../../services/program.service.js')).default;
const projectService = (await import('../../services/project.service.js')).default;
const applicationService = (await import('../../services/program-application.service.js')).default;
const programController = (await import('../program.controller.js')).default;

const mockRes = () => {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
};

describe('ProgramController.listApplicationsForProgram', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when program is unknown', async () => {
    programService.findBySlug.mockResolvedValue(null);
    const req = { params: { slug: 'nope' } };
    const res = mockRes();
    await programController.listApplicationsForProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 with the list', async () => {
    programService.findBySlug.mockResolvedValue({ id: 'p1' });
    applicationService.listByProgram.mockResolvedValue([]);
    const req = { params: { slug: 'dogfooding' } };
    const res = mockRes();
    await programController.listApplicationsForProgram(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(applicationService.listByProgram).toHaveBeenCalledWith('p1');
  });
});

describe('ProgramController.listApplicationsForProject', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when project is unknown', async () => {
    projectService.getProjectById.mockResolvedValue(null);
    const req = { params: { projectId: 'nope' } };
    const res = mockRes();
    await programController.listApplicationsForProject(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 with an empty array when no applications exist', async () => {
    projectService.getProjectById.mockResolvedValue({ id: 'plata' });
    applicationService.listByProject.mockResolvedValue([]);
    const req = { params: { projectId: 'plata' } };
    const res = mockRes();
    await programController.listApplicationsForProject(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: 'success', data: [] });
  });
});

describe('ProgramController.createApplication', () => {
  beforeEach(() => vi.clearAllMocks());

  const dogfooding = {
    id: 'dogfooding-2026',
    slug: 'dogfooding-2026',
    programType: 'dogfooding',
    status: 'open',
  };
  const plata = { id: 'plata-mia' };

  const baseReq = (overrides = {}) => ({
    params: { slug: 'dogfooding-2026' },
    body: {
      project_id: 'plata-mia',
      application_fields: { feedback_focus: 'Cross-chain UX feedback.' },
      ...overrides,
    },
    user: { address: 'addr' },
  });

  it('returns 400 when project_id is missing', async () => {
    const req = { params: { slug: 's' }, body: {} };
    const res = mockRes();
    await programController.createApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when program is unknown', async () => {
    programService.findBySlug.mockResolvedValue(null);
    const req = baseReq();
    const res = mockRes();
    await programController.createApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 400 when the program isn't open", async () => {
    programService.findBySlug.mockResolvedValue({ ...dogfooding, status: 'closed' });
    const req = baseReq();
    const res = mockRes();
    await programController.createApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when program_type has no registered validator', async () => {
    programService.findBySlug.mockResolvedValue({ ...dogfooding, programType: 'pitch_off' });
    projectService.getProjectById.mockResolvedValue(plata);
    const req = baseReq();
    const res = mockRes();
    await programController.createApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'unsupported_program_type_for_application',
    }));
  });

  it('returns 422 when application_fields fails the program-type validator', async () => {
    programService.findBySlug.mockResolvedValue(dogfooding);
    projectService.getProjectById.mockResolvedValue(plata);
    const req = baseReq({ application_fields: { feedback_focus: 'x'.repeat(501) } });
    const res = mockRes();
    await programController.createApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('returns 409 when the project has already applied', async () => {
    programService.findBySlug.mockResolvedValue(dogfooding);
    projectService.getProjectById.mockResolvedValue(plata);
    applicationService.findOne.mockResolvedValue({ id: 'existing' });
    const req = baseReq();
    const res = mockRes();
    await programController.createApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'already_applied' }));
  });

  it('creates the application with normalised fields on the happy path', async () => {
    programService.findBySlug.mockResolvedValue(dogfooding);
    projectService.getProjectById.mockResolvedValue(plata);
    applicationService.findOne.mockResolvedValue(null);
    const created = { id: 'app-1', projectId: 'plata-mia', status: 'submitted' };
    applicationService.create.mockResolvedValue(created);
    const req = baseReq({
      application_fields: { feedback_focus: '   Cross-chain UX feedback.   ' },
    });
    const res = mockRes();
    await programController.createApplication(req, res);
    expect(applicationService.create).toHaveBeenCalledWith({
      programId: dogfooding.id,
      projectId: 'plata-mia',
      applicationFields: { feedback_focus: 'Cross-chain UX feedback.' },
      submittedBy: 'addr',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 409 on DB unique_violation race', async () => {
    programService.findBySlug.mockResolvedValue(dogfooding);
    projectService.getProjectById.mockResolvedValue(plata);
    applicationService.findOne.mockResolvedValue(null);
    const err = Object.assign(new Error('dup'), { code: '23505' });
    applicationService.create.mockRejectedValue(err);
    const req = baseReq();
    const res = mockRes();
    await programController.createApplication(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
