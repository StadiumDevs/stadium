import programApplicationService from './program-application.service.js';
import programSignupService from './program-signup.service.js';
import projectService from './project.service.js';
import { csvCell, csvRow } from '../utils/csv.js';

/**
 * Per-program inbox — one merged feed of `program_signups` (Luma CSV
 * imports, individuals) plus `program_applications` (project teams that
 * applied in-app). Two distinct concepts; the inbox unifies them for
 * triage / export.
 *
 * Each entry carries a `source` discriminator + a stable `when` timestamp
 * so the merged feed sorts cleanly.
 */

/** Unified shape returned by listInbox. */
const baseEntry = (source, raw) => ({
  source,
  id: raw.id,
  when: raw.when,
  name: raw.name ?? null,
  email: raw.email ?? null,
  identifier: raw.identifier,
  status: raw.status ?? null,
  wallet: raw.wallet ?? null,
  walletChain: raw.walletChain ?? null,
});

class ProgramInboxService {
  /**
   * Return merged signups + applications for a program, newest first.
   * Application entries are enriched with the project name when known.
   *
   * @param {string} programId
   * @returns {Promise<Array>}
   */
  async listInbox(programId) {
    const [signups, applications] = await Promise.all([
      programSignupService.listByProgramId(programId),
      programApplicationService.listByProgram(programId),
    ]);

    // Best-effort enrich application rows with their project name. Dedup
    // upfront (multiple applications can point at the same project) so we
    // don't race the Promise.all on identical projectIds.
    const uniqueProjectIds = [...new Set(applications.map((a) => a.projectId))];
    const projectNameById = new Map();
    await Promise.all(
      uniqueProjectIds.map(async (projectId) => {
        try {
          const project = await projectService.getProjectById(projectId);
          projectNameById.set(projectId, project?.projectName || null);
        } catch {
          projectNameById.set(projectId, null);
        }
      }),
    );

    const signupEntries = signups.map((s) =>
      baseEntry('signup', {
        id: s.id,
        when: s.registeredAt || s.createdAt,
        name: s.name,
        email: s.email,
        identifier: s.email,
        status: null,
        wallet: s.wallet,
        walletChain: null,
      }),
    );

    const applicationEntries = applications.map((a) =>
      baseEntry('application', {
        id: a.id,
        when: a.submittedAt,
        name: projectNameById.get(a.projectId) || a.projectId,
        email: null,
        identifier: a.projectId,
        status: a.status,
        wallet: a.submittedBy,
        walletChain: null,
      }),
    );

    return [...signupEntries, ...applicationEntries].sort((a, b) => {
      const aMs = a.when ? new Date(a.when).getTime() : 0;
      const bMs = b.when ? new Date(b.when).getTime() : 0;
      return bMs - aMs;
    });
  }
}

export default new ProgramInboxService();

// CSV serialisation lives here so the controller stays thin. Cell escaping +
// formula-injection defense come from the shared ../utils/csv.js helper.
export function inboxToCsv(rows, { programSlug } = {}) {
  const header = [
    'source',
    'when',
    'identifier',
    'name',
    'email',
    'status',
    'wallet',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push(
      csvRow([r.source, r.when, r.identifier, r.name, r.email, r.status, r.wallet]),
    );
  }
  // Stamp the slug in a trailing comment so the export is self-identifying
  // when re-opened later. Not parsed by Excel/Numbers as a row.
  if (programSlug) lines.push(`# program=${programSlug}, exported=${new Date().toISOString()}`);
  return lines.join('\n') + '\n';
}
