import { useState, useMemo, lazy, Suspense, useCallback } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UnitCard } from "@/components/unit-card";
import { InputBus } from "@/components/input-bus";
import { HardwareToggle } from "@/components/hardware-toggle";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { NoProjectsFound } from "@/components/EmptyState";
import type { ApiProject } from "@/lib/api";

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

// Map an ApiProject into the rack-card shape — the index in the displayed
// list provides a stable zero-padded "UNIT NNN" label.
function toUnit(p: ApiProject, idx: number): UnitForCard {
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
}

/**
 * Searchable project browser: text search, WINNERS/ALL toggle, and category
 * filters over a supplied project list, rendering a grid of rack cards with a
 * detail modal. Lifted out of HomePage so any scope (e.g. a single program's
 * entries) can reuse the same search view.
 */
export function ProjectExplorer({
  projects,
  loading = false,
  defaultWinnersOnly = false,
}: {
  projects: ApiProject[];
  loading?: boolean;
  defaultWinnersOnly?: boolean;
}) {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showWinnersOnly, setShowWinnersOnly] = useState(defaultWinnersOnly);
  const [selectedUnit, setSelectedUnit] = useState<UnitForCard | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    let filtered = projects;

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

    filtered = [...filtered].sort((a, b) => {
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
  }, [projects, searchQuery, showWinnersOnly, activeFilters]);

  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilters((prev) => prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId]);
  }, []);
  const handleClearFilters = useCallback(() => {
    setActiveFilters([]);
    setShowWinnersOnly(false);
    setSearchQuery("");
  }, []);

  return (
    <>
      {/* Filter bar */}
      <section className="panel px-3 py-2.5 mb-3 flex flex-wrap items-center gap-2">
        <InputBus
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="search entries..."
          className="flex-1 min-w-[200px]"
        />
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
      <section>
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline">
          <div className="label-hw text-display">·PROJECTS</div>
          <div className="label-hw-dim">{filteredProjects.length} {filteredProjects.length === 1 ? "ENTRY" : "ENTRIES"}</div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
          </div>
        ) : filteredProjects.length === 0 ? (
          <NoProjectsFound onClearFilters={handleClearFilters} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredProjects.map((u) => (
              <UnitCard key={u.id} {...u} onClick={() => setSelectedUnit(u)} />
            ))}
          </div>
        )}
      </section>

      {selectedUnit && (
        <Suspense fallback={null}>
          <UnitDetailModal
            open={!!selectedUnit}
            onOpenChange={(open) => !open && setSelectedUnit(null)}
            unit={selectedUnit}
          />
        </Suspense>
      )}
    </>
  );
}
