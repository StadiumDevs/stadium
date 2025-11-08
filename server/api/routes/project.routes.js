import { Router } from 'express';
import projectController from '../controllers/project.controller.js';
import requireAdmin, { requireTeamMemberOrAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// --- Public, Read-Only Routes ---
router.get('/', projectController.getAllProjects);
router.get('/:projectId', projectController.getProjectById);

// --- Admin-Only, Write Routes ---
router.post('/', requireAdmin, projectController.createProject);
router.patch('/:projectId', requireTeamMemberOrAdmin, projectController.updateProject);
// --- Team management ---
router.post('/:projectId/team', requireTeamMemberOrAdmin, projectController.replaceTeamMembers);
// --- M2 Agreement management ---
router.patch('/:projectId/m2-agreement', requireTeamMemberOrAdmin, projectController.updateM2Agreement);

export default router;