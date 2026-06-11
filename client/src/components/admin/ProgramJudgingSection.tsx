import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ExternalLink, Lock, Trophy } from "lucide-react";
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
const prizeText = (amount?: number | null, currency?: string | null) =>
  amount != null ? `${amount} ${currency ?? ""}`.trim() : null;

/**
 * Judge/admin scoring surface for a program. Two tabs: SCORE (rubric inputs per
 * submission, save drafts, submit the ballot) and RESULTS (ranked once every
 * registered judge submits). Winner selection + publishing on the RESULTS tab
 * is platform-admin only (`canSelectWinners`). Works for both wallet admins and
 * email judges — the parent supplies `getAuth`, which resolves the right header.
 */
export function ProgramJudgingSection({
  programSlug,
  getAuth,
  canSelectWinners = false,
  prizeTiers,
  resultsPublishedAt = null,
  onPublishedChange,
}: {
  programSlug: string;
  getAuth: () => Promise<AdminAuthArg>;
  /** True only for platform (global) admins — shows winner selection + publish. */
  canSelectWinners?: boolean;
  /** Program's configured prize tiers (falls back to the default set). */
  prizeTiers?: ApiPrizeTier[] | null;
  /** Current publish timestamp; null until results are published. */
  resultsPublishedAt?: string | null;
  onPublishedChange?: (at: string | null) => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("score");
  const [view, setView] = useState<ApiJudgeView | null>(null);
  const [board, setBoard] = useState<ApiLeaderboard | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [awardingId, setAwardingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string | null>(resultsPublishedAt);
  const [publishing, setPublishing] = useState(false);

  const tiers = useMemo(() => prizeTiersFor(prizeTiers), [prizeTiers]);

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

  const allScored = useMemo(() => {
    if (!view) return false;
    return view.submissions.length > 0 && view.submissions.every((s) => s.myScore !== null);
  }, [view]);

  const setField = (id: string, field: keyof Draft, raw: string) => {
    setDrafts((prev) => {
      const cur = prev[id] ?? { requirements: 0, techStack: 0, innovation: 0, notes: "" };
      if (field === "notes") return { ...prev, [id]: { ...cur, notes: raw } };
      const max = BOUNDS[field];
      const n = Math.max(0, Math.min(max, Math.round(Number(raw) || 0)));
      return { ...prev, [id]: { ...cur, [field]: n } };
    });
  };

  const saveRow = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    try {
      const auth = await getAuth();
      const res = await api.upsertScore(programSlug, id, d, auth);
      setView((prev) =>
        prev
          ? { ...prev, submissions: prev.submissions.map((s) => (s.id === id ? { ...s, myScore: res.data } : s)) }
          : prev,
      );
      toast({ title: "Score saved" });
    } catch (e) {
      toast({
        title: "Couldn't save score",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const submitBallot = async () => {
    setSubmitting(true);
    try {
      const auth = await getAuth();
      await api.submitBallot(programSlug, auth);
      toast({ title: "Scores submitted", description: "Your ballot is locked." });
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
                  ? {
                      ...r,
                      prizeAmount: tier?.amount ?? null,
                      prizeCurrency: tier?.currency ?? null,
                      prizeLabel: tier?.label ?? null,
                    }
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

  const togglePublish = async () => {
    setPublishing(true);
    try {
      const auth = await getAuth();
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
        [
          r.rank,
          r.projectTitle,
          fmt(r.avgTotal),
          fmt(r.avgRequirements),
          fmt(r.avgTechStack),
          fmt(r.avgInnovation),
          r.judgeCount,
          prizeText(r.prizeAmount, r.prizeCurrency) ?? "",
        ]
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

  return (
    <section className="panel p-4 mb-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="label-hw text-display">·JUDGING</div>
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
                <Lock className="h-3.5 w-3.5 text-display" aria-hidden="true" />
                <span className="label-hw text-display">SCORES SUBMITTED · LOCKED</span>
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
            <div className="space-y-3">
              {view.submissions.map((s) => {
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
                        {!s.eligible && (
                          <span className="label-hw text-destructive" title="This email is not in the Luma signup list">
                            ·NOT IN LUMA
                          </span>
                        )}
                        <a href={s.videoUrl} target="_blank" rel="noreferrer" className="label-hw-dim hover:text-display inline-flex items-center gap-1">
                          VIDEO <ExternalLink className="h-3 w-3" />
                        </a>
                        <a href={s.githubUrl} target="_blank" rel="noreferrer" className="label-hw-dim hover:text-display inline-flex items-center gap-1">
                          GITHUB <ExternalLink className="h-3 w-3" />
                        </a>
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
                            disabled={locked}
                            value={d[field]}
                            onChange={(e) => setField(s.id, field, e.target.value)}
                            className="w-full font-mono text-[13px] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display disabled:opacity-50"
                          />
                        </label>
                      ))}
                      <div className="label-hw text-display self-center">TOTAL {total} / 12</div>
                    </div>
                    <textarea
                      rows={2}
                      disabled={locked}
                      value={d.notes}
                      placeholder="Notes (optional)"
                      onChange={(e) => setField(s.id, "notes", e.target.value)}
                      className="mt-2 w-full font-mono text-[12px] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display disabled:opacity-50"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="label-hw-dim">{s.myScore ? "SAVED" : "NOT SCORED"}</span>
                      {!locked && (
                        <button
                          type="button"
                          onClick={() => saveRow(s.id)}
                          disabled={savingId === s.id}
                          className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-3 py-1"
                        >
                          {savingId === s.id ? "SAVING…" : "SAVE"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {!locked && (
              <div className="mt-4 border-t border-hairline pt-4 flex items-center justify-between gap-3">
                <p className="label-hw-dim">
                  {allScored ? "All submissions scored." : "Score every submission to submit your ballot."}
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
      ) : !board ? (
        <p className="label-hw-dim py-3">No results yet.</p>
      ) : board.locked ? (
        <div className="lcd p-4">
          <div className="label-hw text-display mb-2 inline-flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" /> RESULTS LOCKED
          </div>
          <p className="label-hw-dim">
            {board.submitted} of {board.total} judges have submitted. Winners can be selected once every judge submits.
          </p>
          {board.pending.length > 0 && (
            <p className="label-hw-dim mt-1">Waiting on: {board.pending.join(", ")}</p>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="label-hw text-display inline-flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> {board.total} JUDGES · FINAL
            </span>
            <div className="flex items-center gap-2">
              {canSelectWinners && (
                <button
                  type="button"
                  onClick={togglePublish}
                  disabled={publishing}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="label-hw-dim border-b border-hairline">
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">PROJECT</th>
                  <th className="py-2 pr-2">TOTAL /12</th>
                  <th className="py-2 pr-2">REQ</th>
                  <th className="py-2 pr-2">TECH</th>
                  <th className="py-2 pr-2">INNOV</th>
                  <th className="py-2 pr-2">PRIZE</th>
                </tr>
              </thead>
              <tbody>
                {board.rows.map((r) => (
                  <tr key={r.submissionId} className="border-b border-hairline/50">
                    <td className="py-2 pr-2 font-mono text-[13px] text-display">{r.rank}</td>
                    <td className="py-2 pr-2 font-mono text-[13px] text-display">
                      {r.projectTitle}
                      {r.eligible === false && (
                        <span className="label-hw text-destructive ml-2" title="Submitter email not in the Luma signup list">
                          ·NOT IN LUMA
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-2 font-mono text-[13px] text-display">{fmt(r.avgTotal)}</td>
                    <td className="py-2 pr-2 font-mono text-[12px] text-body">{fmt(r.avgRequirements)}</td>
                    <td className="py-2 pr-2 font-mono text-[12px] text-body">{fmt(r.avgTechStack)}</td>
                    <td className="py-2 pr-2 font-mono text-[12px] text-body">{fmt(r.avgInnovation)}</td>
                    <td className="py-2 pr-2">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
