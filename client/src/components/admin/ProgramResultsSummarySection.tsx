import { useEffect, useState } from "react";
import { ExternalLink, Github, Loader2 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  api,
  USE_MOCK_DATA,
  type ApiProgram,
  type ApiProgramStats,
  type ApiLeaderboard,
  type ApiLeaderboardRow,
  type ApiResultsFeedbackAggregate,
  type AdminAuthArg,
} from "@/lib/api";
import { LCDStat } from "@/components/lcd-stat";

// ── helpers ─────────────────────────────────────────────────────────────────

function eventHours(program: ApiProgram): number | null {
  if (!program.eventStartsAt || !program.eventEndsAt) return null;
  const ms = new Date(program.eventEndsAt).getTime() - new Date(program.eventStartsAt).getTime();
  if (ms <= 0) return null;
  return Math.round(ms / 3_600_000);
}

function top3By(
  rows: ApiLeaderboardRow[],
  key: "avgRequirements" | "avgTechStack" | "avgInnovation",
): ApiLeaderboardRow[] {
  return [...rows]
    .filter((r) => r[key] > 0)
    .sort((a, b) => b[key] - a[key])
    .slice(0, 3);
}

function buildFeedbackInsights(agg: ApiResultsFeedbackAggregate): string {
  const parts: string[] = [];

  // Would keep building: match "yes…" or "maybe" prefix, case-insensitive
  const keepEntries = Object.entries(agg.wouldKeepBuilding);
  const keepTotal = keepEntries.reduce((s, [, v]) => s + v, 0);
  if (keepTotal > 0) {
    const continuers = keepEntries
      .filter(([k]) => /^yes/i.test(k) || /^maybe/i.test(k))
      .reduce((s, [, v]) => s + v, 0);
    parts.push(`${Math.round((continuers / keepTotal) * 100)}% plan to keep building.`);
  }

  // Deadline: find top outcome by count and categorise by pattern
  const deadlineEntries = Object.entries(agg.deadlineStatus).sort((a, b) => b[1] - a[1]);
  if (deadlineEntries.length > 0) {
    const [top, topCount] = [deadlineEntries[0][0], deadlineEntries[0][1]];
    const deadlineTotal = deadlineEntries.reduce((s, [, v]) => s + v, 0);
    const topPct = Math.round((topCount / deadlineTotal) * 100);
    if (/bought and paid/i.test(top)) {
      parts.push(`${topPct}% completed a full autonomous purchase.`);
    } else if (/couldn.t get a core flow/i.test(top)) {
      parts.push(`${topPct}% couldn't get a core flow going.`);
    }
  }

  // Top blocker from tally
  const blockerEntries = Object.entries(agg.biggestBlocker ?? {}).sort((a, b) => b[1] - a[1]);
  if (blockerEntries.length > 0 && blockerEntries[0][1] > 1) {
    const [label, count] = blockerEntries[0];
    if (label.length < 80) {
      parts.push(`Top blocker: "${label}" (${count} teams).`);
    }
  }

  return parts.join(" ");
}

// ── sub-components ──────────────────────────────────────────────────────────

