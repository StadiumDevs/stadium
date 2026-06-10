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
    requirements: row.requirements_score,
    techStack: row.tech_stack_score,
    innovation: row.innovation_score,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

class SubmissionScoreRepository {
  // All scores for a program (used by the leaderboard tally).
  async listByProgramId(programId) {
    const { data, error } = await supabase
      .from('submission_scores')
      .select('*')
      .eq('program_id', programId);
    if (error) throw error;
    return (data || []).map(transform);
  }

  // One judge's scores across the program (used to render their draft and to
  // check they have scored every submission before they can submit).
  async listByJudge(programId, judgeEmail) {
    const normalized = normalizeEmail(judgeEmail);
    const { data, error } = await supabase
      .from('submission_scores')
      .select('*')
      .eq('program_id', programId)
      .eq('judge_email', normalized);
    if (error) throw error;
    return (data || []).map(transform);
  }

  // Upsert a single judge's score for a single submission. judge_email comes
  // from the verified session, never the request body.
  async upsert({ submissionId, programId, judgeEmail, requirements, techStack, innovation, notes }) {
    const { data, error } = await supabase
      .from('submission_scores')
      .upsert(
        {
          submission_id: submissionId,
          program_id: programId,
          judge_email: normalizeEmail(judgeEmail),
          requirements_score: requirements,
          tech_stack_score: techStack,
          innovation_score: innovation,
          notes: notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'submission_id,judge_email' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }
}

export default new SubmissionScoreRepository();
