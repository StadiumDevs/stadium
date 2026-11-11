import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { StatsProject } from "@/lib/programStats";
import { cn } from "@/lib/utils";
import { projectPath } from "@/lib/projectUrl";


// Chart primitives for the stats page. Every bar and segment is a real
// <button>: hovering or focusing it previews the projects in it under the
// chart; clicking pins that list so the mouse can move down to it without
// crossing other bars (click again or Esc to unpin). Every name is a link:
// winners to their project page, everyone else to their details on the
// program page.
// Values are printed on the bars, so colour is never the only signal. Each
// chart scrolls sideways inside its own box at phone width.

export function ProjectNames({ slug, projects, empty = "None" }: { slug: string; projects: StatsProject[]; empty?: string }) {
  if (!projects.length) return <span className="text-label-dim">{empty}</span>;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1" data-testid="project-names">
      {projects.map((p, i) => (
        <li key={`${p.id}-${i}`}>
          {p.linkable || !p.id.startsWith("review:") ? (
            <Link
              to={p.linkable ? projectPath(slug, p.id) : `/programs/${slug}?project=${encodeURIComponent(p.id)}`}
              className="text-display underline decoration-dotted underline-offset-2 hover:decoration-solid"
              data-testid="project-link"
              data-kind={p.linkable ? "page" : "details"}
            >
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

type Active = { key: string; title: string; projects: StatsProject[]; empty?: string } | null;

/** Hover/focus previews a bar's projects; click pins them until clicked again (or Esc). */
function useChartSelection() {
  const [preview, setPreview] = useState<Active>(null);
  const [pinned, setPinned] = useState<Active>(null);
  return {
    shown: pinned ?? preview,
    pinned,
    preview: (a: NonNullable<Active>) => setPreview(a),
    toggle: (a: NonNullable<Active>) => setPinned((p) => (p?.key === a.key ? null : a)),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    },
  };
}

/** The projects behind the bar pinned, or else last hovered or focused. */
function ChartDetail({ slug, active, pinned, hint }: { slug: string; active: Active; pinned: boolean; hint: string }) {
  return (
    <div className="mt-2 min-h-[2.5rem] border-t border-hairline-subtle pt-2 text-[12px]" aria-live="polite" data-testid="chart-detail" data-pinned={pinned ? "true" : "false"}>
      {active ? (
        <>
          <div className="label-hw-dim mb-1">
            {active.title}
            <span className="ml-2 text-label-dim normal-case">{pinned ? "· pinned (click the bar again or press Esc to unpin)" : "· click the bar to pin"}</span>
          </div>
          <ProjectNames slug={slug} projects={active.projects} empty={active.empty} />
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
  /** Shown instead of "None" when the bar has no project list. */
  empty?: string;
};

/** A colour key for a chart. */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-3 mb-2 text-[11px] text-body" aria-label="Legend">
      {items.map((l) => (
        <li key={l.label} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: l.color }} aria-hidden />
          {l.label}
        </li>
      ))}
    </ul>
  );
}

/** Horizontal bars, one focusable button each. */
export function BarList({
  slug,
  items,
  max,
  testId,
  hint = "Hover or focus a bar to list its projects; click to pin.",
  wideLabels = false,
}: {
  slug: string;
  items: BarItem[];
  max?: number;
  testId?: string;
  hint?: string;
  /** A wider label column (long labels such as "ZIP 321 · Payment request URIs"). */
  wideLabels?: boolean;
}) {
  const sel = useChartSelection();
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  const entry = (i: BarItem) => ({ key: i.key, title: `${i.label} · ${i.valueLabel ?? i.value}`, projects: i.projects, empty: i.empty });
  return (
    <div data-testid={testId}>
      <div className="overflow-x-auto">
        <ul className={cn("space-y-1", wideLabels ? "min-w-[520px]" : "min-w-[320px]")}>
          {items.map((i) => (
            <li key={i.key} className={cn("grid items-center gap-2", wideLabels ? "grid-cols-[minmax(12rem,20rem)_1fr]" : "grid-cols-[minmax(7rem,12rem)_1fr]")}>
              <span className={cn("text-[12px] truncate", i.highlight ? "text-display" : "text-body")} title={i.label}>
                {i.highlight && "★ "}
                {i.label}
              </span>
              <button
                type="button"
                onMouseEnter={() => sel.preview(entry(i))}
                onFocus={() => sel.preview(entry(i))}
                onClick={() => sel.toggle(entry(i))}
                onKeyDown={sel.onKeyDown}
                aria-pressed={sel.pinned?.key === i.key}
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
      <ChartDetail slug={slug} active={sel.shown} pinned={!!sel.pinned} hint={hint} />
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
  const sel = useChartSelection();
  const top = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div data-testid={testId}>
      <Legend items={legend} />
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
                      const entry = { key: `${r.key}:${s.key}`, title: `${r.label} · ${s.label} · ${s.count}`, projects: s.projects };
                      return (
                        <button
                          key={s.key}
                          type="button"
                          onMouseEnter={() => sel.preview(entry)}
                          onFocus={() => sel.preview(entry)}
                          onClick={() => sel.toggle(entry)}
                          onKeyDown={sel.onKeyDown}
                          aria-pressed={sel.pinned?.key === entry.key}
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
      <ChartDetail slug={slug} active={sel.shown} pinned={!!sel.pinned} hint="Hover or focus a segment to list its projects; click to pin." />
    </div>
  );
}
