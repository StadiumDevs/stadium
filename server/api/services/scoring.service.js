import programSubmissionRepository from '../repositories/program-submission.repository.js';
import submissionScoreRepository from '../repositories/submission-score.repository.js';
import programJudgeBallotRepository from '../repositories/program-judge-ballot.repository.js';
import programJudgeBatchRepository from '../repositories/program-judge-batch.repository.js';
import programAdminEmailRepository from '../repositories/program-admin-email.repository.js';
import programSignupRepository from '../repositories/program-signup.repository.js';
import { BATCH_SIZE } from '../utils/submission.validator.js';
import projectService from './project.service.js';

const normalizeEmail = (email) =>
  typeof email === 'string' ? email.trim().toLowerCase() : '';

// A real judge identity is an email. Wallet/admin sessions score under their
// wallet address (no '@') as a non-counting "preview", so the same person who is
// both an admin wallet and an email judge isn't double-counted.
const isEmailJudge = (judgeEmail) => typeof judgeEmail === 'string' && judgeEmail.includes('@');

const mean = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

// Batch N (1-based) holds submissions [(N-1)*BATCH_SIZE .. N*BATCH_SIZE) in the
// stable created_at order listByProgramId returns. Membership is derived, not stored.
const batchNumberForIndex = (i) => Math.floor(i / BATCH_SIZE) + 1;
const batchCountFor = (submissionCount) => Math.ceil(submissionCount / BATCH_SIZE);
// submissionId -> batchNumber, from an ordered submissions array.
const batchIndex = (submissions) => {
  const map = new Map();
  submissions.forEach((s, i) => map.set(s.id, batchNumberForIndex(i)));
  return map;
};

class ScoringService {
  // Submissions + this judge's own scores, each flagged with Luma eligibility.
  // `eligible` is advisory: a submission whose email isn't in program_signups is
  // flagged but still scoreable.
  async listForJudge(programId, judgeEmail) {
    const [submissions, myScores, signupEmails, registeredJudges, submittedBallots, ballot, myBatches, allClaims, allScores] =
      await Promise.all([
        programSubmissionRepository.listByProgramId(programId),
        submissionScoreRepository.listByJudge(programId, judgeEmail),
        programSignupRepository.listEmailsByProgramId(programId),
        programAdminEmailRepository.listJudges(programId),
        programJudgeBallotRepository.listSubmitted(programId),
        programJudgeBallotRepository.find(programId, judgeEmail),
        programJudgeBatchRepository.listByJudge(programId, judgeEmail),
        programJudgeBatchRepository.listByProgram(programId),
        submissionScoreRepository.listByProgramId(programId),
      ]);

    // listEmailsByProgramId returns a Set of raw signup emails; lowercase for a
    // case-insensitive match against the submission's Luma email.
    const eligibleSet = new Set([...signupEmails].map((e) => normalizeEmail(e)));
    const scoreBySubmission = new Map(myScores.map((s) => [s.submissionId, s]));
    const byBatch = batchIndex(submissions);

    const locked = ballot?.status === 'submitted';

    // Ballot progress so a judge who has submitted can see how many peers remain.
    // Counts are over registered judges only (no pending emails exposed here).
    const registeredEmails = registeredJudges.map((j) => normalizeEmail(j.email));
    const submittedEmails = new Set(submittedBallots.map((b) => normalizeEmail(b.judgeEmail)));
    const ballotProgress = {
      submitted: registeredEmails.filter((e) => submittedEmails.has(e)).length,
      total: registeredEmails.length,
    };

    // Batch coverage overview: how many judges have claimed each batch + whether
    // this judge has. Lets the panel show "Claim next 10" and per-batch coverage.
    const claimedSet = new Set(myBatches);
    // Who has claimed each batch (judges shown as "working on" it) and who has
    // saved a score for each submission. Both additive — the write path is
    // unchanged.
    const claimedByBatch = new Map();
    for (const c of allClaims) {
      if (!claimedByBatch.has(c.batchNumber)) claimedByBatch.set(c.batchNumber, []);
      claimedByBatch.get(c.batchNumber).push(c.judgeEmail);
    }
    const scoredBySubmission = new Map();
    const scoresBySubmission = new Map();
    for (const sc of allScores) {
      if (!isEmailJudge(sc.judgeEmail)) continue; // wallet/admin preview scores don't show
      if (!scoredBySubmission.has(sc.submissionId)) scoredBySubmission.set(sc.submissionId, []);
      scoredBySubmission.get(sc.submissionId).push(sc.judgeEmail);
      if (!scoresBySubmission.has(sc.submissionId)) scoresBySubmission.set(sc.submissionId, []);
      scoresBySubmission.get(sc.submissionId).push({
        judgeEmail: sc.judgeEmail,
        requirements: sc.requirements,
        techStack: sc.techStack,
        innovation: sc.innovation,
        total: Math.round((sc.requirements + sc.techStack + sc.innovation) * 10) / 10,
      });
    }
    const count = batchCountFor(submissions.length);
    const batches = [];
    for (let n = 1; n <= count; n += 1) {
      const start = (n - 1) * BATCH_SIZE;
      const claimedBy = claimedByBatch.get(n) || [];
      batches.push({
        batchNumber: n,
        size: Math.min(BATCH_SIZE, submissions.length - start),
        claimCount: claimedBy.length,
        claimedByMe: claimedSet.has(n),
        claimedBy,
      });
    }

    return {
      locked,
      ballotStatus: ballot?.status || 'in_progress',
      ballotProgress,
      batchSize: BATCH_SIZE,
      claimedBatches: myBatches,
      batches,
      submissions: submissions.map((s) => ({
        ...s,
        eligible: eligibleSet.has(normalizeEmail(s.lumaEmail)),
        myScore: scoreBySubmission.get(s.id) || null,
        batchNumber: byBatch.get(s.id),
        scoredBy: scoredBySubmission.get(s.id) || [],
        scores: scoresBySubmission.get(s.id) || [],
      })),
    };
  }

