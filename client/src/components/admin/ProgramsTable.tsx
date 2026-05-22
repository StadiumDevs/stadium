import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Loader2, Plus } from "lucide-react";
import { api, type ApiProgram } from "@/lib/api";
import { ProgramFormModal } from "@/components/admin/ProgramFormModal";

const statusBadge = (status: ApiProgram["status"]) => {
  const base =
    "inline-flex items-center px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase";
  switch (status) {
    case "open":
      return `${base} border border-display bg-display text-shell`;
    case "draft":
      return `${base} border border-hairline text-display bg-panel-deep`;
    case "closed":
    case "completed":
      return `${base} border border-hairline text-label-mid`;
    default:
      return `${base} border border-hairline text-label-mid`;
  }
};

const formatDateRange = (from?: string | null, to?: string | null) => {
  if (!from && !to) return "—";
  const fmt = (iso?: string | null) =>
    iso
      ? new Date(iso)
          .toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
          .toUpperCase()
      : "—";
  return `${fmt(from)} → ${fmt(to)}`;
};

export function ProgramsTable({ connectedAddress }: { connectedAddress?: string } = {}) {
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<ApiProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApiProgram | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .listPrograms()
      .then((r) => {
        if (active) setPrograms(r.data);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Failed to load programs");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSaved = (p: ApiProgram) => {
    setPrograms((prev) => {
      const idx = prev.findIndex((x) => x.id === p.id);
      if (idx === -1) return [p, ...prev];
      const next = [...prev];
      next[idx] = p;
      return next;
    });
  };

  return (
    <div className="panel p-4">
      <div className="flex flex-row items-center justify-between mb-3 pb-3 border-b border-hairline-subtle">
        <span className="label-hw text-display">·PROGRAMS</span>
        {connectedAddress && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-3 py-1.5"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            CREATE PROGRAM
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 label-hw-dim py-6">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> LOADING PROGRAMS…
        </div>
      ) : error ? (
        <p className="label-hw text-destructive py-6">·{error.toUpperCase()}</p>
      ) : programs.length === 0 ? (
        <p className="text-body text-sm py-6">
          No programs yet. Create one to open applications to past winners.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="label-hw-dim">NAME</TableHead>
              <TableHead className="label-hw-dim">TYPE</TableHead>
              <TableHead className="label-hw-dim">STATUS</TableHead>
              <TableHead className="label-hw-dim">APPLICATIONS WINDOW</TableHead>
              <TableHead className="label-hw-dim">EVENT</TableHead>
              <TableHead className="label-hw-dim">LOCATION</TableHead>
              <TableHead className="w-[120px]" aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((p) => (
              <TableRow
                key={p.id}
                className="cursor-pointer hover:bg-panel-deep"
                onClick={() => navigate(`/admin/programs/${p.slug}`)}
              >
                <TableCell className="font-medium text-display">{p.name}</TableCell>
                <TableCell className="text-label-mid font-mono text-xs uppercase">{p.programType}</TableCell>
                <TableCell>
                  <span className={statusBadge(p.status)}>{p.status}</span>
                </TableCell>
                <TableCell className="text-label-mid whitespace-nowrap font-mono text-xs">
                  {formatDateRange(p.applicationsOpenAt, p.applicationsCloseAt)}
                </TableCell>
                <TableCell className="text-label-mid whitespace-nowrap font-mono text-xs">
                  {formatDateRange(p.eventStartsAt, p.eventEndsAt)}
                </TableCell>
                <TableCell className="text-label-mid font-mono text-xs">{p.location || "—"}</TableCell>
                <TableCell>
                  {connectedAddress && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-2.5 py-1"
                    >
                      <Edit className="h-3 w-3" aria-hidden="true" />
                      EDIT
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {connectedAddress && (
        <ProgramFormModal
          open={formOpen}
          onOpenChange={setFormOpen}
          program={editing}
          connectedAddress={connectedAddress}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
