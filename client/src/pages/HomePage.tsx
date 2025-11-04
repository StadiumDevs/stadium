import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Trophy, CheckCircle, ArrowUpRight, Sparkles, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { ProjectCarousel } from "@/components/ProjectCarousel";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { getProjectUrl } from "@/lib/projectUtils";

// Lazy load ProjectDetailModal
const ProjectDetailModal = lazy(() => import("@/components/ProjectDetailModal").then(module => ({ default: module.ProjectDetailModal })));

type CarouselProject = {
  id: string;
  title: string;
  author: string;
  description: string;
  track: string;
  isWinner: boolean;
  demoUrl?: string;
  projectUrl?: string;
  githubUrl?: string;
  longDescription?: string;
  m2Status?: 'building' | 'under_review' | 'completed';
  completionDate?: string;
  fundingStatus?: string;
  technologies?: string[];
  submittedDate?: string;
};

type FullProject = {
  id: string;
  projectName: string;
  description: string;
  teamMembers?: Array<{ name?: string }>;
  demoUrl?: string;
  slidesUrl?: string;
  projectRepo?: string;
  donationAddress?: string;
  bountyPrize?: Array<{ name?: string; amount?: number; hackathonWonAtId?: string }>;
  m2Status?: 'building' | 'under_review' | 'completed';
  isWinner?: boolean;
  completionDate?: string;
  fundingStatus?: string;
  techStack?: string[];
  eventStartedAt?: string;
  submittedDate?: string;
};

