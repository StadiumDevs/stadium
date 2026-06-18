import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ExternalLink, Trophy, Plus, ChevronRight, ChevronDown, Play, Trash2 } from "lucide-react";
import {
  api,
  type AdminAuthArg,
  type ApiJudgeView,
  type ApiLeaderboard,
  type ApiPrizeTier,
  type ApiSubmissionRow,
} from "@/lib/api";
import { prizeTiersFor } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ProjectReviewModal } from "@/components/admin/ProjectReviewModal";

type Draft = { requirements: number; techStack: number; innovation: number; notes: string };
type Tab = "score" | "results";

const BOUNDS = { requirements: 2, techStack: 5, innovation: 5 } as const;

const draftFromRow = (row: ApiSubmissionRow): Draft => ({
  requirements: row.myScore?.requirements ?? 0,
  techStack: row.myScore?.techStack ?? 0,
  innovation: row.myScore?.innovation ?? 0,
  notes: row.myScore?.notes ?? "",
});

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const round1 = (n: number) => Math.round(n * 10) / 10;
const prizeText = (amount?: number | null, currency?: string | null) =>
  amount != null ? `${amount} ${currency ?? ""}`.trim() : null;
// Short, readable judge label (local-part of the email) for "who's working on this".
const judgeLabel = (email: string) => email.split("@")[0];
const judgesText = (emails?: string[]) => (emails && emails.length ? emails.map(judgeLabel).join(", ") : "");

/**
 * Judge/admin scoring surface. Judging is split into fixed batches of 10; a
 * judge claims the batches they'll cover ("Claim next 10"), scores them, and
 * bulk-saves per batch, then submits once their claimed batches are scored.
 * RESULTS ranks every submission once each has a score from a submitted judge
 * (coverage), showing the per-judge breakdown. Winner selection + publishing is
 * platform-admin only (`canSelectWinners`).
 */
