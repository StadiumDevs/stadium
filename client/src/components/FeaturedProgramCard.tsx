import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type ApiProgram } from "@/lib/api";

const btn = "font-mono text-[10px] tracking-[0.14em] border px-3 py-1.5 inline-flex items-center justify-center";

const dateRange = (start?: string | null, end?: string | null) => {
  if (!start) return null;
  const fmt = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(iso));
  const a = fmt(start);
  const b = end ? fmt(end) : a;
  return a === b ? a : `${a} – ${b}`;
};

/**
 * The homepage's featured event (top right of the hero): cover image, key
 * details and links to the program page and its results. Renders nothing until
 * the program is found in the list the homepage already loaded.
 */
export function FeaturedProgramCard({ programs, slug }: { programs: ApiProgram[]; slug: string }) {
  const program = programs.find((p) => p.slug === slug) ?? null;
  // Results link: the stats page once a snapshot is published, else the winners on the program page.
  const [statsPublished, setStatsPublished] = useState(false);
  useEffect(() => {
    if (!program || program.status !== "completed") return;
    let active = true;
    api
      .getProgramStats(slug)
      .then((r) => active && setStatsPublished(!!r))
      .catch(() => active && setStatsPublished(false));
    return () => {
      active = false;
    };
  }, [program, slug]);

  if (!program) return null;
  const when = dateRange(program.eventStartsAt, program.eventEndsAt);
  const city = program.location?.split(",").pop()?.trim() ?? null;
  const resultsReady = !!program.resultsPublishedAt || program.status === "completed";
  return (
    <aside className="panel p-3 w-full max-w-sm lg:ml-auto" aria-label={`Featured: ${program.name}`} data-testid="featured-program">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="label-hw text-display">·FEATURED</span>
        <span className="label-hw-dim">{program.status.toUpperCase()}</span>
      </div>
      <Link to={`/programs/${program.slug}`} className="block group" aria-label={`Open ${program.name}`}>
        {program.coverImageUrl && (
          <img
            src={program.coverImageUrl}
            alt={`${program.name} event`}
            width={1200}
            height={1200}
            loading="eager"
            decoding="async"
            className="w-full aspect-square object-cover rounded-sm border border-hairline bg-panel-deep group-hover:opacity-90 transition-opacity"
            data-testid="featured-cover"
          />
        )}
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display text-2xl uppercase tracking-tight text-display leading-none break-words">{program.name}</div>
            <div className="label-hw-dim mt-1 normal-case">
              {[when, city].filter(Boolean).join(" · ")}
            </div>
          </div>
          <img src="/logos/zcash-white-yellow.svg" alt="Zcash" className="h-5 w-auto mt-1 flex-shrink-0" />
        </div>
      </Link>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link to={`/programs/${program.slug}`} className={`${btn} border-hairline text-display hover:bg-panel-deep`} data-testid="featured-info">
          EVENT INFO ▸
        </Link>
        {resultsReady && (
          <Link
            to={statsPublished ? `/programs/${program.slug}/stats` : `/programs/${program.slug}`}
            className={`${btn} border-display bg-display text-shell hover:bg-display-dim`}
            data-testid="featured-results"
          >
            RESULTS ▸
          </Link>
        )}
      </div>
    </aside>
  );
}
