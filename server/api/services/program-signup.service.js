import signupRepository from '../repositories/program-signup.repository.js';
import { parseLumaCsv } from '../utils/luma-csv.parser.js';

// Heuristic: the signup CSV's "which project…" column lands in raw_row under
// its original header. We don't know the exact wording per export, so match any
// header mentioning "project". First match wins.
const PROJECT_KEY_RE = /project/i;

function findProjectKey(signups) {
  for (const s of signups) {
    const raw = s.rawRow;
    if (!raw || typeof raw !== 'object') continue;
    for (const key of Object.keys(raw)) {
      if (PROJECT_KEY_RE.test(key)) return key;
    }
  }
  return null;
}

class ProgramSignupService {
  async listByProgramId(programId) {
    return await signupRepository.listByProgramId(programId);
  }

  async countByProgramId(programId) {
    return await signupRepository.countByProgramId(programId);
  }

  /**
   * Aggregate the distinct projects attendees picked, from the signup raw_row
   * column whose header mentions "project". Returns [{ project, count }] sorted
   * by count desc (ties broken alphabetically). PII-free by construction — only
   * project labels + counts are returned, never attendee rows.
   */
  async projectSummaryByProgramId(programId) {
    const signups = await signupRepository.listByProgramId(programId);
    if (!signups.length) return [];

    const projectKey = findProjectKey(signups);
    if (!projectKey) return [];

    const counts = new Map();
    for (const s of signups) {
      const raw = s.rawRow;
      if (!raw || typeof raw !== 'object') continue;
      const value = raw[projectKey];
      if (typeof value !== 'string') continue;
      const name = value.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([project, count]) => ({ project, count }))
      .sort((a, b) => b.count - a.count || a.project.localeCompare(b.project));
  }

  /**
   * Plan an import — parse the CSV, classify each row as new vs duplicate of
   * an existing signup (by email), return a summary without writing anything.
   */
  async planImport(programId, csvText) {
    const { rows, skipped, totalParsed } = await parseLumaCsv(csvText);
    const existingEmails = await signupRepository.listEmailsByProgramId(programId);

    const newRows = [];
    const duplicateRows = [];
    for (const r of rows) {
      if (existingEmails.has(r.email)) {
        duplicateRows.push(r);
      } else {
        newRows.push({ ...r, programId, source: 'luma' });
      }
    }
    return {
      totalParsed,
      skippedNoEmail: skipped,
      duplicates: duplicateRows.length,
      newCount: newRows.length,
      newRows,
      duplicatePreview: duplicateRows.slice(0, 5).map(({ email, name }) => ({ email, name })),
      newPreview: newRows.slice(0, 5).map(({ email, name, wallet }) => ({ email, name, wallet })),
    };
  }

  /**
   * Commit an import — parse, plan, and insert non-duplicates. Returns the
   * same shape as planImport plus the inserted rows.
   */
  async commitImport(programId, csvText) {
    const plan = await this.planImport(programId, csvText);
    if (plan.newCount === 0) {
      return { ...plan, inserted: [] };
    }
    const inserted = await signupRepository.insertMany(plan.newRows);
    return { ...plan, inserted };
  }

  async delete(id) {
    return await signupRepository.delete(id);
  }
}

export default new ProgramSignupService();
