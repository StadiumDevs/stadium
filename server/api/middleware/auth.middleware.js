/**
 * Authentication middleware.
 *
 * Verifies a wallet-signed `x-siws-auth` header. The verification pipeline is
 * chain-agnostic: `parsePayload` reads the optional `chain` field (default
 * `'substrate'`), a per-chain verifier checks the signature, and the shared
 * `validateStatement` / domain checks run identically for every chain. Each
 * middleware then applies its own authorization rule.
 */

import dotenv from 'dotenv';
import chalk from 'chalk';
import projectService from '../services/project.service.js';
import {
  getAuthorizedAddresses,
  CURRENT_MULTISIG,
  NETWORK_CONFIG,
} from '../../config/polkadot-config.js';
import { isAuthorizedSigner } from '../auth/authorizedSigners.js';
import { parsePayload } from '../auth/parsePayload.js';
import { getVerifier } from '../auth/verifiers/index.js';
import { validateStatement } from '../auth/statements.js';
import { normalizeAddress } from '../auth/normalize.js';

dotenv.config();

// --- Configuration ---
// Authorized signers (multisig signers) used for admin authorization.
const ADMIN_WALLETS = getAuthorizedAddresses();

console.log(chalk.cyan('[AuthMiddleware] Configuration:'));
console.log(chalk.cyan(`  Network: ${NETWORK_CONFIG.networkName}`));
console.log(chalk.cyan(`  Multisig: ${CURRENT_MULTISIG}`));
console.log(chalk.cyan(`  Authorized Signers: ${ADMIN_WALLETS.length}`));

const EXPECTED_DOMAIN = process.env.EXPECTED_DOMAIN || 'localhost';
const DISABLE_SIWS_DOMAIN_CHECK = process.env.DISABLE_SIWS_DOMAIN_CHECK === 'true';

const log = (message) => console.log(chalk.cyan(`[AuthMiddleware] ${message}`));
const logError = (message) => console.log(chalk.red(`[AuthMiddleware] ${message}`));
const logSuccess = (message) => console.log(chalk.green(`[AuthMiddleware] ${message}`));

/**
 * Shared auth pipeline: parse the header, pick the chain verifier, verify the
 * signature, then validate the statement and (optionally) the domain.
 *
 * @param {string} authHeader - raw `x-siws-auth` header value
 * @param {{ checkDomain: boolean }} options
 * @returns {Promise<
 *   | { ok: true, chain: string, parsed: object, normalizedAddress: string|null }
 *   | { ok: false, status: number, body: object }
 * >}
 */
async function authenticateRequest(authHeader, { checkDomain }) {
  let payload;
  try {
    payload = parsePayload(authHeader);
  } catch (e) {
    return { ok: false, status: e.status || 400, body: { status: 'error', message: e.message } };
  }

  const { chain, message, signature, address } = payload;

  const verifier = getVerifier(chain);
  if (!verifier) {
    logError(`Unsupported sign-in chain: ${chain}`);
    return {
      ok: false,
      status: 400,
      body: { status: 'error', message: `Unsupported sign-in chain: ${chain}` },
    };
  }

  let result;
  try {
    log(`Verifying ${chain} sign-in for address: ${address}`);
    result = await verifier.verify({ message, signature, address });
  } catch (e) {
    logError(`Signature verification threw. Error: ${e.message}`);
    return {
      ok: false,
      status: 403,
      body: { status: 'error', message: 'SIWS signature verification failed', error: e.message },
    };
  }

  if (!result.valid) {
    logError(`Signature invalid for ${chain} address ${address}.`);
    return {
      ok: false,
      status: 403,
      body: {
        status: 'error',
        message: 'SIWS signature verification failed',
        error: result.error || 'Invalid signature',
      },
    };
  }

  const { parsed, normalizedAddress } = result;

  if (!validateStatement(parsed.statement)) {
    logError(`Invalid statement. Received: "${parsed.statement}"`);
    return {
      ok: false,
      status: 403,
      body: { status: 'error', message: 'Invalid statement in SIWS message.' },
    };
  }

  if (checkDomain && !DISABLE_SIWS_DOMAIN_CHECK) {
    if (parsed.domain !== EXPECTED_DOMAIN) {
      logError(`Invalid domain. Received: "${parsed.domain}". Expected: "${EXPECTED_DOMAIN}"`);
      return {
        ok: false,
        status: 403,
        body: {
          status: 'error',
          message: `Invalid domain. Expected '${EXPECTED_DOMAIN}'.`,
          error: `Domain mismatch: got '${parsed.domain}'`,
        },
      };
    }
  }

  logSuccess(`${chain} sign-in verified for ${parsed.address}.`);
  return { ok: true, chain, parsed, normalizedAddress };
}

