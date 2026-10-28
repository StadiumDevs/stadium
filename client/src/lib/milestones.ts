import type { ApiCheckIn, ApiSubmissionMilestone } from "./api";
import type { MilestoneStep, ProgramProfile } from "./programProfiles";

export type MilestoneStepState = MilestoneStep & { done: boolean; current: boolean; doneAt: string | null };

export type MilestoneProgressView = {
  steps: MilestoneStepState[];
  completed: number;
  /** 1-indexed current step, null when finished or not completed. */
  current: number | null;
  outcome: "in_progress" | "completed" | "not_completed";
};

/**
 * Derive milestone progress from the stored fields. A milestone that isn't
 * completed is shown as "not completed" (the builder keeps the day prize), never
 * as a penalty.
 */
export function milestoneProgress(
  profile: ProgramProfile,
  milestone: ApiSubmissionMilestone,
  checkIns: ApiCheckIn[] = [],
): MilestoneProgressView {
  const firstCheckIn = profile.checkIns[0]?.day;
  const checkIn = checkIns.find((c) => c.day === firstCheckIn && c.answeredAt);
  const delivered = milestone.deliveryLink && milestone.partnerConfirmed ? milestone.partnerConfirmedAt ?? "done" : null;
  const doneAt: Record<MilestoneStep["id"], string | null> = {
    agree: milestone.agreedAt,
    // Check-in answers are private (not in the public projection); a confirmed
    // delivery implies the check-in point was passed.
    checkin: checkIn?.answeredAt ?? (delivered ? "done" : null),
    deliver: delivered,
    share: milestone.loungeDate,
    payout: milestone.payoutStatus === "released" ? milestone.payoutReleasedAt ?? "done" : null,
  };
  const notCompleted = milestone.payoutStatus === "not_completed";
  let currentIdx: number | null = null;
  const steps = profile.milestone.steps.map((step, i) => {
    const done = !!doneAt[step.id];
    if (!done && currentIdx === null && !notCompleted) currentIdx = i;
    return { ...step, done, current: false, doneAt: doneAt[step.id] };
  });
  if (currentIdx !== null) steps[currentIdx].current = true;
  const completed = steps.filter((s) => s.done).length;
  return {
    steps,
    completed,
    current: currentIdx === null ? null : currentIdx + 1,
    outcome: notCompleted ? "not_completed" : completed === steps.length ? "completed" : "in_progress",
  };
}

export const formatDay = (iso: string | null | undefined) => {
  if (!iso || iso === "done") return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00+05:30` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
};
