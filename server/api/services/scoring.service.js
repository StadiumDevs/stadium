import programSubmissionRepository from '../repositories/program-submission.repository.js';
import submissionScoreRepository from '../repositories/submission-score.repository.js';
import programJudgeBallotRepository from '../repositories/program-judge-ballot.repository.js';
import programAdminEmailRepository from '../repositories/program-admin-email.repository.js';
import programSignupRepository from '../repositories/program-signup.repository.js';
import projectService from './project.service.js';

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

const mean = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

class ScoringService {
  // Submissions + this judge's own scores, each flagged with Luma eligibility.
  // `eligible` is advisory: a submission whose email isn't in program_signups is
  // flagged but still scoreable.
  async listForJudge(programId, judgeEmail) {
    const [submissions, myScores, signupEmails, registeredJudges, submittedBallots, ballot] =
      await Promise.all([
        programSubmissionRepository.listByProgramId(programId),
        submissionScoreRepository.listByJudge(programId, judgeEmail),
        programSignupRepository.listEmailsByProgramId(programId),
        programAdminEmailRepository.listJudges(programId),
        programJudgeBallotRepository.listSubmitted(programId),
        programJudgeBallotRepository.find(programId, judgeEmail),
      ]);

    // listEmailsByProgramId returns a Set of raw signup emails; lowercase for a
    // case-insensitive match against the submission's Luma email.
    const eligibleSet = new Set([...signupEmails].map((e) => normalizeEmail(e)));
    const scoreBySubmission = new Map(myScores.map((s) => [s.submissionId, s]));

    const locked = ballot?.status === 'submitted';

    // Ballot progress so a judge who has submitted can see how many peers remain.
    // Counts are over registered judges only (no pending emails exposed here).
    const registeredEmails = registeredJudges.map((j) => normalizeEmail(j.email));
    const submittedEmails = new Set(submittedBallots.map((b) => normalizeEmail(b.judgeEmail)));
    const ballotProgress = {
      submitted: registeredEmails.filter((e) => submittedEmails.has(e)).length,
      total: registeredEmails.length,
    };

    return {
      locked,
      ballotStatus: ballot?.status || 'in_progress',
      ballotProgress,
      submissions: submissions.map((s) => ({
        ...s,
        eligible: eligibleSet.has(normalizeEmail(s.lumaEmail)),
        myScore: scoreBySubmission.get(s.id) || null,
      })),
    };
  }

  // True once every registered judge has submitted (and there's at least one).
  // Gates winner selection — no prizes until judging is complete.
  async isJudgingComplete(programId) {
    const [registeredJudges, submittedBallots] = await Promise.all([
      programAdminEmailRepository.listJudges(programId),
      programJudgeBallotRepository.listSubmitted(programId),
    ]);
    const registeredEmails = registeredJudges.map((j) => normalizeEmail(j.email));
    if (registeredEmails.length === 0) return false;
    const submittedEmails = new Set(submittedBallots.map((b) => normalizeEmail(b.judgeEmail)));
    return registeredEmails.every((e) => submittedEmails.has(e));
  }

  // A judge may only finalize once they've scored every submission. Returns
  // { ok } or { ok:false, missing } so the controller can 409 with a count.
  async submitBallot(programId, judgeEmail) {
    const [submissions, myScores] = await Promise.all([
      programSubmissionRepository.listByProgramId(programId),
      submissionScoreRepository.listByJudge(programId, judgeEmail),
    ]);
    const scored = new Set(myScores.map((s) => s.submissionId));
    const missing = submissions.filter((s) => !scored.has(s.id));
    if (missing.length > 0) {
      return { ok: false, missing: missing.length, total: submissions.length };
    }
    await programJudgeBallotRepository.markSubmitted(programId, judgeEmail);
    return { ok: true, total: submissions.length };
  }

  // Promote a submission into a real Stadium `projects` row so it flows into the
  // existing project + payout tracking (team_members, payments, the admin
  // project tables). Idempotent: a submission promotes once. We carry over what
  // we have — title, repo, video, submitter as a team member — and stamp the
  // Luma email + video into the description since the project/team schema has no
  // email field. The payout wallet is added by an admin later (no wallet is
  // collected at submission time).
  async promoteToProject(program, submissionId) {
    const submission = await programSubmissionRepository.findById(submissionId);
    if (!submission || submission.programId !== program.id) return { notFound: true };
    if (submission.promotedProjectId) {
      return { alreadyPromoted: true, projectId: submission.promotedProjectId };
    }

    const project = await projectService.createProject({
      projectName: submission.projectTitle,
      description:
        `Hackathon submission by ${submission.submitterName} (${submission.lumaEmail}).` +
        ` Video demo: ${submission.videoUrl}`,
      projectRepo: submission.githubUrl,
      demoUrl: submission.videoUrl,
      // hackathon_* are NOT NULL on projects; backfill from the program (same
      // convention as elsewhere — hackathon_id mirrors the program slug).
      hackathon: { id: program.slug, name: program.name },
      program: { id: program.id },
      teamMembers: [{ name: submission.submitterName, github: submission.githubUrl }],
    });

    await programSubmissionRepository.setPromotedProject(submissionId, project.id);
    return { project };
  }

