import { useState, useMemo, useEffect, lazy, Suspense, useCallback } from "react";
import { Filter, FolderOpen, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { SearchBar } from "@/components/SearchBar";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { NoProjectsFound } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

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
  m2Status?: 'building' | 'under_review' | 'completed';
  hackathon?: { id: string; name: string; endDate: string; eventStartedAt?: string };
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
  eventStartedAt?: string;
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

const HomePage = () => {
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showWinnersOnly, setShowWinnersOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectCardData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHackathon, setSelectedHackathon] = useState<string>("all");
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [hackathons, setHackathons] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { toast } = useToast();

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
        console.error("[HomePage] Failed to load projects:", e);
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
    
    // Get eventStartedAt from hackathon (should always be present)
    const eventStartedAt = project.hackathon?.eventStartedAt;

    return {
      id: project.id,
      title: project.projectName,
      author: project.teamMembers?.[0]?.name || "",
      description: project.description,
      track: track,
      isWinner: isWinner,
      demoUrl: project.demoUrl,
      githubUrl: project.projectRepo,
      projectUrl: project.id ? `/m2-program/${project.id}` : undefined,
      eventStartedAt: eventStartedAt,
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

  // Calculate stats
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const winners = projects.filter(p => Array.isArray(p.bountyPrize) && p.bountyPrize.length > 0).length;
    const m2Graduates = projects.filter(p => p.m2Status === 'completed').length;
    return { totalProjects, winners, m2Graduates };
  }, [projects]);

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
  }, []);

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

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Cosmic Background Layer */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/images/sub0-ba.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.25,
            filter: 'blur(1px)',
          }}
        />
        
        {/* Dark Gradient Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/85 via-background/90 to-background" />
        
        {/* Radial gradient for depth */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_transparent_0%,_hsl(var(--background))_70%)]" />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 pt-28 pb-12">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="font-display hero-title text-7xl md:text-8xl lg:text-9xl mb-6">
              STADIUM
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground">
              A progress and showcase portal for hackathon projects that keep shipping between events.
            </p>

            {/* Past Event Partners */}
            <div className="pt-8 space-y-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground/60">
                Past event partners
              </p>
              <div className="flex flex-wrap justify-center items-center gap-6 md:gap-8">
                {/* Polkadot */}
                <div className="opacity-50 hover:opacity-80 transition-opacity" title="Polkadot">
                  <svg className="h-6 md:h-7 w-auto" viewBox="0 0 1340 240" fill="currentColor">
                    <path d="M120 0C53.73 0 0 53.73 0 120s53.73 120 120 120 120-53.73 120-120S186.27 0 120 0zm0 200c-44.18 0-80-35.82-80-80s35.82-80 80-80 80 35.82 80 80-35.82 80-80 80z"/>
                    <circle cx="120" cy="40" r="25"/>
                    <circle cx="120" cy="200" r="25"/>
                    <circle cx="50" cy="80" r="20"/>
                    <circle cx="190" cy="80" r="20"/>
                    <circle cx="50" cy="160" r="20"/>
                    <circle cx="190" cy="160" r="20"/>
                  </svg>
                </div>
                {/* Solana */}
                <div className="opacity-50 hover:opacity-80 transition-opacity" title="Solana">
                  <svg className="h-5 md:h-6 w-auto" viewBox="0 0 508 80" fill="currentColor">
                    <path d="M13.2 58.7l12.1-12.9c.8-.9 1.9-1.4 3.1-1.4h60.8c1.9 0 2.9 2.4 1.5 3.8L78.6 61.1c-.8.9-1.9 1.4-3.1 1.4H14.7c-1.9 0-2.9-2.4-1.5-3.8zM13.2 13.8L25.3.9c.8-.9 1.9-1.4 3.1-1.4h60.8c1.9 0 2.9 2.4 1.5 3.8L78.6 16.2c-.8.9-1.9 1.4-3.1 1.4H14.7c-1.9 0-2.9-2.4-1.5-3.8zM78.6 35.8L66.5 48.7c-.8.9-1.9 1.4-3.1 1.4H2.6c-1.9 0-2.9-2.4-1.5-3.8l12.1-12.9c.8-.9 1.9-1.4 3.1-1.4h60.8c1.9 0 2.9 2.4 1.5 3.8z"/>
                  </svg>
                </div>
                {/* Ethereum */}
                <div className="opacity-50 hover:opacity-80 transition-opacity" title="Ethereum">
                  <svg className="h-7 md:h-8 w-auto" viewBox="0 0 256 417" fill="currentColor">
                    <path d="M127.96 0l-2.79 9.5v275.27l2.79 2.78 127.96-75.64z" fillOpacity=".6"/>
                    <path d="M127.96 0L0 211.91l127.96 75.64V0z"/>
                    <path d="M127.96 312.18l-1.57 1.92v98.2l1.57 4.58 128.04-180.29z" fillOpacity=".6"/>
                    <path d="M127.96 416.88v-104.7L0 236.59z"/>
                    <path d="M127.96 287.55l127.96-75.64-127.96-58.12z" fillOpacity=".2"/>
                    <path d="M0 211.91l127.96 75.64v-133.76z" fillOpacity=".6"/>
                  </svg>
                </div>
                {/* Rootstock */}
                <div className="opacity-50 hover:opacity-80 transition-opacity" title="Rootstock">
                  <svg className="h-6 md:h-7 w-auto" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 85c-19.3 0-35-15.7-35-35s15.7-35 35-35 35 15.7 35 35-15.7 35-35 35z"/>
                    <path d="M50 25c-13.8 0-25 11.2-25 25s11.2 25 25 25 25-11.2 25-25-11.2-25-25-25zm0 40c-8.3 0-15-6.7-15-15s6.7-15 15-15 15 6.7 15 15-6.7 15-15 15z"/>
                  </svg>
                </div>
                {/* XX Network */}
                <div className="opacity-50 hover:opacity-80 transition-opacity" title="XX Network">
                  <svg className="h-6 md:h-7 w-auto" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M20 20l25 30-25 30h15l17.5-21 17.5 21h15l-25-30 25-30h-15l-17.5 21L35 20z"/>
                  </svg>
                </div>
                {/* Hyperbridge */}
                <div className="opacity-50 hover:opacity-80 transition-opacity" title="Hyperbridge">
                  <svg className="h-5 md:h-6 w-auto" viewBox="0 0 100 60" fill="currentColor">
                    <path d="M10 10h15v40H10zM75 10h15v40H75zM30 25h40v10H30z"/>
                  </svg>
                </div>
                {/* Arkiv */}
                <div className="opacity-50 hover:opacity-80 transition-opacity" title="Arkiv">
                  <svg className="h-6 md:h-7 w-auto" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M50 5L10 95h20l20-50 20 50h20z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total Projects</p>
                    <p className="text-3xl font-bold">{stats.totalProjects}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Winners */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Winners</p>
                    <p className="text-3xl font-bold">{stats.winners}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* M2 Graduates */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">M2 Graduates</p>
                    <p className="text-3xl font-bold">{stats.m2Graduates}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Projects Section */}
      <div className="container mx-auto px-4 pb-16">
        {/* Search and Filters Header */}
        <div className="mb-8">
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
              eventStartedAt: selectedProject.eventStartedAt,
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default HomePage;