import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type AdminAuthArg } from "@/lib/api";
import type { ProgramStats, ProgramStatsChecks } from "@/lib/programStats";
import { ProgramStatsView } from "@/components/stats/ProgramStatsView";
import { formatIst } from "@/lib/statsDisplay";
import { useToast } from "@/hooks/use-toast";

type Preview = { stats: ProgramStats; checks: ProgramStatsChecks; publishedAt: string | null; changedSincePublish: boolean };

const btn = "font-mono text-[10px] tracking-[0.14em] border px-3 py-1.5 disabled:opacity-50";
const btnSolid = `${btn} border-display bg-display text-shell hover:bg-display-dim`;
const btnGhost = `${btn} border-hairline text-display hover:bg-panel-deep`;

/** The admin-only data checks shown above the preview (never published). */
function ChecksPanel({ checks }: { checks: ProgramStatsChecks }) {
  const list = (title: string, items: string[], testId: string) =>
    items.length > 0 && (
      <div data-testid={testId}>
        <div className="label-hw-dim mb-1">{title}</div>
        <ul className="list-disc pl-5 text-[12px] text-body space-y-0.5">
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    );
  const ok = !checks.mismatches.length && !checks.duplicates.length && !checks.uncategorized.length;
  return (
    <section className="lcd p-3 space-y-3 mb-4" data-testid="stats-checks" aria-label="Data checks">
      <div className="label-hw text-display">·CHECKS AGAINST THE FINAL SUBMISSIONS CSV (ADMIN ONLY)</div>
      {ok && <p className="text-[12px] text-led" data-testid="stats-checks-ok">Counts, duplicates and categories match.</p>}
      {list("MISMATCHES", checks.mismatches, "checks-mismatches")}
      {list("POSSIBLE DUPLICATES", checks.duplicates, "checks-duplicates")}
      {list(
        "UNCATEGORIZED (NOT IN THE CATEGORY MAP)",
        checks.uncategorized.map((u) => `${u.title}${u.suggested ? ` (suggested: ${u.suggested})` : ""}`),
        "checks-uncategorized",
      )}
      {list("EXCLUDED TEST ENTRIES", checks.testEntries, "checks-test-entries")}
      <div className="text-[12px] text-body space-y-0.5" data-testid="checks-gaps">
        <div className="label-hw-dim">DATA GAPS (SHOWN GRACEFULLY; THEY ONLY LOWER SHIPPED EVIDENCE)</div>
        <div>No description: {checks.gaps.noDescription.join(", ") || "none"}</div>
        <div>No repo: {checks.gaps.noRepo.join(", ") || "none"}</div>
        <div>No demo video: {checks.gaps.noDemoVideo.join(", ") || "none"}</div>
      </div>
    </section>
  );
}

/**
 * Platform admin: the prize winners and submission stats page. Shows whether
 * it's published, flags "Stats changed since publish" with Republish, and
 * opens the preview (also opened automatically when the program is saved as
 * completed). Cancel leaves the program completed with nothing published.
 */
export function StatsPublishPanel({
  slug,
  getAuth,
  previewOpen,
  onPreviewOpenChange,
}: {
  slug: string;
  getAuth: () => Promise<AdminAuthArg>;
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPreview(await api.previewProgramStats(slug, await getAuth()));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [slug, getAuth]);

  useEffect(() => {
    load();
  }, [load]);
  // Fresh numbers every time the preview opens.
  useEffect(() => {
    if (previewOpen) load();
  }, [previewOpen, load]);

  const publish = async () => {
    setBusy(true);
    try {
      const r = await api.publishProgramStats(slug, await getAuth());
      toast({ title: preview?.publishedAt ? "Stats republished" : "Stats published", description: `Updated ${formatIst(r.publishedAt)}` });
      onPreviewOpenChange(false);
      await load();
    } catch (e) {
      toast({ title: "Couldn't publish the stats", description: (e as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel p-3 mb-3 flex flex-wrap items-center gap-2" data-testid="stats-publish-panel">
      <span className="label-hw text-display">·STATS PAGE</span>
      <span className="label-hw-dim normal-case" data-testid="stats-publish-state">
        {preview?.publishedAt ? `Published · Updated ${formatIst(preview.publishedAt)}` : "Not published"}
      </span>
      {preview?.changedSincePublish && (
        <span className="label-hw border border-warn text-warn rounded-sm px-1.5 py-0.5" data-testid="stats-changed">
          STATS CHANGED SINCE PUBLISH
        </span>
      )}
      {error && <span className="label-hw text-destructive normal-case">{error}</span>}
      <div className="flex-1" />
      {preview?.changedSincePublish && (
        <button type="button" className={btnSolid} onClick={publish} disabled={busy} data-testid="stats-republish">
          REPUBLISH
        </button>
      )}
      <button type="button" className={btnGhost} onClick={() => onPreviewOpenChange(true)} data-testid="stats-preview-open">
        PREVIEW STATS
      </button>
      {preview?.publishedAt && (
        <a href={`/programs/${slug}/stats`} target="_blank" rel="noreferrer" className={btnGhost}>
          OPEN PUBLIC PAGE ↗
        </a>
      )}

      <Dialog open={previewOpen} onOpenChange={onPreviewOpenChange}>
        <DialogContent
          className="w-[calc(100%-2rem)] sm:max-w-6xl max-h-[90vh] flex flex-col p-0 overflow-hidden border border-hairline rounded-sm [&>button]:z-30"
          data-testid="stats-preview-dialog"
        >
          <DialogHeader className="px-6 pt-5">
            <DialogTitle className="label-hw text-display">·PREVIEW: PRIZE WINNERS AND SUBMISSION STATS</DialogTitle>
            <DialogDescription className="label-hw-dim normal-case">
              This is the page as it will publish. Publishing takes a snapshot: later changes to scores, prizes or feedback
              show here as "Stats changed since publish" until you republish.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto px-6 pb-4">
            {preview ? (
              <>
                <ChecksPanel checks={preview.checks} />
                <ProgramStatsView stats={preview.stats} slug={slug} sticky={false} />
              </>
            ) : (
              <p className="label-hw-dim">{error ?? "LOADING…"}</p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2 px-6 py-3 border-t border-hairline">
            <button type="button" className={btnGhost} onClick={() => onPreviewOpenChange(false)} data-testid="stats-cancel">
              CANCEL
            </button>
            <button type="button" className={btnSolid} onClick={publish} disabled={busy || !preview} data-testid="stats-publish">
              {preview?.publishedAt ? "REPUBLISH STATS ▸" : "PUBLISH STATS ▸"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
