import { supabase } from '../../db.js';

// Emails are stored normalized (trimmed + lowercased) so lookups against a
// Supabase-verified email are case-insensitive and the PK stays stable.
const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const VALID_ROLES = ['admin', 'judge'];
const normalizeRole = (role) => (VALID_ROLES.includes(role) ? role : 'admin');

const transform = (row) => {
  if (!row) return null;
  return {
    programId: row.program_id,
    email: row.email,
    role: row.role || 'admin',
    // Tracks this grant may score (tracked programs). null = every track.
    tracks: Array.isArray(row.tracks) ? row.tracks : null,
    // Display name (judges): shown to other judges instead of the email.
    name: row.name ?? null,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
  };
};

class ProgramAdminEmailRepository {
  async list(programId) {
    const { data, error } = await supabase
      .from('program_admin_emails')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(transform);
  }

  // `profile` (optional): { name, tracks } for a judge. Only the keys given are
  // written, so re-inviting without them keeps what's stored.
  async add(programId, email, invitedBy, role = 'admin', profile = {}) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const row = {
      program_id: programId,
      email: normalized,
      invited_by: invitedBy ?? null,
      role: normalizeRole(role),
    };
    if (profile.name !== undefined) row.name = profile.name || null;
    if (profile.tracks !== undefined) row.tracks = profile.tracks ?? null;
    const { data, error } = await supabase
      .from('program_admin_emails')
      .upsert(
        row,
        { onConflict: 'program_id,email' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  async remove(programId, email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return false;
    const { error } = await supabase
      .from('program_admin_emails')
      .delete()
      .eq('program_id', programId)
      .eq('email', normalized);
    if (error) throw error;
    return true;
  }

  async isAdminByEmail(programId, email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return false;
    const { data, error } = await supabase
      .from('program_admin_emails')
      .select('email')
      .eq('program_id', programId)
      .eq('email', normalized)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  // Returns the grant ({ email, role, ... }) for this email on this program, or
  // null. Used by requireProgramJudge: both 'admin' and 'judge' grants pass,
  // and the role is surfaced so the controller can use the email as identity.
  async findGrant(programId, email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const { data, error } = await supabase
      .from('program_admin_emails')
      .select('*')
      .eq('program_id', programId)
      .eq('email', normalized)
      .maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  // The registered judges for a program (role='judge'). The leaderboard unlocks
  // only once every one of these has a 'submitted' ballot.
  async listJudges(programId) {
    const { data, error } = await supabase
      .from('program_admin_emails')
      .select('*')
      .eq('program_id', programId)
      .eq('role', 'judge')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(transform);
  }
}

export default new ProgramAdminEmailRepository();
