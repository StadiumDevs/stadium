/**
 * Wires the production auth-config check (#301) to the admin repositories.
 * The rules themselves live in api/auth/authConfigSafety.js.
 */

import appAdminRepository from '../repositories/app-admin.repository.js';
import globalAdminRepository from '../repositories/global-admin.repository.js';
import programAdminRepository from '../repositories/program-admin.repository.js';
import { checkAuthConfigAtStartup, UnsafeAuthConfigError } from '../auth/authConfigSafety.js';

/**
 * Rollout switch (#301). Phase 2a ships warn-only: unsafe config is logged as
 * UNSAFE_AUTH_CONFIG but the server still boots. Phase 2b flips this to true
 * once production logs are confirmed clean, after which an unsafe production
 * config refuses to boot.
 */
export const ENFORCE_SAFE_AUTH_CONFIG = false;

export async function loadAdminRows() {
  const [appAdmins, globalAdmins, programAdmins] = await Promise.all([
    appAdminRepository.list(),
    globalAdminRepository.list(),
    programAdminRepository.listAll(),
  ]);
  return { appAdmins, globalAdmins, programAdmins };
}

/**
 * Only an UnsafeAuthConfigError (enforce mode, real problems found) may stop
 * the boot. Any other failure of the check itself is logged and boot carries
 * on, so a bug in the guard can never take production down.
 */
export async function runStartupAuthConfigCheck({
  env = process.env,
  logger = console,
  enforce = ENFORCE_SAFE_AUTH_CONFIG,
  ...opts
} = {}) {
  try {
    return await checkAuthConfigAtStartup({ env, loadAdminRows, enforce, logger, ...opts });
  } catch (e) {
    if (e instanceof UnsafeAuthConfigError) throw e;
    logger.error(`[AuthConfig] Startup auth-config check failed (${e.message}); continuing boot.`);
    return { skipped: false, problems: [], adminRowsChecked: false, failed: true };
  }
}
