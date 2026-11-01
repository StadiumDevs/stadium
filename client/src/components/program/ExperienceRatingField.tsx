import type { KeyboardEvent } from "react";
import { RequiredMark } from "@/components/program/RequiredMark";
import { invalidText } from "@/components/program/tracked/trackedForm";
import { RATING_MAX, RATING_MIN } from "@/lib/experienceRatings";

const SCORES = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i);

/**
 * One required 1 to 5 rating, as a radio group of numbered buttons. Arrow keys
 * move and select within the group, like a native radio set.
 */
export function ExperienceRatingField({
  id,
  label,
  value,
  onChange,
  invalid,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (score: number) => void;
  invalid: boolean;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = Math.min(RATING_MAX, Math.max(RATING_MIN, (value ?? (step > 0 ? RATING_MIN - 1 : RATING_MAX + 1)) + step));
    onChange(next);
    document.getElementById(`${id}-${next}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span id={`${id}-label`} className={"label-hw-dim" + invalidText(invalid)}>
        {label.toUpperCase()}
        <RequiredMark />
      </span>
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        aria-invalid={invalid || undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="flex gap-1.5"
      >
        {SCORES.map((n) => {
          const selected = value === n;
          // Roving tabindex: only the selected button (or the first one) is in the tab order.
          const tabbable = selected || (value === undefined && n === RATING_MIN);
          return (
            <button
              key={n}
              id={`${id}-${n}`}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${n} out of ${RATING_MAX}`}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(n)}
              className={
                "h-9 w-9 shrink-0 border font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring " +
                (selected
                  ? "border-display bg-display text-shell"
                  : "border-hairline bg-input text-body hover:border-display-dim hover:text-display") +
                (invalid && !selected ? " border-destructive" : "")
              }
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