  // Claim a batch for this judge. With no batchNumber, picks the least-covered
  // batch (fewest claims; ties -> lowest number) the judge hasn't claimed, so
  // "Claim next 10" auto-distributes judges across batches. Returns the refreshed
  // judge view. { nothingToClaim:true } if the judge already holds every batch.
  async claimBatch(programId, judgeEmail, batchNumber) {
    const [submissions, allClaims, myBatches] = await Promise.all([
      programSubmissionRepository.listByProgramId(programId),
      programJudgeBatchRepository.listByProgram(programId),
      programJudgeBatchRepository.listByJudge(programId, judgeEmail),
    ]);
    const count = batchCountFor(submissions.length);
    if (count === 0) return { nothingToClaim: true, view: await this.listForJudge(programId, judgeEmail) };

    let target = batchNumber;
    if (target != null) {
      if (!Number.isInteger(target) || target < 1 || target > count) {
        return { invalid: true };
      }
    } else {
      const mine = new Set(myBatches);
      const claimCounts = new Map();
      for (const c of allClaims) claimCounts.set(c.batchNumber, (claimCounts.get(c.batchNumber) || 0) + 1);
      let best = null;
      for (let n = 1; n <= count; n += 1) {
        if (mine.has(n)) continue;
        const cov = claimCounts.get(n) || 0;
        if (best === null || cov < best.cov) best = { n, cov };
      }
      if (best === null) return { nothingToClaim: true, view: await this.listForJudge(programId, judgeEmail) };
      target = best.n;
    }

    await programJudgeBatchRepository.claim(programId, judgeEmail, target);
    return { claimed: target, view: await this.listForJudge(programId, judgeEmail) };
  }

  // Coverage gate: judging is complete once at least one judge has submitted AND
  // every submission has at least one score from a submitted judge. (Batches mean
  // not every judge scores every project, so the gate is coverage, not "all
  // judges submitted".) Gates winner selection.
  async isJudgingComplete(programId) {
    const [submittedBallots, submissions, allScores] = await Promise.all([
      programJudgeBallotRepository.listSubmitted(programId),
      programSubmissionRepository.listByProgramId(programId),
      submissionScoreRepository.listByProgramId(programId),
    ]);
    if (submittedBallots.length === 0 || submissions.length === 0) return false;
    const submitted = new Set(submittedBallots.map((b) => normalizeEmail(b.judgeEmail)));
    const scored = new Set(
      allScores.filter((s) => submitted.has(normalizeEmail(s.judgeEmail))).map((s) => s.submissionId),
    );
    return submissions.every((s) => scored.has(s.id));
  }

