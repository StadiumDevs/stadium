// The privacy track tech review section of the stats page: types for the
// versioned fixture (server/fixtures/<slug>/privacy-track-review/v<version>.json)
// and a line-for-line port of server/api/services/privacy-review.service.js
// (matching, refs, admin checks), so the playground builds the section exactly
// like production. The server's program-stats-parity.test.js checks both agree.

import type { StatsProject } from "./programStats";

export type ReviewTools = Record<
  | "noirWallet"
  | "zcashDevtool"
  | "zkool"
  | "zingoCli"
  | "librustzcash"
  | "zallet"
  | "pczt"
  | "frost"
  | "halo2"
  | "nearIntents"
  | "mcp"
  | "llmApi"
  | "x402"
  | "bitrefill",
  boolean | null
>;

export type ReviewProject = {
  shortName: string;
  title: string;
  track: "privacy" | "both";
  repo: string | null;
  commit: string | null;
  lastCommitIst: string | null;
  afterDeadline: boolean;
  language: string | null;
  readable: boolean;
  notReadableReason: string | null;
  tools: ReviewTools;
  nym: string | null;
  webzjs: string | null;
  zips: number[];
};

export type PrivacyReviewData = {
  version: {
    version: string;
    generated: string;
    generatedDate: string;
    generatedBy: string;
    reposRead: string | null;
    reposReadDate: string;
    githubSearch: string | null;
    changelog: { version: string; date: string; text: string }[];
  };
  scope: string[];
  countingRule: string;
  columnDefinitions: { column: string; rule: string }[];
  headline: {
    submissions: number;
    readable: number;
    noirWallet: number;
    nymRouted: number;
    nymBuiltIn: number;
    nymThroughZingo: number;
    webzjs: number;
    upstreamDuringHack: number;
    upstreamTeams: number;
    afterDeadline: number;
  };
  notReadable: { shortName: string; reason: string }[];
  projects: ReviewProject[];
  charts: {
    reach: { key: string; label: string; projects: string[] }[];
    nym: { status: string; projects: string[] }[];
    webzjs: { status: string; projects: string[] }[];
    blocks: { key: string; label: string; projects: string[] }[];
    languages: { language: string; projects: string[] }[];
  };
  nymDetails: string;
  webzjsNote: string;
  shieldedFeatures: { feature: string; count: number; of: number; search: string }[];
  zips: { zip: number; name: string; asCited: boolean; theme: string; use: string; projects: string[] }[];
  zipThemes: string[];
  newZips: { projects: string[]; zips: { label: string; zip: number | null }[]; what: string }[];
  upstream: {
    project: string;
    author: string;
    repo: string;
    number: number | null;
    type: string;
    title: string;
    status: string;
    date: string;
    when: string;
    url: string;
    duringHack: boolean;
  }[];
  upstreamDescription: string;
  upstreamCaveats: Record<string, string>;
  friction: { theme: string; projects: { name: string; shortName: string | null }[] }[];
  frictionNote: string;
  findings: { lead: string; text: string }[];
};

/** The review as published in the stats snapshot: the fixture plus a project per short name. */
export type PrivacyReview = PrivacyReviewData & { refs: Record<string, StatsProject> };

export type PrivacyReviewRowCheck = { shortName: string; title: string; repo: string | null; candidates: string[] };
export type PrivacyReviewChecks = {
  version: string;
  total: number;
  matched: number;
  byRepo: number;
  byTitle: number;
  unmatched: PrivacyReviewRowCheck[];
  ambiguous: PrivacyReviewRowCheck[];
};

type MatchSubmission = {
  id: string;
  projectTitle: string;
  githubUrl?: string | null;
  prizes?: Record<string, unknown> | null;
  details?: { track: string } | null;
};
type RowMatch = { shortName: string; status: "matched" | "unmatched" | "ambiguous"; by: "repo" | "title" | null; submissionId: string | null; candidates: string[] };

// ── Port ──

