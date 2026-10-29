import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import {
  api,
  type AdminAuthArg,
  type ApiPrizeTier,
  type ApiRubricLeaderboard,
  type ApiRubricScore,
  type ApiTrackedSubmission,
  type JudgedTrack,
} from "@/lib/api";
import {
  batchFor,
  isFullyScored,
  judgedTracksOf,
  maxScore,
  rubricDraftKey,
  tiersForTrack,
  trackById,
  trackLabel,
  weightedTotal,
  type ProgramJudge,
  type ProgramProfile,
} from "@/lib/programProfiles";
import { buildRankedCsv, buildSubmissionsCsv, downloadCsv } from "@/lib/trackedCsv";
import { toPublicSubmission } from "@/lib/trackedDisplay";
import { TxCheckBadge, TxidLink } from "@/components/program/tracked/TxCheckBadge";
import { SubmissionDetailModal } from "@/components/program/tracked/SubmissionDetailModal";
import { JudgingProgressTable } from "./JudgingProgressTable";
import { ScoringNav, type ScoringNavItem } from "./ScoringNav";
import { CriteriaCarousel, type CheckStep } from "./CriteriaCarousel";
import { DemoVideo } from "./DemoVideo";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// A change not yet confirmed by the server. Kept on this device until it is,
// so a refresh or a dropped connection never loses a judge's work.
type Draft = { criteria: Record<string, number | null>; notes: string; revisit?: boolean; checks?: ApiRubricScore["checks"] };
const draftId = (submissionId: string, track: JudgedTrack) => `${submissionId}:${track}`;

const readDrafts = (key: string): Record<string, Draft> => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
};
const writeDrafts = (key: string, drafts: Record<string, Draft>) => {
  try {
    localStorage.setItem(key, JSON.stringify(drafts));
  } catch {
    // Storage unavailable — drafts live only in memory this session.
  }
};

