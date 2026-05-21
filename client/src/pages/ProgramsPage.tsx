import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { api, type ApiProgram } from "@/lib/api";

const ProgramsPage = () => {
  const [programs, setPrograms] = useState<ApiProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listPrograms()
      .then((r) => {
        if (active) setPrograms(r.data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load programs");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openPrograms = programs.filter((p) => p.status === "open");
  const pastPrograms = programs.filter(
    (p) => p.status === "completed" || p.status === "closed",
  );

  return (
    <div className="min-h-screen scanlines">
      <Navigation />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="label-hw-dim mb-2">·PROGRAMS / OPEN</div>
          <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tight text-display leading-[0.95] mb-2">
            Programs
          </h1>
          <p className="text-body text-base max-w-2xl leading-relaxed">
            Open opportunities to build with WebZero — continuation tracks for past winners and upcoming events.
          </p>
        </div>

        <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline">
          <div className="label-hw text-display flex items-center gap-2">
            <span className="led led-sm" aria-hidden="true" /> ·GRID
          </div>
          <div className="label-hw-dim">
            {loading ? "…" : `${openPrograms.length} ${openPrograms.length === 1 ? "PROGRAM" : "PROGRAMS"}`}
          </div>
        </div>

        {loading ? (
          <div className="panel px-4 py-10 text-center label-hw-dim">Reading directory…</div>
        ) : error ? (
          <div className="panel px-4 py-10 text-center">
            <div className="label-hw text-destructive mb-2">·ERROR</div>
            <p className="label-hw-dim">{error}</p>
          </div>
        ) : openPrograms.length === 0 ? (
          <div className="panel px-4 py-10 text-center">
            <div className="label-hw text-display mb-2">·NO PROGRAMS OPEN</div>
            <p className="label-hw-dim">Nothing open right now. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {openPrograms.map((p, i) => (
              <ProgramRackCard key={p.id} program={p} number={String(i + 1).padStart(3, "0")} />
            ))}
          </div>
        )}

        {!loading && !error && pastPrograms.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline mt-10">
              <div className="label-hw text-display flex items-center gap-2">
                <span className="led led-sm" aria-hidden="true" /> ·PAST PROGRAMS
              </div>
              <div className="label-hw-dim">
                {`${pastPrograms.length} ${pastPrograms.length === 1 ? "PROGRAM" : "PROGRAMS"}`}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {pastPrograms.map((p, i) => (
                <ProgramRackCard key={p.id} program={p} number={String(i + 1).padStart(3, "0")} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const PROGRAM_TYPE_LABEL: Record<ApiProgram["programType"], string> = {
  dogfooding: "DOGFOODING",
  pitch_off: "PITCH-OFF",
  hackathon: "HACKATHON",
  m2_incubator: "M2 INCUBATOR",
};

// Phase 2 #94: M2 has its own custom destination page. Future custom pages
// (e.g. /dogfooding) can plug in here; other types fall through to the
// generic /programs/:slug detail.
const customRouteForProgramType = (type: ApiProgram["programType"]): string | null => {
  if (type === "m2_incubator") return "/m2-program";
  return null;
};

function ProgramRackCard({ program, number }: { program: ApiProgram; number: string }) {
  const date = (iso?: string | null) => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return null;
    }
  };
  const opens = date(program.applicationsOpenAt);
  const closes = date(program.applicationsCloseAt);
  const startsAt = date(program.eventStartsAt);

  const href = customRouteForProgramType(program.programType) ?? `/programs/${program.slug}`;

  const isOpen = program.status === "open";
  const statusLabel = isOpen
    ? "OPEN"
    : program.status === "completed"
      ? "COMPLETED"
      : program.status === "closed"
        ? "CLOSED"
        : "DRAFT";

  return (
    <Link
      to={href}
      className="lcd block px-4 py-4 transition-transform duration-150 hover:-translate-y-[1px] relative"
    >
      <div className="absolute top-3 right-3 flex items-center gap-1">
        <span className={`led led-sm${isOpen ? " led-pulse" : ""}`} aria-hidden="true" />
        <span className="label-hw-dim">{statusLabel}</span>
      </div>

      <div className="label-hw-dim mb-2">PROGRAM {number}</div>
      <h3 className="font-display text-2xl uppercase tracking-tight text-display line-clamp-1 mb-1">
        {program.name}
      </h3>
      <div className="label-hw-dim mb-3">{PROGRAM_TYPE_LABEL[program.programType]}</div>

      {program.description && (
        <p className="text-[12px] text-body leading-[1.65] line-clamp-3 mb-3">{program.description}</p>
      )}

      <div className="pt-3 border-t border-hairline-subtle space-y-1">
        {startsAt && (
          <div className="flex items-center justify-between">
            <span className="label-hw-dim">EVENT</span>
            <span className="font-mono text-[11px] text-display">{startsAt}</span>
          </div>
        )}
        {(opens || closes) && (
          <div className="flex items-center justify-between">
            <span className="label-hw-dim">APPS</span>
            <span className="font-mono text-[11px] text-display">
              {opens && closes ? `${opens} → ${closes}` : opens || closes}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

export default ProgramsPage;
