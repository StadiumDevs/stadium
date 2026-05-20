import { cn } from "@/lib/utils";

interface MilestoneTrackProps {
  segments?: number;            // total milestones, default 5
  completed: number;            // count of completed (filled with display color)
  current?: number | null;      // 1-indexed milestone currently active (glowing green LED)
  size?: "sm" | "md";           // sm = 16x10, md = 24x14
  labels?: string[];            // optional per-segment titles for accessibility
  className?: string;
}

const SIZE_CLASSES = {
  sm: { w: "w-4", h: "h-[10px]", gap: "gap-[2px]" },
  md: { w: "w-6", h: "h-[14px]", gap: "gap-[3px]" },
} as const;

export function MilestoneTrack({
  segments = 5,
  completed,
  current,
  size = "md",
  labels,
  className,
}: MilestoneTrackProps) {
  const sz = SIZE_CLASSES[size];

  return (
    <div className={cn("flex", sz.gap, className)} role="progressbar"
      aria-valuemin={0} aria-valuemax={segments} aria-valuenow={completed}>
      {Array.from({ length: segments }).map((_, i) => {
        const idx = i + 1;
        const isCompleted = idx <= completed;
        const isCurrent = current === idx;
        const title = labels?.[i] ?? `Milestone ${idx}`;

        return (
          <div
            key={i}
            title={title}
            aria-label={title + (isCompleted ? " — completed" : isCurrent ? " — in progress" : " — pending")}
            className={cn(
              sz.w, sz.h,
              isCurrent
                ? "bg-led"
                : isCompleted
                ? "bg-display"
                : "bg-hairline-subtle border border-hairline"
            )}
            style={isCurrent ? { boxShadow: '0 0 4px hsl(var(--led))' } : undefined}
          />
        );
      })}
    </div>
  );
}
