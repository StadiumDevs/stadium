// Tracked programs (Free Society Hack): the leaderboard, awards by track, the
// Ecosystem Prize, judging progress, winner pages, milestones and the testnet
// transaction re-check. The behaviour mirrors the playground
// (client/src/lib/mockTrackedSubmissions.ts); data access goes through the
// Supabase repositories.

import programService from '../services/program.service.js';
import programSubmissionRepository from '../repositories/program-submission.repository.js';
import submissionRubricScoreRepository from '../repositories/submission-rubric-score.repository.js';
import programAdminEmailRepository from '../repositories/program-admin-email.repository.js';
import { trackedProgramFor } from '../constants/trackedPrograms.js';
import { RUBRIC_TRACKS } from '../constants/rubrics.js';
import {
  computeJudgingProgress,
  computeLeaderboard,
  hasFullScore,
  judgedTracksOf,
  winnerBlockedReason,
} from '../services/rubric-leaderboard.service.js';
import { checkAndStore } from '../services/tx-check.service.js';
import { toPublicSubmission } from '../utils/public-submission.js';
import { prizeTiersFor, validateMilestonePatch } from '../utils/submission.validator.js';
import { extractSupabaseToken, getSupabaseUser } from '../auth/supabaseUser.js';
import auditLog from '../services/program-audit-log.service.js';

const isPlatformAdmin = (req) => req.user?.isGlobalAdmin === true;
// An email judge (not an admin): sees other judges by name only.
const isJudgeOnly = (req) => !!req.user?.email && req.user?.role !== 'admin' && !isPlatformAdmin(req);
const actorOf = (req) => ({ chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email });
const fail = (res, code, message) => res.status(code).json({ status: 'error', message });

// The tracked program for :slug, or an error response.
async function loadTracked(req, res) {
  const tracked = trackedProgramFor(req.params.slug);
  if (!tracked) {
    fail(res, 404, 'Not a tracked program');
    return null;
  }
  const program = await programService.findBySlug(req.params.slug);
  if (!program) {
    fail(res, 404, 'Program not found');
    return null;
  }
  return { tracked, program };
}

async function loadSubmission(req, res, program) {
  const s = await programSubmissionRepository.findById(req.params.submissionId);
  if (!s || s.programId !== program.id || !s.details) {
    fail(res, 404, 'Submission not found');
    return null;
  }
  return s;
}

const sameAmount = (a, b) => Number(a) === Number(b);

class TrackedResultsController {
  // Judge/admin: the ranked leaderboard for one track. Judges limited to some
  // tracks only see theirs; judges see other judges by name, not email.
  async leaderboard(req, res) {
    try {
      const ctx = await loadTracked(req, res);
      if (!ctx) return;
      const { track } = req.params;
      if (!RUBRIC_TRACKS.includes(track)) return fail(res, 400, `Unknown track: ${track}`);
      if (Array.isArray(req.user?.tracks) && !req.user.tracks.includes(track)) {
        return fail(res, 403, `You are not a judge for the ${track} track.`);
      }
      const [submissions, scores, judges] = await Promise.all([
        programSubmissionRepository.listByProgramId(ctx.program.id),
        submissionRubricScoreRepository.listByProgram(ctx.program.id),
        programAdminEmailRepository.listJudges(ctx.program.id),
      ]);
      const board = computeLeaderboard({ track, submissions, scores, judges });
      if (isJudgeOnly(req)) {
        const me = req.user.email.toLowerCase();
        const nameOf = new Map(judges.map((j) => [j.email, j.name || j.email.split('@')[0]]));
        const mask = (e) => (e === me ? e : nameOf.get(e) ?? 'Judge');
        board.judges = board.judges.map(mask);
        for (const r of board.rows) r.judgeScores = r.judgeScores.map((x) => ({ ...x, judgeEmail: mask(x.judgeEmail) }));
      }
      res.status(200).json({ status: 'success', data: board });
    } catch (error) {
      console.error('❌ Error building the rubric leaderboard:', error);
      fail(res, 500, 'Failed to load the leaderboard');
    }
  }