  // The gated leaderboard. Locked until every registered judge has submitted.
  // When unlocked, ranks submissions by the mean of each submitted judge's
  // total (/12), with per-criterion means and tie-breaks on innovation then
  // tech stack.
  async leaderboard(programId) {
    const [registeredJudges, submittedBallots, submissions, allScores, signupEmails] = await Promise.all([
      programAdminEmailRepository.listJudges(programId),
      programJudgeBallotRepository.listSubmitted(programId),
      programSubmissionRepository.listByProgramId(programId),
      submissionScoreRepository.listByProgramId(programId),
      programSignupRepository.listEmailsByProgramId(programId),
    ]);
    const eligibleSet = new Set([...signupEmails].map((e) => normalizeEmail(e)));

    const registeredEmails = registeredJudges.map((j) => normalizeEmail(j.email));
    const submittedEmails = new Set(submittedBallots.map((b) => normalizeEmail(b.judgeEmail)));
    const pending = registeredEmails.filter((e) => !submittedEmails.has(e));

    const total = registeredEmails.length;
    const submittedCount = registeredEmails.filter((e) => submittedEmails.has(e)).length;

    if (total === 0 || pending.length > 0) {
      return { locked: true, submitted: submittedCount, total, pending };
    }

    // Only count scores from registered judges who actually submitted. Ignores
    // wallet-admin "preview" scores and any stale rows.
    const counted = new Set(registeredEmails.filter((e) => submittedEmails.has(e)));
    const scoresBySubmission = new Map();
    for (const score of allScores) {
      if (!counted.has(normalizeEmail(score.judgeEmail))) continue;
      if (!scoresBySubmission.has(score.submissionId)) scoresBySubmission.set(score.submissionId, []);
      scoresBySubmission.get(score.submissionId).push(score);
    }

    const rows = submissions
      .map((s) => {
        const scores = scoresBySubmission.get(s.id) || [];
        const avgRequirements = mean(scores.map((x) => x.requirements));
        const avgTechStack = mean(scores.map((x) => x.techStack));
        const avgInnovation = mean(scores.map((x) => x.innovation));
        return {
          submissionId: s.id,
          projectTitle: s.projectTitle,
          submitterName: s.submitterName,
          githubUrl: s.githubUrl,
          videoUrl: s.videoUrl,
          eligible: eligibleSet.has(normalizeEmail(s.lumaEmail)),
          avgTotal: avgRequirements + avgTechStack + avgInnovation,
          avgRequirements,
          avgTechStack,
          avgInnovation,
          judgeCount: scores.length,
          // Current prize (winner) on this submission, so the results tab can
          // render selections against the rank order. Null = not a winner.
          prizeAmount: s.prizeAmount ?? null,
          prizeCurrency: s.prizeCurrency ?? null,
          prizeLabel: s.prizeLabel ?? null,
        };
      })
      .sort(
        (a, b) =>
          b.avgTotal - a.avgTotal ||
          b.avgInnovation - a.avgInnovation ||
          b.avgTechStack - a.avgTechStack,
      )
      .map((row, i) => ({ rank: i + 1, ...row }));

    return { locked: false, submitted: submittedCount, total, rows };
  }

  // Public, PII-free results for the program page. Only exposes submissions once
  // a platform admin has published (program.resultsPublishedAt set). Winners are
  // ordered first (prize amount desc), then the rest by submission order. Never
  // includes the Luma email or any scores — only the winner badge + prize.
  async publicResults(program) {
    if (!program?.resultsPublishedAt) {
      return { published: false, prizeTiers: program?.prizeTiers ?? null, submissions: [] };
    }
    const submissions = await programSubmissionRepository.listByProgramId(program.id);
    const cards = submissions.map((s) => ({
      projectTitle: s.projectTitle,
      projectBrief: s.projectBrief ?? null,
      submitterName: s.submitterName,
      videoUrl: s.videoUrl,
      githubUrl: s.githubUrl,
      prize:
        s.prizeAmount != null
          ? { amount: s.prizeAmount, currency: s.prizeCurrency, label: s.prizeLabel }
          : null,
    }));
    cards.sort((a, b) => {
      const pa = a.prize?.amount ?? -1;
      const pb = b.prize?.amount ?? -1;
      return pb - pa; // winners (higher prize) first; stable for the rest
    });
    return { published: true, prizeTiers: program.prizeTiers ?? null, submissions: cards };
  }
}

export default new ScoringService();
