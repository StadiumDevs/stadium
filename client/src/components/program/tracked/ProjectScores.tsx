import type { ApiProjectFeedback, ApiPublicSubmission } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { criterionName, type ProgramProfile } from "@/lib/programProfiles";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** "a, b, c and d" */
const listText = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The "AI-generated" link and its popup: how the feedback was written, from the fixture's facts. */
function AiGeneratedInfo({ about }: { about: ApiProjectFeedback["about"] }) {
  const withoutNotes = about.projectCount - about.projectsWithNotes;
  return (
    <Popover>
      <PopoverTrigger
        className="underline decoration-dotted underline-offset-2 hover:text-display-dim focus:outline-none focus-visible:ring-1 focus-visible:ring-display"
        aria-label="How this feedback was AI-generated"
        data-testid="ai-generated-link"
      >
        AI-GENERATED
      </PopoverTrigger>
      <PopoverContent
        align="start"
        // Always on screen on phones: stays 16px from the edges, flips/shifts to
        // fit, and scrolls inside when taller than the space available.
        collisionPadding={16}
        avoidCollisions
        className="z-[200] w-[min(22rem,calc(100vw-2rem))] max-h-[min(70vh,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain border border-hairline bg-panel-deep shadow-lg p-3 text-[12px] leading-relaxed text-body normal-case tracking-normal font-sans space-y-2"
        data-testid="ai-generated-popup"
      >
        <div className="label-hw text-display">How this feedback was written</div>
        <p>
          Written by Claude{about.model ? ` (${about.model})` : ""}, Anthropic's AI model, on {about.generatedDate} for the Free Society
          Hack organisers, after judging closed and results were published. It did not affect any score or prize.
        </p>
        <p>
          It was given each project's submission (pitch, description, repository and next milestone), its judge scores on every rubric
          criterion compared with the track median, and the judges' notes.
        </p>
        <p>
          Judges could leave optional written notes while scoring: {about.notesCount} notes on {about.projectsWithNotes} of the{" "}
          {about.projectCount} projects. For those projects the feedback mostly summarises what the judges actually wrote, paraphrased
          rather than quoted, with no judge named; vague notes (for example a single word) were left out.
          {withoutNotes > 0 && ` The other ${withoutNotes} projects had no notes, so their feedback comes from the scores alone and says so.`}
        </p>
        {about.factCheckSources.length > 0 && (
          <p>
            Every factual claim in a judge's note was checked first, against {listText(about.factCheckSources)}. Claims that couldn't be
            checked were dropped or worded as what a judge observed; checked ones are listed under "Checked facts" with their source.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * A project's published scores: per judged track, the normalized average total
 * across all judges and each rubric category against the track average; then
 * the judges' feedback (AI-written in a Claude session from the scores and the
 * judges' anonymised notes, fact-checked; read from a versioned fixture),
 * clearly labelled as AI-generated.
 */
export function ProjectScores({ profile, submission: s }: { profile: ProgramProfile; submission: ApiPublicSubmission }) {
  const tracks = profile.tracks.filter((t) => s.scores?.[t.id]);
  const fb = s.feedback;
  if (!tracks.length && !fb) return null;
  return (
    <div className="space-y-5 mb-5" data-testid="project-scores">
      {tracks.map((t) => {
        const sc = s.scores![t.id]!;
        return (
          <section key={t.id} data-track={t.id}>
            <div className="label-hw text-display mb-1">·SCORES BY CATEGORY</div>
            <p className="label-hw-dim normal-case" data-testid="project-scores-summary">
              {t.shortLabel} · {fmt(sc.score)} / {sc.max} · normalized average across all judges
            </p>
            <ul className="mt-2 space-y-1.5" data-testid="project-score-rows">
              {sc.criteria.map((c) => {
                const crit = t.rubric.criteria.find((x) => x.id === c.id);
                return (
                  <li key={c.id} className="grid grid-cols-[minmax(6rem,9rem)_1fr_auto] items-center gap-2" data-testid="project-score-row">
                    <span className="text-[12px] text-body truncate" title={crit?.label}>
                      {crit ? criterionName(crit.label) : c.id}
                    </span>
                    <span className="relative h-2 bg-hairline-subtle" aria-hidden>
                      <span className="absolute inset-y-0 left-0 bg-display-dim" style={{ width: `${c.max ? (100 * c.score) / c.max : 0}%` }} />
                      <span className="absolute -inset-y-0.5 w-px bg-warn" style={{ left: `${c.max ? (100 * c.trackAvg) / c.max : 0}%` }} title="Track average" />
                    </span>
                    <span className="font-mono text-[12px] text-display whitespace-nowrap">
                      {fmt(c.score)} / {c.max}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="label-hw-dim normal-case mt-1">
              <span className="inline-block w-px h-2 bg-warn mr-1 align-middle" aria-hidden /> track average
            </p>
          </section>
        );
      })}

      {fb && (
        <section data-testid="project-feedback">
          <div className="label-hw text-display mb-2">
            ·JUDGES' FEEDBACK (<AiGeneratedInfo about={fb.about} />)
          </div>
          <p className="text-body text-[13px] leading-relaxed mb-3" data-testid="feedback-summary">
            {fb.summary}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {fb.worked.length > 0 && (
              <div>
                <div className="label-hw-dim mb-1">WHAT WORKED</div>
                <ul className="list-disc pl-5 space-y-1 text-[13px] text-body" data-testid="feedback-worked">
                  {fb.worked.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
            {fb.improve.length > 0 && (
              <div>
                <div className="label-hw-dim mb-1">WHAT TO IMPROVE</div>
                <ul className="list-disc pl-5 space-y-1 text-[13px] text-body" data-testid="feedback-improve">
                  {fb.improve.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {fb.facts.length > 0 && (
            <div className="mt-3">
              <div className="label-hw-dim mb-1">CHECKED FACTS</div>
              <ul className="list-disc pl-5 space-y-1 text-[13px] text-body" data-testid="feedback-facts">
                {fb.facts.map((f) => (
                  <li key={f.text}>
                    {f.text}
                    {f.source && <span className="block text-[11px] italic text-label-dim">Source: {f.source}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/notes/.test(fb.basis) ? null : (
            <p className="text-[12px] text-label-dim mt-3" data-testid="feedback-scores-only">
              No judge notes for this project: based on scores only.
            </p>
          )}
          <p className="label-hw-dim normal-case mt-3" data-testid="feedback-note">
            AI-generated from the judges' scores and notes · v{fb.version} · {fb.generatedDate}
          </p>
        </section>
      )}
    </div>
  );
}
