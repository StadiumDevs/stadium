import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import {
  Shield,
  Loader2,
  LogOut,
  Wallet,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { useMemo } from "react";
import { isAdmin, ADMIN_ADDRESSES } from "@/lib/constants";
import { M2ProjectsTable } from "@/components/admin/M2ProjectsTable";
import { WinnersTable } from "@/components/admin/WinnersTable";
import { ConfirmPaymentModal } from "@/components/admin/ConfirmPaymentModal";
import { ConfirmM1PayoutModal } from "@/components/admin/ConfirmM1PayoutModal";
import { TestPaymentModal } from "@/components/admin/TestPaymentModal";

const formatAddress = (address = "") =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

type M2Project = Project & {
  projectName: string;
  teamMembers?: Array<{
    name: string;
    walletAddress?: string;
    role?: string;
    twitter?: string;
    github?: string;
    linkedin?: string;
  }>;
  m2Status?: 'building' | 'under_review' | 'completed';
  finalSubmission?: {
    repoUrl: string;
    demoUrl: string;
    docsUrl: string;
    summary?: string;
    submittedDate: string;
  };
  submittedDate?: string;
};

const AdminPage = () => {
  // TESTING MODE: Bypass wallet connection check
  const BYPASS_ADMIN_CHECK = true; // Set to false to re-enable wallet check
  
  const [walletState, setWalletState] = useState({
    isExtensionAvailable: false,
    isConnected: false,
    isConnecting: false,
    accounts: [],
    selectedAccount: null,
    error: "",
    injector: null,
  });

  const [isAuthenticated, setIsAuthenticated] = useState(BYPASS_ADMIN_CHECK);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showM1PayoutModal, setShowM1PayoutModal] = useState(false);
  const [showTestPaymentModal, setShowTestPaymentModal] = useState(false);
  const [sortBy, setSortBy] = useState<'eventStartedAt' | 'projectName' | 'newest'>('eventStartedAt');
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch ALL projects from MongoDB via API (no pagination)
      const response = await api.getProjects({ limit: 1000 });
      console.log('[AdminPage] API response:', response);
      
      // Extract projects from response.data
      const projectsData = response?.data || [];
      console.log('[AdminPage] Loaded projects from DB:', projectsData.length, 'projects');
      console.log('[AdminPage] Sample project:', projectsData[0]);
      
      setProjects(projectsData);
    } catch (error) {
      const err = error as Error;
      console.error('[AdminPage] Failed to load data:', error);
      toast({
        title: "Error",
        description: err?.message || "Failed to load admin data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // TESTING MODE: Skip wallet check and directly load data
    if (BYPASS_ADMIN_CHECK) {
      loadData();
      return;
    }

    checkExtension();

    // Restore session if admin account exists in sessionStorage
    const sessionAccount = sessionStorage.getItem("admin_session_account");
    if (sessionAccount) {
      const account = JSON.parse(sessionAccount);
      if (isAdmin(account.address)) {
        setWalletState((prev) => ({
          ...prev,
          selectedAccount: account,
          isConnected: true,
        }));
        setIsAuthenticated(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isAuthenticated && !BYPASS_ADMIN_CHECK) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, projects]);

  const checkExtension = async () => {
    try {
      await waitForExtension();
      setWalletState((prev) => ({
        ...prev,
        isExtensionAvailable: true,
        error: "",
      }));
    } catch {
      setWalletState((prev) => ({
        ...prev,
        isExtensionAvailable: false,
        error: "Polkadot-JS extension not found. Please install it first.",
      }));
    }
  };

  const waitForExtension = () =>
    new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 10;
      const interval = setInterval(() => {
        if (
          window.injectedWeb3 &&
          Object.keys(window.injectedWeb3).length > 0
        ) {
          clearInterval(interval);
          resolve();
        } else if (++attempts >= maxAttempts) {
          clearInterval(interval);
          reject();
        }
      }, 500);
    });

  const connectWallet = async () => {
    if (!walletState.isExtensionAvailable) return;

    setWalletState((prev) => ({ ...prev, isConnecting: true, error: "" }));

    try {
      const { web3Enable, web3Accounts } = await import(
        "@polkadot/extension-dapp"
      );
      const extensions = await web3Enable("Hackathonia Admin");
      if (!extensions.length)
        throw new Error("No extension authorization given.");

      const allAccounts = await web3Accounts();
      if (!allAccounts.length)
        throw new Error("No accounts found in extension.");

      // Debug: Log available accounts
      console.log('[AdminPage] Available accounts:', allAccounts.map(a => ({
        name: a.meta.name,
        address: a.address
      })));

      // Check if admin account is available
      const adminAccount = allAccounts.find(
        (account) => isAdmin(account.address)
      );

      if (!adminAccount) {
        const availableAddresses = allAccounts.map(a => a.address).join(', ');
        console.error('[AdminPage] No admin account found. Available addresses:', availableAddresses);
        console.error('[AdminPage] Admin addresses from env:', ADMIN_ADDRESSES);
        throw new Error(
          `Admin account not found. Please ensure you have the correct admin account in your wallet.\n\nYour wallet addresses: ${allAccounts.map(a => a.address).join(', ')}\n\nExpected admin addresses: ${ADMIN_ADDRESSES.join(', ')}\n\nAdd one of your addresses to the VITE_ADMIN_ADDRESSES in .env file and restart the dev server.`
        );
      }

      setWalletState((prev) => ({
        ...prev,
        accounts: allAccounts,
        isConnected: true,
        isConnecting: false,
      }));

      // Auto-select admin account
      selectAccount(adminAccount);
    } catch (err) {
      setWalletState((prev) => ({
        ...prev,
        error: `Connection failed: ${err.message}`,
        isConnecting: false,
      }));
    }
  };

  const selectAccount = async (account) => {
    try {
      if (!isAdmin(account.address)) {
        throw new Error(
          "Unauthorized: Only admin account can access this panel."
        );
      }

      const { web3FromSource } = await import("@polkadot/extension-dapp");
      const injector = await web3FromSource(account.meta.source);

      sessionStorage.setItem("admin_session_account", JSON.stringify(account));

      setWalletState((prev) => ({
        ...prev,
        selectedAccount: account,
        injector,
      }));
      setIsAuthenticated(true);

      toast({
        title: "Admin Access Granted",
        description: "Successfully connected as admin.",
      });
    } catch (err) {
      setWalletState((prev) => ({
        ...prev,
        error: `Authentication failed: ${err.message}`,
      }));
    }
  };

  const handlePaymentClick = (project: any) => {
    // Dollar sign button in table opens M1 payout modal
    setSelectedProject(project);
    setShowM1PayoutModal(true);
  };

  const handleConfirmM1Payout = async (data: any) => {
    if (!selectedProject) return;

    try {
      console.log('[AdminPage] Confirming M1 payout for project:', selectedProject.id);
      console.log('[AdminPage] M1 payout data:', data);

      const response = await fetch(`/api/m2-program/${selectedProject.id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      console.log('[AdminPage] Response status:', response.status);

      const responseText = await response.text();
      console.log('[AdminPage] Response text:', responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to confirm M1 payout';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "M1 Payout Confirmed",
        description: `Payment distributed to ${data.recipients.length} team members`,
      });

      // Reload data
      await loadData();
      setShowM1PayoutModal(false);
    } catch (error: any) {
      console.error('[AdminPage] M1 payout confirmation error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to confirm M1 payout',
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleConfirmPayment = async (data: any) => {
    if (!selectedProject) return;

    try {
      console.log('[AdminPage] Confirming payment for project:', selectedProject.id);
      console.log('[AdminPage] Payment data:', data);

      const response = await fetch(`/api/m2-program/${selectedProject.id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      console.log('[AdminPage] Response status:', response.status);
      console.log('[AdminPage] Response ok:', response.ok);

      // Try to get response text first
      const responseText = await response.text();
      console.log('[AdminPage] Response text:', responseText);

      if (!response.ok) {
        let errorMessage = 'Failed to confirm payment';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use the text as error message
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      toast({
        title: "Payment Confirmed",
        description: `${data.milestone} payment recorded successfully`,
      });

      // Reload data
      await loadData();
      setShowPayoutModal(false);
    } catch (error: any) {
      console.error('[AdminPage] Payment confirmation error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to confirm payment',
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleLogout = () => {
    setWalletState({
      isExtensionAvailable: true,
      isConnected: false,
      isConnecting: false,
      accounts: [],
      selectedAccount: null,
      error: "",
      injector: null,
    });
    setIsAuthenticated(false);
    sessionStorage.removeItem("admin_session_account");
  };

  // Filter projects under review for M2
  const projectsUnderReview = useMemo(() => {
    return projects.filter((p) => p.m2Status === 'under_review');
  }, [projects]);

  // Filter M2 projects
  const m2Projects = useMemo(() => 
    projects.filter(p => p.m2Status),
    [projects]
  );

  // Sort projects based on selected sort option
  const sortedProjects = useMemo(() => {
    const projectsCopy = [...projects];
    
    switch (sortBy) {
      case 'eventStartedAt':
        return projectsCopy.sort((a, b) => {
          const dateA = a.hackathon?.eventStartedAt ? new Date(a.hackathon.eventStartedAt).getTime() : 0;
          const dateB = b.hackathon?.eventStartedAt ? new Date(b.hackathon.eventStartedAt).getTime() : 0;
          return dateB - dateA; // Newest first
        });
      case 'projectName':
        return projectsCopy.sort((a, b) => 
          (a.projectName || '').localeCompare(b.projectName || '')
        );
      case 'newest':
        return projectsCopy.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // Newest first
        });
      default:
        return projectsCopy;
    }
  }, [projects, sortBy]);

  // Handle M2 approval
  const handleApproveM2 = async (projectId: string) => {
    if (!confirm('This will mark M2 as complete and initiate $2,000 payment. Continue?')) {
      return;
    }

    try {
      await api.webzeroApprove(projectId);
      
      // Update local state
      setProjects((prev) =>
        prev.map((p) => 
          p.id === projectId 
            ? { ...p, m2Status: 'completed' as const }
            : p
        )
      );

      toast({
        title: "M2 Approved!",
        description: "Payment will be processed.",
      });
      
      loadData();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Failed to approve M2",
        description: err?.message || "Failed to approve M2. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle M2 status change
  const handleM2StatusChange = async (projectId: string, newStatus: 'building' | 'under_review' | 'completed') => {
    const statusLabels = {
      building: 'Building',
      under_review: 'Under Review',
      completed: 'Completed (ready for payment)'
    };
    
    if (!confirm(`Change project status to ${statusLabels[newStatus]}?`)) {
      return;
    }
    
    try {
      await api.updateProjectStatus(projectId, newStatus);
      
      toast({
        title: 'Status Updated',
        description: `Status updated to ${statusLabels[newStatus]}`,
      });
      
      // Refresh projects list
      await loadData();
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Failed to update status',
        description: err?.message || 'An error occurred',
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent>
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-heading text-2xl font-bold mb-2">Admin Access Required</h1>
            <p className="text-muted-foreground mb-6">
              Connect your admin wallet to access the management panel.
            </p>

            {walletState.error && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-6">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-destructive text-sm">
                  {walletState.error}
                </span>
              </div>
            )}

            <Button
              onClick={connectWallet}
              disabled={
                !walletState.isExtensionAvailable || walletState.isConnecting
              }
              className="w-full"
            >
              {walletState.isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Admin Wallet
                </>
              )}
            </Button>

            {!walletState.isExtensionAvailable && (
              <p className="mt-3 text-sm text-muted-foreground">
                Polkadot extension not detected
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="container py-8 pt-32">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-lg">Loading admin panel...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="container py-8 pt-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-4xl font-bold mb-2">Admin Panel</h1>
          <p className="text-xl text-muted-foreground">
            Manage hackathon projects and payouts
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setShowTestPaymentModal(true)}
            className="border-yellow-500 text-yellow-600 hover:bg-yellow-500/10"
          >
            🧪 Test Payment
          </Button>
          <span className="text-sm text-muted-foreground">
            {walletState.selectedAccount?.meta.name || "Admin"} •{" "}
            {formatAddress(walletState.selectedAccount?.address || "")}
          </span>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Pending Review Section */}
      <div className="glass-panel rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-heading mb-4">Pending Review</h2>
        
        {projectsUnderReview.length === 0 ? (
          <EmptyState
            title="No projects pending review"
            description="All M2 submissions have been reviewed or no projects are currently under review."
          />
        ) : (
          <div className="space-y-4">
            {projectsUnderReview.map((project) => (
              <div key={project.id} className="border border-subtle rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-lg font-heading">{project.projectName}</h3>
                    <p className="text-sm text-muted-foreground">
                      By {project.teamMembers?.[0]?.name || 'Unknown'} · Submitted {formatDate(project.finalSubmission?.submittedDate || project.submittedDate)}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-medium font-heading">Deliverables:</h4>
                  <div className="flex gap-4 text-sm flex-wrap">
                    {project.finalSubmission?.repoUrl && (
                      <a 
                        href={project.finalSubmission.repoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        GitHub →
                      </a>
                    )}
                    {project.finalSubmission?.demoUrl && (
                      <a 
                        href={project.finalSubmission.demoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Demo →
                      </a>
                    )}
                    {project.finalSubmission?.docsUrl && (
                      <a 
                        href={project.finalSubmission.docsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Docs →
                      </a>
                    )}
                    {!project.finalSubmission && project.gitLink && (
                      <a 
                        href={project.gitLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        GitHub →
                      </a>
                    )}
                    {!project.finalSubmission && project.demoLink && (
                      <a 
                        href={project.demoLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Demo →
                      </a>
                    )}
                  </div>
                </div>
                
                {project.finalSubmission?.summary && (
                  <p className="text-sm mb-4">{project.finalSubmission.summary}</p>
                )}
                
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={() => {
                      setSelectedProject(project);
                      setShowPayoutModal(true);
                    }}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                    Approve & Process M2 Payment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{projects.length}</div>
            <div className="text-sm text-muted-foreground">Total Projects</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-warning">
              {projects.filter((p) => p.m2Status === "under_review").length}
            </div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {projects.filter((p) => p.m2Status === "completed").length}
            </div>
            <div className="text-sm text-muted-foreground">M2 Graduates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              ${projects.reduce((total, p) => {
                const paid = p.totalPaid?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0;
                return total + paid;
              }, 0).toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Paid Out</div>
          </CardContent>
        </Card>
      </div>

      {/* All Winners Table */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">🏆 All Winners</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track bounty payments and prizes for all winning projects (M2 + bounty-only)
            </p>
          </div>
        </div>
        <WinnersTable 
          projects={projects} 
          onRefresh={loadData}
          connectedAddress={walletState.selectedAccount?.address}
        />
      </section>

      {/* All M2 Projects Table */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">📊 All M2 Projects</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Live status tracking for all M2 incubator projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="sortBy" className="text-sm text-muted-foreground">
              Sort by:
            </Label>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="eventStartedAt">Event Date (Newest)</SelectItem>
                <SelectItem value="projectName">Project Name (A-Z)</SelectItem>
                <SelectItem value="newest">Created Date (Newest)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <M2ProjectsTable 
          projects={sortedProjects || []} 
          onPaymentClick={handlePaymentClick}
        />
      </section>

      {/* M1 Payout Modal */}
      {selectedProject && (
        <ConfirmM1PayoutModal
          open={showM1PayoutModal}
          onOpenChange={setShowM1PayoutModal}
          project={selectedProject}
          onConfirm={handleConfirmM1Payout}
        />
      )}

      {/* M2 Payment Confirmation Modal */}
      {selectedProject && (
        <ConfirmPaymentModal
          open={showPayoutModal}
          onOpenChange={setShowPayoutModal}
          project={selectedProject}
          onConfirm={handleConfirmPayment}
        />
      )}

      {/* Test Payment Modal */}
      <TestPaymentModal
        open={showTestPaymentModal}
        onOpenChange={setShowTestPaymentModal}
      />
      </div>
    </div>
  );
};

export default AdminPage;
