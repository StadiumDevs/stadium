import { useState, useEffect } from "react";
import {
  Eye,
  Trophy,
  DollarSign,
  Shield,
  Loader2,
  LogOut,
  Wallet,
  AlertCircle,
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

const ADMIN_ADDRESS = "5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF";

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
  const [projects, setProjects] = useState<Project[]>([]);
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
      if (account.address === ADMIN_ADDRESS) {
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

      // Check if admin account is available
      const adminAccount = allAccounts.find(
        (account) => account.address === ADMIN_ADDRESS
      );

      if (!adminAccount) {
        throw new Error(
          "Admin account not found. Please ensure you have the correct admin account in your wallet."
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
      if (account.address !== ADMIN_ADDRESS) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="container py-8">
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent>
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Admin Access Required</h1>
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
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-lg">Loading admin panel...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
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
            <div className="text-2xl font-bold text-success">
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
  );
};

export default AdminPage;
