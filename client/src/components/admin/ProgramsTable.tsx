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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Loader2, Plus } from "lucide-react";
import { api, type ApiProgram } from "@/lib/api";
import { ProgramFormModal } from "@/components/admin/ProgramFormModal";

const statusVariant = (status: ApiProgram["status"]) => {
  switch (status) {
    case "open":
      return "default" as const;
    case "draft":
      return "secondary" as const;
    case "closed":
    case "completed":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const formatDateRange = (from?: string | null, to?: string | null) => {
  if (!from && !to) return "—";
  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Programs</CardTitle>
        {connectedAddress && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create program
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading programs…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-6">{error}</p>
        ) : programs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">
            No programs yet — create one to open applications to past winners.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applications window</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[120px]" aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/programs/${p.slug}`)}
                >
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.programType}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateRange(p.applicationsOpenAt, p.applicationsCloseAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDateRange(p.eventStartsAt, p.eventEndsAt)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.location || "—"}</TableCell>
                  <TableCell>
                    {connectedAddress && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(p);
                          setFormOpen(true);
                        }}
                        className="gap-2"
                      >
                        <Edit className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {connectedAddress && (
        <ProgramFormModal
          open={formOpen}
          onOpenChange={setFormOpen}
          program={editing}
          connectedAddress={connectedAddress}
          onSaved={handleSaved}
        />
      )}
    </Card>
  );
}
