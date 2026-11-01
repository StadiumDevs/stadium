import { supabase } from '../../db.js';

const transform = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    submissionId: row.submission_id,
    programId: row.program_id,
    category: row.category,
    score: Number(row.score),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Builders' event ratings (submission_experience_ratings), one row per category.
class SubmissionExperienceRatingRepository {
  // Write a submission's ratings ({ overall: 4, ... }). A resubmit overwrites
  // the same (submission, category) rows.
  async upsertForSubmission({ submissionId, programId, ratings }) {
    const entries = Object.entries(ratings || {});
    if (entries.length === 0) return [];
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('submission_experience_ratings')
      .upsert(
        entries.map(([category, score]) => ({
          submission_id: submissionId,
          program_id: programId,
          category,
          score,
          updated_at: now,
        })),
        { onConflict: 'submission_id,category' },
      )
      .select('*');
    if (error) throw error;
    return (data || []).map(transform);
  }

  async listByProgramId(programId) {
    const { data, error } = await supabase
      .from('submission_experience_ratings')
      .select('*')
      .eq('program_id', programId);
    if (error) throw error;
    return (data || []).map(transform);
  }

  // { [category]: { avg, count } }, avg rounded to one decimal.
  async aggregateByProgram(programId) {
    const rows = await this.listByProgramId(programId);
    const acc = {};
    for (const r of rows) {
      const a = (acc[r.category] ||= { sum: 0, count: 0 });
      a.sum += r.score;
      a.count += 1;
    }
    return Object.fromEntries(
      Object.entries(acc).map(([k, { sum, count }]) => [k, { avg: Math.round((sum / count) * 10) / 10, count }]),
    );
  }
}

export default new SubmissionExperienceRatingRepository();