const HomePage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<CarouselProject[]>([]);
  const [allProjects, setAllProjects] = useState<FullProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<CarouselProject | null>(null);
  const { toast } = useToast();

  const handleProjectClick = useCallback((project: CarouselProject) => {
    setSelectedProject(project);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedProject(null);
  }, []);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        // Fetch winners for Synergy 2025 directly from API
        const response = await api.getProjects({
          hackathonId: "synergy-2025",
          winnersOnly: true,
          sortBy: "updatedAt",
          sortOrder: "desc",
          limit: 1000,
        });
        const apiProjects = Array.isArray(response?.data) ? response.data : [];
        
        // Store all projects with full data
        setAllProjects(apiProjects as FullProject[]);
        
        const mapped: CarouselProject[] = apiProjects.map((p: FullProject) => ({
          id: p.id,
          title: p.projectName,
          author: p.teamMembers?.[0]?.name || "",
          description: p.description,
          track: p.bountyPrize?.[0]?.name || (p.categories?.[0] || "Winner"),
          isWinner: Array.isArray(p.bountyPrize) && p.bountyPrize.length > 0,
          demoUrl: p.demoUrl || "",
          projectUrl: p.donationAddress ? `/projects/${p.id}` : undefined,
          githubUrl: p.projectRepo,
          longDescription: p.description,
          m2Status: p.m2Status,
          completionDate: p.completionDate,
          fundingStatus: p.fundingStatus,
          technologies: p.techStack,
          submittedDate: p.eventStartedAt || p.submittedDate,
        }));
        console.log("[HomePage] Mapped projects count:", mapped.length);
        setProjects(mapped);
      } catch (error) {
        console.error("[HomePage] failed to load API projects:", error);
        console.error("[HomePage] Error details:", {
          message: (error as Error)?.message,
          stack: (error as Error)?.stack,
          name: (error as Error)?.name
        });
        const err = error as Error;
        toast({
          title: "Error",
          description: err?.message || "Failed to load projects. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, [toast]);

  // Calculate M2 statistics
  const m2Stats = useMemo(() => {
    const graduates = allProjects.filter(p => p.m2Status === 'completed');
    const winners = allProjects.filter(p => p.isWinner || (Array.isArray(p.bountyPrize) && p.bountyPrize.length > 0));
    
    return {
      totalGraduates: graduates.length,
      totalPaid: graduates.length * 4000, // $4k per graduate
      completionRate: winners.length > 0 
        ? Math.round((graduates.length / winners.length) * 100)
        : 0
    };
  }, [allProjects]);

  // Get featured graduates (4 random completed projects)
  const featuredGraduates = useMemo(() => {
    const graduates = allProjects.filter(p => p.m2Status === 'completed');
    // Shuffle and take 4 random
    return graduates.sort(() => Math.random() - 0.5).slice(0, 4);
  }, [allProjects]);

  // Filter and sort M2 graduates for carousel
  const m2Graduates = useMemo(() => {
    return projects
      .filter(p => p.m2Status === 'completed')
      .map(p => {
        // Find corresponding full project for completion date
        const fullProject = allProjects.find(fp => fp.id === p.id);
        return {
          ...p,
          completionDate: fullProject?.completionDate
        };
      })
      .sort((a, b) => {
        // Sort by completion date, newest first
        const dateA = new Date(a.completionDate || 0).getTime();
        const dateB = new Date(b.completionDate || 0).getTime();
        return dateB - dateA;
      });
  }, [projects, allProjects]);

  // Select success stories (top 3 graduates)
  const successStories = useMemo(() => {
    return projects
      .filter(p => p.m2Status === 'completed')
      .map(p => {
        // Find corresponding full project for additional data
        const fullProject = allProjects.find(fp => fp.id === p.id);
        return {
          ...p,
          completionDate: fullProject?.completionDate,
          fundingStatus: fullProject?.fundingStatus,
          technologies: fullProject?.techStack || []
        };
      })
      .sort((a, b) => {
        // Prioritize projects with funding status
        if (a.fundingStatus && !b.fundingStatus) return -1;
        if (!a.fundingStatus && b.fundingStatus) return 1;
        
        // Then by completion date
        const dateA = new Date(a.completionDate || 0).getTime();
        const dateB = new Date(b.completionDate || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 3); // Top 3
  }, [projects, allProjects]);

  // Filter for recent winners (not yet completed M2)
  const recentWinners = useMemo(() => {
    return projects
      .filter(p => p.isWinner) // All winners
      .sort((a, b) => {
        // Sort by submission date
        const dateA = new Date(a.submittedDate || 0).getTime();
        const dateB = new Date(b.submittedDate || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 6); // Show 6 most recent
  }, [projects]);

  // Calculate hackathon stats
  const hackathonStats = useMemo(() => {
    return {
      totalProjects: projects.length,
      totalWinners: projects.filter(p => p.isWinner).length,
      inM2Program: projects.filter(p => p.isWinner && 
        (p.m2Status === 'building' || p.m2Status === 'under_review')
      ).length,
      m2Graduates: projects.filter(p => p.m2Status === 'completed').length
    };
  }, [projects]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="space-y-16">
            {/* Hero Skeleton */}
            <div className="max-w-4xl mx-auto text-center space-y-6">
              <div className="h-16 bg-muted animate-pulse rounded-md w-3/4 mx-auto" />
              <div className="h-6 bg-muted animate-pulse rounded-md w-1/2 mx-auto" />
            </div>
            
            {/* Featured Winners Skeleton */}
            <section>
              <div className="mb-8">
                <div className="h-8 bg-muted animate-pulse rounded-md w-64 mb-2" />
                <div className="h-5 bg-muted animate-pulse rounded-md w-96" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <ProjectCardSkeleton key={idx} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      <Navigation />

      {/* Hero Section */}
      <section className="container mx-auto px-4 md:px-8 pt-32 pb-16">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h1 className="font-display hero-title text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tight">
            Stadium.
          </h1>
          <p className="text-xl text-muted-foreground">
            The ultimate project progress and showcase portal for hackathon projects going places.
          </p>
          
          {/* Upcoming Event - Prominent */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 border border-primary rounded-full">
              <span>👍</span>
              <span className="text-accent">
                Upcoming event:{" "}
                <a 
                  href="https://luma.com/sub0hack"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold underline hover:text-accent cursor-pointer transition-colors"
                >
                  sub0_hack_2025
                </a>
              </span>
            </div>
          </div>
          
          {/* Past Events - Subtle */}
          <p className="text-sm text-muted-foreground/70">
            Past events: Blockspace Symmetry 2024, Blockspace Synergy 2025.
          </p>
        </div>
      </section>

      {/* M2 Graduates Section */}
      {m2Stats.totalGraduates > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="glass-panel rounded-lg p-8 md:p-12 bg-gradient-to-r from-purple-900/20 to-yellow-900/20 border-l-4 border-l-yellow-500">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left: Text content */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-8 h-8 text-yellow-500" aria-hidden="true" />
                  <h2 className="text-3xl md:text-4xl font-heading">
                    M2 Graduates
                  </h2>
                </div>
                
                <p className="text-lg text-muted-foreground mb-6">
                  Celebrating teams who completed the 6-week M2 Accelerator program at sub0 2025
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-500 mb-1">
                      {m2Stats.totalGraduates}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Teams Graduated
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-500 mb-1">
                      ${m2Stats.totalPaid.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total Paid
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-1">
                      {m2Stats.completionRate}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Completion Rate
                    </div>
                  </div>
                </div>
                
                <Button 
                  size="lg"
                  onClick={() => navigate('/projects')}
                  className="group"
                >
                  View All Graduates
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Button>
              </div>
              
              {/* Right: Visual element or featured graduate */}
              <div className="hidden md:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-yellow-500 opacity-20 blur-3xl" />
                  <div className="relative grid grid-cols-2 gap-4">
                    {/* Show 4 random graduate project cards as mini previews */}
                    {featuredGraduates.slice(0, 4).map((project, index) => (
                      <div
                        key={project.id}
                        className="glass-panel rounded-lg p-4 border border-yellow-500/30 hover:border-yellow-500 transition-all cursor-pointer"
                        onClick={() => navigate(`/projects/${project.id}`)}
                        style={{
                          animation: `fadeIn 0.5s ease-out ${index * 0.1}s both`
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${project.projectName} project details`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(`/projects/${project.id}`);
                          }
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
                          <span className="text-xs font-medium line-clamp-1">
                            {project.projectName}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* M2 Graduates Carousel */}
      {m2Graduates.length > 0 ? (
        <section className="container mx-auto px-4 py-16">
          <div className="mb-8">
            <h2 className="text-3xl font-heading mb-2 flex items-center gap-3">
              <span className="text-4xl">🎓</span>
              Meet Past M2 Graduates
            </h2>
            <p className="text-muted-foreground">
              Teams that successfully completed the 6-week accelerator program
            </p>
          </div>
          
          <ProjectCarousel 
            projects={m2Graduates.map(p => ({
              id: p.id,
              title: p.title,
              author: p.author,
              description: p.description,
              track: p.track,
              isWinner: p.isWinner,
              demoUrl: p.demoUrl,
              projectUrl: p.projectUrl,
              githubUrl: p.githubUrl,
              longDescription: p.longDescription,
              m2Status: p.m2Status,
            }))}
            onProjectClick={handleProjectClick}
          />
          
          <div className="text-center mt-8">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/projects')}
            >
              View All M2 Projects
              <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </section>
      ) : (
        // Empty state if no graduates yet
        projects.some(p => p.isWinner) && (
          <section className="container mx-auto px-4 py-16">
            <div className="glass-panel rounded-lg p-12 text-center">
              <div className="text-6xl mb-4" role="img" aria-label="Construction emoji">🚧</div>
              <h3 className="text-2xl font-heading mb-2">
                M2 Program In Progress
              </h3>
              <p className="text-muted-foreground mb-6">
                Our first M2 graduates will be featured here in early 2026!<br />
                4 teams are currently building their milestone 2 projects.
              </p>
              <Button onClick={() => navigate('/projects')}>
                Follow Their Progress
              </Button>
            </div>
          </section>
        )
      )}

      {/* Success Stories Section */}
      {successStories.length > 0 && (
        <section className="w-full py-16 bg-muted/30">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-heading mb-4">
                Success Stories
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Spotlight on teams that went from hackathon prototype to fundable product in 6 weeks
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {successStories.map((project) => (
                <div
                  key={project.id}
                  className="glass-panel rounded-lg p-6 hover:border-primary transition-all cursor-pointer group"
                  onClick={() => navigate(`/projects/${project.id}`)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${project.title} project details`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/projects/${project.id}`);
                    }
                  }}
                >
                  {/* Header with winner badge */}
                  <div className="flex items-start justify-between mb-4">
                    <Badge className="bg-yellow-500 text-black">
                      🏆 M2 Graduate
                    </Badge>
                    <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" aria-hidden="true" />
                  </div>
                  
                  {/* Project info */}
                  <h3 className="text-xl font-heading mb-2 line-clamp-2">
                    {project.title}
                  </h3>
                  <p className="text-sm text-accent mb-3">
                    By {project.author}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {project.description}
                  </p>
                  
                  {/* Stats/highlights */}
                  <div className="space-y-2 pt-4 border-t border-subtle">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="w-3 h-3 text-green-500" aria-hidden="true" />
                      <span className="text-muted-foreground">
                        Completed: {project.completionDate ? 
                          new Date(project.completionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) :
                          'Recently'
                        }
                      </span>
                    </div>
                    
                    {/* Optional: funding status if available */}
                    {project.fundingStatus && (
                      <div className="flex items-center gap-2 text-xs mt-2">
                        <Sparkles className="w-3 h-3 text-yellow-500" aria-hidden="true" />
                        <span className="text-yellow-500 font-medium">
                          {project.fundingStatus}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* CTA */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full mt-4 group-hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${project.id}`);
                    }}
                  >
                    View Project
                    <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Winners - Recent Hackathon Winners */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-heading mb-2 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" aria-hidden="true" />
              Recent Winners
            </h2>
            <p className="text-muted-foreground">
              Latest projects from our sub0 2025 hackathon
            </p>
          </div>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/past-projects')}
            className="md:w-auto w-full"
          >
            View All Projects
            <ArrowRight className="ml-2 w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
        
        {recentWinners.length === 0 ? (
          <EmptyState
            title="No Winning Projects Yet"
            description="Winning projects will be displayed here as they are selected."
            icon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
          />
        ) : (
          <>
            <ProjectCarousel 
              projects={recentWinners.map(p => ({
                id: p.id,
                title: p.title,
                author: p.author,
                description: p.description,
                track: p.track,
                isWinner: p.isWinner,
                demoUrl: p.demoUrl,
                projectUrl: p.projectUrl,
                githubUrl: p.githubUrl,
                m2Status: p.m2Status,
              }))}
              onProjectClick={handleProjectClick}
            />
            
            {/* Show program stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 p-6 glass-panel rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">
                  {hackathonStats.totalProjects}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Projects
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500 mb-1">
                  {hackathonStats.totalWinners}
                </div>
                <div className="text-xs text-muted-foreground">
                  Winners
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500 mb-1">
                  {hackathonStats.inM2Program}
                </div>
                <div className="text-xs text-muted-foreground">
                  In M2 Program
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-accent mb-1">
                  {hackathonStats.m2Graduates}
                </div>
                <div className="text-xs text-muted-foreground">
                  M2 Graduates
                </div>
              </div>
            </div>
          </>
        )}
      </section>

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
              longDescription: selectedProject.longDescription,
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

export default HomePage;