import { supabase } from '../../db.js';

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const transform = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    submissionId: row.submission_id,
    programId: row.program_id,
    judgeEmail: row.judge_email,
    track: row.track,
    criteria: row.criteria || {},
    notes: row.notes ?? '',
    session: row.session ?? '',
    revisit: row.revisit === true,
    checks: row.checks || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

// Per-judge rubric scores for tracked programs (one row per submission,
// judge and track). See supabase/migrations/20261029000000_submission_rubric_scores.sql.
class SubmissionRubricScoreRepository {
  // One judge's scores across the program (restores their work on any device).
  async listByJudge(programId, judgeEmail) {
    const { data, error } = await supabase
      .from('submission_rubric_scores')
      .select('*')
      .eq('program_id', programId)
      .eq('judge_email', normalizeEmail(judgeEmail));
    if (error) throw error;
    return (data || []).map(transform);
  }

  // Upsert one judge's (possibly partial) score for one submission and track.
  // judge_email comes from the verified session, never the request body.
  async upsert({ submissionId, programId, judgeEmail, track, criteria, notes, session, revisit, checks }) {
    const { data, error } = await supabase
      .from('submission_rubric_scores')
      .upsert(
        {
          submission_id: submissionId,
          program_id: programId,
          judge_email: normalizeEmail(judgeEmail),
          track,
          criteria,
          notes: notes || null,
          session: session || null,
          revisit: revisit === true,
          checks: checks || {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'submission_id,judge_email,track' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }
}

export default new SubmissionRubricScoreRepository();