  // Judge/admin: each judge's progress (names and tracks; emails only to admins
  // and to the judge themselves).
  async judgingProgress(req, res) {
    try {
      const ctx = await loadTracked(req, res);
      if (!ctx) return;
      const [submissions, scores, judges] = await Promise.all([
        programSubmissionRepository.listByProgramId(ctx.program.id),
        submissionRubricScoreRepository.listByProgram(ctx.program.id),
        programAdminEmailRepository.listJudges(ctx.program.id),
      ]);
      const me = (req.user?.email || '').toLowerCase();
      const data = computeJudgingProgress({ submissions, scores, judges }).map(({ email, ...row }) => ({
        ...row,
        isYou: !!me && email === me,
      }));
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      console.error('❌ Error loading judging progress:', error);
      fail(res, 500, 'Failed to load judging progress');
    }
  }

  // Platform admin: award (amount) or clear (null) a track prize. The tier must
  // belong to the track; the Works-0 gate and per-tier counts are enforced.
  async awardPrize(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can award prizes');
      const ctx = await loadTracked(req, res);
      if (!ctx) return;
      const { track } = req.params;
      if (!RUBRIC_TRACKS.includes(track)) return fail(res, 400, `Unknown track: ${track}`);
      const s = await loadSubmission(req, res, ctx.program);
      if (!s) return;
      if (!judgedTracksOf(s.details.track).includes(track)) {
        return fail(res, 409, `This project didn't enter the ${track} track.`);
      }
      const amount = req.body?.amount ?? null;
      let tier = null;
      if (amount !== null) {
        const prefix = ctx.tracked.prizePrefixes[track];
        tier = prizeTiersFor(ctx.program).find((t) => sameAmount(t.amount, amount) && t.label.startsWith(prefix));
        if (!tier) return fail(res, 400, 'That prize is not one of this track\'s tiers');
        const scores = await submissionRubricScoreRepository.listByProgram(ctx.program.id);
        if (!hasFullScore(track, scores, s.id)) {
          return fail(res, 409, 'No judge has fully scored this project in this track yet.');
        }
        const blocked = winnerBlockedReason(track, scores, s.id);
        if (blocked) return fail(res, 409, blocked);
        const limit = ctx.tracked.tierLimits?.[track]?.[tier.amount];
        if (limit) {
          const all = await programSubmissionRepository.listByProgramId(ctx.program.id);
          const holders = all.filter((x) => x.id !== s.id && sameAmount(x.prizes?.[track]?.amount, tier.amount)).length;
          if (holders >= limit) {
            return fail(res, 409, `${tier.label} already has ${limit} winner${limit > 1 ? 's' : ''}. Clear one first.`);
          }
        }
      }
      const prizes = { ...(s.prizes || {}) };
      if (tier) prizes[track] = { amount: tier.amount, currency: tier.currency, label: tier.label };
      else delete prizes[track];
      // Losing the Ecosystem track's prize also drops the Ecosystem flag.
      const keepsFlag = s.ecosystemPrize && !!prizes[ctx.tracked.ecosystem.track];
      const updated = await programSubmissionRepository.updateTracked(s.id, { prizes, ecosystemPrize: keepsFlag });
      res.status(200).json({ status: 'success', data: updated });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: actorOf(req),
        action: tier ? 'tracked.prize_award' : 'tracked.prize_clear',
        targetType: 'submission',
        targetId: s.id,
        metadata: { track, amount: tier?.amount ?? null, label: tier?.label ?? null },
      });
    } catch (error) {
      console.error('❌ Error awarding a track prize:', error);
      fail(res, 500, 'Failed to award the prize');
    }
  }

  // Platform admin: flag or unflag a podium project for the Ecosystem Prize.
  // Flagging opens its milestone, seeded from the submission's next milestone.
  async setEcosystemPrize(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can set the Ecosystem Prize');
      const ctx = await loadTracked(req, res);
      if (!ctx) return;
      const s = await loadSubmission(req, res, ctx.program);
      if (!s) return;
      const flagged = req.body?.flagged === true;
      const { track, maxFlags, label } = ctx.tracked.ecosystem;
      if (flagged) {
        if (!s.prizes?.[track]) return fail(res, 409, `Only ${track} prize winners can get the ${label}.`);
        const all = await programSubmissionRepository.listByProgramId(ctx.program.id);
        const others = all.filter((x) => x.ecosystemPrize && x.id !== s.id).length;
        if (others >= maxFlags) return fail(res, 409, `The ${label} already has ${maxFlags} winners. Unflag one first.`);
      }
      const milestone =
        s.details.milestone ??
        (flagged
          ? {
              sentence: s.details.nextStep,
              partnerName: null,
              partnerProject: null,
              agreedAt: null,
              checkedInAt: null,
              deliveryLink: null,
              partnerConfirmed: null,
              partnerConfirmedAt: null,
              loungeDate: null,
              payoutStatus: 'pending',
              payoutReleasedAt: null,
            }
          : null);
      const updated = await programSubmissionRepository.updateTracked(s.id, { ecosystemPrize: flagged, milestone });
      res.status(200).json({ status: 'success', data: updated });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: actorOf(req),
        action: flagged ? 'tracked.ecosystem_flag' : 'tracked.ecosystem_unflag',
        targetType: 'submission',
        targetId: s.id,
      });
    } catch (error) {
      console.error('❌ Error setting the Ecosystem Prize:', error);
      fail(res, 500, 'Failed to update the Ecosystem Prize');
    }
  }

  // Public: a winner's page, only once results are published.
  async publicWinner(req, res) {
    try {
      const ctx = await loadTracked(req, res);
      if (!ctx) return;
      if (!ctx.program.resultsPublishedAt) return fail(res, 404, 'Project not found');
      const s = await programSubmissionRepository.findById(req.params.submissionId);
      if (!s || s.programId !== ctx.program.id || !s.details || Object.keys(s.prizes || {}).length === 0) {
        return fail(res, 404, 'Project not found');
      }
      res.status(200).json({ status: 'success', data: toPublicSubmission(s, { published: true }) });
    } catch (error) {
      console.error('❌ Error loading a winner:', error);
      fail(res, 500, 'Failed to load the project');
    }
  }

  // Program admin: update an Ecosystem Prize milestone (any field).
  async updateMilestoneAdmin(req, res) {
    return updateMilestone(req, res, 'admin');
  }

  // Builder: update their own milestone's sentence and delivery link. Their
  // email must be verified (sign-in link) and match the submission's email.
  async updateMilestoneBuilder(req, res) {
    return updateMilestone(req, res, 'builder');
  }

  // Program admin: re-run the testnet transaction check now.
  async recheckTx(req, res) {
    try {
      const ctx = await loadTracked(req, res);
      if (!ctx) return;
      const s = await loadSubmission(req, res, ctx.program);
      if (!s) return;
      if (!s.details.testnetTxid) return fail(res, 409, 'This submission has no testnet transaction id');
      const updated = await checkAndStore(s.id, s.details.testnetTxid);
      if (!updated) return fail(res, 502, "Couldn't save the check. Try again.");
      res.status(200).json({ status: 'success', data: updated });
    } catch (error) {
      console.error('❌ Error re-checking a transaction:', error);
      fail(res, 500, 'Failed to re-check the transaction');
    }
  }
}

