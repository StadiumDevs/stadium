import { useCallback, useEffect, useState } from "react";
import { api, type AdminAuthArg, type ApiJudgingProgressRow } from "@/lib/api";
import { trackById, type ProgramProfile } from "@/lib/programProfiles";
import { cn } from "@/lib/utils";

const POLL_MS = 5000;

/**
 * Every judge's progress (scored / total in their tracks), visible to all
 * judges and admins. Refreshes on its own: polls while mounted, re-reads when
 * another tab saves (the playground's multi-judge setup), and whenever
 * `refreshToken` changes (this judge just saved). Names only, never emails.
 * Background refreshes use `getPollAuth`, which must never open the wallet:
 * if it has no session it throws and the last table stays.
 */
export function JudgingProgressTable({
  profile,
  programSlug,
  getAuth,
  getPollAuth = getAuth,
  youName,
  refreshToken,
}: {
  profile: ProgramProfile;
  programSlug: string;
  getAuth: () => Promise<AdminAuthArg>;
  getPollAuth?: () => Promise<AdminAuthArg>;
  youName?: string | null;
  refreshToken: number;
}) {
  const [rows, setRows] = useState<ApiJudgingProgressRow[] | null>(null);

  const load = useCallback(
    async (auth: () => Promise<AdminAuthArg>) => {
      try {
        const r = await api.getJudgingProgress(programSlug, await auth());
        setRows(r.data);
      } catch {
        // Keep the last good table; the next poll tries again.
      }
    },
    [programSlug],
  );

  useEffect(() => {
    load(getAuth);
  }, [load, getAuth, refreshToken]);

  useEffect(() => {
    const poll = () => load(getPollAuth);
    const id = window.setInterval(poll, POLL_MS);
    const onStorage = () => poll();
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", onStorage);
    };
  }, [load, getPollAuth]);

  if (!rows) return null;
  const done = rows.filter((r) => r.total > 0 && r.scored >= r.total).length;

  return (
    <div className="lcd p-3 space-y-2" data-testid="judging-progress">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-hw text-display">·JUDGES' PROGRESS</span>
        <span className="label-hw-dim">
          {done}/{rows.length} JUDGES DONE · LIVE
        </span>
      </div>
      <table className="w-full text-[12px] text-body border-collapse">
        <thead>
          <tr className="label-hw-dim text-left">
            <th className="py-1 pr-2 font-normal">JUDGE</th>
            <th className="py-1 pr-2 font-normal hidden sm:table-cell">TRACK</th>
            <th className="py-1 pr-2 font-normal">SCORED</th>
            <th className="py-1 font-normal w-[35%]" aria-label="Progress" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pct = r.total ? Math.round((r.scored / r.total) * 100) : 0;
            const you = !!youName && r.name === youName;
            return (
              <tr key={r.name} data-testid="judging-progress-row" className={cn("border-t border-hairline-subtle", you && "text-display")}>
                <td className="py-1.5 pr-2">
                  {r.name}
                  {you && <span className="label-hw text-display"> · YOU</span>}
                </td>
                <td className="py-1.5 pr-2 label-hw-dim hidden sm:table-cell">
                  {r.tracks.map((t) => trackById(profile, t).shortLabel).join(" + ")}
                </td>
                <td className="py-1.5 pr-2 font-mono" data-testid="judging-progress-count">
                  {r.scored}/{r.total}
                </td>
                <td className="py-1.5">
                  <div className="h-1.5 bg-panel-deep border border-hairline-subtle" aria-hidden="true">
                    <div className={cn("h-full", pct === 100 ? "bg-led" : "bg-display")} style={{ width: `${pct}%` }} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
