import { useState, useMemo, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { LCDStat } from "@/components/lcd-stat";
import { ProgramSpaces } from "@/components/program-spaces";
import { api, type ApiProject, type ApiProgram } from "@/lib/api";
import { isMainTrackWinner } from "@/lib/projectUtils";
import { useToast } from "@/hooks/use-toast";

const HomePage = () => {
  const [allProjects, setAllProjects] = useState<ApiProject[]>([]);
  const [allPrograms, setAllPrograms] = useState<ApiProgram[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const { toast } = useToast();

  // Load the project stats (for the index panel) and the programs list (for the
  // program spaces) in parallel. Phase 2 #94: programs come from the `programs`
  // table so upcoming/past events surface even with zero projects.
  useEffect(() => {
    const loadStatsAndPrograms = async () => {
      try {
        const [projectsResp, programsResp] = await Promise.all([
          api.getProjects({ limit: 2000, sortBy: "updatedAt", sortOrder: "desc" }),
          api.listPrograms().catch(() => null),
        ]);
        const apiProjects: ApiProject[] = Array.isArray(projectsResp?.data) ? projectsResp.data : [];
        setAllProjects(apiProjects);
        setAllPrograms(programsResp?.data ?? []);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load directory stats.",
          variant: "destructive",
        });
      } finally {
        setStatsLoading(false);
      }
    };
    loadStatsAndPrograms();
    // Run once on mount; `toast` is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const totalProjects = allProjects.length;
    const winners = allProjects.filter((p) => Array.isArray(p.bountyPrize) && p.bountyPrize.length > 0).length;
    const m2Graduates = allProjects.filter((p) => p.m2Status === "completed" && isMainTrackWinner(p)).length;
    const totalPaid = allProjects.reduce((acc, p) => {
      const paid = (p.totalPaid || []).reduce((s, x) => s + (x.currency === "USDC" ? x.amount : 0), 0);
      return acc + paid;
    }, 0);
    return { totalProjects, winners, m2Graduates, totalPaid };
  }, [allProjects]);

  const fmtUSD = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;

  return (
    <div className="min-h-screen scanlines">
      <Navigation />

      <main className="container mx-auto px-4">
        {/* Hero */}
        <section className="pt-8 pb-10">
          <div className="label-hw-dim mb-3">·DIRECTORY / NOW SHOWING</div>
          <div className="flex items-center gap-3 md:gap-4 mb-4">
            <img
              src="/favicon.svg"
              alt="Stadium"
              className="h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 flex-shrink-0"
            />
            <h1 className="font-display text-6xl md:text-7xl lg:text-8xl uppercase tracking-tight text-display leading-[0.9]">
              Stadium
            </h1>
          </div>
          <p className="text-body text-base md:text-lg max-w-xl leading-relaxed">
            Stuff people build here. Explore past programs, leave your mark.
          </p>

          <div className="pt-8">
            <div className="label-hw-dim mb-3">PAST EVENT PARTNERS</div>
            <div className="flex flex-wrap items-center gap-8 opacity-60">
              <img src="/logos/polkadot.png" alt="Polkadot" className="h-6 md:h-7 w-auto" />
              <img src="/logos/arkiv.png" alt="Arkiv" className="h-6 md:h-7 w-auto" />
              <img src="/logos/hyperbridge.png" alt="Hyperbridge" className="h-6 md:h-7 w-auto" />
              <img src="/logos/superteam-germany.png" alt="Superteam Germany" className="h-6 md:h-7 w-auto" />
            </div>
          </div>
        </section>

        {/* Index stats */}
        <section className="mb-10">
          <div className="panel p-4">
            <div className="label-hw mb-3">·INDEX / LIVE</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <LCDStat value={statsLoading ? "—" : stats.totalProjects} label="Total Entries" size="lg" />
              <LCDStat value={statsLoading ? "—" : stats.winners} label="Winners" showLED pulse />
              <LCDStat value={statsLoading ? "—" : stats.m2Graduates} label="In M2" showLED />
              <LCDStat value={statsLoading ? "—" : fmtUSD(stats.totalPaid)} label="Paid" size="sm" showLED />
            </div>
          </div>
        </section>

        {/* Programs — entry point to all WebZero program types */}
        <ProgramSpaces programs={allPrograms} />
      </main>

      <footer className="panel mt-12">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono text-[10px] tracking-[0.14em] text-label-dim">
          <div className="flex items-center gap-3">
            <span className="text-display">STADIUM</span>
            <span className="text-hairline">|</span>
            <span>MMXXVI</span>
            <span className="text-hairline">|</span>
            <span className="flex items-center gap-1.5">
              <span className="led led-sm" aria-hidden="true" /> READY
            </span>
          </div>
          <span>POLKADOT · SUPERTEAM · HYPERBRIDGE · ARKIV</span>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