export const normalizeRepo = (url: unknown): string | null =>
  typeof url === "string" && url.trim()
    ? url
        .trim()
        .toLowerCase()
        .replace(/\/+$/, "")
        .replace(/\.git$/, "")
        .replace(/\/+$/, "")
    : null;

const REVIEW_TRACKS = ["privacy", "both"];
const hasPrize = (s: MatchSubmission) => Object.keys(s.prizes ?? {}).length > 0;

export function matchReviewRows(review: PrivacyReviewData, submissions: MatchSubmission[]): RowMatch[] {
  const pool = submissions.filter((s) => REVIEW_TRACKS.includes(s.details?.track ?? ""));
  const rows: RowMatch[] = review.projects.map((p) => {
    const repo = normalizeRepo(p.repo);
    const byRepo = repo ? pool.filter((s) => normalizeRepo(s.githubUrl) === repo) : [];
    if (byRepo.length === 1) return { shortName: p.shortName, status: "matched", by: "repo", submissionId: byRepo[0].id, candidates: [] };
    if (byRepo.length > 1) return { shortName: p.shortName, status: "ambiguous", by: "repo", submissionId: null, candidates: byRepo.map((s) => s.projectTitle) };
    const byTitle = pool.filter((s) => String(s.projectTitle ?? "").trim() === p.title.trim());
    if (byTitle.length === 1) return { shortName: p.shortName, status: "matched", by: "title", submissionId: byTitle[0].id, candidates: [] };
    if (byTitle.length > 1) return { shortName: p.shortName, status: "ambiguous", by: "title", submissionId: null, candidates: byTitle.map((s) => s.projectTitle) };
    return { shortName: p.shortName, status: "unmatched", by: null, submissionId: null, candidates: [] };
  });
  const claims = new Map<string, string[]>();
  for (const r of rows) if (r.submissionId) claims.set(r.submissionId, [...(claims.get(r.submissionId) ?? []), r.shortName]);
  const byId = new Map(pool.map((s) => [s.id, s]));
  return rows.map((r) => {
    const shared = r.submissionId ? claims.get(r.submissionId) : null;
    if (shared && shared.length > 1) {
      return {
        ...r,
        status: "ambiguous",
        submissionId: null,
        candidates: [`${byId.get(r.submissionId!)!.projectTitle} (also matched by ${shared.filter((n) => n !== r.shortName).join(", ")})`],
      };
    }
    return r;
  });
}

export function buildPrivacyReview(review: PrivacyReviewData | null, submissions: MatchSubmission[]): PrivacyReview | null {
  if (!review) return null;
  const byId = new Map(submissions.map((s) => [s.id, s]));
  const refs: Record<string, StatsProject> = {};
  for (const m of matchReviewRows(review, submissions)) {
    const p = review.projects.find((x) => x.shortName === m.shortName)!;
    const s = m.submissionId ? byId.get(m.submissionId) : null;
    refs[m.shortName] = {
      id: s ? s.id : `review:${m.shortName}`,
      title: m.shortName,
      track: s?.details?.track ?? p.track,
      linkable: !!s && hasPrize(s),
    };
  }
  return { ...review, refs };
}

export function privacyReviewChecks(review: PrivacyReviewData | null, submissions: MatchSubmission[]): PrivacyReviewChecks | null {
  if (!review) return null;
  const rows = matchReviewRows(review, submissions);
  const info = (r: RowMatch): PrivacyReviewRowCheck => {
    const p = review.projects.find((x) => x.shortName === r.shortName)!;
    return { shortName: r.shortName, title: p.title, repo: p.repo, candidates: r.candidates };
  };
  return {
    version: review.version.version,
    total: rows.length,
    matched: rows.filter((r) => r.status === "matched").length,
    byRepo: rows.filter((r) => r.status === "matched" && r.by === "repo").length,
    byTitle: rows.filter((r) => r.status === "matched" && r.by === "title").length,
    unmatched: rows.filter((r) => r.status === "unmatched").map(info),
    ambiguous: rows.filter((r) => r.status === "ambiguous").map(info),
  };
}
