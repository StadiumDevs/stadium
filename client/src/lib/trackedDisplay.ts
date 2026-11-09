import type { ApiPublicSubmission, ApiTrackedSubmission, JudgedTrack } from "./api";

export const ANONYMOUS = "Anonymous";

/**
 * The public view of a submission: no emails, and
 * anonymous entries hide every name. Used by the public page and by judges
 * (only admins read the full record). Prizes show only when `showPrizes`;
 * `showNames` keeps anonymous builders' names (admin views only). The viewing
 * key and birth height (they reveal the wallet's whole history) stay only in
 * judge and admin views (`forJudges`), never on the public page.
 */
export const toPublicSubmission = (
  s: ApiTrackedSubmission,
  { showPrizes, showNames = false, forJudges = false }: { showPrizes: boolean; showNames?: boolean; forJudges?: boolean },
): ApiPublicSubmission => {
  // The Bitrefill feedback stays in admin views (showNames) and the judge card.
  // The Telegram/WhatsApp contact is admins only (showNames), like the Bitrefill feedback.
  const { team, bitrefillFeedback, viewingKey, birthHeight, contact, ...rest } = s.details;
  const anon = !!s.details.anonymous && !showNames;
  return {
    id: s.id,
    projectTitle: s.projectTitle,
    projectBrief: s.projectBrief,
    submitterName: anon ? ANONYMOUS : s.submitterName,
    videoUrl: s.videoUrl,
    githubUrl: s.githubUrl,
    late: !!s.late,
    createdAt: s.createdAt,
    details: {
      ...rest,
      ...(showNames ? { bitrefillFeedback, contact } : {}),
      ...(forJudges ? { viewingKey, birthHeight } : {}),
      team: team.map((m) => ({ name: anon ? "Teammate" : m.name, role: m.role ?? null })),
    },
    prizes: showPrizes ? s.prizes : {},
    ecosystemPrize: showPrizes && s.ecosystemPrize,
    // AI feedback: only the published version, only once results are published (never the draft).
    ...(showPrizes && s.aiFeedback?.published ? { aiFeedback: s.aiFeedback.published } : {}),
    // The Bitrefill survey: admin views only, like the Bitrefill feedback.
    ...(showNames ? { feedback: s.feedback ?? null } : {}),
  };
};

/** The (track, prize) pairs a public submission won. */
export const prizeEntries = (s: ApiPublicSubmission) =>
  (Object.entries(s.prizes) as [JudgedTrack, NonNullable<ApiPublicSubmission["prizes"][JudgedTrack]>][]).filter(
    ([, p]) => !!p,
  );

export const formatPrize = (p: { amount: number; currency: string }) =>
  p.currency === "USD" ? `$${p.amount.toLocaleString("en-US")}` : `${p.amount} ${p.currency}`;
