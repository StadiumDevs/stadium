import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, RotateCw, Sparkles, ExternalLink } from "lucide-react";
import { api, type ApiProgram, type ApiProgramApplication } from "@/lib/api";

type Row = ApiProgramApplication & { program?: ApiProgram };

const statusBadge = (status: ApiProgramApplication["status"]) => {
  const base =
    "inline-flex items-center px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase";
  switch (status) {
    case "accepted":
      return `${base} border border-display bg-display text-shell`;
    case "rejected":
    case "withdrawn":
      return `${base} border border-hairline text-label-mid`;
    default:
      return `${base} border border-hairline text-display bg-panel-deep`;
  }
};

/**
 * Phase 1 revamp (#45): shows which programs this project has applied to,
 * with status, on the project's Overview tab. Link is a real anchor so
 * right-click-open-in-new-tab works (spec §3.1).
 *
 * Implementation: fetches applications + all programs in parallel, joins
 * on programId. Small-scale data today; if the programs table grows, this
 * becomes a dedicated per-project-with-program-metadata endpoint.
 *
 * Phase 2 revamp (#71): adds focus-refetch and a manual refresh button.
 */
export function ProjectProgramsSection({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.getApplicationsForProject(projectId), api.listPrograms()])
      .then(([appsRes, progsRes]) => {
        if (!active) return;
        const byId = new Map<string, ApiProgram>();
        for (const p of progsRes.data) byId.set(p.id, p);
        const joined: Row[] = appsRes.data.map((a) => ({ ...a, program: byId.get(a.programId) }));
        setRows(joined);
      })
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    const cleanup = refetch();
    return cleanup;
  }, [refetch]);

  useEffect(() => {
    window.addEventListener("focus", refetch);
    return () => {
      window.removeEventListener("focus", refetch);
    };
  }, [refetch]);

  if (loading) {
    return (
      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-hairline-subtle">
          <Sparkles className="h-3.5 w-3.5 text-label-mid" aria-hidden="true" />
          <span className="label-hw text-display">·PROGRAMS</span>
        </div>
        <div className="flex items-center gap-2 label-hw-dim">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> LOADING…
        </div>
      </div>
    );
  }

  // Don't render the section at all for projects with no applications. This is
  // the minimal empty state per spec §5 Issue 10 — "section hidden OR a minimal
  // 'No program applications yet' line."
  if (!rows || rows.length === 0) return null;

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-hairline-subtle">
        <Sparkles className="h-3.5 w-3.5 text-label-mid" aria-hidden="true" />
        <span className="label-hw text-display">·PROGRAMS</span>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => {
          const slug = r.program?.slug;
          const name = r.program?.name || r.programId;
          return (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {slug ? (
                  <Link
                    to={`/programs/${slug}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-display hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-display focus-visible:ring-offset-2 focus-visible:ring-offset-shell rounded-sm"
                  >
                    {name}
                    <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                  </Link>
                ) : (
                  <span className="text-sm font-medium text-body">{name}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className={statusBadge(r.status)}>{r.status}</span>
                <button
                  type="button"
                  className="h-6 w-6 inline-flex items-center justify-center border border-hairline text-label-mid hover:text-display hover:bg-panel-deep"
                  onClick={refetch}
                  aria-label="Refresh application status"
                >
                  <RotateCw className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
