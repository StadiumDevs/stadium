import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ScoringNavItem = {
  key: string;
  number: number;
  title: string;
  state: "saved" | "draft" | "unscored" | "revisit";
  /** Batch label (e.g. "EVENING · IN BY 20:00"); a heading shows where it changes. */
  group?: string;
  /** The team hasn't finalized it yet (sky outline). */
  notFinal?: boolean;
  /** Updated by the team since this judge scored it (sky dot). */
  changed?: boolean;
};

/**
 * Sticky bar at the top of the scoring view: overall progress, then one box
 * per project (green = fully scored, dashed = in progress, outlined = untouched,
 * light orange = marked to revisit, ringed = the one open now), so what still
 * needs scoring stands out. Sky instead of green marks an entry the team hasn't
 * finalized yet (solid once scored), and a ringed dot one updated since you scored it. Clicking a box
 * jumps to that project.
 */
export function ScoringNav({
  items,
  currentKey,
  scored,
  drafts,
  revisits = 0,
  total,
  onJump,
  children,
}: {
  items: ScoringNavItem[];
  currentKey: string | null;
  scored: number;
  drafts: number;
  revisits?: number;
  total: number;
  onJump: (key: string) => void;
  /** Controls on the bar's header row (session, guide, filter). */
  children?: ReactNode;
}) {
  const pct = total ? (scored / total) * 100 : 0;
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-panel-mid border-b border-hairline space-y-2" data-testid="scoring-nav">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[12px] text-display" data-testid="scoring-nav-count">
          {scored} / {total} SCORED{drafts > 0 ? ` · ${drafts} IN PROGRESS` : ""}{revisits > 0 ? ` · ${revisits} TO REVISIT` : ""}
        </span>
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      </div>
      <div className="h-1.5 bg-panel-deep border border-hairline-subtle" aria-hidden="true">
        <div className="h-full bg-led transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-1" role="list" aria-label="Projects to score">
        {items.map((it, i) => (
          <Fragment key={it.key}>
          {it.group && it.group !== items[i - 1]?.group && (
            <span className="w-full label-hw-dim pt-1 first:pt-0" aria-hidden="true" data-testid="scoring-nav-group">
              {it.group}
            </span>
          )}
          <button
            type="button"
            role="listitem"
            title={`${it.number}. ${it.title} (${it.state}${it.notFinal ? ", not final yet" : ""}${it.changed ? ", updated since you scored" : ""})`}
            aria-label={`Project ${it.number}: ${it.title}, ${it.state}${it.notFinal ? ", not final yet" : ""}${it.changed ? ", updated since you scored" : ""}${it.group ? `, ${it.group.toLowerCase()}` : ""}`}
            aria-current={it.key === currentKey ? "true" : undefined}
            data-state={it.state}
            data-not-final={it.notFinal || undefined}
            data-changed={it.changed || undefined}
            onClick={() => onJump(it.key)}
            className={cn(
              "relative w-7 h-7 font-mono text-[10px] border flex items-center justify-center",
              // Not final: sky instead of green (scored = solid sky, else sky outline); revisit stays orange.
              it.state === "saved" && (it.notFinal ? "bg-info text-shell border-info font-bold" : "bg-led text-shell border-led font-bold"),
              it.state === "draft" && (it.notFinal ? "border-dashed border-info bg-info/15 text-info" : "border-dashed border-display text-display"),
              it.state === "unscored" && (it.notFinal ? "border-info bg-info/15 text-info" : "border-hairline text-label-mid hover:text-display"),
              it.state === "revisit" && cn("bg-warn text-shell border-warn font-bold", it.notFinal && "outline outline-2 outline-offset-1 outline-info"),
              it.key === currentKey && "ring-2 ring-display ring-offset-1 ring-offset-panel-mid",
            )}
          >
            {it.number}
            {it.changed && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-display ring-2 ring-info" aria-hidden="true" />
            )}
          </button>
          </Fragment>
        ))}
      </div>
      {items.some((it) => it.notFinal || it.changed) && (
        <p className="label-hw-dim normal-case flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="scoring-nav-legend">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 bg-info" aria-hidden="true" />
            Sky = not final yet (solid once you've scored it): the team may still change it
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-display ring-2 ring-info" aria-hidden="true" />
            Updated since you scored it
          </span>
        </p>
      )}
    </div>
  );
}
