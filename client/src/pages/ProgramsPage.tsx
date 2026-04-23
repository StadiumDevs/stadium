import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { ProgramCard } from "@/components/ProgramCard";
import { api, type ApiProgram } from "@/lib/api";
import { Loader2 } from "lucide-react";

const ProgramsPage = () => {
  const [programs, setPrograms] = useState<ApiProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .listPrograms({ status: "open" })
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <header className="mb-8">
          <h1 className="font-heading text-3xl font-bold md:text-4xl">Programs</h1>
          <p className="mt-2 text-muted-foreground">
            Programs currently open for applications from past WebZero winners.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-10">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading programs…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive py-10">{error}</p>
        ) : programs.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Nothing open right now. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProgramsPage;