export function ProgramJudgingSection({
  programSlug,
  getAuth,
  signPublishAction,
  canSelectWinners = false,
  prizeTiers,
  resultsPublishedAt = null,
  onPublishedChange,
}: {
  programSlug: string;
  getAuth: () => Promise<AdminAuthArg>;
  /**
   * Fresh-signature source for PUBLISHING results only — the one irreversible,
   * public action we still gate behind a deliberate wallet signature. Everything
   * else (scoring, award, mark paid) rides the cached admin session opened at
   * sign-in. When omitted, publish falls back to the cached session too.
   */
  signPublishAction?: () => Promise<string>;
  canSelectWinners?: boolean;
  prizeTiers?: ApiPrizeTier[] | null;
  resultsPublishedAt?: string | null;
  onPublishedChange?: (at: string | null) => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("score");
  // The demo currently previewed in the in-app review modal (null = closed).
  const [review, setReview] = useState<{ url: string; title: string } | null>(null);
  const [view, setView] = useState<ApiJudgeView | null>(null);
  const [board, setBoard] = useState<ApiLeaderboard | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [savingBatch, setSavingBatch] = useState<number | null>(null);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const [paidId, setPaidId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(resultsPublishedAt);
  const [publishing, setPublishing] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);
  // Batch overview: which unclaimed batches are checked for multi-claim, which
  // batch is expanded to preview its submissions, and an in-flight delete.
  const [selectedBatches, setSelectedBatches] = useState<Set<number>>(new Set());
  const [openBatch, setOpenBatch] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Inline score edits made from the RESULTS view (keyed by submission id).
  const [resultDrafts, setResultDrafts] = useState<Record<string, { requirements: number; techStack: number; innovation: number }>>({});
  const [savingScoreId, setSavingScoreId] = useState<string | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  // Admin: push a winning submission into the central winners/payments panel.
  const promoteWinner = async (submissionId: string) => {
    setPromotingId(submissionId);
    try {
      const auth = await getAuth();
      const r = await api.promoteSubmission(programSlug, submissionId, auth);
      toast({ title: r.data.alreadyPromoted ? "Already in the winners panel" : "Added to the winners panel" });
      await loadLeaderboard();
    } catch (e) {
      toast({ title: "Couldn't promote", description: (e as Error)?.message || "Unknown error", variant: "destructive" });
    } finally {
      setPromotingId(null);
    }
  };

  const setResultField = (
    id: string,
    field: "requirements" | "techStack" | "innovation",
    raw: string,
    current: { requirements: number; techStack: number; innovation: number },
  ) =>
    setResultDrafts((prev) => {
      const cur = prev[id] ?? current;
      const n = Math.max(0, Math.min(BOUNDS[field], round1(Number(raw) || 0)));
      return { ...prev, [id]: { ...cur, [field]: n } };
    });

  // Save the viewing judge's own score for one project straight from RESULTS.
  const saveResultScore = async (
    submissionId: string,
    current: { requirements: number; techStack: number; innovation: number },
  ) => {
    const draft = resultDrafts[submissionId] ?? current;
    setSavingScoreId(submissionId);
    try {
      const auth = await getAuth();
      await api.upsertScore(programSlug, submissionId, draft, auth);
      toast({ title: "Score saved" });
      await loadLeaderboard(); // refresh averages + ranking
      setResultDrafts((prev) => {
        const next = { ...prev };
        delete next[submissionId];
        return next;
      });
    } catch (e) {
      toast({ title: "Couldn't save score", description: (e as Error)?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSavingScoreId(null);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const auth = await getAuth();
      const blob = await api.exportProgramSubmissionsCsv(programSlug, auth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${programSlug}-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Submissions CSV downloaded" });
    } catch (e) {
      toast({
        title: "Couldn't export submissions",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const tiers = useMemo(() => prizeTiersFor(prizeTiers), [prizeTiers]);

  // Merge fresh server rows into drafts without clobbering unsaved edits.
  const seedDrafts = useCallback((rows: ApiSubmissionRow[]) => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of rows) if (!(s.id in next)) next[s.id] = draftFromRow(s);
      return next;
    });
  }, []);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await getAuth();
      const res = await api.listSubmissions(programSlug, auth);
      setView(res.data);
      setDrafts(Object.fromEntries(res.data.submissions.map((s) => [s.id, draftFromRow(s)])));
    } catch (e) {
      toast({
        title: "Couldn't load submissions",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [programSlug, getAuth, toast]);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const auth = await getAuth();
      const res = await api.getLeaderboard(programSlug, auth);
      setBoard(res.data);
    } catch (e) {
      toast({
        title: "Couldn't load results",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [programSlug, getAuth, toast]);

  useEffect(() => {
    if (tab === "score") loadSubmissions();
    else loadLeaderboard();
  }, [tab, loadSubmissions, loadLeaderboard]);

  const locked = view?.locked ?? false;
  const claimedSet = useMemo(() => new Set(view?.claimedBatches ?? []), [view]);

  // Submissions in the batches this judge has claimed, grouped by batch number.
  const claimedGroups = useMemo(() => {
    if (!view) return [] as { batchNumber: number; subs: ApiSubmissionRow[] }[];
    const nums = [...(view.claimedBatches ?? [])].sort((a, b) => a - b);
    return nums.map((batchNumber) => ({
      batchNumber,
      subs: view.submissions.filter((s) => s.batchNumber === batchNumber),
    }));
  }, [view]);

  const allScored = useMemo(() => {
    const mine = claimedGroups.flatMap((g) => g.subs);
    return mine.length > 0 && mine.every((s) => s.myScore !== null);
  }, [claimedGroups]);

  const setField = (id: string, field: keyof Draft, raw: string) => {
    setDrafts((prev) => {
      const cur = prev[id] ?? { requirements: 0, techStack: 0, innovation: 0, notes: "" };
      if (field === "notes") return { ...prev, [id]: { ...cur, notes: raw } };
      const max = BOUNDS[field];
      // One decimal place (e.g. 4.3), clamped to [0, max].
      const n = Math.max(0, Math.min(max, round1(Number(raw) || 0)));
      return { ...prev, [id]: { ...cur, [field]: n } };
    });
  };

  const claimBatch = async (batchNumber?: number) => {
    setClaiming(true);
    try {
      const auth = await getAuth();
      const res = await api.claimBatch(programSlug, batchNumber, auth);
      setView(res.data);
      seedDrafts(res.data.submissions);
      if (res.meta?.nothingToClaim) toast({ title: "Every batch is already claimed" });
      else toast({ title: `Claimed batch ${res.meta?.claimed}` });
    } catch (e) {
      toast({
        title: "Couldn't claim batch",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  const toggleSelect = (batchNumber: number) =>
    setSelectedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchNumber)) next.delete(batchNumber);
      else next.add(batchNumber);
      return next;
    });

  // Claim several batches at once (sequential idempotent claims; last view wins).
  const claimSelected = async () => {
    const nums = [...selectedBatches].sort((a, b) => a - b);
    if (nums.length === 0) return;
    setClaiming(true);
    try {
      const auth = await getAuth();
      let last: Awaited<ReturnType<typeof api.claimBatch>> | undefined;
      for (const n of nums) {
        last = await api.claimBatch(programSlug, n, auth);
      }
      if (last) {
        setView(last.data);
        seedDrafts(last.data.submissions);
      }
      setSelectedBatches(new Set());
      toast({ title: `Claimed ${nums.length} batch${nums.length === 1 ? "" : "es"}` });
    } catch (e) {
      toast({
        title: "Couldn't claim batches",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  // Admin: delete a submission (e.g. a test entry). Reloads so batch membership
  // (which shifts when a submission is removed) stays correct.
  const deleteSub = async (s: ApiSubmissionRow) => {
    if (!window.confirm(`Delete "${s.projectTitle}" by ${s.submitterName}? This removes the submission and any scores, and can't be undone.`)) return;
    setDeletingId(s.id);
    try {
      const auth = await getAuth();
      await api.deleteSubmission(programSlug, s.id, auth);
      toast({ title: "Submission deleted" });
      await loadSubmissions();
    } catch (e) {
      toast({
        title: "Couldn't delete submission",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const saveBatch = async (batchNumber: number, subs: ApiSubmissionRow[]) => {
    setSavingBatch(batchNumber);
    try {
      const auth = await getAuth();
      const rows = subs.map((s) => ({ submissionId: s.id, ...(drafts[s.id] ?? draftFromRow(s)) }));
      const res = await api.saveScores(programSlug, rows, auth);
      const byId = new Map(res.data.map((sc) => [sc.submissionId, sc]));
      setView((prev) =>
        prev
          ? { ...prev, submissions: prev.submissions.map((s) => (byId.has(s.id) ? { ...s, myScore: byId.get(s.id)! } : s)) }
          : prev,
      );
      toast({ title: `Batch ${batchNumber} saved`, description: `${subs.length} score${subs.length === 1 ? "" : "s"} saved.` });
    } catch (e) {
      toast({
        title: "Couldn't save batch",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSavingBatch(null);
    }
  };

  const submitBallot = async () => {
    setSubmitting(true);
    try {
      const auth = await getAuth();
      await api.submitBallot(programSlug, auth);
      toast({ title: "Scores submitted", description: "Your scores now count. You can still revise and re-save them." });
      await loadSubmissions();
    } catch (e) {
      toast({
        title: "Couldn't submit scores",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Publish re-signs fresh (the one action still gated). Everything else rides
  // the cached admin session opened at sign-in.
  const publishAuth = () => (signPublishAction ? signPublishAction() : getAuth());

  // Platform admin: assign a prize tier (winner) to a submission, or clear it.
  const award = async (submissionId: string, amountRaw: string) => {
    const tier = amountRaw === "" ? null : tiers.find((t) => t.amount === Number(amountRaw)) ?? null;
    setAwardingId(submissionId);
    try {
      const auth = await getAuth();
      await api.awardPrize(programSlug, submissionId, tier, auth);
      setBoard((prev) =>
        prev && !prev.locked
          ? {
              ...prev,
              rows: prev.rows.map((r) =>
                r.submissionId === submissionId
                  ? { ...r, prizeAmount: tier?.amount ?? null, prizeCurrency: tier?.currency ?? null, prizeLabel: tier?.label ?? null }
                  : r,
              ),
            }
          : prev,
      );
      toast({ title: tier ? `Awarded ${prizeText(tier.amount, tier.currency)}` : "Prize cleared" });
    } catch (e) {
      toast({
        title: "Couldn't update winner",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setAwardingId(null);
    }
  };

  // Platform admin: toggle payout-sent tracking on a submission.
  const markPaid = async (submissionId: string, paid: boolean) => {
    setPaidId(submissionId);
    try {
      const auth = await getAuth();
      await api.setSubmissionPaid(programSlug, submissionId, paid, auth);
      setBoard((prev) =>
        prev && !prev.locked
          ? { ...prev, rows: prev.rows.map((r) => (r.submissionId === submissionId ? { ...r, paid } : r)) }
          : prev,
      );
      toast({ title: paid ? "Marked paid" : "Marked unpaid" });
    } catch (e) {
      toast({
        title: "Couldn't update payout status",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPaidId(null);
    }
  };

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const auth = await publishAuth();
      const res = await api.publishResults(programSlug, !publishedAt, auth);
      setPublishedAt(res.data.resultsPublishedAt);
      onPublishedChange?.(res.data.resultsPublishedAt);
      toast({
        title: res.data.resultsPublishedAt ? "Results published" : "Results unpublished",
        description: res.data.resultsPublishedAt
          ? "All submissions + winners are now public on the program page."
          : "The public results section is hidden again.",
      });
    } catch (e) {
      toast({
        title: "Couldn't update results",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  const exportCsv = () => {
    if (!board || board.locked) return;
    const header = ["Rank", "Project", "Avg total", "Avg requirements", "Avg tech stack", "Avg innovation", "Judges", "Prize"];
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [
      header.map(cell).join(","),
      ...board.rows.map((r) =>
        [r.rank, r.projectTitle, fmt(r.avgTotal), fmt(r.avgRequirements), fmt(r.avgTechStack), fmt(r.avgInnovation), r.judgeCount, prizeText(r.prizeAmount, r.prizeCurrency) ?? ""]
          .map(cell)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${programSlug}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // One scoring card (used inside a batch group).
  const renderCard = (s: ApiSubmissionRow) => {
    const d = drafts[s.id] ?? draftFromRow(s);
    const total = d.requirements + d.techStack + d.innovation;
    return (
      <div key={s.id} className="border border-hairline p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <div className="min-w-0">
            <span className="font-mono text-[13px] text-display">{s.projectTitle}</span>
            <span className="label-hw-dim ml-2">{s.submitterName}</span>
          </div>
          <div className="flex items-center gap-2">
            {s.late && (
              <span className="label-hw text-amber-500" title="Submitted after the deadline">·LATE</span>
            )}
            {!s.eligible && (
              <span className="label-hw text-destructive" title="This email is not in the Luma signup list">·NOT IN LUMA</span>
            )}
            <button
              type="button"
              onClick={() => setReview({ url: s.videoUrl, title: s.projectTitle })}
              className="label-hw-dim hover:text-display inline-flex items-center gap-1"
            >
              VIDEO <Play className="h-3 w-3" />
            </button>
            <a href={s.githubUrl} target="_blank" rel="noreferrer" className="label-hw-dim hover:text-display inline-flex items-center gap-1">
              GITHUB <ExternalLink className="h-3 w-3" />
            </a>
            {canSelectWinners && (
              <button
                type="button"
                onClick={() => deleteSub(s)}
                disabled={deletingId === s.id}
                title="Delete this submission (admin)"
                className="label-hw-dim hover:text-destructive inline-flex items-center gap-1 disabled:opacity-50"
              >
                {deletingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>
        {s.projectBrief && (
          <p className="text-body text-[12px] leading-relaxed mb-2 whitespace-pre-wrap">{s.projectBrief}</p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
          {(["requirements", "techStack", "innovation"] as const).map((field) => (
            <label key={field} className="block">
              <span className="label-hw-dim block mb-1">
                {field === "requirements" ? "REQUIREMENTS /2" : field === "techStack" ? "TECH STACK /5" : "INNOVATION /5"}
              </span>
              <input
                type="number"
                min={0}
                max={BOUNDS[field]}
                step={0.1}
                value={d[field]}
                onChange={(e) => setField(s.id, field, e.target.value)}
                className="w-full font-mono text-[13px] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display disabled:opacity-50"
              />
            </label>
          ))}
          <div className="label-hw text-display self-center">TOTAL {round1(total)} / 12</div>
        </div>
        <textarea
          rows={2}
          value={d.notes}
          placeholder="Notes (optional)"
          onChange={(e) => setField(s.id, "notes", e.target.value)}
          className="mt-2 w-full font-mono text-[12px] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display disabled:opacity-50"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 label-hw-dim">
          <span>{s.myScore ? "·YOU: SAVED" : "·YOU: NOT SCORED"}</span>
          {s.scoredBy && s.scoredBy.length > 0 && (
            <span title={s.scoredBy.join(", ")}>
              SCORED BY {s.scoredBy.length}: {judgesText(s.scoredBy)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="panel p-4 mb-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="label-hw text-display">·JUDGING</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            title="Download all submissions + feedback responses as CSV"
            className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
          >
            {exporting ? "EXPORTING…" : "DOWNLOAD CSV"}
          </button>
          <div className="inline-flex border border-hairline">
          {(["score", "results"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "font-mono text-[10px] tracking-[0.14em] px-3 py-1.5",
                tab === t ? "bg-display text-shell" : "text-display hover:bg-panel-deep",
              )}
            >
              {t === "score" ? "SCORE" : "RESULTS"}
            </button>
          ))}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 label-hw-dim py-6">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading…
        </div>
      ) : tab === "score" ? (
        !view || view.submissions.length === 0 ? (
          <p className="label-hw-dim py-3">No submissions yet.</p>
        ) : (
          <>
            {locked && (
              <div className="lcd p-2.5 mb-3 flex flex-wrap items-center gap-2">
                <span className="label-hw text-display">·SUBMITTED — SCORES COUNT. YOU CAN STILL REVISE, AND CLAIM + SCORE MORE BATCHES.</span>
                {view.ballotProgress && (
                  <span className="label-hw-dim">
                    · {view.ballotProgress.submitted} of {view.ballotProgress.total} judges in
                    {view.ballotProgress.total - view.ballotProgress.submitted > 0
                      ? `, waiting on ${view.ballotProgress.total - view.ballotProgress.submitted} more`
                      : " — all in"}
                  </span>
                )}
              </div>
            )}

            {/* Batch overview: preview each batch's submissions, see who's working
                on it, and claim one or several. Available even after submitting,
                so a judge can keep going through more batches. */}
            {view.batches && view.batches.length > 0 && (
              <div className="lcd p-3 mb-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="label-hw text-display">·BATCHES ({view.batchSize ?? 10} EACH)</span>
                  <div className="flex items-center gap-2">
                    {selectedBatches.size > 0 && (
                      <button
                        type="button"
                        onClick={claimSelected}
                        disabled={claiming}
                        className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-3 py-1 inline-flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" aria-hidden="true" /> {claiming ? "CLAIMING…" : `CLAIM SELECTED (${selectedBatches.size}) ▸`}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => claimBatch()}
                      disabled={claiming || view.batches.every((b) => b.claimedByMe)}
                      className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1 inline-flex items-center gap-1"
                    >
                      {claiming ? "CLAIMING…" : `CLAIM NEXT ${view.batchSize ?? 10} ▸`}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {view.batches.map((b) => {
                    const subs = view.submissions.filter((s) => s.batchNumber === b.batchNumber);
                    const open = openBatch === b.batchNumber;
                    return (
                      <div key={b.batchNumber} className={cn("border", b.claimedByMe ? "border-display" : "border-hairline")}>
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          {!b.claimedByMe && (
                            <input
                              type="checkbox"
                              aria-label={`Select batch ${b.batchNumber}`}
                              checked={selectedBatches.has(b.batchNumber)}
                              onChange={() => toggleSelect(b.batchNumber)}
                              className="accent-display"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setOpenBatch(open ? null : b.batchNumber)}
                            className="min-w-0 flex-1 inline-flex items-center gap-1.5 text-left"
                          >
                            {open ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                            <span className="font-mono text-[11px] text-display">BATCH {b.batchNumber}</span>
                            <span className="label-hw-dim">· {b.size}p</span>
                            {b.claimedByMe && <span className="label-hw text-led">· MINE</span>}
                          </button>
                          <span
                            className="label-hw-dim truncate max-w-[45%] text-right"
                            title={b.claimedBy && b.claimedBy.length ? b.claimedBy.join(", ") : "Unclaimed"}
                          >
                            {b.claimCount === 0 ? "UNCLAIMED" : `WORKING: ${judgesText(b.claimedBy)}`}
                          </span>
                        </div>
                        {open && (
                          <div className="border-t border-hairline-subtle px-2 py-1.5 space-y-1">
                            {subs.length === 0 ? (
                              <p className="label-hw-dim">No submissions in this batch.</p>
                            ) : (
                              subs.map((s) => {
                                const scs = s.scores ?? [];
                                const avg = scs.length ? round1(scs.reduce((acc, x) => acc + x.total, 0) / scs.length) : null;
                                const breakdown = scs.map((x) => `${judgeLabel(x.judgeEmail)}: ${round1(x.total)}/12`).join(", ");
                                return (
                                  <div key={s.id} className="py-1 border-b border-hairline-subtle last:border-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="min-w-0 truncate font-mono text-[11px] text-display">
                                        {s.projectTitle} <span className="label-hw-dim">· {s.submitterName}</span>
                                      </span>
                                      <span className="flex items-center gap-2 flex-shrink-0 label-hw-dim">
                                        <button
                                          type="button"
                                          onClick={() => setReview({ url: s.videoUrl, title: s.projectTitle })}
                                          className="hover:text-display inline-flex items-center gap-1"
                                        >
                                          VIDEO <Play className="h-3 w-3" />
                                        </button>
                                        <a href={s.githubUrl} target="_blank" rel="noreferrer" className="hover:text-display inline-flex items-center gap-1">
                                          GIT <ExternalLink className="h-3 w-3" />
                                        </a>
                                        {canSelectWinners && (
                                          <button
                                            type="button"
                                            onClick={() => deleteSub(s)}
                                            disabled={deletingId === s.id}
                                            title="Delete this submission (admin)"
                                            className="hover:text-destructive disabled:opacity-50"
                                          >
                                            {deletingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                          </button>
                                        )}
                                      </span>
                                    </div>
                                    <div className="label-hw-dim mt-0.5" title={breakdown || undefined}>
                                      {avg != null
                                        ? `SCORE ${avg}/12 AVG · ${scs.length} judge${scs.length === 1 ? "" : "s"}: ${judgesText(s.scoredBy)}`
                                        : "NOT SCORED YET"}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {claimedGroups.length === 0 ? (
              <p className="label-hw-dim py-3">
                {locked ? "You scored no batches." : "Claim a batch above to start scoring."}
              </p>
            ) : (
              <div className="space-y-5">
                {claimedGroups.map((g) => {
                  return (
                    <div key={g.batchNumber} className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="label-hw text-display">·BATCH {g.batchNumber} ({g.subs.length})</span>
                        <button
                          type="button"
                          onClick={() => saveBatch(g.batchNumber, g.subs)}
                          disabled={savingBatch === g.batchNumber}
                          className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-3 py-1"
                        >
                          {savingBatch === g.batchNumber ? "SAVING…" : "SAVE BATCH"}
                        </button>
                      </div>
                      {g.subs.map(renderCard)}
                    </div>
                  );
                })}
              </div>
            )}

            {!locked && claimedGroups.length > 0 && (
              <div className="mt-4 border-t border-hairline pt-4 flex items-center justify-between gap-3">
                <p className="label-hw-dim">
                  {allScored ? "All claimed batches scored." : "Score every submission in your claimed batches to submit."}
                </p>
                <button
                  type="button"
                  onClick={submitBallot}
                  disabled={submitting || !allScored}
                  className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5"
                >
                  {submitting ? "SUBMITTING…" : "SUBMIT MY SCORES"}
                </button>
              </div>
            )}
          </>
        )
      ) : !board || board.rows.length === 0 ? (
        <p className="label-hw-dim py-3">No submissions yet.</p>
      ) : (
        <>
          {!board.complete && (
            <div className="lcd p-2.5 mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="label-hw text-amber-500">·LIVE — {board.submissionsScored}/{board.submissionsTotal} SUBMISSIONS SCORED</span>
              {board.pendingJudges.length > 0 && (
                <span className="label-hw-dim">· judges still finishing: {board.pendingJudges.join(", ")}</span>
              )}
              <span className="label-hw-dim">· publish unlocks once every submission is scored</span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="label-hw text-display inline-flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> {board.total} JUDGES · {board.complete ? "FINAL" : "LIVE"}
            </span>
            <div className="flex items-center gap-2">
              {canSelectWinners && (
                <button
                  type="button"
                  onClick={togglePublish}
                  disabled={publishing || (!publishedAt && !board.complete)}
                  title={!publishedAt && !board.complete ? "Score every submission before publishing" : undefined}
                  className={cn(
                    "font-mono text-[10px] tracking-[0.14em] px-3 py-1 disabled:opacity-50",
                    publishedAt
                      ? "border border-hairline text-display hover:bg-panel-deep"
                      : "border border-display bg-display text-shell hover:bg-display-dim",
                  )}
                >
                  {publishing ? "…" : publishedAt ? "UNPUBLISH" : "PUBLISH RESULTS ▸"}
                </button>
              )}
              <button
                type="button"
                onClick={exportCsv}
                className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1"
              >
                EXPORT CSV
              </button>
            </div>
          </div>
          {canSelectWinners && (
            <p className="label-hw-dim mb-2">
              {publishedAt
                ? "·PUBLISHED — submissions + winners are live on the public program page."
                : "·DRAFT — select winners below, then PUBLISH to reveal them publicly."}
            </p>
          )}
          <p className="label-hw-dim mb-2">Click a row to see the individual scores per judge.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="label-hw-dim border-b border-hairline">
                  <th className="py-2 pr-2"></th>
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">PROJECT</th>
                  <th className="py-2 pr-2">TOTAL /12</th>
                  <th className="py-2 pr-2">REQ</th>
                  <th className="py-2 pr-2">TECH</th>
                  <th className="py-2 pr-2">INNOV</th>
                  <th className="py-2 pr-2">JUDGES</th>
                  <th className="py-2 pr-2">PRIZE</th>
                  <th className="py-2 pr-2">PAID</th>
                </tr>
              </thead>
              <tbody>
                {board.rows.map((r) => {
                  const isOpen = !!expanded[r.submissionId];
                  return (
                    <Fragment key={r.submissionId}>
                      <tr
                        className="border-b border-hairline/50 cursor-pointer hover:bg-panel-deep/40"
                        onClick={() => setExpanded((prev) => ({ ...prev, [r.submissionId]: !prev[r.submissionId] }))}
                      >
                        <td className="py-2 pr-1 text-display">
                          {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </td>
                        <td className="py-2 pr-2 font-mono text-[13px] text-display">{r.rank}</td>
                        <td className="py-2 pr-2 font-mono text-[13px] text-display">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span>{r.projectTitle}</span>
                            {r.late && (
                              <span className="label-hw text-amber-500" title="Submitted after the deadline">·LATE</span>
                            )}
                            {r.eligible === false && (
                              <span className="label-hw text-destructive" title="Submitter email not in the Luma signup list">·NOT IN LUMA</span>
                            )}
                            <span className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              {r.videoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setReview({ url: r.videoUrl!, title: r.projectTitle })}
                                  className="label-hw-dim hover:text-display inline-flex items-center gap-1"
                                >
                                  <Play className="h-3 w-3" /> VIDEO
                                </button>
                              )}
                              {r.githubUrl && (
                                <a
                                  href={r.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="label-hw-dim hover:text-display inline-flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" /> GIT
                                </a>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 pr-2 font-mono text-[13px] text-display">{fmt(r.avgTotal)}</td>
                        <td className="py-2 pr-2 font-mono text-[12px] text-body">{fmt(r.avgRequirements)}</td>
                        <td className="py-2 pr-2 font-mono text-[12px] text-body">{fmt(r.avgTechStack)}</td>
                        <td className="py-2 pr-2 font-mono text-[12px] text-body">{fmt(r.avgInnovation)}</td>
                        <td className="py-2 pr-2 font-mono text-[12px] text-body">{r.judgeCount}</td>
                        <td className="py-2 pr-2" onClick={(e) => e.stopPropagation()}>
                          {canSelectWinners ? (
                            <select
                              value={r.prizeAmount ?? ""}
                              disabled={awardingId === r.submissionId}
                              onChange={(e) => award(r.submissionId, e.target.value)}
                              className="font-mono text-[12px] bg-panel-deep border border-hairline text-display px-2 py-1 focus:outline-none focus:border-display disabled:opacity-50"
                            >
                              <option value="">No prize</option>
                              {tiers.map((t) => (
                                <option key={`${t.amount}-${t.currency}`} value={t.amount}>
                                  {prizeText(t.amount, t.currency)}
                                </option>
                              ))}
                            </select>
                          ) : r.prizeAmount != null ? (
                            <span className="label-hw text-display inline-flex items-center gap-1">
                              <Trophy className="h-3 w-3" aria-hidden="true" /> {prizeText(r.prizeAmount, r.prizeCurrency)}
                            </span>
                          ) : (
                            <span className="label-hw-dim">—</span>
                          )}
                        </td>
                        <td className="py-2 pr-2" onClick={(e) => e.stopPropagation()}>
                          {canSelectWinners ? (
                            <label className="inline-flex items-center gap-1.5 cursor-pointer label-hw-dim">
                              <input
                                type="checkbox"
                                checked={!!r.paid}
                                disabled={paidId === r.submissionId}
                                onChange={(e) => markPaid(r.submissionId, e.target.checked)}
                                className="accent-display disabled:opacity-50"
                              />
                              {r.paid ? <span className="text-display">PAID</span> : "MARK"}
                            </label>
                          ) : r.paid ? (
                            <span className="label-hw text-display">·PAID</span>
                          ) : (
                            <span className="label-hw-dim">—</span>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-b border-hairline/50 bg-panel-deep/20">
                          <td></td>
                          <td colSpan={9} className="py-2 pr-2">
                            {(() => {
                              const myCur = r.myScore ?? { requirements: 0, techStack: 0, innovation: 0 };
                              const d = resultDrafts[r.submissionId] ?? myCur;
                              return (
                                <div className="lcd p-2.5 mb-3">
                                  <div className="label-hw-dim mb-1.5">·YOUR SCORE — EDIT + SAVE</div>
                                  <div className="flex flex-wrap items-end gap-2">
                                    {(["requirements", "techStack", "innovation"] as const).map((field) => (
                                      <label key={field} className="block">
                                        <span className="label-hw-dim block mb-1">
                                          {field === "requirements" ? "REQ /2" : field === "techStack" ? "TECH /5" : "INNOV /5"}
                                        </span>
                                        <input
                                          type="number"
                                          min={0}
                                          max={BOUNDS[field]}
                                          step={0.1}
                                          value={d[field]}
                                          onChange={(e) => setResultField(r.submissionId, field, e.target.value, myCur)}
                                          className="w-20 font-mono text-[13px] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display"
                                        />
                                      </label>
                                    ))}
                                    <span className="label-hw text-display self-center">TOTAL {round1(d.requirements + d.techStack + d.innovation)}/12</span>
                                    <button
                                      type="button"
                                      onClick={() => saveResultScore(r.submissionId, myCur)}
                                      disabled={savingScoreId === r.submissionId}
                                      className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-3 py-1.5"
                                    >
                                      {savingScoreId === r.submissionId ? "SAVING…" : r.myScore ? "RE-SAVE ▸" : "SAVE SCORE ▸"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                            {r.lumaEmail && (
                              <div className="label-hw-dim mb-2">
                                ·CONTACT: {r.submitterName ? `${r.submitterName} — ` : ""}
                                <a href={`mailto:${r.lumaEmail}`} className="text-display hover:underline">{r.lumaEmail}</a>
                              </div>
                            )}
                            {canSelectWinners && r.prizeAmount != null && (
                              <div className="mb-2">
                                <button
                                  type="button"
                                  onClick={() => promoteWinner(r.submissionId)}
                                  disabled={promotingId === r.submissionId || !!r.promotedProjectId}
                                  title="Add this winner to the central winners + payments panel"
                                  className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:bg-panel-deep disabled:text-label-dim disabled:border-hairline px-3 py-1.5"
                                >
                                  {r.promotedProjectId
                                    ? "✓ IN WINNERS PANEL"
                                    : promotingId === r.submissionId
                                      ? "ADDING…"
                                      : "ADD TO WINNERS PANEL ▸"}
                                </button>
                              </div>
                            )}
                            <div className="label-hw-dim mb-1">·SCORES PER JUDGE</div>
                            {(r.judgeScores ?? []).length === 0 ? (
                              <span className="label-hw-dim">No individual scores.</span>
                            ) : (
                              <div className="space-y-0.5">
                                {(r.judgeScores ?? []).map((j) => (
                                  <div key={j.judgeEmail} className="font-mono text-[12px] text-body flex flex-wrap gap-x-4">
                                    <span className="text-display">{j.judgeEmail}</span>
                                    <span>REQ {j.requirements}</span>
                                    <span>TECH {j.techStack}</span>
                                    <span>INNOV {j.innovation}</span>
                                    <span className="text-display">TOTAL {j.total}/12</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ProjectReviewModal
        open={!!review}
        url={review?.url ?? null}
        title={review?.title}
        onOpenChange={(v) => { if (!v) setReview(null); }}
      />
    </section>
  );
}
