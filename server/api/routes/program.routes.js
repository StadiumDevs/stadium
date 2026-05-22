import { Router, text, json } from 'express';
import programController from '../controllers/program.controller.js';
import requireAdmin, {
  requireTeamMemberOrAdminByBodyProject,
  requireProgramAdmin,
  requireProgramViewer,
} from '../middleware/auth.middleware.js';

const router = Router();

// CSV imports can run hundreds of rows; bump the body limit on the signup
// import route only, leaving the default express.json() limit elsewhere.
// Accept both text/csv (raw) and application/json {"csv":"..."} bodies.
const csvBody = [
  text({ type: 'text/csv', limit: '5mb' }),
  json({ limit: '5mb' }),
];

// --- Public, Read-Only Routes ---
router.get('/', programController.list);
router.get('/:slug', programController.getBySlug);
// Public, PII-free: distinct projects + interest counts derived from signups.
router.get('/:slug/projects', programController.listProjects);

// --- Phase 1 revamp: admin create/edit (#46) ---
router.post('/', requireAdmin, programController.createProgram);
router.patch('/:slug', requireAdmin, programController.updateProgram);

// --- Phase 1 revamp: applications (#43, #47) ---
router.get(
  '/:slug/applications',
  requireProgramViewer('slug'),
  programController.listApplicationsForProgram,
);
router.post(
  '/:slug/applications',
  requireTeamMemberOrAdminByBodyProject,
  programController.createApplication,
);
// Public: someone without a Stadium project applies; emails the team (no auth).
router.post('/:slug/applications/non-member', programController.submitNonMemberApplication);
router.patch(
  '/:slug/applications/:applicationId',
  requireProgramAdmin('slug'),
  programController.updateApplicationStatus,
);

// --- Phase 3 (#95): per-event admins ---
// Read = program admin (wallet or email) or global; mutate = global only.
// Email-admin routes are placed before the wallet :wallet param route so the
// extra path segment ("emails") is matched first.
router.post('/:slug/admins/invite', requireAdmin, programController.inviteAdminEmail);
router.get('/:slug/admins/emails', requireProgramViewer('slug'), programController.listAdminEmails);
router.delete('/:slug/admins/emails/:email', requireAdmin, programController.removeAdminEmail);
router.get('/:slug/admins', requireProgramViewer('slug'), programController.listAdmins);
router.post('/:slug/admins', requireAdmin, programController.addAdmin);
router.delete('/:slug/admins/:wallet', requireAdmin, programController.removeAdmin);

// --- Sponsors (per-program) ---
// Read = public; mutate = program admin or global.
router.get('/:slug/sponsors', programController.listSponsors);
router.post('/:slug/sponsors', requireProgramAdmin('slug'), programController.createSponsor);
router.patch(
  '/:slug/sponsors/:sponsorId',
  requireProgramAdmin('slug'),
  programController.updateSponsor,
);
router.delete(
  '/:slug/sponsors/:sponsorId',
  requireProgramAdmin('slug'),
  programController.deleteSponsor,
);

// --- Signups (Luma CSV imports) ---
// All admin — same gate as applications. CSV body parsers stack with the
// shared SIWS middleware: parser runs first to produce req.body, then
// requireProgramAdmin reads x-siws-auth from headers.
router.get('/:slug/signups', requireProgramViewer('slug'), programController.listSignups);
router.post(
  '/:slug/signups/import',
  ...csvBody,
  requireProgramAdmin('slug'),
  programController.importSignups,
);
router.delete(
  '/:slug/signups/:signupId',
  requireProgramAdmin('slug'),
  programController.deleteSignup,
);

// --- Inbox (merged signups + applications) ---
// Admin-only — both source rows are gated; the merge inherits that.
router.get('/:slug/inbox', requireProgramViewer('slug'), programController.listInbox);
router.get('/:slug/inbox.csv', requireProgramViewer('slug'), programController.exportInboxCsv);

// --- Audit log (per-program activity feed) ---
router.get('/:slug/audit-log', requireProgramViewer('slug'), programController.listAuditLog);

export default router;
