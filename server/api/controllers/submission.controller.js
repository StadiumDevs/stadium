import programService from '../services/program.service.js';
import scoringService from '../services/scoring.service.js';
import programRepository from '../repositories/program.repository.js';
import programSubmissionRepository from '../repositories/program-submission.repository.js';
import programSignupRepository from '../repositories/program-signup.repository.js';
import submissionScoreRepository from '../repositories/submission-score.repository.js';
import programJudgeBallotRepository from '../repositories/program-judge-ballot.repository.js';
import { validateSubmission, validateScore, validatePrize, prizeTiersFor } from '../utils/submission.validator.js';
import submissionConfirmationService from '../services/submission-confirmation.service.js';
import prizeAwardService from '../services/prize-award.service.js';
import lumaSyncService from '../services/luma-sync.service.js';
import auditLog from '../services/program-audit-log.service.js';

// On a Luma-gated cache-miss we lazily re-sync, but only if the last sync is
// older than this floor. Bounds Luma calls when not-on-list emails retry, while
// keeping the worst-case "checked in seconds ago" wait small.
const JIT_SYNC_FLOOR_MS = 25 * 1000;

// Winner selection + publishing are platform-admin only. After requireProgramAdmin,
// a global admin carries isGlobalAdmin === true; per-program admins do not.
const isPlatformAdmin = (req) => req.user?.isGlobalAdmin === true;

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

class SubmissionController {
  // Public: anyone can submit a project to a program by filling the form.
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
      const v = validateSubmission(req.body);
      if (!v.ok) {
        return res.status(400).json({ status: 'error', message: v.error });
      }
      // Only checked-in attendees may submit: the email must be on the program's
      // imported Luma (checked-in / approved guest) list. SUBMIT_TEST_EMAILS is a
      // comma-separated allowlist that bypasses this gate for testing (off by
      // default; set per-deployment). Such submissions are still flagged
      // eligible:false on the leaderboard since they're not in the Luma list.
      const testEmails = new Set(
        (process.env.SUBMIT_TEST_EMAILS || '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      );
      const submitterEmail = String(v.value.lumaEmail || '').trim().toLowerCase();
      if (!testEmails.has(submitterEmail)) {
        let present = await programSignupRepository.existsByEmail(program.id, submitterEmail);
        // Luma-gated programs: on a miss, lazily re-sync the checked-in list
        // (someone may have checked in seconds ago) before deciding. Respect a
        // floor so repeated not-on-list retries can't hammer Luma. A sync
        // FAILURE must not be reported to a legit attendee as "not on the list"
        // — distinguish transient (retry) from definitive (rejected).
        let transient = false;
        if (!present && lumaSyncService.isActive(program)) {
          const lastSync = program.lastGuestSyncAt ? Date.parse(program.lastGuestSyncAt) : 0;
          const stale = !lastSync || Date.now() - lastSync > JIT_SYNC_FLOOR_MS;
          if (stale) {
            const sync = await lumaSyncService.syncProgram(program);
            transient = sync.status === 'truncated' || String(sync.status).startsWith('error');
            present = await programSignupRepository.existsByEmail(program.id, submitterEmail);
          } else {
            // Synced very recently and still absent → treat the last sync's
            // health as the verdict's confidence.
            transient =
              program.lastGuestSyncStatus === 'truncated' ||
              String(program.lastGuestSyncStatus || '').startsWith('error');
          }
        }
        if (!present) {
          if (transient) {
            return res.status(503).json({
              status: 'error',
              message: "Couldn't verify your check-in right now. Please try again in a moment.",
            });
          }
          return res.status(403).json({
            status: 'error',
            message: 'Only checked-in attendees can submit. Use the email you checked in with on Luma.',
          });
        }
      }
      // Deadline is informational: a submit after event end is flagged late, not blocked.
      const late = !!(program.eventEndsAt && Date.now() > Date.parse(program.eventEndsAt));

      // Resubmit = overwrite the existing entry (one submission per Luma email).
      const existing = await programSubmissionRepository.findByEmail(program.id, v.value.lumaEmail);
      let submission;
      let resubmitted;
      let statusCode;
      if (existing) {
        submission = await programSubmissionRepository.updateSubmission(existing.id, { ...v.value, late });
        resubmitted = true;
        statusCode = 200;
      } else {
        ({ submission } = await programSubmissionRepository.create({ programId: program.id, ...v.value, late }));
        resubmitted = false;
        statusCode = 201;
      }

      // Confirmation email is best-effort — a Resend failure never fails the submission.
      let emailSent = false;
      let emailReason = null;
      try {
        const result = await submissionConfirmationService.send({
          email: submission.lumaEmail,
          submitterName: submission.submitterName,
          programName: program.name,
          slug: program.slug,
          projectTitle: submission.projectTitle,
          deadline: program.eventEndsAt ?? null,
          resubmitted,
        });
        emailSent = result.ok;
        emailReason = result.ok ? null : result.reason;
      } catch (err) {
        emailReason = 'send_failed';
        console.error('❌ Submission confirmation email failed:', err);
      }

      return res
        .status(statusCode)
        .json({ status: 'success', data: { id: submission.id, late }, resubmitted, emailSent, emailReason });
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
      if (await programJudgeBallotRepository.isSubmitted(programId, judgeEmail)) {
        return res.status(409).json({ status: 'error', message: 'Your ballot is submitted and locked.' });
      }
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
      const data = await scoringService.leaderboard(programId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      console.error('❌ Error building leaderboard:', error);
      res.status(500).json({ status: 'error', message: 'Failed to build leaderboard' });
    }
  }
}

export default new SubmissionController();
