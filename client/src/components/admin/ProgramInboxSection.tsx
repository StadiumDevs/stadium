import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { api, type ApiInboxEntry, type AdminAuthArg, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Filter = "all" | "signup" | "application";

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const truncate = (s?: string | null, n = 22) => {
  if (!s) return "—";
  if (s.length <= n) return s;
  return `${s.slice(0, Math.max(2, n - 4))}…${s.slice(-4)}`;
};

/**
 * Unified per-program inbox — merges signups (Luma CSV imports) and
 * applications (project teams that applied in-app) into one table. Lets
 * admins triage both streams in one place and export to CSV for sharing
 * with sponsors.
 */
export function ProgramInboxSection({
  programSlug,
  signAuthHeader,
}: {
  programSlug: string;
  signAuthHeader: () => Promise<AdminAuthArg>;
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ApiInboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [meta, setMeta] = useState({ total: 0, signups: 0, applications: 0 });

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const auth = await signAuthHeader();
        const r = await api.listProgramInbox(programSlug, auth);
        if (!active) return;
        setEntries(r.data);
        setMeta(r.meta);
      } catch (e) {
        if (!active) return;
        toast({
          title: "Couldn't load inbox",
          description: e instanceof ApiError ? e.message : (e as Error)?.message,
          variant: "destructive",
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [programSlug, signAuthHeader, toast]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  const filtered = useMemo(
    () => (filter === "all" ? entries : entries.filter((e) => e.source === filter)),
    [entries, filter],
  );

  const handleExport = async () => {
    setExporting(true);
    try {
      const auth = await signAuthHeader();
      const blob = await api.exportProgramInboxCsv(programSlug, auth);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${programSlug}-inbox-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Inbox CSV downloaded" });
    } catch (e) {
      toast({
        title: "Couldn't export inbox",
        description: e instanceof ApiError ? e.message : (e as Error)?.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="panel p-4 mb-3">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline-subtle flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="label-hw text-display">·INBOX</span>
          <span className="lcd px-2 py-[1px] font-mono text-[10px] text-display tabular-nums">
            {meta.total}
          </span>
          <span className="label-hw-dim">
            ·{meta.signups} SIGNUP{meta.signups === 1 ? "" : "S"} · {meta.applications} APPLICATION
            {meta.applications === 1 ? "" : "S"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex border border-hairline divide-x divide-hairline">
            {(["all", "signup", "application"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={
                  filter === f
                    ? "font-mono text-[10px] tracking-[0.14em] bg-display text-shell px-2 py-1"
                    : "font-mono text-[10px] tracking-[0.14em] text-display hover:bg-panel-deep px-2 py-1"
                }
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || meta.total === 0}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-3 py-1"
          >
            {exporting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Download className="h-3 w-3" />
            )}
            EXPORT CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 label-hw-dim py-4">
          <Loader2 className="h-3 w-3 animate-spin" /> LOADING INBOX…
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-body text-sm py-2">
          {meta.total === 0
            ? "Empty inbox. Import a Luma CSV or wait for project applications."
            : `No ${filter} entries match.`}
        </p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between label-hw-dim px-1">
            <span>·SOURCE · NAME · IDENTIFIER</span>
            <span>STATUS · WHEN</span>
          </div>
          {filtered.map((e) => (
            <div
              key={`${e.source}-${e.id}`}
              className="lcd px-3 py-2 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span
                  className={
                    e.source === "signup"
                      ? "border border-hairline text-label-mid px-1.5 py-[1px] font-mono text-[9px] tracking-[0.12em] uppercase"
                      : "border border-display text-display bg-panel-deep px-1.5 py-[1px] font-mono text-[9px] tracking-[0.12em] uppercase"
                  }
                >
                  {e.source}
                </span>
                <div className="min-w-0">
                  <div className="font-mono text-[12px] text-display truncate">
                    {e.name || "—"}
                  </div>
                  <div className="label-hw-dim truncate">
                    {e.identifier}
                    {e.wallet ? ` · ${truncate(e.wallet)}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 text-right">
                {e.status && (
                  <span className="label-hw text-display">{e.status.toUpperCase()}</span>
                )}
                <span className="font-mono text-[10px] text-label-mid tabular-nums">
                  {formatDate(e.when).toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
