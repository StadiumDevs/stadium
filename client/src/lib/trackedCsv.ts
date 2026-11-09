import { classifySubmission } from "./submissionCategories";
import type { ApiRubricLeaderboard, ApiTrackedSubmission, JudgedTrack } from "./api";
import { trackById, trackLabel, type ProgramJudge, type ProgramProfile } from "./programProfiles";

const cell = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const toCsv = (rows: (string | number | null | undefined)[][]) => rows.map((r) => r.map(cell).join(",")).join("\n");

export const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

/**
 * One row per submission, in submission order, with everything the grant
 * committee needs: track, point person, team, links, txid check, next
 * milestone, anonymity, builder feedback, and per track the rank, average, and
 * every judge's criterion scores, notes and session. For a ranked list use
 * buildRankedCsv.
 */
export function buildSubmissionsCsv(
  profile: ProgramProfile,
  submissions: ApiTrackedSubmission[],
  boards: Partial<Record<JudgedTrack, ApiRubricLeaderboard>>,
): string {
  const header: string[] = [
    "submittedAt",
    "projectTitle",
    "track",
    "themes",
    "pitch",
    "description",
    "pointPersonName",
    "pointPersonEmail",
    "contactApp",
    "contactHandle",
    "team",
    "appType",
    "publicUrl",
    "demoVideoUrl",
    "demoVideoLength",
    "repoUrl",
    "technologies",
    "testnetTxid",
    "viewingKey",
    "birthHeight",
    "txCheck",
    "nextMilestone",
    "nextMilestoneLinks",
    "builderFeedback",
    "privacyNote",
    "bitrefillWorked",
    "bitrefillDidnt",
    "bitrefillSurfaces",
    "bitrefillSurfacePrimary",
    "bitrefillAgentEnv",
    "bitrefillDeadlineStatus",
    "bitrefillBiggestBlocker",
    "bitrefillCouldntHandle",
    "bitrefillWouldKeepBuilding",
    "prizes",
    "ecosystemPrize",
    "anonymous",
    "late",
    "finalizedAt",
    "lastEditedAt",
    "lastEditedBy",
  ];
  const trackCols: { track: JudgedTrack; judges: string[]; criteria: string[] }[] = [];
  for (const t of profile.tracks) {
    const board = boards[t.id];
    if (!board) continue;
    const criteria = trackById(profile, t.id).rubric.criteria.map((c) => c.id);
    trackCols.push({ track: t.id, judges: board.judges, criteria });
    header.push(`${t.id}.rank`, `${t.id}.avgTotal`, `${t.id}.tieBrokenBy`);
    for (const j of board.judges) {
      header.push(`${t.id}.${j}.total`, ...criteria.map((c) => `${t.id}.${j}.${c}`), `${t.id}.${j}.notes`, `${t.id}.${j}.session`);
    }
  }

  const rows = submissions.map((s) => {
    const d = s.details;
    const row: (string | number | null)[] = [
      s.createdAt,
      s.projectTitle,
      trackLabel(profile, d.track),
      d.themes.join("; "),
      d.pitch,
      s.projectBrief,
      s.submitterName,
      s.lumaEmail,
      d.contact?.app ?? "",
      d.contact?.handle ?? "",
      d.team.map((m) => [m.name, m.email, m.role].filter(Boolean).join(" / ")).join("; "),
      d.appType,
      d.publicUrl,
      s.videoUrl,
      d.demoVideoLength ?? "",
      s.githubUrl,
      d.technologies.join("; "),
      d.testnetTxid,
      d.viewingKey ?? "",
      d.birthHeight ?? "",
      d.txCheck?.status ?? "",
      d.nextStep,
      (d.nextStepLinks ?? []).join("; "),
      d.frictionNotes,
      d.privacyNote ?? "",
      d.bitrefillFeedback?.worked ?? "",
      d.bitrefillFeedback?.didnt ?? "",
      (s.feedback?.surfaces ?? []).join("; "),
      s.feedback?.surfacesPrimary ?? "",
      s.feedback?.agentEnv ?? "",
      s.feedback?.deadlineStatus ?? "",
      s.feedback?.biggestBlocker ?? "",
      s.feedback?.couldntHandle ?? "",
      s.feedback?.wouldKeepBuilding ?? "",
      Object.values(s.prizes).map((p) => (p ? `${p.label} (${p.amount} ${p.currency})` : "")).join("; "),
      s.ecosystemPrize ? "yes" : "no",
      d.anonymous ? "yes" : "no",
      s.late ? "yes" : "no",
      s.finalizedAt ?? s.createdAt,
      s.lastEditedAt ?? s.updatedAt ?? "",
      [s.lastEditedByName, s.lastEditedByEmail].filter(Boolean).join(" / "),
    ];
    for (const tc of trackCols) {
      const r = boards[tc.track]?.rows.find((x) => x.submissionId === s.id);
      row.push(r ? r.rank : "", r ? fmt(r.avgTotal) : "", r?.tieBrokenBy ?? "");
      for (const j of tc.judges) {
        const js = r?.judgeScores.find((x) => x.judgeEmail === j);
        row.push(js ? js.total : "", ...tc.criteria.map((c) => (js ? js.criteria[c] ?? "" : "")), js?.notes ?? "", js?.session ?? "");
      }
    }
    return row;
  });

  return toCsv([header, ...rows]);
}

