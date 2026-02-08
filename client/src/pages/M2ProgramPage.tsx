import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ProjectCardSkeleton } from "@/components/ProjectCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { ProjectCard } from "@/components/ProjectCard";
import { M2StatusOverview } from "@/components/M2StatusOverview";
import { M2ProgramGuideModal } from "@/components/M2ProgramGuideModal";
import { M2ProjectTable } from "@/components/M2ProjectTable";
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
  Search,
  LayoutGrid,
  Table as TableIcon,
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api, type ApiProject } from "@/lib/api";
import { getProjectUrl, getCurrentProgramWeek } from "@/lib/projectUtils";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

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
  m2Status?: "building" | "under_review" | "completed";
  completionDate?: string;
  lastUpdateDays?: number;
  teamMembers?: { name: string; walletAddress?: string }[];
  totalPaid?: Array<{
    milestone: "M1" | "M2";
    amount: number;
    currency: "USDC" | "DOT";
    transactionProof: string;
  }>;
};

const M2ProgramPage = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<LegacyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isM2GuideOpen, setIsM2GuideOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const { toast } = useToast();


  useEffect(() => {
    const loadProjects = async () => {
      try {
        // Query backend API and log response (for mapping step)
        // Load only main track winners (M2 program is for main track winners only)
        const response = await api.getProjects({
          winnersOnly: true,
          mainTrackOnly: true,
          sortBy: "updatedAt",
          sortOrder: "desc",
          limit: 1000,
        });
        console.log("[M2ProgramPage] GET /api/m2-program response:", response);

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
          winner: p.bountyPrize?.[0]?.name || "",
          isWinner: !!(p.bountyPrize && p.bountyPrize.length > 0),
          m2Status: p.m2Status || "building",
          completionDate: p.completionDate,
          totalPaid: p.totalPaid as LegacyProject["totalPaid"],
          lastUpdateDays: Math.floor(Math.random() * 14),
        }));

        console.log("[ProjectsPage] Mapped projects count:", mapped.length);
        setProjects(mapped);
      } catch (error) {
        console.error("[ProjectsPage] failed to load API projects:", error);
        console.error("[ProjectsPage] Error details:", {
          message: (error as Error)?.message,
          stack: (error as Error)?.stack,
          name: (error as Error)?.name
        });
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

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.projectName.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.teamMembers?.some(m => 
          m.name.toLowerCase().includes(query)
        )
      );
    }

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
  }, [projects, viewFilter, statusFilter, sortBy, activeFilter, connectedAddress, searchQuery]);

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

  // Group filtered projects by status for sectioned display
  const groupedProjects = useMemo(() => {
    return {
      building: filteredProjects.filter(p => p.m2Status === 'building'),
      underReview: filteredProjects.filter(p => p.m2Status === 'under_review'),
      completed: filteredProjects.filter(p => p.m2Status === 'completed'),
    };
  }, [filteredProjects]);

  // Handle stat card click filter
  const handleStatusFilterClick = useCallback((status: 'building' | 'under_review' | 'completed' | null) => {
    if (status === null) {
      setActiveFilter(null);
      setStatusFilter('all');
    } else {
      const filterValue = status === 'under_review' ? 'under-review' : status;
      setActiveFilter(filterValue);
      setStatusFilter(filterValue);
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
      
      {/* M2 Incubator Header Section */}
      <div className="container mx-auto px-4 pt-24 pb-6">
        <div className="glass-panel rounded-lg border-subtle p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row justify-between gap-6">
            <div className="flex-1">
              <h1 className="font-display text-4xl font-bold mb-2">Program Overview</h1>
              <p className="text-muted-foreground mb-2">
                An overview of all projects in the M2 Incubator Program.
              </p>
              <p className="text-sm text-muted-foreground">
                Teams admitted to the program must confirm their milestone 2 plans. Once confirmed, each team is assigned specific mentors according to the support they need.
              </p>
            </div>
            <div className="flex flex-col gap-2 md:items-end">
              <button 
                onClick={() => setIsM2GuideOpen(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline text-right"
              >
                What's the M2 Program About?
              </button>
            </div>
          </div>
        </div>

        {/* Program Stats Overview - NEW */}
        <M2StatusOverview
          buildingCount={stats.building}
          underReviewCount={stats.underReview}
          graduatesCount={stats.completed}
          onFilterClick={handleStatusFilterClick}
          activeFilter={activeFilter}
        />
      </div>

      <div className="container px-4 pb-16">
        {/* Search and Filter Controls */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search and Filters Group */}
              <div className="flex-1 flex flex-col md:flex-row gap-4">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects or team members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* View Filter */}
                <Select value={viewFilter} onValueChange={setViewFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="View as:" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    <SelectItem value="my-teams">My Teams</SelectItem>
                    <SelectItem value="my-mentored">Teams I Mentor</SelectItem>
                  </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={(value) => {
                  setStatusFilter(value);
                  setActiveFilter(value !== 'all' ? value : null);
                }}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status:" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="building">🔨 Building</SelectItem>
                    <SelectItem value="under-review">⏳ Under Review</SelectItem>
                    <SelectItem value="completed">✅ Completed</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Sort by:" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name (A-Z)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Right Side: View Toggle and Clear */}
              <div className="flex gap-2 items-center justify-between md:justify-end">
                {/* View Mode Toggle */}
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'cards' | 'table')}>
                  <TabsList>
                    <TabsTrigger value="table" className="gap-2">
                      <TableIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Table</span>
                    </TabsTrigger>
                    <TabsTrigger value="cards" className="gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      <span className="hidden sm:inline">Cards</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Clear Filters Button */}
                {(activeFilter || searchQuery) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveFilter(null);
                      setStatusFilter('all');
                      setSearchQuery('');
                    }}
                    className="whitespace-nowrap"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conditional View: Table or Cards */}
        {viewMode === 'table' ? (
          /* Table View - Show grouped sections by status */
          <div className="space-y-8">
            {/* Building Section */}
            {groupedProjects.building.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg">🔨</span>
                    </div>
                    <h2 className="text-2xl font-bold font-heading">
                      Building
                    </h2>
                  </div>
                  <Separator className="flex-1" />
                  <span className="text-sm text-muted-foreground">
                    {groupedProjects.building.length} {groupedProjects.building.length === 1 ? 'team' : 'teams'}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Teams are working on their M2 deliverables (Weeks 1-4)
                </p>
                
                <M2ProjectTable projects={groupedProjects.building} />
              </section>
            )}
            
            {/* Under Review Section */}
            {groupedProjects.underReview.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <span className="text-lg">⏳</span>
                    </div>
                    <h2 className="text-2xl font-bold font-heading">
                      Under Review
                    </h2>
                  </div>
                  <Separator className="flex-1" />
                  <span className="text-sm text-muted-foreground">
                    {groupedProjects.underReview.length} {groupedProjects.underReview.length === 1 ? 'team' : 'teams'}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Submissions are being reviewed by WebZero (Weeks 5-6)
                </p>
                
                <M2ProjectTable projects={groupedProjects.underReview} />
              </section>
            )}
            
            {/* M2 Graduates Section */}
            {groupedProjects.completed.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <span className="text-lg">✅</span>
                    </div>
                    <h2 className="text-2xl font-bold font-heading">
                      M2 Graduates
                    </h2>
                  </div>
                  <Separator className="flex-1" />
                  <span className="text-sm text-muted-foreground">
                    {groupedProjects.completed.length} {groupedProjects.completed.length === 1 ? 'team' : 'teams'}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  Congratulations to teams who completed the M2 incubator! 🎉
                </p>
                
                {/* Graduates always show as special cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedProjects.completed.map((project: LegacyProject) => (
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
                      completionDate={project.completionDate}
                      totalPaid={project.totalPaid}
                    />
                  ))}
                </div>
              </section>
            )}
            
            {/* Empty State */}
            {filteredProjects.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center space-y-2">
                  <p className="text-lg font-semibold">No projects found</p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your filters or search query
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Card View - Show existing three-section layout */
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
                    totalPaid={project.totalPaid}
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
                    totalPaid={project.totalPaid}
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
                    completionDate={project.completionDate}
                    totalPaid={project.totalPaid}
                  />
                ))}
              </div>
            )}
          </div>
          </div>
        )}

      </div>

      {/* M2 Program Guide Modal */}
      <M2ProgramGuideModal 
        open={isM2GuideOpen}
        onOpenChange={setIsM2GuideOpen}
      />
    </div>
  );
};

export default M2ProgramPage;
