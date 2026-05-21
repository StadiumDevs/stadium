import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { UnitCard } from "@/components/unit-card";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const UnitDetailModal = lazy(() =>
  import("@/components/unit-detail-modal").then((m) => ({ default: m.UnitDetailModal })),
);

type ApiProject = {
  id: string;
  projectName: string;
  description: string;
  teamMembers?: { name: string }[];
  projectRepo?: string;
  demoUrl?: string;
  liveUrl?: string;
  bountyPrize?: { name: string; amount: number; hackathonWonAtId: string }[];
  techStack?: string[];
  categories?: string[];
  m2Status?: "building" | "under_review" | "completed";
  hackathon?: { id: string; name: string; endDate: string };
  program?: { id: string; name: string; slug: string } | null;
};

type Unit = {
  id: string;
  unitNumber: string;
  title: string;
  author: string;
  description: string;
  track: string;
  isWinner: boolean;
  isM2: boolean;
  prize?: string;
  demoUrl?: string;
  githubUrl?: string;
  projectUrl?: string;
  techStack?: string[];
  categories?: string[];
  teamSize?: number;
};

const WinnersPage = () => {
  const { hackathon } = useParams<{ hackathon: string }>();
  const [winners, setWinners] = useState<Unit[]>([]);
  const [programName, setProgramName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Unit | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      if (!hackathon) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await api.getProjects({
          hackathonId: hackathon,
          winnersOnly: true,
          sortBy: "updatedAt",
          sortOrder: "desc",
          limit: 1000,
        });
        const apiProjects: ApiProject[] = Array.isArray(response?.data) ? response.data : [];

        // Phase 2 #94: prefer the canonical program name, then fall back to
        // the legacy hackathon name, then to a slug-cased pretty-print.
        const fromProgram = apiProjects.find((p) => p.program?.name)?.program?.name;
        const fromHackathon = apiProjects.find((p) => p.hackathon?.name)?.hackathon?.name;
        if (fromProgram) {
          setProgramName(fromProgram);
        } else if (fromHackathon) {
          setProgramName(fromHackathon);
        } else {
          const formatted = hackathon
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          setProgramName(formatted);
        }

        setWinners(
          apiProjects.map((p, i): Unit => {
            const prizeAmount = p.bountyPrize?.[0]?.amount;
            return {
              id: p.id,
              unitNumber: String(i + 1).padStart(3, "0"),
              title: p.projectName,
              author: p.teamMembers?.[0]?.name || "Unknown",
              description: p.description,
              track: p.bountyPrize?.[0]?.name || p.categories?.[0] || "Winner",
              isWinner: true,
              isM2: p.m2Status === "completed",
              prize: prizeAmount ? `$${prizeAmount.toLocaleString()}` : undefined,
              demoUrl: p.demoUrl,
              githubUrl: p.projectRepo,
              projectUrl: p.id ? `/m2-program/${p.id}` : undefined,
              techStack: Array.isArray(p.techStack) ? p.techStack : undefined,
              categories: p.categories,
              teamSize: p.teamMembers?.length,
            };
          }),
        );
      } catch (error) {
        const err = error as Error;
        toast({
          title: "Error",
          description: err?.message || "Failed to load winners. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hackathon, toast]);

  const handleClose = useCallback(() => setSelected(null), []);

  // "Blockspace" was a stale prefix on older event names — strip if present.
  const displayProgramName = programName.replace(/^Blockspace\s+/i, "");

  return (
    <div className="min-h-screen scanlines">
      <Navigation />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link
            to="/"
            className="label-hw-dim hover:text-display transition-colors duration-150 inline-flex items-center gap-1"
          >
            ◂ BACK TO DIRECTORY
          </Link>
        </div>

        <div className="mb-6">
          <div className="label-hw-dim mb-2">·WINNERS / {hackathon?.toUpperCase()}</div>
          <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tight text-display leading-[0.95] mb-2">
            {displayProgramName || "Winners"}
          </h1>
          <p className="text-body text-base max-w-2xl leading-relaxed">
            Congratulations to the winners of {programName || "this event"}.
          </p>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline">
            <div className="label-hw text-display flex items-center gap-2">
              <span className="led led-sm" aria-hidden="true" /> ·GRID
            </div>
            <div className="label-hw-dim">
              {loading ? "…" : `${winners.length} ${winners.length === 1 ? "UNIT" : "UNITS"}`}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : winners.length === 0 ? (
            <EmptyState
              title="No winners found"
              description="No winners have been announced for this hackathon yet."
              icon={<Trophy className="h-12 w-12 text-label-dim mx-auto" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {winners.map((u) => (
                <UnitCard key={u.id} {...u} onClick={() => setSelected(u)} />
              ))}
            </div>
          )}
        </section>
      </main>

      {selected && (
        <Suspense fallback={null}>
          <UnitDetailModal
            open={!!selected}
            onOpenChange={(open) => !open && handleClose()}
            unit={selected}
          />
        </Suspense>
      )}
    </div>
  );
};

export default WinnersPage;
