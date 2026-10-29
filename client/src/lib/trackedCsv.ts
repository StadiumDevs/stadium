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
    "team",
    "appType",
    "publicUrl",
    "demoVideoUrl",
    "demoVideoLength",
    "repoUrl",
    "technologies",
    "testnetTxid",
    "txCheck",
    "nextMilestone",
    "nextMilestoneLinks",
    "builderFeedback",
    "prizes",
    "ecosystemPrize",
    "anonymous",
    "late",
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
      d.team.map((m) => [m.name, m.email, m.role].filter(Boolean).join(" / ")).join("; "),
      d.appType,
      d.publicUrl,
      s.videoUrl,
      d.demoVideoLength ?? "",
      s.githubUrl,
      d.technologies.join("; "),
      d.testnetTxid,
      d.txCheck?.status ?? "",
      d.nextStep,
      (d.nextStepLinks ?? []).join("; "),
      d.frictionNotes,
      Object.values(s.prizes).map((p) => (p ? `${p.label} (${p.amount} ${p.currency})` : "")).join("; "),
      s.ecosystemPrize ? "yes" : "no",
      d.anonymous ? "yes" : "no",
      s.late ? "yes" : "no",
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

/**
 * One track's projects in leaderboard order, with the averages, prize, links,
 * the builder's feedback, and then every judge (by name): total, each
 * criterion, their note (feedback) and the session they scored in.
 */
export function buildRankedCsv(
  profile: ProgramProfile,
  track: JudgedTrack,
  board: ApiRubricLeaderboard,
  submissions: ApiTrackedSubmission[],
  judges: ProgramJudge[],
): string {
  const rubric = trackById(profile, track).rubric;
  const criteria = rubric.criteria;
  const header: string[] = [
    "rank",
    "tieBrokenBy",
    "projectTitle",
    "avgTotal",
    ...criteria.map((c) => (c.isBonus ? `${c.id}.judgesGiving` : `${c.id}.avg`)),
    "prize",
    "ecosystemPrize",
    "judgesScored",
    "pointPersonName",
    "pointPersonEmail",
    "publicUrl",
    "demoVideoUrl",
    "repoUrl",
    "testnetTxid",
    "txCheck",
    "nextMilestone",
    "builderFeedback",
  ];
  for (const email of board.judges) {
    const n = judgeName(judges, email);
    header.push(`${n} · total`, ...criteria.map((c) => `${n} · ${c.id}`), `${n} · note`, `${n} · session`);
  }
  const rows = board.rows.map((r) => {
    const s = submissions.find((x) => x.id === r.submissionId);
    const d = s?.details;
    const row: (string | number | null)[] = [
      r.rank,
      r.tieBrokenBy ?? "",
      r.projectTitle,
      fmt(r.avgTotal),
      ...criteria.map((c) => (c.isBonus ? r.bonusCount : fmt(r.avgByCriterion[c.id] ?? 0))),
      r.prize ? `${r.prize.label} (${r.prize.amount} ${r.prize.currency})` : "",
      r.ecosystemPrize ? "yes" : "no",
      `${r.judgeCount}/${board.judges.length}`,
      s?.submitterName ?? r.submitterName,
      s?.lumaEmail ?? "",
      d?.publicUrl ?? "",
      s?.videoUrl ?? "",
      s?.githubUrl ?? "",
      d?.testnetTxid ?? "",
      d?.txCheck?.status ?? "",
      d?.nextStep ?? "",
      d?.frictionNotes ?? "",
    ];
    for (const email of board.judges) {
      const js = r.judgeScores.find((x) => x.judgeEmail === email);
      row.push(js ? js.total : "", ...criteria.map((c) => (js ? js.criteria[c.id] ?? "" : "")), js?.notes ?? "", js?.session ?? "");
    }
    return row;
  });
  return toCsv([header, ...rows]);
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
