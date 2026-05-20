import {
  Rocket,
  CheckCircle2,
  Circle,
  Upload,
} from "lucide-react";
import { format } from "date-fns";

interface M2SubmissionTimelineProps {
  project: any;
  isTeamMember: boolean;
  isAdmin: boolean;
  isConnected: boolean;
  connectedWallet?: string | null;
  onSubmit: () => void;
}

const statusBadge = (status: string) => {
  const base =
    "inline-flex items-center gap-1.5 px-2 py-[2px] font-mono text-[10px] tracking-[0.12em] uppercase";
  switch (status) {
    case "completed":
      return { cls: `${base} border border-display bg-display text-shell`, label: "COMPLETED" };
    case "under_review":
      return { cls: `${base} border border-hairline bg-panel-deep text-display`, label: "UNDER REVIEW" };
    default:
      return { cls: `${base} border border-hairline text-label-mid`, label: "BUILDING" };
  }
};

function ChecklistRow({
  done,
  label,
  meta,
}: {
  done: boolean;
  label: string;
  meta?: string;
}) {
  return (
    <div className="flex items-center gap-3 lcd p-3">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-led flex-shrink-0" />
      ) : (
        <Circle className="h-3.5 w-3.5 text-label-dim flex-shrink-0" />
      )}
      <span className={`label-hw ${done ? "text-display" : "text-label-mid"}`}>·{label}</span>
      {meta && (
        <span className="label-hw-dim ml-auto font-mono">{meta.toUpperCase()}</span>
      )}
    </div>
  );
}

export function M2SubmissionTimeline({
  project,
  isTeamMember,
  isAdmin,
  isConnected,
  onSubmit,
}: M2SubmissionTimelineProps) {
  // Determine checklist states based on project data
  const isPlanAgreed = !!project.m2Agreement;
  const isDeliveryCompleted = !!project.finalSubmission;
  const isApproved = project.m2Status === 'completed';
  const isPayoutConfirmed = project.totalPaid?.some(
    (payment: { milestone: string }) => payment.milestone === 'M2'
  );

  const hasIncompleteMilestones = !isDeliveryCompleted && isPlanAgreed;

  const m2Payment = project.totalPaid?.find(
    (p: { milestone: string }) => p.milestone === 'M2'
  );
  const payoutMeta = m2Payment
    ? m2Payment.currency === 'DOT'
      ? `${m2Payment.amount.toLocaleString()} DOT`
      : `$${m2Payment.amount.toLocaleString()} ${m2Payment.currency}`
    : undefined;

  const status = statusBadge(project.m2Status);

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-3 border-b border-hairline-subtle">
        <div className="flex items-center gap-2">
          <Rocket className="h-3.5 w-3.5 text-label-mid" />
          <span className="label-hw text-display">·M2 PROGRAM PROGRESS</span>
        </div>
        <span className={status.cls}>
          <span className="led led-sm" aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div className="space-y-5">
        {/* Progress Checklist */}
        <div className="space-y-2">
          <ChecklistRow
            done={isPlanAgreed}
            label="M2 PLAN AGREED"
            meta={
              isPlanAgreed && project.m2Agreement?.agreedDate
                ? format(new Date(project.m2Agreement.agreedDate), 'MMM d, yyyy')
                : undefined
            }
          />
          <ChecklistRow
            done={isDeliveryCompleted}
            label="M2 DELIVERY COMPLETED"
            meta={
              isDeliveryCompleted && project.finalSubmission?.submittedDate
                ? format(new Date(project.finalSubmission.submittedDate), 'MMM d, yyyy')
                : undefined
            }
          />
          <ChecklistRow
            done={isApproved}
            label="M2 APPROVED"
            meta={
              isApproved && project.completionDate
                ? format(new Date(project.completionDate), 'MMM d, yyyy')
                : undefined
            }
          />
          <ChecklistRow
            done={isPayoutConfirmed}
            label="PAYOUT CONFIRMED"
            meta={payoutMeta}
          />
        </div>

        {/* Agreed Deliverables Section */}
        {(() => {
          const deliverables = project.m2Agreement?.agreedFeatures || project.milestones || [];
          const hasDeliverables = deliverables.length > 0;

          if (!hasDeliverables) return null;

          return (
            <div>
              <h3 className="label-hw text-display mb-2">·AGREED DELIVERABLES</h3>
              <div className="lcd p-4 space-y-2">
                {deliverables.map((item: string | { description?: string }, index: number) => {
                  const text = typeof item === 'string' ? item : item.description || '';
                  if (!text) return null;
                  return (
                    <div key={index} className="flex items-start gap-2 text-sm text-body">
                      <span className="text-display flex-shrink-0 font-mono text-xs mt-0.5">·</span>
                      <span className="flex-1 leading-relaxed whitespace-pre-line">{text}</span>
                    </div>
                  );
                })}
              </div>
              {project.m2Agreement?.successCriteria && (
                <div className="text-sm mt-3">
                  <span className="label-hw text-display">·SUCCESS CRITERIA: </span>
                  <span className="text-body whitespace-pre-line leading-relaxed">
                    {project.m2Agreement.successCriteria}
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Submitted / Approved Alert */}
        {isDeliveryCompleted && (
          <div className="lcd p-4 border-led">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-led flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                {project.m2Status === 'completed' ? (
                  <>
                    <p className="label-hw text-led">·YOUR M2 HAS BEEN APPROVED</p>
                    <p className="text-sm text-body">
                      Check Payment History for transaction details.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="label-hw text-led">
                      ·M2 DELIVERABLES SUBMITTED ON {format(new Date(project.finalSubmission.submittedDate), 'MMM d, yyyy').toUpperCase()}
                    </p>
                    <p className="text-sm text-body">
                      WebZero is reviewing your submission.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Button - Only show if incomplete milestones */}
        {hasIncompleteMilestones && (
          <div className="pt-1">
            {!isConnected ? (
              <div className="lcd p-3 text-center">
                <span className="label-hw-dim">·CONNECT YOUR WALLET TO SUBMIT DELIVERABLES</span>
              </div>
            ) : !isTeamMember && !isAdmin ? (
              <div className="lcd p-3 text-center">
                <span className="label-hw-dim">·ONLY TEAM MEMBERS CAN SUBMIT DELIVERABLES</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                className="w-full inline-flex items-center justify-center gap-2 font-mono text-[11px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-4 py-3"
              >
                <Upload className="h-3.5 w-3.5" />
                SUBMIT MILESTONE ▸
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
