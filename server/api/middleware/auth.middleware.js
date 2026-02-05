import dotenv from 'dotenv';
import { verifySIWS } from '@talismn/siws';
import { SiwsMessage } from '@talismn/siws';
import chalk from 'chalk';
import Project from '../../models/Project.js';
import { getAuthorizedAddresses, isAuthorizedSigner, CURRENT_MULTISIG, NETWORK_CONFIG } from '../../config/polkadot-config.js';

dotenv.config();

// --- Configuration ---
// Use authorized signers from network config (multisig signers)
const ADMIN_WALLETS = getAuthorizedAddresses();

console.log(chalk.cyan('[AuthMiddleware] Configuration:'));
console.log(chalk.cyan(`  Network: ${NETWORK_CONFIG.networkName}`));
console.log(chalk.cyan(`  Multisig: ${CURRENT_MULTISIG}`));
console.log(chalk.cyan(`  Authorized Signers: ${ADMIN_WALLETS.length}`));

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
const DISABLE_SIWS_DOMAIN_CHECK = process.env.DISABLE_SIWS_DOMAIN_CHECK === 'true';

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
  log(`Initiating admin verification for ${req.method} ${req.originalUrl}`);

  // DEV MODE BYPASS: Skip auth in development when header contains 'dev-bypass'
  const authHeader = req.headers['x-siws-auth'];
  if (process.env.NODE_ENV !== 'production' && authHeader === 'dev-bypass') {
    log(chalk.yellow('⚠️  DEV MODE: Bypassing SIWS authentication'));
    req.adminAddress = ADMIN_WALLETS[0] || 'dev-admin';
    return next();
  }

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

    // Check domain if not disabled
    if (!DISABLE_SIWS_DOMAIN_CHECK) {
      log(`Checking domain. Expected: "${EXPECTED_DOMAIN}"`);
      if (siwsMessage.domain !== EXPECTED_DOMAIN) {
        logError(`Invalid domain. Received: "${siwsMessage.domain}". Expected: "${EXPECTED_DOMAIN}"`);
        return res.status(403).json({ status: 'error', message: `Invalid domain. Expected '${EXPECTED_DOMAIN}'.` });
      }
      logSuccess('Domain matches.');
    } else {
      log('Domain check disabled (DISABLE_SIWS_DOMAIN_CHECK=true)');
    }

    const signerAddress = siwsMessage.address.toLowerCase();
    log(`Checking if signer address can sign for multisig. Address: ${signerAddress}`);

    if (!isAuthorizedSigner(signerAddress)) {
      logError(`Authorization failed: Address ${signerAddress} is not authorized to sign for multisig ${CURRENT_MULTISIG}`);
      logError(`Authorized signers: ${ADMIN_WALLETS.join(', ')}`);
      return res.status(403).json({ 
        status: 'error', 
        message: 'Address is not authorized to sign for the multisig',
        multisig: CURRENT_MULTISIG,
        network: NETWORK_CONFIG.networkName
      });
    }

    logSuccess(`Authorized signer ${signerAddress} can sign for multisig ${CURRENT_MULTISIG}`);
    req.user = { 
      address: siwsMessage.address,
      multisig: CURRENT_MULTISIG,
      network: NETWORK_CONFIG.environment
    };
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

  const authorizedAddresses = getAuthorizedAddresses();
  const isAdmin = authorizedAddresses.includes(actor.address.toLowerCase());
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
  
  // DEV MODE BYPASS: Skip auth in development when header contains 'dev-bypass'
  if (process.env.NODE_ENV !== 'production' && authHeader === 'dev-bypass') {
    log(chalk.yellow('⚠️  DEV MODE: Bypassing SIWS authentication for team/admin'));
    req.auth = { address: ADMIN_WALLETS[0] || 'dev-admin', isAdmin: true };
    return next();
  }
  
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

  if (isAuthorizedSigner(signerAddress)) {
    logSuccess(`Signer ${signerAddress} is authorized for multisig. Granting access.`);
    req.user = { 
      address: siwsMessage.address,
      multisig: CURRENT_MULTISIG,
      network: NETWORK_CONFIG.environment
    };
    return next();
  }
  log(`Signer ${signerAddress} is not a multisig signer. Checking project team membership...`);
  
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
