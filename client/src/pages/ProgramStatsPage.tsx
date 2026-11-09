import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { api, type ApiProgram } from "@/lib/api";
import type { ProgramStats } from "@/lib/programStats";
import { ProgramStatsView, UpdatedAt } from "@/components/stats/ProgramStatsView";
import { StatsLlmsButtons } from "@/components/stats/StatsLlmsButtons";
import NotFound from "./NotFound";

/**
 * Public prize winners and submission stats page (/programs/:slug/stats).
 * Shows the published snapshot only: later score, prize or feedback changes
 * need a republish from the admin page.
 */
const ProgramStatsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [data, setData] = useState<{ stats: ProgramStats; publishedAt: string } | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const { hash } = useLocation();

  useEffect(() => {
    if (!slug) return setState("missing");
    let active = true;
    Promise.all([api.getProgramBySlug(slug), api.getProgramStats(slug)])
      .then(([p, s]) => {
        if (!active) return;
        setProgram(p.data);
        setData(s);
        setState(s ? "ok" : "missing");
      })
      .catch(() => active && setState("missing"));
    return () => {
      active = false;
    };
  }, [slug]);

  // Section links (#stats-…) from the program page: scroll once the page renders.
  useEffect(() => {
    if (state !== "ok" || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [state, hash]);

  if (state === "missing") return <NotFound />;
  if (state === "loading" || !program || !data) {
    return (
      <div className="min-h-screen scanlines">
        <Navigation />
        <main className="container mx-auto px-4 py-6">
          <p className="label-hw-dim">LOADING…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen scanlines">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-4">
          <Link to={`/programs/${program.slug}`} className="label-hw-dim hover:text-display inline-flex items-center gap-1">
            ◂ BACK TO {program.name.toUpperCase()}
          </Link>
        </div>
        <header className="mb-4">
          <UpdatedAt at={data.publishedAt} />
          <div className="label-hw-dim mt-2">·{program.name.toUpperCase()} / RESULTS</div>
          <h1 className="font-display text-3xl md:text-5xl uppercase tracking-tight text-display leading-[0.95] break-words">
            Prize winners and submission stats
          </h1>
          <StatsLlmsButtons program={{ name: program.name, slug: program.slug }} stats={data.stats} publishedAt={data.publishedAt} />
        </header>
        <ProgramStatsView stats={data.stats} slug={program.slug} />
      </main>
    </div>
  );
};

export default ProgramStatsPage;
