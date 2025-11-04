import { useState, useMemo, useEffect, lazy, Suspense, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Navigation } from "@/components/Navigation";
import { SearchBar } from "@/components/SearchBar";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { NoProjectsFound } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { getProjectUrl } from "@/lib/projectUtils";

// Lazy load heavy components
const FilterSidebar = lazy(() => import("@/components/FilterSidebar").then(module => ({ default: module.FilterSidebar })));
const ProjectDetailModal = lazy(() => import("@/components/ProjectDetailModal").then(module => ({ default: module.ProjectDetailModal })));

type ApiProject = {
  id: string;
  projectName: string;
  description: string;
  teamMembers?: { name: string }[];
  projectRepo?: string;
  demoUrl?: string;
  slidesUrl?: string;
  donationAddress?: string;
  bountyPrize?: { name: string; amount: number; hackathonWonAtId: string }[];
  techStack?: string[];
  categories?: string[];
  hackathon?: { id: string; name: string; endDate: string };
};

type ProjectCardData = {
  id: string;
  title: string;
  author: string;
  description: string;
  track: string;
  isWinner: boolean;
  demoUrl?: string;
  githubUrl?: string;
  projectUrl?: string;
};

// Map filter IDs to category names
const FILTER_TO_CATEGORY: Record<string, string> = {
  "gaming": "Gaming",
  "defi": "DeFi",
  "nft": "NFT",
  "developer-tools": "Developer Tools",
  "social": "Social",
  "ai": "AI",
  "arts": "Arts",
  "mobile": "Mobile",
};

const PastProjectsPage = () => {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showWinnersOnly, setShowWinnersOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectCardData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHackathon, setSelectedHackathon] = useState<string>("all");
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [hackathons, setHackathons] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Load hackathon list once
  useEffect(() => {
    const loadHackathons = async () => {
      try {
        const response = await api.getProjects({ limit: 2000, sortBy: "updatedAt", sortOrder: "desc" });
        const apiProjects: ApiProject[] = Array.isArray(response?.data) ? response.data : [];
        const unique = new Map<string, string>();
        for (const p of apiProjects) {
          if (p.hackathon?.id) {
            unique.set(p.hackathon.id, p.hackathon.name || p.hackathon.id);
          }
        }
        setHackathons(Array.from(unique.entries()).map(([id, name]) => ({ id, name })));
      } catch (e) {
        console.error("Failed to load hackathons:", e);
      }
    };
    loadHackathons();
  }, []);

  // Load projects when selected hackathon changes
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const params = selectedHackathon === "all"
          ? { limit: 1000, sortBy: "updatedAt", sortOrder: "desc" as const }
          : { hackathonId: selectedHackathon, limit: 1000, sortBy: "updatedAt", sortOrder: "desc" as const };
        const response = await api.getProjects(params);
        const apiProjects: ApiProject[] = Array.isArray(response?.data) ? response.data : [];
        setProjects(apiProjects);
      } catch (e) {
        console.error("[PastProjects] Failed to load projects:", e);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedHackathon]);

  // Convert API project to ProjectCard format
  const convertToProjectCard = (project: ApiProject): ProjectCardData => {
    const track = project.bountyPrize?.[0]?.name || 
                 (project.categories?.[0] || "Other");
    const isWinner = Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0;

    return {
      id: project.id,
      title: project.projectName,
      author: project.teamMembers?.[0]?.name || "",
      description: project.description,
      track: track,
      isWinner: isWinner,
      demoUrl: project.demoUrl,
      githubUrl: project.projectRepo,
      projectUrl: project.id ? `/projects/${project.id}` : undefined,
    };
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    // Filter by hackathon (already handled by API, but keep for consistency)
    if (selectedHackathon !== "all") {
      filtered = filtered.filter((p) => p.hackathon?.id === selectedHackathon);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((project) =>
        project.projectName.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.teamMembers?.[0]?.name?.toLowerCase().includes(query)
      );
    }

    // Filter by winners
    if (showWinnersOnly) {
      filtered = filtered.filter((project) =>
        Array.isArray(project.bountyPrize) && project.bountyPrize.length > 0
      );
    }

    // Filter by category
    if (activeFilters.length > 0) {
      filtered = filtered.filter((project) => {
        // Get project categories (from API or derive from techStack)
        const projectCategories = project.categories || [];
        
        // Check if any active filter matches project categories
        return activeFilters.some((filterId) => {
          const categoryName = FILTER_TO_CATEGORY[filterId];
          if (!categoryName) return false;
          
          // Check if project has this category
          return projectCategories.some(
            (cat) => cat.toLowerCase() === categoryName.toLowerCase()
          );
        });
      });
    }

    return filtered.map(convertToProjectCard);
  }, [projects, searchQuery, showWinnersOnly, activeFilters, selectedHackathon]);

  const handleFilterChange = useCallback((filterId: string) => {
    setActiveFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setActiveFilters([]);
    setShowWinnersOnly(false);
    setSearchQuery("");
  }, []); // Note: setSearchQuery is stable from useState

  const handleWinnersOnlyChange = useCallback((value: boolean) => {
    setShowWinnersOnly(value);
  }, []);

  const handleProjectClick = useCallback((project: ProjectCardData) => {
    setSelectedProject(project);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <div className="min-h-screen animate-fade-in">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
            <Link to="/">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Go Back Home
            </Link>
          </Button>

          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Past Projects
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <SearchBar
              onSearchChange={setSearchQuery}
              onHackathonChange={setSelectedHackathon}
              hackathons={hackathons}
              projectCount={filteredProjects.length}
              selectedHackathon={selectedHackathon}
            />
            
            {/* Mobile Filters Button */}
            <Sheet open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle className="font-heading">Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <Suspense fallback={<div className="text-muted-foreground">Loading filters...</div>}>
                    <FilterSidebar
                      activeFilters={activeFilters}
                      onFilterChange={handleFilterChange}
                      onClearFilters={handleClearFilters}
                      showWinnersOnly={showWinnersOnly}
                      onWinnersOnlyChange={handleWinnersOnlyChange}
                      className=""
                    />
                  </Suspense>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex gap-8">
          {/* Sidebar - hidden on mobile/tablet, visible on desktop */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}>
              <FilterSidebar
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                showWinnersOnly={showWinnersOnly}
                onWinnersOnlyChange={handleWinnersOnlyChange}
              />
            </Suspense>
          </aside>

          {/* Projects Grid */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <ProjectCardSkeleton key={idx} />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <NoProjectsFound onClearFilters={handleClearFilters} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    title={project.title}
                    author={project.author}
                    description={project.description}
                    track={project.track}
                    isWinner={project.isWinner}
                    demoUrl={project.demoUrl}
                    githubUrl={project.githubUrl}
                    projectUrl={project.projectUrl}
                    onClick={() => handleProjectClick(project)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <Suspense fallback={null}>
          <ProjectDetailModal
            open={!!selectedProject}
            onOpenChange={(open) => !open && handleCloseModal()}
            project={{
              title: selectedProject.title,
              author: selectedProject.author,
              description: selectedProject.description,
              track: selectedProject.track,
              isWinner: selectedProject.isWinner,
              demoUrl: selectedProject.demoUrl,
              githubUrl: selectedProject.githubUrl,
              projectUrl: selectedProject.projectUrl,
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default PastProjectsPage;