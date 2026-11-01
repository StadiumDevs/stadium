import programService from '../services/program.service.js';
import { extractSupabaseToken, getSupabaseUser } from '../auth/supabaseUser.js';
import scoringService from '../services/scoring.service.js';
import programRepository from '../repositories/program.repository.js';
import programSubmissionRepository from '../repositories/program-submission.repository.js';
import programSignupRepository from '../repositories/program-signup.repository.js';
import submissionScoreRepository from '../repositories/submission-score.repository.js';
import submissionRubricScoreRepository from '../repositories/submission-rubric-score.repository.js';
import programAdminEmailRepository from '../repositories/program-admin-email.repository.js';
import submissionRefusalRepository from '../repositories/submission-refusal.repository.js';
import experienceRatingRepository from '../repositories/submission-experience-rating.repository.js';
import submissionEditorRepository from '../repositories/submission-editor.repository.js';
import programJudgeBallotRepository from '../repositories/program-judge-ballot.repository.js';
import { trackedProgramFor, batchFor } from '../constants/trackedPrograms.js';
import { toPublicList } from '../utils/public-submission.js';
import {
  validateSubmission,
  validateSubmissionDetails,
  validateExperienceRatings,
  EVENT_LIKED_MAX,
  videoOptionalFor,
  validateScore,
  validateRubricScore,
  validatePrize,
  prizeTiersFor,
} from '../utils/submission.validator.js';
import { submissionsToCsv } from '../utils/submissions-csv.js';
import submissionConfirmationService from '../services/submission-confirmation.service.js';
import prizeAwardService from '../services/prize-award.service.js';
import lumaSyncService from '../services/luma-sync.service.js';
import auditLog from '../services/program-audit-log.service.js';
import { checkAndStore as checkTxAndStore } from '../services/tx-check.service.js';
import { judgedTracksOf } from '../services/rubric-leaderboard.service.js';

// On a Luma-gated cache-miss we lazily re-sync, but only if the last sync is
// older than this floor. Bounds Luma calls when not-on-list emails retry, while
// keeping the worst-case "checked in seconds ago" wait small.
const JIT_SYNC_FLOOR_MS = 25 * 1000;

// Winner selection + publishing are platform-admin only. After requireProgramAdmin,
// a global admin carries isGlobalAdmin === true; per-program admins do not.
const isPlatformAdmin = (req) => req.user?.isGlobalAdmin === true;

// Store the builder's event ratings. Best-effort: the submission is already
// saved, so a failed rating write is logged, never surfaced as a failed submit.
async function saveRatings(submission, programId, ratings) {
  if (!ratings) return;
  try {
    await experienceRatingRepository.upsertForSubmission({ submissionId: submission.id, programId, ratings });
  } catch (err) {
    console.error('❌ Could not save event ratings:', err);
  }
}

// Tracked programs: check the testnet txid after the response (never blocks
// the submission). Re-checked only when the txid changed or was never checked.
async function scheduleTxCheck(submission, previous = null) {
  const txid = submission?.details?.testnetTxid ?? null;
  const unchanged = previous?.details?.testnetTxid === txid && previous?.details?.txCheck;
  if (unchanged) return;
  // A changed (or removed) txid must not keep showing the old result.
  if (previous?.details?.txCheck) {
    await programSubmissionRepository.updateTracked(submission.id, { txCheck: null });
  }
  if (!txid || process.env.TX_CHECK_DISABLED === 'true') return;
  checkTxAndStore(submission.id, txid);
}

// A resubmit can change the track: drop prizes (and the Ecosystem flag) for
// tracks the entry no longer takes part in.
async function dropPrizesOutsideTrack(submission, tracked) {
  const entered = submission.details?.track === 'both' ? ['privacy', 'agentic'] : [submission.details?.track];
  const prizes = submission.prizes || {};
  const kept = Object.fromEntries(Object.entries(prizes).filter(([t]) => entered.includes(t)));
  if (Object.keys(kept).length === Object.keys(prizes).length) return;
  const keepsFlag = submission.ecosystemPrize && !!kept[tracked.ecosystem.track];
  await programSubmissionRepository.updateTracked(submission.id, { prizes: kept, ecosystemPrize: keepsFlag });
}

// Shared by publish/unpublish. Standalone (not a method) so Express can bind the
// route handlers without `this`.
async function setResultsPublished(req, res, publish) {
  try {
    if (!isPlatformAdmin(req)) {
      return res.status(403).json({ status: 'error', message: 'Only platform admins can publish results' });
    }
    const { slug } = req.params;
    const program = await programService.findBySlug(slug);
    if (!program) {
      return res.status(404).json({ status: 'error', message: 'Program not found' });
    }
    const updated = await programRepository.setResultsPublished(
      slug,
      publish ? new Date().toISOString() : null,
    );
    res.status(200).json({ status: 'success', data: { resultsPublishedAt: updated.resultsPublishedAt } });
    auditLog.logSafe({
      programId: program.id,
      actor: { chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email },
      action: publish ? 'results.publish' : 'results.unpublish',
      targetType: 'program',
      targetId: program.id,
      metadata: null,
    });
    // On publish, email each (not-yet-notified) winner about their prize.
    // Fire-and-forget + best-effort: the response is already sent, and
    // prize_notified_at makes a later unpublish/republish a no-op.
    if (publish) {
      prizeAwardService
        .notifyWinners({ program })
        .then((r) => {
          if (r?.reason) console.warn(`Prize emails not sent (${r.reason}) for ${program.slug}`);
          else console.log(`Prize emails for ${program.slug}: sent ${r.sent}, failed ${r.failed}`);
        })
        .catch((e) => console.error('❌ Prize-award notification failed:', e?.message || e));
    }
  } catch (error) {
    console.error('❌ Error updating results publish state:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update results' });
  }
}

const RUBRIC_JUDGES_ONLY = "Admins don't score; judges score from their email sign-in link.";

// The judge identity is whatever the auth gate verified: an email for social
// judges, a wallet address for the admin fallback. Never read from the body.
const judgeIdentity = (req) => req.user?.email || req.user?.address || null;

// programId is on req.user for email judges and program-scoped wallet admins,
// but NOT for global wallet admins (who carry only programSlug). Resolve from
// the slug in that case. Returns null if the program is gone.
const resolveProgramId = async (req) => {
  if (req.user?.programId) return req.user.programId;
  const program = await programService.findBySlug(req.params.slug);
  return program?.id ?? null;
};

