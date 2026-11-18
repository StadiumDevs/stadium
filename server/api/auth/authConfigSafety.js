/**
 * Production auth-config safety (#301).
 *
 * The well-known Substrate dev accounts (//Alice … //Ferdie) have PUBLIC
 * private keys: anyone can sign as them. The local test-wallet harness signs
 * as Alice, so Alice is routinely an admin on dev machines. If any of these
 * addresses ever reaches a production admin list, anyone can sign in as admin.
 *
 * This module is the single source of truth for that list and for the
 * production checks. It is pure (no DB, no process.env reads unless passed
 * in) so it can be unit-tested and reused by:
 *   - server startup (services/auth-config-check.service.js)
 *   - the admin-add API guards (admin-tiers / program controllers)
 *   - scripts/bootstrap-app-admin.js
 *   - ci/boot-check.js (proves the validator is wired and rejects a bad fixture)
 */

import { normalizeAddress } from './normalize.js';
import { parseAuthorizedSigners } from './authorizedSigners.js';

/**
 * Dev accounts derived from the public dev seed, SS58 prefix 42. Every SS58
 * prefix of the same key normalizes to the same public-key hex, so this list
 * covers all prefixes. Re-derived from the seed in
 * __tests__/authConfigSafety.test.js — do not edit by hand.
 */
