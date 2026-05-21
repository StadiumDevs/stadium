import { Router } from 'express';
import {
  listAppAdmins, addAppAdmin, removeAppAdmin,
  listGlobalAdmins, addGlobalAdmin, removeGlobalAdmin,
} from '../controllers/admin-tiers.controller.js';
import { requireAppAdmin } from '../middleware/auth.middleware.js';
import appAdminRepository from '../repositories/app-admin.repository.js';
import { resolveAuthIdentity } from '../middleware/auth.middleware.js';

const router = Router();

// Tier 0 — app_admins. Only app_admins can manage app_admins or global_admins.
router.get('/app-admins', requireAppAdmin, listAppAdmins);
router.post('/app-admins', requireAppAdmin, addAppAdmin);
router.delete('/app-admins/:wallet', requireAppAdmin, removeAppAdmin);

// Tier 1 — global_admins. Also gated to app_admins to manage.
router.get('/global-admins', requireAppAdmin, listGlobalAdmins);
router.post('/global-admins', requireAppAdmin, addGlobalAdmin);
router.delete('/global-admins/:wallet', requireAppAdmin, removeGlobalAdmin);

// Convenience: report whether the connected wallet is an app_admin so the
// client can show/hide the /admin/app-admins nav item without forcing a
// 403 round-trip. SIWS-gated (any signed-in wallet can ask about itself).
router.get('/me/tier', async (req, res) => {
  try {
    const auth = await resolveAuthIdentity(req, { checkDomain: true });
    if (!auth.ok) return res.status(auth.status).json(auth.body);
    const { chain, parsed } = auth;
    const isApp = await appAdminRepository.isAppAdmin(chain, parsed.address);
    res.status(200).json({
      status: 'success',
      data: { isAppAdmin: isApp, chain, address: parsed.address },
    });
  } catch (error) {
    console.error('❌ Error reading admin tier:', error);
    res.status(500).json({ status: 'error', message: 'Failed to read admin tier' });
  }
});

export default router;
