// Platform admin: AI feedback for a tracked program's project pages. Generate
// a draft per project from its normalized scores and the judges' notes,
// review/edit drafts, then publish them all (or unpublish). Only the published
// version is ever public (public-submission.js), and only after results.

import programService from '../services/program.service.js';
import programSubmissionRepository from '../repositories/program-submission.repository.js';
import submissionRubricScoreRepository from '../repositories/submission-rubric-score.repository.js';
import { trackedProgramFor } from '../constants/trackedPrograms.js';
import { loadPublicScores } from '../services/public-scores.service.js';
import { AI_FEEDBACK_MODEL, AiFeedbackError, aiFeedbackConfigured, cleanFeedback, generateFeedback } from '../services/ai-feedback.service.js';
import auditLog from '../services/program-audit-log.service.js';

const fail = (res, code, message) => res.status(code).json({ status: 'error', message });
const actorOf = (req) => ({ chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email });

async function load(req, res) {
  if (req.user?.isGlobalAdmin !== true) {
    fail(res, 403, 'Only platform admins can manage AI feedback');
    return null;
  }
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
  if (!program.resultsPublishedAt) {
    fail(res, 409, 'Publish the results first: AI feedback is written from the final scores');
    return null;
  }
  return { tracked, program };
}

const row = (s, scores) => ({
  id: s.id,
  title: s.projectTitle,
  track: s.details?.track ?? null,
  scored: !!scores,
  aiFeedback: s.aiFeedback ?? null,
});

class AiFeedbackController {
  // Every counted project with its scored state and AI feedback (draft + published).
  async list(req, res) {
    try {
      const ctx = await load(req, res);
      if (!ctx) return;
      const [all, { bySubmission }] = await Promise.all([
        programSubmissionRepository.listByProgramId(ctx.program.id, { status: 'submitted' }),
        loadPublicScores(ctx.program, ctx.tracked),
      ]);
      const subs = all.filter((s) => !s.isTestEntry && s.details);
      res.status(200).json({
        status: 'success',
        data: { configured: aiFeedbackConfigured(), model: AI_FEEDBACK_MODEL, projects: subs.map((s) => row(s, bySubmission.get(s.id))) },
      });
    } catch (error) {
      console.error('❌ Error listing AI feedback:', error);
      fail(res, 500, 'Failed to load AI feedback');
    }
  }

  // Generate (or regenerate) one project's draft.
  async generate(req, res) {
    try {
      const ctx = await load(req, res);
      if (!ctx) return;
      if (!aiFeedbackConfigured()) return fail(res, 503, "AI feedback isn't configured (ANTHROPIC_API_KEY is not set on the server)");
      const s = await programSubmissionRepository.findById(req.params.submissionId);
      if (!s || s.programId !== ctx.program.id || !s.details) return fail(res, 404, 'Submission not found');
      const [{ bySubmission }, scores] = await Promise.all([
        loadPublicScores(ctx.program, ctx.tracked),
        submissionRubricScoreRepository.listByProgram(ctx.program.id),
      ]);
      const byTrack = bySubmission.get(s.id);
      const track = byTrack ? Object.keys(byTrack)[0] : null;
      if (!track) return fail(res, 409, 'This project has no published judge scores to write feedback from');
      const notes = scores
        .filter((x) => x.submissionId === s.id && x.track === track && typeof x.notes === 'string' && x.notes.trim())
        .map((x) => x.notes.trim());
      const draft = await generateFeedback({
        title: s.projectTitle,
        pitch: s.details?.pitch ?? '',
        description: s.projectBrief ?? '',
        track,
        score: byTrack[track],
        notes,
      });
      const aiFeedback = { ...(s.aiFeedback ?? {}), draft, model: AI_FEEDBACK_MODEL, generatedAt: new Date().toISOString() };
      const updated = await programSubmissionRepository.updateTracked(s.id, { aiFeedback });
      res.status(200).json({ status: 'success', data: row(updated, byTrack) });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: actorOf(req),
        action: 'tracked.ai_feedback_generate',
        targetType: 'submission',
        targetId: s.id,
        metadata: { model: AI_FEEDBACK_MODEL, notes: notes.length },
      });
    } catch (error) {
      if (error instanceof AiFeedbackError) return fail(res, error.status, error.message);
      console.error('❌ Error generating AI feedback:', error);
      fail(res, 500, 'Failed to generate AI feedback');
    }
  }

  // Edit one project's draft (the published version changes only on publish).
  async update(req, res) {
    try {
      const ctx = await load(req, res);
      if (!ctx) return;
      const s = await programSubmissionRepository.findById(req.params.submissionId);
      if (!s || s.programId !== ctx.program.id || !s.details) return fail(res, 404, 'Submission not found');
      let draft;
      try {
        draft = cleanFeedback(req.body?.draft);
      } catch (e) {
        return fail(res, 400, e.message);
      }
      const updated = await programSubmissionRepository.updateTracked(s.id, { aiFeedback: { ...(s.aiFeedback ?? {}), draft } });
      res.status(200).json({ status: 'success', data: row(updated, true) });
      auditLog.logSafe({ programId: ctx.program.id, actor: actorOf(req), action: 'tracked.ai_feedback_edit', targetType: 'submission', targetId: s.id, metadata: null });
    } catch (error) {
      console.error('❌ Error saving AI feedback:', error);
      fail(res, 500, 'Failed to save AI feedback');
    }
  }

  // Publish every draft (copies draft → published), or unpublish all.
  async setPublished(req, res, publish) {
    try {
      const ctx = await load(req, res);
      if (!ctx) return;
      const all = await programSubmissionRepository.listByProgramId(ctx.program.id);
      const at = new Date().toISOString();
      let count = 0;
      for (const s of all) {
        const fb = s.aiFeedback;
        if (publish ? !fb?.draft : !fb?.published) continue;
        const next = publish ? { ...fb, published: fb.draft, publishedAt: at } : { ...fb, published: null, publishedAt: null };
        await programSubmissionRepository.updateTracked(s.id, { aiFeedback: next });
        count += 1;
      }
      res.status(200).json({ status: 'success', data: { count, publishedAt: publish ? at : null } });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: actorOf(req),
        action: publish ? 'tracked.ai_feedback_publish' : 'tracked.ai_feedback_unpublish',
        targetType: 'program',
        targetId: ctx.program.id,
        metadata: { count },
      });
    } catch (error) {
      console.error('❌ Error publishing AI feedback:', error);
      fail(res, 500, 'Failed to update AI feedback');
    }
  }

  publish(req, res) {
    return this.setPublished(req, res, true);
  }

  unpublish(req, res) {
    return this.setPublished(req, res, false);
  }
}

const controller = new AiFeedbackController();
// Bound so routes can pass the methods directly.
export default {
  list: controller.list.bind(controller),
  generate: controller.generate.bind(controller),
  update: controller.update.bind(controller),
  publish: controller.publish.bind(controller),
  unpublish: controller.unpublish.bind(controller),
};
