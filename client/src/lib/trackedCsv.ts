import type { ApiRubricLeaderboard, ApiTrackedSubmission, JudgedTrack } from "./api";
import { trackById, trackLabel, type ProgramProfile } from "./programProfiles";

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
 * One row per submission with everything the grant committee needs: track,
 * point person, team, links, txid check, next milestone, anonymity, friction, and per track the
 * rank, average, and every judge's criterion scores, notes and session.
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
    "frictionAreas",
    "frictionNotes",
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
      d.frictionAreas.join("; "),
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

export type FrictionGroup = {
  area: string;
  items: { projectTitle: string; track: string; pointPerson: string; notes: string }[];
};

/** Friction notes grouped by area (a note tagged with two areas appears under both). */
export function groupFriction(profile: ProgramProfile, submissions: ApiTrackedSubmission[]): FrictionGroup[] {
  const groups = new Map<string, FrictionGroup>();
  for (const area of [...profile.frictionAreas, "Untagged"]) groups.set(area, { area, items: [] });
  for (const s of submissions) {
    const notes = s.details.frictionNotes;
    if (!notes) continue;
    const areas = s.details.frictionAreas.length ? s.details.frictionAreas : ["Untagged"];
    for (const area of areas) {
      if (!groups.has(area)) groups.set(area, { area, items: [] });
      groups.get(area)?.items.push({
        projectTitle: s.projectTitle,
        track: trackLabel(profile, s.details.track),
        pointPerson: s.submitterName,
        notes,
      });
    }
  }
  return [...groups.values()].filter((g) => g.items.length > 0);
}

export const buildFrictionCsv = (groups: FrictionGroup[]) =>
  toCsv([
    ["area", "projectTitle", "track", "pointPerson", "notes"],
    ...groups.flatMap((g) => g.items.map((i) => [g.area, i.projectTitle, i.track, i.pointPerson, i.notes])),
  ]);