/** Judge name for a judge email (falls back to the email). */
const judgeName = (judges: ProgramJudge[], email: string) => judges.find((j) => j.email === email)?.name ?? email;

/** How the normalized columns relate (tooltip in the table, note in the CSV). */
export const NORMALIZATION_NOTE =
  "Judge-offset model: score = project quality + judge leniency, with the leniencies summing to 0 across the judges who have scored this track. " +
  "Projects scored by every one of those judges keep their raw average; only projects some judges missed move. " +
  "normTotal is fitted on the total. The criterion columns are fitted separately (clipped to each criterion's range, bonus raw) and used for display and tie-breaks only, " +
  "so they add up to normTotal except where a criterion was clipped or for the bonus.";

const Z_SCORE_NOTE =
  "Per-judge z-scores rescaled to the rubric (judges below the minimum number of scores are mean-centered). This rescales every judge, so projects every judge scored move too.";

const today = () => new Date().toISOString().slice(0, 10);

/** <slug>-<track>-ranked-normalized-<YYYY-MM-DD>.csv or …-ranked-raw-<date>.csv */
export const rankedCsvName = (slug: string, track: JudgedTrack, normalized: boolean, date = today()) =>
  `${slug}-${track}-ranked-${normalized ? "normalized" : "raw"}-${date}.csv`;

/**
 * One track's projects, ranked the way the table shows them. Normalized: in
 * normalized-rank order with the raw rank, rank change, coverage and the
 * normalized total and criteria. Raw: in raw-rank order with the raw tie-break
 * and no normalized columns. Both keep the project, links, team lead and
 * members, prize, Ecosystem Prize and testnet status, the builder's feedback,
 * and then every judge (by name): total, each criterion, note and session.
 * Normalized is ignored (raw) when the track can't normalize yet.
 */
