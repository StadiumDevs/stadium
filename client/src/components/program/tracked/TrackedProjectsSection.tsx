import { useMemo, useState } from "react";
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
}: {
  profile: ProgramProfile;
  programSlug: string;
  submissions: ApiPublicSubmission[];
  published: boolean;
}) {
  const [query, setQuery] = useState("");
  const [track, setTrack] = useState<TrackFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

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
    <section className="panel p-4 mb-4" aria-label="Submitted projects">
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
        onOpenChange={(v) => !v && setOpenId(null)}
      />
    </section>
  );
}