async function updateMilestone(req, res, role) {
  try {
    const ctx = await loadTracked(req, res);
    if (!ctx) return;
    const s = await loadSubmission(req, res, ctx.program);
    if (!s) return;
    if (role === 'builder') {
      const token = extractSupabaseToken(req);
      const user = token ? await getSupabaseUser(token) : null;
      const email = user?.email?.trim().toLowerCase();
      // `emailConfirmed !== false`: older tokens without the field still pass.
      if (!email || email !== String(s.lumaEmail).toLowerCase() || user.emailConfirmed === false) {
        return res
          .status(401)
          .json({ status: 'error', code: 'verify_email', message: "Verify the email you submitted with to edit this milestone." });
      }
    }
    if (!s.ecosystemPrize || !s.details.milestone) return fail(res, 404, 'Milestone not found');
    // Once the payout is settled the builder's part is locked; admins can still correct it.
    if (role === 'builder' && s.details.milestone.payoutStatus !== 'pending') {
      return fail(res, 409, 'This milestone is closed. Contact the organisers to change it.');
    }
    const v = validateMilestonePatch(req.body, role);
    if (!v.ok) return fail(res, 400, v.error);
    const updated = await programSubmissionRepository.updateTracked(s.id, {
      milestone: { ...s.details.milestone, ...v.value },
    });
    res.status(200).json({ status: 'success', data: role === 'admin' ? updated : toPublicSubmission(updated, { published: true }) });
    auditLog.logSafe({
      programId: ctx.program.id,
      actor: role === 'admin' ? actorOf(req) : { email: s.lumaEmail },
      action: 'tracked.milestone_update',
      targetType: 'submission',
      targetId: s.id,
      metadata: { fields: Object.keys(v.value), by: role },
    });
  } catch (error) {
    console.error('❌ Error updating a milestone:', error);
    fail(res, 500, 'Failed to update the milestone');
  }
}

export default new TrackedResultsController();
