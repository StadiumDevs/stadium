import { Link } from "react-router-dom";
import { STATS_SECTIONS } from "@/lib/statsDisplay";
import { programStatsFor } from "@/lib/programStatsConfig";

/**
 * "View prize winners and submission stats": shown on a completed program's
 * page once the stats snapshot is published. Buttons jump straight to a section.
 */
export function ProgramStatsLink({ slug }: { slug: string }) {
  const base = `/programs/${slug}/stats`;
  const jumps = ["winners", "ranking", "tracks", ...(programStatsFor(slug)?.privacyReview ? ["privacy-review"] : []), "feedback"];
  return (
    <section className="panel p-4 mb-4" aria-label="Prize winners and submission stats" data-testid="program-stats-link">
      <div className="label-hw text-display mb-3">·VIEW PRIZE WINNERS AND SUBMISSION STATS</div>
      <div className="flex flex-wrap gap-2">
        <Link to={base} className="font-mono text-[11px] tracking-[0.1em] border border-display bg-display text-shell px-3 py-1.5 hover:opacity-90">
          OPEN STATS PAGE ▸
        </Link>
        {STATS_SECTIONS.filter((s) => jumps.includes(s.id)).map((s) => (
          <Link
            key={s.id}
            to={`${base}#stats-${s.id}`}
            className="font-mono text-[11px] tracking-[0.1em] border border-hairline text-display px-3 py-1.5 hover:bg-panel-deep"
          >
            {s.label.toUpperCase()}
          </Link>
        ))}
      </div>
    </section>
  );
}
