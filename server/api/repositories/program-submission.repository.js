import { supabase } from '../../db.js';
import { generateId } from '../utils/id.js';

// Luma email is the natural key within a program; store it lowercased so the
// per-program UNIQUE constraint is case-insensitive.
const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const transform = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    programId: row.program_id,
    submitterName: row.submitter_name,
    lumaEmail: row.luma_email,
    projectTitle: row.project_title,
    projectBrief: row.project_brief ?? null,
    late: row.late ?? false,
    prizeAmount: row.prize_amount ?? null,
    prizeCurrency: row.prize_currency ?? null,
    prizeLabel: row.prize_label ?? null,
    awardedAt: row.awarded_at ?? null,
    awardedBy: row.awarded_by ?? null,
    videoUrl: row.video_url,
    githubUrl: row.github_url,
    promotedProjectId: row.promoted_project_id ?? null,
    paid: row.paid ?? false,
    paidAt: row.paid_at ?? null,
    paidBy: row.paid_by ?? null,
    prizeNotifiedAt: row.prize_notified_at ?? null,
    agreedToTermsAt: row.agreed_to_terms_at ?? null,
    feedback: row.feedback ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

class ProgramSubmissionRepository {
  async listByProgramId(programId) {
    const { data, error } = await supabase
      .from('program_submissions')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(transform);
  }

  async findById(id) {
    const { data, error } = await supabase
      .from('program_submissions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  async findByEmail(programId, email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const { data, error } = await supabase
      .from('program_submissions')
      .select('*')
      .eq('program_id', programId)
      .eq('luma_email', normalized)
      .maybeSingle();
    if (error) throw error;
    return transform(data);
  }

  // Returns { submission, duplicate }. Duplicate is decided up front (one
  // submission per Luma email per program) so the controller can answer 409
  // without leaning on the DB error text.
  async create({ programId, submitterName, lumaEmail, projectTitle, projectBrief, videoUrl, githubUrl, late = false, feedback = null, agreedToTerms = false }) {
    const normalized = normalizeEmail(lumaEmail);
    const existing = await this.findByEmail(programId, normalized);
    if (existing) return { submission: existing, duplicate: true };

    const { data, error } = await supabase
      .from('program_submissions')
      .insert({
        id: generateId(projectTitle),
        program_id: programId,
        submitter_name: submitterName,
        luma_email: normalized,
        project_title: projectTitle,
        project_brief: projectBrief,
        video_url: videoUrl,
        github_url: githubUrl,
        late,
        feedback: feedback ?? null,
        agreed_to_terms_at: agreedToTerms ? new Date().toISOString() : null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return { submission: transform(data), duplicate: false };
  }

  // Resubmission: overwrite the editable fields of an existing submission (one
  // per Luma email). Leaves prize / paid / promoted as-is.
  async updateSubmission(id, { submitterName, projectTitle, projectBrief, videoUrl, githubUrl, late, feedback, agreedToTerms }) {
    const patch = {
      submitter_name: submitterName,
      project_title: projectTitle,
      project_brief: projectBrief,
      video_url: videoUrl,
      github_url: githubUrl,
      late: !!late,
      updated_at: new Date().toISOString(),
    };
    // Resubmits overwrite the feedback; only re-stamp the terms agreement when
    // the submitter re-affirmed it (never clear a prior agreement).
    if (feedback !== undefined) patch.feedback = feedback ?? null;
    if (agreedToTerms === true) patch.agreed_to_terms_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('program_submissions')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  async setPromotedProject(id, projectId) {
    const { data, error } = await supabase
      .from('program_submissions')
      .update({ promoted_project_id: projectId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  async setPaid(id, paid, actor) {
    const isPaid = !!paid;
    const { data, error } = await supabase
      .from('program_submissions')
      .update({
        paid: isPaid,
        paid_at: isPaid ? new Date().toISOString() : null,
        paid_by: isPaid ? actor ?? null : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  // Assign a prize (winner) or clear it. `prize` is { amount, currency, label }
  // or null to remove the award. awarded_at/by record when and who, mirroring setPaid.
  async setPrize(id, prize, actor) {
    const { data, error } = await supabase
      .from('program_submissions')
      .update({
        prize_amount: prize ? prize.amount : null,
        prize_currency: prize ? prize.currency : null,
        prize_label: prize ? prize.label : null,
        awarded_at: prize ? new Date().toISOString() : null,
        awarded_by: prize ? actor ?? null : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  // Winners (have a prize) not yet emailed about it. Drives the publish-time
  // prize notification so each winner is mailed exactly once.
  async listWinnersToNotify(programId) {
    const { data, error } = await supabase
      .from('program_submissions')
      .select('*')
      .eq('program_id', programId)
      .not('prize_amount', 'is', null)
      .is('prize_notified_at', null);
    if (error) throw error;
    return (data || []).map(transform);
  }

  // Stamp that a winner has been emailed about their prize (idempotency marker).
  async setPrizeNotified(id) {
    const { data, error } = await supabase
      .from('program_submissions')
      .update({ prize_notified_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  async countByProgramId(programId) {
    const { count, error } = await supabase
      .from('program_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId);
    if (error) throw error;
    return count ?? 0;
  }

  // Hard-delete a submission. submission_scores rows cascade (ON DELETE CASCADE).
  async delete(id) {
    const { error } = await supabase.from('program_submissions').delete().eq('id', id);
    if (error) throw error;
  }

  // Aggregate categorical feedback fields across all submissions for a program.
  // Returns tallied counts + up to 20 free-text samples. No PII in the output.
  async aggregateFeedback(programId) {
    const { data, error } = await supabase
      .from('program_submissions')
      .select('feedback')
      .eq('program_id', programId)
      .not('feedback', 'is', null);
    if (error) throw error;
    const rows = (data || []).map((r) => r.feedback).filter(Boolean);

    const tally = (key) => {
      const counts = {};
      for (const fb of rows) {
        const val = fb[key];
        if (val === null || val === undefined) continue;
        if (Array.isArray(val)) {
          for (const v of val) { counts[v] = (counts[v] ?? 0) + 1; }
        } else {
          counts[String(val)] = (counts[String(val)] ?? 0) + 1;
        }
      }
      return counts;
    };

    const textSamples = (key, max = 20) =>
      rows
        .map((fb) => (typeof fb[key] === 'string' ? fb[key].trim() : null))
        .filter((v) => v && v.length > 0)
        .slice(0, max);

    return {
      deadlineStatus: tally('deadlineStatus'),
      agentEnv: tally('agentEnv'),
      wouldKeepBuilding: tally('wouldKeepBuilding'),
      surfaces: tally('surfaces'),
      surfacesPrimary: tally('surfacesPrimary'),
      biggestBlocker: tally('biggestBlocker'),
      couldntHandleSamples: textSamples('couldntHandle'),
      total: rows.length,
    };
  }
}

export default new ProgramSubmissionRepository();