  // A judge finalizes once they've scored every submission in the batches THEY
  // claimed (and they've claimed at least one). Returns { ok } or
  // { ok:false, missing, total, noClaims? } so the controller can 409.
  async submitBallot(programId, judgeEmail) {
    const [submissions, myScores, myBatches] = await Promise.all([
      programSubmissionRepository.listByProgramId(programId),
      submissionScoreRepository.listByJudge(programId, judgeEmail),
      programJudgeBatchRepository.listByJudge(programId, judgeEmail),
    ]);
    if (myBatches.length === 0) {
      return { ok: false, noClaims: true, missing: 0, total: 0 };
    }
    const claimed = new Set(myBatches);
    const byBatch = batchIndex(submissions);
    const mine = submissions.filter((s) => claimed.has(byBatch.get(s.id)));
    const scored = new Set(myScores.map((s) => s.submissionId));
    const missing = mine.filter((s) => !scored.has(s.id));
    if (missing.length > 0) {
      return { ok: false, missing: missing.length, total: mine.length };
    }
    await programJudgeBallotRepository.markSubmitted(programId, judgeEmail);
    return { ok: true, total: mine.length };
  }

  // Promote a submission into a real Stadium `projects` row so it flows into the
  // existing project + payout tracking (team_members, payments, the admin
  // project tables). Idempotent: a submission promotes once. We carry over what
  // we have — title, repo, video, submitter as a team member — and stamp the
  // Luma email + video into the description since the project/team schema has no
  // email field. The payout wallet is added by an admin later (no wallet is
  // collected at submission time).
  // `bounty` lets the caller override the prize that lands on the winners panel
  // (e.g. a "Showcase" 100 EUR award); otherwise the submission's own awarded
  // prize is used. A submission with no prize promotes without a bounty row.
  async promoteToProject(program, submissionId, bounty = null) {
    const submission = await programSubmissionRepository.findById(submissionId);
    if (!submission || submission.programId !== program.id) return { notFound: true };
    if (submission.promotedProjectId) {
      return { alreadyPromoted: true, projectId: submission.promotedProjectId };
    }

    // Bounty for the winners panel: explicit override, else the awarded prize.
    const prizeName = bounty?.name || submission.prizeLabel || 'Prize';
    const prizeAmount = bounty?.amount ?? submission.prizeAmount ?? null;
    const prizeCurrency = bounty?.currency || submission.prizeCurrency || 'EUR';
    const bountyPrize =
      prizeAmount != null
        ? [{ name: prizeName, amount: prizeAmount, currency: prizeCurrency, hackathonWonAtId: program.slug }]
        : [];

    const project = await projectService.createProject({
      projectName: submission.projectTitle,
      // Do NOT embed the submitter's email here — project descriptions are
      // public. Contact stays admin-only (judging view + CSV export).
      description: `Hackathon submission by ${submission.submitterName}. Video demo: ${submission.videoUrl}`,
      projectRepo: submission.githubUrl,
      demoUrl: submission.videoUrl,
      // hackathon_*/project_state are NOT NULL on projects; backfill from the
      // program (hackathon_id mirrors the program slug; end date from the event).
      hackathon: { id: program.slug, name: program.name, endDate: program.eventEndsAt ?? program.eventStartsAt ?? null },
      program: { id: program.id },
      projectState: 'submitted',
      teamMembers: [{ name: submission.submitterName, github: submission.githubUrl }],
      bountyPrize,
    });

    await programSubmissionRepository.setPromotedProject(submissionId, project.id);
    return { project };
  }

