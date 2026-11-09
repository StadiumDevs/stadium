import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ApiPublicSubmission, JudgedTrack } from "@/lib/api";
import { judgedTracksOf, type ProgramProfile } from "@/lib/programProfiles";
import { cn } from "@/lib/utils";
import { SubmissionCard } from "./SubmissionCard";
import { prizeEntries } from "@/lib/trackedDisplay";
import { SubmissionDetailModal } from "./SubmissionDetailModal";

type TrackFilter = "all" | JudgedTrack;

/**
 * Public grid of every submitted project for a tracked program: search, track
 * filter, three columns on desktop / two on tablet / one on phone. Winners sit
 * at the top once results are published (the list arrives pre-sorted).
 */
export function TrackedProjectsSection({
  profile,
  programSlug,
  submissions,
  published,
  judgesByTrack,
}: {
  profile: ProgramProfile;
  programSlug: string;
  submissions: ApiPublicSubmission[];
  published: boolean;
  /** Once published: judges who scored each track (counts only), for the score caption. */
  judgesByTrack?: Partial<Record<JudgedTrack, number>> | null;
}) {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<TrackFilter>("all");
  // ?project=<id> (links from the stats page charts) opens that project's details.
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(() => params.get("project"));
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const id = params.get("project");
    if (!id) return;
    setOpenId(id);
    sectionRef.current?.scrollIntoView({ block: "start" });
  }, [params]);
  const close = () => {
    setOpenId(null);
    if (params.has("project")) {
      const next = new URLSearchParams(params);
      next.delete("project");
      setParams(next, { replace: true });
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return submissions.filter((s) => {
      if (track !== "all" && !judgedTracksOf(s.details.track).includes(track)) return false;
      if (!q) return true;
      return [s.projectTitle, s.submitterName, s.details.pitch, s.projectBrief, ...s.details.technologies, ...s.details.themes]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [submissions, query, track]);

  const winners = published ? filtered.filter((s) => prizeEntries(s).length > 0) : [];
  const rest = published ? filtered.filter((s) => prizeEntries(s).length === 0) : filtered;
  const open = submissions.find((s) => s.id === openId) ?? null;

  const filters: { id: TrackFilter; label: string }[] = [
    { id: "all", label: "ALL" },
    ...profile.tracks.map((t) => ({ id: t.id, label: t.shortLabel })),
  ];

  const grid = (list: ApiPublicSubmission[], offset: number) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="projects-grid">
      {list.map((s, i) => (
        <SubmissionCard
          key={s.id}
          profile={profile}
          programSlug={programSlug}
          submission={s}
          unitNumber={String(offset + i + 1).padStart(3, "0")}
          onOpen={() => setOpenId(s.id)}
        />
      ))}
    </div>
  );

  return (
    <section ref={sectionRef} className="panel p-4 mb-4 scroll-mt-4" aria-label="Submitted projects" data-testid="tracked-projects">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="label-hw text-display">
          ·PROJECTS ({filtered.length}
          {filtered.length !== submissions.length ? ` OF ${submissions.length}` : ""})
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by track">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTrack(f.id)}
                aria-pressed={track === f.id}
                className={cn(
                  "font-mono text-[10px] tracking-[0.12em] border px-2.5 py-1",
                  track === f.id ? "border-display bg-display text-shell" : "border-hairline text-display hover:bg-panel-deep",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects…"
            aria-label="Search projects"
            className="bg-panel-deep border border-hairline text-display placeholder:text-label-dim font-mono text-[12px] px-2 py-1.5 focus:outline-none focus:border-display w-full sm:w-56"
          />
        </div>
      </div>

      {published && judgesByTrack && Object.keys(judgesByTrack).length > 0 && (
        <p className="label-hw-dim normal-case mb-3" data-testid="scores-caption">
          {profile.tracks
            .filter((t) => judgesByTrack[t.id])
            .map((t) => {
              const n = judgesByTrack[t.id]!;
              const note = (t.judgesNote ?? "Scored by {n} judges").replace("{n}", String(n));
              return `${t.shortLabel.charAt(0)}${t.shortLabel.slice(1).toLowerCase()} scores: ${note.charAt(0).toLowerCase()}${note.slice(1)}`;
            })
            .join(" · ")}
          .
        </p>
      )}

      {submissions.length === 0 ? (
        <p className="label-hw-dim">No projects submitted yet. They appear here as soon as they are submitted.</p>
      ) : filtered.length === 0 ? (
        <p className="label-hw-dim">No projects match your search.</p>
      ) : (
        <div className="space-y-5">
          {winners.length > 0 && (
            <div className="space-y-2">
              <div className="label-hw-dim">·WINNERS</div>
              {grid(winners, 0)}
            </div>
          )}
          {rest.length > 0 && (
            <div className="space-y-2">
              {winners.length > 0 && <div className="label-hw-dim">·ALL OTHER PROJECTS</div>}
              {grid(rest, winners.length)}
            </div>
          )}
        </div>
      )}

      <SubmissionDetailModal
        profile={profile}
        programSlug={programSlug}
        submission={open}
        onOpenChange={(v) => !v && close()}
      />
    </section>
  );
}
