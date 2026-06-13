import { supabase } from '../../db.js';

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const transform = (row) => {
  if (!row) return null;
  return {
    programId: row.program_id,
    judgeEmail: row.judge_email,
    status: row.status,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

class ProgramJudgeBallotRepository {
  async find(programId, judgeEmail) {
    const normalized = normalizeEmail(judgeEmail);
    const { data, error } = await supabase
      .from('program_judge_ballots')
      .select('*')
      .eq('program_id', programId)
      .eq('judge_email', normalized)
      .maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  async listSubmitted(programId) {
    const { data, error } = await supabase
      .from('program_judge_ballots')
      .select('*')
      .eq('program_id', programId)
      .eq('status', 'submitted');
    if (error) throw error;
    return (data || []).map(transform);
  }

  async isSubmitted(programId, judgeEmail) {
    const ballot = await this.find(programId, judgeEmail);
    return ballot?.status === 'submitted';
  }

  async markSubmitted(programId, judgeEmail) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('program_judge_ballots')
      .upsert(
        {
          program_id: programId,
          judge_email: normalizeEmail(judgeEmail),
          status: 'submitted',
          submitted_at: now,
          updated_at: now,
        },
        { onConflict: 'program_id,judge_email' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }
}

export default new ProgramJudgeBallotRepository();
