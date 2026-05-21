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
import { consumeNonce } from '../auth/nonceStore.js';
import { extractBearerToken, verifySessionToken } from '../auth/sessionToken.js';
import programRepository from '../repositories/program.repository.js';
import programAdminRepository from '../repositories/program-admin.repository.js';
import appAdminRepository from '../repositories/app-admin.repository.js';
import globalAdminRepository from '../repositories/global-admin.repository.js';

/**
 * Admin = signer is an app_admin (tier 0) OR a global_admin (tier 1)
 * OR an entry in the legacy AUTHORIZED_SIGNERS env. Env stays as a
 * fallback so an unsynced DB never locks out the team.
 */
async function isAdminWallet(chain, address) {
  if (isAuthorizedSigner(chain, address)) return true;
  if (await appAdminRepository.isAppAdmin(chain, address)) return true;
  if (await globalAdminRepository.isGlobalAdmin(chain, address)) return true;
  return false;
}

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
export async function authenticateRequest(authHeader, { checkDomain }) {
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

  // Reject stale messages and consume the nonce — single-use, anti-replay (#88).
  const expiresAtMs = parsed.expirationTime ? new Date(parsed.expirationTime).getTime() : NaN;
  if (!Number.isFinite(expiresAtMs)) {
    logError('Sign-in message has no expiration time.');
    return {
      ok: false,
      status: 403,
      body: { status: 'error', message: 'Sign-in message must include an expiration time' },
    };
  }
  if (expiresAtMs <= Date.now()) {
    logError('Sign-in message has expired.');
    return {
      ok: false,
      status: 403,
      body: { status: 'error', message: 'Sign-in message has expired' },
    };
  }

  let nonceResult;
  try {
    nonceResult = await consumeNonce(parsed.nonce, expiresAtMs);
  } catch (e) {
    logError(`Nonce store error: ${e.message}`);
    return {
      ok: false,
      status: 500,
      body: { status: 'error', message: 'Internal error during authentication' },
    };
  }
  if (!nonceResult.ok) {
    logError(`Nonce rejected (${nonceResult.reason}).`);
    return {
      ok: false,
      status: 403,
      body: {
        status: 'error',
        message: nonceResult.reason === 'replay'
          ? 'Sign-in message has already been used'
          : 'Sign-in message must include a nonce',
      },
    };
  }

  logSuccess(`${chain} sign-in verified for ${parsed.address}.`);
  return { ok: true, chain, parsed, normalizedAddress };
}

/**
 * Resolve the authenticated signer of a request, preferring a session bearer
 * token over a fresh SIWS sign. Returns the same shape as authenticateRequest
 * (`{ ok, status, body }` on failure; `{ ok, chain, parsed, normalizedAddress }`
 * on success).
 *
 * Bearer path: short-lived HMAC token, valid for ADMIN_SESSION_TTL_SECONDS
 * after one SIWS sign exchanged via POST /api/admin/session.
 * SIWS path: unchanged — single-use nonce + expirationTime + statement check.
 *
 * The synthetic `parsed` object exposed on the bearer path has just `address`
 * (other fields are undefined) — downstream middleware only reads `address`
 * and `chain`, never the other SIWS fields, so the shape is compatible.
 */
export async function resolveAuthIdentity(req, { checkDomain }) {
  const bearer = extractBearerToken(req);
  if (bearer) {
    const v = verifySessionToken(bearer);
    if (v.valid) {
      const chain = v.chain;
      let normalizedAddress;
      try {
        normalizedAddress = normalizeAddress(chain, v.address);
      } catch {
        normalizedAddress = v.address;
      }
      logSuccess(`${chain} session bearer accepted for ${v.address}.`);
      return {
        ok: true,
        chain,
        parsed: { address: v.address, statement: '[session-bearer]', domain: undefined, nonce: undefined },
        normalizedAddress,
        viaSession: true,
      };
    }
    logError(`Bearer rejected (${v.reason}).`);
    return {
      ok: false,
      status: 401,
      body: { status: 'error', message: 'Session token invalid or expired' },
    };
  }

  const authHeader = req.headers['x-siws-auth'];

  // DEV MODE BYPASS — preserved so existing local dev workflows keep working.
  if (process.env.NODE_ENV !== 'production' && authHeader === 'dev-bypass') {
    log(chalk.yellow('⚠️  DEV MODE: Bypassing SIWS authentication'));
    return {
      ok: true,
      chain: 'substrate',
      parsed: { address: ADMIN_WALLETS[0] || 'dev-admin', statement: '[dev-bypass]' },
      normalizedAddress: ADMIN_WALLETS[0] || 'dev-admin',
      viaSession: false,
      devBypass: true,
    };
  }

  if (!authHeader) {
    return {
      ok: false,
      status: 401,
      body: { status: 'error', message: 'Missing SIWS auth header' },
    };
  }
  return authenticateRequest(authHeader, { checkDomain });
}

// --- Middleware ---

/**
 * Admin-only: the signer must be an authorized multisig signer.
 */
