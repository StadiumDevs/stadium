import { useState, useMemo, useEffect, lazy, Suspense, useCallback } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { UnitCard } from "@/components/unit-card";
import { LCDStat } from "@/components/lcd-stat";
import { InputBus } from "@/components/input-bus";
import { HardwareToggle } from "@/components/hardware-toggle";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { NoProjectsFound } from "@/components/EmptyState";
import { api, type ApiProject, API_BASE_URL } from "@/lib/api";
import { isMainTrackWinner } from "@/lib/projectUtils";
import { useToast } from "@/hooks/use-toast";

// Lazy load heavy components (filter sidebar + detail modal)
const FilterSidebar = lazy(() => import("@/components/FilterSidebar").then(m => ({ default: m.FilterSidebar })));
const UnitDetailModal = lazy(() => import("@/components/unit-detail-modal").then(m => ({ default: m.UnitDetailModal })));

type UnitForCard = {
  id: string;
  unitNumber: string;
  title: string;
  author: string;
  description: string;
  longDescription?: string;
  track: string;
  isWinner: boolean;
  isM2: boolean;
  date?: string;
  prize?: string;
  demoUrl?: string;
  githubUrl?: string;
  projectUrl?: string;
  techStack?: string[];
  categories?: string[];
  teamSize?: number;
};

const FILTER_TO_CATEGORY: Record<string, string> = {
  gaming: "Gaming",
  defi: "DeFi",
  nft: "NFT",
  "developer-tools": "Developer Tools",
  social: "Social",
  ai: "AI",
  arts: "Arts",
  mobile: "Mobile",
};

