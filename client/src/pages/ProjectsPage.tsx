import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ProjectCard } from "@/components/ProjectCard";
import { web3Enable, web3Accounts } from '@polkadot/extension-dapp';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { getProjectUrl, getCurrentProgramWeek } from "@/lib/projectUtils";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

type ApiProject = {
  id: string;
  projectName: string;
  description: string;
  teamMembers?: { name: string; walletAddress?: string }[];
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
  isWinner?: boolean;
  m2Status?: 'building' | 'under_review' | 'completed';
  lastUpdateDays?: number;
  teamMembers?: { name: string; walletAddress?: string }[];
};

// StatBadge component
interface StatBadgeProps {
  count: number;
  label: string;
  color: "green" | "yellow" | "blue" | "red";
  onClick?: () => void;
}

const StatBadge = ({ count, label, color, onClick }: StatBadgeProps) => {
  const colorClasses = {
    green: "border-l-green-500 bg-green-500/10 hover:bg-green-500/20",
    yellow: "border-l-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20",
    blue: "border-l-blue-500 bg-blue-500/10 hover:bg-blue-500/20",
    red: "border-l-red-500 bg-red-500/10 hover:bg-red-500/20",
  };

  return (
    <div
      className={cn(
        "rounded-lg border-l-4 p-3 transition-all duration-300 cursor-pointer hover:scale-105",
        colorClasses[color],
        onClick && "hover:shadow-md"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={onClick ? `Filter by ${label}` : undefined}
    >
      <div className="text-2xl font-bold font-heading">{count}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
};

const ProjectsPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<LegacyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
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
          teamMembers: p.teamMembers || [],
          githubRepo: p.projectRepo || "",
          demoUrl: p.demoUrl || "",
          slidesUrl: p.slidesUrl || "",
          donationAddress: p.donationAddress || "",
          // Winner string preserved from migration in bountyPrize[0].name
          winner: p.bountyPrize?.[0]?.name || "",
          isWinner: !!(p.bountyPrize && p.bountyPrize.length > 0),
          m2Status: p.m2Status || 'building',
          // Mock lastUpdateDays for stats calculation (would come from API in production)
          lastUpdateDays: Math.floor(Math.random() * 14), // 0-13 days
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

  // Connect wallet on mount and set connected address
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        // Try to enable extension first if not already enabled
        await web3Enable('Hackathonia');
        const accounts = await web3Accounts();
        if (accounts.length > 0) {
          // Use the first account if already connected
          setConnectedAddress(accounts[0].address);
        }
      } catch (error) {
        // Extension not available or not authorized
        console.log('Wallet not connected:', error);
        setConnectedAddress(null);
      }
    };

    // Try to get connected wallet
    checkWalletConnection();

    // Listen for account changes periodically
    const interval = setInterval(checkWalletConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate program stats using useMemo
  const stats = useMemo(() => {
    const building = projects.filter(p => p.m2Status === 'building').length;
    const underReview = projects.filter(p => p.m2Status === 'under_review').length;
    const completed = projects.filter(p => p.m2Status === 'completed').length;

    return {
      building,
      underReview,
      completed,
    };
  }, [projects]);

  // Apply filters to projects using useMemo
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply view filter
    if (viewFilter === 'my-teams') {
      // Filter projects where connected wallet address matches any team member's walletAddress
      if (connectedAddress) {
        const addressLower = connectedAddress.toLowerCase();
        filtered = filtered.filter(p => {
          return p.teamMembers?.some(
            member => member.walletAddress?.toLowerCase() === addressLower
          ) ?? false;
        });
      } else {
        // If no wallet connected, show no results
        filtered = [];
      }
    } else if (viewFilter === 'my-mentored') {
      // TODO: Filter by current user's mentored teams when auth is implemented
      filtered = filtered.filter(p => false); // Placeholder
    }

    // Apply status filter
    if (statusFilter === 'building') {
      filtered = filtered.filter(p => p.m2Status === 'building');
    } else if (statusFilter === 'under-review') {
      filtered = filtered.filter(p => p.m2Status === 'under_review');
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter(p => p.m2Status === 'completed');
    }

    // Apply active filter from stat badge click
    if (activeFilter === 'building') {
      filtered = filtered.filter(p => p.m2Status === 'building');
    } else if (activeFilter === 'under-review') {
      filtered = filtered.filter(p => p.m2Status === 'under_review');
    } else if (activeFilter === 'completed') {
      filtered = filtered.filter(p => p.m2Status === 'completed');
    }

    // Apply sorting
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.projectName.localeCompare(b.projectName));
    } else if (sortBy === 'status') {
      // Sort by M2 status: building -> under_review -> completed
      const statusOrder = { building: 0, under_review: 1, completed: 2 };
      filtered.sort((a, b) => {
        const aStatus = a.m2Status || 'building';
        const bStatus = b.m2Status || 'building';
        const aOrder = statusOrder[aStatus as keyof typeof statusOrder] ?? 0;
        const bOrder = statusOrder[bStatus as keyof typeof statusOrder] ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.projectName.localeCompare(b.projectName);
      });
    }

    return filtered;
  }, [projects, viewFilter, statusFilter, sortBy, activeFilter, connectedAddress]);

  // Filter projects by M2 status using useMemo for performance
  const buildingProjects = useMemo(() => {
    return filteredProjects.filter(p => p.isWinner && p.m2Status === 'building');
  }, [filteredProjects]);

  const reviewProjects = useMemo(() => {
    return filteredProjects.filter(p => p.m2Status === 'under_review');
  }, [filteredProjects]);

  // M2 Graduates should always show all completed projects, regardless of filters
  const completedProjects = useMemo(() => {
    return projects.filter(p => p.m2Status === 'completed');
  }, [projects]);

  // Handle stat badge click filter
  const applyFilter = useCallback((filterType: string) => {
    setActiveFilter(prev => prev === filterType ? null : filterType);
    // Also update status filter to match
    if (filterType === 'building' || filterType === 'under-review' || filterType === 'completed') {
      setStatusFilter(filterType);
    }
  }, []);

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
        <div className="glass-panel rounded-lg border-subtle p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <h1 className="font-display text-4xl font-bold mb-2">M2 Accelerator Program</h1>
              <p className="text-muted-foreground mb-2">
                An overview of all projects in the M2 Accelerator Program.
              </p>
              <p className="text-sm text-muted-foreground">
                Teams admitted to the program must confirm their milestone 2 plans. Once confirmed, each team is assigned specific mentors according to the support they need.
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

        {/* Program Stats Section */}
        <div className="glass-panel rounded-lg border-subtle p-4 mb-6">
          <h3 className="text-sm font-medium mb-3 font-heading">📊 Program Stats:</h3>
          <div className="flex flex-wrap gap-4">
            <StatBadge 
              count={stats.building} 
              label="building" 
              color="blue"
              onClick={() => applyFilter('building')}
            />
            <StatBadge 
              count={stats.underReview} 
              label="under review" 
              color="yellow"
              onClick={() => applyFilter('under-review')}
            />
            <StatBadge 
              count={stats.completed} 
              label="completed" 
              color="green"
              onClick={() => applyFilter('completed')}
            />
          </div>
        </div>
      </div>

      <div className="container px-4 pb-16">
        {/* Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select value={viewFilter} onValueChange={setViewFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="View as:" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem value="my-teams">My Teams</SelectItem>
              <SelectItem value="my-mentored">Teams I Mentor</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => {
            setStatusFilter(value);
            setActiveFilter(value !== 'all' ? value : null);
          }}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Status:" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="building">Building</SelectItem>
              <SelectItem value="under-review">Under Review</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Sort by:" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          {activeFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveFilter(null);
                setStatusFilter('all');
              }}
              className="md:ml-auto"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* M2 Program Sections */}
        <div className="space-y-12">
          {/* Section 1: Building */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-heading flex items-center gap-2">
                  🏗️ Building (Weeks 1-4)
                  <Badge variant="secondary">{buildingProjects.length} teams</Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Teams are working on their Milestone 2
                </p>
              </div>
            </div>
            
            {buildingProjects.length === 0 ? (
              <EmptyState
                title="All teams are in final review phase"
                description="All teams have completed their Milestone 2 and moved to review."
                icon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buildingProjects.map((project: LegacyProject) => (
                  <ProjectCard
                    key={project.id || project.projectName}
                    title={project.projectName}
                    author={project.teamLead}
                    description={project.description}
                    track={project.winner || "Building"}
                    isWinner={!!project.winner}
                    demoUrl={project.demoUrl}
                    githubUrl={project.githubRepo}
                    projectUrl={getProjectUrl(project)}
                    onClick={() => navigate(getProjectUrl(project))}
                    showM2Progress={true}
                    m2Status="building"
                    m2Week={currentWeek.weekNumber}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Section 2: Under Review */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-heading flex items-center gap-2">
                  ⏳ Under Review (Weeks 5-6)
                  <Badge variant="secondary">{reviewProjects.length} teams</Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Teams submitted final M2, awaiting approval
                </p>
              </div>
            </div>
            
            {reviewProjects.length === 0 ? (
              <EmptyState
                title="No teams under review yet. Teams will appear here when they submit their final M2 in Weeks 5-6."
                description=""
                icon={<Clock className="h-12 w-12 text-muted-foreground mx-auto" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reviewProjects.map((project: LegacyProject) => (
                  <ProjectCard
                    key={project.id || project.projectName}
                    title={project.projectName}
                    author={project.teamLead}
                    description={project.description}
                    track={project.winner || "Under Review"}
                    isWinner={!!project.winner}
                    demoUrl={project.demoUrl}
                    githubUrl={project.githubRepo}
                    projectUrl={getProjectUrl(project)}
                    onClick={() => navigate(getProjectUrl(project))}
                    showM2Progress={true}
                    m2Status="under_review"
                    submittedDate={new Date().toISOString()}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Section 3: M2 Graduates - Featured Section */}
          <div className="bg-gradient-to-r from-purple-900/20 to-yellow-900/20 border-l-4 border-l-yellow-500 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-heading flex items-center gap-2">
                  ✅ M2 Graduates
                  <Badge className="bg-yellow-500 text-black">{completedProjects.length} teams</Badge>
                </h2>
                <p className="text-sm text-muted-foreground">
                  Congratulations to teams who completed the M2 program!
                </p>
              </div>
            </div>
            
            {completedProjects.length === 0 ? (
              <EmptyState
                title="No graduates yet. Completed teams will appear here after final approval and payment."
                description=""
                icon={<Trophy className="h-12 w-12 text-muted-foreground mx-auto" />}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedProjects.map((project: LegacyProject) => (
                  <ProjectCard
                    key={project.id || project.projectName}
                    title={project.projectName}
                    author={project.teamLead}
                    description={project.description}
                    track={project.winner || "Completed"}
                    isWinner={!!project.winner}
                    demoUrl={project.demoUrl}
                    githubUrl={project.githubRepo}
                    projectUrl={getProjectUrl(project)}
                    onClick={() => navigate(getProjectUrl(project))}
                    showM2Progress={true}
                    m2Status="completed"
                    className="border-yellow-500/30"
                    completionDate={new Date().toISOString()}
                  />
                ))}
              </div>
            )}
          </div>
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
