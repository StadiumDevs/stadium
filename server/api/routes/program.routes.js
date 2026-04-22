import { Router } from 'express';
import programController from '../controllers/program.controller.js';
import requireAdmin, { requireTeamMemberOrAdminByBodyProject } from '../middleware/auth.middleware.js';

const router = Router();

// --- Public, Read-Only Routes ---
router.get('/', programController.list);
router.get('/:slug', programController.getBySlug);

// --- Phase 1 revamp: applications (#43) ---
router.get('/:slug/applications', requireAdmin, programController.listApplicationsForProgram);
router.post(
  '/:slug/applications',
  requireTeamMemberOrAdminByBodyProject,
  programController.createApplication,
);

export default router;
