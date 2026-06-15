import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { ProgramSpaces } from "@/components/program-spaces";
import { api, type ApiProgram } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const HomePage = () => {
  const [allPrograms, setAllPrograms] = useState<ApiProgram[]>([]);
  const { toast } = useToast();

  // Load the programs list for the program spaces. Phase 2 #94: programs come
  // from the `programs` table so upcoming/past events surface even with zero projects.
  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const programsResp = await api.listPrograms();
        setAllPrograms(programsResp?.data ?? []);
      } catch {
        toast({
          title: "Error",
          description: "Failed to load programs.",
          variant: "destructive",
        });
      }
    };
    loadPrograms();
    // Run once on mount; `toast` is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
