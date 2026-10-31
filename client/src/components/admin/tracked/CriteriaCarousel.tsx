import { useEffect, useRef, useState, type ReactNode } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import type { Rubric, RubricCriterion } from "@/lib/programProfiles";
import { cn } from "@/lib/utils";

const shortLabel = (c: RubricCriterion) => c.label.split(":")[0].trim();
const question = (c: RubricCriterion) => {
  const i = c.label.indexOf(":");
  const q = i >= 0 ? c.label.slice(i + 1).trim() : "";
  return q.charAt(0).toUpperCase() + q.slice(1);
};

/** A "check first" step shown before the questions (watch the video, etc.). */
export type CheckStep = {
  id: "video" | "repo" | "tx";
  chip: string;
  title: string;
  prompt: string;
  /** The main link (opening it marks the step checked). */
  href: string;
  linkLabel: string;
  /** Secondary links shown under the main one. */
  extraLinks?: { href: string; label: string }[];
  /** Extra content under the links (e.g. Stadium's tx check). */
  extra?: ReactNode;
  /** A player shown above the links, mounted only while this step is open. */
  media?: ReactNode;
};

const navBtn = "font-mono text-[10px] tracking-[0.14em] border rounded-sm px-3 py-1.5 disabled:opacity-40";
const chipBase = "font-mono text-[10px] tracking-[0.1em] uppercase border rounded-sm px-2 py-1 transition-colors";
const chipDone = "bg-led/15 border-led text-display";
const chipTodo = "border-hairline text-label-dim hover:text-display";
const chipCurrent = "ring-1 ring-display ring-offset-1 ring-offset-panel-dark";

/**
 * The judge's walk through one project: first the checks (watch the video,
 * look at the repo, check the transaction), then one rubric question per
 * slide, then a NOTE slide. Swipe, use the buttons (or ←/→), or tap a chip
 * to move. Picking a level or ticking a check autosaves (via the callbacks)
 * and stays put; the judge moves on when ready. Clicking the chosen level
 * again clears it.
 */
