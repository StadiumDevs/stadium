// The prize winners and submission stats page (tracked programs with a stats
// config). Platform admins preview the live stats with the data checks and
// publish a snapshot; the public endpoint serves only that snapshot, so later
// score, prize or feedback changes need a republish to go public.

import programService from '../services/program.service.js';
import programRepository from '../repositories/program.repository.js';
import programSubmissionRepository from '../repositories/program-submission.repository.js';
import submissionRubricScoreRepository from '../repositories/submission-rubric-score.repository.js';
import programAdminEmailRepository from '../repositories/program-admin-email.repository.js';
import experienceRatingRepository from '../repositories/submission-experience-rating.repository.js';
import { trackedProgramFor, isAbandoned, isCountedEntry } from '../constants/trackedPrograms.js';
import { programStatsFor } from '../constants/programStats.js';
import { computeChecks, computeStats, publicSnapshot, statsFingerprint } from '../services/program-stats.service.js';
import { loadPrivacyReview } from '../services/privacy-review.service.js';
import { renderStatsLlms } from '../services/stats-llms.service.js';
import { loadProjectFeedback, projectFeedbackChecks } from '../services/project-feedback.service.js';

/** Where the public stats page lives (linked from the llms.txt). */
const siteOrigin = () => (process.env.PUBLIC_SITE_URL || 'https://stadium.joinwebzero.com').replace(/\/+$/, '');
import auditLog from '../services/program-audit-log.service.js';

const isPlatformAdmin = (req) => req.user?.isGlobalAdmin === true;
const fail = (res, code, message) => res.status(code).json({ status: 'error', message });

async function loadContext(req, res) {
  const config = programStatsFor(req.params.slug);
  const tracked = trackedProgramFor(req.params.slug);
  if (!config || !tracked) {
    fail(res, 404, 'This program has no stats page');
    return null;
  }
  const program = await programService.findBySlug(req.params.slug);
  if (!program) {
    fail(res, 404, 'Program not found');
    return null;
  }
  return { config, tracked, program };
}

/** Live stats and checks from the database. */
async function liveStats({ config, tracked, program }) {
  const [all, scores, judges, ratings] = await Promise.all([
    programSubmissionRepository.listByProgramId(program.id, { status: 'submitted' }),
    submissionRubricScoreRepository.listByProgram(program.id),
    programAdminEmailRepository.listJudges(program.id),
    experienceRatingRepository.listByProgramId(program.id),
  ]);
  const counted = all.filter((s) => isCountedEntry(s, tracked, program));
  const testEntries = all.filter((s) => s.isTestEntry && !isAbandoned(s, tracked, program));
  const review = loadPrivacyReview(program.slug, config.privacyReview);
  const stats = computeStats({ program, submissions: counted, scores, judges, ratings, config, review });
  const checks = computeChecks({ counted, testEntries, stats, config, review });
  // Judges' feedback fixture: rows that match no submission (or several) show here.
  const feedback = projectFeedbackChecks(loadProjectFeedback(program.slug, config.projectFeedback), counted);
  return { stats, checks: feedback ? { ...checks, projectFeedback: feedback } : checks };
}

class ProgramStatsController {
  // Public: the published snapshot, or 404 before publishing.
  async getPublished(req, res) {
    try {
      const ctx = await loadContext(req, res);
      if (!ctx) return;
      const snapshot = ctx.program.statsPublishedAt ? await programRepository.getStatsSnapshot(ctx.program.slug) : null;
      if (!snapshot) return fail(res, 404, 'Stats are not published yet');
      res.status(200).json({ status: 'success', data: { stats: publicSnapshot(snapshot), publishedAt: ctx.program.statsPublishedAt } });
    } catch (error) {
      console.error('❌ Error loading published stats:', error);
      fail(res, 500, 'Failed to load the stats');
    }
  }

  // Public: the published snapshot as llms.txt, or 404 before publishing.
  async getLlms(req, res) {
    try {
      const ctx = await loadContext(req, res);
      if (!ctx) return;
      const snapshot = ctx.program.statsPublishedAt ? await programRepository.getStatsSnapshot(ctx.program.slug) : null;
      if (!snapshot) return fail(res, 404, 'Stats are not published yet');
      const text = renderStatsLlms({
        program: { name: ctx.program.name, slug: ctx.program.slug },
        stats: publicSnapshot(snapshot),
        publishedAt: ctx.program.statsPublishedAt,
        url: `${siteOrigin()}/programs/${ctx.program.slug}/stats`,
      });
      const date = String(ctx.program.statsPublishedAt).slice(0, 10);
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.set('Content-Disposition', `inline; filename="${ctx.program.slug}-stats-llms-${date}.txt"`);
      res.status(200).send(text);
    } catch (error) {
      console.error('❌ Error rendering stats llms.txt:', error);
      fail(res, 500, 'Failed to render the stats');
    }
  }

  // Platform admin: live stats, data checks, and whether they differ from the snapshot.
  async preview(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can preview the stats');
      const ctx = await loadContext(req, res);
      if (!ctx) return;
      const { stats, checks } = await liveStats(ctx);
      const snapshot = ctx.program.statsPublishedAt ? await programRepository.getStatsSnapshot(ctx.program.slug) : null;
      res.status(200).json({
        status: 'success',
        data: {
          stats,
          checks,
          publishedAt: ctx.program.statsPublishedAt ?? null,
          changedSincePublish: !!snapshot && statsFingerprint(publicSnapshot(snapshot)) !== statsFingerprint(publicSnapshot(stats)),
        },
      });
    } catch (error) {
      console.error('❌ Error previewing stats:', error);
      fail(res, 500, 'Failed to build the stats');
    }
  }

  // Platform admin: publish (or republish) the snapshot. Checks are never stored.
  async publish(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can publish the stats');
      const ctx = await loadContext(req, res);
      if (!ctx) return;
      const { stats } = await liveStats(ctx);
      // The composite ranking is admin only (a CSV in the preview): never published.
      const published = publicSnapshot(stats);
      const updated = await programRepository.setStatsSnapshot(ctx.program.slug, published, stats.generatedAt);
      res.status(200).json({ status: 'success', data: { stats: published, publishedAt: updated.statsPublishedAt } });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: { chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email },
        action: ctx.program.statsPublishedAt ? 'stats.republish' : 'stats.publish',
        targetType: 'program',
        targetId: ctx.program.id,
        metadata: null,
      });
    } catch (error) {
      console.error('❌ Error publishing stats:', error);
      fail(res, 500, 'Failed to publish the stats');
    }
  }
}

export default new ProgramStatsController();
