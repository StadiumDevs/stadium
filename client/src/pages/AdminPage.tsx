import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import {
  Eye,
  Trophy,
  DollarSign,
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
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, projectApi } from "@/lib/mockApi";
import { Project, Payout } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { useMemo } from "react";
import { isAdmin, ADMIN_ADDRESSES } from "@/lib/constants";

const formatAddress = (address = "") =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const PayoutModal = ({
  isOpen,
  onClose,
  project,
}: {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}) => {
  const [amount, setAmount] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const handleCreatePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setIsCreating(true);
    try {
      await adminApi.createPayout({
        projectId: project.id,
        recipient: project.ss58Address,
        amount,
      });

      toast({
        title: "Payout Created",
        description: `Payout of ${amount} tokens initiated for ${project.projectTitle}`,
      });

      onClose();
      setAmount("");
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Payout Failed",
        description: err?.message || "Failed to create payout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Create Payout</span>
          </DialogTitle>
          <DialogDescription>
            Create a payout for {project?.projectTitle}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreatePayout}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                value={project?.ss58Address || ""}
                readOnly
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (Tokens)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10000"
                required
                min="1"
              />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Payout"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

type M2Project = Project & {
  m2Status?: 'building' | 'under_review' | 'completed';
  finalSubmission?: {
    repoUrl: string;
    demoUrl: string;
    docsUrl: string;
    summary: string;
    submittedDate: string;
  };
  mentorApproval?: {
    approved: boolean;
    approvedDate?: string;
  };
  author?: string;
};

const AdminPage = () => {
  const [walletState, setWalletState] = useState({
    isExtensionAvailable: false,
    isConnected: false,
    isConnecting: false,
    accounts: [],
    selectedAccount: null,
    error: "",
    injector: null,
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [projects, setProjects] = useState<M2Project[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
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

  const loadData = async () => {
    try {
      const [projectsData, payoutsData] = await Promise.all([
        projectApi.getProjects(),
        adminApi.getPayouts(),
      ]);
      setProjects(projectsData);
      setPayouts(payoutsData);
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Error",
        description: err?.message || "Failed to load admin data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    projectId: string,
    newStatus: Project["status"]
  ) => {
    try {
      const updatedProject = await projectApi.updateProjectStatus(
        projectId,
        newStatus
      );
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? updatedProject : p))
      );

      toast({
        title: "Status Updated",
        description: `Project status changed to ${newStatus}`,
      });
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Update Failed",
        description: err?.message || "Failed to update project status.",
        variant: "destructive",
      });
    }
  };

  const handleDeclareWinner = async (projectId: string) => {
    await handleStatusChange(projectId, "winner");
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
    return projects.filter((p) => p.m2Status === 'under_review') as M2Project[];
  }, [projects]);

  // Filter M2 projects (winners or projects with M2 status)
  const m2Projects = useMemo(() => 
    projects.filter(p => p.isWinner || p.m2Status) as M2Project[],
    [projects]
  );

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

  // Handle request changes
  const handleRequestChanges = async (projectId: string) => {
    const feedback = prompt('What changes are needed?');
    if (!feedback) return;

    try {
      await api.requestChanges(projectId, feedback);
      
      toast({
        title: "Changes Requested",
        description: "Team will be notified in Telegram.",
      });
      
      loadData();
    } catch (error) {
      const err = error as Error;
      toast({
        title: "Failed to request changes",
        description: err?.message || "Failed to request changes. Please try again.",
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

  // Get M2 status badge
  const getM2StatusBadge = (project: M2Project) => {
    if (!project.m2Status) return null;
    
    switch (project.m2Status) {
      case 'building':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Building</Badge>;
      case 'under_review':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Under Review</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Completed</Badge>;
      default:
        return null;
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

      {/* M2 Reviews Section */}
      <div className="glass-panel rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-heading mb-4">M2 Pending Reviews</h2>
        
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
                    <h3 className="font-medium text-lg font-heading">{project.projectTitle}</h3>
                    <p className="text-sm text-muted-foreground">
                      By {project.author || 'Unknown'} · Submitted {formatDate(project.finalSubmission?.submittedDate || project.submittedAt)}
                    </p>
                  </div>
                  <Badge variant={project.mentorApproval?.approved ? "default" : "secondary"}>
                    Mentor: {project.mentorApproval?.approved ? '✅ Approved' : '⏳ Pending'}
                  </Badge>
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
                    onClick={() => handleApproveM2(project.id)}
                    disabled={!project.mentorApproval?.approved}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                    Approve & Process Payment
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleRequestChanges(project.id)}
                  >
                    Request Changes
                  </Button>
                </div>
                
                {!project.mentorApproval?.approved && (
                  <p className="text-xs text-yellow-500 mt-2">
                    ⚠️ Waiting for mentor approval before WebZero review
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* M2 Program Management */}
      <div className="glass-panel rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-heading mb-4">M2 Program Management</h2>
        
        {m2Projects.length === 0 ? (
          <p className="text-muted-foreground">No projects in M2 program yet</p>
        ) : (
          <div className="space-y-4">
            {m2Projects.map((project) => (
              <div key={project.id} className="border border-subtle rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg font-heading">{project.projectTitle || project.title}</h3>
                    <p className="text-sm text-muted-foreground">By {project.author || 'Unknown'}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Current Status Badge */}
                    <Badge variant={
                      project.m2Status === 'completed' ? 'default' :
                      project.m2Status === 'under_review' ? 'secondary' :
                      'outline'
                    }>
                      {project.m2Status === 'building' && '🏗️ Building'}
                      {project.m2Status === 'under_review' && '⏳ Under Review'}
                      {project.m2Status === 'completed' && '✅ Completed'}
                      {!project.m2Status && '🏗️ Building'}
                    </Badge>
                    
                    {/* Status Change Dropdown */}
                    <Select 
                      value={project.m2Status || 'building'} 
                      onValueChange={(status) => handleM2StatusChange(project.id, status as 'building' | 'under_review' | 'completed')}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Change status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="building">🏗️ Building</SelectItem>
                        <SelectItem value="under_review">⏳ Under Review</SelectItem>
                        <SelectItem value="completed">✅ Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Show final submission details if exists */}
                {project.finalSubmission && (
                  <div className="space-y-2 mb-4 bg-muted/50 rounded p-3">
                    <h4 className="text-sm font-medium">Final Submission:</h4>
                    <div className="flex gap-4 text-sm flex-wrap">
                      {project.finalSubmission.repoUrl && (
                        <a href={project.finalSubmission.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          GitHub →
                        </a>
                      )}
                      {project.finalSubmission.demoUrl && (
                        <a href={project.finalSubmission.demoUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Demo →
                        </a>
                      )}
                      {project.finalSubmission.docsUrl && (
                        <a href={project.finalSubmission.docsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Docs →
                        </a>
                      )}
                    </div>
                    {project.finalSubmission.summary && (
                      <p className="text-xs text-muted-foreground mt-2">{project.finalSubmission.summary}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Submitted: {formatDate(project.finalSubmission.submittedDate)}
                    </p>
                  </div>
                )}
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
              {projects.filter((p) => p.status === "pending").length}
            </div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {projects.filter((p) => p.status === "winner").length}
            </div>
            <div className="text-sm text-muted-foreground">Winners</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              {payouts.filter((p) => p.status === "completed").length}
            </div>
            <div className="text-sm text-muted-foreground">Payouts Made</div>
          </CardContent>
        </Card>
      </div>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Project Management</CardTitle>
          <CardDescription>
            Review and manage submitted projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Title</TableHead>
                  <TableHead>Team Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>M2 Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.ss58Address}>
                    <TableCell className="font-medium">
                      {project.projectTitle}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {project.ss58Address.slice(0, 8)}...
                      {project.ss58Address.slice(-6)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={project.status}
                        onValueChange={(value: Project["status"]) =>
                          handleStatusChange(project.ss58Address, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="winner">Winner</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {getM2StatusBadge(project as M2Project) || <span className="text-muted-foreground text-sm">N/A</span>}
                    </TableCell>
                    <TableCell>{formatDate(project.submittedAt)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            window.open(
                              `/project/${project.ss58Address}`,
                              "_blank"
                            )
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleDeclareWinner(project.ss58Address)
                          }
                          disabled={project.status === "winner"}
                        >
                          <Trophy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedProject(project);
                            setShowPayoutModal(true);
                          }}
                        >
                          <DollarSign className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payout Modal */}
      <PayoutModal
        isOpen={showPayoutModal}
        onClose={() => setShowPayoutModal(false)}
        project={selectedProject}
      />
      </div>
    </div>
  );
};

export default AdminPage;
