import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { ProjectCarousel } from "@/components/ProjectCarousel";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Trophy } from "lucide-react";
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
};

const HomePage = () => {
  const [projects, setProjects] = useState<CarouselProject[]>([]);
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
        const mapped: CarouselProject[] = apiProjects.map((p: {
          id: string;
          projectName: string;
          description: string;
          teamMembers?: Array<{ name?: string }>;
          demoUrl?: string;
          slidesUrl?: string;
          projectRepo?: string;
          donationAddress?: string;
          bountyPrize?: Array<{ name?: string; amount?: number; hackathonWonAtId?: string }>;
        }) => ({
          id: p.id,
          title: p.projectName,
          author: p.teamMembers?.[0]?.name || "",
          description: p.description,
          track: p.bountyPrize?.[0]?.name || "Winner",
          isWinner: Array.isArray(p.bountyPrize) && p.bountyPrize.length > 0,
          demoUrl: p.demoUrl || "",
          projectUrl: p.donationAddress ? `/projects/${p.id}` : undefined,
          githubUrl: p.projectRepo,
          longDescription: p.description,
        }));
        setProjects(mapped);
      } catch (error) {
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
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="font-display hero-title text-7xl md:text-8xl lg:text-9xl font-black uppercase tracking-tight">
            Stadium
          </h1>
          <p className="text-xl text-muted-foreground">
            The ultimate hacker's project progress and showcase portal.
          </p>
          <div className="space-y-2">
            <p className="text-accent flex items-center justify-center gap-2">
              👍 Upcoming event:{" "}
              <span className="font-semibold underline">sub0_hack_2025</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Past events: Blockspace Symmetry 2024, Blockspace Synergy 2025.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Winners Carousel */}
      <section className="container mx-auto px-4 pb-16">
        <div className="mb-8">
          <h2 className="font-heading text-3xl font-bold mb-2">
            🏆 Featured Winners
          </h2>
          <p className="text-muted-foreground">
            Congratulations to our recent hackathon winners!
          </p>
        </div>

                {projects.length === 0 ? (
                  <EmptyState
                    title="No Winning Projects Yet"
                    description="Winning projects will be displayed here as they are selected."
                    icon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
                  />
                ) : (
          <ProjectCarousel
            projects={projects}
            onProjectClick={handleProjectClick}
          />
        )}
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 pb-16 text-center">
        <Button size="lg" className="gap-2" asChild>
          <Link to="/past-projects">
            View All Past Projects
            <ArrowRight className="w-5 h-5" />
          </Link>
        </Button>
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