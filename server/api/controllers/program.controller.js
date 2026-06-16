import programService from '../services/program.service.js';
import programApplicationService from '../services/program-application.service.js';
import programSponsorService from '../services/program-sponsor.service.js';
import programSignupService from '../services/program-signup.service.js';
import lumaSyncService from '../services/luma-sync.service.js';
import programInboxService, { inboxToCsv } from '../services/program-inbox.service.js';
import auditLog from '../services/program-audit-log.service.js';
import projectService from '../services/project.service.js';
import notificationService from '../services/notification.service.js';
import nonMemberApplicationService, { validateNonMemberApplication } from '../services/non-member-application.service.js';
import programAdminRepository from '../repositories/program-admin.repository.js';
import programAdminEmailRepository from '../repositories/program-admin-email.repository.js';
import programAdminInviteService from '../services/program-admin-invite.service.js';
import programAssetService, { MAX_COVER_BYTES } from '../services/program-asset.service.js';
import programSignupRepository from '../repositories/program-signup.repository.js';
import { validateApplicationFields } from '../utils/application-fields.validator.js';
import { validateProgram, validateSponsor } from '../utils/validation.js';
import { randomUUID } from 'node:crypto';
import logger from '../utils/logger.js';

const VALID_CHAINS = ['substrate', 'ethereum', 'solana'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: reviewedBy },
        action: `application.${updated.status}`,
        targetType: 'application',
        targetId: updated.id,
        metadata: { from: prevStatus, to: updated.status, projectId: updated.projectId },
      });

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
      auditLog.logSafe({
        programId: updated.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'program.update',
        targetType: 'program',
        targetId: updated.id,
        metadata: { changedKeys: Object.keys(patch || {}) },
      });
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

  /**
   * POST /api/programs/:slug/cover-image  (multipart, field "file")
   *
   * Admin-gated upload of a cover banner to Supabase Storage. Returns the public
   * URL so the admin form can drop it into coverImageUrl and save via the normal
   * PATCH. We do NOT persist it here — keeping upload and save separate means an
   * abandoned upload never mutates the program.
   */
  async uploadCoverImage(req, res) {
    try {
      const { slug } = req.params;
      const file = req.file;
      if (!file) {
        return res.status(422).json({ status: 'error', message: 'No image file provided (field "file")' });
      }
      if (!programAssetService.isAllowedImageMime(file.mimetype)) {
        return res.status(422).json({
          status: 'error',
          message: 'Unsupported image type. Use PNG, JPEG, WebP, or GIF.',
        });
      }
      if (file.size > MAX_COVER_BYTES) {
        return res.status(422).json({ status: 'error', message: 'Image is too large (max 5MB).' });
      }
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const url = await programAssetService.uploadCover({
        programId: program.id,
        buffer: file.buffer,
        contentType: file.mimetype,
      });
      res.status(201).json({ status: 'success', data: { url } });
    } catch (error) {
      console.error('❌ Error uploading cover image:', error);
      res.status(500).json({ status: 'error', message: 'Failed to upload cover image' });
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
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'admin.add',
        targetType: 'admin',
        targetId: `${walletChain}:${added.wallet}`,
        metadata: null,
      });
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
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'admin.remove',
        targetType: 'admin',
        targetId: `${walletChain}:${wallet}`,
        metadata: null,
      });
    } catch (error) {
      console.error('❌ Error removing program admin:', error);
      res.status(500).json({ status: 'error', message: 'Failed to remove program admin' });
    }
  }

  // --- Email-keyed program admins (social sign-in onboarding) ---

  async listAdminEmails(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const admins = await programAdminEmailRepository.list(program.id);
      res.status(200).json({ status: 'success', data: admins });
    } catch (error) {
      console.error('❌ Error listing email admins:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list email admins' });
    }
  }

  async inviteAdminEmail(req, res) {
    try {
      const { slug } = req.params;
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      if (!email || !EMAIL_RE.test(email)) {
        return res.status(422).json({ status: 'error', message: 'A valid email is required' });
      }
      const role = req.body?.role === 'judge' ? 'judge' : 'admin';
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const added = await programAdminEmailRepository.add(
        program.id,
        email,
        req.user?.address ?? null,
        role,
      );

      // The grant has landed; emailing the invite is best-effort so a missing
      // Resend config (or a transient send error) never loses the grant.
      let emailSent = false;
      let emailReason = null;
      try {
        const result = await programAdminInviteService.send({
          email: added.email,
          programName: program.name,
          slug: program.slug,
          role: added.role,
        });
        emailSent = result.ok;
        emailReason = result.ok ? null : result.reason;
      } catch (err) {
        // Surface the real Resend reason (admin-only action) so a misconfigured
        // sender domain / sandbox-mode key is diagnosable from the UI, not just logs.
        emailReason = `send_failed: ${err?.message || 'unknown error'}`;
        logger.error('Program admin invite email failed:', err);
      }

      res.status(201).json({ status: 'success', data: added, emailSent, emailReason });
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'admin.invite_email',
        targetType: 'admin',
        targetId: `email:${added.email}`,
        metadata: { emailSent },
      });
    } catch (error) {
      console.error('❌ Error inviting email admin:', error);
      res.status(500).json({ status: 'error', message: 'Failed to invite admin' });
    }
  }

  async removeAdminEmail(req, res) {
    try {
      const { slug, email } = req.params;
      const target = decodeURIComponent(email);
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      await programAdminEmailRepository.remove(program.id, target);
      res.status(204).end();
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'admin.remove_email',
        targetType: 'admin',
        targetId: `email:${target}`,
        metadata: null,
      });
    } catch (error) {
      console.error('❌ Error removing email admin:', error);
      res.status(500).json({ status: 'error', message: 'Failed to remove email admin' });
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
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'sponsor.add',
        targetType: 'sponsor',
        targetId: created.id,
        metadata: { name: created.name },
      });
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
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'sponsor.update',
        targetType: 'sponsor',
        targetId: sponsorId,
        metadata: { changedKeys: Object.keys(req.body || {}) },
      });
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
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'sponsor.delete',
        targetType: 'sponsor',
        targetId: sponsorId,
        metadata: { name: existing.name },
      });
    } catch (error) {
      console.error('❌ Error deleting program sponsor:', error);
      res.status(500).json({ status: 'error', message: 'Failed to delete program sponsor' });
    }
  }

  // --- Projects (public, PII-free aggregate derived from signups) ---

  async listProjects(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const projects = await programSignupService.projectCardsByProgramId(program.id);
      res.status(200).json({
        status: 'success',
        data: projects,
        meta: { count: projects.length },
      });
    } catch (error) {
      console.error('❌ Error listing program projects:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list program projects' });
    }
  }

  // --- Non-member applications (public; emails the team) ---

  async submitNonMemberApplication(req, res) {
    try {
      const { slug } = req.params;
      // Honeypot: bots fill hidden fields. Silently accept without sending.
      if (typeof req.body?.company === 'string' && req.body.company.trim() !== '') {
        return res.status(200).json({ status: 'success' });
      }
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const v = validateNonMemberApplication(req.body);
      if (!v.ok) {
        return res.status(400).json({ status: 'error', message: v.error });
      }
      const result = await nonMemberApplicationService.submit({
        programName: program.name,
        programSlug: program.slug,
        ...v.value,
      });
      if (!result.ok) {
        return res.status(503).json({
          status: 'error',
          message: 'Could not send your application right now. Please email info@joinwebzero.com directly.',
        });
      }
      return res.status(200).json({ status: 'success' });
    } catch (error) {
      console.error('❌ Error submitting non-member application:', error);
      res.status(500).json({ status: 'error', message: 'Failed to submit application' });
    }
  }

  // --- Signups (Luma CSV imports) ---

  async listSignups(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const signups = await programSignupService.listByProgramId(program.id);
      const lastImportedAt = await programSignupRepository.lastImportedAt(program.id);
      res.status(200).json({
        status: 'success',
        data: signups,
        meta: { count: signups.length, lastImportedAt },
      });
    } catch (error) {
      console.error('❌ Error listing program signups:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list program signups' });
    }
  }

  async importSignups(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }

      // Accepts the CSV as either a raw text/csv body or as { csv: "..." }
      // inside a JSON body. The former scales further; the latter is the
      // path the admin UI uses today because shadcn forms speak JSON.
      let csvText = '';
      if (typeof req.body === 'string') {
        csvText = req.body;
      } else if (req.body && typeof req.body.csv === 'string') {
        csvText = req.body.csv;
      } else {
        return res.status(422).json({
          status: 'error',
          message: 'Missing CSV body. Send Content-Type text/csv or JSON {"csv":"..."}',
        });
      }
      if (!csvText.trim()) {
        return res.status(422).json({ status: 'error', message: 'CSV body is empty' });
      }

      const dryRun = req.query.dry_run === 'true' || req.query.dry_run === '1';

      const summary = dryRun
        ? await programSignupService.planImport(program.id, csvText)
        : await programSignupService.commitImport(program.id, csvText);

      // Drop the verbose `newRows` array on the wire — the preview slices and
      // counts are enough for the admin UI to render the summary.
      const { newRows: _omit, inserted, ...wire } = summary;
      void _omit;
      res.status(200).json({
        status: 'success',
        data: {
          dryRun,
          ...wire,
          inserted: dryRun ? [] : inserted || [],
        },
      });
      if (!dryRun) {
        auditLog.logSafe({
          programId: program.id,
          actor: { chain: req.user?.chain, wallet: req.user?.address },
          action: 'signups.import',
          targetType: 'signups_batch',
          targetId: null,
          metadata: {
            newCount: summary.newCount,
            duplicates: summary.duplicates,
            skippedNoEmail: summary.skippedNoEmail,
            totalParsed: summary.totalParsed,
          },
        });
      }
    } catch (error) {
      console.error('❌ Error importing program signups:', error);
      res.status(500).json({ status: 'error', message: 'Failed to import program signups' });
    }
  }

  // Admin: pull the checked-in guest list from Luma now. Mirrors into
  // program_signups (source='luma_api'). Returns the sync status + counts so the
  // admin UI can show "synced just now · M checked-in".
  async syncGuests(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      if (!program.lumaEventId) {
        return res.status(422).json({
          status: 'error',
          message: 'No Luma event id set for this program. Save one first.',
        });
      }
      if (!lumaSyncService.isActive(program)) {
        return res.status(503).json({
          status: 'error',
          message: 'Luma is not configured on the server (LUMA_API_KEY missing).',
        });
      }
      const result = await lumaSyncService.syncProgram(program);
      const checkedInCount = await programSignupRepository.countBySource(program.id, 'luma_api');
      res.status(200).json({
        status: 'success',
        data: { ...result, syncStatus: result.status, checkedInCount, syncedAt: new Date().toISOString() },
      });
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email },
        action: 'signups.luma_sync',
        targetType: 'signups_batch',
        targetId: null,
        metadata: { syncStatus: result.status, upserted: result.upserted, removed: result.removed },
      });
    } catch (error) {
      console.error('❌ Error syncing Luma guests:', error);
      res.status(500).json({ status: 'error', message: 'Failed to sync Luma guests' });
    }
  }

  // Admin: manually add a single checked-in email (event-day fallback for the
  // cases Luma can't cover). Idempotent.
  async addSignup(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
      const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : null;
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ status: 'error', message: 'A valid email is required' });
      }
      const signup = await programSignupRepository.addManual(program.id, email, name);
      res.status(201).json({ status: 'success', data: signup });
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email },
        action: 'signup.manual_add',
        targetType: 'signup',
        targetId: signup.id,
        metadata: { email: signup.email },
      });
    } catch (error) {
      console.error('❌ Error adding signup:', error);
      res.status(500).json({ status: 'error', message: 'Failed to add signup' });
    }
  }

  async deleteSignup(req, res) {
    try {
      const { slug, signupId } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      // Cross-check program scoping: a signup from program A must not be
      // deletable via program B's slug. Symmetric with sponsors.
      const existing = await programSignupRepository.findById(signupId);
      if (!existing || existing.programId !== program.id) {
        return res.status(404).json({ status: 'error', message: 'Signup not found' });
      }
      await programSignupService.delete(signupId);
      res.status(204).end();
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'signup.delete',
        targetType: 'signup',
        targetId: signupId,
        metadata: { email: existing.email },
      });
    } catch (error) {
      console.error('❌ Error deleting program signup:', error);
      res.status(500).json({ status: 'error', message: 'Failed to delete program signup' });
    }
  }
  // --- Inbox (merged signups + applications) ---

  async listInbox(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const entries = await programInboxService.listInbox(program.id);
      const signupCount = entries.filter((e) => e.source === 'signup').length;
      const applicationCount = entries.length - signupCount;
      res.status(200).json({
        status: 'success',
        data: entries,
        meta: { total: entries.length, signups: signupCount, applications: applicationCount },
      });
    } catch (error) {
      console.error('❌ Error listing program inbox:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list program inbox' });
    }
  }

  // --- Audit log read endpoint ---

  async listAuditLog(req, res) {
    try {
      const { slug } = req.params;
      const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const entries = await auditLog.listByProgramId(program.id, { limit });
      res.status(200).json({
        status: 'success',
        data: entries,
        meta: { total: entries.length, limit },
      });
    } catch (error) {
      console.error('❌ Error listing program audit log:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list program audit log' });
    }
  }

  async exportInboxCsv(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const entries = await programInboxService.listInbox(program.id);
      const csv = inboxToCsv(entries, { programSlug: slug });
      const filename = `${slug}-inbox-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      console.error('❌ Error exporting program inbox CSV:', error);
      res.status(500).json({ status: 'error', message: 'Failed to export program inbox' });
    }
  }
}

export default new ProgramController();
