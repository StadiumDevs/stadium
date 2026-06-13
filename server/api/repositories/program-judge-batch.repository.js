import { supabase } from '../../db.js';

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

// Records which fixed batches (of BATCH_SIZE submissions) a judge has claimed.
// Batch membership itself is derived from submission order in the service; only
// the claim is persisted here.
class ProgramJudgeBatchRepository {
  // Idempotent on the PK (program_id, judge_email, batch_number).
  async claim(programId, judgeEmail, batchNumber) {
    const { error } = await supabase
      .from('program_judge_batch_claims')
      .upsert(
        { program_id: programId, judge_email: normalizeEmail(judgeEmail), batch_number: batchNumber },
        { onConflict: 'program_id,judge_email,batch_number' },
      );
    if (error) throw error;
  }

  // Batch numbers this judge has claimed, ascending.
  async listByJudge(programId, judgeEmail) {
    const { data, error } = await supabase
      .from('program_judge_batch_claims')
      .select('batch_number')
      .eq('program_id', programId)
      .eq('judge_email', normalizeEmail(judgeEmail))
      .order('batch_number', { ascending: true });
    if (error) throw error;
    return (data || []).map((r) => r.batch_number);
  }

  // All claims for a program: [{ judgeEmail, batchNumber }] — for coverage counts.
  async listByProgram(programId) {
    const { data, error } = await supabase
      .from('program_judge_batch_claims')
      .select('judge_email, batch_number')
      .eq('program_id', programId);
    if (error) throw error;
    return (data || []).map((r) => ({ judgeEmail: r.judge_email, batchNumber: r.batch_number }));
  }
}

export default new ProgramJudgeBatchRepository();