// The open project lives in the URL hash (#p=<submission>:<track>) and in
// localStorage, so a refresh reopens it. The hash wins (it survives a copied link).
const readPos = (key: string): string | null => {
  const m = window.location.hash.match(/^#p=(.+)$/);
  if (m) return decodeURIComponent(m[1]);
  try {
    return localStorage.getItem(`${key}_pos`);
  } catch {
    return null;
  }
};
const writePos = (key: string, pos: string) => {
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#p=${encodeURIComponent(pos)}`);
  try {
    localStorage.setItem(`${key}_pos`, pos);
  } catch {
    // Storage unavailable — the hash still keeps the position.
  }
};

const NOTE_DEBOUNCE_MS = 700;
const RETRY_MS = 15000;

const fmt = (n: number) => (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
const btn = "font-mono text-[10px] tracking-[0.14em] border px-3 py-1.5 disabled:opacity-50";
const btnGhost = `${btn} border-hairline text-display hover:bg-panel-deep`;
const btnSolid = `${btn} border-display bg-display text-shell hover:bg-display-dim`;

/**
 * Judging for tracked programs. A judge (signed in by their email link) scores
 * only as themselves, one project at a time, with a progress bar and a jump
 * list; there is no way to open another judge's space. Admins (judgeEmail
 * null) get no scoring, only the live judges' progress, the per-track
 * leaderboards with tie-breaks, prize awards, publish, and the CSV export.
 */
export function RubricJudgingSection({
  profile,
  programSlug,
  prizeTiers,
  getAuth,
  getPollAuth,
  canSelectWinners,
  judgeEmail,
}: {
  profile: ProgramProfile;
  programSlug: string;
  prizeTiers: ApiPrizeTier[] | null | undefined;
  getAuth: () => Promise<AdminAuthArg>;
  /** Auth for background refreshes; must never open the wallet. Defaults to getAuth. */
  getPollAuth?: () => Promise<AdminAuthArg>;
  canSelectWinners: boolean;
  /** The signed-in judge (from their email link). null = admin: no scoring. */
  judgeEmail: string | null;
}) {
  const { toast } = useToast();
  const isJudge = !!judgeEmail;
  const [tab, setTab] = useState<"score" | "leaderboard">(isJudge ? "score" : "leaderboard");
  const [judges, setJudges] = useState<ProgramJudge[]>([]);
  // Scores are saved under the batch being judged now (evening until 20:00 on
  // the day, morning after); the judge can change it.
  const [session, setSession] = useState(batchFor(profile, new Date().toISOString()) ?? "");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [submissions, setSubmissions] = useState<ApiTrackedSubmission[]>([]);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [myScores, setMyScores] = useState<ApiRubricScore[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  // Per (submission, track): a save in flight, or the last one failed.
  const [sync, setSync] = useState<Record<string, "saving" | "error">>({});
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const timers = useRef<Record<string, number>>({});
  const [current, setCurrent] = useState<string | null>(null);
  const [progressToken, setProgressToken] = useState(0);
  const [unscoredOnly, setUnscoredOnly] = useState(false);
  const [boardTrack, setBoardTrack] = useState<JudgedTrack>(profile.tracks[0].id);
  const [board, setBoard] = useState<ApiRubricLeaderboard | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);
  // Leaderboard row whose project details are open (a reminder of what it was).
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const judge = judges.find((j) => j.email === judgeEmail) ?? null;
  const draftKey = rubricDraftKey(programSlug, judgeEmail ?? "admin");

  const loadAll = useCallback(async () => {
    const auth = await getAuth();
    const [j, list] = await Promise.all([api.listTrackJudges(programSlug, auth), api.listTrackedSubmissions(programSlug, auth)]);
    setJudges(j.data);
    setSubmissions(list.data.submissions);
    setPublishedAt(list.data.resultsPublishedAt);
  }, [getAuth, programSlug]);

  useEffect(() => {
    loadAll()
      .catch((e) => toast({ title: "Couldn't load judging", description: (e as Error).message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [loadAll, toast]);

  useEffect(() => {
    if (!judgeEmail) return;
    const pending = readDrafts(draftKey);
    draftsRef.current = pending;
    setDrafts(pending);
    setCurrent(readPos(draftKey));
    getAuth()
      .then((auth) => api.listMyRubricScores(programSlug, judgeEmail, auth))
      .then((r) => {
        setMyScores(r.data);
        // Changes made before a refresh that never reached the server.
        for (const id of Object.keys(draftsRef.current)) window.setTimeout(() => flush(id), 0);
      })
      .catch(() => setMyScores([]));
    // Load once per judge; flush is only read here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [judgeEmail, draftKey, getAuth, programSlug]);

  const loadBoard = useCallback(async () => {
    const auth = await getAuth();
    const r = await api.getRubricLeaderboard(programSlug, boardTrack, auth);
    setBoard(r.data);
  }, [getAuth, programSlug, boardTrack]);

  useEffect(() => {
    if (tab === "leaderboard") loadBoard().catch(() => setBoard(null));
  }, [tab, loadBoard]);

  // The judge's queue: one card per (submission, track) the judge may score.
  const queue = useMemo(() => {
    if (!judge) return [];
    const items: { s: ApiTrackedSubmission; track: JudgedTrack }[] = [];
    for (const s of submissions) {
      for (const t of judgedTracksOf(s.details.track)) if (judge.tracks.includes(t)) items.push({ s, track: t });
    }
    // Batches in order (evening first), keeping submission order within each.
    const rank = (b: string | null | undefined) => {
      const i = profile.judgingSessions.findIndex((x) => x.id === b);
      return i === -1 ? profile.judgingSessions.length : i;
    };
    return items.map((it, i) => ({ it, i })).sort((a, b) => rank(a.it.s.batch) - rank(b.it.s.batch) || a.i - b.i).map((x) => x.it);
  }, [judge, submissions, profile]);

  const savedFor = (submissionId: string, track: JudgedTrack) =>
    myScores.find((x) => x.submissionId === submissionId && x.track === track) ?? null;

  const draftFor = (submissionId: string, track: JudgedTrack): Draft => {
    const d = drafts[draftId(submissionId, track)];
    if (d) return d;
    const saved = savedFor(submissionId, track);
    if (saved) return { criteria: saved.criteria, notes: saved.notes, revisit: !!saved.revisit, checks: saved.checks ?? {} };
    const rubric = trackById(profile, track).rubric;
    return { criteria: Object.fromEntries(rubric.criteria.map((c) => [c.id, null])), notes: "", revisit: false, checks: {} };
  };

  const setPending = (all: Record<string, Draft>) => {
    draftsRef.current = all;
    setDrafts(all);
    writeDrafts(draftKey, all);
  };

  // Send one pending change to the judge's record. Partial scores are fine;
  // only fully scored projects count towards progress and the leaderboard.
  const flush = useCallback(
    async (id: string) => {
      const d = draftsRef.current[id];
      if (!d || !judgeEmail) return;
      const [submissionId, track] = id.split(":") as [string, JudgedTrack];
      setSync((x) => ({ ...x, [id]: "saving" }));
      try {
        const auth = await getAuth();
        const r = await api.saveRubricScore(
          programSlug,
          { submissionId, judgeEmail, track, criteria: d.criteria, notes: d.notes, session, revisit: !!d.revisit, checks: d.checks ?? {} },
          auth,
        );
        setMyScores((prev) => [...prev.filter((x) => !(x.submissionId === submissionId && x.track === track)), r.data]);
        // Clear it unless the judge changed it again while this was saving.
        if (draftsRef.current[id] === d) {
          const rest = { ...draftsRef.current };
          delete rest[id];
          draftsRef.current = rest;
          setDrafts(rest);
          writeDrafts(draftKey, rest);
        }
        setSync((x) => {
          const rest = { ...x };
          delete rest[id];
          return rest;
        });
        setProgressToken((n) => n + 1);
      } catch {
        setSync((x) => ({ ...x, [id]: "error" }));
      }
    },
    [draftKey, getAuth, judgeEmail, programSlug, session],
  );

  // Keep the change on this device first, then autosave it: rubric clicks go
  // at once, typing in the note waits for a pause.
  const updateDraft = (submissionId: string, track: JudgedTrack, next: Draft, delay = 0) => {
    const id = draftId(submissionId, track);
    setPending({ ...draftsRef.current, [id]: next });
    window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(() => flush(id), delay);
  };

  // Retry anything still pending: on load, when the connection returns, and
  // every 15 s.
  const flushAll = useCallback(() => {
    for (const id of Object.keys(draftsRef.current)) flush(id);
  }, [flush]);
  useEffect(() => {
    if (!judgeEmail) return;
    const id = window.setInterval(flushAll, RETRY_MS);
    window.addEventListener("online", flushAll);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", flushAll);
    };
  }, [judgeEmail, flushAll]);

  // revisit = the judge marked it to come back to (light orange, wins);
  // saved = fully scored on the server; draft = in progress (partial, or a
  // change still being saved); unscored = not touched yet.
  const itemState = (submissionId: string, track: JudgedTrack): ScoringNavItem["state"] => {
    const rubric = trackById(profile, track).rubric;
    const d = drafts[draftId(submissionId, track)];
    if (d?.revisit ?? savedFor(submissionId, track)?.revisit) return "revisit";
    if (d) return isFullyScored(rubric, d.criteria) && !sync[draftId(submissionId, track)] ? "saved" : "draft";
    const saved = savedFor(submissionId, track);
    if (!saved) return "unscored";
    if (isFullyScored(rubric, saved.criteria)) return "saved";
    return Object.values(saved.criteria).some((v) => typeof v === "number") || saved.notes ? "draft" : "unscored";
  };

  // "Check first" steps before the questions: the video, the repo, and (Privacy
  // track, with a txid) the transaction.
  const checkStepsFor = (sub: ApiTrackedSubmission, track: JudgedTrack, onWatched: () => void): CheckStep[] => {
    const steps: CheckStep[] = [
      {
        id: "video",
        chip: "VIDEO",
        title: "Watch the demo",
        prompt: "2 minutes max. Watch it here; does it show the core flow actually working?",
        href: sub.videoUrl,
        linkLabel: "OPEN VIDEO IN A NEW TAB",
        media: <DemoVideo url={sub.videoUrl} title={sub.projectTitle} onPlay={onWatched} />,
      },
      {
        id: "repo",
        chip: "REPO",
        title: "Check the repo",
        prompt: "Is there a README, and does the code match what the demo shows?",
        href: sub.githubUrl,
        linkLabel: "OPEN REPO",
        extraLinks: sub.details.publicUrl ? [{ href: sub.details.publicUrl, label: `The app: ${sub.details.publicUrl}` }] : undefined,
      },
    ];
    const txid = sub.details.testnetTxid;
    if (track === "privacy" && txid && profile.txExplorerUrl) {
      steps.push({
        id: "tx",
        chip: "TX",
        title: "Check the transaction",
        prompt: "Their testnet transaction on the public explorer. Stadium checked it exists and is shielded; amounts and memos stay private.",
        href: profile.txExplorerUrl(txid),
        linkLabel: "OPEN IN EXPLORER",
        extra: (
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-hw-dim">STADIUM'S CHECK</span>
            <TxCheckBadge check={sub.details.txCheck} />
          </div>
        ),
      });
    }
    return steps;
  };

  // The next project still to do: not fully scored, or marked to revisit.
  const nextToDo = (fromId: string | null) => {
    const at = queue.findIndex((q) => draftId(q.s.id, q.track) === fromId);
    const rotated = [...queue.slice(at + 1), ...queue.slice(0, Math.max(at, 0))];
    const next = rotated.find((q) => itemState(q.s.id, q.track) !== "saved");
    if (next) goTo(draftId(next.s.id, next.track));
    else toast({ title: "Nothing left to do", description: "Every project is scored and none is marked to revisit." });
  };

  const goTo = (key: string) => {
    setCurrent(key);
    writePos(draftKey, key);
  };

  const scoredCount = queue.filter(({ s, track }) => {
    const saved = savedFor(s.id, track);
    return saved && isFullyScored(trackById(profile, track).rubric, saved.criteria);
  }).length;

  const recheck = async (submissionId: string) => {
    setBusy(`tx:${submissionId}`);
    try {
      const auth = await getAuth();
      const r = await api.recheckSubmissionTx(programSlug, submissionId, auth);
      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? r.data : s)));
      toast({ title: "Re-checked on testnet", description: r.data.details.txCheck?.status.replace(/_/g, " ") });
      if (tab === "leaderboard") await loadBoard();
    } catch (e) {
      toast({ title: "Re-check failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const award = async (submissionId: string, amount: string) => {
    const tiers = tiersForTrack(prizeTiers, trackById(profile, boardTrack));
    const prize = amount === "" ? null : tiers.find((t) => String(t.amount) === amount) ?? null;
    setBusy(`prize:${submissionId}`);
    try {
      const auth = await getAuth();
      const r = await api.awardTrackPrize(programSlug, submissionId, boardTrack, prize, auth);
      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? r.data : s)));
      await loadBoard();
    } catch (e) {
      toast({ title: "Couldn't set prize", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const toggleEcosystem = async (submissionId: string, flagged: boolean) => {
    setBusy(`eco:${submissionId}`);
    try {
      const auth = await getAuth();
      const r = await api.setEcosystemPrize(programSlug, submissionId, flagged, auth);
      setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? r.data : s)));
      await loadBoard();
    } catch (e) {
      toast({ title: `Couldn't update the ${profile.milestone.flagLabel}`, description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const togglePublished = async () => {
    setBusy("publish");
    try {
      const auth = await getAuth();
      const r = await api.setTrackedResultsPublished(programSlug, !publishedAt, auth);
      setPublishedAt(r.data.resultsPublishedAt);
      toast({ title: r.data.resultsPublishedAt ? "Results published" : "Results unpublished" });
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = async () => {
    setBusy("csv");
    try {
      const auth = await getAuth();
      const [list, ...boards] = await Promise.all([
        api.listTrackedSubmissions(programSlug, auth),
        ...profile.tracks.map((t) => api.getRubricLeaderboard(programSlug, t.id, auth)),
      ]);
      const byTrack = Object.fromEntries(boards.map((b) => [b.data.track, b.data]));
      downloadCsv(`${programSlug}-submissions-and-scores.csv`, buildSubmissionsCsv(profile, list.data.submissions, byTrack));
    } catch (e) {
      toast({ title: "Couldn't export CSV", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="panel p-4 mb-3 flex items-center gap-2 label-hw-dim">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> LOADING JUDGING…
      </div>
    );
  }

  const ecosystemCount = board?.rows.filter((r) => r.ecosystemPrize).length ?? 0;
  const batchLabel = (b: string | null | undefined) => profile.judgingSessions.find((x) => x.id === b)?.short ?? null;
  const visibleQueue = queue.filter(
    ({ s, track }) =>
      (!unscoredOnly || itemState(s.id, track) !== "saved") && (batchFilter === "all" || s.batch === batchFilter),
  );
  const draftCount = queue.filter(({ s, track }) => itemState(s.id, track) === "draft").length;
  const revisitCount = queue.filter(({ s, track }) => itemState(s.id, track) === "revisit").length;
  const navItems: ScoringNavItem[] = visibleQueue.map(({ s, track }) => ({
    key: draftId(s.id, track),
    number: queue.findIndex((q) => q.s.id === s.id && q.track === track) + 1,
    title: s.projectTitle,
    state: itemState(s.id, track),
    group: batchLabel(s.batch) ?? undefined,
  }));
  const currentIdx = Math.max(0, queue.findIndex((q) => draftId(q.s.id, q.track) === current));
  const currentItem = queue[currentIdx] ?? null;
  const detailsRecord = detailsId ? submissions.find((x) => x.id === detailsId) ?? null : null;
  // Judges get the public view (anonymous names hidden); admins see the names.
  const detailsSubmission = detailsRecord ? toPublicSubmission(detailsRecord, { showPrizes: true, showNames: !isJudge }) : null;
  const guideTrack = judge?.tracks.find((t) => trackById(profile, t).rubric.guideUrl);

  return (
    <section className="panel p-4 mb-3 space-y-4" aria-label="Judging">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="label-hw text-display">·JUDGING</div>
        <div className="flex flex-wrap gap-1">
          {isJudge &&
            (["score", "leaderboard"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className={tab === t ? btnSolid : btnGhost}>
                {t === "score" ? "SCORE" : "LEADERBOARD"}
              </button>
            ))}
          {!isJudge && (
            <button type="button" onClick={exportCsv} disabled={busy === "csv"} className={btnGhost}>
              EXPORT CSV (SCORES + NOTES)
            </button>
          )}
        </div>
      </div>

      <JudgingProgressTable
        profile={profile}
        programSlug={programSlug}
        getAuth={getAuth}
        getPollAuth={getPollAuth}
        youName={judge?.name}
        refreshToken={progressToken}
      />

      {isJudge && !judge && (
        <p className="label-hw text-destructive normal-case" data-testid="judge-not-invited">
          {judgeEmail} is not a judge for this program.
        </p>
      )}

      {isJudge && judge && tab === "score" && (
        <>
          <div className="flex flex-wrap items-center gap-2" data-testid="scoring-as">
            <span className="label-hw-dim">SCORING AS</span>
            <span className="font-mono text-[12px] text-display">{judge.name}</span>
            <span className="label-hw-dim">· {judge.tracks.map((t) => trackById(profile, t).label).join(" and ")} only</span>
          </div>

          <ScoringNav
            items={navItems}
            currentKey={currentItem ? draftId(currentItem.s.id, currentItem.track) : null}
            scored={scoredCount}
            drafts={draftCount}
            revisits={revisitCount}
            total={queue.length}
            onJump={goTo}
          >
            <label className="flex items-center gap-1.5">
              <span className="label-hw-dim">SESSION</span>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                aria-label="Judging session"
                className="bg-panel-deep border border-hairline text-display font-mono text-[11px] px-1.5 py-1"
              >
                {profile.judgingSessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 label-hw-dim cursor-pointer">
              <input type="checkbox" checked={unscoredOnly} onChange={(e) => setUnscoredOnly(e.target.checked)} />
              TO DO ONLY
            </label>
            <div className="flex items-center gap-1" role="group" aria-label="Batch">
              {[{ id: "all", label: "ALL" }, ...profile.judgingSessions.map((b) => ({ id: b.id, label: b.id.toUpperCase() }))].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={batchFilter === b.id}
                  onClick={() => setBatchFilter(b.id)}
                  data-testid="batch-filter"
                  className={cn(
                    "font-mono text-[10px] tracking-[0.12em] border rounded-sm px-2 py-1",
                    batchFilter === b.id ? "border-display bg-display text-shell" : "border-hairline text-display hover:bg-panel-deep",
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
            {guideTrack && (
              <a
                href={trackById(profile, guideTrack).rubric.guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[10px] tracking-[0.14em] text-display hover:underline"
              >
                JUDGING GUIDE ▸
              </a>
            )}
          </ScoringNav>

          <p className="label-hw-dim normal-case">
            Every change saves to your judge record automatically. You can close the tab and carry on later, on any device.
          </p>

          {currentItem &&
            (() => {
              const { s, track } = currentItem;
              const id = draftId(s.id, track);
              const rubric = trackById(profile, track).rubric;
              const d = draftFor(s.id, track);
              const saved = savedFor(s.id, track);
              const pending = !!drafts[id];
              const complete = isFullyScored(rubric, d.criteria);
              const started = Object.values(d.criteria).some((v) => typeof v === "number") || !!d.notes;
              const total = weightedTotal(rubric, d.criteria);
              const prev = queue[(currentIdx - 1 + queue.length) % queue.length];
              const next = queue[(currentIdx + 1) % queue.length];
              return (
                <article className="lcd" data-testid="score-card" data-submission={s.projectTitle}>
                  <header className="p-3 flex flex-wrap items-center gap-2 border-b border-hairline-subtle">
                    <span className="label-hw-dim">
                      {currentIdx + 1} / {queue.length}
                    </span>
                    <span className="font-display text-lg uppercase tracking-tight text-display flex-1 min-w-[160px]">{s.projectTitle}</span>
                    <span className="label-hw-dim">{trackById(profile, track).shortLabel}</span>
                    {batchLabel(s.batch) && (
                      <span className="label-hw-dim border border-hairline rounded-sm px-1.5 py-0.5" data-testid="card-batch">
                        {batchLabel(s.batch)}
                      </span>
                    )}
                    {track === "privacy" && <TxCheckBadge check={s.details.txCheck} />}
<span
                      className={cn("label-hw", sync[id] === "error" ? "text-destructive" : complete && !pending ? "text-led" : "text-label-mid")}
                      data-testid="save-status"
                      aria-live="polite"
                    >
                      {sync[id] === "error"
                        ? "NOT SAVED YET · RETRYING"
                        : pending
                          ? "SAVING…"
                          : complete
                            ? `SAVED${saved?.session ? ` · ${saved.session.toUpperCase()}` : ""}`
                            : started
                              ? "IN PROGRESS · SAVED"
                              : "UNSCORED"}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateDraft(s.id, track, { ...d, revisit: !d.revisit })}
                      aria-pressed={!!d.revisit}
                      data-testid="revisit-toggle"
                      title="Unsure? Mark it and come back to it later. Doesn't change the score."
                      className={cn(
                        "font-mono text-[10px] tracking-[0.12em] border rounded-sm px-2.5 py-1",
                        d.revisit ? "bg-warn border-warn text-shell font-bold" : "border-hairline text-display hover:bg-panel-deep",
                      )}
                    >
                      ⚑ {d.revisit ? "TO REVISIT" : "MARK TO REVISIT"}
                    </button>
                    <span className="font-mono text-[12px] text-display">
                      {fmt(total)}/{maxScore(rubric)}
                    </span>
                  </header>
                  <div className="p-3 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px] text-body">
                      <div className="space-y-1">
                        <p>{s.details.pitch}</p>
                        <p className="text-label-mid">{s.projectBrief}</p>
                        <p className="label-hw-dim">
                          {trackLabel(profile, s.details.track)} · {s.details.appType} · POINT PERSON{" "}
                          {s.details.anonymous ? "ANONYMOUS" : s.submitterName.toUpperCase()}
                        </p>
                      </div>
                      <div className="space-y-1 break-all">
                        {s.details.publicUrl && <a className="block underline" href={s.details.publicUrl} target="_blank" rel="noopener noreferrer">{s.details.publicUrl}</a>}
                        <a className="block underline" href={s.videoUrl} target="_blank" rel="noopener noreferrer">{s.videoUrl}</a>
                        <a className="block underline" href={s.githubUrl} target="_blank" rel="noopener noreferrer">{s.githubUrl}</a>
                        {s.details.testnetTxid && (
                          <div className="flex flex-wrap items-center gap-2">
                            <TxidLink txid={s.details.testnetTxid} explorerUrl={profile.txExplorerUrl} />
                            <button type="button" onClick={() => recheck(s.id)} disabled={busy === `tx:${s.id}`} className={`${btnGhost} inline-flex items-center gap-1`}>
                              <RotateCw className="h-3 w-3" aria-hidden="true" /> RE-CHECK
                            </button>
                          </div>
                        )}
                        <p className="normal-case text-label-mid">Next milestone: {s.details.nextStep}</p>
                      </div>
                    </div>
                    {s.details.frictionNotes && (
                      <div className="text-[12px]">
                        <span className="label-hw-dim">BUILDER FEEDBACK (NOT SCORED): </span>
                        <span className="text-body">{s.details.frictionNotes}</span>
                      </div>
                    )}

                    <CriteriaCarousel
                      key={id}
                      rubric={rubric}
                      criteria={d.criteria}
                      notes={d.notes}
                      checkSteps={checkStepsFor(s, track, () => {
                        if (!d.checks?.video) updateDraft(s.id, track, { ...d, checks: { ...d.checks, video: true } });
                      })}
                      checks={d.checks ?? {}}
                      onPick={(cid, v) => updateDraft(s.id, track, { ...d, criteria: { ...d.criteria, [cid]: v } })}
                      onNotes={(notes) => updateDraft(s.id, track, { ...d, notes }, NOTE_DEBOUNCE_MS)}
                      onCheck={(cid, v) => updateDraft(s.id, track, { ...d, checks: { ...d.checks, [cid]: v } })}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => goTo(draftId(prev.s.id, prev.track))} className={btnGhost} disabled={queue.length < 2}>
                        ◂ PREV
                      </button>
                      <button type="button" onClick={() => nextToDo(id)} className={btnSolid}>
                        NEXT TO DO ▸
                      </button>
                      <div className="flex-1" />
                      <button type="button" onClick={() => goTo(draftId(next.s.id, next.track))} className={btnGhost} disabled={queue.length < 2}>
                        NEXT ▸
                      </button>
                    </div>
                  </div>
                </article>
              );
            })()}
        </>
      )}
      {(tab === "leaderboard" || !isJudge) && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {profile.tracks.map((t) => (
                <button key={t.id} type="button" onClick={() => setBoardTrack(t.id)} aria-pressed={boardTrack === t.id} className={boardTrack === t.id ? btnSolid : btnGhost}>
                  {t.shortLabel}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
            {!isJudge && board && (
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `${programSlug}-${boardTrack}-ranked.csv`,
                    buildRankedCsv(profile, boardTrack, board, submissions, judges),
                  )
                }
                className={btnGhost}
                data-testid="export-ranked-csv"
              >
                EXPORT RANKED CSV
              </button>
            )}
            {canSelectWinners && (
              <button type="button" onClick={togglePublished} disabled={busy === "publish"} className={publishedAt ? btnGhost : btnSolid}>
                {publishedAt ? "UNPUBLISH RESULTS" : "PUBLISH RESULTS ▸"}
              </button>
            )}
            </div>
          </div>
          {board && (
            <>
              <p className="label-hw-dim normal-case">
                Ranked by average total across the judges who scored each project ({board.submissionsFullyScored}/{board.submissionsTotal} scored
                by all {board.judges.length} judges). Ties: {trackById(profile, boardTrack).rubric.tieBreaks.map((t) => t.label).join(", then ")}.
                {boardTrack === profile.milestone.track &&
                  ` Award the podium, then flag ${profile.milestone.maxFlags} podium projects (any prize level) for the ${profile.milestone.flagLabel} (${ecosystemCount}/${profile.milestone.maxFlags} flagged).`}
                {publishedAt ? " Results are published." : " Results are not published yet."}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-[12px] text-body border-collapse" data-testid="leaderboard">
                  <thead>
                    <tr className="label-hw-dim text-left">
                      <th className="py-1.5 pr-2">#</th>
                      <th className="py-1.5 pr-2">PROJECT</th>
                      <th className="py-1.5 pr-2">AVG / {maxScore(trackById(profile, boardTrack).rubric)}</th>
                      {trackById(profile, boardTrack).rubric.criteria.map((c) => (
                        <th key={c.id} className="py-1.5 pr-2">{c.isBonus ? "BONUS ×" : c.label.split(/[:\s]/)[0].toUpperCase()}</th>
                      ))}
                      <th className="py-1.5 pr-2">JUDGES</th>
                      <th className="py-1.5 pr-2">PRIZE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.rows.map((r) => (
                      <Fragment key={r.submissionId}>
                        <tr className="border-t border-hairline-subtle align-top" data-testid="leaderboard-row">
                          <td className="py-2 pr-2 font-mono">{r.rank}</td>
                          <td className="py-2 pr-2">
                            <button
                              type="button"
                              onClick={() => setDetailsId(r.submissionId)}
                              className="text-left text-display underline decoration-dotted underline-offset-2 hover:decoration-solid"
                              title="Show project details"
                              data-testid="leaderboard-project"
                            >
                              {r.projectTitle}
                            </button>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <button
                                type="button"
                                onClick={() => setOpenRow(openRow === r.submissionId ? null : r.submissionId)}
                                aria-expanded={openRow === r.submissionId}
                                className="label-hw-dim hover:text-display"
                              >
                                {openRow === r.submissionId ? "HIDE SCORES ▴" : "JUDGES' SCORES ▾"}
                              </button>
                              {r.track === "both" && <span className="label-hw-dim">BOTH TRACKS</span>}
                              {boardTrack === "privacy" && <TxCheckBadge check={r.txCheck} />}
                              {r.tieBrokenBy && <span className="label-hw text-display">TIE · BROKEN BY {r.tieBrokenBy.toUpperCase()}</span>}
                              {r.ecosystemPrize && (
                                <span className="label-hw text-display">★ {profile.milestone.flagLabel.toUpperCase()}</span>
                              )}
                            </div>
                            {r.winnerBlocked && (
                              <p className="label-hw text-destructive normal-case mt-1" data-testid="winner-blocked">
                                ⚠ {r.winnerBlocked}
                              </p>
                            )}
                          </td>
                          <td className="py-2 pr-2 font-mono text-display">{fmt(r.avgTotal)}</td>
                          {trackById(profile, boardTrack).rubric.criteria.map((c) => (
                            <td key={c.id} className="py-2 pr-2 font-mono">{c.isBonus ? r.bonusCount : fmt(r.avgByCriterion[c.id] ?? 0)}</td>
                          ))}
                          <td className="py-2 pr-2 font-mono">{r.judgeCount}/{board.judges.length}</td>
                          <td className="py-2 pr-2">
                            {canSelectWinners ? (
                              <select
                                aria-label={`Prize for ${r.projectTitle}`}
                                value={r.prize ? String(r.prize.amount) : ""}
                                onChange={(e) => award(r.submissionId, e.target.value)}
                                disabled={busy === `prize:${r.submissionId}` || (!!r.winnerBlocked && !r.prize)}
                                className="bg-panel-deep border border-hairline text-display font-mono text-[11px] px-1 py-1 max-w-[220px]"
                              >
                                <option value="">No prize</option>
                                {tiersForTrack(prizeTiers, trackById(profile, boardTrack)).map((t) => (
                                  <option key={t.amount} value={String(t.amount)}>
                                    {t.label} (${t.amount})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              r.prize?.label ?? "—"
                            )}
                            {boardTrack === profile.milestone.track && canSelectWinners && (
                              <label className="mt-1.5 flex items-center gap-1.5 label-hw-dim cursor-pointer">
                                <input
                                  type="checkbox"
                                  aria-label={`${profile.milestone.flagLabel} for ${r.projectTitle}`}
                                  checked={r.ecosystemPrize}
                                  disabled={
                                    busy === `eco:${r.submissionId}` ||
                                    (!r.ecosystemPrize && (!r.prize || ecosystemCount >= profile.milestone.maxFlags))
                                  }
                                  onChange={(e) => toggleEcosystem(r.submissionId, e.target.checked)}
                                />
                                {profile.milestone.flagLabel.toUpperCase()}
                              </label>
                            )}
                          </td>
                        </tr>
                        {openRow === r.submissionId && (
                          <tr>
                            <td />
                            <td colSpan={99} className="pb-3">
                              <ul className="space-y-1">
                                {r.judgeScores.map((js) => (
                                  <li key={js.judgeEmail} className="text-[12px]">
                                    <span className="font-mono text-display">{js.judgeEmail}</span>
                                    <span className="text-label-mid"> · {js.session} · </span>
                                    <span className="font-mono">
                                      {Object.entries(js.criteria).map(([k, v]) => `${k} ${v}`).join(" · ")} = {js.total}
                                    </span>
                                    {js.notes && <span className="text-body"> · “{js.notes}”</span>}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
      <SubmissionDetailModal
        profile={profile}
        programSlug={programSlug}
        submission={detailsSubmission}
        onOpenChange={(open) => !open && setDetailsId(null)}
        showPageLink={!!publishedAt}
      />
    </section>
  );
}
