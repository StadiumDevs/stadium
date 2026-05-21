import appAdminRepository from '../repositories/app-admin.repository.js';
import globalAdminRepository from '../repositories/global-admin.repository.js';

const VALID_CHAINS = ['substrate', 'ethereum', 'solana'];

function pickRepo(tier) {
  if (tier === 'app') return appAdminRepository;
  if (tier === 'global') return globalAdminRepository;
  return null;
}

function listFor(tier) {
  const repo = pickRepo(tier);
  return async (req, res) => {
    try {
      const rows = await repo.list();
      res.status(200).json({ status: 'success', data: rows });
    } catch (error) {
      console.error(`❌ Error listing ${tier} admins:`, error);
      res.status(500).json({ status: 'error', message: `Failed to list ${tier} admins` });
    }
  };
}

function addFor(tier) {
  const repo = pickRepo(tier);
  return async (req, res) => {
    try {
      const { walletChain, wallet, label } = req.body || {};
      if (!VALID_CHAINS.includes(walletChain)) {
        return res.status(422).json({
          status: 'error',
          message: `walletChain must be one of: ${VALID_CHAINS.join(', ')}`,
        });
      }
      if (typeof wallet !== 'string' || !wallet.trim()) {
        return res.status(422).json({ status: 'error', message: 'wallet is required' });
      }
      if (label !== undefined && label !== null && (typeof label !== 'string' || label.length > 100)) {
        return res.status(422).json({ status: 'error', message: 'label must be ≤ 100 chars' });
      }
      const addedBy = req.user
        ? `${req.user.chain || 'unknown'}:${req.user.address}`
        : null;
      const created = await repo.add({
        walletChain,
        wallet: wallet.trim(),
        label: label?.trim() || null,
        addedBy,
      });
      if (!created) {
        return res.status(422).json({
          status: 'error',
          message: `Invalid ${walletChain} wallet address`,
        });
      }
      res.status(201).json({ status: 'success', data: created });
    } catch (error) {
      console.error(`❌ Error adding ${tier} admin:`, error);
      res.status(500).json({ status: 'error', message: `Failed to add ${tier} admin` });
    }
  };
}

function removeFor(tier) {
  const repo = pickRepo(tier);
  return async (req, res) => {
    try {
      const { wallet } = req.params;
      const walletChain = req.query.chain;
      if (!VALID_CHAINS.includes(walletChain)) {
        return res.status(422).json({
          status: 'error',
          message: `chain query param must be one of: ${VALID_CHAINS.join(', ')}`,
        });
      }
      // Tier-0 self-removal guard: don't let the last app_admin remove themselves.
      if (tier === 'app') {
        const count = await appAdminRepository.count();
        if (count <= 1) {
          return res.status(409).json({
            status: 'error',
            message: 'Cannot remove the last app admin. Add another one first.',
          });
        }
      }
      const removed = await repo.remove(walletChain, wallet);
      if (!removed) {
        return res.status(422).json({
          status: 'error',
          message: `Invalid ${walletChain} wallet address`,
        });
      }
      res.status(204).end();
    } catch (error) {
      console.error(`❌ Error removing ${tier} admin:`, error);
      res.status(500).json({ status: 'error', message: `Failed to remove ${tier} admin` });
    }
  };
}

export const listAppAdmins = listFor('app');
export const addAppAdmin = addFor('app');
export const removeAppAdmin = removeFor('app');

export const listGlobalAdmins = listFor('global');
export const addGlobalAdmin = addFor('global');
export const removeGlobalAdmin = removeFor('global');
