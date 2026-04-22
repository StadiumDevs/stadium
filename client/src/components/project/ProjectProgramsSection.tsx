import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, ExternalLink } from "lucide-react";
import { api, type ApiProgram, type ApiProgramApplication } from "@/lib/api";

type Row = ApiProgramApplication & { program?: ApiProgram };

const statusVariant = (status: ApiProgramApplication["status"]) => {
  switch (status) {
    case "accepted":
      return "default" as const;
    case "rejected":
    case "withdrawn":
      return "outline" as const;
    default:
      return "secondary" as const;
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
 */
export function ProjectProgramsSection({ projectId }: { projectId: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
            Programs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading…
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render the section at all for projects with no applications. This is
  // the minimal empty state per spec §5 Issue 10 — "section hidden OR a minimal
  // 'No program applications yet' line."
  if (!rows || rows.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5" aria-hidden="true" />
          Programs
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                    >
                      {name}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{name}</span>
                  )}
                </div>
                <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