export function buildRankedCsv(
  profile: ProgramProfile,
  track: JudgedTrack,
  board: ApiRubricLeaderboard,
  submissions: ApiTrackedSubmission[],
  judges: ProgramJudge[],
  { normalized = true }: { normalized?: boolean } = {},
): string {
  const rubric = trackById(profile, track).rubric;
  const criteria = rubric.criteria;
  const norm = normalized && !!board.normalization?.enabled && board.normalization.available !== false;
  const rows = [...board.rows].sort((a, b) =>
    norm ? (a.normRank ?? Infinity) - (b.normRank ?? Infinity) || a.rank - b.rank : (a.rawRank ?? a.rank) - (b.rawRank ?? b.rank),
  );
  const header: string[] = [
    "rank",
    ...(norm ? ["rawRank", "rankChange", "coverage", "fullyScored"] : []),
    "tieBrokenBy",
    "projectTitle",
    "category",
    "themes",
    ...(norm ? ["normTotal"] : []),
    "avgTotal",
    ...(norm ? criteria.filter((c) => !c.isBonus).map((c) => `${c.id}.norm`) : []),
    ...criteria.map((c) => (c.isBonus ? `${c.id}.judgesGiving` : `${c.id}.avg`)),
    "prize",
    "ecosystemPrize",
    "judgesScored",
    "pointPersonName",
    "pointPersonEmail",
    "contactApp",
    "contactHandle",
    "teamMembers",
    "publicUrl",
    "demoVideoUrl",
    "repoUrl",
    "testnetTxid",
    "viewingKey",
    "birthHeight",
    "txCheck",
    "nextMilestone",
    "builderFeedback",
    "privacyNote",
    "bitrefillWorked",
    "bitrefillDidnt",
  ];
  for (const email of board.judges) {
    const n = judgeName(judges, email);
    header.push(`${n} · total`, ...criteria.map((c) => `${n} · ${c.id}`), `${n} · note`, `${n} · session`);
  }
  if (norm) header.push("normalizationNote");
  const body = rows.map((r, i) => {
    const s = submissions.find((x) => x.id === r.submissionId);
    const d = s?.details;
    const row: (string | number | null)[] = [
      norm ? r.normRank ?? "" : r.rawRank ?? r.rank,
      ...(norm
        ? [r.rawRank ?? "", r.rankChange ?? "", r.coverage ? `${r.coverage.scored}/${r.coverage.of}` : "", r.fullyScored ? "yes" : "no"]
        : []),
      (norm ? r.normTieBrokenBy : r.rawTieBrokenBy) ?? r.tieBrokenBy ?? "",
      r.projectTitle,
      profile.categories?.length ? classifySubmission(profile.categories, s ?? { projectTitle: r.projectTitle }).label : "",
      (d?.themes ?? []).join("; "),
      ...(norm ? [r.normTotal == null ? "" : fmt(r.normTotal)] : []),
      fmt(r.avgTotal),
      ...(norm ? criteria.filter((c) => !c.isBonus).map((c) => (r.normByCriterion?.[c.id] == null ? "" : fmt(r.normByCriterion[c.id]))) : []),
      ...criteria.map((c) => (c.isBonus ? r.bonusCount : fmt(r.avgByCriterion[c.id] ?? 0))),
      r.prize ? `${r.prize.label} (${r.prize.amount} ${r.prize.currency})` : "",
      r.ecosystemPrize ? "yes" : "no",
      `${r.judgeCount}/${board.judges.length}`,
      s?.submitterName ?? r.submitterName,
      s?.lumaEmail ?? "",
      d?.contact?.app ?? "",
      d?.contact?.handle ?? "",
      (d?.team ?? []).map((m) => m.name).filter(Boolean).join("; "),
      d?.publicUrl ?? "",
      s?.videoUrl ?? "",
      s?.githubUrl ?? "",
      d?.testnetTxid ?? "",
      d?.viewingKey ?? "",
      d?.birthHeight ?? "",
      d?.txCheck?.status ?? "",
      d?.nextStep ?? "",
      d?.frictionNotes ?? "",
      d?.privacyNote ?? "",
      d?.bitrefillFeedback?.worked ?? "",
      d?.bitrefillFeedback?.didnt ?? "",
    ];
    for (const email of board.judges) {
      const js = r.judgeScores.find((x) => x.judgeEmail === email);
      row.push(js ? js.total : "", ...criteria.map((c) => (js ? js.criteria[c.id] ?? "" : "")), js?.notes ?? "", js?.session ?? "");
    }
    if (norm) row.push(i === 0 ? (board.normalization?.method === "zscore" ? Z_SCORE_NOTE : NORMALIZATION_NOTE) : "");
    return row;
  });
  return toCsv([header, ...body]);
}

/** Builder feedback (free text), newest first, for the admin list and its CSV. */
export type FeedbackItem = { projectTitle: string; track: string; pointPerson: string; note: string; submittedAt: string };

export function builderFeedback(profile: ProgramProfile, submissions: ApiTrackedSubmission[]): FeedbackItem[] {
  return submissions
    .filter((s) => (s.details.frictionNotes ?? "").trim())
    .map((s) => ({
      projectTitle: s.projectTitle,
      track: trackLabel(profile, s.details.track),
      pointPerson: s.submitterName,
      note: s.details.frictionNotes ?? "",
      submittedAt: s.createdAt,
    }))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export const buildFeedbackCsv = (items: FeedbackItem[]) =>
  toCsv([
    ["submittedAt", "projectTitle", "track", "pointPerson", "feedback"],
    ...items.map((i) => [i.submittedAt, i.projectTitle, i.track, i.pointPerson, i.note]),
  ]);