function ProjectLink({ url, icon }: { url?: string | null; icon: "video" | "github" }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-label-mid hover:text-display"
      aria-label={icon === "github" ? "GitHub" : "Video"}
    >
      {icon === "github" ? (
        <Github className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </a>
  );
}

function CategoryColumn({
  title,
  rows,
  scoreKey,
  maxScore,
}: {
  title: string;
  rows: ApiLeaderboardRow[];
  scoreKey: "avgRequirements" | "avgTechStack" | "avgInnovation";
  maxScore: number;
}) {
  const safeRows = rows ?? [];
  return (
    <div className="panel p-3 flex-1 min-w-0">
      <div className="label-hw text-display mb-2">·{title}</div>
      {safeRows.length === 0 ? (
        <p className="label-hw-dim">No scored submissions.</p>
      ) : (
        <div className="space-y-2">
          {safeRows.map((r, i) => (
            <div key={r.submissionId} className="flex items-start gap-2">
              <span className="lcd px-1.5 py-0.5 label-hw text-display shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="label-hw text-display truncate">{r.projectTitle}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="label-hw-dim">{r[scoreKey].toFixed(1)} / {maxScore}</span>
                  <ProjectLink url={r.videoUrl} icon="video" />
                  <ProjectLink url={r.githubUrl} icon="github" />
                </div>
                {r.judgeScores && r.judgeScores.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {r.judgeScores.map((js) => (
                      <div key={js.judgeEmail} className="label-hw-dim text-[9px] truncate">
                        {js.judgeEmail}: {scoreKey === "avgRequirements" ? js.requirements : scoreKey === "avgTechStack" ? js.techStack : js.innovation}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackChart({
  title,
  counts,
}: {
  title: string;
  counts: Record<string, number>;
}) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  const data = entries.map(([name, value]) => ({ name, value }));
  const maxVal = Math.max(...data.map((d) => d.value));

  // min-w-[1px] + debounce prevents Recharts creating a 0-dim canvas pattern
  // when the admin panel first opens (layout still in flight).
  // Y-axis width is computed from the longest label so long option strings
  // don't overflow; tickFormatter truncates anything that still doesn't fit.
  const longestLabel = Math.max(...entries.map(([k]) => k.length));
  const yAxisWidth = Math.min(160, Math.max(80, Math.ceil(longestLabel * 5.4)));
  const maxChars = Math.floor(yAxisWidth / 5.4);

  return (
    <div className="min-w-0" style={{ minWidth: 1 }}>
      <div className="label-hw-dim mb-1">{title.toUpperCase()}</div>
      <ResponsiveContainer width="100%" height={data.length * 28 + 10} debounce={50}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
        >
          <XAxis
            type="number"
            domain={[0, maxVal]}
            tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--color-label-mid)" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={yAxisWidth}
            tickFormatter={(v: string) => v.length > maxChars ? v.slice(0, maxChars - 1) + "…" : v}
            tick={{ fontSize: 9, fontFamily: "monospace", fill: "var(--color-label-mid)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-panel-deep)",
              border: "1px solid var(--color-hairline)",
              fontSize: 10,
              fontFamily: "monospace",
            }}
            cursor={{ fill: "var(--color-panel-deep)" }}
          />
          <Bar dataKey="value" fill="var(--color-display)" radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── main component ──────────────────────────────────────────────────────────

export function ProgramResultsSummarySection({
  program,
  getAuth,
}: {
  program: ApiProgram;
  getAuth: () => Promise<AdminAuthArg>;
}) {
  const [leaderboard, setLeaderboard] = useState<ApiLeaderboard | null>(null);
  const [stats, setStats] = useState<ApiProgramStats | null>(null);
  const [feedback, setFeedback] = useState<ApiResultsFeedbackAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    // In mock mode the API functions ignore the auth header — skip the wallet
    // signing call entirely so the preview works without a real token.
    const authPromise: Promise<AdminAuthArg> = USE_MOCK_DATA
      ? Promise.resolve({} as AdminAuthArg)
      : getAuth();

    authPromise
      .then((authHeader) =>
        Promise.allSettled([
          api.getLeaderboard(program.slug, authHeader),
          api.getProgramStats(program.slug, authHeader),
          api.getFeedbackAggregate(program.slug, authHeader),
        ]),
      )
      .then(([lb, st, fb]) => {
        if (!active) return;
        if (lb.status === "fulfilled") setLeaderboard(lb.value.data);
        if (st.status === "fulfilled") setStats(st.value.data);
        if (fb.status === "fulfilled") setFeedback(fb.value.data);
      })
      .catch(() => { /* silently degrade — sections render with empty states */ })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  // getAuth is a stable memoised ref — intentionally excluded to run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program.slug, refreshTick]);

  const hours = eventHours(program);
  const rows = leaderboard?.rows ?? [];
  const winners = rows.filter((r) => r.prizeAmount != null).sort((a, b) => (b.prizeAmount ?? 0) - (a.prizeAmount ?? 0));
  const mentions = program.honoraryMentions ?? [];

  return (
    <div className="mb-3 space-y-3">
      <div className="panel px-3 py-2.5">
        <div className="flex items-center justify-between mb-3">
          <div className="label-hw text-display">·RESULTS SUMMARY</div>
          <button
            onClick={() => { setLoading(true); setRefreshTick((n) => n + 1); }}
            disabled={loading}
            className="label-hw-dim hover:text-display text-[10px] tracking-widest disabled:opacity-40"
          >
            {loading ? "LOADING…" : "↺ REFRESH"}
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <LCDStat size="sm" value={stats?.confirmedParticipants ?? "—"} label="Checked in" />
          <LCDStat size="sm" value={stats?.submissionsCount ?? "—"} label="Submissions" />
          <LCDStat size="sm" value={leaderboard ? winners.length : "—"} label="Winners" />
          <LCDStat size="sm" value={hours ?? "—"} label="Hours of hacking" />
        </div>

        {loading && (
          <div className="flex items-center gap-2 label-hw-dim py-4">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            LOADING RESULTS DATA…
          </div>
        )}

        {!loading && leaderboard && (
          <>
            {/* Top 3 per scoring category */}
            <div className="label-hw-dim mb-1">·TOP 3 PER CATEGORY</div>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <CategoryColumn
                title="REQUIREMENTS"
                rows={top3By(rows, "avgRequirements")}
                scoreKey="avgRequirements"
                maxScore={2}
              />
              <CategoryColumn
                title="TECH STACK"
                rows={top3By(rows, "avgTechStack")}
                scoreKey="avgTechStack"
                maxScore={5}
              />
              <CategoryColumn
                title="INNOVATION"
                rows={top3By(rows, "avgInnovation")}
                scoreKey="avgInnovation"
                maxScore={5}
              />
            </div>

            {/* Winners */}
            {winners.length > 0 && (
              <div className="mb-4">
                <div className="label-hw-dim mb-2">·PRIZE WINNERS</div>
                <div className="space-y-1.5">
                  {winners.map((r) => (
                    <div key={r.submissionId} className="lcd px-3 py-2 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="label-hw text-display">{r.projectTitle}</span>
                        {r.submitterName && (
                          <span className="label-hw-dim ml-2">{r.submitterName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="label-hw text-display">
                          {r.prizeLabel ?? `${r.prizeAmount} ${r.prizeCurrency}`}
                        </span>
                        {r.paid && (
                          <span className="lcd px-1.5 py-0.5 label-hw text-display">PAID</span>
                        )}
                        <ProjectLink url={r.videoUrl} icon="video" />
                        <ProjectLink url={r.githubUrl} icon="github" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Honorary mentions */}
        {mentions.length > 0 && (
          <div className="mb-4">
            <div className="label-hw-dim mb-2">·HONORARY MENTIONS</div>
            <div className="space-y-1.5">
              {mentions.map((m, i) => (
                <div key={i} className="lcd px-3 py-2 flex items-center gap-3">
                  <span className="label-hw text-display flex-1">{m.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <ProjectLink url={m.videoUrl} icon="video" />
                    <ProjectLink url={m.githubUrl} icon="github" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback visualization */}
        {!loading && feedback && feedback.total > 0 && (
          <div className="mb-4">
            <div className="label-hw-dim mb-2">
              ·PARTICIPANT FEEDBACK ({feedback.total} response{feedback.total !== 1 ? "s" : ""})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
              <FeedbackChart title="Where did you land?" counts={feedback.deadlineStatus} />
              <FeedbackChart title="Would keep building" counts={feedback.wouldKeepBuilding} />
              <FeedbackChart title="Agent environment" counts={feedback.agentEnv} />
              <FeedbackChart title="Surfaces used" counts={feedback.surfaces} />
              <FeedbackChart title="Primary surface" counts={feedback.surfacesPrimary} />
              <FeedbackChart title="Biggest blocker" counts={feedback.biggestBlocker} />
            </div>
            {(feedback.couldntHandleSamples ?? []).length > 0 && (
              <div className="mb-2">
                <div className="label-hw-dim mb-1">·WHAT BITREFILL COULDN'T HANDLE (OPEN TEXT)</div>
                <ul className="space-y-1">
                  {(feedback.couldntHandleSamples ?? []).slice(0, 10).map((s, i) => (
                    <li key={i} className="label-hw-dim text-[11px]">- {s}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="panel-deep border border-hairline px-3 py-2 mt-2">
              <p className="text-body text-sm leading-relaxed">
                {buildFeedbackInsights(feedback)}
              </p>
            </div>
          </div>
        )}

        {/* Gallery preview */}
        {program.galleryUrl && (
          <div>
            <div className="label-hw-dim mb-2">·EVENT GALLERY</div>
            <div className="flex items-center gap-3">
              <div className="grid grid-cols-3 gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-16 h-10 bg-panel-deep border border-hairline" aria-hidden="true" />
                ))}
              </div>
              <a
                href={program.galleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-3 py-1.5 inline-flex items-center gap-1.5"
              >
                VIEW PHOTOS <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
