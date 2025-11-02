import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Github,
  Globe,
  Trophy,
  Users,
  ChevronRight,
  Loader2,
  ChevronLeft,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getProjectUrl } from "@/lib/projectUtils";

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
};

type LegacyProject = {
  id?: string;
  projectName: string;
  teamLead: string;
  description: string;
  githubRepo?: string;
  demoUrl?: string;
  slidesUrl?: string;
  donationAddress?: string;
  winner?: string;
};

const PROJECTS_PER_PAGE = 9;

const ProjectsPage = () => {
  const [projects, setProjects] = useState<LegacyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();


  useEffect(() => {
    const loadProjects = async () => {
      try {
        // Query backend API and log response (for mapping step)
        const response = await api.getProjects({
          hackathonId: "synergy-2025",
          winnersOnly: true,
          sortBy: "updatedAt",
          sortOrder: "desc",
          limit: 1000,
        });
        console.log("[ProjectsPage] GET /api/projects response:", response);

        // Map API response to legacy JSON shape expected by UI
        const apiProjects = Array.isArray(response?.data) ? response.data : [];
        const mapped = apiProjects.map((p: ApiProject) => ({
          id: p.id,
          projectName: p.projectName,
          description: p.description,
          teamLead: p.teamMembers?.[0]?.name || "",
          githubRepo: p.projectRepo || "",
          demoUrl: p.demoUrl || "",
          slidesUrl: p.slidesUrl || "",
          donationAddress: p.donationAddress || "",
          // Winner string preserved from migration in bountyPrize[0].name
          winner: p.bountyPrize?.[0]?.name || "",
        }));

        setProjects(mapped);
      } catch (error) {
        console.error("[ProjectsPage] failed to load API projects:", error);
        setProjects([]);
        const err = error as Error;
        toast({
          title: "Error",
          description: err?.message || "Failed to load latest projects from server.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [toast]);



  // Pagination logic
  const totalPages = Math.ceil(projects.length / PROJECTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
  const endIndex = startIndex + PROJECTS_PER_PAGE;
  const currentProjects = projects.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container py-8 pt-24">
          <div className="mb-8">
            <div className="h-10 bg-muted animate-pulse rounded-md w-64 mb-4" />
            <div className="h-6 bg-muted animate-pulse rounded-md w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <ProjectCardSkeleton key={idx} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-fade-in">
      <Navigation />
      <div className="container py-8 pt-24">
        {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="flex items-center space-x-2">
              <ChevronLeft className="h-4 w-4" />
              <span>Go Back Home</span>
            </Link>
          </Button>
        </div>
        <h1 className="font-heading text-4xl font-bold mb-2">Synergy 2025 Winners</h1>
        <p className="text-muted-foreground">
          Congratulations to the winners of the Blockspace Synergy Hackathon 2025!
        </p>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <EmptyState
          title="No Projects Yet"
          description="Be the first to submit your hackathon project to the Stadium!"
          actionLabel="Submit Your Project"
          onAction={() => window.location.href = "/submission"}
          icon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
        />
      ) : (
        <>
          {/* HARDCODED: Demo layout showing one project for each status type */}
          <div className="space-y-8">
            {/* Winners Section */}
            <div>
              <h2 className="font-heading text-2xl font-bold mb-4 text-black flex items-center">
                <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
                Winners
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {currentProjects.length > 0 ? (
                  (() => {
                    // Separate Polkadot and Kusama winners
                    const polkadotWinners = currentProjects.filter((project: LegacyProject) => 
                      project.winner?.toLowerCase().includes('polkadot')
                    );
                    const kusamaWinners = currentProjects.filter((project: LegacyProject) => 
                      project.winner?.toLowerCase().includes('kusama')
                    );
                    
                    // Combine: Polkadot first, then Kusama
                    const sortedProjects = [...polkadotWinners, ...kusamaWinners];
                    
                    return sortedProjects.map((project: LegacyProject, index: number) => (
                      <Card
                        key={project.projectName}
                        className="group hover:shadow-primary transition-all duration-300 animate-fade-in flex flex-col justify-between"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex flex-col gap-1">
                              {/* Remove Badge from here */}
                            </div>
                            <Trophy className="h-4 w-4 text-yellow-500" />
                          </div>
                          <CardTitle className="group-hover:text-primary transition-colors text-sm">
                            {project.projectName}
                          </CardTitle>
                          <CardDescription className="line-clamp-6 project-card-info text-xs">
                            {project.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0 pb-2">
                          <div className="space-y-2">
                            <div className="flex flex-wrap gap-1">
                              {/* Remove Badge from here if present */}
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0 pb-2 flex items-end mt-auto">
                          {/* Winner Badge at bottom left */}
                          <Badge
                            className={
                              project.winner?.toLowerCase().includes('kusama')
                                ? 'bg-purple-600/20 text-purple-300 border-purple-600/30'
                                : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            }
                            variant="secondary"
                          >
                            🏆 {project.winner
                              ? project.winner
                                  .split(' ')
                                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                  .join(' ')
                              : ''}
                          </Badge>
                          <div className="flex-1" />
                          <Button asChild size="sm" className="text-[10px] px-2 py-1">
                            <Link
                              to={getProjectUrl(project)}
                              className="flex items-center space-x-1"
                            >
                              <span>Details</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </Button>
                          {project.githubRepo && (
                            <Button size="icon" variant="outline" asChild className="h-6 w-6 p-0 min-w-0 ml-1">
                              <a
                                href={project.githubRepo}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View on GitHub"
                              >
                                <Github className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                          {(project.demoUrl || project.slidesUrl) && (
                            <Button size="icon" variant="outline" asChild className="h-6 w-6 p-0 min-w-0 ml-1">
                              <a
                                href={project.demoUrl || project.slidesUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="View Demo"
                              >
                                <Globe className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    ));
                  })()
                ) : (
                  <div className="col-span-full">
                    <EmptyState
                      title="No Winners Yet"
                      description="No projects have been selected as winners yet."
                      icon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Pending Milestone Delivery Section */}
            <div>
              <h2 className="font-heading text-2xl font-bold mb-4 text-black flex items-center">
                <Clock className="h-6 w-6 mr-2 text-gray-500" />
                Pending Milestone Delivery
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {currentProjects
                  .filter((project: LegacyProject) => !project.winner || project.winner === "")
                  .slice(0, 3)
                  .length > 0 ? (
                  currentProjects
                    .filter((project: LegacyProject) => !project.winner || project.winner === "")
                    .slice(0, 3)
                    .map((project: LegacyProject, index: number) => (
                      <Card
                        key={project.projectName}
                        className="group hover:shadow-primary transition-all duration-300 animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <Badge
                              className="bg-purple-400/20 text-purple-200 border-purple-400/30"
                              variant="secondary"
                            >
                              Pending
                            </Badge>
                          </div>
                          <CardTitle className="group-hover:text-primary transition-colors text-lg">
                            {project.projectName}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="pt-0 pb-3">
                          {/* Team name removed */}
                        </CardContent>

                        <CardFooter className="pt-0">
                          <Button asChild size="sm" variant="outline" className="w-full text-xs">
                            <Link
                              to={getProjectUrl(project)}
                              className="flex items-center justify-center space-x-1"
                            >
                              <span>Project Details</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                ) : (
                  <Card className="text-center py-8 col-span-full">
                    <CardContent>
                      <Clock className="h-12 w-12 text-white bg-white/10 rounded-full mx-auto mb-4" />
                      <h3 className="font-heading text-lg font-semibold mb-2 text-white">No Pending Projects</h3>
                      <p className="text-white">
                        No projects are currently pending milestone delivery.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Under Review Section */}
            <div>
              <h2 className="font-heading text-2xl font-bold mb-4 text-black flex items-center">
                <AlertCircle className="h-6 w-6 mr-2 text-gray-500" />
                Under Review
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {currentProjects
                  .filter((project: LegacyProject) => !project.winner || project.winner === "")
                  .slice(3, 6)
                  .length > 0 ? (
                  currentProjects
                    .filter((project: LegacyProject) => !project.winner || project.winner === "")
                    .slice(3, 6)
                    .map((project: LegacyProject, index: number) => (
                      <Card
                        key={project.projectName}
                        className="group hover:shadow-primary transition-all duration-300 animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <Badge
                              className="bg-orange-500/20 text-orange-300 border-orange-500/30"
                              variant="secondary"
                            >
                              Under Review
                            </Badge>
                          </div>
                          <CardTitle className="group-hover:text-primary transition-colors text-lg">
                            {project.projectName}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="pt-0 pb-3">
                          {/* Team name removed */}
                        </CardContent>

                        <CardFooter className="pt-0">
                          <Button asChild size="sm" variant="outline" className="w-full text-xs">
                            <Link
                              to={getProjectUrl(project)}
                              className="flex items-center justify-center space-x-1"
                            >
                              <span>Project Details</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                ) : (
                  <Card className="text-center py-8 col-span-full">
                    <CardContent>
                      <AlertCircle className="h-12 w-12 text-white bg-white/10 rounded-full mx-auto mb-4" />
                      <h3 className="font-heading text-lg font-semibold mb-2 text-white">No Projects Under Review</h3>
                      <p className="text-white">
                        No projects are currently under review.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      handlePageChange(Math.max(1, currentPage - 1))
                    }
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      handlePageChange(Math.min(totalPages, currentPage + 1))
                    }
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
      </div>
    </div>
  );
};

export default ProjectsPage;
