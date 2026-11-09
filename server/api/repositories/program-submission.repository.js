import { supabase } from '../../db.js';
import { generateId } from '../utils/id.js';
import submissionEditorRepository from './submission-editor.repository.js';

// Luma email is the natural key within a program; store it lowercased so the
// per-program UNIQUE constraint is case-insensitive.
const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

// Who saved last and when (point person or a teammate). Server-set only.
const editStamp = (editor, at = new Date().toISOString()) =>
  editor?.email
    ? { last_edited_at: at, last_edited_by_email: normalizeEmail(editor.email), last_edited_by_name: editor.name || null }
    : {};

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
    // "Anything you especially liked about the event?" (optional, organisers only).
    eventLiked: row.event_liked ?? null,
    // Tracked programs only: the validated submission fields and the track,
    // plus the server-set tx check and milestone (their own columns) folded
    // into details, as the client reads them.
    details: row.details ? { ...row.details, txCheck: row.tx_check ?? null, milestone: row.milestone ?? null } : null,
    track: row.track ?? null,
    // Tracked programs: the prize won in each judged track, and the Ecosystem Prize flag.
    prizes: row.prizes ?? {},
    ecosystemPrize: row.ecosystem_prize === true,
    acceptedFromRefusalId: row.accepted_from_refusal_id ?? null,
    // Tracked drafts: 'draft' is visible only to the team; 'submitted' is judged.
    status: row.status ?? 'submitted',
    // A test entry (e.g. an organiser trying the form): excluded from judging,
    // the leaderboard, the public list and the stats.
    isTestEntry: row.is_test_entry === true,
    // AI feedback (draft + published); only `published` is ever public.
    aiFeedback: row.ai_feedback ?? null,
    finalizedAt: row.finalized_at ?? null,
    feedbackSubmittedAt: row.feedback_submitted_at ?? null,
    lastEditedAt: row.last_edited_at ?? null,
    lastEditedByEmail: row.last_edited_by_email ?? null,
    lastEditedByName: row.last_edited_by_name ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

class ProgramSubmissionRepository {
  // `status`: 'submitted' for judge queues and the public list (drafts are the
  // team's own until finalized); omit for every row (admin list, CSV).
  async listByProgramId(programId, { status } = {}) {
    let q = supabase.from('program_submissions').select('*').eq('program_id', programId);
    if (status) q = q.eq('status', status);
    const { data, error } = await q.order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(transform);
  }

  // How many entries are still drafts (organisers' view).
  async countDrafts(programId) {
    const { count, error } = await supabase
      .from('program_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('program_id', programId)
      .eq('status', 'draft');
    if (error) throw error;
    return count ?? 0;
  }

  // The entry a verified email may edit: as the point person (luma_email), or
  // as a teammate the point person gave edit access. { submission, role } or null.
  async findForEditor(programId, email) {
    const own = await this.findByEmail(programId, email);
    if (own) return { submission: own, role: 'owner' };
    const grant = await submissionEditorRepository.findByProgramEmail(programId, email);
    if (!grant) return null;
    const submission = await this.findById(grant.submissionId);
    return submission ? { submission, role: 'editor' } : null;
  }

  // The feedback step (event ratings) was submitted. `feedbackSubmittedAt` is
  // passed only the first time, so the original stamp is kept.
  async markFeedbackSubmitted(id, { feedbackSubmittedAt, eventLiked, editor } = {}) {
    const at = new Date().toISOString();
    const patch = { updated_at: at, ...editStamp(editor, at) };
    if (feedbackSubmittedAt) patch.feedback_submitted_at = feedbackSubmittedAt;
    if (eventLiked !== undefined) patch.event_liked = eventLiked ?? null;
    const { data, error } = await supabase
      .from('program_submissions')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
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
  // `createdAt` / `acceptedFromRefusalId`: set when a master admin accepts a
  // refused attempt, so the entry keeps the attempt's time (and judging batch).
  // `status` / `finalizedAt` / `feedbackSubmittedAt` / `editor` ({ email, name }):
  // tracked drafts. Defaults keep legacy submits as before (submitted at once).
  async create({ programId, submitterName, lumaEmail, projectTitle, projectBrief, videoUrl, githubUrl, late = false, feedback = null, eventLiked = null, agreedToTerms = false, details = null, createdAt = null, acceptedFromRefusalId = null, status = 'submitted', finalizedAt, feedbackSubmittedAt = null, editor = null }) {
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
        event_liked: eventLiked ?? null,
        agreed_to_terms_at: agreedToTerms ? new Date().toISOString() : null,
        details: details ?? null,
        track: details?.track ?? null,
        ...(createdAt ? { created_at: createdAt } : {}),
        ...(acceptedFromRefusalId ? { accepted_from_refusal_id: acceptedFromRefusalId } : {}),
        status,
        finalized_at: status === 'submitted' ? finalizedAt ?? createdAt ?? new Date().toISOString() : null,
        feedback_submitted_at: feedbackSubmittedAt,
        ...editStamp(editor ?? { email: normalized, name: submitterName }),
      })
      .select('*')
      .single();
    if (error) throw error;
    return { submission: transform(data), duplicate: false };
  }

