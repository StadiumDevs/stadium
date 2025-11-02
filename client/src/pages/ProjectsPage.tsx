import { useState, useEffect, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getProjectUrl, getCurrentProgramWeek } from "@/lib/projectUtils";

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
  m2Status?: 'building' | 'under_review' | 'completed';
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
  m2Status?: 'building' | 'under_review' | 'completed';
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState<LegacyProject[]>([]);
  const [loading, setLoading] = useState(true);
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
          m2Status: p.m2Status || 'building',
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

  // Filter projects by M2 status using useMemo for performance
  const buildingProjects = useMemo(() => {
    return projects.filter(p => {
      const status = p.m2Status?.toLowerCase();
      return status === 'building' || status === 'in_progress' || status === undefined;
    });
  }, [projects]);

  const underReviewProjects = useMemo(() => {
    return projects.filter(p => {
      const status = p.m2Status?.toLowerCase();
      return status === 'under_review' || status === 'reviewing';
    });
  }, [projects]);

  const completedProjects = useMemo(() => {
    return projects.filter(p => {
      const status = p.m2Status?.toLowerCase();
      return status === 'completed' || status === 'approved';
    });
  }, [projects]);

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

  const currentWeek = getCurrentProgramWeek();

  return (
    <div className="min-h-screen animate-fade-in">
      <Navigation />
      
      {/* M2 Accelerator Header Section */}
      <div className="container mx-auto px-4 pt-24 pb-6">
        <div className="glass-panel rounded-lg border-subtle p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <h1 className="font-heading text-4xl font-bold mb-2">M2 Accelerator - sub0 2025</h1>
              <p className="text-muted-foreground mb-2">
                4 teams building · 6-week program · $16k total prizes
              </p>
              <p className="text-sm text-muted-foreground">
                Current: {currentWeek.weekLabel}
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <Link 
                to="/m2-program-guide" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                View M2 Program Guide
              </Link>
              <Link 
                to="/mentor-resources" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
              >
                Mentor Resources
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 pb-16">
        {/* M2 Program Sections */}
        <div className="space-y-12">
          {/* Section 1: Building */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-heading text-2xl font-bold">🏗️ BUILDING (Weeks 1-4)</h2>
              <Badge variant="outline" className="bg-primary/10 border-primary text-accent">
                {buildingProjects.length} team{buildingProjects.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <p className="text-muted-foreground mb-6">
              Teams are working on their Milestone 2
            </p>
            {buildingProjects.length === 0 ? (
              <EmptyState
                title="All teams are in final review phase"
                description="All teams have completed their Milestone 2 and moved to review."
                icon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buildingProjects.map((project: LegacyProject) => (
                  <Card
                    key={project.id || project.projectName}
                    className="group hover:shadow-primary transition-all duration-300 animate-fade-in"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="group-hover:text-primary transition-colors text-lg">
                        {project.projectName}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {project.description}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0">
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link to={getProjectUrl(project)}>
                          Project Details
                          <ChevronRight className="h-3 w-3 ml-2" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Section 2: Under Review */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-heading text-2xl font-bold">⏳ UNDER REVIEW (Weeks 5-6)</h2>
              <Badge variant="outline" className="bg-orange-500/10 border-orange-500 text-orange-300">
                {underReviewProjects.length} team{underReviewProjects.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <p className="text-muted-foreground mb-6">
              Teams submitted final M2, awaiting approval
            </p>
            {underReviewProjects.length === 0 ? (
              <EmptyState
                title="No teams under review yet"
                description="Teams will appear here when they submit their final M2 in Weeks 5-6."
                icon={<Clock className="h-12 w-12 text-muted-foreground mx-auto" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {underReviewProjects.map((project: LegacyProject) => (
                  <Card
                    key={project.id || project.projectName}
                    className="group hover:shadow-primary transition-all duration-300 animate-fade-in"
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="group-hover:text-primary transition-colors text-lg">
                        {project.projectName}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {project.description}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-0">
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link to={getProjectUrl(project)}>
                          Project Details
                          <ChevronRight className="h-3 w-3 ml-2" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Section 3: M2 Graduates */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-heading text-2xl font-bold">✅ M2 GRADUATES</h2>
              <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500 text-yellow-300">
                {completedProjects.length} team{completedProjects.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <p className="text-muted-foreground mb-6">
              Congratulations to teams who completed the M2 program!
            </p>
            {completedProjects.length === 0 ? (
              <EmptyState
                title="No graduates yet"
                description="Completed teams will appear here after final approval and payment."
                icon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
              />
            ) : (
              <div className="bg-gradient-to-r from-purple-900/20 to-yellow-900/20 border-l-4 border-l-yellow-500 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedProjects.map((project: LegacyProject) => (
                    <Card
                      key={project.id || project.projectName}
                      className="group hover:shadow-primary transition-all duration-300 animate-fade-in"
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="group-hover:text-primary transition-colors text-lg">
                          {project.projectName}
                        </CardTitle>
                        <CardDescription className="line-clamp-3">
                          {project.description}
                        </CardDescription>
                      </CardHeader>
                      <CardFooter className="pt-0">
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <Link to={getProjectUrl(project)}>
                            Project Details
                            <ChevronRight className="h-3 w-3 ml-2" />
                          </Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Fallback: Show empty state if no projects at all */}
        {projects.length === 0 && !loading ? (
          <EmptyState
            title="No Projects Yet"
            description="Be the first to submit your hackathon project to the Stadium!"
            actionLabel="Submit Your Project"
            onAction={() => window.location.href = "/submission"}
            icon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
          />
        ) : null}
      </div>
    </div>
  );
};

export default ProjectsPage;
