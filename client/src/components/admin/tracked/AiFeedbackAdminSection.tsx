import { useCallback, useEffect, useState } from "react";
import { api, type AdminAuthArg, type ApiAiFeedback, type ApiAiFeedbackRow } from "@/lib/api";
import { formatIst } from "@/lib/statsDisplay";
import { useToast } from "@/hooks/use-toast";

const btn = "font-mono text-[10px] tracking-[0.14em] border px-3 py-1.5 disabled:opacity-50";
const btnSolid = `${btn} border-display bg-display text-shell hover:bg-display-dim`;
const btnGhost = `${btn} border-hairline text-display hover:bg-panel-deep`;
const field = "w-full bg-panel-deep border border-hairline text-display font-mono text-[12px] px-2 py-1.5 focus:outline-none focus:border-display";

const toLines = (xs: string[]) => xs.join("\n");
const fromLines = (t: string) => t.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 3);

/** One project's draft, editable. */
function DraftEditor({ row, onSave, onRegenerate, busy }: { row: ApiAiFeedbackRow; onSave: (d: ApiAiFeedback) => void; onRegenerate: () => void; busy: boolean }) {
  const d = row.aiFeedback?.draft;
  const [summary, setSummary] = useState(d?.summary ?? "");
  const [strengths, setStrengths] = useState(toLines(d?.strengths ?? []));
  const [improvements, setImprovements] = useState(toLines(d?.improvements ?? []));
  useEffect(() => {
    setSummary(d?.summary ?? "");
    setStrengths(toLines(d?.strengths ?? []));
    setImprovements(toLines(d?.improvements ?? []));
  }, [d]);
  const published = row.aiFeedback?.published;
  const changed = !!published && JSON.stringify(published) !== JSON.stringify(d);
  return (
    <li className="border border-hairline p-3 space-y-2" data-testid="ai-feedback-row">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-display text-[13px]">{row.title}</span>
        <span className="label-hw-dim">{published ? (changed ? "PUBLISHED · DRAFT CHANGED" : "PUBLISHED") : "DRAFT"}</span>
        <div className="flex-1" />
        <button type="button" className={btnGhost} onClick={onRegenerate} disabled={busy}>
          REGENERATE
        </button>
      </div>
      <label className="block space-y-1">
        <span className="label-hw-dim">SUMMARY</span>
        <textarea className={field} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} data-testid="ai-draft-summary" />
      </label>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="label-hw-dim">STRENGTHS (ONE PER LINE, MAX 3)</span>
          <textarea className={field} rows={3} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="label-hw-dim">POSSIBLE IMPROVEMENTS (ONE PER LINE, MAX 3)</span>
          <textarea className={field} rows={3} value={improvements} onChange={(e) => setImprovements(e.target.value)} />
        </label>
      </div>
      <button
        type="button"
        className={btnGhost}
        disabled={busy || !summary.trim()}
        onClick={() => onSave({ summary: summary.trim(), strengths: fromLines(strengths), improvements: fromLines(improvements) })}
        data-testid="ai-draft-save"
      >
        SAVE DRAFT
      </button>
    </li>
  );
}

/**
 * Platform admin: AI feedback for the project pages. Generate a draft per
 * project from its normalized scores and the judges' notes, review and edit
 * the drafts, then publish them all. Nothing is public until published.
 */