  // The gated leaderboard. Locked until every submission has at least one score
  // from a submitted judge (coverage), since with batches not every judge scores
  // every project. When unlocked, ranks submissions by the mean of each submitted
  // judge's total (/12), with per-criterion means, the individual per-judge
  // scores, and tie-breaks on innovation then tech stack.
  async leaderboard(programId, judgeEmail = null) {
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
    const pendingJudges = registeredEmails.filter((e) => !submittedEmails.has(e));

    // Count every email-judge's saved score so results are LIVE as they score
    // (no ballot needed). Wallet/admin "preview" scores never count, so someone
    // who is both an admin wallet and an email judge isn't double-counted.
    // Coverage (`complete`) is informational + gates PUBLISH; it no longer hides
    // the standings.
    const scoresBySubmission = new Map();
    for (const score of allScores) {
      if (!isEmailJudge(score.judgeEmail)) continue;
      if (!scoresBySubmission.has(score.submissionId)) scoresBySubmission.set(score.submissionId, []);
      scoresBySubmission.get(score.submissionId).push(score);
    }

    const submissionsTotal = submissions.length;
    const submissionsScored = submissions.filter((s) => (scoresBySubmission.get(s.id) || []).length > 0).length;
    const complete = submissionsTotal > 0 && submissionsScored === submissionsTotal;

    // The viewing judge's own score per submission, so they can edit + re-save
    // straight from the results view.
    const me = normalizeEmail(judgeEmail);
    const myScores = new Map(
      allScores.filter((sc) => normalizeEmail(sc.judgeEmail) === me).map((sc) => [sc.submissionId, sc]),
    );

    const rows = submissions
      .map((s) => {
        const scores = scoresBySubmission.get(s.id) || [];
        const my = myScores.get(s.id);
        const avgRequirements = mean(scores.map((x) => x.requirements));
        const avgTechStack = mean(scores.map((x) => x.techStack));
        const avgInnovation = mean(scores.map((x) => x.innovation));
        return {
          submissionId: s.id,
          projectTitle: s.projectTitle,
          submitterName: s.submitterName,
          // Contact email — admin/judge view only (this endpoint is gated;
          // publicResults strips it). Lets admins reach winners.
          lumaEmail: s.lumaEmail,
          githubUrl: s.githubUrl,
          videoUrl: s.videoUrl,
          eligible: eligibleSet.has(normalizeEmail(s.lumaEmail)),
          late: s.late ?? false,
          avgTotal: avgRequirements + avgTechStack + avgInnovation,
          avgRequirements,
          avgTechStack,
          avgInnovation,
          judgeCount: scores.length,
          // Individual per-judge scores so the results view can show the breakdown.
          judgeScores: scores.map((x) => ({
            judgeEmail: x.judgeEmail,
            requirements: x.requirements,
            techStack: x.techStack,
            innovation: x.innovation,
            total: x.requirements + x.techStack + x.innovation,
          })),
          // The viewing judge's own score (null if they haven't scored it), so
          // they can edit + re-save it from the results view.
          myScore: my
            ? { requirements: my.requirements, techStack: my.techStack, innovation: my.innovation, notes: my.notes ?? '' }
            : null,
          // Current prize (winner) on this submission, so the results tab can
          // render selections against the rank order. Null = not a winner.
          prizeAmount: s.prizeAmount ?? null,
          prizeCurrency: s.prizeCurrency ?? null,
          prizeLabel: s.prizeLabel ?? null,
          // Whether this winner has been pushed into the central winners panel.
          promotedProjectId: s.promotedProjectId ?? null,
          // Payout tracking, so the results table can show + toggle PAID.
          paid: s.paid ?? false,
        };
      })
      .sort(
        (a, b) =>
          b.avgTotal - a.avgTotal ||
          b.avgInnovation - a.avgInnovation ||
          b.avgTechStack - a.avgTechStack,
      )
      .map((row, i) => ({ rank: i + 1, ...row }));

    return {
      locked: false,
      complete,
      submissionsScored,
      submissionsTotal,
      submitted: submittedBallots.length,
      total: registeredEmails.length,
      pendingJudges,
      rows,
    };
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
      late: s.late ?? false,
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
