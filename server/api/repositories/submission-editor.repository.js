import { supabase } from '../../db.js';

// Teammates a point person gave edit access to their tracked submission
// (submission_editors). Emails are stored lowercased; one team per person per
// program (UNIQUE program_id, email).
const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const transform = (row) => {
  if (!row) return null;
  return {
    submissionId: row.submission_id,
    programId: row.program_id,
    email: row.email,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
};

class SubmissionEditorRepository {
  async listBySubmission(submissionId) {
    const { data, error } = await supabase
      .from('submission_editors')
      .select('*')
      .eq('submission_id', submissionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(transform);
  }

  async findByProgramEmail(programId, email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const { data, error } = await supabase
      .from('submission_editors')
      .select('*')
      .eq('program_id', programId)
      .eq('email', normalized)
      .maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  async add({ submissionId, programId, email, addedBy }) {
    const { data, error } = await supabase
      .from('submission_editors')
      .upsert(
        { submission_id: submissionId, program_id: programId, email: normalizeEmail(email), added_by: normalizeEmail(addedBy) },
        { onConflict: 'submission_id,email' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  async remove(submissionId, email) {
    const { error } = await supabase
      .from('submission_editors')
      .delete()
      .eq('submission_id', submissionId)
      .eq('email', normalizeEmail(email));
    if (error) throw error;
  }
}

export default new SubmissionEditorRepository();