// --- Middleware ---

/**
 * Admin-only: the signer must be an authorized multisig signer.
 */
export const requireAdmin = async (req, res, next) => {
  log(`Initiating admin verification for ${req.method} ${req.originalUrl}`);

  const authHeader = req.headers['x-siws-auth'];

  // DEV MODE BYPASS: skip auth in development when header is 'dev-bypass'.
  if (process.env.NODE_ENV !== 'production' && authHeader === 'dev-bypass') {
    log(chalk.yellow('⚠️  DEV MODE: Bypassing SIWS authentication'));
    req.adminAddress = ADMIN_WALLETS[0] || 'dev-admin';
    return next();
  }

  if (!authHeader) {
    logError('Verification failed: Missing x-siws-auth header.');
    return res.status(401).json({ status: 'error', message: 'Missing SIWS auth header' });
  }

  const auth = await authenticateRequest(authHeader, { checkDomain: true });
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const signerAddress = auth.parsed.address;
  if (!isAuthorizedSigner(auth.chain, signerAddress)) {
    logError(`Authorization failed: ${signerAddress} is not authorized for multisig ${CURRENT_MULTISIG}`);
    return res.status(403).json({
      status: 'error',
      message: 'Address is not authorized to sign for the multisig',
      multisig: CURRENT_MULTISIG,
      network: NETWORK_CONFIG.networkName,
    });
  }

  logSuccess(`Authorized signer ${signerAddress} can sign for multisig ${CURRENT_MULTISIG}`);
  req.user = {
    address: signerAddress,
    multisig: CURRENT_MULTISIG,
    network: NETWORK_CONFIG.environment,
  };
  return next();
};

/**
 * Admin OR a team member of the project identified by `req.params.projectId`.
 */
