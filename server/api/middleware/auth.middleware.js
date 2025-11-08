import dotenv from 'dotenv';
import { verifySIWS } from '@talismn/siws';
import { SiwsMessage } from '@talismn/siws';
import chalk from 'chalk';
import Project from '../../models/Project.js';

dotenv.config();

// --- Configuration ---
const ADMIN_WALLETS = (process.env.ADMIN_WALLETS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  .map(s => s.toLowerCase());

// Multiple valid statements for different actions
const VALID_STATEMENTS = [
  "Submit milestone deliverables for Stadium",
  "Update team members for project on Stadium",
  "Update project details for project on Stadium",
  "Register team address for Stadium",
  "Perform administrative action on Stadium",
  "Sign in to Stadium",
  // Additional context-specific statements
  "Submit milestone deliverables for project on Stadium",
  "Update team members for Stadium",
  "Update project details for Stadium",
  "Register team address for project on Stadium",
  // Project-specific statements (these will be generated dynamically)
  "Create new project on Stadium",
  "Delete project on Stadium",
  // Admin action statements
  "Review project on Stadium",
  "Approve project on Stadium",
  "Reject project on Stadium"
];

const EXPECTED_DOMAIN = process.env.EXPECTED_DOMAIN || 'localhost';

const log = (message) => console.log(chalk.cyan(`[AuthMiddleware] ${message}`));
const logError = (message) => console.log(chalk.red(`[AuthMiddleware] ${message}`));
const logSuccess = (message) => console.log(chalk.green(`[AuthMiddleware] ${message}`));

/**
 * Validate SIWS statement with support for context-aware and project-specific statements
 */
function validateSiwsStatement(statement) {
  // Check exact matches first
  if (VALID_STATEMENTS.includes(statement)) {
    return true;
  }
  
  // Pattern match for project-specific statements
  const projectPatterns = [
    /^Update team members for .+ on Stadium$/,
    /^Submit milestone deliverables for .+ on Stadium$/,
    /^Update project details for .+ on Stadium$/,
    /^Delete project .+ on Stadium$/,
    /^Review project .+ on Stadium$/,
    /^Approve project .+ on Stadium$/,
    /^Reject project .+ on Stadium$/
  ];
  
  return projectPatterns.some(pattern => pattern.test(statement));
}

// --- Middleware ---
export const requireAdmin = async (req, res, next) => {
  // TEMPORARY: Bypass admin check for testing (hardcoded for development)
  const BYPASS_ADMIN_CHECK = true; // Set to false for production
  
  if (BYPASS_ADMIN_CHECK) {
    logSuccess('[BYPASS] Admin check bypassed for testing');
    req.user = { address: 'test-admin-address' };
    return next();
  }
  
  log(`Initiating admin verification for ${req.method} ${req.originalUrl}`);

  const authHeader = req.headers['x-siws-auth'];

  if (!authHeader) {
    logError('Verification failed: Missing x-siws-auth header.');
    return res.status(401).json({ status: 'error', message: 'Missing SIWS auth header' });
  }
  log('Found x-siws-auth header.');

  let decodedString;
  try {
    decodedString = atob(authHeader);
    log('Successfully decoded Base64 header.');
  } catch (e) {
    logError(`Verification failed: Could not decode Base64. Error: ${e.message}`);
    logError(`Received value: ${authHeader}`);
    return res.status(400).json({ status: 'error', message: 'Invalid Base64 in auth header' });
  }

  let signedPayload;
  try {
    signedPayload = JSON.parse(decodedString);
    log('Successfully parsed JSON from decoded string.');
  } catch (e) {
    logError(`Verification failed: Could not parse JSON. Error: ${e.message}`);
    logError(`Decoded string content: ${decodedString}`);
    return res.status(400).json({ status: 'error', message: 'Malformed SIWS payload in header' });
  }

  const { message, signature, address } = signedPayload;
  if (!message || !signature || !address) {
    logError('Verification failed: Payload is missing message, signature, or address.');
    logError(`Received payload: ${JSON.stringify(signedPayload)}`);
    return res.status(400).json({ status: 'error', message: 'Incomplete SIWS payload' });
  }

  try {
    log(`Verifying SIWS for address: ${address}`);
    const siwsMessage = await verifySIWS(message, signature, address);
    logSuccess('SIWS signature verified successfully.');

    log(`Checking statement. Received: "${siwsMessage.statement}"`);
    if (!validateSiwsStatement(siwsMessage.statement)) {
      logError(`Invalid statement. Received: "${siwsMessage.statement}"`);
      logError(`Valid statements: ${VALID_STATEMENTS.join(', ')}`);
      return res.status(403).json({ status: 'error', message: 'Invalid statement in SIWS message.' });
    }
    logSuccess('Statement is valid.');

    log(`Checking domain. Expected: "${EXPECTED_DOMAIN}"`);
    if (siwsMessage.domain !== EXPECTED_DOMAIN) {
      logError(`Invalid domain. Received: "${siwsMessage.domain}". Expected: "${EXPECTED_DOMAIN}"`);
      return res.status(403).json({ status: 'error', message: `Invalid domain. Expected '${EXPECTED_DOMAIN}'.` });
    }
    logSuccess('Domain matches.');

    const signerAddress = siwsMessage.address.toLowerCase();
    log(`Checking if signer address is an admin. Address: ${signerAddress}`);

    if (!ADMIN_WALLETS.includes(signerAddress)) {
      logError(`Authorization failed: Address ${signerAddress} is not in the admin list.`);
      return res.status(403).json({ status: 'error', message: 'User is not authorized to perform this action' });
    }

    logSuccess(`Admin user ${signerAddress} is authorized.`);
    req.user = { address: siwsMessage.address };
    next();

  } catch (e) {
    logError(`SIWS signature verification failed. Error: ${e.message}`);
    logError(`Received payload for debugging: ${JSON.stringify(signedPayload)}`);
    return res.status(403).json({ status: "error", message: "SIWS signature verification failed", error: e.message });
  }
};

export const requireProjectWriteAccess = async (req, res, next) => {
  const actor = requireSignature(req, res);
  if (!actor) return; // response already sent

  const admins = parseAdminAddresses();
  const isAdmin = admins.includes(actor.address.toLowerCase());
  if (isAdmin) {
    req.auth = { address: actor.address, isAdmin: true };
    return next();
  }

  const { projectId } = req.params || {};
  if (!projectId) {
    return res.status(400).json({ status: 'error', message: 'Missing projectId in route' });
  }

  try {
    const project = await Project.findById(projectId).select('teamMembers');
    if (!project) {
      return res.status(404).json({ status: 'error', message: 'Project not found' });
    }

    const actorLower = actor.address.toLowerCase();
    const hasAccess = (project.teamMembers || []).some(m => (m.walletAddress || '').toLowerCase() === actorLower);

    if (!hasAccess) {
      return res.status(403).json({ status: 'error', message: 'Not authorized to modify this project' });
    }

    req.auth = { address: actor.address, isAdmin: false };
    next();
  } catch (err) {
    console.error('❌ Auth middleware failed:', err);
    return res.status(500).json({ status: 'error', message: 'Authorization check failed' });
  }
};

export const requireTeamMemberOrAdmin = async (req, res, next) => {
  log(`Initiating team member or admin verification for ${req.method} ${req.originalUrl}`);
  const { projectId } = req.params;

  if (!projectId) {
    logError('Authorization failed: Missing projectId in request params.');
    return res.status(400).json({ status: 'error', message: 'Project ID is required for this operation' });
  }

  const authHeader = req.headers['x-siws-auth'];
  if (!authHeader) {
    logError('Verification failed: Missing x-siws-auth header.');
    return res.status(401).json({ status: 'error', message: 'Missing SIWS auth header' });
  }
  
  let decodedString, signedPayload, siwsMessage;

  try {
    decodedString = atob(authHeader);
    signedPayload = JSON.parse(decodedString);
    const { message, signature, address } = signedPayload;
    
    if (!message || !signature || !address) {
      logError('Verification failed: Payload is missing message, signature, or address.');
      return res.status(400).json({ status: 'error', message: 'Incomplete SIWS payload' });
    }

    log(`Verifying SIWS for address: ${address}`);
    siwsMessage = await verifySIWS(message, signature, address);
    logSuccess('SIWS signature verified successfully.');

    // Validate statement with context-aware validation
    log(`Checking statement. Received: "${siwsMessage.statement}"`);
    if (!validateSiwsStatement(siwsMessage.statement)) {
      logError(`Invalid statement. Received: "${siwsMessage.statement}"`);
      logError(`Valid statements: ${VALID_STATEMENTS.join(', ')}`);
      return res.status(403).json({ status: 'error', message: 'Invalid statement in SIWS message.' });
    }
    logSuccess('Statement is valid.');

  } catch (e) {
    logError(`SIWS verification failed. Error: ${e.message}`);
    logError(`Decoded string for debugging: ${decodedString}`);
    return res.status(403).json({ status: "error", message: "SIWS verification failed", error: e.message });
  }

  const signerAddress = siwsMessage.address.toLowerCase();
  log(`Checking authorization for signer: ${signerAddress}`);

  if (ADMIN_WALLETS.includes(signerAddress)) {
    logSuccess(`Signer ${signerAddress} is an admin. Granting access.`);
    req.user = { address: siwsMessage.address };
    return next();
  }
  log(`Signer ${signerAddress} is not an admin. Checking project team membership...`);
  
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      logError(`Authorization failed: Project with ID ${projectId} not found.`);
      return res.status(404).json({ status: 'error', message: 'Project not found' });
    }

    const isTeamMember = project.teamMembers.some(
      (member) => member.walletAddress && member.walletAddress.toLowerCase() === signerAddress
    );

    if (isTeamMember) {
      logSuccess(`Signer ${signerAddress} is a team member of project ${projectId}. Granting access.`);
      req.user = { address: siwsMessage.address };
      return next();
    }

    logError(`Authorization failed: Signer ${signerAddress} is not a team member of project ${projectId}.`);
    return res.status(403).json({ status: 'error', message: 'User is not authorized to perform this action' });

  } catch (error) {
    logError(`Database error while checking team membership: ${error.message}`);
    return res.status(500).json({ status: 'error', message: 'Internal server error during authorization' });
  }
};

export default requireAdmin;
