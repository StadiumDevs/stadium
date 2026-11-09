import type { ApiPublicSubmission } from "@/lib/api";
import type { ProgramProfile } from "@/lib/programProfiles";
import { criterionName, projectReview, type ReviewLine } from "@/lib/projectReview";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function Line({ l }: { l: ReviewLine }) {
  return (
    <li className="text-[13px] leading-relaxed">
      <span className="text-display">{l.name}</span>{" "}
      <span className="font-mono text-[12px] text-label-mid">
        · {fmt(l.score)} / {l.max} (track average {fmt(l.trackAvg)})
      </span>
      {l.text && <span className="block text-body">{l.text}</span>}
    </li>
  );
}

/**
 * A project's published scores: per judged track, the total, how many judges
 * scored it, each rubric category against the track average, and an overall
 * review (strengths, possible weaknesses) built only from those scores.
 */
export function ProjectScores({ profile, submission: s }: { profile: ProgramProfile; submission: ApiPublicSubmission }) {
  const tracks = profile.tracks.filter((t) => s.scores?.[t.id]);
  if (!tracks.length) return null;
  return (
    <div className="space-y-5 mb-5" data-testid="project-scores">
      {tracks.map((t) => {
        const sc = s.scores![t.id]!;
        const review = projectReview(sc, t.rubric);
        const label = t.shortLabel.charAt(0) + t.shortLabel.slice(1).toLowerCase();
        return (
          <section key={t.id} className="space-y-4" data-track={t.id}>
            <div>
              <div className="label-hw text-display mb-1">·SCORES BY CATEGORY</div>
              <p className="label-hw-dim normal-case" data-testid="project-scores-summary">
                {t.shortLabel} · {fmt(sc.score)} / {sc.max} · scored by {sc.judges} judge{sc.judges === 1 ? "" : "s"}
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
            </div>

            <div data-testid="project-review">
              <div className="label-hw text-display mb-2">·OVERALL REVIEW</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="label-hw-dim mb-1">STRENGTHS</div>
                  {review.strengths.length || review.bonus ? (
                    <ul className="space-y-2" data-testid="review-strengths">
                      {review.strengths.map((l) => (
                        <Line key={l.id} l={l} />
                      ))}
                      {review.bonus && (
                        <li className="text-[13px]">
                          <span className="text-display">Bonus</span>{" "}
                          <span className="font-mono text-[12px] text-label-mid">
                            · awarded (average {fmt(review.bonus.score)} / {review.bonus.max})
                          </span>
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-label-dim">No category stands out above the track average.</p>
                  )}
                </div>
                <div>
                  <div className="label-hw-dim mb-1">POSSIBLE WEAKNESSES</div>
                  {review.weaknesses.length ? (
                    <ul className="space-y-2" data-testid="review-weaknesses">
                      {review.weaknesses.map((l) => (
                        <Line key={l.id} l={l} />
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-label-dim">No clear weaknesses against the rubric.</p>
                  )}
                </div>
              </div>
              <p className="label-hw-dim normal-case mt-3" data-testid="review-method">
                Generated automatically from the judges' scores ({sc.judges} judge{sc.judges === 1 ? "" : "s"}), compared with the {label}{" "}
                track average in each category and described with the rubric's wording for each score level. No judge notes or AI were
                used.
              </p>
            </div>
          </section>
        );
      })}
    </div>
  );
}
