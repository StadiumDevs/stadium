import { useCallback, useEffect, useState } from "react";
import {
  api,
  type AdminAuthArg,
  type ApiSubmissionMilestone,
  type ApiTrackedSubmission,
  type MilestonePayoutStatus,
} from "@/lib/api";
import { isEcosystem, type ProgramProfile } from "@/lib/programProfiles";
import { MilestoneProgress } from "@/components/program/tracked/MilestoneProgress";
import { useToast } from "@/hooks/use-toast";

const input = "w-full bg-panel-deep border border-hairline text-display font-mono text-[12px] px-2 py-1.5";
const toDate = (iso: string | null) => (iso ? iso.slice(0, 10) : "");
const fromDate = (v: string) => (v ? `${v}T12:00:00+05:30` : null);

/**
 * Admin side of the Ecosystem Prize milestones: assign the partner, record the
 * partner's confirmation, the Friday Lounge date and the payout. The builder's
 * own fields (milestone sentence, delivery link) are shown read-only.
 */
export function MilestonesAdminSection({
  profile,
  programSlug,
  getAuth,
}: {
  profile: ProgramProfile;
  programSlug: string;
  getAuth: () => Promise<AdminAuthArg>;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ApiTrackedSubmission[]>([]);

  const load = useCallback(async () => {
    const r = await api.listTrackedSubmissions(programSlug, await getAuth());
    setRows(r.data.submissions.filter((s) => s.details.milestone && isEcosystem(s)));
  }, [getAuth, programSlug]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const patch = async (id: string, p: Partial<ApiSubmissionMilestone>) => {
    try {
      const r = await api.updateSubmissionMilestone(programSlug, id, p, await getAuth());
      setRows((prev) => prev.map((s) => (s.id === id ? r.data : s)));
    } catch (e) {
      toast({ title: "Couldn't update milestone", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <section className="panel p-4 mb-3 space-y-3" aria-label="Milestones">
      <div className="label-hw text-display">·ECOSYSTEM PRIZE MILESTONES</div>
      <p className="label-hw-dim normal-case">
        Builders write the milestone and delivery link; you assign the partner and record confirmation, the Lounge date and the
        ${profile.milestone.payoutAmount} payout. The organisers' decision is final. If a milestone isn't completed the builder keeps the
        day prize.
      </p>
      {rows.length === 0 && <p className="label-hw-dim">No Ecosystem Prize winners yet. Award the podium prizes, then flag two projects on the leaderboard.</p>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {rows.map((s) => {
          const m = s.details.milestone as ApiSubmissionMilestone;
          return (
            <div key={s.id} className="lcd p-3 space-y-3" data-testid="milestone-admin-card">
              <div className="font-display text-lg uppercase tracking-tight text-display">{s.projectTitle}</div>
              <MilestoneProgress profile={profile} milestone={m} checkIns={s.details.checkIns} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="label-hw-dim block">PARTNER NAME</span>
                  <input className={input} defaultValue={m.partnerName ?? ""} onBlur={(e) => patch(s.id, { partnerName: e.target.value.trim() || null })} />
                </label>
                <label className="space-y-1">
                  <span className="label-hw-dim block">PARTNER PROJECT</span>
                  <input className={input} defaultValue={m.partnerProject ?? ""} onBlur={(e) => patch(s.id, { partnerProject: e.target.value.trim() || null })} />
                </label>
                <label className="space-y-1">
                  <span className="label-hw-dim block">AGREED ON</span>
                  <input type="date" className={input} defaultValue={toDate(m.agreedAt)} onChange={(e) => patch(s.id, { agreedAt: fromDate(e.target.value) })} />
                </label>
                <label className="space-y-1">
                  <span className="label-hw-dim block">PARTNER CONFIRMED DELIVERY</span>
                  <select
                    className={input}
                    value={m.partnerConfirmed === null ? "" : m.partnerConfirmed ? "yes" : "no"}
                    onChange={(e) =>
                      patch(s.id, {
                        partnerConfirmed: e.target.value === "" ? null : e.target.value === "yes",
                        partnerConfirmedAt: e.target.value === "yes" ? new Date().toISOString() : null,
                      })
                    }
                  >
                    <option value="">Not yet</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="label-hw-dim block">FRIDAY LOUNGE DATE</span>
                  <input type="date" className={input} defaultValue={m.loungeDate ?? ""} onChange={(e) => patch(s.id, { loungeDate: e.target.value || null })} />
                </label>
                <label className="space-y-1">
                  <span className="label-hw-dim block">PAYOUT</span>
                  <select
                    className={input}
                    value={m.payoutStatus}
                    onChange={(e) => {
                      const status = e.target.value as MilestonePayoutStatus;
                      patch(s.id, { payoutStatus: status, payoutReleasedAt: status === "released" ? new Date().toISOString() : null });
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="released">Released</option>
                    <option value="not_completed">Not completed (day prize kept)</option>
                  </select>
                </label>
              </div>
              <div className="text-[12px] text-body space-y-1 border-t border-hairline-subtle pt-2">
                <div>
                  <span className="label-hw-dim">BUILDER'S MILESTONE: </span>
                  {m.sentence}
                </div>
                <div className="break-all">
                  <span className="label-hw-dim">DELIVERY LINK: </span>
                  {m.deliveryLink ? (
                    <a href={m.deliveryLink} target="_blank" rel="noopener noreferrer" className="underline">{m.deliveryLink}</a>
                  ) : (
                    "Not delivered yet"
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
