import { MilestoneTrack } from "@/components/milestone-track";
import type { ApiCheckIn, ApiSubmissionMilestone } from "@/lib/api";
import { formatDay, milestoneProgress } from "@/lib/milestones";
import type { ProgramProfile } from "@/lib/programProfiles";
import { cn } from "@/lib/utils";

// Steps shown on the compact card view (brief: Agree, Deliver, Share).
const COMPACT_STEPS = new Set(["agree", "deliver", "share"]);

/**
 * Ecosystem Prize milestone tracker. `compact` is the card view (partner +
 * Agree / Deliver / Share); the full view lists every step with its date.
 */
export function MilestoneProgress({
  profile,
  milestone,
  checkIns,
  compact = false,
}: {
  profile: ProgramProfile;
  milestone: ApiSubmissionMilestone;
  checkIns?: ApiCheckIn[];
  compact?: boolean;
}) {
  const view = milestoneProgress(profile, milestone, checkIns);
  const steps = compact ? view.steps.filter((s) => COMPACT_STEPS.has(s.id)) : view.steps;
  const outcomeLabel =
    view.outcome === "completed" ? "COMPLETED" : view.outcome === "not_completed" ? "NOT COMPLETED" : "IN PROGRESS";

  return (
    <div className={cn("space-y-2", compact ? "" : "lcd p-3")} data-milestone-outcome={view.outcome}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-hw text-display">·30-DAY MILESTONE</span>
        <span className="label-hw-dim">{outcomeLabel}</span>
      </div>
      <p className="text-body text-[12px] leading-relaxed">{milestone.sentence}</p>
      <div className="label-hw-dim">
        PARTNER:{" "}
        <span className="text-display">
          {milestone.partnerName
            ? `${milestone.partnerName}${milestone.partnerProject ? ` · ${milestone.partnerProject}` : ""}`
            : "TO BE ASSIGNED"}
        </span>
      </div>
      {compact ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {steps.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.1em]">
              <span
                aria-hidden="true"
                className={cn(
                  "inline-block w-2.5 h-2.5 border",
                  s.done ? "bg-display border-display" : s.current ? "bg-led border-led" : "border-hairline",
                )}
              />
              <span className={s.done ? "text-display" : "text-label-mid"}>
                {s.id === "agree" ? "AGREE" : s.id === "deliver" ? "DELIVER" : "SHARE"}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <>
          <MilestoneTrack
            segments={view.steps.length}
            completed={view.completed}
            current={view.current}
            labels={view.steps.map((s) => s.label)}
          />
          <ol className="space-y-1.5 pt-1">
            {view.steps.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3">
                <span className={cn("text-[13px] leading-snug", s.done ? "text-display" : "text-body")}>
                  {s.done ? "✓ " : s.current ? "▸ " : "· "}
                  {s.label}
                  {s.id === "deliver" && milestone.deliveryLink && (
                    <>
                      {" "}
                      <a
                        href={milestone.deliveryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-display break-all"
                      >
                        link
                      </a>
                    </>
                  )}
                </span>
                <span className="label-hw-dim shrink-0 text-right">
                  {s.done ? formatDay(s.doneAt) ?? "DONE" : `BY ${formatDay(s.due)?.toUpperCase()}`}
                </span>
              </li>
            ))}
          </ol>
          {view.outcome === "not_completed" && (
            <p className="label-hw-dim normal-case">
              Not completed. The builder keeps the day prize; only the milestone payout is not released.
            </p>
          )}
        </>
      )}
    </div>
  );
}
