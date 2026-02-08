import { useState, useMemo, useEffect, lazy, Suspense, useCallback } from "react";
import { Filter, FolderOpen, Trophy, Users, Rocket, ArrowRight, CheckCircle2, Github } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { SearchBar } from "@/components/SearchBar";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { NoProjectsFound } from "@/components/EmptyState";
import { api, type ApiProject } from "@/lib/api";
import { isMainTrackWinner } from "@/lib/projectUtils";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

// Lazy load heavy components
const FilterSidebar = lazy(() => import("@/components/FilterSidebar").then(module => ({ default: module.FilterSidebar })));
const ProjectDetailModal = lazy(() => import("@/components/ProjectDetailModal").then(module => ({ default: module.ProjectDetailModal })));

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
  m2Status?: "building" | "under_review" | "completed";
  m2Week?: number;
  showM2Progress?: boolean;
  submittedDate?: string;
  completionDate?: string;
  totalPaid?: Array<{
    milestone: "M1" | "M2";
    amount: number;
    currency: "USDC" | "DOT";
    transactionProof: string;
  }>;
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
  const [showWinnersOnly, setShowWinnersOnly] = useState(true);
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
    const eventStartedAt = project.hackathon?.eventStartedAt;
    const hasM2 = project.m2Status != null;

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
      m2Status: project.m2Status,
      showM2Progress: hasM2,
      submittedDate: project.submittedDate,
      completionDate: project.completionDate,
      totalPaid: project.totalPaid as ProjectCardData["totalPaid"],
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

    // Sort by event date (latest first)
    filtered.sort((a, b) => {
      const dateA = a.hackathon?.eventStartedAt ? new Date(a.hackathon.eventStartedAt).getTime() : 0;
      const dateB = b.hackathon?.eventStartedAt ? new Date(b.hackathon.eventStartedAt).getTime() : 0;
      return dateB - dateA; // Latest first
    });

    return filtered.map(convertToProjectCard);
  }, [projects, searchQuery, showWinnersOnly, activeFilters, selectedHackathon]);

  // Calculate stats (m2Graduates = main track completed only, per M2 program scope)
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const winners = projects.filter((p) => Array.isArray(p.bountyPrize) && p.bountyPrize.length > 0).length;
    const m2Graduates = projects.filter(
      (p) => p.m2Status === "completed" && isMainTrackWinner(p)
    ).length;
    return { totalProjects, winners, m2Graduates };
  }, [projects]);

  // Recently completed M2 projects (main track only), sorted by completion date, newest first
  const recentlyShipped = useMemo(() => {
    return projects
      .filter((p) => p.m2Status === "completed" && isMainTrackWinner(p))
      .sort((a, b) => {
        const dateA = a.completionDate ? new Date(a.completionDate).getTime() : 0;
        const dateB = b.completionDate ? new Date(b.completionDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 4);
  }, [projects]);

  // Format completion date for display
  const formatCompletionDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
                <img 
                  src="/logos/polkadot.png" 
                  alt="Polkadot" 
                  className="h-6 md:h-8 w-auto opacity-70 hover:opacity-100 transition-opacity"
                />
                <img 
                  src="/logos/arkiv.png" 
                  alt="Arkiv" 
                  className="h-6 md:h-8 w-auto opacity-70 hover:opacity-100 transition-opacity"
                />
                <img 
                  src="/logos/hyperbridge.png" 
                  alt="Hyperbridge" 
                  className="h-6 md:h-8 w-auto opacity-70 hover:opacity-100 transition-opacity"
                />
                <img 
                  src="/logos/superteam-germany.png" 
                  alt="Superteam Germany" 
                  className="h-6 md:h-8 w-auto opacity-70 hover:opacity-100 transition-opacity"
                />
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

      {/* Recently Shipped Spotlight Section */}
      {recentlyShipped.length > 0 && (
        <section className="relative py-12 overflow-hidden">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/10 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.15)_0%,_transparent_70%)]" />
          
          <div className="relative container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {/* Section Header */}
              <div className="text-center mb-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
                  <Rocket className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Milestone 2 Complete</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">Recently Shipped</h2>
                <p className="text-muted-foreground text-lg">
                  Teams that recently completed their Milestone 2
                </p>
              </div>
              
              {/* Spotlight Cards - Horizontal Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentlyShipped.map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Link 
                      to={`/m2-program/${project.id}`}
                      className="group block"
                    >
                      <div className="glass-panel rounded-xl border border-primary/20 p-6 hover:border-primary/40 hover:purple-glow transition-all duration-300">
                        <div className="flex gap-5">
                          {/* Left: Icon/Badge */}
                          <div className="flex-shrink-0">
                            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                              <CheckCircle2 className="h-7 w-7 text-primary" />
                            </div>
                          </div>
                          
                          {/* Right: Content */}
                          <div className="flex-1 min-w-0">
                            {/* Title & Author */}
                            <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors truncate">
                              {project.projectName}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-3">
                              by {project.teamMembers?.[0]?.name || 'Team'}
                              {project.completionDate && (
                                <span className="ml-2 text-primary/70">
                                  • Shipped {formatCompletionDate(project.completionDate)}
                                </span>
                              )}
                            </p>
                            
                            {/* Description */}
                            <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
                              {project.description}
                            </p>
                            
                            {/* Footer: Track & Link */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {project.bountyPrize?.[0]?.name && (
                                  <span className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20">
                                    {project.bountyPrize[0].name}
                                  </span>
                                )}
                                {project.projectRepo && (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      window.open(project.projectRepo, '_blank', 'noopener,noreferrer');
                                    }}
                                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                  >
                                    <Github className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                  </button>
                                )}
                              </div>
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                                View Project
                                <ArrowRight className="h-4 w-4" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

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
                    showM2Progress={project.showM2Progress}
                    m2Status={project.m2Status}
                    m2Week={project.m2Week}
                    submittedDate={project.submittedDate}
                    completionDate={project.completionDate}
                    totalPaid={project.totalPaid}
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