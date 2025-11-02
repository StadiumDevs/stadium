import { useState, useEffect, lazy, Suspense, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Lazy load ProjectDetailModal
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
  longDescription?: string;
};

const WinnersPage = () => {
  const { hackathon } = useParams<{ hackathon: string }>();
  const [winners, setWinners] = useState<ProjectCardData[]>([]);
  const [hackathonName, setHackathonName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectCardData | null>(null);
  const { toast } = useToast();

  const handleProjectClick = useCallback((project: ProjectCardData) => {
    setSelectedProject(project);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedProject(null);
  }, []);

  useEffect(() => {
    const loadWinners = async () => {
      if (!hackathon) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch winners for the specific hackathon
        const response = await api.getProjects({
          hackathonId: hackathon,
          winnersOnly: true,
          sortBy: "updatedAt",
          sortOrder: "desc",
          limit: 1000,
        });

        const apiProjects: ApiProject[] = Array.isArray(response?.data) ? response.data : [];
        
        // Get hackathon name from first project (if available)
        if (apiProjects.length > 0 && apiProjects[0].hackathon?.name) {
          setHackathonName(apiProjects[0].hackathon.name);
        } else {
          // Fallback: format the hackathon ID to a readable name
          const formatted = hackathon
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
          setHackathonName(formatted);
        }

        // Convert API projects to ProjectCard format
        const converted: ProjectCardData[] = apiProjects.map((p) => {
          const track = p.bountyPrize?.[0]?.name || 
                       (p.techStack?.[0] || "Winner");
          
          return {
            id: p.id,
            title: p.projectName,
            author: p.teamMembers?.[0]?.name || "",
            description: p.description,
            track: track,
            isWinner: true, // All are winners on this page
            demoUrl: p.demoUrl,
            githubUrl: p.projectRepo,
            projectUrl: p.id ? `/projects/${p.id}` : undefined,
            longDescription: p.description,
          };
        });

        setWinners(converted);
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

    loadWinners();
  }, [hackathon, toast]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container mx-auto px-4 pt-24 pb-16">
          <div className="mb-12">
            <div className="h-10 bg-muted animate-pulse rounded-md w-64 mb-2" />
            <div className="h-6 bg-muted animate-pulse rounded-md w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <ProjectCardSkeleton key={idx} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Format hackathon name for display (remove "Blockspace" if present, keep event name)
  const displayHackathonName = hackathonName.replace(/^Blockspace\s+/i, "");

  return (
    <div className="min-h-screen animate-fade-in">
      <Navigation />

      <div className="container mx-auto px-4 pt-24 pb-16">
        {/* Page Header */}
        <div className="mb-12">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2" asChild>
            <Link to="/">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Go Back Home
            </Link>
          </Button>

          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-2">
            {displayHackathonName} Winners
          </h1>
          <p className="text-accent text-lg">
            Congratulations to the winners of the {hackathonName} Hackathon!
          </p>
        </div>

        {/* Winners Section */}
        <section>
          <h2 className="font-heading text-2xl font-bold mb-6 flex items-center gap-2">
            <span>🏆</span>
            <span>Winners</span>
          </h2>

          {winners.length === 0 ? (
            <EmptyState
              title="No Winners Found"
              description="No winners have been announced for this hackathon yet."
              icon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {winners.map((project) => (
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
        </section>
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

export default WinnersPage;