export function CriteriaCarousel({
  rubric,
  criteria,
  notes,
  checkSteps,
  checks,
  onPick,
  onNotes,
  onCheck,
  criterionContext,
}: {
  rubric: Rubric;
  criteria: Record<string, number | null>;
  notes: string;
  checkSteps: CheckStep[];
  checks: Partial<Record<CheckStep["id"], boolean>>;
  /** A level, or null to clear the answer (click the chosen level again). */
  onPick: (criterionId: string, value: number | null) => void;
  onNotes: (notes: string) => void;
  onCheck: (id: CheckStep["id"], value: boolean) => void;
  /** What the judge reads on a question's slide, by criterion id (e.g. the privacy note on Private). */
  criterionContext?: Record<string, ReactNode>;
}) {
  const [api, setApi] = useState<CarouselApi>();
  // Slide order: checks, then questions, then the note.
  const nChecks = checkSteps.length;
  const nCriteria = rubric.criteria.length;
  const noteAt = nChecks + nCriteria;
  const total = noteAt + 1;

  // Open on the next thing to do: an unchecked step (if scoring isn't done),
  // else the first unanswered question, else the note.
  const firstQuestion = rubric.criteria.findIndex((c) => typeof criteria[c.id] !== "number");
  const firstCheck = checkSteps.findIndex((s) => !checks[s.id]);
  const [index, setIndex] = useState(
    firstQuestion === -1 ? noteAt : firstCheck !== -1 ? firstCheck : nChecks + firstQuestion,
  );
  const startAt = useRef(index);

  // Slides differ in height; size the window to the current one so a short
  // slide doesn't leave a gap.
  const [height, setHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!api) return;
    api.scrollTo(startAt.current, true);
    const measure = () => setHeight(api.slideNodes()[api.selectedScrollSnap()]?.offsetHeight);
    const onSelect = () => {
      setIndex(api.selectedScrollSnap());
      measure();
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    const ro = new ResizeObserver(measure);
    api.slideNodes().forEach((n) => ro.observe(n));
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
      ro.disconnect();
    };
  }, [api]);

  const go = (i: number) => api?.scrollTo(Math.max(0, Math.min(total - 1, i)));

  const onCheckStep = index < nChecks;
  const qIndex = index - nChecks; // question index when on a question slide
  // Once the current step is done, NEXT is the obvious next tap.
  const currentDone = onCheckStep
    ? !!checks[checkSteps[index].id]
    : qIndex >= 0 && qIndex < nCriteria && typeof criteria[rubric.criteria[qIndex].id] === "number";
  const answered = rubric.criteria.filter((c) => typeof criteria[c.id] === "number").length;
  const nextLabel =
    index === nChecks - 1 ? "START SCORING ▸" : qIndex === nCriteria - 1 ? "NOTE ▸" : onCheckStep ? "NEXT CHECK ▸" : "NEXT QUESTION ▸";

  return (
    <div className="space-y-3" data-testid="criteria-carousel">
      {/* Chips: the checks, then the questions, then the note. */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Judging steps">
        {checkSteps.map((st, i) => (
          <button
            key={st.id}
            type="button"
            role="tab"
            aria-selected={index === i}
            onClick={() => go(i)}
            data-testid="check-chip"
            data-done={!!checks[st.id]}
            className={cn(chipBase, checks[st.id] ? chipDone : chipTodo, index === i && chipCurrent)}
          >
            {checks[st.id] ? "✓ " : ""}
            {st.chip}
          </button>
        ))}
        {nChecks > 0 && <span className="w-px h-5 bg-hairline mx-1" aria-hidden="true" />}
        {rubric.criteria.map((c, i) => {
          const v = criteria[c.id];
          const done = typeof v === "number";
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={index === nChecks + i}
              onClick={() => go(nChecks + i)}
              data-testid="criterion-chip"
              data-done={done}
              className={cn(chipBase, done ? chipDone : chipTodo, index === nChecks + i && chipCurrent)}
            >
              {shortLabel(c)}
              {done ? ` · ${v}` : ""}
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={index === noteAt}
          onClick={() => go(noteAt)}
          data-testid="criterion-chip"
          data-done={!!notes.trim()}
          className={cn(chipBase, notes.trim() ? chipDone : chipTodo, index === noteAt && chipCurrent)}
        >
          NOTE
        </button>
        <span className="label-hw-dim ml-auto">
          {answered}/{nCriteria} ANSWERED
        </span>
      </div>

      <Carousel
        setApi={setApi}
        opts={{ align: "start" }}
        className="w-full overflow-hidden transition-[height] duration-200"
        style={{ height }}
        aria-label="Judging step"
      >
        <CarouselContent className="items-start">
          {checkSteps.map((st, i) => (
            <CarouselItem key={st.id} data-testid="check-slide" aria-label={`${st.title}, check ${i + 1} of ${nChecks}`}>
              <div className="space-y-3">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-xl uppercase tracking-tight text-display">{st.title}</h3>
                    <span className="label-hw-dim">
                      CHECK {i + 1} / {nChecks}
                    </span>
                  </div>
                  <p className="text-[14px] text-body leading-relaxed mt-1">{st.prompt}</p>
                </div>
                {st.media && index === i && st.media}
                <div className="border border-hairline bg-panel-light rounded-sm p-3.5 space-y-2.5">
                  <a
                    href={st.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => onCheck(st.id, true)}
                    data-testid="check-open"
                    className="inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim rounded-sm px-4 py-2"
                  >
                    {st.linkLabel} ↗
                  </a>
                  <p className="font-mono text-[11px] text-label-dim break-all">{st.href}</p>
                  {st.extraLinks?.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[13px] text-display-dim underline break-all hover:text-display"
                    >
                      {l.label} ↗
                    </a>
                  ))}
                  {st.extra}
                </div>
                <button
                  type="button"
                  aria-pressed={!!checks[st.id]}
                  onClick={() => onCheck(st.id, !checks[st.id])}
                  data-testid="check-toggle"
                  className={cn(
                    "border rounded-sm px-3.5 py-2.5 flex items-center gap-3 text-left w-full sm:w-auto transition-colors",
                    checks[st.id]
                      ? "border-led bg-led/10 text-display"
                      : "border-hairline bg-panel-light text-display-dim hover:bg-panel-mid hover:border-label-dim",
                  )}
                >
                  <span
                    className={cn(
                      "shrink-0 w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[12px] font-bold",
                      checks[st.id] ? "bg-led border-led text-shell" : "border-label-dim text-display",
                    )}
                    aria-hidden="true"
                  >
                    {checks[st.id] ? "✓" : ""}
                  </span>
                  <span className="text-[14px]">{checks[st.id] ? "Checked" : "Mark as checked"}</span>
                </button>
              </div>
            </CarouselItem>
          ))}
          {rubric.criteria.map((c, i) => (
            <CarouselItem key={c.id} data-testid="criterion-slide" aria-label={`${shortLabel(c)}, question ${i + 1} of ${nCriteria}`}>
              <div className="space-y-3">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-xl uppercase tracking-tight text-display">{shortLabel(c)}</h3>
                    <span className="label-hw-dim">
                      {i + 1} / {nCriteria}
                      {c.weight > 1 ? ` · ×${c.weight}` : ""}
                    </span>
                  </div>
                  {question(c) && <p className="text-[14px] text-body leading-relaxed mt-1">{question(c)}</p>}
                </div>
                {criterionContext?.[c.id]}
                <div className={cn("grid gap-2", c.levels ? "grid-cols-1" : "grid-cols-3 sm:grid-cols-6")}>
                  {Array.from({ length: c.max + 1 }, (_, v) => v).map((v) => {
                    const selected = criteria[c.id] === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={selected}
                        title={selected ? "Click again to clear" : undefined}
                        onClick={() => onPick(c.id, selected ? null : v)}
                        className={cn(
                          "text-left border rounded-sm px-3.5 py-3 flex items-start gap-3 transition-colors",
                          selected
                            ? "border-led bg-led/10 text-display"
                            : "border-hairline bg-panel-light text-display-dim hover:bg-panel-mid hover:border-label-dim",
                        )}
                      >
                        <span
                          className={cn(
                            "shrink-0 w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[12px] font-bold",
                            selected ? "bg-led border-led text-shell" : "border-label-dim text-display",
                          )}
                          aria-hidden="true"
                        >
                          {selected ? "✓" : v}
                        </span>
                        <span className="text-[14px] leading-relaxed pt-0.5">
                          {c.levels?.[v] ? (
                            <>
                              <span className="sr-only">{v}: </span>
                              {c.levels[v]}
                            </>
                          ) : (
                            <span className="font-mono">{v}</span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </CarouselItem>
          ))}
          <CarouselItem data-testid="criterion-slide" aria-label="Note">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-xl uppercase tracking-tight text-display">Note</h3>
                <span className="label-hw-dim">OPTIONAL</span>
              </div>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => onNotes(e.target.value)}
                placeholder="Anything to remember about this project, for you and the other judges."
                aria-label="Note"
                className="w-full bg-panel-light border border-hairline rounded-sm text-display text-[14px] leading-relaxed px-3 py-2 placeholder:text-label-dim focus:outline-none focus:border-label-dim"
              />
              <div className="flex flex-wrap gap-1.5" data-testid="criteria-summary">
                {rubric.criteria.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => go(nChecks + i)}
                    className="font-mono text-[11px] border border-hairline rounded-sm px-2 py-1 text-display-dim hover:text-display"
                  >
                    {shortLabel(c)} {typeof criteria[c.id] === "number" ? criteria[c.id] : "–"}
                  </button>
                ))}
              </div>
            </div>
          </CarouselItem>
        </CarouselContent>
      </Carousel>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className={cn(navBtn, "border-hairline text-display hover:bg-panel-deep")}
        >
          ◂ BACK
        </button>
        <span className="label-hw-dim hidden sm:inline">SWIPE OR USE ← →</span>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === total - 1}
          data-testid="carousel-next"
          className={cn(
            navBtn,
            currentDone
              ? "border-display bg-display text-shell hover:bg-display-dim"
              : "border-hairline text-display hover:bg-panel-deep",
          )}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
