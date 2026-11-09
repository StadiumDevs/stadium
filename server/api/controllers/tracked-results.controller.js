// Tracked programs (Free Society Hack): the leaderboard, awards by track, the
// Ecosystem Prize, judging progress, winner pages, milestones and the testnet
// transaction re-check. The behaviour mirrors the playground
// (client/src/lib/mockTrackedSubmissions.ts); data access goes through the
// Supabase repositories.

import programService from '../services/program.service.js';
import programSubmissionRepository from '../repositories/program-submission.repository.js';
import submissionRubricScoreRepository from '../repositories/submission-rubric-score.repository.js';
import programAdminEmailRepository from '../repositories/program-admin-email.repository.js';
import { trackedProgramFor, isCountedEntry } from '../constants/trackedPrograms.js';
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
import { tierBelongsToTrack, tierLimit } from '../utils/track-prize-tiers.js';
import { loadPublicScores } from '../services/public-scores.service.js';
import { loadProjectFeedback, feedbackBySubmission } from '../services/project-feedback.service.js';
import { programStatsFor } from '../constants/programStats.js';
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
      const [all, scores, judges] = await Promise.all([
        // Drafts count too while submissions are open (judges may score an entry
        // before the team finalizes it); abandoned ones don't.
        programSubmissionRepository.listByProgramId(ctx.program.id),
        submissionRubricScoreRepository.listByProgram(ctx.program.id),
        programAdminEmailRepository.listJudges(ctx.program.id),
      ]);
      const submissions = all.filter((s) => isCountedEntry(s, ctx.tracked, ctx.program));
      const board = computeLeaderboard({ track, submissions, scores, judges });
      if (isJudgeOnly(req)) {
        const me = req.user.email.toLowerCase();
        const nameOf = new Map(judges.map((j) => [j.email, j.name || j.email.split('@')[0]]));
        const mask = (e) => (e === me ? e : nameOf.get(e) ?? 'Judge');
        board.judges = board.judges.map(mask);
        // Judge calibration (each judge's mean, SD, bias and per-score
        // contribution) is for organizers only, so judges don't adjust toward
        // the panel mid-round.
        delete board.judgeStats;
        for (const r of board.rows) {
          r.judgeScores = r.judgeScores.map(({ normContribution, method, ...x }) => ({ ...x, judgeEmail: mask(x.judgeEmail) }));
        }
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
      const [all, scores, judges] = await Promise.all([
        // Drafts count too while submissions are open; abandoned ones don't.
        programSubmissionRepository.listByProgramId(ctx.program.id),
        submissionRubricScoreRepository.listByProgram(ctx.program.id),
        programAdminEmailRepository.listJudges(ctx.program.id),
      ]);
      const submissions = all.filter((s) => isCountedEntry(s, ctx.tracked, ctx.program));
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
      // A platform admin may award a project that isn't (fully) scored or hits the
      // winner gate, after confirming in the UI; it's recorded in the audit log.
      const override = req.body?.override === true;
      const overridden = [];
      let tier = null;
      if (amount !== null) {
        // Prefixed tiers belong to their track; unprefixed ones ("Zcash ecosystem prize") to the Ecosystem track.
        const tiers = prizeTiersFor(ctx.program);
        tier = tiers.find((t) => sameAmount(t.amount, amount) && tierBelongsToTrack(t, track, ctx.tracked));
        if (!tier) return fail(res, 400, 'That prize is not one of this track\'s tiers');
        const scores = await submissionRubricScoreRepository.listByProgram(ctx.program.id);
        if (!hasFullScore(track, scores, s.id)) {
          if (!override) return res.status(409).json({ status: 'error', code: 'NOT_FULLY_SCORED', message: 'No judge has fully scored this project in this track yet.' });
          overridden.push('not_fully_scored');
        }
        const blocked = winnerBlockedReason(track, scores, s.id);
        if (blocked) {
          if (!override) return res.status(409).json({ status: 'error', code: 'WINNER_BLOCKED', message: blocked });
          overridden.push('winner_blocked');
        }
        const limit = tierLimit(tier, track, ctx.tracked, prizeTiersFor(ctx.program));
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
        metadata: { track, amount: tier?.amount ?? null, label: tier?.label ?? null, ...(overridden.length ? { override: overridden } : {}) },
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

  // Platform admin: set an entry's track (e.g. a draft finalized with none).
  // Works after the deadline and doesn't require the track's other fields.
  // Refused while the entry holds a prize in a track it would leave; rubric
  // scores are kept (they only count on the entry's current tracks).
  async setTrack(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can change a track');
      const ctx = await loadTracked(req, res);
      if (!ctx) return;
      const track = req.body?.track;
      if (!ctx.tracked.submissionTracks.includes(track)) return fail(res, 400, `Unknown track: ${track}`);
      const s = await loadSubmission(req, res, ctx.program);
      if (!s) return;
      const from = s.details.track ?? s.track ?? null;
      if (from === track) return res.status(200).json({ status: 'success', data: s });
      const keeps = judgedTracksOf(track);
      const lost = Object.keys(s.prizes || {}).filter((t) => s.prizes[t] && !keeps.includes(t));
      if (lost.length) return fail(res, 409, `Remove the ${lost.join(' and ')} prize first.`);
      const updated = await programSubmissionRepository.setTrack(s.id, track);
      res.status(200).json({ status: 'success', data: updated });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: actorOf(req),
        action: 'tracked.set_track',
        targetType: 'submission',
        targetId: s.id,
        metadata: { from, to: track },
      });
    } catch (error) {
      console.error('❌ Error setting the track:', error);
      fail(res, 500, 'Failed to update the track');
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
      const [{ bySubmission }, all] = await Promise.all([
        loadPublicScores(ctx.program, ctx.tracked),
        programSubmissionRepository.listByProgramId(ctx.program.id, { status: 'submitted' }),
      ]);
      const feedback = feedbackBySubmission(
        loadProjectFeedback(ctx.program.slug, programStatsFor(ctx.program.slug)?.projectFeedback),
        all.filter((x) => !x.isTestEntry),
      );
      const data = toPublicSubmission(s, { published: true });
      res.status(200).json({
        status: 'success',
        data: {
          ...data,
          ...(bySubmission.has(s.id) ? { scores: bySubmission.get(s.id) } : {}),
          ...(feedback.has(s.id) ? { feedback: feedback.get(s.id) } : {}),
        },
      });
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

  // Judge or program admin: re-run the testnet transaction check now.
  async recheckTx(req, res) {
    try {
      const ctx = await loadTracked(req, res);
      if (!ctx) return;
      const isJudgeOnly = req.user?.role === 'judge';
      // A judge limited to some tracks re-checks only if one of them takes a txid (Privacy).
      const judgeTracks = isJudgeOnly ? req.user.tracks : null;
      if (Array.isArray(judgeTracks) && !judgeTracks.some((t) => ctx.tracked.txidTracks.includes(t))) {
        return fail(res, 403, 'Only Privacy judges can re-check a testnet transaction');
      }
      const s = await loadSubmission(req, res, ctx.program);
      if (!s) return;
      if (!s.details.testnetTxid) return fail(res, 409, 'This submission has no testnet transaction id');
      const updated = await checkAndStore(s.id, s.details.testnetTxid);
      if (!updated) return fail(res, 502, "Couldn't save the check. Try again.");
      // Same shape judges get from listTracked: anonymous entries hide who edited them.
      const data = isJudgeOnly && updated.details?.anonymous ? { ...updated, lastEditedByName: null, lastEditedByEmail: null } : updated;
      res.status(200).json({ status: 'success', data });
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
