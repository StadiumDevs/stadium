import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import {
  Shield,
  Loader2,
  LogOut,
  Wallet,
  AlertCircle,
  CheckCircle,
  Plus,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { useMemo } from "react";
import { isAdmin, ADMIN_ADDRESSES } from "@/lib/constants";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { getProvider } from "@/lib/auth/registry";
import { ChainPicker } from "@/components/auth/ChainPicker";
import { M2ProjectsTable } from "@/components/admin/M2ProjectsTable";
import { WinnersTable } from "@/components/admin/WinnersTable";
import { ProgramsTable } from "@/components/admin/ProgramsTable";
import { ConfirmPaymentModal } from "@/components/admin/ConfirmPaymentModal";
import { ConfirmM1PayoutModal } from "@/components/admin/ConfirmM1PayoutModal";
import { TestPaymentModal } from "@/components/admin/TestPaymentModal";
import { CreateProjectModal } from "@/components/admin/CreateProjectModal";

const formatAddress = (address = "") =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const AdminPage = () => {
  const BYPASS_ADMIN_CHECK = false;

  const auth = useWalletAuth();
  // Admin-not-found details (admin gating is page logic, not the wallet hook's).
  const [errorData, setErrorData] = useState<any | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(BYPASS_ADMIN_CHECK);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showM1PayoutModal, setShowM1PayoutModal] = useState(false);
  const [showTestPaymentModal, setShowTestPaymentModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [sortBy, setSortBy] = useState<'eventStartedAt' | 'projectName' | 'newest'>('eventStartedAt');
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch ALL projects from the API (no pagination)
      const response = await api.getProjects({ limit: 1000 });
      const projectsData = response?.data || [];
      setProjects(projectsData);
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

  // Bypass mode loads data directly without a wallet.
  useEffect(() => {
    if (BYPASS_ADMIN_CHECK) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Authenticate once an admin wallet is connected (covers restored sessions).
  useEffect(() => {
    if (BYPASS_ADMIN_CHECK) return;
    if (auth.account && isAdmin(auth.account.address, auth.account.chain)) {
      setIsAuthenticated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.account]);

  useEffect(() => {
    if (isAuthenticated && !BYPASS_ADMIN_CHECK) {
      loadData();
    }
    // loadData writes `projects` via setProjects, so including it in deps
    // produces an infinite re-fetch loop (loading never settles to false).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const connectWallet = async () => {
    setErrorData(null);
    try {
      const found = await auth.connect();
      const adminAccount = found.find((account) => isAdmin(account.address, account.chain));

      if (!adminAccount) {
        setErrorData({
          message: "Admin account not found. Please ensure you have the correct admin account in your wallet.",
          walletAddresses: found.map((a) => a.address),
          expectedAddresses: ADMIN_ADDRESSES.filter((e) => e.chain === auth.chain).map((e) => e.address),
          isProduction: import.meta.env.PROD,
        });
        return;
      }

      auth.selectAccount(adminAccount);
      setIsAuthenticated(true);
      toast({
        title: "Admin Access Granted",
        description: "Successfully connected as admin.",
      });
    } catch {
      // auth.error is already set by the wallet hook.
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
      const authHeader = await auth.signAction('admin-action');
      const response = await fetch(`/api/m2-program/${selectedProject.id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-siws-auth': authHeader,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = 'Failed to confirm M1 payout';
        try {
          const errData = JSON.parse(responseText);
          errorMessage = errData.error || errData.message || errorMessage;
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
      const authHeader = await auth.signAction('admin-action');
      const response = await fetch(`/api/m2-program/${selectedProject.id}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-siws-auth': authHeader,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = 'Failed to confirm payment';
        try {
          const errData = JSON.parse(responseText);
          errorMessage = errData.error || errData.message || errorMessage;
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
      toast({
        title: "Error",
        description: error.message || 'Failed to confirm payment',
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleLogout = () => {
    auth.disconnect();
    setIsAuthenticated(false);
    setErrorData(null);
  };

  // Filter projects under review for M2
  const projectsUnderReview = useMemo(() => {
    return projects.filter((p) => p.m2Status === 'under_review');
  }, [projects]);

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
      const authHeader = await auth.signAction('approve-project');
      await api.webzeroApprove(projectId, authHeader);

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
      const authHeader = await auth.signAction('admin-action');
      await api.updateProjectStatus(projectId, newStatus, authHeader);

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

            <div className="flex justify-center mb-6">
              <ChainPicker value={auth.chain} onChange={auth.setChain} />
            </div>

            {(errorData || auth.error) && (
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <p className="text-destructive text-sm font-medium">
                      {errorData?.message || auth.error}
                    </p>

                    {errorData && (
                      <div className="space-y-3 pt-2 border-t border-destructive/20">
                        {errorData.walletAddresses && errorData.walletAddresses.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-destructive/80 mb-2">Your wallet addresses:</p>
                            <ul className="space-y-1.5">
                              {errorData.walletAddresses.map((addr: string, idx: number) => (
                                <li key={idx} className="text-xs text-destructive/70 font-mono break-all bg-destructive/5 p-2 rounded border border-destructive/10">
                                  {addr}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {errorData.expectedAddresses && errorData.expectedAddresses.length > 0 ? (
                          <div>
                            <p className="text-xs font-semibold text-destructive/80 mb-2">Expected admin addresses:</p>
                            <ul className="space-y-1.5">
                              {errorData.expectedAddresses.map((addr: string, idx: number) => (
                                <li key={idx} className="text-xs text-destructive/70 font-mono break-all bg-destructive/5 p-2 rounded border border-destructive/10">
                                  {addr}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3">
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                              ⚠️ No admin addresses configured for this chain
                            </p>
                            <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-1">
                              {errorData.isProduction
                                ? "Set VITE_ADMIN_ADDRESSES in Vercel environment variables and redeploy."
                                : "Add VITE_ADMIN_ADDRESSES to your .env file and restart the dev server."}
                            </p>
                          </div>
                        )}

                        {errorData.expectedAddresses && errorData.expectedAddresses.length > 0 && (
                          <div className="bg-muted/50 border border-border rounded p-3 mt-3">
                            <p className="text-xs text-muted-foreground">
                              {errorData.isProduction ? (
                                <>
                                  <strong>To fix:</strong> Add one of your wallet addresses to <code className="bg-background px-1 py-0.5 rounded text-[10px]">VITE_ADMIN_ADDRESSES</code> in{" "}
                                  <strong>Vercel Dashboard → Settings → Environment Variables</strong> (Production), then redeploy.
                                </>
                              ) : (
                                <>
                                  <strong>To fix:</strong> Add one of your addresses to <code className="bg-background px-1 py-0.5 rounded text-[10px]">VITE_ADMIN_ADDRESSES</code> in your <code className="bg-background px-1 py-0.5 rounded text-[10px]">.env</code> file and restart the dev server.
                                </>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={connectWallet}
              disabled={!auth.isAvailable || auth.isConnecting}
              className="w-full"
            >
              {auth.isConnecting ? (
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

            {!auth.isAvailable && (
              <p className="mt-3 text-sm text-muted-foreground">
                {getProvider(auth.chain)?.label || "Wallet"} extension not detected
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
          {isAuthenticated && !!auth.account?.address && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateProjectModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
              Create Project
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowTestPaymentModal(true)}
            className="border-yellow-500 text-yellow-600 hover:bg-yellow-500/10"
          >
            🧪 Test Payment
          </Button>
          <span className="text-sm text-muted-foreground">
            {auth.account?.label || "Admin"} •{" "}
            {formatAddress(auth.account?.address || "")}
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
                  <p className="text-sm mb-4 whitespace-pre-line leading-relaxed">{project.finalSubmission.summary}</p>
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
          connectedAddress={BYPASS_ADMIN_CHECK ? ADMIN_ADDRESSES[0]?.address : auth.account?.address}
          signAdminAction={auth.signAction}
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

      <section className="mb-8">
        <ProgramsTable connectedAddress={auth.account?.address} />
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

      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateProjectModal}
        onOpenChange={setShowCreateProjectModal}
        connectedAddress={auth.account?.address}
        onSaved={(project) => setProjects((prev) => [project, ...prev])}
      />
      </div>
    </div>
  );
};

export default AdminPage;
