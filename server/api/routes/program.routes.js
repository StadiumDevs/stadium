import { Router } from 'express';
import programController from '../controllers/program.controller.js';
import requireAdmin, { requireTeamMemberOrAdminByBodyProject } from '../middleware/auth.middleware.js';

const router = Router();

// --- Public, Read-Only Routes ---
router.get('/', programController.list);
router.get('/:slug', programController.getBySlug);

// --- Phase 1 revamp: admin create/edit (#46) ---
router.post('/', requireAdmin, programController.createProgram);
router.patch('/:slug', requireAdmin, programController.updateProgram);

// --- Phase 1 revamp: applications (#43, #47) ---
router.get('/:slug/applications', requireAdmin, programController.listApplicationsForProgram);
router.post(
  '/:slug/applications',
  requireTeamMemberOrAdminByBodyProject,
  programController.createApplication,
);
router.patch(
  '/:slug/applications/:applicationId',
  requireAdmin,
  programController.updateApplicationStatus,
);

export default router;