export function AiFeedbackAdminSection({ programSlug, getAuth }: { programSlug: string; getAuth: () => Promise<AdminAuthArg> }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ApiAiFeedbackRow[] | null>(null);
  const [meta, setMeta] = useState<{ configured: boolean; model: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; failed: string[] } | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const r = await api.listAiFeedback(programSlug, await getAuth());
      setRows(r.data.projects);
      setMeta({ configured: r.data.configured, model: r.data.model });
    } catch (e) {
      setError((e as Error).message);
    }
  }, [programSlug, getAuth]);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (row: ApiAiFeedbackRow) => setRows((prev) => (prev ?? []).map((r) => (r.id === row.id ? row : r)));

  const generateOne = async (id: string, auth: AdminAuthArg) => replace((await api.generateAiFeedback(programSlug, id, auth)).data);

  const generateAll = async () => {
    const todo = (rows ?? []).filter((r) => r.scored);
    setBusy("all");
    setProgress({ done: 0, total: todo.length, failed: [] });
    const auth = await getAuth();
    const failed: string[] = [];
    // A few at a time: quick, without tripping rate limits.
    for (let i = 0; i < todo.length; i += 3) {
      await Promise.all(
        todo.slice(i, i + 3).map(async (r) => {
          try {
            await generateOne(r.id, auth);
          } catch (e) {
            failed.push(`${r.title}: ${(e as Error).message}`);
          }
          setProgress((p) => (p ? { ...p, done: p.done + 1, failed: [...failed] } : p));
        }),
      );
    }
    setBusy(null);
    toast({ title: "AI feedback drafts generated", description: `${todo.length - failed.length} of ${todo.length}${failed.length ? `, ${failed.length} failed` : ""}. Review, then publish.` });
  };

  const run = async (key: string, fn: () => Promise<void>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) toast({ title: ok });
    } catch (e) {
      toast({ title: "AI feedback", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const drafts = (rows ?? []).filter((r) => r.aiFeedback?.draft);
  const publishedAt = (rows ?? []).map((r) => r.aiFeedback?.publishedAt).find(Boolean) ?? null;
  const scored = (rows ?? []).filter((r) => r.scored).length;

  return (
    <section className="panel p-4 mb-4 space-y-3" data-testid="ai-feedback-admin">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label-hw text-display">·AI FEEDBACK ON PROJECT PAGES</span>
        <span className="label-hw-dim normal-case" data-testid="ai-feedback-status">
          {publishedAt ? `Published ${formatIst(publishedAt)}` : drafts.length ? `${drafts.length} drafts · not published` : "No drafts yet"}
        </span>
        <div className="flex-1" />
        <button type="button" className={btnGhost} onClick={() => setOpen((v) => !v)}>
          {open ? "HIDE ▴" : "REVIEW ▾"}
        </button>
      </div>
      <p className="text-[12px] text-body">
        Claude ({meta?.model ?? "…"}) writes a short summary, strengths and possible improvements for each scored project from its
        normalized judge scores and the judges' notes (anonymized; judges are never named or quoted). Drafts stay private until you
        publish them; the project page labels them as AI-generated.
      </p>
      {error && <p className="label-hw text-destructive normal-case">{error}</p>}
      {meta && !meta.configured && (
        <p className="label-hw text-warn normal-case">AI feedback isn't configured: set ANTHROPIC_API_KEY on the server.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={btnSolid}
          onClick={generateAll}
          disabled={!!busy || !rows || !scored || meta?.configured === false}
          data-testid="ai-generate-all"
        >
          {drafts.length ? "REGENERATE ALL" : "GENERATE ALL"} ({scored})
        </button>
        <button
          type="button"
          className={btnSolid}
          disabled={!!busy || !drafts.length}
          onClick={() => run("publish", async () => {
            await api.setAiFeedbackPublished(programSlug, true, await getAuth());
            await load();
          }, "AI feedback published")}
          data-testid="ai-publish"
        >
          PUBLISH AI FEEDBACK
        </button>
        {publishedAt && (
          <button
            type="button"
            className={btnGhost}
            disabled={!!busy}
            onClick={() => run("unpublish", async () => {
              await api.setAiFeedbackPublished(programSlug, false, await getAuth());
              await load();
            }, "AI feedback unpublished")}
          >
            UNPUBLISH
          </button>
        )}
        {progress && (
          <span className="label-hw-dim" data-testid="ai-progress">
            {progress.done} / {progress.total}
            {progress.failed.length ? ` · ${progress.failed.length} failed` : ""}
          </span>
        )}
      </div>
      {progress?.failed.length ? (
        <ul className="list-disc pl-5 text-[12px] text-destructive">
          {progress.failed.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ) : null}
      {open && (
        <ul className="space-y-3" data-testid="ai-feedback-drafts">
          {drafts.length === 0 && <li className="label-hw-dim">No drafts yet. Generate them first.</li>}
          {drafts.map((r) => (
            <DraftEditor
              key={r.id}
              row={r}
              busy={!!busy}
              onRegenerate={() => run(`gen:${r.id}`, async () => generateOne(r.id, await getAuth()), "Draft regenerated")}
              onSave={(d) => run(`save:${r.id}`, async () => replace((await api.updateAiFeedback(programSlug, r.id, d, await getAuth())).data), "Draft saved")}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
