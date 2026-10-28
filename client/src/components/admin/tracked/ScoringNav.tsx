import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ScoringNavItem = { key: string; number: number; title: string; state: "saved" | "draft" | "unscored" };

/**
 * Sticky bar at the top of the scoring view: overall progress, then one box
 * per project (green = fully scored, dashed = in progress, outlined = untouched, ringed =
 * the one open now), so what still needs scoring stands out. Clicking a box jumps to that project.
 */
export function ScoringNav({
  items,
  currentKey,
  scored,
  drafts,
  total,
  onJump,
  children,
}: {
  items: ScoringNavItem[];
  currentKey: string | null;
  scored: number;
  drafts: number;
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
          {scored} / {total} SCORED{drafts > 0 ? ` · ${drafts} IN PROGRESS` : ""}
        </span>
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      </div>
      <div className="h-1.5 bg-panel-deep border border-hairline-subtle" aria-hidden="true">
        <div className="h-full bg-led transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-1" role="list" aria-label="Projects to score">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            role="listitem"
            title={`${it.number}. ${it.title} (${it.state})`}
            aria-label={`Project ${it.number}: ${it.title}, ${it.state}`}
            aria-current={it.key === currentKey ? "true" : undefined}
            data-state={it.state}
            onClick={() => onJump(it.key)}
            className={cn(
              "w-7 h-7 font-mono text-[10px] border flex items-center justify-center",
              it.state === "saved" && "bg-led text-shell border-led font-bold",
              it.state === "draft" && "border-dashed border-display text-display",
              it.state === "unscored" && "border-hairline text-label-mid hover:text-display",
              it.key === currentKey && "ring-2 ring-display ring-offset-1 ring-offset-panel-mid",
            )}
          >
            {it.number}
          </button>
        ))}
      </div>
    </div>
  );
}
