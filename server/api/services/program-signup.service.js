import signupRepository from '../repositories/program-signup.repository.js';
import { parseLumaCsv } from '../utils/luma-csv.parser.js';

// Builder-submission signups carry rich per-project fields in raw_row under
// their original headers. We detect each field by header keyword, skipping any
// header that looks like PII so contact details never reach the public view.
const PII_RE = /email|telegram|phone|contact|discord|whatsapp|wallet|address/i;
const TITLE_RE = /project\s*(name|title)|name of (the )?project/i;
const BUILD_RE = /what did you build|describe|description|elevator|pitch/i;
const REPO_RE = /github|gitlab|\brepo\b|demo/i;
const DOCS_RE = /readme|\bdoc(s|ument)?\b|deck|slide|notion|figma|loom/i;
const TAGS_RE = /tool|stack|built with|\btags?\b|tech/i;

function pickValue(raw, re) {
  for (const key of Object.keys(raw)) {
    if (re.test(key) && !PII_RE.test(key)) {
      const v = raw[key];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  }
  return null;
}

const isUrl = (s) => typeof s === 'string' && /^https?:\/\/\S+/i.test(s.trim());

function toTags(value) {
  if (!value) return [];
  return value
    .split(/[,;|]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
}

class ProgramSignupService {
  async listByProgramId(programId) {
    return await signupRepository.listByProgramId(programId);
  }

  async countByProgramId(programId) {
    return await signupRepository.countByProgramId(programId);
  }

  /**
   * Public, PII-free project cards derived from builder-submission signups.
   * One signup row = one project. Fields are detected from raw_row by header
   * keyword; contact/PII columns are never read. Returns
   * [{ name, description, repoUrl, docsUrl, tags }]. Cards with neither a
   * description nor any link are dropped (likely non-builder rows).
   */
  async projectCardsByProgramId(programId) {
    const signups = await signupRepository.listByProgramId(programId);
    const cards = [];
    for (const s of signups) {
      const raw = s.rawRow && typeof s.rawRow === 'object' ? s.rawRow : {};
      const repoRaw = pickValue(raw, REPO_RE);
      const docsRaw = pickValue(raw, DOCS_RE);
      const card = {
        name: pickValue(raw, TITLE_RE) || (s.name ? s.name.trim() : null) || 'Untitled project',
        description: pickValue(raw, BUILD_RE),
        repoUrl: isUrl(repoRaw) ? repoRaw : null,
        docsUrl: isUrl(docsRaw) ? docsRaw : null,
        tags: toTags(pickValue(raw, TAGS_RE)),
      };
      // Drop rows that carry no project signal at all.
      if (!card.description && !card.repoUrl && !card.docsUrl && card.tags.length === 0) {
        continue;
      }
      cards.push(card);
    }
    return cards;
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
