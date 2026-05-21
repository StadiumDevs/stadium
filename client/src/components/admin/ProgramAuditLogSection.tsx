import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCw } from "lucide-react";
import { api, type ApiAuditLogEntry, type AdminAuthArg, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const truncate = (s?: string | null, n = 18) => {
  if (!s) return "—";
  if (s.length <= n) return s;
  return `${s.slice(0, Math.max(2, n - 4))}…${s.slice(-4)}`;
};

const relativeTime = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const actionTone = (action: string): string => {
  if (action.startsWith("admin.")) return "border-display text-display bg-panel-deep";
  if (action.startsWith("sponsor.")) return "border-hairline text-display bg-panel-deep";
  if (action.startsWith("signups.") || action.startsWith("signup.")) return "border-hairline text-label-mid";
  if (action === "application.accepted") return "border-led text-led";
  if (action === "application.rejected" || action === "application.withdrawn") return "border-hairline text-label-mid";
  return "border-hairline text-display";
};

/**
 * Per-program admin activity log. Surfaces who did what — sponsor edits,
 * CSV imports, application status changes, admin add/remove — for
 * handoff and forensics. Read-only on the client; writes happen as a
 * side-effect of the underlying actions via `auditLog.logSafe` on the
 * server.
 */
export function ProgramAuditLogSection({
  programSlug,
  signAuthHeader,
}: {
  programSlug: string;
  signAuthHeader: () => Promise<AdminAuthArg>;
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ApiAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const auth = await signAuthHeader();
        const r = await api.listProgramAuditLog(programSlug, auth, { limit: 50 });
        if (active) setEntries(r.data);
      } catch (e) {
        if (active) {
          toast({
            title: "Couldn't load audit log",
            description: e instanceof ApiError ? e.message : (e as Error)?.message,
            variant: "destructive",
          });
        }
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

  return (
    <div className="panel p-4 mb-3">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline-subtle">
        <div className="flex items-center gap-3">
          <span className="label-hw text-display">·AUDIT LOG</span>
          <span className="label-hw-dim">LAST 50 ADMIN ACTIONS ON THIS PROGRAM</span>
        </div>
        <button
          type="button"
          onClick={load}
          aria-label="Refresh audit log"
          className="inline-flex items-center justify-center border border-hairline text-label-mid hover:text-display hover:bg-panel-deep w-7 h-7"
        >
          <RotateCw className="h-3 w-3" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 label-hw-dim py-4">
          <Loader2 className="h-3 w-3 animate-spin" /> LOADING…
        </div>
      ) : entries.length === 0 ? (
        <p className="text-body text-sm">No admin actions recorded yet for this program.</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map((e) => (
            <li
              key={e.id}
              className="lcd px-3 py-2 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span
                  className={`border ${actionTone(e.action)} px-1.5 py-[1px] font-mono text-[9px] tracking-[0.12em] uppercase`}
                >
                  {e.action}
                </span>
                <div className="min-w-0">
                  <div className="font-mono text-[12px] text-display truncate">
                    {e.targetId || e.targetType || "—"}
                  </div>
                  <div className="label-hw-dim truncate">
                    BY {truncate(e.actorWallet)}
                    {e.actorChain ? ` · ${e.actorChain.toUpperCase()}` : ""}
                  </div>
                </div>
              </div>
              <span
                className="font-mono text-[10px] text-label-mid tabular-nums flex-shrink-0"
                title={new Date(e.createdAt).toLocaleString()}
              >
                {relativeTime(e.createdAt).toUpperCase()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
