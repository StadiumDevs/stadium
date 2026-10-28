import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ApiPublicSubmission } from "@/lib/api";
import { isEcosystem, type ProgramProfile } from "@/lib/programProfiles";
import { MilestoneProgress } from "./MilestoneProgress";
import { SubmissionDetails } from "./SubmissionDetails";
import { EcosystemBadge } from "./SubmissionCard";
import { formatPrize, prizeEntries } from "@/lib/trackedDisplay";

/** Opens from a project card (or a leaderboard row): every submitted field, no page needed. */
export function SubmissionDetailModal({
  profile,
  programSlug,
  submission,
  onOpenChange,
  showPageLink = true,
}: {
  profile: ProgramProfile;
  programSlug: string;
  submission: ApiPublicSubmission | null;
  onOpenChange: (open: boolean) => void;
  /** Winner page link; off where results may not be published yet (judging). */
  showPageLink?: boolean;
}) {
  const prizes = submission ? prizeEntries(submission) : [];
  const milestone = submission && isEcosystem(submission) ? submission.details.milestone : null;
  return (
    <Dialog open={!!submission} onOpenChange={onOpenChange}>
      {/* Inset from the viewport at every width with a visible border, so the
          panel never runs into the screen edge. The inner wrapper scrolls, so
          the close button (positioned on the dialog itself) never scrolls away. */}
      {/* Focus the dialog itself on open: the default (first focusable) is the
          tx badge, which pops its tooltip and makes the first Escape close
          only the tooltip. */}
      <DialogContent
        data-testid="submission-modal"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).focus();
        }}
        className="w-[calc(100%-2rem)] sm:max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden border border-hairline rounded-sm [&>button]:z-10"
      >
        {submission && (
          <div className="overflow-y-auto p-6 pr-10 flex flex-col gap-4" data-testid="submission-modal-body">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl uppercase tracking-tight text-left">
                {submission.projectTitle}
              </DialogTitle>
              <DialogDescription className="text-body text-left">{submission.details.pitch}</DialogDescription>
            </DialogHeader>
            {prizes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {prizes.map(([t, p]) => (
                  <span key={t} className="bg-display text-shell px-2 py-[2px] font-mono text-[10px] font-bold tracking-[0.12em]">
                    {formatPrize(p)} · {p.label.toUpperCase()}
                  </span>
                ))}
                {isEcosystem(submission) && <EcosystemBadge label={profile.milestone.flagLabel} />}
              </div>
            )}
            {milestone && <MilestoneProgress profile={profile} milestone={milestone} />}
            <SubmissionDetails profile={profile} submission={submission} />
            {showPageLink && prizes.length > 0 && (
              <Link
                to={`/programs/${programSlug}/projects/${submission.id}`}
                className="self-start font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-4 py-2"
              >
                OPEN PROJECT PAGE ▸
              </Link>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
