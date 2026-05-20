import { Router } from 'express';
import programController from '../controllers/program.controller.js';
import requireAdmin, {
  requireTeamMemberOrAdminByBodyProject,
  requireProgramAdmin,
} from '../middleware/auth.middleware.js';

const router = Router();

// --- Public, Read-Only Routes ---
router.get('/', programController.list);
router.get('/:slug', programController.getBySlug);

// --- Phase 1 revamp: admin create/edit (#46) ---
router.post('/', requireAdmin, programController.createProgram);
router.patch('/:slug', requireAdmin, programController.updateProgram);

// --- Phase 1 revamp: applications (#43, #47) ---
router.get(
  '/:slug/applications',
  requireProgramAdmin('slug'),
  programController.listApplicationsForProgram,
);
router.post(
  '/:slug/applications',
  requireTeamMemberOrAdminByBodyProject,
  programController.createApplication,
);
router.patch(
  '/:slug/applications/:applicationId',
  requireProgramAdmin('slug'),
  programController.updateApplicationStatus,
);

// --- Phase 3 (#95): per-event admins ---
// Read = program admin or global; mutate = global only.
router.get('/:slug/admins', requireProgramAdmin('slug'), programController.listAdmins);
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

export default router;
