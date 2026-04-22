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

// --- M2 Incubator Program management ---
router.patch('/:projectId/m2-agreement', requireTeamMemberOrAdmin, projectController.updateM2Agreement);
router.patch('/:projectId/payout-address', requireTeamMemberOrAdmin, projectController.updatePayoutAddress);
router.post('/:projectId/submit-m2', requireTeamMemberOrAdmin, projectController.submitM2Deliverables);

// --- Phase 1 revamp: project updates (#39) ---
router.get('/:projectId/updates', projectController.getProjectUpdates);
router.post('/:projectId/updates', requireTeamMemberOrAdmin, projectController.postProjectUpdate);

// --- Phase 1 revamp: funding signal (#42) ---
router.get('/:projectId/funding-signal', projectController.getFundingSignal);
router.patch('/:projectId/funding-signal', requireTeamMemberOrAdmin, projectController.updateFundingSignal);

// --- Admin M2 approval ---
router.post('/:projectId/approve', requireAdmin, projectController.approveM2);

// --- Admin request changes ---
router.post('/:projectId/request-changes', requireAdmin, projectController.requestChanges);

// --- Admin payment confirmation ---
router.post('/:projectId/confirm-payment', requireAdmin, projectController.confirmPayment);

// --- Test payment (admin only) ---
router.post('/test-payment', requireAdmin, projectController.testPayment);

// --- Development-only test payment (no auth) ---
if (process.env.NODE_ENV === 'development') {
  router.post('/dev-test-payment', projectController.testPayment);
}

export default router;