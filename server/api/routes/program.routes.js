import { Router, text, json } from 'express';
import rateLimit from 'express-rate-limit';
import programController from '../controllers/program.controller.js';
import submissionController from '../controllers/submission.controller.js';
import requireAdmin, {
  requireTeamMemberOrAdminByBodyProject,
  requireProgramAdmin,
  requireProgramViewer,
  requireProgramJudge,
} from '../middleware/auth.middleware.js';

const router = Router();

// CSV imports can run hundreds of rows; bump the body limit on the signup
// import route only, leaving the default express.json() limit elsewhere.
// Accept both text/csv (raw) and application/json {"csv":"..."} bodies.
const csvBody = [
  text({ type: 'text/csv', limit: '5mb' }),
  json({ limit: '5mb' }),
];

// The non-member apply route is public, unauthenticated, and emails the team.
// The global apiLimiter (200/min) is too loose to stop someone flooding the
// inbox, so cap this one route hard per IP. Generous enough for a real person
// applying to a few programs (incl. retries); tight enough to kill a flood.
const nonMemberApplyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many applications from this network. Please try again later.',
  },
});

// Public project submission is also an unauthenticated write. Cap per IP —
// generous enough for one person submitting (incl. retries / fixing a typo),
// tight enough to stop a flood of junk rows at the 200-submission scale.
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many submissions from this network. Please try again later.',
  },
});

// --- Public, Read-Only Routes ---
router.get('/', programController.list);
router.get('/:slug', programController.getBySlug);
// Public, PII-free: distinct projects + interest counts derived from signups.
router.get('/:slug/projects', programController.listProjects);
// Public, PII-free: all submissions + winners, only once results are published.
router.get('/:slug/results', submissionController.publicResults);

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
// Rate-limited per IP (see nonMemberApplyLimiter) since it's an unauthenticated
// email trigger.
router.post(
  '/:slug/applications/non-member',
  nonMemberApplyLimiter,
  programController.submitNonMemberApplication,
);
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

// --- Project submissions + judge scoring (Bitrefill) ---
// Public submit (rate-limited, honeypot). All other scoring routes are gated by
// requireProgramJudge: a judge/admin email session (scoped write) OR a wallet
// admin. requireProgramJudge NEVER unlocks the payment/approval routes above.
router.post('/:slug/submissions', submissionLimiter, submissionController.submit);
router.get('/:slug/submissions', requireProgramJudge('slug'), submissionController.list);
router.put(
  '/:slug/submissions/:submissionId/score',
  requireProgramJudge('slug'),
  submissionController.upsertScore,
);
router.post('/:slug/scoring/submit', requireProgramJudge('slug'), submissionController.submitBallot);
router.get('/:slug/scoring/leaderboard', requireProgramJudge('slug'), submissionController.leaderboard);
// Promote a submission into a Stadium project (payout + team tracking).
// Admin-only — judges (requireProgramJudge) cannot create projects.
router.post(
  '/:slug/submissions/:submissionId/promote',
  requireProgramAdmin('slug'),
  submissionController.promote,
);
// Mark a submission paid / not paid (payout tracking). Admin-only.
router.patch(
  '/:slug/submissions/:submissionId/paid',
  requireProgramAdmin('slug'),
  submissionController.setPaid,
);
// --- Winner selection + results publishing (platform/global admin only) ---
// requireProgramAdmin lets wallet admins through; the controller then rejects
// anyone who isn't a global admin (per-program admins cannot select winners).
router.patch(
  '/:slug/submissions/:submissionId/prize',
  requireProgramAdmin('slug'),
  submissionController.awardPrize,
);
router.post('/:slug/results/publish', requireProgramAdmin('slug'), submissionController.publishResults);
router.post('/:slug/results/unpublish', requireProgramAdmin('slug'), submissionController.unpublishResults);

export default router;