export const DEV_ACCOUNTS = Object.freeze([
  // sr25519 (polkadot-js / Talisman / SubWallet default)
  ['//Alice', 'sr25519', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
  ['//Bob', 'sr25519', '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty'],
  ['//Charlie', 'sr25519', '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y'],
  ['//Dave', 'sr25519', '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy'],
  ['//Eve', 'sr25519', '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw'],
  ['//Ferdie', 'sr25519', '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL'],
  // sr25519 stash accounts (pre-funded on dev chains)
  ['//Alice//stash', 'sr25519', '5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY'],
  ['//Bob//stash', 'sr25519', '5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc'],
  ['//Charlie//stash', 'sr25519', '5Ck5SLSHYac6WFt5UZRSsdJjwmpSZq85fd5TRNAdZQVzEAPT'],
  ['//Dave//stash', 'sr25519', '5HKPmK9GYtE1PSLsS1qiYU9xQ9Si1NcEhdeCq9sw5bqu4ns8'],
  ['//Eve//stash', 'sr25519', '5FCfAonRZgTFrTd9HREEyeJjDpT397KMzizE6T3DvebLFE7n'],
  ['//Ferdie//stash', 'sr25519', '5CRmqmsiNFExV6VbdmPJViVxrWmkaXXvBrSX8oqBT8R9vmWk'],
  // ed25519
  ['//Alice', 'ed25519', '5FA9nQDVg267DEd8m1ZypXLBnvN7SFxYwV7ndqSYGiN9TTpu'],
  ['//Bob', 'ed25519', '5GoNkf6WdbxCFnPdAnYYQyCjAKPJgLNxXwPjwTh6DGg6gN3E'],
  ['//Charlie', 'ed25519', '5DbKjhNLpqX3zqZdNBc9BGb4fHU1cRBaDhJUskrvkwfraDi6'],
  ['//Dave', 'ed25519', '5ECTwv6cZ5nJQPk6tWfaTrEk8YH2L7X1VT4EL5Tx2ikfFwb7'],
  ['//Eve', 'ed25519', '5Ck2miBfCe1JQ4cY3NDsXyBaD6EcsgiVmEFTWwqNSs25XDEq'],
  ['//Ferdie', 'ed25519', '5E2BmpVFzYGd386XRCZ76cDePMB3sfbZp5ZKGUsrG1m6gomN'],
  // ecdsa
  ['//Alice', 'ecdsa', '5C7C2Z5sWbytvHpuLTvzKunnnRwQxft1jiqrLD5rhucQ5S9X'],
  ['//Bob', 'ecdsa', '5DVskgSC9ncWQpxFMeUn45NU43RUq93ByEge6ApbnLk6BR9N'],
  ['//Charlie', 'ecdsa', '5EP2cMaCxLzhfD3aFAqqgu3kfXH7GcwweEv6JXZRP6ysRHkQ'],
  ['//Dave', 'ecdsa', '5CtLD1M83vbXs42XPYyvygkUg6BxxMRBAiNqg1XD5qe7iW8g'],
  ['//Eve', 'ecdsa', '5GCnMRtSQq8i2fShXieQThcRyLakPyVPcTLm65Bcii4NAp5n'],
  ['//Ferdie', 'ecdsa', '5HkJ124K2dtXW3EFE8oUw9bkgiJMrSh4E9gNiiSCU2TpEjTS'],
]);

// Public-key hex → "//Name (type)" for readable error messages.
const DEV_BY_PUBKEY = new Map(
  DEV_ACCOUNTS.map(([uri, type, address]) => [
    normalizeAddress('substrate', address),
    `${uri} (${type})`,
  ]),
);

const PUBKEY_HEX = /^0x[0-9a-f]{64}$/i;

/**
 * Identify a dev account. Accepts any SS58 form, or the normalized public-key
 * hex that the admin tables store for substrate wallets.
 *
 * @param {string} chain - only 'substrate' can be a dev account
 * @param {string} wallet
 * @returns {string|null} e.g. "//Alice (sr25519)", or null if not a dev account
 */
export function devAccountName(chain, wallet) {
  if (chain !== 'substrate' || typeof wallet !== 'string') return null;
  const trimmed = wallet.trim();
  const key = PUBKEY_HEX.test(trimmed)
    ? trimmed.toLowerCase()
    : normalizeAddress('substrate', trimmed);
  return (key && DEV_BY_PUBKEY.get(key)) || null;
}

export const isDevAccount = (chain, wallet) => devAccountName(chain, wallet) !== null;

/**
 * Production is NODE_ENV=production OR Railway's production environment, so a
 * missing NODE_ENV on Railway cannot silently switch these checks off.
 */
export function isProductionRuntime(env = process.env) {
  return env.NODE_ENV === 'production' || env.RAILWAY_ENVIRONMENT_NAME === 'production';
}

/**
 * Env-level problems. Returns human-readable strings; empty means safe.
 * @param {Record<string, string|undefined>} env
 */
export function findEnvProblems(env) {
  const problems = [];

  for (const key of ['ADMIN_WALLETS', 'AUTHORIZED_SIGNERS']) {
    for (const raw of String(env[key] || '').split(',')) {
      const [entry] = parseAuthorizedSigners(raw);
      const name = entry && devAccountName(entry.chain, entry.normalized);
      if (name) problems.push(`${key} contains dev account ${name}`);
    }
  }

  if (env.DISABLE_SIWS_DOMAIN_CHECK === 'true') {
    problems.push('DISABLE_SIWS_DOMAIN_CHECK=true disables SIWS domain binding');
  }

  const domain = String(env.EXPECTED_DOMAIN || '').trim();
  if (!domain) {
    problems.push('EXPECTED_DOMAIN is unset (SIWS domain check falls back to "localhost")');
  } else if (domain === 'localhost') {
    problems.push('EXPECTED_DOMAIN is "localhost"');
  }

  return problems;
}

/**
 * Admin-table problems.
 * @param {{ appAdmins?: Array, globalAdmins?: Array, programAdmins?: Array }} rows
 *   rows shaped like the repositories' transforms ({ walletChain, wallet, programId? })
 */
export function findAdminRowProblems({ appAdmins = [], globalAdmins = [], programAdmins = [] }) {
  const problems = [];
  const scan = (table, rows) => {
    for (const row of rows) {
      const name = devAccountName(row.walletChain, row.wallet);
      if (name) {
        const where = row.programId ? ` (program ${row.programId})` : '';
        problems.push(`${table} contains dev account ${name}${where}`);
      }
    }
  };
  scan('app_admins', appAdmins);
  scan('global_admins', globalAdmins);
  scan('program_admins', programAdmins);
  return problems;
}

export class UnsafeAuthConfigError extends Error {
  constructor(problems) {
    super(`UNSAFE_AUTH_CONFIG: ${problems.join('; ')}`);
    this.name = 'UnsafeAuthConfigError';
    this.problems = problems;
  }
}

/**
 * Startup check. Outside production it does nothing.
 *
 * Env problems are always detected. Admin rows are loaded with retries; if the
 * DB stays unreachable the table check is skipped with a loud log rather than
 * taking production down over a transient Supabase blip — the admin-add guards
 * still stop new dev accounts from being inserted.
 *
 * @param {object} opts
 * @param {Record<string, string|undefined>} opts.env
 * @param {() => Promise<object>} opts.loadAdminRows
 * @param {boolean} opts.enforce - throw UnsafeAuthConfigError on problems
 * @param {{ error: Function, warn: Function }} [opts.logger]
 * @param {number} [opts.attempts]
 * @param {number} [opts.retryDelayMs]
 * @param {number} [opts.attemptTimeoutMs] - a hung DB call counts as a failed attempt
 * @returns {Promise<{ skipped: boolean, problems: string[], adminRowsChecked: boolean }>}
 */
export async function checkAuthConfigAtStartup({
  env,
  loadAdminRows,
  enforce,
  logger = console,
  attempts = 3,
  retryDelayMs = 1000,
  attemptTimeoutMs = 5000,
}) {
  if (!isProductionRuntime(env)) {
    return { skipped: true, problems: [], adminRowsChecked: false };
  }

  const problems = findEnvProblems(env);

  let adminRowsChecked = false;
  for (let i = 1; i <= attempts; i++) {
    try {
      let timer;
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${attemptTimeoutMs}ms`)), attemptTimeoutMs);
      });
      let rows;
      try {
        rows = await Promise.race([loadAdminRows(), timeout]);
      } finally {
        clearTimeout(timer);
      }
      problems.push(...findAdminRowProblems(rows));
      adminRowsChecked = true;
      break;
    } catch (e) {
      if (i === attempts) {
        logger.error(
          `[AuthConfig] Could not load admin tables after ${attempts} attempts (${e.message}); ` +
            'skipping the dev-account table check for this boot.',
        );
      } else if (retryDelayMs > 0) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
      }
    }
  }

  if (problems.length) {
    const err = new UnsafeAuthConfigError(problems);
    if (enforce) throw err;
    logger.error(`[AuthConfig] ${err.message} (warn-only: server continues to boot)`);
  }

  return { skipped: false, problems, adminRowsChecked };
}