export const requireAdmin = async (req, res, next) => {
  log(`Initiating admin verification for ${req.method} ${req.originalUrl}`);

  const auth = await resolveAuthIdentity(req, { checkDomain: true });
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }
  if (auth.devBypass) {
    req.adminAddress = auth.parsed.address;
    return next();
  }

  const signerAddress = auth.parsed.address;
  if (!(await isAdminWallet(auth.chain, signerAddress))) {
    logError(`Authorization failed: ${signerAddress} is not an admin (app/global/env)`);
    return res.status(403).json({
      status: 'error',
      message: 'Address is not authorized as an admin',
      multisig: CURRENT_MULTISIG,
      network: NETWORK_CONFIG.networkName,
    });
  }

  logSuccess(`Admin ${signerAddress} authorized`);
  req.user = {
    address: signerAddress,
    multisig: CURRENT_MULTISIG,
    network: NETWORK_CONFIG.environment,
  };
  return next();
};

/**
 * App admin only — tier 0. Used by the `/api/app-admins` routes that
 * manage the admin lists themselves.
 */
export const requireAppAdmin = async (req, res, next) => {
  log(`Initiating app-admin verification for ${req.method} ${req.originalUrl}`);
  const auth = await resolveAuthIdentity(req, { checkDomain: true });
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }
  if (auth.devBypass) {
    req.user = { address: auth.parsed.address, chain: 'substrate', tier: 'app' };
    return next();
  }
  const signerAddress = auth.parsed.address;
  const ok = await appAdminRepository.isAppAdmin(auth.chain, signerAddress);
  if (!ok) {
    logError(`${signerAddress} is not an app_admin`);
    return res.status(403).json({
      status: 'error',
      message: 'Only app admins can manage the admin lists',
    });
  }
  logSuccess(`App admin ${signerAddress} authorized`);
  req.user = { address: signerAddress, chain: auth.chain, tier: 'app' };
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

  // Domain is verified here too, consistent with requireAdmin / requireOwnWallet.
  // Preview/staging origins are handled by DISABLE_SIWS_DOMAIN_CHECK, not by
  // skipping the check.
  const auth = await resolveAuthIdentity(req, { checkDomain: true });
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }
  if (auth.devBypass) {
    req.auth = { address: auth.parsed.address, isAdmin: true };
    return next();
  }

  const signerAddress = auth.parsed.address;

  // Any admin tier (app/global/env) is always allowed.
  if (await isAdminWallet(auth.chain, signerAddress)) {
    logSuccess(`Signer ${signerAddress} is an admin. Granting access.`);
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

  const auth = await resolveAuthIdentity(req, { checkDomain: true });
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }
  if (auth.devBypass) {
    req.user = { address: req.params.address, chain: 'substrate' };
    return next();
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
 * Per-event admin (Phase 3, #95). The signer must be either a global
 * authorized signer (ADMIN_WALLETS) OR an entry in `program_admins` for the
 * program identified by `req.params[slugParam]`.
 *
 * @param {string} [slugParam='slug'] - name of the URL param holding the
 *   program slug. Routes mounted under `/programs/:slug/...` get the default.
 */
export const requireProgramAdmin = (slugParam = 'slug') => async (req, res, next) => {
  const slug = req.params?.[slugParam];
  log(`Initiating program-admin verification for ${req.method} ${req.originalUrl} (slug=${slug})`);

  if (!slug || typeof slug !== 'string') {
    logError(`Missing ${slugParam} param.`);
    return res.status(400).json({ status: 'error', message: `Program ${slugParam} is required` });
  }

  const auth = await resolveAuthIdentity(req, { checkDomain: true });
  if (!auth.ok) {
    return res.status(auth.status).json(auth.body);
  }
  if (auth.devBypass) {
    req.user = { address: auth.parsed.address, programSlug: slug, isGlobalAdmin: true };
    return next();
  }

  const signerAddress = auth.parsed.address;

  // Any admin tier (app/global/env) always passes.
  if (await isAdminWallet(auth.chain, signerAddress)) {
    logSuccess(`Global admin ${signerAddress} accessing program "${slug}".`);
    req.user = { address: signerAddress, chain: auth.chain, programSlug: slug, isGlobalAdmin: true };
    return next();
  }

  // Otherwise the signer must be an entry in program_admins for this program.
  try {
    const program = await programRepository.findBySlug(slug);
    if (!program) {
      logError(`Program "${slug}" not found.`);
      return res.status(404).json({ status: 'error', message: 'Program not found' });
    }

    const isProgramAdmin = await programAdminRepository.isAdmin(program.id, auth.chain, signerAddress);
    if (!isProgramAdmin) {
      logError(`${signerAddress} is not an admin for program "${slug}".`);
      return res.status(403).json({
        status: 'error',
        message: 'Address is not authorized to administer this program',
      });
    }

    logSuccess(`Program admin ${signerAddress} accessing "${slug}".`);
    req.user = {
      address: signerAddress,
      chain: auth.chain,
      programSlug: slug,
      programId: program.id,
      isGlobalAdmin: false,
    };
    return next();
  } catch (err) {
    logError(`Database error during program-admin check: ${err.message}`);
    return res.status(500).json({ status: 'error', message: 'Internal server error during authorization' });
  }
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
