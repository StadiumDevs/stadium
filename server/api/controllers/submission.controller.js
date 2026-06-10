import programService from '../services/program.service.js';
import scoringService from '../services/scoring.service.js';
import programSubmissionRepository from '../repositories/program-submission.repository.js';
import submissionScoreRepository from '../repositories/submission-score.repository.js';
import programJudgeBallotRepository from '../repositories/program-judge-ballot.repository.js';
import { validateSubmission, validateScore } from '../utils/submission.validator.js';
import auditLog from '../services/program-audit-log.service.js';

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
      const { submission, duplicate } = await programSubmissionRepository.create({
        programId: program.id,
        ...v.value,
      });
      if (duplicate) {
        return res.status(409).json({
          status: 'error',
          message: 'A project has already been submitted with this email for this program.',
        });
      }
      return res.status(201).json({ status: 'success', data: { id: submission.id } });
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

      // Locked once the judge has submitted their ballot (reopen is iteration 2).
      if (await programJudgeBallotRepository.isSubmitted(programId, judgeEmail)) {
        return res.status(409).json({
          status: 'error',
          message: 'Your scores are submitted and locked. Ask an admin to reopen them to edit.',
        });
      }

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

  // Admin: promote a submission into a Stadium project for payout/team tracking.
  // Admin-gated (requireProgramAdmin) — judges cannot create projects.
  async promote(req, res) {
    try {
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
