import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ApiProgram } from "@/lib/api";

const formatDateRange = (from?: string | null, to?: string | null) => {
  if (!from && !to) return null;
  const fmt = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";
  return `${fmt(from)} – ${fmt(to)}`;
};

const programTypeLabel = (t: ApiProgram["programType"]) => {
  switch (t) {
    case "dogfooding":
      return "Dogfooding";
    case "pitch_off":
      return "Pitch Off";
    case "hackathon":
      return "Hackathon";
    case "m2_incubator":
      return "M2 Incubator";
    default:
      return t;
  }
};

export function ProgramCard({ program }: { program: ApiProgram }) {
  const eventRange = formatDateRange(program.eventStartsAt, program.eventEndsAt);

  return (
    <Link
      to={`/programs/${program.slug}`}
      className={cn(
        "group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg",
      )}
      aria-label={`${program.name} — open program details`}
    >
      <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{program.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {programTypeLabel(program.programType)}
            </p>
          </div>
          <Badge variant={program.status === "open" ? "default" : "secondary"}>
            {program.status}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {program.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{program.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {eventRange && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                {eventRange}
              </span>
            )}
            {program.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {program.location}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
