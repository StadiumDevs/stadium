import { Router } from 'express';
import programController from '../controllers/program.controller.js';

const router = Router();

// --- Public, Read-Only Routes ---
router.get('/', programController.list);
router.get('/:slug', programController.getBySlug);

export default router;
