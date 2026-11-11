import { Link } from "react-router-dom";
import type { ApiPublicSubmission } from "@/lib/api";
import { formatPrize, prizeEntries } from "@/lib/trackedDisplay";
import { isEcosystem, trackLabel, type ProgramProfile } from "@/lib/programProfiles";
import { cn } from "@/lib/utils";
import { MilestoneProgress } from "./MilestoneProgress";
import { TxCheckBadge } from "./TxCheckBadge";
import { projectPath } from "@/lib/projectUrl";

export function EcosystemBadge({ label }: { label: string }) {
  return (
    <span
      data-testid="ecosystem-badge"
      className="border border-display text-display px-2 py-[1px] font-mono text-[9px] font-bold tracking-[0.12em]"
    >
      ★ {label.toUpperCase()}
    </span>
  );
}

/**
 * One submitted project in the public grid. Always shows the next milestone; the
 * Ecosystem Prize winners also show their milestone. Only winners link to a
 * project page.
 */
export function SubmissionCard({
  profile,
  programSlug,
  submission: s,
  unitNumber,
  onOpen,
}: {
  profile: ProgramProfile;
  programSlug: string;
  submission: ApiPublicSubmission;
  unitNumber: string;
  onOpen: () => void;
}) {
  const prizes = prizeEntries(s);
  const scoredTracks = profile.tracks.filter((t) => s.scores?.[t.id]);
  const isWinner = prizes.length > 0;
  const hasMilestone = !!s.details.milestone && isEcosystem(s);

  return (
    <article
      data-testid="submission-card"
      data-winner={isWinner ? "true" : "false"}
      className={cn("lcd p-4 flex flex-col gap-3 min-w-0", isWinner && "border-display")}
    >
      <button
        type="button"
        onClick={onOpen}
        className="text-left space-y-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-display"
        aria-label={`Open details for ${s.projectTitle}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="label-hw-dim">ENTRY {unitNumber}</span>
          <div className="flex flex-wrap justify-end gap-1">
            {prizes.map(([t, p]) => (
              <span
                key={t}
                className="bg-display text-shell px-2 py-[2px] font-mono text-[9px] font-bold tracking-[0.12em]"
                title={p.label}
              >
                {formatPrize(p)}
              </span>
            ))}
          </div>
        </div>
        <h3 className="font-display text-xl uppercase tracking-tight text-display leading-tight break-words">
          {s.projectTitle}
        </h3>
        <p className="text-body text-[13px] leading-relaxed">{s.details.pitch}</p>
        <div className="label-hw-dim">BY {s.submitterName.toUpperCase()}</div>
      </button>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="border border-hairline text-label-mid px-2 py-[1px] font-mono text-[9px] tracking-[0.12em]">
          {trackLabel(profile, s.details.track)}
        </span>
        {s.details.track !== "agentic" && <TxCheckBadge check={s.details.txCheck} />}
        {isEcosystem(s) && <EcosystemBadge label={profile.milestone.flagLabel} />}
      </div>

      {s.scores && Object.keys(s.scores).length > 0 && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1" data-testid="card-scores">
          {scoredTracks.map((t) => (
              <div key={t.id} className="flex items-baseline gap-1.5" data-testid="card-score" data-track={t.id}>
                {/* Two scores (a "both" entry) keep the track so they can be told apart. */}
                <dt className="label-hw-dim">SCORE TOTAL{scoredTracks.length > 1 ? ` (${t.shortLabel})` : ""}</dt>
                <dd className="font-mono text-display text-[13px]">
                  {s.scores![t.id]!.score} <span className="text-label-dim text-[11px]">/ {s.scores![t.id]!.max}</span>
                </dd>
              </div>
            ))}
        </dl>
      )}

      {prizes.length > 0 && (
        <ul className="space-y-0.5">
          {prizes.map(([t, p]) => (
            <li key={t} className="font-mono text-[10px] tracking-[0.08em] text-display">
              ★ {p.label.toUpperCase()}
            </li>
          ))}
        </ul>
      )}

      {hasMilestone && s.details.milestone ? (
        <div className="border-t border-hairline-subtle pt-3">
          <MilestoneProgress profile={profile} milestone={s.details.milestone} compact />
        </div>
      ) : (
        <div className="border-t border-hairline-subtle pt-3 space-y-1">
          <div className="label-hw-dim">·NEXT MILESTONE</div>
          <p className="text-body text-[12px] leading-relaxed">{s.details.nextStep}</p>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onOpen}
          className="font-mono text-[10px] tracking-[0.14em] text-display hover:underline"
        >
          ALL DETAILS ▾
        </button>
        {isWinner && (
          <Link
            to={projectPath(programSlug, s.id)}
            className="font-mono text-[10px] tracking-[0.14em] text-display hover:underline"
          >
            PROJECT PAGE ▸
          </Link>
        )}
      </div>
    </article>
  );
}
