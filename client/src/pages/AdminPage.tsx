import { useState, useEffect, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { Loader2, LogOut, Wallet, CheckCircle, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { isAdmin, ADMIN_ADDRESSES } from "@/lib/constants";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { getProvider } from "@/lib/auth/registry";
import { ChainPicker } from "@/components/auth/ChainPicker";
import { LCDStat } from "@/components/lcd-stat";
import { HardwareToggle } from "@/components/hardware-toggle";
import { M2ProjectsTable } from "@/components/admin/M2ProjectsTable";
import { WinnersTable } from "@/components/admin/WinnersTable";
import { ProgramsTable } from "@/components/admin/ProgramsTable";
import { ConfirmPaymentModal } from "@/components/admin/ConfirmPaymentModal";
import { ConfirmM1PayoutModal } from "@/components/admin/ConfirmM1PayoutModal";
import { TestPaymentModal } from "@/components/admin/TestPaymentModal";
import { CreateProjectModal } from "@/components/admin/CreateProjectModal";

const formatAddress = (address = "") => `${address.slice(0, 6)}...${address.slice(-4)}`;

type SortKey = "eventStartedAt" | "projectName" | "newest";

const AdminPage = () => {
  const BYPASS_ADMIN_CHECK = false;

  const auth = useWalletAuth();
  const [errorData, setErrorData] = useState<{
    message: string;
    walletAddresses: string[];
    expectedAddresses: string[];
    isProduction: boolean;
  } | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(BYPASS_ADMIN_CHECK);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showM1PayoutModal, setShowM1PayoutModal] = useState(false);
  const [showTestPaymentModal, setShowTestPaymentModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("eventStartedAt");
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.getProjects({ limit: 1000 });
      setProjects(response?.data || []);
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

  useEffect(() => {
    if (BYPASS_ADMIN_CHECK) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (BYPASS_ADMIN_CHECK) return;
    if (auth.account && isAdmin(auth.account.address, auth.account.chain)) {
      setIsAuthenticated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.account]);

  useEffect(() => {
    if (isAuthenticated && !BYPASS_ADMIN_CHECK) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const connectWallet = async () => {
    setErrorData(null);
    try {
      const found = await auth.connect();
      const adminAccount = found.find((a) => isAdmin(a.address, a.chain));
      if (!adminAccount) {
        setErrorData({
          message: "Admin account not found. Please connect a wallet whose address is in VITE_ADMIN_ADDRESSES.",
          walletAddresses: found.map((a) => a.address),
          expectedAddresses: ADMIN_ADDRESSES.filter((e) => e.chain === auth.chain).map((e) => e.address),
          isProduction: import.meta.env.PROD,
        });
        return;
      }
      auth.selectAccount(adminAccount);
      setIsAuthenticated(true);
      toast({ title: "Admin Access Granted", description: "Successfully connected as admin." });
    } catch {
      // auth.error is set by the hook
    }
  };

  const handlePaymentClick = (project: any) => {
    setSelectedProject(project);
    setShowM1PayoutModal(true);
  };

  const handleConfirmM1Payout = async (data: any) => {
    if (!selectedProject) return;
    try {
      const authHeaders = await auth.getAdminBearerHeaders();
      const response = await fetch(`/api/m2-program/${selectedProject.id}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const responseText = await response.text();
      if (!response.ok) {
        let errorMessage = "Failed to confirm M1 payout";
        try {
          const errData = JSON.parse(responseText);
          errorMessage = errData.error || errData.message || errorMessage;
        } catch {
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      toast({
        title: "M1 Payout Confirmed",
        description: `Payment distributed to ${data.recipients.length} team members`,
      });
      await loadData();
      setShowM1PayoutModal(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm M1 payout",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleConfirmPayment = async (data: any) => {
    if (!selectedProject) return;
    try {
      const authHeaders = await auth.getAdminBearerHeaders();
      const response = await fetch(`/api/m2-program/${selectedProject.id}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify(data),
      });
      const responseText = await response.text();
      if (!response.ok) {
        let errorMessage = "Failed to confirm payment";
        try {
          const errData = JSON.parse(responseText);
          errorMessage = errData.error || errData.message || errorMessage;
        } catch {
          errorMessage = responseText || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      toast({
        title: "Payment Confirmed",
        description: `${data.milestone} payment recorded successfully`,
      });
      await loadData();
      setShowPayoutModal(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to confirm payment",
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

  const projectsUnderReview = useMemo(
    () => projects.filter((p) => p.m2Status === "under_review"),
    [projects],
  );

  const totalPaidUsd = useMemo(
    () =>
      projects.reduce((total, p) => {
        const paid = p.totalPaid?.reduce((sum: number, payment: any) => sum + payment.amount, 0) || 0;
        return total + paid;
      }, 0),
    [projects],
  );

  const sortedProjects = useMemo(() => {
    const copy = [...projects];
    switch (sortBy) {
      case "eventStartedAt":
        return copy.sort((a, b) => {
          const dA = a.hackathon?.eventStartedAt ? new Date(a.hackathon.eventStartedAt).getTime() : 0;
          const dB = b.hackathon?.eventStartedAt ? new Date(b.hackathon.eventStartedAt).getTime() : 0;
          return dB - dA;
        });
      case "projectName":
        return copy.sort((a, b) => (a.projectName || "").localeCompare(b.projectName || ""));
      case "newest":
        return copy.sort((a, b) => {
          const dA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dB - dA;
        });
      default:
        return copy;
    }
  }, [projects, sortBy]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  const fmtUSD = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n}`);

  // ── Auth gate ────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen scanlines">
        <Navigation />
        <div className="container py-8 flex items-center justify-center">
          <div className="panel p-8 max-w-md w-full text-center">
            <div className="label-hw-dim mb-3">·ADMIN / AUTH REQUIRED</div>
            <h1 className="font-display text-4xl uppercase tracking-tight text-display mb-2">
              Sign In
            </h1>
            <p className="text-body text-sm mb-6">
              Connect your admin wallet to access the management panel.
            </p>

            <div className="flex justify-center mb-6">
              <ChainPicker value={auth.chain} onChange={auth.setChain} />
            </div>

            {(errorData || auth.error) && (
              <div className="lcd p-3 mb-6 text-left space-y-3">
                <div className="label-hw text-destructive">·ERROR</div>
                <p className="text-body text-sm">{errorData?.message || auth.error}</p>

                {errorData && errorData.walletAddresses.length > 0 && (
                  <div>
                    <div className="label-hw-dim mb-1">Your wallet addresses:</div>
                    <ul className="space-y-1">
                      {errorData.walletAddresses.map((a, i) => (
                        <li key={i} className="font-mono text-[11px] text-body break-all">{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {errorData && errorData.expectedAddresses.length > 0 ? (
                  <div>
                    <div className="label-hw-dim mb-1">Expected admin addresses:</div>
                    <ul className="space-y-1">
                      {errorData.expectedAddresses.map((a, i) => (
                        <li key={i} className="font-mono text-[11px] text-body break-all">{a}</li>
                      ))}
                    </ul>
                  </div>
                ) : errorData ? (
                  <div className="label-hw-dim">
                    No admin addresses configured for this chain.{" "}
                    {errorData.isProduction
                      ? "Set VITE_ADMIN_ADDRESSES in Vercel and redeploy."
                      : "Add VITE_ADMIN_ADDRESSES to your .env and restart the dev server."}
                  </div>
                ) : null}
              </div>
            )}

            <button
              type="button"
              onClick={connectWallet}
              disabled={!auth.isAvailable || auth.isConnecting}
              className="w-full font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:bg-panel-deep disabled:text-label-dim disabled:border-hairline disabled:cursor-not-allowed px-4 py-2.5 inline-flex items-center justify-center gap-2"
            >
              {auth.isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> CONNECTING…
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" /> CONNECT ADMIN WALLET
                </>
              )}
            </button>

            {!auth.isAvailable && (
              <p className="mt-3 label-hw-dim">
                {(getProvider(auth.chain)?.label || "Wallet").toUpperCase()} EXTENSION NOT DETECTED
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen scanlines">
        <Navigation />
        <div className="container py-8 flex items-center justify-center min-h-[400px]">
          <div className="panel p-8 inline-flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-label-mid" />
            <span className="label-hw text-display">·LOADING ADMIN PANEL</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ────────────────────────────────────────────────
  const RackBtn = ({
    onClick, children, variant = "ghost", disabled,
  }: { onClick?: () => void; children: React.ReactNode; variant?: "primary" | "ghost"; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        variant === "primary"
          ? "font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-3 py-1.5 inline-flex items-center gap-1.5"
          : "font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5 inline-flex items-center gap-1.5"
      }
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen scanlines">
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <div className="label-hw-dim mb-2">·ADMIN / DASHBOARD</div>
            <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tight text-display leading-[0.95] mb-2">
              Admin Panel
            </h1>
            <p className="text-body text-base">Manage hackathon projects and payouts.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAuthenticated && !!auth.account?.address && (
              <RackBtn onClick={() => setShowCreateProjectModal(true)}>
                <Plus className="h-3 w-3" /> CREATE PROJECT
              </RackBtn>
            )}
            <RackBtn onClick={() => setShowTestPaymentModal(true)}>TEST PAYMENT</RackBtn>
            <div className="lcd px-3 py-1.5 label-hw text-display">
              {(auth.account?.label || "ADMIN").toUpperCase()} · {formatAddress(auth.account?.address || "")}
            </div>
            <RackBtn onClick={handleLogout}>
              <LogOut className="h-3 w-3" /> LOGOUT
            </RackBtn>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          <LCDStat value={projects.length} label="Total Projects" size="lg" />
          <LCDStat value={projectsUnderReview.length} label="Pending Review" showLED pulse />
          <LCDStat value={projects.filter((p) => p.m2Status === "completed").length} label="M2 Graduates" showLED />
          <LCDStat value={fmtUSD(totalPaidUsd)} label="Paid Out" size="sm" showLED />
        </div>

        {/* Pending Review */}
        <section className="panel p-4 mb-4">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-hairline-subtle">
            <span className="led led-sm led-pulse" aria-hidden="true" />
            <span className="label-hw text-display">·PENDING REVIEW</span>
            <span className="label-hw-dim">
              {projectsUnderReview.length} {projectsUnderReview.length === 1 ? "PROJECT" : "PROJECTS"}
            </span>
          </div>

          {projectsUnderReview.length === 0 ? (
            <p className="label-hw-dim py-6 text-center">
              All M2 submissions are reviewed — nothing pending.
            </p>
          ) : (
            <div className="space-y-3">
              {projectsUnderReview.map((project) => (
                <div key={project.id} className="lcd p-4">
                  <div className="mb-3">
                    <div className="label-hw-dim mb-1">UNIT · SUBMITTED {formatDate(project.finalSubmission?.submittedDate || project.submittedDate)}</div>
                    <h3 className="font-display text-2xl uppercase tracking-tight text-display leading-tight">
                      {project.projectName}
                    </h3>
                    <div className="label-hw-dim mt-0.5">BY {(project.teamMembers?.[0]?.name || "Unknown").toUpperCase()}</div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="label-hw">DELIVERABLES</div>
                    <div className="flex gap-4 text-sm flex-wrap font-mono text-[11px]">
                      {project.finalSubmission?.repoUrl && (
                        <a href={project.finalSubmission.repoUrl} target="_blank" rel="noopener noreferrer" className="text-display hover:underline">GITHUB ▸</a>
                      )}
                      {project.finalSubmission?.demoUrl && (
                        <a href={project.finalSubmission.demoUrl} target="_blank" rel="noopener noreferrer" className="text-display hover:underline">DEMO ▸</a>
                      )}
                      {project.finalSubmission?.docsUrl && (
                        <a href={project.finalSubmission.docsUrl} target="_blank" rel="noopener noreferrer" className="text-display hover:underline">DOCS ▸</a>
                      )}
                    </div>
                  </div>

                  {project.finalSubmission?.summary && (
                    <p className="text-body text-[13px] mb-3 whitespace-pre-line leading-relaxed">
                      {project.finalSubmission.summary}
                    </p>
                  )}

                  <RackBtn
                    variant="primary"
                    onClick={() => {
                      setSelectedProject(project);
                      setShowPayoutModal(true);
                    }}
                  >
                    <CheckCircle className="h-3 w-3" /> APPROVE & PROCESS M2 PAYMENT
                  </RackBtn>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* All Winners */}
        <section className="panel p-4 mb-4">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-hairline-subtle">
            <span className="label-hw text-display">·ALL WINNERS</span>
            <span className="label-hw-dim">
              Track bounty payments &amp; prizes (M2 + bounty-only)
            </span>
          </div>
          <WinnersTable
            projects={projects}
            onRefresh={loadData}
            connectedAddress={BYPASS_ADMIN_CHECK ? ADMIN_ADDRESSES[0]?.address : auth.account?.address}
            signAdminAction={auth.getAdminBearerHeaders}
          />
        </section>

        {/* All M2 Projects */}
        <section className="panel p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-hairline-subtle">
            <span className="label-hw text-display">·ALL M2 PROJECTS</span>
            <span className="label-hw-dim">Live status tracking</span>
            <div className="flex-1" />
            <span className="label-hw-dim">SORT</span>
            <HardwareToggle
              options={[
                { value: "eventStartedAt", label: "EVENT" },
                { value: "projectName", label: "A-Z" },
                { value: "newest", label: "RECENT" },
              ]}
              value={sortBy}
              onChange={(v) => setSortBy(v as SortKey)}
            />
          </div>
          <M2ProjectsTable projects={sortedProjects || []} onPaymentClick={handlePaymentClick} />
        </section>

        {/* Programs */}
        <section className="panel p-4 mb-4">
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-hairline-subtle">
            <span className="label-hw text-display">·PROGRAMS</span>
          </div>
          <ProgramsTable connectedAddress={auth.account?.address} />
        </section>
      </main>

      {/* Modals */}
      {selectedProject && (
        <ConfirmM1PayoutModal
          open={showM1PayoutModal}
          onOpenChange={setShowM1PayoutModal}
          project={selectedProject}
          onConfirm={handleConfirmM1Payout}
        />
      )}
      {selectedProject && (
        <ConfirmPaymentModal
          open={showPayoutModal}
          onOpenChange={setShowPayoutModal}
          project={selectedProject}
          onConfirm={handleConfirmPayment}
        />
      )}
      <TestPaymentModal open={showTestPaymentModal} onOpenChange={setShowTestPaymentModal} />
      <CreateProjectModal
        open={showCreateProjectModal}
        onOpenChange={setShowCreateProjectModal}
        connectedAddress={auth.account?.address}
        onSaved={(project) => setProjects((prev) => [project, ...prev])}
      />
    </div>
  );
};

export default AdminPage;
