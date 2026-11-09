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
  /** Which track this box scores, for an entry in more than one (e.g. "P", "AC"). */
  tag?: string;
  /** That track's name, for the tooltip and screen readers. */
  trackName?: string;
};

/**
 * Sticky bar at the top of the scoring view: overall progress, then one box
 * per project (green = fully scored, dashed = in progress, outlined = untouched,
 * light orange = marked to revisit, ringed = the one open now), so what still
 * needs scoring stands out. Sky instead of green marks an entry the team hasn't
 * finalized yet (solid once scored), and a ringed dot one updated since you scored it. Clicking a box
 * jumps to that project. The name search rings matching boxes in magenta and dims the rest.
 */
export function ScoringNav({
  items,
  currentKey,
  scored,
  drafts,
  revisits = 0,
  total,
  onJump,
  query,
  onQueryChange,
  children,
}: {
  items: ScoringNavItem[];
  currentKey: string | null;
  scored: number;
  drafts: number;
  revisits?: number;
  total: number;
  onJump: (key: string) => void;
  /** Project-name search. The search box only shows when onQueryChange is given. */
  query?: string;
  onQueryChange?: (q: string) => void;
  /** Controls on the bar's header row (session, guide, filter). */
  children?: ReactNode;
}) {
  const pct = total ? (scored / total) * 100 : 0;
  const q = (query ?? "").trim().toLowerCase();
  const matchKeys = new Set(q ? items.filter((it) => it.title.toLowerCase().includes(q)).map((it) => it.key) : []);
  const searching = matchKeys.size > 0;
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-panel-mid border-b border-hairline space-y-2" data-testid="scoring-nav">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[12px] text-display" data-testid="scoring-nav-count">
          {scored} / {total} SCORED{drafts > 0 ? ` · ${drafts} IN PROGRESS` : ""}{revisits > 0 ? ` · ${revisits} TO REVISIT` : ""}
        </span>
        <div className="flex flex-wrap items-center gap-3">
          {onQueryChange && (
            <div className="flex items-center gap-1.5">
              <input
                type="search"
                value={query ?? ""}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const first = items.find((it) => matchKeys.has(it.key));
                    if (first) onJump(first.key);
                  } else if (e.key === "Escape") {
                    onQueryChange("");
                  }
                }}
                placeholder="FIND PROJECT…"
                aria-label="Search projects by name"
                data-testid="scoring-nav-search"
                className="w-36 bg-panel-deep border border-hairline text-display placeholder:text-label-dim font-mono text-[11px] px-1.5 py-1 focus:outline-none focus:border-find"
              />
              {q && (
                <span
                  className={searching ? "label-hw text-find" : "label-hw-dim"}
                  aria-live="polite"
                  data-testid="scoring-nav-search-count"
                >
                  {searching ? `${matchKeys.size} FOUND` : "NO MATCH"}
                </span>
              )}
            </div>
          )}
          {children}
        </div>
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
            title={`${it.number}. ${it.title}${it.trackName ? ` · ${it.trackName}` : ""} (${it.state}${it.notFinal ? ", not final yet" : ""}${it.changed ? ", updated since you scored" : ""})`}
            aria-label={`Project ${it.number}: ${it.title}${it.trackName ? `, ${it.trackName}` : ""}, ${it.state}${it.notFinal ? ", not final yet" : ""}${it.changed ? ", updated since you scored" : ""}${it.group ? `, ${it.group.toLowerCase()}` : ""}`}
            aria-current={it.key === currentKey ? "true" : undefined}
            data-state={it.state}
            data-not-final={it.notFinal || undefined}
            data-changed={it.changed || undefined}
            data-track-tag={it.tag || undefined}
            data-match={matchKeys.has(it.key) || undefined}
            onClick={() => onJump(it.key)}
            className={cn(
              "relative h-7 font-mono text-[10px] border flex items-center justify-center",
              it.tag ? "min-w-7 px-1 gap-0.5" : "w-7",
              // Not final: sky instead of green (scored = solid sky, else sky outline); revisit stays orange.
              it.state === "saved" && (it.notFinal ? "bg-info text-shell border-info font-bold" : "bg-led text-shell border-led font-bold"),
              it.state === "draft" && (it.notFinal ? "border-dashed border-info bg-info/15 text-info" : "border-dashed border-display text-display"),
              it.state === "unscored" && (it.notFinal ? "border-info bg-info/15 text-info" : "border-hairline text-label-mid hover:text-display"),
              it.state === "revisit" && cn("bg-warn text-shell border-warn font-bold", it.notFinal && "outline outline-2 outline-offset-1 outline-info"),
              it.key === currentKey && "ring-2 ring-display ring-offset-1 ring-offset-panel-mid",
              // Search match: magenta ring + glow, last so it wins over the current ring. Others dim.
              matchKeys.has(it.key) && "ring-2 ring-find ring-offset-2 ring-offset-panel-mid shadow-[0_0_8px_hsl(var(--find))]",
              searching && !matchKeys.has(it.key) && "opacity-30",
            )}
          >
            {it.number}
            {it.tag && <span className="text-[8px] tracking-[0.06em] opacity-80">·{it.tag}</span>}
            {it.changed && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-display ring-2 ring-info" aria-hidden="true" />
            )}
          </button>
          </Fragment>
        ))}
      </div>
      {items.some((it) => it.tag) && (
        <p className="label-hw-dim normal-case" data-testid="scoring-nav-tracks">
          Entered in both tracks: one box per track,{" "}
          {[...new Map(items.filter((it) => it.tag).map((it) => [it.tag, it.trackName])).entries()]
            .map(([tag, name]) => `·${tag} = ${name}`)
            .join(", ")}
          . Score each one separately.
        </p>
      )}
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
