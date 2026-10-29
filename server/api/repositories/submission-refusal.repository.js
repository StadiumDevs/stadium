import { supabase } from '../../db.js';

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

// Strings in a stored attempt are capped so a refusal can't be used to park
// arbitrary amounts of text; nested objects/arrays are capped by depth too.
const STR_MAX = 5000;
const capValue = (v, depth = 0) => {
  if (typeof v === 'string') return v.slice(0, STR_MAX);
  if (typeof v === 'number' || typeof v === 'boolean' || v === null) return v;
  if (depth > 3) return null;
  if (Array.isArray(v)) return v.slice(0, 50).map((x) => capValue(x, depth + 1));
  if (typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).slice(0, 50).map(([k, x]) => [k.slice(0, 64), capValue(x, depth + 1)]));
  }
  return null;
};

// The fields of a submission attempt worth keeping (never the honeypot).
const PAYLOAD_KEYS = [
  'submitterName', 'lumaEmail', 'projectTitle', 'projectBrief', 'videoUrl', 'githubUrl',
  'feedback', 'agreedToTerms', 'details',
];
export const toStoredPayload = (body = {}) =>
  Object.fromEntries(PAYLOAD_KEYS.filter((k) => body[k] !== undefined).map((k) => [k, capValue(body[k])]));

const transform = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    programId: row.program_id,
    lumaEmail: row.luma_email,
    submitterName: row.submitter_name ?? null,
    projectTitle: row.project_title ?? null,
    payload: row.payload || {},
    reasonCode: row.reason_code,
    reason: row.reason,
    status: row.status || 'refused',
    reviewedBy: row.reviewed_by ?? null,
    reviewedAt: row.reviewed_at ?? null,
    acceptedSubmissionId: row.accepted_submission_id ?? null,
    createdAt: row.created_at,
  };
};

// Refused project submissions, kept with the reason (submission_refusals).
class SubmissionRefusalRepository {
  async create({ programId, body, reasonCode, reason }) {
    const { data, error } = await supabase
      .from('submission_refusals')
      .insert({
        program_id: programId,
        luma_email: normalizeEmail(body?.lumaEmail),
        submitter_name: typeof body?.submitterName === 'string' ? body.submitterName.trim().slice(0, 200) : null,
        project_title: typeof body?.projectTitle === 'string' ? body.projectTitle.trim().slice(0, 200) : null,
        payload: toStoredPayload(body),
        reason_code: reasonCode,
        reason,
        status: 'refused',
      })
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  async listByProgram(programId) {
    const { data, error } = await supabase
      .from('submission_refusals')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data || []).map(transform);
  }

  async findById(id) {
    const { data, error } = await supabase.from('submission_refusals').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  async setReviewed(id, { status, reviewedBy, acceptedSubmissionId = null }) {
    const { data, error } = await supabase
      .from('submission_refusals')
      .update({
        status,
        reviewed_by: reviewedBy ?? null,
        reviewed_at: new Date().toISOString(),
        accepted_submission_id: acceptedSubmissionId,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }
}

export default new SubmissionRefusalRepository();
