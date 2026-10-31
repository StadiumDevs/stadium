import { useCallback, useEffect, useState } from "react";
import { api, type AdminAuthArg, type ApiSubmissionRefusal } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const REASON_LABEL: Record<ApiSubmissionRefusal["reasonCode"], string> = {
  not_checked_in: "Not on the Luma checked-in list",
  invalid: "Invalid or missing fields",
  unverified: "Check-in couldn't be verified",
  update_unverified: "Tried to update without verifying the email",
};

type Filter = "refused" | "accepted" | "dismissed" | "all";

const btn = "font-mono text-[10px] tracking-[0.14em] border rounded-sm px-3 py-1.5 disabled:opacity-50";

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " IST"
    : "";

/**
 * Refused project submissions, kept with the reason the builder was shown.
 * Program admins see them; only a master (global) admin can accept one (it
 * becomes an entry with the attempt's original time) or dismiss it.
 */
export function RefusedSubmissionsSection({
  programSlug,
  getAuth,
  canReview,
  reviewer,
}: {
  programSlug: string;
  getAuth: () => Promise<AdminAuthArg>;
  /** Master (global) admin: may accept / dismiss. */
  canReview: boolean;
  /** Shown as "by …" on reviewed rows (the wallet address). */
  reviewer: string | null;
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ApiSubmissionRefusal[] | null>(null);
  const [filter, setFilter] = useState<Filter>("refused");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api.listSubmissionRefusals(programSlug, await getAuth());
    setRows(r.data);
  }, [getAuth, programSlug]);

  useEffect(() => {
    load().catch(() => setRows([]));
  }, [load]);

  const act = async (r: ApiSubmissionRefusal, kind: "accept" | "dismiss") => {
    if (kind === "accept" && !window.confirm(`Accept "${r.projectTitle}" from ${r.lumaEmail}? It becomes an entry with its original submission time.`)) return;
    setBusy(r.id);
    try {
      const auth = await getAuth();
      if (kind === "accept") await api.acceptSubmissionRefusal(programSlug, r.id, auth, reviewer ?? "admin");
      else await api.dismissSubmissionRefusal(programSlug, r.id, auth, reviewer ?? "admin");
      toast({ title: kind === "accept" ? "Submission accepted" : "Refusal dismissed", description: r.projectTitle ?? r.lumaEmail });
      await load();
    } catch (e) {
      toast({ title: kind === "accept" ? "Couldn't accept" : "Couldn't dismiss", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (!rows) return null;
  const counts = { refused: 0, accepted: 0, dismissed: 0, all: rows.length };
  for (const r of rows) counts[r.status] += 1;
  // Verified builders who aren't on Luma's list wait for approval: list them first.
  const waiting = (r: ApiSubmissionRefusal) => r.status === "refused" && !!r.emailVerified;
  const shown = (filter === "all" ? rows : rows.filter((r) => r.status === filter))
    .slice()
    .sort((a, b) => Number(waiting(b)) - Number(waiting(a)));
  const waitingCount = rows.filter(waiting).length;

  return (
    <section className="panel p-4 mb-3 space-y-3" aria-label="Refused submissions" data-testid="refused-submissions">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="label-hw text-display">·REFUSED SUBMISSIONS ({counts.refused})</div>
        <div className="flex flex-wrap gap-1">
          {(["refused", "accepted", "dismissed", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              data-testid="refusal-filter"
              className={cn(btn, filter === f ? "border-display bg-display text-shell" : "border-hairline text-display hover:bg-panel-deep")}
            >
              {f.toUpperCase()} {counts[f]}
            </button>
          ))}
        </div>
      </div>
      {waitingCount > 0 && (
        <p className="label-hw text-warn" data-testid="refusals-waiting">
          ·{waitingCount} WAITING FOR APPROVAL: EMAIL VERIFIED, NOT ON LUMA'S CHECKED-IN LIST
        </p>
      )}
      <p className="label-hw-dim normal-case">
        Every refused submit is kept with the reason the builder was shown.{" "}
        {canReview
          ? "Accepting one creates the entry with its original time, so it lands in the right judging batch."
          : "Only a master admin can accept or dismiss."}
      </p>
      {shown.length === 0 ? (
        <p className="label-hw-dim">Nothing here.</p>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((r) => (
            <li key={r.id} className="lcd" data-testid="refusal-row" data-status={r.status}>
              <div className="p-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="label-hw-dim w-[118px] shrink-0">{when(r.createdAt)}</span>
                <span className="font-display text-base uppercase tracking-tight text-display">{r.projectTitle}</span>
                <span className="text-[12px] text-body">
                  {r.submitterName} · <span className="font-mono">{r.lumaEmail}</span>
                </span>
                <span
                  className={cn(
                    "label-hw border rounded-sm px-1.5 py-0.5",
                    r.reasonCode === "not_checked_in" ? "border-warn text-warn" : "border-hairline text-label-mid",
                  )}
                  data-testid="refusal-reason"
                >
                  {REASON_LABEL[r.reasonCode]}
                </span>
                {r.emailVerified && (
                  <span className="label-hw border border-led text-led rounded-sm px-1.5 py-0.5" data-testid="refusal-verified">
                    ✓ EMAIL VERIFIED{waiting(r) ? " · WAITING FOR APPROVAL" : ""}
                  </span>
                )}
                <div className="flex-1" />
                {r.status === "refused" || (r.status === "dismissed" && canReview) ? (
                  canReview ? (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => act(r, "accept")}
                        disabled={busy === r.id}
                        className={cn(btn, "border-display bg-display text-shell hover:bg-display-dim")}
                      >
                        ACCEPT
                      </button>
                      {r.status === "refused" && (
                        <button type="button" onClick={() => act(r, "dismiss")} disabled={busy === r.id} className={cn(btn, "border-hairline text-display hover:bg-panel-deep")}>
                          DISMISS
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="label-hw-dim">REFUSED</span>
                  )
                ) : null}
                {r.status !== "refused" && (
                  <span className={cn("label-hw", r.status === "accepted" ? "text-led" : "text-label-mid")} data-testid="refusal-status">
                    {r.status.toUpperCase()}
                    {r.reviewedBy ? ` · BY ${r.reviewedBy.length > 14 ? `${r.reviewedBy.slice(0, 6)}…${r.reviewedBy.slice(-4)}` : r.reviewedBy}` : ""}
                    {r.reviewedAt ? ` · ${when(r.reviewedAt)}` : ""}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(open === r.id ? null : r.id)}
                  aria-expanded={open === r.id}
                  className="label-hw-dim hover:text-display"
                >
                  {open === r.id ? "HIDE ▴" : "DETAILS ▾"}
                </button>
              </div>
              {open === r.id && (
                <div className="border-t border-hairline-subtle p-3 space-y-2 text-[13px] text-body">
                  <p>
                    <span className="label-hw-dim">MESSAGE SHOWN: </span>
                    {r.reason}
                  </p>
                  {r.payload.projectBrief && <p>{r.payload.projectBrief}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 break-all">
                    {r.payload.videoUrl && (
                      <a className="underline" href={r.payload.videoUrl} target="_blank" rel="noopener noreferrer">
                        Video
                      </a>
                    )}
                    {r.payload.githubUrl && (
                      <a className="underline" href={r.payload.githubUrl} target="_blank" rel="noopener noreferrer">
                        Repo
                      </a>
                    )}
                    {r.payload.details?.track && <span className="label-hw-dim">TRACK {r.payload.details.track.toUpperCase()}</span>}
                    {r.payload.details?.testnetTxid && <span className="font-mono text-[11px]">txid {r.payload.details.testnetTxid}</span>}
                  </div>
                  {r.acceptedSubmissionId && (
                    <p className="label-hw text-led" data-testid="refusal-accepted-entry">
                      ENTRY {r.acceptedSubmissionId}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
