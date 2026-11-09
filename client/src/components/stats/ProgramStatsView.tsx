import { useState } from "react";
import type { ProgramStats, StatsCompositeRow } from "@/lib/programStats";
import { TRACK_LABELS } from "@/lib/programStats";
import { cn } from "@/lib/utils";
import { BarList, ChartFrame, ProjectNames, StackedBars } from "./StatsCharts";
import { PrivacyReviewSection } from "./PrivacyReviewSection";
import { formatIst, STATS_SECTIONS, TRACK_COLORS } from "@/lib/statsDisplay";

export function UpdatedAt({ at }: { at: string }) {
  return (
    <p className="label-hw-dim normal-case" data-testid="stats-updated">
      Updated {formatIst(at)}
    </p>
  );
}

const JUDGED_TRACKS: { id: string; label: string }[] = [
  { id: "privacy", label: "Privacy" },
  { id: "agentic", label: "Agentic Commerce" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={`stats-${id}`} className="panel p-4 mb-4 scroll-mt-24" aria-labelledby={`stats-${id}-title`} data-testid={`stats-section-${id}`}>
      <h2 id={`stats-${id}-title`} className="label-hw text-display mb-3">
        ·{title.toUpperCase()}
      </h2>
      {children}
    </section>
  );
}

const pct = (n: number) => `${Math.round(n * 10) / 10}`;
const prizeText = (p: { label: string; amount: number | string; currency: string }) =>
  `${p.label.replace(/^[^:]+:\s*/, "")} (${p.amount} ${p.currency})`;

function Breakdown({ row }: { row: StatsCompositeRow }) {
  const b = row.breakdown;
  const shipped = b.shipped.publicUrl + b.shipped.demoVideo + b.shipped.repo;
  return (
    <span className="font-mono text-[11px] text-label-mid">
      {b.judge == null ? "judge —" : `judge ${pct(b.judge)}`} · support {b.support} · milestone {b.milestone} · shipped {shipped} (
      {[b.shipped.publicUrl && "URL", b.shipped.demoVideo && "video", b.shipped.repo && "repo"].filter(Boolean).join(", ") || "none"})
      {row.noJudgeScore && " · scaled to 100 without the judge signal"}
    </span>
  );
}