  // Resubmission: overwrite the editable fields of an existing submission (one
  // per Luma email). Leaves prize / paid / promoted as-is.
  // `status` / `finalizedAt` / `feedbackSubmittedAt`: set only when given (a
  // first finalize). `editor` ({ email, name }) stamps who saved.
  async updateSubmission(id, { submitterName, projectTitle, projectBrief, videoUrl, githubUrl, late, feedback, eventLiked, agreedToTerms, details, status, finalizedAt, feedbackSubmittedAt, editor }) {
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
    if (eventLiked !== undefined) patch.event_liked = eventLiked ?? null;
    if (agreedToTerms === true) patch.agreed_to_terms_at = new Date().toISOString();
    // Tracked programs: a resubmit replaces the details (and track). created_at
    // is untouched, so the judging batch stays the first submission's.
    if (details !== undefined) {
      patch.details = details ?? null;
      patch.track = details?.track ?? null;
    }
    if (status !== undefined) patch.status = status;
    if (finalizedAt !== undefined) patch.finalized_at = finalizedAt;
    if (feedbackSubmittedAt !== undefined) patch.feedback_submitted_at = feedbackSubmittedAt;
    if (editor) Object.assign(patch, editStamp(editor, patch.updated_at));

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

  // Tracked programs: write the server-set award and check columns. Only these
  // keys are accepted; anything else is ignored.
  async updateTracked(id, { prizes, ecosystemPrize, txCheck, milestone, aiFeedback }) {
    const patch = { updated_at: new Date().toISOString() };
    if (aiFeedback !== undefined) patch.ai_feedback = aiFeedback;
    if (prizes !== undefined) patch.prizes = prizes;
    if (ecosystemPrize !== undefined) patch.ecosystem_prize = !!ecosystemPrize;
    if (txCheck !== undefined) patch.tx_check = txCheck;
    if (milestone !== undefined) patch.milestone = milestone;
    const { data, error } = await supabase
      .from('program_submissions')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return transform(data);
  }

  // Platform admin: set a tracked entry's track. Writes the track column and
  // details.track together, as updateSubmission does. Nothing else changes.
  async setTrack(id, track) {
    const { data: row, error: readError } = await supabase.from('program_submissions').select('details').eq('id', id).single();
    if (readError) throw readError;
    const { data, error } = await supabase
      .from('program_submissions')
      .update({ track, details: { ...(row.details || {}), track }, updated_at: new Date().toISOString() })
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

  async countByProgramId(programId, { status } = {}) {
    let q = supabase.from('program_submissions').select('*', { count: 'exact', head: true }).eq('program_id', programId);
    if (status) q = q.eq('status', status);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  }

  // Hard-delete a submission. submission_scores rows cascade (ON DELETE CASCADE).
  async delete(id) {
    const { error } = await supabase.from('program_submissions').delete().eq('id', id);
    if (error) throw error;
  }

  // What builders said they liked about the event, newest first (organisers only).
  async listEventLiked(programId) {
    const { data, error } = await supabase
      .from('program_submissions')
      .select('project_title, event_liked, created_at')
      .eq('program_id', programId)
      .not('event_liked', 'is', null)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || [])
      .filter((r) => (r.event_liked || '').trim())
      .map((r) => ({ projectTitle: r.project_title, text: r.event_liked, submittedAt: r.created_at }));
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