export const requireTeamMemberOrAdmin = async (req, res, next) => {
  log(`Initiating team member or admin verification for ${req.method} ${req.originalUrl}`);
  const { projectId } = req.params;

  if (!projectId) {
    logError('Authorization failed: Missing projectId in request params.');
    return res.status(400).json({ status: 'error', message: 'Project ID is required for this operation' });
  }

  const authHeader = req.headers['x-siws-auth'];

  // DEV MODE BYPASS
  if (process.env.NODE_ENV !== 'production' && authHeader === 'dev-bypass') {
    log(chalk.yellow('⚠️  DEV MODE: Bypassing SIWS authentication for team/admin'));
    req.auth = { address: ADMIN_WALLETS[0] || 'dev-admin', isAdmin: true };
    return next();
  }

  if (!authHeader) {
    logError('Verification failed: Missing x-siws-auth header.');
    return res.status(401).json({ status: 'error', message: 'Missing SIWS auth header' });
  }

  // Domain is verified here too, consistent with requireAdmin / requireOwnWallet.
  // Preview/staging origins are handled by DISABLE_SIWS_DOMAIN_CHECK, not by
  // skipping the check.
  const auth = await authenticateRequest(authHeader, { checkDomain: true });
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  const signerAddress = auth.parsed.address;

  // Authorized multisig signers are always allowed.
  if (isAuthorizedSigner(auth.chain, signerAddress)) {
    logSuccess(`Signer ${signerAddress} is authorized for multisig. Granting access.`);
    req.user = {
      address: signerAddress,
      multisig: CURRENT_MULTISIG,
      network: NETWORK_CONFIG.environment,
    };
    return next();
  }

  // Otherwise the signer must be a team member of the project.
  try {
    const project = await projectService.getProjectById(projectId);
    if (!project) {
      logError(`Authorization failed: Project with ID ${projectId} not found.`);
      return res.status(404).json({ status: 'error', message: 'Project not found' });
    }

    const signerNormalized = auth.normalizedAddress;
    if (!signerNormalized) {
      logError(`Invalid wallet address: ${signerAddress}`);
      return res.status(400).json({ status: 'error', message: 'Invalid wallet address' });
    }

    const isTeamMember = (project.teamMembers || []).some((member) => {
      if (!member.walletAddress) return false;
      const memberChain = member.walletChain || 'substrate';
      const memberNormalized = normalizeAddress(memberChain, member.walletAddress);
      return memberNormalized != null && memberNormalized === signerNormalized;
    });

    if (isTeamMember) {
      logSuccess(`Signer ${signerAddress} is a team member of project ${projectId}. Granting access.`);
      req.user = { address: signerAddress };
      return next();
    }

    logError(`Authorization failed: ${signerAddress} is not a team member of project ${projectId}.`);
    return res.status(403).json({
      status: 'error',
      message: 'User is not authorized to perform this action',
      detail: ADMIN_WALLETS.length === 0
        ? 'No authorized signers configured on server. Set AUTHORIZED_SIGNERS env var.'
        : 'Address is not an authorized signer or team member of this project.',
    });
  } catch (error) {
    logError(`Database error while checking team membership: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Internal server error during authorization' });
  }
};

/**
 * The signer must match the wallet identified by `req.params.address`.
 */
export const requireOwnWallet = async (req, res, next) => {
  log(`Initiating own-wallet verification for ${req.method} ${req.originalUrl}`);

  const authHeader = req.headers['x-siws-auth'];

  // DEV MODE BYPASS
  if (process.env.NODE_ENV !== 'production' && authHeader === 'dev-bypass') {
    log(chalk.yellow('⚠️  DEV MODE: Bypassing SIWS authentication for own-wallet'));
    req.user = { address: req.params.address, chain: 'substrate' };
    return next();
  }

  if (!authHeader) {
    logError('Verification failed: Missing x-siws-auth header.');
    return res.status(401).json({ status: 'error', message: 'Missing SIWS auth header' });
  }

  const auth = await authenticateRequest(authHeader, { checkDomain: true });
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }

  // The signer's chain governs how the target route param is interpreted.
  const targetNormalized = normalizeAddress(auth.chain, req.params.address);
  if (!targetNormalized) {
    logError(`Invalid address in route param: ${req.params.address}`);
    return res.status(400).json({ status: 'error', message: 'Invalid wallet address' });
  }

  const signerNormalized = auth.normalizedAddress;
  if (!signerNormalized) {
    logError(`Invalid signer address: ${auth.parsed.address}`);
    return res.status(400).json({ status: 'error', message: 'Invalid wallet address' });
  }

  if (signerNormalized !== targetNormalized) {
    logError(`Signer ${auth.parsed.address} does not match target wallet ${req.params.address}`);
    return res.status(403).json({
      status: 'error',
      message: 'Signer does not match the target wallet',
      reason: 'not-your-wallet',
    });
  }

  logSuccess(`Signer ${auth.parsed.address} matches target wallet ${req.params.address}`);
  req.user = { address: auth.parsed.address, chain: auth.chain };
  return next();
};

/**
 * Variant of requireTeamMemberOrAdmin that reads the project id from the
 * request body instead of the URL param. Used by routes whose URL is keyed
 * to a different resource (e.g. POST /api/programs/:slug/applications, where
 * :slug identifies the program and body.project_id identifies the project).
 */
export const requireTeamMemberOrAdminByBodyProject = async (req, res, next) => {
  const projectId = req.body?.project_id;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: 'project_id is required in request body for this endpoint',
    });
  }
  req.params = { ...req.params, projectId };
  return requireTeamMemberOrAdmin(req, res, next);
};

export default requireAdmin;