// A refused submission is kept with the reason the builder was shown (so a
// master admin can review and accept it), then answered exactly as before.
// Recording is best-effort: it never changes the response. Attempts with no
// usable email or title aren't recorded (nothing to attribute or accept).
const ATTEMPT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Best-effort "waiting for approval" email to a verified builder.
function sendPendingEmail(program, value) {
  submissionConfirmationService
    .send({
      email: value.lumaEmail,
      submitterName: value.submitterName,
      programName: program.name,
      slug: program.slug,
      projectTitle: value.projectTitle,
      pendingReview: true,
    })
    .catch((err) => console.error('❌ Pending-review email failed:', err));
}

async function refuse(res, program, body, reasonCode, status, message, { emailVerified = false, code = null, pending = false } = {}) {
  const email = typeof body?.lumaEmail === 'string' ? body.lumaEmail.trim() : '';
  const title = typeof body?.projectTitle === 'string' ? body.projectTitle.trim() : '';
  if (ATTEMPT_EMAIL_RE.test(email) && title) {
    try {
      const r = await submissionRefusalRepository.create({ programId: program.id, body, reasonCode, reason: message, emailVerified });
      auditLog.logSafe({
        programId: program.id,
        actor: {},
        action: pending ? 'submission.held_for_approval' : 'submission.refused',
        targetType: 'submission_refusal',
        targetId: r?.id ?? null,
        metadata: { reasonCode, emailVerified, email: email.toLowerCase(), title: title.slice(0, 200) },
      });
    } catch (err) {
      console.error('❌ Could not record a refused submission:', err);
    }
  }
  if (pending) return res.status(status).json({ status: 'pending', code, message });
  return res.status(status).json({ status: 'error', message, ...(code ? { code } : {}) });
}

