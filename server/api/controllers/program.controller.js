import programService from '../services/program.service.js';
import programApplicationService from '../services/program-application.service.js';
import programSponsorService from '../services/program-sponsor.service.js';
import projectService from '../services/project.service.js';
import notificationService from '../services/notification.service.js';
import programAdminRepository from '../repositories/program-admin.repository.js';
import { validateApplicationFields } from '../utils/application-fields.validator.js';
import { validateProgram, validateSponsor } from '../utils/validation.js';
import { randomUUID } from 'node:crypto';
import logger from '../utils/logger.js';

const VALID_CHAINS = ['substrate', 'ethereum', 'solana'];

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

  // --- Phase 1 revamp: admin create/edit (#46) ---

  async createProgram(req, res) {
    try {
      const payload = req.body || {};
      const { valid, error: validationError } = validateProgram(payload, { partial: false });
      if (!valid) {
        return res.status(422).json({ status: 'error', message: validationError });
      }

      // Slug uniqueness pre-check (DB also enforces UNIQUE)
      const existing = await programService.findBySlug(payload.slug);
      if (existing) {
        return res.status(409).json({
          status: 'error',
          message: `A program with slug "${payload.slug}" already exists.`,
          code: 'slug_conflict',
        });
      }

      const created = await programService.create({
        id: payload.id || randomUUID(),
        owner: 'webzero',
        ...payload,
      });
      res.status(201).json({ status: 'success', data: created });
    } catch (error) {
      if (error?.code === '23505') {
        return res.status(409).json({
          status: 'error',
          message: 'Slug conflict (race).',
          code: 'slug_conflict',
        });
      }
      console.error('❌ Error creating program:', error);
      res.status(500).json({ status: 'error', message: 'Failed to create program' });
    }
  }

  /**
   * Phase 1 revamp (#47): admin review of a single application.
   * Accepts a status transition + optional review notes. Review metadata
   * (reviewed_by, reviewed_at) is stamped by the repository.
   */
  async updateApplicationStatus(req, res) {
    try {
      const { slug, applicationId } = req.params;
      const { status, reviewNotes } = req.body || {};

      const ALLOWED = ['submitted', 'accepted', 'rejected', 'withdrawn'];
      if (!ALLOWED.includes(status)) {
        return res.status(422).json({
          status: 'error',
          message: `status must be one of: ${ALLOWED.join(', ')}`,
        });
      }
      if (reviewNotes !== undefined && reviewNotes !== null) {
        if (typeof reviewNotes !== 'string' || reviewNotes.length > 2000) {
          return res.status(422).json({
            status: 'error',
            message: 'reviewNotes must be a string with 2000 characters or fewer',
          });
        }
      }

      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }

      // Prior-status lookup feeds only the notification gate below — a failure
      // here must not break the status update or change the HTTP response.
      let prevStatus;
      try {
        const existing = await programApplicationService.getById(applicationId);
        prevStatus = existing?.status;
      } catch (err) {
        logger.error('Failed to read application prior status for notification gating:', err);
      }

      const reviewedBy = req.user?.address || req.auth?.address || 'unknown';
      const updated = await programApplicationService.updateStatus({
        id: applicationId,
        status,
        reviewedBy,
        reviewNotes: typeof reviewNotes === 'string' ? reviewNotes.trim() : null,
      });

      // updateStatus uses .single() which throws if no row matched; translate
      // to 404 via the Postgres PGRST116 code we see on not-found.
      res.status(200).json({ status: 'success', data: updated });

      if (prevStatus === 'submitted' && (updated.status === 'accepted' || updated.status === 'rejected')) {
        const eventType = updated.status === 'accepted' ? 'application_accepted' : 'application_rejected';
        try {
          await notificationService.notifyProjectTeam(
            updated.projectId,
            eventType,
            updated.id,
            { programName: program.name, programSlug: req.params.slug },
          );
        } catch (err) {
          logger.error('notifyProjectTeam failed for application status change:', err);
        }
      }
    } catch (error) {
      if (error?.code === 'PGRST116' || /no rows/i.test(error?.message || '')) {
        return res.status(404).json({ status: 'error', message: 'Application not found' });
      }
      console.error('❌ Error updating application status:', error);
      res.status(500).json({ status: 'error', message: 'Failed to update application' });
    }
  }

  async updateProgram(req, res) {
    try {
      const { slug } = req.params;
      const patch = req.body || {};
      const { valid, error: validationError } = validateProgram(patch, { partial: true });
      if (!valid) {
        return res.status(422).json({ status: 'error', message: validationError });
      }

      const existing = await programService.findBySlug(slug);
      if (!existing) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }

      // If the slug is being changed, enforce uniqueness.
      if (patch.slug && patch.slug !== slug) {
        const collision = await programService.findBySlug(patch.slug);
        if (collision) {
          return res.status(409).json({
            status: 'error',
            message: `A program with slug "${patch.slug}" already exists.`,
            code: 'slug_conflict',
          });
        }
      }

      const updated = await programService.updateBySlug(slug, patch);
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      if (error?.code === '23505') {
        return res.status(409).json({
          status: 'error',
          message: 'Slug conflict (race).',
          code: 'slug_conflict',
        });
      }
      console.error('❌ Error updating program:', error);
      res.status(500).json({ status: 'error', message: 'Failed to update program' });
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

  // --- Phase 3 (#95): per-event admins ---

  async listAdmins(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const admins = await programAdminRepository.list(program.id);
      res.status(200).json({ status: 'success', data: admins });
    } catch (error) {
      console.error('❌ Error listing program admins:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list program admins' });
    }
  }

  async addAdmin(req, res) {
    try {
      const { slug } = req.params;
      const { wallet, walletChain } = req.body || {};
      if (!wallet || typeof wallet !== 'string') {
        return res.status(422).json({ status: 'error', message: 'wallet is required' });
      }
      if (!VALID_CHAINS.includes(walletChain)) {
        return res.status(422).json({
          status: 'error',
          message: `walletChain must be one of: ${VALID_CHAINS.join(', ')}`,
        });
      }
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const added = await programAdminRepository.add(program.id, walletChain, wallet);
      if (!added) {
        return res.status(422).json({
          status: 'error',
          message: `Invalid ${walletChain} wallet address`,
        });
      }
      res.status(201).json({ status: 'success', data: added });
    } catch (error) {
      console.error('❌ Error adding program admin:', error);
      res.status(500).json({ status: 'error', message: 'Failed to add program admin' });
    }
  }

  async removeAdmin(req, res) {
    try {
      const { slug, wallet } = req.params;
      const walletChain = req.query.chain;
      if (!VALID_CHAINS.includes(walletChain)) {
        return res.status(422).json({
          status: 'error',
          message: `chain query param must be one of: ${VALID_CHAINS.join(', ')}`,
        });
      }
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      await programAdminRepository.remove(program.id, walletChain, wallet);
      res.status(204).end();
    } catch (error) {
      console.error('❌ Error removing program admin:', error);
      res.status(500).json({ status: 'error', message: 'Failed to remove program admin' });
    }
  }

  // --- Sponsors (per-program) ---

  async listSponsors(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const sponsors = await programSponsorService.listByProgramId(program.id);
      res.status(200).json({ status: 'success', data: sponsors });
    } catch (error) {
      console.error('❌ Error listing program sponsors:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list program sponsors' });
    }
  }

  async createSponsor(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const { valid, error } = validateSponsor(req.body);
      if (!valid) {
        return res.status(422).json({ status: 'error', message: error });
      }
      const created = await programSponsorService.create({ ...req.body, programId: program.id });
      res.status(201).json({ status: 'success', data: created });
    } catch (error) {
      console.error('❌ Error creating program sponsor:', error);
      res.status(500).json({ status: 'error', message: 'Failed to create program sponsor' });
    }
  }

  async updateSponsor(req, res) {
    try {
      const { slug, sponsorId } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const existing = await programSponsorService.findById(sponsorId);
      if (!existing || existing.programId !== program.id) {
        return res.status(404).json({ status: 'error', message: 'Sponsor not found' });
      }
      const { valid, error } = validateSponsor(req.body, { partial: true });
      if (!valid) {
        return res.status(422).json({ status: 'error', message: error });
      }
      const updated = await programSponsorService.update(sponsorId, req.body);
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      console.error('❌ Error updating program sponsor:', error);
      res.status(500).json({ status: 'error', message: 'Failed to update program sponsor' });
    }
  }

  async deleteSponsor(req, res) {
    try {
      const { slug, sponsorId } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const existing = await programSponsorService.findById(sponsorId);
      if (!existing || existing.programId !== program.id) {
        return res.status(404).json({ status: 'error', message: 'Sponsor not found' });
      }
      await programSponsorService.delete(sponsorId);
      res.status(204).end();
    } catch (error) {
      console.error('❌ Error deleting program sponsor:', error);
      res.status(500).json({ status: 'error', message: 'Failed to delete program sponsor' });
    }
  }
}

export default new ProgramController();
