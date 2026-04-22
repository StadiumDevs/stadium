import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Loader2, Wallet } from "lucide-react";
import { api, type ApiProgram, ApiError } from "@/lib/api";

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

const programTypeLabel = (t?: ApiProgram["programType"]) => {
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

const ProgramDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);
    setError(null);
    api
      .getProgramBySlug(slug)
      .then((r) => {
        if (active) setProgram(r.data);
      })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) {
          setNotFound(true);
        } else {
          setError(e instanceof Error ? e.message : "Failed to load program");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const applicationsRange = formatDateRange(
    program?.applicationsOpenAt,
    program?.applicationsCloseAt,
  );
  const eventRange = formatDateRange(program?.eventStartsAt, program?.eventEndsAt);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-16">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading program…
          </div>
        ) : notFound ? (
          <div className="mx-auto max-w-lg rounded-lg border bg-card p-8 text-center">
            <h1 className="font-heading text-2xl font-bold">Program not found</h1>
            <p className="mt-2 text-muted-foreground">
              We couldn&apos;t find a program with that URL. It may have been removed or
              renamed.
            </p>
            <Button asChild className="mt-4">
              <Link to="/programs">Back to programs</Link>
            </Button>
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-16">{error}</p>
        ) : program ? (
          <article className="mx-auto max-w-3xl">
            <header className="mb-6">
              <p className="text-sm text-muted-foreground">
                {programTypeLabel(program.programType)}
              </p>
              <h1 className="mt-1 font-heading text-3xl font-bold md:text-4xl">
                {program.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant={program.status === "open" ? "default" : "secondary"}>
                  {program.status}
                </Badge>
                {program.location && (
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {program.location}
                  </span>
                )}
              </div>
            </header>

            {program.description && (
              <p className="mb-6 text-base text-muted-foreground whitespace-pre-line">
                {program.description}
              </p>
            )}

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Key dates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {applicationsRange && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Applications:</span>
                    <span>{applicationsRange}</span>
                  </div>
                )}
                {eventRange && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <span className="text-muted-foreground">Event:</span>
                    <span>{eventRange}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {/*
                Apply CTA is disabled for unauthenticated visitors. The wallet-
                connected / team-member flow lands in #44 (Issue 9). Until then
                it's a read-only signal that an apply path exists.
              */}
              <Button disabled className="gap-2">
                <Wallet className="h-4 w-4" aria-hidden="true" />
                Sign in with wallet to apply
              </Button>
              <p className="text-xs text-muted-foreground sm:ml-2">
                Applications open to past WebZero winners who are on a Stadium project team.
              </p>
            </div>
          </article>
        ) : null}
      </main>
    </div>
  );
};

export default ProgramDetailPage;
