import programService from '../services/program.service.js';
import programApplicationService from '../services/program-application.service.js';
import projectService from '../services/project.service.js';
import { validateApplicationFields } from '../utils/application-fields.validator.js';

class ProgramController {
  async list(req, res) {
    try {
      const { status } = req.query;
      if (status && !['draft', 'open', 'closed', 'completed'].includes(status)) {
        return res.status(400).json({ status: 'error', message: `Invalid status filter: ${status}` });
      }
      const programs = await programService.list({ status });
      res.status(200).json({ status: 'success', data: programs });
    } catch (error) {
      console.error('❌ Error listing programs:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list programs' });
    }
  }

  async getBySlug(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      res.status(200).json({ status: 'success', data: program });
    } catch (error) {
      console.error('❌ Error fetching program:', error);
      res.status(500).json({ status: 'error', message: 'Failed to fetch program' });
    }
  }

  // --- Phase 1 revamp: program applications (#43) ---

  /** Admin-gated: list all applications for a given program. */
  async listApplicationsForProgram(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const applications = await programApplicationService.listByProgram(program.id);
      res.status(200).json({ status: 'success', data: applications });
    } catch (error) {
      console.error('❌ Error listing program applications:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list applications' });
    }
  }

  /** Public: list all applications a given project has submitted. */
  async listApplicationsForProject(req, res) {
    try {
      const { projectId } = req.params;
      const project = await projectService.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found' });
      }
      const applications = await programApplicationService.listByProject(projectId);
      res.status(200).json({ status: 'success', data: applications });
    } catch (error) {
      console.error('❌ Error listing project applications:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list applications' });
    }
  }

  /**
   * POST /api/programs/:slug/applications
   *
   * Gated by `requireTeamMemberOrAdminByBodyProject` upstream — so by the time
   * we reach this handler, the signer is authorised to act on behalf of the
   * target project.
   */
  async createApplication(req, res) {
    try {
      const { slug } = req.params;
      const { project_id: projectId, application_fields: applicationFields } = req.body || {};

      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ status: 'error', message: 'project_id is required' });
      }

      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      if (program.status !== 'open') {
        return res.status(400).json({
          status: 'error',
          message: `Program is not accepting applications (status: ${program.status}).`,
        });
      }

      const project = await projectService.getProjectById(projectId);
      if (!project) {
        return res.status(404).json({ status: 'error', message: 'Project not found' });
      }

      // Per-program-type validation
      const result = validateApplicationFields(program.programType, applicationFields);
      if (!result.valid) {
        return res.status(result.code === 'unsupported_program_type_for_application' ? 400 : 422)
          .json({ status: 'error', message: result.error, code: result.code });
      }

      // Uniqueness check (DB also enforces via UNIQUE constraint)
      const existing = await programApplicationService.findOne({
        programId: program.id,
        projectId,
      });
      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: 'This project has already applied to this program. Withdraw before re-applying.',
          code: 'already_applied',
        });
      }

      const submittedBy = req.user?.address || req.auth?.address || 'unknown';
      const created = await programApplicationService.create({
        programId: program.id,
        projectId,
        applicationFields: result.normalised || applicationFields,
        submittedBy,
      });

      res.status(201).json({ status: 'success', data: created });
    } catch (error) {
      // Postgres unique_violation fallback (in case of race between findOne and insert).
      if (error?.code === '23505') {
        return res.status(409).json({
          status: 'error',
          message: 'This project has already applied to this program.',
          code: 'already_applied',
        });
      }
      console.error('❌ Error creating program application:', error);
      res.status(500).json({ status: 'error', message: 'Failed to create application' });
    }
  }
}

export default new ProgramController();
