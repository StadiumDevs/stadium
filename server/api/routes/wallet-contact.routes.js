import { Router } from 'express';
import walletContactController from '../controllers/wallet-contact.controller.js';
import { requireOwnWallet } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:address', walletContactController.getContact);
router.put('/:address', requireOwnWallet, walletContactController.updateContact);

export default router;