/** The whole stats page body: used by the public page and the admin preview. */
export function ProgramStatsView({ stats, slug, sticky = true }: { stats: ProgramStats; slug: string; sticky?: boolean }) {
  const [cat, setCat] = useState(stats.topByCategory[0]?.id ?? "");
  const [fbGroup, setFbGroup] = useState("all");
  const top = stats.topByCategory.find((c) => c.id === cat) ?? stats.topByCategory[0];
  const fb = stats.feedback.groups.find((g) => g.id === fbGroup) ?? stats.feedback.groups[0];
  const trackLegend = Object.entries(TRACK_LABELS).map(([id, label]) => ({ label, color: TRACK_COLORS[id] }));

  return (
    <div data-testid="program-stats">
      <nav
        className={cn("z-20 mb-4 border border-hairline bg-panel-deep/95 backdrop-blur px-2 py-1.5 overflow-x-auto", sticky && "sticky top-0")}
        aria-label="Stats sections"
        data-testid="stats-nav"
      >
        <ul className="flex gap-1 whitespace-nowrap">
          {STATS_SECTIONS.filter((s) => s.id !== "privacy-review" || stats.privacyReview).map((s) => (
            <li key={s.id}>
              <a href={`#stats-${s.id}`} className="label-hw-dim hover:text-display px-2 py-1 inline-block">
                {s.label.toUpperCase()}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="winners" title="Prize winners">
        <div className="grid gap-4 md:grid-cols-2">
          {JUDGED_TRACKS.map((t) => (
            <div key={t.id} data-testid={`winners-${t.id}`}>
              <h3 className="label-hw-dim mb-2">{t.label.toUpperCase()}</h3>
              {stats.winners[t.id]?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-[12px] text-body border-collapse">
                    <thead>
                      <tr className="label-hw-dim text-left">
                        <th className="py-1 pr-2">#</th>
                        <th className="py-1 pr-2">PRIZE</th>
                        <th className="py-1 pr-2">PROJECT</th>
                        {t.id !== "agentic" && <th className="py-1 pr-2">SCORE</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {stats.winners[t.id].map((w) => (
                        <tr key={`${w.project.id}-${w.place}`} className="border-t border-hairline-subtle align-top">
                          <td className="py-1.5 pr-2 font-mono">{w.place}</td>
                          <td className="py-1.5 pr-2">{prizeText(w.prize)}</td>
                          <td className="py-1.5 pr-2">
                            <ProjectNames slug={slug} projects={[w.project]} />
                            {w.ecosystemPrize && <span className="label-hw text-display">★ ECOSYSTEM PRIZE</span>}
                          </td>
                          {t.id !== "agentic" && (
                            <td className="py-1.5 pr-2 font-mono">{w.score == null ? "—" : `${w.score} / ${stats.scoreMax}`}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-label-dim text-[12px]">No winners announced yet.</p>
              )}
              {t.id === "agentic" && <p className="label-hw-dim normal-case mt-1">Judged by Bitrefill; no Stadium scores.</p>}
            </div>
          ))}
        </div>
      </Section>

      <Section id="headline" title="Headline numbers">
        <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" data-testid="stats-headline">
          {[
            ["Submissions", stats.headline.submissions],
            ["Hackers", stats.headline.hackers],
            ["Teams", stats.headline.teams],
            ["Privacy", stats.headline.byTrack.privacy ?? 0],
            ["Both tracks", stats.headline.byTrack.both ?? 0],
            ["Agentic Commerce only", stats.headline.byTrack.agentic ?? 0],
            ["On more than one team", stats.headline.multiTeamHackers],
          ].map(([label, value]) => (
            <div key={label} className="border border-hairline p-2">
              <dt className="label-hw-dim normal-case">{label}</dt>
              <dd className="font-mono text-display text-xl">{value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="ranking" title="Projects ranked by likelihood to continue and get support">
        <p className="label-hw-dim normal-case mb-2">
          Composite score out of 100: normalized judge total (Privacy rubric) 45, Ecosystem Prize or a milestone partner 20, a
          milestone / next step stated 20, shipped evidence 15 (public URL, demo video, repo, 5 each). Projects without a judge score
          are ranked on the other signals scaled to 100. Hover or focus a row for its breakdown.
        </p>
        <ol className="space-y-1" data-testid="composite-ranking">
          {stats.composite.map((r) => (
            <li
              key={r.project.id}
              tabIndex={0}
              className="group border-t border-hairline-subtle py-1.5 focus:outline-none focus-visible:ring-1 focus-visible:ring-display"
              data-testid="composite-row"
            >
              <div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 text-[12px]">
                <span className="font-mono text-label-dim">{r.rank}</span>
                <span className="min-w-0">
                  <ProjectNames slug={slug} projects={[r.project]} />
                  {r.noJudgeScore && (
                    <span className="label-hw border border-warn text-warn rounded-sm px-1 py-0.5 ml-1 align-middle" data-testid="no-judge-score">
                      NO JUDGE SCORE
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  <span className="hidden sm:block w-24 h-2 bg-hairline-subtle" aria-hidden>
                    <span className="block h-2 bg-display-dim" style={{ width: `${r.score}%` }} />
                  </span>
                  <span className="font-mono text-display w-10 text-right">{pct(r.score)}</span>
                </span>
              </div>
              <div className="hidden group-hover:block group-focus:block pl-12 pt-1" data-testid="composite-breakdown">
                <Breakdown row={r} />
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="tracks" title="Submissions per track, then per category">
        <div className="grid gap-6">
          <ChartFrame title="PER TRACK" testId="chart-per-track">
            <BarList
              slug={slug}
              items={stats.perTrack.map((t) => ({ key: t.id, label: t.label, value: t.count, projects: t.projects, color: TRACK_COLORS[t.id] }))}
            />
          </ChartFrame>
          <ChartFrame title="PER CATEGORY, BY TRACK (PROJECTS ADDRESSING THE SAME NEED)" testId="chart-per-category">
            <StackedBars
              slug={slug}
              legend={trackLegend}
              rows={stats.perCategory.map((c) => ({
                key: c.id,
                label: c.label,
                total: c.total,
                segments: c.segments.map((s) => ({ key: s.track, label: TRACK_LABELS[s.track] ?? s.track, count: s.count, projects: s.projects, color: TRACK_COLORS[s.track] })),
              }))}
            />
          </ChartFrame>
        </div>
      </Section>

      <Section id="top" title="Top scored projects per category">
        <div className="flex flex-wrap gap-1 mb-3" role="tablist" aria-label="Category">
          {stats.topByCategory.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === top?.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "font-mono text-[10px] tracking-[0.08em] border px-2 py-1",
                c.id === top?.id ? "border-display bg-display text-shell" : "border-hairline text-display hover:bg-panel-deep",
              )}
              data-testid="category-tab"
            >
              {c.label.toUpperCase()}
            </button>
          ))}
        </div>
        {top && (
          <div role="tabpanel" data-testid="top-panel">
            {top.scored.length ? (
              <BarList
                slug={slug}
                max={stats.scoreMax}
                testId="chart-top-category"
                items={top.scored.map((x) => ({
                  key: x.project.id,
                  label: x.project.title,
                  value: x.score,
                  valueLabel: `${x.score} / ${stats.scoreMax}`,
                  projects: [x.project],
                  highlight: x.winner,
                }))}
                hint={`Normalized judge total${stats.normalized ? "" : " (raw: not enough judges to normalize)"}. ★ = prize winner.`}
              />
            ) : (
              <p className="text-label-dim text-[12px]">No scored projects in this category.</p>
            )}
            {top.unscored.length > 0 && (
              <div className="mt-3 text-[12px]" data-testid="top-unscored">
                <div className="label-hw-dim mb-1">NOT SCORED YET</div>
                <ProjectNames slug={slug} projects={top.unscored} />
              </div>
            )}
            {top.notJudged.length > 0 && (
              <div className="mt-3 text-[12px]" data-testid="top-not-judged">
                <div className="label-hw-dim mb-1 normal-case">{stats.unscoredNote}</div>
                <ProjectNames slug={slug} projects={top.notJudged} />
              </div>
            )}
          </div>
        )}
      </Section>

      {stats.privacyReview && (
        <Section id="privacy-review" title="Privacy track tech review">
          <PrivacyReviewSection review={stats.privacyReview} slug={slug} />
        </Section>
      )}

      <Section id="multi-team" title="Hackers on multiple teams">
        <p className="text-display font-mono text-xl mb-2" data-testid="multi-team-count">
          {stats.multiTeam.count}
        </p>
        {stats.multiTeam.count > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-[12px] text-body border-collapse" data-testid="multi-team-table">
              <thead>
                <tr className="label-hw-dim text-left">
                  <th className="py-1 pr-2">HACKER</th>
                  <th className="py-1 pr-2">PROJECTS</th>
                </tr>
              </thead>
              <tbody>
                {stats.multiTeam.hackers.map((h, i) => (
                  <tr key={i} className="border-t border-hairline-subtle align-top">
                    <td className="py-1.5 pr-2 text-display">{h.name ?? <span className="text-label-dim">Name withheld</span>}</td>
                    <td className="py-1.5 pr-2">
                      <ProjectNames slug={slug} projects={h.projects} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section id="feedback" title="Event feedback (anonymized)">
        <p className="label-hw-dim normal-case mb-2">
          Ratings from 1 to 5 given with each submission. No names, emails or projects; questions with fewer than{" "}
          {stats.feedback.minResponses} responses are hidden.
        </p>
        <div className="flex flex-wrap gap-1 mb-3" role="tablist" aria-label="Track">
          {stats.feedback.groups.map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={g.id === fb.id}
              onClick={() => setFbGroup(g.id)}
              className={cn(
                "font-mono text-[10px] tracking-[0.08em] border px-2 py-1",
                g.id === fb.id ? "border-display bg-display text-shell" : "border-hairline text-display hover:bg-panel-deep",
              )}
              data-testid="feedback-tab"
            >
              {g.label.toUpperCase()}
            </button>
          ))}
        </div>
        <div role="tabpanel" data-testid="feedback-panel">
          {fb.none ? (
            <p className="text-label-dim text-[12px]" data-testid="feedback-none">
              No feedback collected
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {fb.questions.map((q) => (
                <div key={q.id} data-testid="feedback-question">
                  <div className="flex justify-between gap-2 text-[12px] mb-1">
                    <span className="text-display">{q.label}</span>
                    <span className="font-mono text-label-mid">{q.suppressed ? "hidden (too few responses)" : `avg ${q.avg} · n ${q.n}`}</span>
                  </div>
                  {!q.suppressed && (
                    <ol className="space-y-0.5" aria-label={`${q.label} distribution`}>
                      {[5, 4, 3, 2, 1].map((v) => (
                        <li key={v} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2 text-[11px]">
                          <span className="font-mono text-label-dim">{v}</span>
                          <span className="h-2.5 bg-hairline-subtle" aria-hidden>
                            <span className="block h-2.5 bg-display-dim" style={{ width: `${q.n ? (100 * q.distribution[v]) / q.n : 0}%` }} />
                          </span>
                          <span className="font-mono text-display text-right">{q.distribution[v]}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
