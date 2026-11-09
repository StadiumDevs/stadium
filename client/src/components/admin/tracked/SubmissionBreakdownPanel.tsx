import { useMemo, useState } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ApiRubricLeaderboard, ApiTrackedSubmission } from "@/lib/api";
import { maxScore, trackById, type ProgramProfile } from "@/lib/programProfiles";
import { classifySubmission, countByCategory, themesOf } from "@/lib/submissionCategories";

// Organizer-only breakdown of the submissions: how many fall into each
// automatic category and each theme picked on the form, and how each category
// scores on the selected track. Read from the same live data as the ranked
// table, so the numbers never disagree.

const BAR = "hsl(var(--display-dim))";
const AXIS = "hsl(var(--label-dim))";
const tick = { fill: AXIS, fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const fmt = (n: number) => (Math.round(n * 100) / 100).toString();

type Datum = { label: string; value: number; note: string };

function HBarChart({ title, data, testId, domainMax }: { title: string; data: Datum[]; testId: string; domainMax?: number }) {
  if (!data.length) return null;
  return (
    <figure className="flex flex-col gap-1 min-w-0" data-testid={testId}>
      <figcaption className="label-hw text-display">{title}</figcaption>
      {/* Charts scroll sideways inside their own box at phone width. */}
      <div className="overflow-x-auto">
        <div className="min-w-[320px]" style={{ height: data.length * 26 + 16 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
              <XAxis type="number" hide domain={[0, domainMax ?? "dataMax"]} />
              <YAxis type="category" dataKey="label" width={130} tick={tick} axisLine={false} tickLine={false} interval={0} />
              <Tooltip
                cursor={{ fill: "hsl(var(--hairline-subtle))" }}
                contentStyle={{ background: "hsl(var(--panel-deep))", border: "1px solid hsl(var(--hairline))", fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--display))" }}
                itemStyle={{ color: "hsl(var(--body))" }}
                formatter={(_v: number, _n: string, item: { payload?: Datum }) => [item.payload?.note ?? "", ""]}
                separator=""
              />
              <Bar dataKey="value" fill={BAR} radius={[0, 2, 2, 0]} isAnimationActive={false}>
                {/* The value is printed on every bar: colour is never the only signal. */}
                <LabelList dataKey="value" position="right" formatter={(v: number) => fmt(v)} style={{ ...tick, fill: "hsl(var(--display))" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Same numbers as text for screen readers and keyboard users. */}
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.label}>{`${d.label}: ${d.note}`}</li>
        ))}
      </ul>
    </figure>
  );
}

export function SubmissionBreakdownPanel({
  profile,
  submissions,
  board,
  normalized,
}: {
  profile: ProgramProfile;
  submissions: ApiTrackedSubmission[];
  board: ApiRubricLeaderboard | null;
  /** The table's APPLY NORMALIZATION toggle (false when the track can't normalize yet). */
  normalized: boolean;
}) {
  const [open, setOpen] = useState(true);
  const categories = useMemo(() => profile.categories ?? [], [profile.categories]);

  const byCategory = useMemo<Datum[]>(
    () =>
      categories.length
        ? countByCategory(categories, submissions).map((c) => ({
            label: c.label,
            value: c.count,
            note: `${c.count} submission${c.count === 1 ? "" : "s"}`,
          }))
        : [],
    [categories, submissions],
  );

  const byTheme = useMemo<Datum[]>(() => {
    const counts = new Map<string, number>();
    for (const s of submissions) for (const t of themesOf(s)) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts]
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => ({ label: t.replace(/^\d+\.\s*/, ""), value: n, note: `${n} submission${n === 1 ? "" : "s"} (${t})` }));
  }, [submissions]);

  const track = board ? trackById(profile, board.track) : null;
  const scoreByCategory = useMemo<Datum[]>(() => {
    if (!board || !categories.length) return [];
    const sums = new Map<string, { label: string; total: number; n: number }>();
    for (const r of board.rows) {
      // Raw unless the toggle is on and the track normalizes (normTotal is null otherwise).
      const v = normalized && r.normTotal != null ? r.normTotal : r.judgeCount > 0 ? r.avgTotal : null;
      if (v == null) continue; // not scored yet: missing, not zero
      const s = submissions.find((x) => x.id === r.submissionId);
      const c = classifySubmission(categories, s ?? { projectTitle: r.projectTitle });
      const cur = sums.get(c.id) ?? { label: c.label, total: 0, n: 0 };
      cur.total += v;
      cur.n += 1;
      sums.set(c.id, cur);
    }
    return [...sums.values()]
      .map((x) => ({ label: x.label, value: x.total / x.n, note: `average ${fmt(x.total / x.n)} over ${x.n} scored project${x.n === 1 ? "" : "s"}` }))
      .sort((a, b) => b.value - a.value);
  }, [board, categories, submissions, normalized]);

  if (!submissions.length) return null;

  return (
    <div className="lcd p-3 space-y-3" data-testid="submission-breakdown">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-hw text-display">·SUBMISSION BREAKDOWN</span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="label-hw-dim hover:text-display"
          data-testid="submission-breakdown-toggle"
        >
          {submissions.length} SUBMISSIONS · {open ? "HIDE ▴" : "SHOW ▾"}
        </button>
      </div>
      {open && (
        <>
          {categories.length > 0 && (
            <p className="label-hw-dim normal-case">
              Categories are assigned automatically from each project's title, pitch and description (keyword match),
              and update when a team edits them. Themes are what teams picked on the form; a project with several
              themes counts once in each.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <HBarChart title="BY CATEGORY" data={byCategory} testId="chart-by-category" />
            <HBarChart title="BY THEME" data={byTheme} testId="chart-by-theme" />
            {track && (
              <HBarChart
                title={`${track.shortLabel.toUpperCase()} · AVG ${normalized ? "NORMALIZED " : ""}SCORE BY CATEGORY (/ ${maxScore(track.rubric)})`}
                data={scoreByCategory}
                testId="chart-score-by-category"
                domainMax={maxScore(track.rubric)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
