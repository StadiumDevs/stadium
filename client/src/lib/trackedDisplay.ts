import type { ApiPublicSubmission, JudgedTrack } from "./api";

/** The (track, prize) pairs a public submission won. */
export const prizeEntries = (s: ApiPublicSubmission) =>
  (Object.entries(s.prizes) as [JudgedTrack, NonNullable<ApiPublicSubmission["prizes"][JudgedTrack]>][]).filter(
    ([, p]) => !!p,
  );

export const formatPrize = (p: { amount: number; currency: string }) =>
  p.currency === "USD" ? `$${p.amount.toLocaleString("en-US")}` : `${p.amount} ${p.currency}`;