// Comma-separated emails that skip the Luma gate (testing; off by default).
const testEmailsAllowed = () =>
  new Set(
    (process.env.SUBMIT_TEST_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );

// Is this email on the program's checked-in Luma list? On a miss, Luma-gated
// programs lazily re-sync (someone may have checked in seconds ago), respecting
// a floor so repeated not-on-list retries can't hammer Luma; `fresh` (a verified
// email) always gets a fresh check. A sync FAILURE is `transient`, so a legit
// attendee isn't told "not on the list". Shared by submit and teammate access.
async function checkInStatus(program, email, { fresh = false } = {}) {
  let present = await programSignupRepository.existsByEmail(program.id, email);
  let transient = false;
  if (!present && lumaSyncService.isActive(program)) {
    const lastSync = program.lastGuestSyncAt ? Date.parse(program.lastGuestSyncAt) : 0;
    const stale = fresh || !lastSync || Date.now() - lastSync > JIT_SYNC_FLOOR_MS;
    if (stale) {
      const sync = await lumaSyncService.syncProgram(program);
      transient = sync.status === 'truncated' || String(sync.status).startsWith('error');
      present = await programSignupRepository.existsByEmail(program.id, email);
    } else {
      // Synced very recently and still absent → the last sync's health is the
      // verdict's confidence.
      transient =
        program.lastGuestSyncStatus === 'truncated' || String(program.lastGuestSyncStatus || '').startsWith('error');
    }
  }
  return { present, transient };
}

// The name for the last-edit stamp: the point person's, or a teammate's from
// their row on the team list (falling back to their email).
function editorName(access, verifiedEmail, value) {
  if (access?.role !== 'editor') return value.submitterName;
  const team = value.details?.team ?? access.submission.details?.team ?? [];
  return team.find((m) => m.email && m.email.toLowerCase() === verifiedEmail)?.name || verifiedEmail;
}

// Drop edit access for teammates no longer on the team list.
async function pruneEditors(submission) {
  try {
    const onTeam = new Set((submission.details?.team ?? []).map((m) => (m.email || '').toLowerCase()).filter(Boolean));
    const editors = await submissionEditorRepository.listBySubmission(submission.id);
    for (const e of editors) if (!onTeam.has(e.email)) await submissionEditorRepository.remove(submission.id, e.email);
  } catch (err) {
    console.error('❌ Could not prune submission editors:', err);
  }
}

// The verified builder's access to their program's tracked entry. Answers the
// request itself (and returns null) when there's no session, program or entry.
async function builderAccess(req, res, { ownerOnly = false } = {}) {
  const token = extractSupabaseToken(req);
  const user = token ? await getSupabaseUser(token) : null;
  const email = user?.email ? user.email.trim().toLowerCase() : null;
  if (!email) {
    res.status(401).json({ status: 'error', code: 'verify_email', message: 'Verify your email first.' });
    return null;
  }
  const program = await programService.findBySlug(req.params.slug);
  if (!program) {
    res.status(404).json({ status: 'error', message: 'Program not found' });
    return null;
  }
  const tracked = trackedProgramFor(program.slug);
  if (!tracked) {
    res.status(404).json({ status: 'error', message: 'Not a tracked program' });
    return null;
  }
  const access = await programSubmissionRepository.findForEditor(program.id, email);
  if (!access) {
    res.status(404).json({ status: 'error', message: 'No submission for this email yet. Save a draft first.' });
    return null;
  }
  if (ownerOnly && access.role !== 'owner') {
    res.status(403).json({ status: 'error', code: 'owner_only', message: 'Only the point person can change who can edit.' });
    return null;
  }
  return { email, program, tracked, ...access };
}

class SubmissionController {
  // Public: anyone can submit a project to a program by filling the form.
  //
  // Tracked programs also take drafts (`intent: 'draft'`): a verified point
  // person (or a teammate they gave edit access) saves the entry as a draft that
  // only the team sees, then `intent: 'finalize'` (the default, so older clients
  // keep working) puts it in the judges' queues. A finalized entry stays
  // editable while the program is open, and every save is fully validated.
  // Finalizing needs the event feedback: submitted earlier through
  // PUT /submissions/mine/feedback, or as `ratings` in this request.
  async submit(req, res) {
    try {
      const { slug } = req.params;
      // Honeypot: bots fill hidden fields. Silently accept without persisting.
      if (typeof req.body?.company === 'string' && req.body.company.trim() !== '') {
        return res.status(200).json({ status: 'success' });
      }
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const tracked = trackedProgramFor(program.slug);
      const wantsDraft = !!tracked && req.body?.intent === 'draft';

      // Who is saving: the email proven with the sign-in link (Supabase magic link).
      const token = extractSupabaseToken(req);
      const user = token ? await getSupabaseUser(token) : null;
      const verifiedEmail = user?.email ? user.email.trim().toLowerCase() : null;
      if (wantsDraft && !verifiedEmail) {
        return res.status(401).json({ status: 'error', code: 'verify_email', message: 'Verify your email to save a draft.' });
      }

      // Tracked: the entry this verified email may edit (point person or teammate).
      // The owner's email and name come from the stored entry, never the form.
      const access = tracked && verifiedEmail ? await programSubmissionRepository.findForEditor(program.id, verifiedEmail) : null;
      let body = req.body ?? {};
      if (access) {
        const owner = access.submission;
        body = {
          ...body,
          lumaEmail: owner.lumaEmail,
          ...(access.role === 'editor' ? { submitterName: owner.submitterName } : {}),
        };
      }
      const submitterEmail = String(body.lumaEmail || '').trim().toLowerCase();
      const emailVerified = !!verifiedEmail && (verifiedEmail === submitterEmail || access?.role === 'editor');

      let existing = access?.submission ?? null;
      // Tracked programs: updating an existing entry needs the email verified, so
      // nobody can overwrite another team's submission by typing their email
      // (answered after validation, as before).
      let needsVerify = false;
      if (!existing) {
        existing = submitterEmail ? await programSubmissionRepository.findByEmail(program.id, submitterEmail) : null;
        needsVerify = !!existing && !!tracked && !emailVerified;
      }
      // A teammate's email that's already on another team can't start a new entry.
      if (tracked && !existing && verifiedEmail === submitterEmail) {
        const grant = await submissionEditorRepository.findByProgramEmail(program.id, submitterEmail);
        if (grant) {
          return res.status(409).json({ status: 'error', code: 'email_in_use', message: "You're already on a team for this program. Open your team's submission instead." });
        }
      }

      // A finalized entry never goes back to draft: its saves are full saves.
      const asDraft = wantsDraft && (!existing || existing.status === 'draft');
      const feedbackDone = !!tracked && !!existing?.feedbackSubmittedAt;
      const hasRatings = body.ratings !== undefined && body.ratings !== null;

      // Finalizing needs the event feedback (submitted before, or in this request).
      if (tracked && !asDraft && !feedbackDone && !hasRatings) {
        return res.status(400).json({ status: 'error', code: 'feedback_required', message: 'Submit the event feedback before you finalize.' });
      }
      const v = validateSubmission(body, {
        videoOptional: videoOptionalFor(tracked, body.details),
        ratingsOptional: asDraft || feedbackDone,
        draft: asDraft,
      });
      if (!v.ok) {
        if (asDraft) return res.status(400).json({ status: 'error', message: v.error });
        return refuse(res, program, body, 'invalid', 400, v.error);
      }
      if (tracked) {
        const dv = validateSubmissionDetails(tracked, body.details, { draft: asDraft });
        if (!dv.ok) {
          if (asDraft) return res.status(400).json({ status: 'error', message: dv.error });
          return refuse(res, program, body, 'invalid', 400, dv.error);
        }
        v.value.details = dv.value;
      }
      if (needsVerify) {
        return refuse(res, program, body, 'update_unverified', 401, 'Verify your email to update your submission.', {
          code: 'verify_to_update',
        });
      }

      // Only checked-in attendees may submit: the email must be on the program's
      // imported Luma (checked-in / approved guest) list. SUBMIT_TEST_EMAILS is a
      // comma-separated allowlist that bypasses this gate for testing (off by
      // default; set per-deployment). A tracked entry that already exists passed
      // this gate when it was created.
      const gated = !(tracked && existing);
      if (gated && !testEmailsAllowed().has(submitterEmail)) {
        const { present, transient } = await checkInStatus(program, submitterEmail, { fresh: emailVerified });
        if (!present) {
          if (transient) {
            return refuse(res, program, body, 'unverified', 503, "Couldn't verify your check-in right now. Please try again in a moment.");
          }
          if (emailVerified) {
            // Verified, but still not on Luma's checked-in list: held for a
            // master admin to approve (it keeps this time if accepted).
            const message =
              "Received. Your email isn't on Luma's checked-in list yet, so an organiser will confirm it. You don't need to submit again.";
            sendPendingEmail(program, v.value);
            return refuse(res, program, body, 'not_checked_in', 202, message, {
              emailVerified: true,
              code: 'pending_review',
              pending: true,
            });
          }
          return refuse(
            res,
            program,
            body,
            'not_checked_in',
            403,
            'Only checked-in attendees can submit. Use the email you checked in with on Luma.',
            { code: 'not_checked_in' },
          );
        }
      }
      // Deadline is informational: a submit after event end is flagged late, not
      // blocked. A draft is never late; it's decided when it's finalized.
      const late = !asDraft && !!(program.eventEndsAt && Date.now() > Date.parse(program.eventEndsAt));

      const now = new Date().toISOString();
      const editor = { email: verifiedEmail || submitterEmail, name: editorName(access, verifiedEmail, v.value) };
      const finalizing = !asDraft && (!existing || existing.status === 'draft');
      const draftFields = tracked
        ? {
            status: asDraft ? 'draft' : 'submitted',
            ...(finalizing ? { finalizedAt: now } : {}),
            ...(hasRatings && !feedbackDone ? { feedbackSubmittedAt: now } : {}),
            editor,
          }
        : { editor };

      let submission;
      let statusCode;
      if (existing) {
        submission = await programSubmissionRepository.updateSubmission(existing.id, { ...v.value, late, ...draftFields });
        statusCode = 200;
      } else {
        ({ submission } = await programSubmissionRepository.create({ programId: program.id, ...v.value, late, ...draftFields }));
        statusCode = 201;
      }
      // A finalized entry that is saved again is a resubmit (confirmation email says so).
      const resubmitted = !!existing && !finalizing;
      await saveRatings(submission, program.id, v.value.ratings);
      if (tracked) {
        if (!asDraft) await scheduleTxCheck(submission, existing);
        if (existing) await dropPrizesOutsideTrack(submission, tracked);
        // A teammate taken off the team list loses edit access (point person saves only).
        if (existing && access?.role === 'owner') await pruneEditors(submission);
      }

      // Confirmation email is best-effort — a Resend failure never fails the
      // submission. Drafts get none: only finalizing (or updating a finalized
      // entry) does.
      let emailSent = false;
      let emailReason = null;
      if (!asDraft) {
        try {
          const result = await submissionConfirmationService.send({
            email: submission.lumaEmail,
            submitterName: submission.submitterName,
            programName: program.name,
            slug: program.slug,
            projectTitle: submission.projectTitle,
            deadline: program.eventEndsAt ?? null,
            resubmitted,
            details: submission.details ?? null,
          });
          emailSent = result.ok;
          emailReason = result.ok ? null : result.reason;
        } catch (err) {
          emailReason = 'send_failed';
          console.error('❌ Submission confirmation email failed:', err);
        }
      }

      return res.status(statusCode).json({
        status: 'success',
        data: {
          id: submission.id,
          late,
          status: submission.status,
          finalizedAt: submission.finalizedAt,
          feedbackSubmittedAt: submission.feedbackSubmittedAt,
          lastEditedAt: submission.lastEditedAt,
          lastEditedByName: submission.lastEditedByName,
          lastEditedByEmail: submission.lastEditedByEmail,
        },
        resubmitted,
        emailSent,
        emailReason,
      });
    } catch (error) {
      console.error('❌ Error submitting project:', error);
      res.status(500).json({ status: 'error', message: 'Failed to submit project' });
    }
  }

  // Judge/admin: every submission, flagged with Luma eligibility + this judge's
  // own score and ballot lock state.
  async list(req, res) {
    try {
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const data = await scoringService.listForJudge(programId, judgeIdentity(req));
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      console.error('❌ Error listing submissions:', error);
      res.status(500).json({ status: 'error', message: 'Failed to list submissions' });
    }
  }

  // Judge/admin: download every submission + its feedback survey as a CSV.
  async exportCsv(req, res) {
    try {
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const { slug } = req.params;
      const submissions = await programSubmissionRepository.listByProgramId(programId);
      const csv = submissionsToCsv(submissions, { programSlug: slug });
      const filename = `${slug}-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      console.error('❌ Error exporting submissions CSV:', error);
      res.status(500).json({ status: 'error', message: 'Failed to export submissions' });
    }
  }

  // Admin: hard-delete a submission (e.g. a test entry). Scores cascade.
  // Route-gated by requireProgramAdmin. Intended for cleanup BEFORE judging —
  // deleting after scoring starts shifts batch membership (created_at order).
  async deleteSubmission(req, res) {
    try {
      const { slug, submissionId } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      // Program-scope check (IDOR): a submission from program B must not be
      // deletable via program A's slug.
      const existing = await programSubmissionRepository.findById(submissionId);
      if (!existing || existing.programId !== program.id) {
        return res.status(404).json({ status: 'error', message: 'Submission not found' });
      }
      await programSubmissionRepository.delete(submissionId);
      res.status(204).end();
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email },
        action: 'submission.delete',
        targetType: 'submission',
        targetId: submissionId,
        metadata: { lumaEmail: existing.lumaEmail, projectTitle: existing.projectTitle },
      });
    } catch (error) {
      console.error('❌ Error deleting submission:', error);
      res.status(500).json({ status: 'error', message: 'Failed to delete submission' });
    }
  }

  // Judge/admin: upsert this judge's score for one submission (draft save).
  async upsertScore(req, res) {
    try {
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const judgeEmail = judgeIdentity(req);
      const { submissionId } = req.params;

      // A judge can revise their own scores at any time, including after
      // submitting — the leaderboard (submitted ballots only) reflects the
      // latest values. Submitting is "count me in", not a freeze.
      const submission = await programSubmissionRepository.findById(submissionId);
      if (!submission || submission.programId !== programId) {
        return res.status(404).json({ status: 'error', message: 'Submission not found' });
      }

      const v = validateScore(req.body);
      if (!v.ok) {
        return res.status(400).json({ status: 'error', message: v.error });
      }

      const score = await submissionScoreRepository.upsert({
        submissionId,
        programId,
        judgeEmail,
        ...v.value,
      });
      res.status(200).json({ status: 'success', data: score });
    } catch (error) {
      console.error('❌ Error saving score:', error);
      res.status(500).json({ status: 'error', message: 'Failed to save score' });
    }
  }

  // Builder (email sign-in): their own submission, to edit it. The token's
  // email is the key: the point person's entry, or (tracked programs) the entry
  // a teammate was given edit access to. Includes the saved feedback, so the
  // form never asks for it again, and who can edit.
  async mySubmission(req, res) {
    try {
      const token = extractSupabaseToken(req);
      const user = token ? await getSupabaseUser(token) : null;
      if (!user?.email) {
        return res.status(401).json({ status: 'error', code: 'verify_email', message: 'Verify your email to load your submission.' });
      }
      const program = await programService.findBySlug(req.params.slug);
      if (!program) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const tracked = trackedProgramFor(program.slug);
      const access = tracked
        ? await programSubmissionRepository.findForEditor(program.id, user.email)
        : await programSubmissionRepository.findByEmail(program.id, user.email).then((x) => (x ? { submission: x, role: 'owner' } : null));
      if (!access) return res.status(404).json({ status: 'error', message: 'No submission for this email yet' });
      const s = access.submission;
      const [editors, ratings] = tracked
        ? await Promise.all([
            submissionEditorRepository.listBySubmission(s.id),
            experienceRatingRepository.getForSubmission(s.id).catch(() => ({})),
          ])
        : [[], {}];
      res.status(200).json({
        status: 'success',
        data: {
          submitterName: s.submitterName,
          lumaEmail: s.lumaEmail,
          projectTitle: s.projectTitle,
          projectBrief: s.projectBrief,
          videoUrl: s.videoUrl,
          githubUrl: s.githubUrl,
          details: s.details,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          status: s.status,
          finalizedAt: s.finalizedAt,
          feedbackSubmittedAt: s.feedbackSubmittedAt,
          lastEditedAt: s.lastEditedAt,
          lastEditedByName: s.lastEditedByName,
          lastEditedByEmail: s.lastEditedByEmail,
          eventLiked: s.eventLiked,
          ratings: Object.keys(ratings || {}).length ? ratings : null,
          role: access.role,
          editors: editors.map((e) => e.email),
        },
      });
    } catch (error) {
      console.error('❌ Error loading own submission:', error);
      res.status(500).json({ status: 'error', message: 'Failed to load your submission' });
    }
  }

  // Builder (point person or teammate, verified): submit the event feedback
  // (ratings + "anything you liked"). Required once before finalizing; after
  // that the answers can still be changed but are never asked for again.
  async submitFeedback(req, res) {
    try {
      const a = await builderAccess(req, res);
      if (!a) return;
      const rt = validateExperienceRatings(req.body?.ratings, { required: true });
      if (!rt.ok) return res.status(400).json({ status: 'error', message: rt.error });
      const liked = typeof req.body?.eventLiked === 'string' ? req.body.eventLiked.trim() : '';
      if (liked.length > EVENT_LIKED_MAX) {
        return res.status(400).json({ status: 'error', message: `What you liked about the event is max ${EVENT_LIKED_MAX} characters` });
      }
      await experienceRatingRepository.upsertForSubmission({ submissionId: a.submission.id, programId: a.program.id, ratings: rt.value });
      const updated = await programSubmissionRepository.markFeedbackSubmitted(a.submission.id, {
        feedbackSubmittedAt: a.submission.feedbackSubmittedAt ? undefined : new Date().toISOString(),
        eventLiked: liked || null,
        editor: { email: a.email, name: editorName(a, a.email, a.submission) },
      });
      res.status(200).json({
        status: 'success',
        data: {
          feedbackSubmittedAt: updated.feedbackSubmittedAt,
          lastEditedAt: updated.lastEditedAt,
          lastEditedByName: updated.lastEditedByName,
          lastEditedByEmail: updated.lastEditedByEmail,
        },
      });
    } catch (error) {
      console.error('❌ Error saving submission feedback:', error);
      res.status(500).json({ status: 'error', message: 'Failed to save your feedback' });
    }
  }

  // Point person (verified): give a teammate on the team list edit access. The
  // teammate's email must be checked in on Luma and not on another team.
  async addEditor(req, res) {
    try {
      const a = await builderAccess(req, res, { ownerOnly: true });
      if (!a) return;
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      if (!ATTEMPT_EMAIL_RE.test(email)) return res.status(400).json({ status: 'error', message: 'A valid email is required' });
      if (email === a.submission.lumaEmail) {
        return res.status(400).json({ status: 'error', message: "That's the point person's email: it can already edit." });
      }
      const onTeam = (a.submission.details?.team ?? []).some((m) => (m.email || '').toLowerCase() === email);
      if (!onTeam) {
        return res.status(400).json({ status: 'error', code: 'not_on_team', message: 'Add this teammate (with their email) to the team list and save first.' });
      }
      const [ownsEntry, grant] = await Promise.all([
        programSubmissionRepository.findByEmail(a.program.id, email),
        submissionEditorRepository.findByProgramEmail(a.program.id, email),
      ]);
      if (ownsEntry || (grant && grant.submissionId !== a.submission.id)) {
        return res.status(409).json({ status: 'error', code: 'email_in_use', message: 'This email is already on another team for this program.' });
      }
      if (!testEmailsAllowed().has(email)) {
        const { present, transient } = await checkInStatus(a.program, email, { fresh: true });
        if (!present) {
          if (transient) return res.status(503).json({ status: 'error', message: "Couldn't check Luma right now. Please try again in a moment." });
          return res.status(403).json({ status: 'error', code: 'not_checked_in', message: "This email isn't checked in on Luma." });
        }
      }
      await submissionEditorRepository.add({ submissionId: a.submission.id, programId: a.program.id, email, addedBy: a.email });
      const editors = await submissionEditorRepository.listBySubmission(a.submission.id);
      auditLog.logSafe({
        programId: a.program.id,
        actor: { email: a.email },
        action: 'submission.editor_added',
        targetType: 'submission',
        targetId: a.submission.id,
        metadata: { email },
      });
      res.status(201).json({ status: 'success', data: { editors: editors.map((e) => e.email) } });
    } catch (error) {
      console.error('❌ Error adding submission editor:', error);
      res.status(500).json({ status: 'error', message: 'Failed to give edit access' });
    }
  }

  // Point person (verified): remove a teammate's edit access.
  async removeEditor(req, res) {
    try {
      const a = await builderAccess(req, res, { ownerOnly: true });
      if (!a) return;
      const email = String(req.params.email || '').trim().toLowerCase();
      await submissionEditorRepository.remove(a.submission.id, email);
      const editors = await submissionEditorRepository.listBySubmission(a.submission.id);
      res.status(200).json({ status: 'success', data: { editors: editors.map((e) => e.email) } });
    } catch (error) {
      console.error('❌ Error removing submission editor:', error);
      res.status(500).json({ status: 'error', message: 'Failed to remove edit access' });
    }
  }

  // Public: a tracked program's submissions as they come in (no emails; names
  // hidden for anonymous entries). Prizes appear with the awards slice.
  async publicSubmissions(req, res) {
    try {
      if (!trackedProgramFor(req.params.slug)) {
        return res.status(404).json({ status: 'error', message: 'Not a tracked program' });
      }
      const program = await programService.findBySlug(req.params.slug);
      if (!program) return res.status(404).json({ status: 'error', message: 'Program not found' });
      // Drafts are the team's own until finalized.
      const rows = await programSubmissionRepository.listByProgramId(program.id, { status: 'submitted' });
      res.status(200).json({
        status: 'success',
        data: { published: !!program.resultsPublishedAt, submissions: toPublicList(rows, !!program.resultsPublishedAt) },
      });
    } catch (error) {
      console.error('❌ Error listing public submissions:', error);
      res.status(500).json({ status: 'error', message: 'Failed to load submissions' });
    }
  }

  // Program admin: refused submissions, newest first, with the reason the
  // builder was shown and what they tried to submit.
  async listRefusals(req, res) {
    try {
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const data = await submissionRefusalRepository.listByProgram(programId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      console.error('❌ Error listing refused submissions:', error);
      res.status(500).json({ status: 'error', message: 'Failed to load refused submissions' });
    }
  }

  // Master (global) admin only: let a refused project in. Skips only the Luma
  // check-in gate: the stored attempt must still pass the same validation. The
  // entry keeps the attempt's time, so it lands in the judging batch of when
  // the builder really submitted.
  async acceptRefusal(req, res) {
    try {
      if (!isPlatformAdmin(req)) {
        return res.status(403).json({ status: 'error', message: 'Only a master admin can accept a refused submission' });
      }
      const program = await programService.findBySlug(req.params.slug);
      if (!program) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const refusal = await submissionRefusalRepository.findById(req.params.refusalId);
      if (!refusal || refusal.programId !== program.id) {
        return res.status(404).json({ status: 'error', message: 'Refused submission not found' });
      }
      if (refusal.status === 'accepted') {
        return res.status(409).json({ status: 'error', message: 'Already accepted' });
      }
      const tracked = trackedProgramFor(program.slug);
      const v = validateSubmission(refusal.payload, {
        videoOptional: videoOptionalFor(tracked, refusal.payload?.details),
        ratingsOptional: true,
      });
      if (!v.ok) {
        return res.status(422).json({ status: 'error', message: `Can't accept: ${v.error}. Ask the builder to resubmit.` });
      }
      if (tracked) {
        const dv = validateSubmissionDetails(tracked, refusal.payload.details);
        if (!dv.ok) {
          return res.status(422).json({ status: 'error', message: `Can't accept: ${dv.error}. Ask the builder to resubmit.` });
        }
        v.value.details = dv.value;
      }
      const existing = await programSubmissionRepository.findByEmail(program.id, v.value.lumaEmail);
      if (existing) {
        return res.status(409).json({ status: 'error', message: 'That email already has a submission for this program' });
      }
      const late = !!(program.eventEndsAt && Date.parse(refusal.createdAt) > Date.parse(program.eventEndsAt));
      const { submission } = await programSubmissionRepository.create({
        programId: program.id,
        ...v.value,
        late,
        createdAt: refusal.createdAt,
        acceptedFromRefusalId: refusal.id,
      });
      await saveRatings(submission, program.id, v.value.ratings);
      const reviewedBy = req.user?.address ?? null;
      const updated = await submissionRefusalRepository.setReviewed(refusal.id, {
        status: 'accepted',
        reviewedBy,
        acceptedSubmissionId: submission.id,
      });
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'submission.refusal_accepted',
        targetType: 'submission',
        targetId: submission.id,
        metadata: { refusalId: refusal.id, reasonCode: refusal.reasonCode, email: refusal.lumaEmail },
      });
      if (tracked) await scheduleTxCheck(submission);
      res.status(200).json({ status: 'success', data: { refusal: updated, submission } });
    } catch (error) {
      console.error('❌ Error accepting a refused submission:', error);
      res.status(500).json({ status: 'error', message: 'Failed to accept the submission' });
    }
  }

  // Master (global) admin only: mark a refusal reviewed and not accepted. Kept.
  async dismissRefusal(req, res) {
    try {
      if (!isPlatformAdmin(req)) {
        return res.status(403).json({ status: 'error', message: 'Only a master admin can dismiss a refused submission' });
      }
      const programId = await resolveProgramId(req);
      const refusal = await submissionRefusalRepository.findById(req.params.refusalId);
      if (!refusal || refusal.programId !== programId) {
        return res.status(404).json({ status: 'error', message: 'Refused submission not found' });
      }
      if (refusal.status === 'accepted') {
        return res.status(409).json({ status: 'error', message: 'Already accepted' });
      }
      const updated = await submissionRefusalRepository.setReviewed(refusal.id, { status: 'dismissed', reviewedBy: req.user?.address ?? null });
      auditLog.logSafe({
        programId,
        actor: { chain: req.user?.chain, wallet: req.user?.address },
        action: 'submission.refusal_dismissed',
        targetType: 'submission_refusal',
        targetId: refusal.id,
        metadata: { email: refusal.lumaEmail },
      });
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      console.error('❌ Error dismissing a refused submission:', error);
      res.status(500).json({ status: 'error', message: 'Failed to dismiss' });
    }
  }

  // Judge/admin: the program's judges with their profile (name, tracks). Emails
  // go to admins and to each judge for their own row only, so judges see
  // each other by name, as in the progress table.
  async listJudges(req, res) {
    try {
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const judges = await programAdminEmailRepository.listJudges(programId);
      const me = (req.user?.email || '').toLowerCase();
      const isAdminCaller = !req.user?.email || req.user?.role === 'admin';
      const data = judges.map((j) => ({
        name: j.name || j.email.split('@')[0],
        tracks: j.tracks,
        email: isAdminCaller || j.email === me ? j.email : null,
      }));
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      console.error('❌ Error listing judges:', error);
      res.status(500).json({ status: 'error', message: 'Failed to load judges' });
    }
  }

  // Judge/admin: a tracked program's submissions with their details, track and
  // judging batch (from when it was finalized; see trackedPrograms.js). Drafts
  // stay out until the team clicks Finalize and submit.
  async listTracked(req, res) {
    try {
      const tracked = trackedProgramFor(req.params.slug);
      if (!tracked) return res.status(404).json({ status: 'error', message: 'Not a tracked program' });
      const program = await programService.findBySlug(req.params.slug);
      if (!program) return res.status(404).json({ status: 'error', message: 'Program not found' });
      // Only finalized entries are ready to judge; the batch is from when the
      // team finalized (older entries: their first submission).
      const rows = await programSubmissionRepository.listByProgramId(program.id, { status: 'submitted' });
      const isJudgeOnly = req.user?.role === 'judge';
      const data = rows.map((s) => ({
        ...s,
        batch: batchFor(tracked.judgingBatches, s.finalizedAt ?? s.createdAt),
        // Anonymous entries: judges see when it was last edited, not by whom.
        ...(isJudgeOnly && s.details?.anonymous ? { lastEditedByName: null, lastEditedByEmail: null } : {}),
      }));
      const draftCount = isJudgeOnly ? undefined : await programSubmissionRepository.countDrafts(program.id);
      res.status(200).json({
        status: 'success',
        data: { submissions: data, batches: tracked.judgingBatches, resultsPublishedAt: program.resultsPublishedAt ?? null, ...(draftCount !== undefined ? { draftCount } : {}) },
      });
    } catch (error) {
      console.error('❌ Error listing tracked submissions:', error);
      res.status(500).json({ status: 'error', message: 'Failed to load submissions' });
    }
  }

  // Judge (email session) only: this judge's rubric scores for a tracked
  // program, so their work restores after a refresh or on another device.
  async listMyRubricScores(req, res) {
    try {
      if (!req.user?.email) {
        return res.status(403).json({ status: 'error', message: RUBRIC_JUDGES_ONLY });
      }
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const scores = await submissionRubricScoreRepository.listByJudge(programId, req.user.email);
      res.status(200).json({ status: 'success', data: scores });
    } catch (error) {
      console.error('❌ Error listing rubric scores:', error);
      res.status(500).json({ status: 'error', message: 'Failed to load scores' });
    }
  }

  // Judge (email session) only: autosave this judge's rubric score for one
  // submission and track. Partial scores are allowed; the identity is the
  // verified session email (any judgeEmail in the body is ignored).
  async upsertRubricScore(req, res) {
    try {
      const judgeEmail = req.user?.email;
      if (!judgeEmail) {
        return res.status(403).json({ status: 'error', message: RUBRIC_JUDGES_ONLY });
      }
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const { submissionId, track } = req.params;
      if (Array.isArray(req.user.tracks) && !req.user.tracks.includes(track)) {
        return res.status(403).json({ status: 'error', message: `You are not a judge for the ${track} track.` });
      }
      const submission = await programSubmissionRepository.findById(submissionId);
      if (!submission || submission.programId !== programId) {
        return res.status(404).json({ status: 'error', message: 'Submission not found' });
      }
      // Drafts aren't in any queue until the team finalizes them.
      if (submission.status === 'draft') {
        return res.status(409).json({ status: 'error', code: 'not_submitted', message: 'This project is still a draft.' });
      }
      // A score only counts for a track the project entered ("both" = each).
      if (!judgedTracksOf(submission.track ?? submission.details?.track).includes(track)) {
        return res.status(400).json({ status: 'error', code: 'track_not_entered', message: `This project didn't enter the ${track} track.` });
      }
      const v = validateRubricScore(track, req.body);
      if (!v.ok) {
        return res.status(400).json({ status: 'error', message: v.error });
      }
      const score = await submissionRubricScoreRepository.upsert({
        submissionId,
        programId,
        judgeEmail,
        track,
        ...v.value,
      });
      res.status(200).json({ status: 'success', data: score });
    } catch (error) {
      console.error('❌ Error saving rubric score:', error);
      res.status(500).json({ status: 'error', message: 'Failed to save score' });
    }
  }

  // Judge/admin: finalize the ballot. Requires every submission scored.
  async submitBallot(req, res) {
    try {
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const judgeEmail = judgeIdentity(req);

      if (await programJudgeBallotRepository.isSubmitted(programId, judgeEmail)) {
        return res.status(200).json({ status: 'success', data: { status: 'submitted' } });
      }

      const result = await scoringService.submitBallot(programId, judgeEmail);
      if (!result.ok) {
        return res.status(409).json({
          status: 'error',
          message: `Score every submission before submitting (${result.missing} of ${result.total} still unscored).`,
        });
      }
      res.status(200).json({ status: 'success', data: { status: 'submitted' } });
      auditLog.logSafe({
        programId,
        actor: { wallet: req.user?.address, email: req.user?.email },
        action: 'scoring.submit_ballot',
        targetType: 'judge',
        targetId: `judge:${judgeEmail}`,
        metadata: { total: result.total },
      });
    } catch (error) {
      console.error('❌ Error submitting ballot:', error);
      res.status(500).json({ status: 'error', message: 'Failed to submit scores' });
    }
  }

  // Judge/admin: claim a batch of submissions to score. With no batchNumber the
  // service picks the least-covered batch ("Claim next 10"). Returns the refreshed
  // judge view so the panel updates in one round-trip.
  async claimBatch(req, res) {
    try {
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const judgeEmail = judgeIdentity(req);
      // A submitted ballot no longer locks claiming: scores count as soon as they
      // are saved, so a judge (or admin) can keep claiming + scoring more batches
      // after submitting their first.
      const batchNumber = req.body?.batchNumber;
      const result = await scoringService.claimBatch(programId, judgeEmail, batchNumber);
      if (result.invalid) {
        return res.status(400).json({ status: 'error', message: 'Invalid batch number' });
      }
      res.status(200).json({
        status: 'success',
        data: result.view,
        meta: { claimed: result.claimed ?? null, nothingToClaim: result.nothingToClaim ?? false },
      });
    } catch (error) {
      console.error('❌ Error claiming batch:', error);
      res.status(500).json({ status: 'error', message: 'Failed to claim batch' });
    }
  }

  // Judge/admin: bulk-save this judge's scores for a batch. Body: { scores: [...] }.
  // Each row validated like a single score; rejects if the ballot is locked or a
  // submission doesn't belong to this program.
  async saveScores(req, res) {
    try {
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const judgeEmail = judgeIdentity(req);

      // Editable after submit too: a judge may re-save (revise) their own
      // scores anytime; submitted ballots still count and reflect the latest.
      const scores = req.body?.scores;
      if (!Array.isArray(scores) || scores.length === 0) {
        return res.status(400).json({ status: 'error', message: 'scores must be a non-empty array' });
      }

      const submissions = await programSubmissionRepository.listByProgramId(programId);
      const validIds = new Set(submissions.map((s) => s.id));

      const rows = [];
      for (const entry of scores) {
        if (!entry || !validIds.has(entry.submissionId)) {
          return res.status(400).json({ status: 'error', message: 'Unknown submission in batch' });
        }
        const v = validateScore(entry);
        if (!v.ok) {
          return res.status(400).json({ status: 'error', message: v.error });
        }
        rows.push({ submissionId: entry.submissionId, programId, judgeEmail, ...v.value });
      }

      const saved = await submissionScoreRepository.upsertMany(rows);
      res.status(200).json({ status: 'success', data: saved });
    } catch (error) {
      console.error('❌ Error saving scores:', error);
      res.status(500).json({ status: 'error', message: 'Failed to save scores' });
    }
  }

  // Admin: promote a submission into a Stadium project for payout/team tracking.
  // Payout-adjacent — global (wallet) admins only, like winner selection.
  async promote(req, res) {
    try {
      if (!isPlatformAdmin(req)) {
        return res.status(403).json({ status: 'error', message: 'Only platform admins can promote submissions' });
      }
      const { slug, submissionId } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const result = await scoringService.promoteToProject(program, submissionId);
      if (result.notFound) {
        return res.status(404).json({ status: 'error', message: 'Submission not found' });
      }
      if (result.alreadyPromoted) {
        return res
          .status(200)
          .json({ status: 'success', data: { projectId: result.projectId, alreadyPromoted: true } });
      }
      res.status(201).json({ status: 'success', data: { projectId: result.project.id } });
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email },
        action: 'submission.promote',
        targetType: 'submission',
        targetId: submissionId,
        metadata: { projectId: result.project.id },
      });
    } catch (error) {
      console.error('❌ Error promoting submission:', error);
      res.status(500).json({ status: 'error', message: 'Failed to promote submission' });
    }
  }

  // Admin: mark a submission paid / not paid (payout tracking). Global (wallet)
  // admins only — payouts stay wallet-gated.
  async setPaid(req, res) {
    try {
      if (!isPlatformAdmin(req)) {
        return res.status(403).json({ status: 'error', message: 'Only platform admins can update payout status' });
      }
      const { slug, submissionId } = req.params;
      const paid = req.body?.paid === true || req.body?.paid === 'true';
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const submission = await programSubmissionRepository.findById(submissionId);
      if (!submission || submission.programId !== program.id) {
        return res.status(404).json({ status: 'error', message: 'Submission not found' });
      }
      const actor = req.user?.address || req.user?.email || null;
      const updated = await programSubmissionRepository.setPaid(submissionId, paid, actor);
      res.status(200).json({ status: 'success', data: updated });
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email },
        action: paid ? 'submission.mark_paid' : 'submission.mark_unpaid',
        targetType: 'submission',
        targetId: submissionId,
        metadata: null,
      });
    } catch (error) {
      console.error('❌ Error updating paid status:', error);
      res.status(500).json({ status: 'error', message: 'Failed to update paid status' });
    }
  }

  // Platform admin: elect a winner by assigning a prize tier, or clear it.
  // Gated to global admins (not per-program admins), and only once judging is
  // complete. Body: { amount } to assign a configured tier, or { prize: null }.
  async awardPrize(req, res) {
    try {
      if (!isPlatformAdmin(req)) {
        return res.status(403).json({ status: 'error', message: 'Only platform admins can select winners' });
      }
      const { slug, submissionId } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      if (!(await scoringService.isJudgingComplete(program.id))) {
        return res.status(409).json({
          status: 'error',
          message: 'Winners can be selected only after every judge has submitted.',
        });
      }
      const submission = await programSubmissionRepository.findById(submissionId);
      if (!submission || submission.programId !== program.id) {
        return res.status(404).json({ status: 'error', message: 'Submission not found' });
      }
      const v = validatePrize(req.body, prizeTiersFor(program));
      if (!v.ok) {
        return res.status(400).json({ status: 'error', message: v.error });
      }
      const actor = req.user?.address || req.user?.email || null;
      const updated = await programSubmissionRepository.setPrize(submissionId, v.value, actor);
      res.status(200).json({ status: 'success', data: updated });
      auditLog.logSafe({
        programId: program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email },
        action: v.value ? 'submission.award_prize' : 'submission.clear_prize',
        targetType: 'submission',
        targetId: submissionId,
        metadata: v.value,
      });
    } catch (error) {
      console.error('❌ Error awarding prize:', error);
      res.status(500).json({ status: 'error', message: 'Failed to award prize' });
    }
  }

  // Platform admin: publish / unpublish the public results. Publishing reveals
  // all submissions + winners on the public program page. Global admins only.
  publishResults(req, res) {
    return setResultsPublished(req, res, true);
  }

  unpublishResults(req, res) {
    return setResultsPublished(req, res, false);
  }

  // Public: PII-free submissions + winners, only once results are published.
  async publicResults(req, res) {
    try {
      const { slug } = req.params;
      const program = await programService.findBySlug(slug);
      if (!program) {
        return res.status(404).json({ status: 'error', message: 'Program not found' });
      }
      const data = await scoringService.publicResults(program);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      console.error('❌ Error building public results:', error);
      res.status(500).json({ status: 'error', message: 'Failed to load results' });
    }
  }

  // Judge/admin: at-a-glance counts for the program header (no PII).
  async programStats(req, res) {
    try {
      const program = await programService.findBySlug(req.params.slug);
      if (!program) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const [confirmedParticipants, submissionsCount] = await Promise.all([
        programSignupRepository.countByProgramId(program.id),
        programSubmissionRepository.countByProgramId(program.id),
      ]);
      res.status(200).json({ status: 'success', data: { confirmedParticipants, submissionsCount } });
    } catch (error) {
      console.error('❌ Error building program stats:', error);
      res.status(500).json({ status: 'error', message: 'Failed to load stats' });
    }
  }

  // Judge/admin: gated leaderboard (locked until all registered judges submit).
  async leaderboard(req, res) {
    try {
      const programId = await resolveProgramId(req);
      if (!programId) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const data = await scoringService.leaderboard(programId, judgeIdentity(req));
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      console.error('❌ Error building leaderboard:', error);
      res.status(500).json({ status: 'error', message: 'Failed to build leaderboard' });
    }
  }

  // Admin: aggregated feedback survey counts for the results summary panel.
  async feedbackAggregate(req, res) {
    try {
      const program = await programService.findBySlug(req.params.slug);
      if (!program) return res.status(404).json({ status: 'error', message: 'Program not found' });
      const [feedback, ratings, liked] = await Promise.all([
        programSubmissionRepository.aggregateFeedback(program.id),
        experienceRatingRepository.aggregateByProgram(program.id),
        programSubmissionRepository.listEventLiked(program.id),
      ]);
      res.status(200).json({ status: 'success', data: { ...feedback, ratings, liked } });
    } catch (error) {
      console.error('❌ Error aggregating feedback:', error);
      res.status(500).json({ status: 'error', message: 'Failed to aggregate feedback' });
    }
  }
}

export default new SubmissionController();
