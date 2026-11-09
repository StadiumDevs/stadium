import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ProgramStats } from "@/lib/programStats";
import { TRACK_LABELS } from "@/lib/programStats";
import { cn } from "@/lib/utils";
import { BarList, ChartFrame, ProjectNames, StackedBars } from "./StatsCharts";
import { PrivacyReviewSection } from "./PrivacyReviewSection";
import { criterionName, getProgramProfile } from "@/lib/programProfiles";
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

/** The slide on show and the direction it came from (for the slide-in). */
const SlideContext = createContext<{ active: string; dir: 1 | -1 }>({ active: "", dir: 1 });

/** One slide: only the active section renders. */
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const { active, dir } = useContext(SlideContext);
  if (id !== active) return null;
  return (
    <section
      id={`stats-${id}`}
      role="tabpanel"
      aria-labelledby={`stats-tab-${id}`}
      className={cn(
        "panel p-4 mb-4 animate-in fade-in duration-300 ease-out motion-reduce:animate-none",
        dir === 1 ? "slide-in-from-right-6" : "slide-in-from-left-6",
      )}
      data-testid={`stats-section-${id}`}
    >
      <h2 id={`stats-${id}-title`} className="label-hw text-display mb-3">
        ·{title.toUpperCase()}
      </h2>
      {children}
    </section>
  );
}

const prizeText = (p: { label: string; amount: number | string; currency: string }) =>
  `${p.label.replace(/^[^:]+:\s*/, "")} (${p.amount} ${p.currency})`;


