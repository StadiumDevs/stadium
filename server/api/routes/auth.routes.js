import { Router } from 'express';
import authController from '../controllers/auth.controller.js';

const router = Router();

// Social sign-in (Supabase Auth) → wallet account-linking + session exchange.
// Public: each enforces its own proof (Supabase token, and SIWS for linking).
router.post('/link-wallet', authController.linkWallet);
router.post('/session-from-social', authController.sessionFromSocial);

export default router;
