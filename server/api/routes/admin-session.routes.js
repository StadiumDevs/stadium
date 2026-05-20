import { Router } from 'express';
import { createAdminSession } from '../controllers/admin-session.controller.js';

const router = Router();

// POST /api/admin/session — exchange one SIWS sign for a short-lived bearer
// token. Body is empty; the SIWS payload travels in the `x-siws-auth` header
// like every other admin write. Response carries the token + ISO expiresAt.
router.post('/', createAdminSession);

export default router;