/** The whole stats page body: used by the public page and the admin preview. */
export function ProgramStatsView({ stats, slug, sticky = true }: { stats: ProgramStats; slug: string; sticky?: boolean }) {
  const [cat, setCat] = useState(stats.topByCategory[0]?.id ?? "");
  const [fbGroup, setFbGroup] = useState("all");
  const top = stats.topByCategory.find((c) => c.id === cat) ?? stats.topByCategory[0];
  // Top per rubric criterion (judged track): labels from the program's rubric.
  const byCriterion = stats.topByCriterion ?? [];
  const [crit, setCrit] = useState(byCriterion[0]?.id ?? "");
  const [allCrit, setAllCrit] = useState(false);
  const critTop = byCriterion.find((c) => c.id === crit) ?? byCriterion[0];
  const rubricCriteria = getProgramProfile(slug)?.tracks.flatMap((t) => t.rubric.criteria) ?? [];
  const critLabel = (id: string) => rubricCriteria.find((c) => c.id === id)?.label ?? id;
  const CRIT_TOP = 10;
  const fb = stats.feedback.groups.find((g) => g.id === fbGroup) ?? stats.feedback.groups[0];
  const trackLegend = Object.entries(TRACK_LABELS).map(([id, label]) => ({ label, color: TRACK_COLORS[id] }));

  // Slides: one section at a time. The hash (#stats-<id>) picks the slide, so
  // links from the program page land on the right one.
  const sections = STATS_SECTIONS.filter(
    (s) => (s.id !== "privacy-review" || stats.privacyReview) && (s.id !== "top-criterion" || byCriterion.some((c) => c.rows.length)),
  );
  const fromHash = () => {
    const id = typeof window === "undefined" ? "" : window.location.hash.replace(/^#stats-/, "");
    return sections.some((s) => s.id === id) ? id : sections[0].id;
  };
  const [active, setActive] = useState(fromHash);
  const [dir, setDir] = useState<1 | -1>(1);
  const slideRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const index = sections.findIndex((s) => s.id === active);

  const select = (id: string, { focus = false }: { focus?: boolean } = {}) => {
    if (id === active) return;
    setDir(sections.findIndex((s) => s.id === id) > index ? 1 : -1);
    setActive(id);
    window.history.replaceState(null, "", `#stats-${id}`);
    const tab = tabRefs.current[id];
    tab?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    if (focus) tab?.focus({ preventScroll: true });
    // The new slide's top sits right under the sticky nav.
    requestAnimationFrame(() => slideRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  };

  // Hash links within the page (or back/forward) pick their slide.
  useEffect(() => {
    const onHash = () => {
      const id = window.location.hash.replace(/^#stats-/, "");
      if (sections.some((s) => s.id === id)) select(id);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  });

  const onTabKey = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const to = e.key === "Home" ? 0 : e.key === "End" ? sections.length - 1 : step ? (index + step + sections.length) % sections.length : -1;
    if (to < 0) return;
    e.preventDefault();
    select(sections[to].id, { focus: true });
  };
  const prev = sections[index - 1];
  const next = sections[index + 1];

  return (
    <div data-testid="program-stats">
      <nav
        className={cn("z-20 mb-4 border border-hairline bg-panel-deep/95 backdrop-blur px-2 py-1.5 overflow-x-auto", sticky && "sticky top-0")}
        aria-label="Stats sections"
        data-testid="stats-nav"
      >
        <div role="tablist" aria-label="Stats sections" className="flex gap-1 whitespace-nowrap" onKeyDown={onTabKey}>
          {sections.map((s) => (
            <button
              key={s.id}
              ref={(el) => (tabRefs.current[s.id] = el)}
              id={`stats-tab-${s.id}`}
              type="button"
              role="tab"
              aria-selected={s.id === active}
              aria-controls={`stats-${s.id}`}
              tabIndex={s.id === active ? 0 : -1}
              onClick={() => select(s.id)}
              className={cn(
                "font-mono text-[10px] tracking-[0.12em] px-2.5 py-1 border transition-colors duration-200",
                s.id === active ? "border-display bg-display text-shell" : "border-transparent text-label-dim hover:text-display",
              )}
              data-testid="stats-tab"
            >
              {s.label.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>

      <div ref={slideRef} className={cn(sticky ? "scroll-mt-16" : "scroll-mt-14")} data-testid="stats-slide" data-active={active}>
      <SlideContext.Provider value={{ active, dir }}>

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
          ].map(([label, value]) => (
            <div key={label} className="border border-hairline p-2">
              <dt className="label-hw-dim normal-case">{label}</dt>
              <dd className="font-mono text-display text-xl">{value}</dd>
            </div>
          ))}
        </dl>
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
                hint={`Judge score out of ${stats.scoreMax}. ★ = prize winner.`}
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

      {critTop && (
        <Section id="top-criterion" title="Top projects per score criterion">
          <div className="flex flex-wrap gap-1 mb-2" role="tablist" aria-label="Score criterion">
            {byCriterion.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === critTop.id}
                onClick={() => {
                  setCrit(c.id);
                  setAllCrit(false);
                }}
                className={cn(
                  "font-mono text-[10px] tracking-[0.08em] border px-2 py-1",
                  c.id === critTop.id ? "border-display bg-display text-shell" : "border-hairline text-display hover:bg-panel-deep",
                )}
                data-testid="criterion-tab"
              >
                {criterionName(critLabel(c.id)).toUpperCase()}
              </button>
            ))}
          </div>
          <p className="label-hw-dim normal-case mb-3" data-testid="criterion-label">
            {critLabel(critTop.id)}
          </p>
          <div role="tabpanel" data-testid="criterion-panel">
            {critTop.rows.length ? (
              <>
                <BarList
                  slug={slug}
                  max={critTop.max}
                  testId="chart-top-criterion"
                  items={(allCrit ? critTop.rows : critTop.rows.slice(0, CRIT_TOP)).map((x) => ({
                    key: x.project.id,
                    label: x.project.title,
                    value: x.score,
                    valueLabel: `${x.score} / ${critTop.max}`,
                    projects: [x.project],
                    highlight: x.winner,
                  }))}
                  hint={`Judge score on this criterion, out of ${critTop.max}. ★ = prize winner.`}
                />
                {critTop.rows.length > CRIT_TOP && (
                  <button
                    type="button"
                    onClick={() => setAllCrit((v) => !v)}
                    className="mt-2 font-mono text-[10px] tracking-[0.12em] border border-hairline text-display px-3 py-1.5 hover:bg-panel-deep"
                    data-testid="criterion-show-all"
                  >
                    {allCrit ? `SHOW TOP ${CRIT_TOP}` : `SHOW ALL (${critTop.rows.length})`}
                  </button>
                )}
              </>
            ) : (
              <p className="text-label-dim text-[12px]">No scored projects yet.</p>
            )}
          </div>
        </Section>
      )}

      {stats.privacyReview && (
        <Section id="privacy-review" title="Privacy track tech review">
          <PrivacyReviewSection review={stats.privacyReview} slug={slug} />
        </Section>
      )}


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
      </SlideContext.Provider>
      <div className="flex items-center justify-between gap-2" data-testid="stats-pager">
        {prev ? (
          <button type="button" onClick={() => select(prev.id)} className="font-mono text-[10px] tracking-[0.12em] border border-hairline text-display px-3 py-1.5 hover:bg-panel-deep" data-testid="stats-prev">
            ◂ {prev.label.toUpperCase()}
          </button>
        ) : (
          <span />
        )}
        <span className="label-hw-dim">
          {index + 1} / {sections.length}
        </span>
        {next ? (
          <button type="button" onClick={() => select(next.id)} className="font-mono text-[10px] tracking-[0.12em] border border-hairline text-display px-3 py-1.5 hover:bg-panel-deep" data-testid="stats-next">
            {next.label.toUpperCase()} ▸
          </button>
        ) : (
          <span />
        )}
      </div>
      </div>
    </div>
  );
}
