import signupRepository from '../repositories/program-signup.repository.js';
import { parseLumaCsv } from '../utils/luma-csv.parser.js';

class ProgramSignupService {
  async listByProgramId(programId) {
    return await signupRepository.listByProgramId(programId);
  }

  async countByProgramId(programId) {
    return await signupRepository.countByProgramId(programId);
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