const HomePage = () => {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showWinnersOnly, setShowWinnersOnly] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<UnitForCard | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHackathon, setSelectedHackathon] = useState<string>("all");
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [hackathons, setHackathons] = useState<{ id: string; name: string }[]>([]);
  const [allProjects, setAllProjects] = useState<ApiProject[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { toast } = useToast();

  // Load the event filter list and the project stats in parallel.
  // Phase 2 #94: events come from `programs` (program_type='hackathon'), not
  // from aggregating `project.hackathon.id` — so upcoming events surface
  // even when they have zero projects yet.
  useEffect(() => {
    const loadEventsAndStats = async () => {
      try {
        const [projectsResp, programsResp] = await Promise.all([
          api.getProjects({ limit: 2000, sortBy: "updatedAt", sortOrder: "desc" }),
          api.listPrograms().catch(() => null),
        ]);
        const apiProjects: ApiProject[] = Array.isArray(projectsResp?.data) ? projectsResp.data : [];
        setAllProjects(apiProjects);
        setStatsLoading(false);
        const eventPrograms = (programsResp?.data ?? []).filter(
          (p) => p.programType === "hackathon",
        );
        if (eventPrograms.length > 0) {
          setHackathons(eventPrograms.map((p) => ({ id: p.slug, name: p.name })));
        } else {
          // Fallback for environments where programs aren't seeded yet —
          // derive the list from project rows so the filter still works.
          const unique = new Map<string, string>();
          for (const p of apiProjects) {
            if (p.hackathon?.id) {
              unique.set(p.hackathon.id, p.hackathon.name || p.hackathon.id);
            }
          }
          setHackathons(Array.from(unique.entries()).map(([id, name]) => ({ id, name })));
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to load event list. Event filtering may be unavailable.",
          variant: "destructive",
        });
      }
    };
    loadEventsAndStats();
    // Run once on mount; `toast` is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const params = selectedHackathon === "all"
          ? { limit: 1000, sortBy: "updatedAt", sortOrder: "desc" as const }
          : { hackathonId: selectedHackathon, limit: 1000, sortBy: "updatedAt", sortOrder: "desc" as const };
        const response = await api.getProjects(params);
        if (!Array.isArray(response?.data)) {
          const msg = "API returned no data array. Check server response.";
          setLoadError(msg);
          setProjects([]);
          toast({ title: "Could not load projects", description: msg, variant: "destructive" });
          return;
        }
        setProjects(response.data);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Failed to load projects";
        setLoadError(errMsg);
        setProjects([]);
        toast({ title: "Error", description: errMsg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedHackathon, toast, retryCount]);

  // Map an ApiProject into the rack-card shape — the index in the displayed
  // list provides a stable zero-padded "UNIT NNN" label.
  const toUnit = useCallback((p: ApiProject, idx: number): UnitForCard => {
    const track = p.bountyPrize?.[0]?.name || p.categories?.[0] || "Other";
    const isWinner = Array.isArray(p.bountyPrize) && p.bountyPrize.length > 0;
    const isM2 = p.m2Status === "completed";
    const dateStr = p.completionDate || p.submittedDate || p.hackathon?.endDate;
    const date = dateStr
      ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase()
      : undefined;
    const prize = p.bountyPrize?.[0]?.amount
      ? `$${p.bountyPrize[0].amount.toLocaleString()}`
      : undefined;
    return {
      id: p.id,
      unitNumber: String(idx + 1).padStart(3, "0"),
      title: p.projectName,
      author: p.teamMembers?.[0]?.name || "Unknown",
      description: p.description,
      track,
      isWinner,
      isM2,
      date,
      prize,
      demoUrl: p.demoUrl,
      githubUrl: p.projectRepo,
      projectUrl: p.id ? `/m2-program/${p.id}` : undefined,
      techStack: Array.isArray(p.techStack) ? p.techStack : undefined,
      categories: p.categories,
      teamSize: p.teamMembers?.length,
    };
  }, []);

  // Filter + sort projects.
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    if (selectedHackathon !== "all") {
      filtered = filtered.filter((p) => p.hackathon?.id === selectedHackathon);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.projectName.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.teamMembers?.[0]?.name?.toLowerCase().includes(query)
      );
    }

    // When a search query is active, ignore the winners-only filter so
    // non-winning matches still surface — the user clearly wants a
    // specific project, regardless of category default.
    if (showWinnersOnly && !searchQuery) {
      filtered = filtered.filter((p) => Array.isArray(p.bountyPrize) && p.bountyPrize.length > 0);
    }

    if (activeFilters.length > 0) {
      filtered = filtered.filter((p) => {
        const cats = p.categories || [];
        return activeFilters.some((id) => {
          const name = FILTER_TO_CATEGORY[id];
          return name && cats.some((c) => c.toLowerCase() === name.toLowerCase());
        });
      });
    }

    filtered.sort((a, b) => {
      const compA = a.completionDate ? new Date(a.completionDate).getTime() : 0;
      const compB = b.completionDate ? new Date(b.completionDate).getTime() : 0;
      if (compB !== compA) return compB - compA;
      const subA = a.submittedDate ? new Date(a.submittedDate).getTime() : 0;
      const subB = b.submittedDate ? new Date(b.submittedDate).getTime() : 0;
      if (subB !== subA) return subB - subA;
      const updA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const updB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return updB - updA;
    });

    return filtered.map((p, i) => toUnit(p, i));
  }, [projects, searchQuery, showWinnersOnly, activeFilters, selectedHackathon, toUnit]);

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

  // Featured "·NOW SHOWING" unit — most recently-shipped M2 graduate.
  const featuredUnit = useMemo<UnitForCard | null>(() => {
    const shipped = projects
      .filter((p) => p.m2Status === "completed" && isMainTrackWinner(p))
      .sort((a, b) => {
        const dA = a.completionDate ? new Date(a.completionDate).getTime() : 0;
        const dB = b.completionDate ? new Date(b.completionDate).getTime() : 0;
        return dB - dA;
      });
    return shipped[0] ? toUnit(shipped[0], 0) : null;
  }, [projects, toUnit]);

  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilters((prev) => prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId]);
  }, []);
  const handleClearFilters = useCallback(() => {
    setActiveFilters([]);
    setShowWinnersOnly(false);
    setSearchQuery("");
  }, []);

  const fmtUSD = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`;

  return (
    <div className="min-h-screen scanlines">
      <Navigation />

      <main className="container mx-auto px-4">
        {/* Hero */}
        <section className="pt-8 pb-10">
          <div className="label-hw-dim mb-3">·DIRECTORY / NOW SHOWING</div>
          <h1 className="font-display text-6xl md:text-7xl lg:text-8xl uppercase tracking-tight text-display leading-[0.9] mb-4">
            Stadium
          </h1>
          <p className="text-body text-base md:text-lg max-w-xl leading-relaxed">
            Stuff people have built here.
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

        {/* Now Showing — single featured unit */}
        {featuredUnit && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline">
              <div className="label-hw text-display flex items-center gap-2">
                <span className="led led-sm led-pulse" aria-hidden="true" />
                ·NOW SHOWING / ENTRY {featuredUnit.unitNumber}
              </div>
              {featuredUnit.date && <div className="label-hw-dim">{featuredUnit.date}</div>}
            </div>
            <UnitCard
              {...featuredUnit}
              onClick={() => setSelectedUnit(featuredUnit)}
            />
          </section>
        )}

        {/* Filter bar */}
        <section className="panel px-3 py-2.5 mb-3 flex flex-wrap items-center gap-2">
          <InputBus
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="search entries..."
            className="flex-1 min-w-[200px]"
          />
          {hackathons.length > 0 && (
            <select
              value={selectedHackathon}
              onChange={(e) => setSelectedHackathon(e.target.value)}
              className="lcd font-mono text-[11px] text-display bg-panel-deep border border-hairline-subtle px-2 py-1.5 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-led"
              aria-label="Filter by hackathon"
            >
              <option value="all">ALL EVENTS</option>
              {hackathons.map((h) => (
                <option key={h.id} value={h.id}>{h.name.toUpperCase()}</option>
              ))}
            </select>
          )}
          <HardwareToggle
            options={[{ value: "winners", label: "WINNERS" }, { value: "all", label: "ALL" }]}
            value={showWinnersOnly ? "winners" : "all"}
            onChange={(v) => setShowWinnersOnly(v === "winners")}
          />
          <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-label-mid hover:text-display hover:bg-panel-deep px-3 py-1.5 rounded-none"
              >
                <Filter className="h-3 w-3 mr-1.5" />
                FILTERS{activeFilters.length > 0 && ` · ${activeFilters.length}`}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] panel">
              <SheetHeader>
                <SheetTitle className="label-hw">·CATEGORY FILTERS</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <Suspense fallback={<div className="label-hw-dim">Loading filters…</div>}>
                  <FilterSidebar
                    activeFilters={activeFilters}
                    onFilterChange={handleFilterChange}
                    onClearFilters={handleClearFilters}
                    showWinnersOnly={showWinnersOnly}
                    onWinnersOnlyChange={setShowWinnersOnly}
                  />
                </Suspense>
              </div>
            </SheetContent>
          </Sheet>
        </section>

        {/* Projects grid */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline">
            <div className="label-hw text-display">·DIRECTORY / GRID</div>
            <div className="label-hw-dim">{filteredProjects.length} {filteredProjects.length === 1 ? "ENTRY" : "ENTRIES"}</div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Array.from({ length: 9 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
            </div>
          ) : filteredProjects.length === 0 ? (
            loadError ? (
              <Card className="lcd p-6">
                <CardContent className="space-y-3 p-0">
                  <div className="label-hw text-destructive">·ERROR / NO PROJECTS</div>
                  <p className="text-body text-sm break-all">{loadError}</p>
                  <p className="label-hw-dim">
                    API: <code className="text-display">{API_BASE_URL || "undefined"}</code>
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRetryCount((c) => c + 1)}
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5 rounded-none"
                  >
                    RETRY
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <NoProjectsFound onClearFilters={handleClearFilters} />
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredProjects.map((u) => (
                <UnitCard key={u.id} {...u} onClick={() => setSelectedUnit(u)} />
              ))}
            </div>
          )}
        </section>
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

      {selectedUnit && (
        <Suspense fallback={null}>
          <UnitDetailModal
            open={!!selectedUnit}
            onOpenChange={(open) => !open && setSelectedUnit(null)}
            unit={selectedUnit}
          />
        </Suspense>
      )}
    </div>
  );
};

export default HomePage;
