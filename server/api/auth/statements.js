/**
 * Sign-in statement validation.
 *
 * The statement is the human-readable line a wallet shows the user before they
 * sign. It is chain-agnostic ("... on Stadium") so the same validator covers
 * Substrate (SIWS), Ethereum (SIWE) and Solana sign-in messages — each chain's
 * verifier parses its own message format and hands the extracted statement here.
 */

// Exact-match statements for fixed actions.
export const VALID_STATEMENTS = [
  'Submit milestone deliverables for Stadium',
  'Update team members for project on Stadium',
  'Update project details for project on Stadium',
  'Register team address for Stadium',
  'Perform administrative action on Stadium',
  'Sign in to Stadium',
  // Additional context-specific statements
  'Submit milestone deliverables for project on Stadium',
  'Update team members for Stadium',
  'Update project details for Stadium',
  'Register team address for project on Stadium',
  // Project-specific statements (these will be generated dynamically)
  'Create new project on Stadium',
  'Delete project on Stadium',
  // Admin action statements
  'Review project on Stadium',
  'Approve project on Stadium',
  'Reject project on Stadium',
  // Phase 1 revamp statements
  'Post an update on Stadium',
  'Update funding signal on Stadium',
  'Apply to program on Stadium',
  'Create program on Stadium',
  'Update program on Stadium',
  'Review application on Stadium',
  // Phase 2 revamp: wallet contacts (#67)
  'Update notification preferences for wallet on Stadium',
];

// Patterns for project-specific statements that interpolate a project/program name.
const PROJECT_STATEMENT_PATTERNS = [
  /^Update team members for .+ on Stadium$/,
  /^Submit milestone deliverables for .+ on Stadium$/,
  /^Update project details for .+ on Stadium$/,
  /^Delete project .+ on Stadium$/,
  /^Review project .+ on Stadium$/,
  /^Approve project .+ on Stadium$/,
  /^Reject project .+ on Stadium$/,
  // Phase 1 revamp: project updates (#41)
  /^Post an update to .+ on Stadium$/,
  // Phase 1 revamp: funding signal (#42)
  /^Update funding signal for .+ on Stadium$/,
  // Phase 1 revamp: apply project X to program Y (#44)
  /^Apply project .+ to program .+ on Stadium$/,
];

/**
 * Validate a sign-in statement against the exact-match list and the
 * project-specific patterns.
 *
 * @param {string} statement
 * @returns {boolean}
 */
export function validateStatement(statement) {
  if (VALID_STATEMENTS.includes(statement)) {
    return true;
  }
  return PROJECT_STATEMENT_PATTERNS.some((pattern) => pattern.test(statement));
}
