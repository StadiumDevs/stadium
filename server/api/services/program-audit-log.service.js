import repo from '../repositories/program-audit-log.repository.js';
import logger from '../utils/logger.js';

/**
 * Best-effort write of an audit-log row. NEVER throws — a log failure
 * must not break the calling action (importing a CSV, accepting an
 * application, etc.). Errors land in the server log instead.
 *
 * Pull `actor` out of `req.user` at the call-site:
 *   await auditLog.logSafe({
 *     programId,
 *     actor: { chain: req.user?.chain, wallet: req.user?.address },
 *     action: 'sponsor.add',
 *     targetType: 'sponsor',
 *     targetId: created.id,
 *     metadata: { name: created.name },
 *   });
 */
class ProgramAuditLogService {
  async listByProgramId(programId, opts) {
    return await repo.listByProgramId(programId, opts);
  }

  async logSafe({ programId, actor, action, targetType, targetId, metadata }) {
    try {
      if (!programId || !action) return null;
      return await repo.insert({
        programId,
        actorChain: actor?.chain,
        actorWallet: actor?.wallet,
        action,
        targetType,
        targetId: targetId == null ? null : String(targetId),
        metadata,
      });
    } catch (e) {
      logger.error(`audit-log failed (action=${action}, program=${programId}):`, e);
      return null;
    }
  }
}

export default new ProgramAuditLogService();
