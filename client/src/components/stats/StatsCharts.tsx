import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { StatsProject } from "@/lib/programStats";
import { cn } from "@/lib/utils";


// Chart primitives for the stats page. Every bar and segment is a real
// <button>: hovering, focusing or clicking it lists the projects in it under
// the chart (names link to the project page when the project has one).
// Values are printed on the bars, so colour is never the only signal. Each
// chart scrolls sideways inside its own box at phone width.

export function ProjectNames({ slug, projects, empty = "None" }: { slug: string; projects: StatsProject[]; empty?: string }) {
  if (!projects.length) return <span className="text-label-dim">{empty}</span>;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1" data-testid="project-names">
      {projects.map((p, i) => (
        <li key={`${p.id}-${i}`}>
          {p.linkable ? (
            <Link to={`/programs/${slug}/projects/${p.id}`} className="text-display underline decoration-dotted underline-offset-2 hover:decoration-solid" data-testid="project-link">
              {p.title}
            </Link>
          ) : (
            <span className="text-body" data-testid="project-name">
              {p.title}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

type Active = { key: string; title: string; projects: StatsProject[] } | null;

/** The projects behind the bar last hovered, focused or clicked. */
function ChartDetail({ slug, active, hint }: { slug: string; active: Active; hint: string }) {
  return (
    <div className="mt-2 min-h-[2.5rem] border-t border-hairline-subtle pt-2 text-[12px]" aria-live="polite" data-testid="chart-detail">
      {active ? (
        <>
          <div className="label-hw-dim mb-1">{active.title}</div>
          <ProjectNames slug={slug} projects={active.projects} />
        </>
      ) : (
        <span className="text-label-dim">{hint}</span>
      )}
    </div>
  );
}

export function ChartFrame({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <figure className="flex flex-col gap-2 min-w-0" data-testid={testId}>
      <figcaption className="label-hw text-display">{title}</figcaption>
      {children}
    </figure>
  );
}

export type BarItem = {
  key: string;
  label: string;
  value: number;
  /** Printed on the bar (defaults to the value). */
  valueLabel?: string;
  projects: StatsProject[];
  /** Emphasised (e.g. a prize winner). */
  highlight?: boolean;
  color?: string;
};

/** Horizontal bars, one focusable button each. */
export function BarList({
  slug,
  items,
  max,
  testId,
  hint = "Hover or focus a bar to list its projects.",
}: {
  slug: string;
  items: BarItem[];
  max?: number;
  testId?: string;
  hint?: string;
}) {
  const [active, setActive] = useState<Active>(null);
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  const show = (i: BarItem) => setActive({ key: i.key, title: `${i.label} · ${i.valueLabel ?? i.value}`, projects: i.projects });
  return (
    <div data-testid={testId}>
      <div className="overflow-x-auto">
        <ul className="min-w-[320px] space-y-1">
          {items.map((i) => (
            <li key={i.key} className="grid grid-cols-[minmax(7rem,12rem)_1fr] items-center gap-2">
              <span className={cn("text-[12px] truncate", i.highlight ? "text-display" : "text-body")} title={i.label}>
                {i.highlight && "★ "}
                {i.label}
              </span>
              <button
                type="button"
                onMouseEnter={() => show(i)}
                onFocus={() => show(i)}
                onClick={() => show(i)}
                aria-pressed={active?.key === i.key}
                aria-label={`${i.label}: ${i.valueLabel ?? i.value}. List the projects.`}
                className="group flex items-center gap-2 h-6 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-display"
                data-testid="chart-bar"
              >
                <span
                  className={cn("h-4 rounded-r-sm transition-opacity group-hover:opacity-80", i.highlight && "ring-1 ring-display")}
                  style={{ width: `${Math.max(2, (100 * i.value) / top)}%`, minWidth: 4, maxWidth: "calc(100% - 3rem)", background: i.color ?? "hsl(var(--display-dim))" }}
                />
                <span className="font-mono text-[11px] text-display whitespace-nowrap">{i.valueLabel ?? i.value}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <ChartDetail slug={slug} active={active} hint={hint} />
    </div>
  );
}

export type StackedRow = {
  key: string;
  label: string;
  total: number;
  segments: { key: string; label: string; count: number; projects: StatsProject[]; color: string }[];
};

/** Horizontal stacked bars (e.g. categories split by track), every segment focusable. */
export function StackedBars({
  slug,
  rows,
  legend,
  testId,
}: {
  slug: string;
  rows: StackedRow[];
  legend: { label: string; color: string }[];
  testId?: string;
}) {
  const [active, setActive] = useState<Active>(null);
  const top = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div data-testid={testId}>
      <ul className="flex flex-wrap gap-3 mb-2 text-[11px] text-body" aria-label="Legend">
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: l.color }} aria-hidden />
            {l.label}
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto">
        <ul className="min-w-[360px] space-y-1">
          {rows.map((r) => (
            <li key={r.key} className="grid grid-cols-[minmax(8rem,14rem)_1fr] items-center gap-2">
              <span className="text-[12px] text-body truncate" title={r.label}>
                {r.label}
              </span>
              <div className="flex items-center gap-2">
                <div className="flex h-5" style={{ width: `calc((100% - 2.5rem) * ${r.total / top})`, minWidth: r.total ? 6 : 0 }}>
                  {r.segments
                    .filter((s) => s.count > 0)
                    .map((s) => {
                      const show = () => setActive({ key: `${r.key}:${s.key}`, title: `${r.label} · ${s.label} · ${s.count}`, projects: s.projects });
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onMouseEnter={show}
                          onFocus={show}
                          onClick={show}
                          aria-pressed={active?.key === `${r.key}:${s.key}`}
                          aria-label={`${r.label}, ${s.label}: ${s.count}. List the projects.`}
                          className="h-full flex items-center justify-center font-mono text-[10px] text-shell border-r border-panel-deep last:border-r-0 hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-display"
                          style={{ width: `${(100 * s.count) / r.total}%`, background: s.color }}
                          data-testid="chart-segment"
                        >
                          {s.count}
                        </button>
                      );
                    })}
                </div>
                <span className="font-mono text-[11px] text-display">{r.total}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <ChartDetail slug={slug} active={active} hint="Hover or focus a segment to list its projects." />
    </div>
  );
}
