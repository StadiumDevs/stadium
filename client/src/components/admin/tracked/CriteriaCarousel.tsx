import { useEffect, useRef, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import type { Rubric, RubricCriterion } from "@/lib/programProfiles";
import { cn } from "@/lib/utils";

const shortLabel = (c: RubricCriterion) => c.label.split(":")[0].trim();
const question = (c: RubricCriterion) => {
  const i = c.label.indexOf(":");
  const q = i >= 0 ? c.label.slice(i + 1).trim() : "";
  return q.charAt(0).toUpperCase() + q.slice(1);
};

/**
 * One rubric question per slide, in sequence, then a NOTE slide. Swipe, use
 * the arrows (or ←/→), or tap a step chip to move. Picking a level autosaves
 * (via onPick) and stays on the question; the judge moves on when ready.
 */
export function CriteriaCarousel({
  rubric,
  criteria,
  notes,
  onPick,
  onNotes,
}: {
  rubric: Rubric;
  criteria: Record<string, number | null>;
  notes: string;
  onPick: (criterionId: string, value: number) => void;
  onNotes: (notes: string) => void;
}) {
  const [api, setApi] = useState<CarouselApi>();
  const total = rubric.criteria.length + 1; // + NOTE
  // Open on the first unanswered question, or the note when all are answered.
  const firstOpen = rubric.criteria.findIndex((c) => typeof criteria[c.id] !== "number");
  const [index, setIndex] = useState(firstOpen === -1 ? rubric.criteria.length : firstOpen);
  const startAt = useRef(index);

  // Slides differ in height; size the window to the current one so a short
  // slide (the note) doesn't leave a gap.
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


  // Once this question is answered, NEXT QUESTION is the obvious next tap.
  const currentAnswered = index < rubric.criteria.length && typeof criteria[rubric.criteria[index].id] === "number";
  const answered = rubric.criteria.filter((c) => typeof criteria[c.id] === "number").length;

  return (
    <div className="space-y-3" data-testid="criteria-carousel">
      {/* Step chips: where you are, and what's answered. */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Scoring questions">
        {rubric.criteria.map((c, i) => {
          const v = criteria[c.id];
          const done = typeof v === "number";
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={index === i}
              onClick={() => go(i)}
              data-testid="criterion-chip"
              data-done={done}
              className={cn(
                "font-mono text-[10px] tracking-[0.1em] uppercase border rounded-sm px-2 py-1 transition-colors",
                done ? "bg-led/15 border-led text-display" : "border-hairline text-label-dim hover:text-display",
                index === i && "ring-1 ring-display ring-offset-1 ring-offset-panel-dark",
              )}
            >
              {shortLabel(c)}
              {done ? ` · ${v}` : ""}
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          aria-selected={index === rubric.criteria.length}
          onClick={() => go(rubric.criteria.length)}
          data-testid="criterion-chip"
          data-done={!!notes.trim()}
          className={cn(
            "font-mono text-[10px] tracking-[0.1em] border rounded-sm px-2 py-1",
            notes.trim() ? "bg-led/15 border-led text-display" : "border-hairline text-label-dim hover:text-display",
            index === rubric.criteria.length && "ring-1 ring-display ring-offset-1 ring-offset-panel-dark",
          )}
        >
          NOTE
        </button>
        <span className="label-hw-dim ml-auto">
          {answered}/{rubric.criteria.length} ANSWERED
        </span>
      </div>

      <Carousel
        setApi={setApi}
        opts={{ align: "start" }}
        className="w-full overflow-hidden transition-[height] duration-200"
        style={{ height }}
        aria-label="Scoring question"
      >
        <CarouselContent className="items-start">
          {rubric.criteria.map((c, i) => (
            <CarouselItem key={c.id} data-testid="criterion-slide" aria-label={`${shortLabel(c)}, question ${i + 1} of ${rubric.criteria.length}`}>
              <div className="space-y-3">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-display text-xl uppercase tracking-tight text-display">{shortLabel(c)}</h3>
                    <span className="label-hw-dim">
                      {i + 1} / {rubric.criteria.length}
                      {c.weight > 1 ? ` · ×${c.weight}` : ""}
                    </span>
                  </div>
                  {question(c) && <p className="text-[14px] text-body leading-relaxed mt-1">{question(c)}</p>}
                </div>
                <div className={cn("grid gap-2", c.levels ? "grid-cols-1" : "grid-cols-3 sm:grid-cols-6")}>
                  {Array.from({ length: c.max + 1 }, (_, v) => v).map((v) => {
                    const selected = criteria[c.id] === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => onPick(c.id, v)}
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
                    onClick={() => go(i)}
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
          className="font-mono text-[10px] tracking-[0.14em] border border-hairline rounded-sm px-3 py-1.5 text-display hover:bg-panel-deep disabled:opacity-40"
        >
          ◂ BACK
        </button>
        <span className="label-hw-dim">SWIPE OR USE ← →</span>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === total - 1}
          className={cn(
            "font-mono text-[10px] tracking-[0.14em] border rounded-sm px-3 py-1.5 disabled:opacity-40",
            currentAnswered
              ? "border-display bg-display text-shell hover:bg-display-dim"
              : "border-hairline text-display hover:bg-panel-deep",
          )}
        >
          {index === rubric.criteria.length - 1 ? "NOTE ▸" : "NEXT QUESTION ▸"}
        </button>
      </div>
    </div>
  );
}
