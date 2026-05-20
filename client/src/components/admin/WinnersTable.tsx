import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { 
  ExternalLink, 
  Eye,
  CheckCircle2,
  XCircle,
  Trophy,
  Loader2,
  Settings,
  CheckCheck,
  FileText,
  ClipboardList,
  CreditCard,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface BountyPrize {
  name: string;
  amount: number;
  currency?: 'USDC' | 'DOT';
  hackathonWonAtId: string;
  txHash?: string;
}

interface ManageProjectModalData {
  projectId: string;
  projectName: string;
  // Tab 1: Project Status
  projectState: string;
  m2Status: string;
  bountiesProcessed: boolean;
  // Tab 2: M2 Agreement
  agreedFeatures: string;
  documentation: string;
  successCriteria: string;
  // Tab 3: Deliverables
  repoUrl: string;
  demoUrl: string;
  docsUrl: string;
  summary: string;
  // Tab 4: Payments
  paymentMilestone: 'M1' | 'M2' | 'BOUNTY';
  paymentAmount: number;
  paymentCurrency: 'USDC' | 'DOT';
  transactionProof: string;
  bountyName: string;
  // Extra data for reference
  donationAddress: string;
}

interface WinnersTableProps {
  projects: any[];
  onRefresh: () => void;
  connectedAddress?: string;
  signAdminAction: (action?: string) => Promise<string>;
}

type WinnerFilter = "all" | "main-track" | "bounty";

export function WinnersTable({ projects, onRefresh, connectedAddress, signAdminAction }: WinnersTableProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [winnerFilter, setWinnerFilter] = useState<WinnerFilter>("all");
  const [manageModal, setManageModal] = useState<ManageProjectModalData | null>(null);
  const [activeTab, setActiveTab] = useState("status");
  const [bulkMarkPaidDialog, setBulkMarkPaidDialog] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Helper to check if a project is a main track winner
  const isMainTrackWinner = (project: any): boolean => {
    return project.bountyPrize?.some((b: BountyPrize) => 
      b.name.toLowerCase().includes("main track")
    ) || false;
  };

  // Filter: show only projects with bountyPrize entries (winners from CSV)
  const winnerProjects = (projects || []).filter(p => 
    p.bountyPrize && p.bountyPrize.length > 0
  );

  // Apply winner type filter
  const filteredProjects = winnerProjects.filter(p => {
    if (winnerFilter === "all") return true;
    if (winnerFilter === "main-track") return isMainTrackWinner(p);
    if (winnerFilter === "bounty") return !isMainTrackWinner(p);
    return true;
  });

  // Sort: by event date (newest first)
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const dateA = a.hackathon?.eventStartedAt ? new Date(a.hackathon.eventStartedAt).getTime() : 0;
    const dateB = b.hackathon?.eventStartedAt ? new Date(b.hackathon.eventStartedAt).getTime() : 0;
    return dateB - dateA;
  });

  // Count by type for display
  const mainTrackCount = winnerProjects.filter(isMainTrackWinner).length;
  const bountyCount = winnerProjects.length - mainTrackCount;
  
  // Count unpaid projects (for bulk action)
  const unpaidProjects = winnerProjects.filter(p => !p.bountiesProcessed);
  const unpaidCount = unpaidProjects.length;

  // Get M2 status display
  const getM2StatusDisplay = (project: any) => {
    if (!project.m2Status) {
      return <span className="text-label-dim">—</span>;
    }
    const base =
      "inline-flex items-center px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase";
    if (project.m2Status === 'completed') {
      return <span className={`${base} border border-led bg-led text-shell`}>COMPLETED</span>;
    }
    if (project.m2Status === 'under_review') {
      return <span className={`${base} border border-hairline text-display bg-panel-deep`}>UNDER REVIEW</span>;
    }
    if (project.m2Status === 'active') {
      return <span className={`${base} border border-hairline text-display bg-panel-deep`}>ACTIVE</span>;
    }
    return <span className={`${base} border border-hairline text-label-mid`}>{project.m2Status}</span>;
  };

  // Calculate total bounty amount
  const getTotalBounty = (project: any) => {
    if (!project.bountyPrize || project.bountyPrize.length === 0) return 0;
    return project.bountyPrize.reduce((sum: number, b: BountyPrize) => sum + b.amount, 0);
  };

  // Format amount with correct currency symbol
  const formatAmount = (amount: number, currency?: string) => {
    if (currency === 'DOT') return `${amount.toLocaleString()} DOT`;
    return `$${amount.toLocaleString()}`;
  };

  // Get dominant currency for a project's bounty prizes
  const getProjectCurrency = (project: any): string | undefined => {
    const currencies = (project.bountyPrize || []).map((b: BountyPrize) => b.currency || 'USDC');
    const unique = [...new Set(currencies)];
    return unique.length === 1 ? unique[0] as string : undefined;
  };

  // Open manage modal with project data
  const openManageModal = (project: any) => {
    const bounty = project.bountyPrize?.[0];
    const m2Agreement = project.m2Agreement || {};
    const finalSubmission = project.finalSubmission || {};
    
    setManageModal({
      projectId: project.id,
      projectName: project.projectName,
      // Tab 1: Project Status
      projectState: project.projectState || "Hackathon Submission",
      m2Status: project.m2Status || "",
      bountiesProcessed: project.bountiesProcessed || false,
      // Tab 2: M2 Agreement
      agreedFeatures: (m2Agreement.agreedFeatures || []).join('\n'),
      documentation: (m2Agreement.documentation || []).join('\n'),
      successCriteria: m2Agreement.successCriteria || "",
      // Tab 3: Deliverables
      repoUrl: finalSubmission.repoUrl || project.projectRepo || "",
      demoUrl: finalSubmission.demoUrl || project.demoUrl || "",
      docsUrl: finalSubmission.docsUrl || "",
      summary: finalSubmission.summary || "",
      // Tab 4: Payments
      paymentMilestone: 'BOUNTY',
      paymentAmount: getTotalBounty(project),
      paymentCurrency: 'USDC',
      transactionProof: "",
      bountyName: bounty?.name || "Bounty",
      // Extra
      donationAddress: project.donationAddress || "",
    });
    setActiveTab("status");
  };

  // Tab 1: Save Project Status
  const saveProjectStatus = async () => {
    if (!manageModal) return;
    setSaving("status");
    
    try {
      const authHeader = await signAdminAction('admin-action');
      
      const updateData: Record<string, any> = {
        projectState: manageModal.projectState,
        bountiesProcessed: manageModal.bountiesProcessed,
      };
      
      // Only set m2Status if it has a value
      if (manageModal.m2Status) {
        updateData.m2Status = manageModal.m2Status;
      }

      await api.updateProjectDetails(manageModal.projectId, updateData, authHeader);
      
      toast({
        title: "Status updated",
        description: `Project status saved successfully`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Failed to save status",
        description: error.message || "Could not update project status",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Tab 2: Save M2 Agreement
  const saveM2Agreement = async () => {
    if (!manageModal) return;
    setSaving("agreement");
    
    try {
      const authHeader = await signAdminAction('admin-action');
      
      // Parse line-separated strings into arrays
      const agreedFeatures = manageModal.agreedFeatures
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 20); // Max 20 items
        
      const documentation = manageModal.documentation
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .slice(0, 10); // Max 10 items

      if (agreedFeatures.length === 0) {
        throw new Error("Please add at least one agreed feature");
      }
      if (documentation.length === 0) {
        throw new Error("Please add at least one documentation item");
      }
      if (!manageModal.successCriteria.trim()) {
        throw new Error("Please add success criteria");
      }

      // Use the api helper which includes API_BASE_URL
      await api.updateM2Agreement(
        manageModal.projectId,
        {
          agreedFeatures,
          documentation,
          successCriteria: manageModal.successCriteria.trim(),
        },
        authHeader
      );
      
      toast({
        title: "M2 Agreement updated",
        description: `Agreement saved successfully`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Failed to save agreement",
        description: error.message || "Could not update M2 agreement",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Tab 3: Save Deliverables (bypass week restriction by using PATCH directly)
  const saveDeliverables = async () => {
    if (!manageModal) return;
    setSaving("deliverables");
    
    try {
      const authHeader = await signAdminAction('admin-action');
      
      // Validate
      if (!manageModal.repoUrl) {
        throw new Error("Repository URL is required");
      }
      if (!manageModal.demoUrl) {
        throw new Error("Demo URL is required");
      }
      if (!manageModal.docsUrl) {
        throw new Error("Documentation URL is required");
      }
      if (!manageModal.summary || manageModal.summary.length < 10) {
        throw new Error("Summary must be at least 10 characters");
      }

      // Use PATCH to set finalSubmission directly (bypasses week restriction)
      const updateData = {
        finalSubmission: {
          repoUrl: manageModal.repoUrl,
          demoUrl: manageModal.demoUrl,
          docsUrl: manageModal.docsUrl,
          summary: manageModal.summary,
          submittedDate: new Date().toISOString(),
          submittedBy: connectedAddress || 'admin',
        },
        m2Status: 'under_review',
      };

      await api.updateProjectDetails(manageModal.projectId, updateData, authHeader);
      
      toast({
        title: "Deliverables saved",
        description: `Submission saved and status set to "Under Review"`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Failed to save deliverables",
        description: error.message || "Could not update deliverables",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Tab 4: Save Payment
  const savePayment = async () => {
    if (!manageModal) return;
    setSaving("payment");
    
    try {
      const authHeader = await signAdminAction('admin-action');
      
      // Validate
      if (!manageModal.paymentAmount || manageModal.paymentAmount <= 0) {
        throw new Error("Payment amount must be greater than 0");
      }
      if (!manageModal.transactionProof || !manageModal.transactionProof.startsWith('http')) {
        throw new Error("Valid transaction proof URL is required");
      }
      if (manageModal.paymentMilestone === 'BOUNTY' && !manageModal.bountyName) {
        throw new Error("Bounty name is required for BOUNTY payments");
      }

      await api.confirmPayment(manageModal.projectId, {
        milestone: manageModal.paymentMilestone,
        amount: manageModal.paymentAmount,
        currency: manageModal.paymentCurrency,
        transactionProof: manageModal.transactionProof,
        bountyName: manageModal.paymentMilestone === 'BOUNTY' ? manageModal.bountyName : undefined,
      }, authHeader);
      
      toast({
        title: "Payment confirmed",
        description: `${manageModal.paymentMilestone} payment recorded successfully`,
      });
      
      // Clear payment fields after successful save
      setManageModal(prev => prev ? {
        ...prev,
        transactionProof: "",
      } : null);
      
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Failed to record payment",
        description: error.message || "Could not confirm payment",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Bulk mark all unpaid projects as paid
  const bulkMarkAsPaid = async () => {
    setBulkUpdating(true);
    let successCount = 0;
    let failCount = 0;
    
    try {
      const authHeader = await signAdminAction('admin-action');
      
      for (const project of unpaidProjects) {
        try {
          await api.updateProjectDetails(project.id, {
            bountiesProcessed: true,
          }, authHeader);
          successCount++;
        } catch (err) {
          console.error(`Failed to update ${project.projectName}:`, err);
          failCount++;
        }
      }
      
      toast({
        title: "Bulk update complete",
        description: `Marked ${successCount} projects as paid${failCount > 0 ? `, ${failCount} failed` : ''}`,
      });
      
      setBulkMarkPaidDialog(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Bulk update failed",
        description: error.message || "Could not complete bulk update",
        variant: "destructive",
      });
    } finally {
      setBulkUpdating(false);
    }
  };

  if (sortedProjects.length === 0) {
    return (
      <div className="panel p-12 text-center">
        <Trophy className="w-10 h-10 mx-auto text-label-dim mb-4" />
        <span className="label-hw-dim">·NO WINNING PROJECTS FOUND</span>
      </div>
    );
  }

  const filterButton = (
    value: "all" | "main-track" | "bounty",
    label: string,
    count: number,
  ) => {
    const active = winnerFilter === value;
    return (
      <button
        type="button"
        onClick={() => setWinnerFilter(value)}
        className={
          active
            ? "font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell px-3 py-1.5"
            : "font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
        }
      >
        {label.toUpperCase()} ({count})
      </button>
    );
  };

  return (
    <>
      {/* Filter Controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="label-hw-dim">FILTER:</span>
          <div className="flex gap-1">
            {filterButton("all", "All", winnerProjects.length)}
            {filterButton("main-track", "Main Track", mainTrackCount)}
            {filterButton("bounty", "Other Bounties", bountyCount)}
          </div>
        </div>

        {/* Bulk Actions */}
        {connectedAddress && unpaidCount > 0 && (
          <button
            type="button"
            onClick={() => setBulkMarkPaidDialog(true)}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
          >
            <CheckCheck className="h-3 w-3" />
            MARK ALL AS PAID ({unpaidCount})
          </button>
        )}
      </div>

      <div className="panel p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-panel-deep">
              <TableHead className={`label-hw-dim ${connectedAddress ? "w-[18%]" : "w-[22%]"}`}>PROJECT</TableHead>
              <TableHead className={`label-hw-dim ${connectedAddress ? "w-[12%]" : "w-[15%]"}`}>EVENT</TableHead>
              <TableHead className={`label-hw-dim ${connectedAddress ? "w-[20%]" : "w-[24%]"}`}>TRACK / BOUNTY</TableHead>
              <TableHead className={`label-hw-dim ${connectedAddress ? "w-[10%]" : "w-[12%]"}`}>AMOUNT</TableHead>
              <TableHead className={`label-hw-dim ${connectedAddress ? "w-[10%]" : "w-[12%]"}`}>M2 STATUS</TableHead>
              <TableHead className={`label-hw-dim ${connectedAddress ? "w-[10%]" : "w-[15%]"}`}>PAYMENT</TableHead>
              {connectedAddress && <TableHead className="w-[20%] text-right label-hw-dim">ACTIONS</TableHead>}
            </TableRow>
          </TableHeader>
            <TableBody>
              {sortedProjects.map((project) => {
                const totalBounty = getTotalBounty(project);
                // M2 program grant (issue #26) — schema-backed entitlement,
                // only present on M2 projects.
                const m2Grant = project.m2Entitlement
                  ? (project.m2Entitlement.milestone1Amount || 0) + (project.m2Entitlement.milestone2Amount || 0)
                  : 0;
                const totalAmount = totalBounty + m2Grant;
                const isSaving = saving === project.id;

                return (
                  <TableRow key={project.id} className="hover:bg-muted/30">
                    {/* Project Name */}
                    <TableCell>
                      <p className="font-semibold">{project.projectName}</p>
                      <p className="text-xs text-muted-foreground">
                        {project.teamMembers?.[0]?.name || "Unknown"}
                      </p>
                    </TableCell>

                    {/* Event */}
                    <TableCell>
                      <p className="text-sm">{project.hackathon?.name || "N/A"}</p>
                    </TableCell>

                    {/* Track/Bounty - simplified, no edit buttons */}
                    <TableCell>
                      <div className="space-y-1">
                        {project.bountyPrize.map((b: BountyPrize, idx: number) => (
                          <div key={idx}>
                            <span className="text-sm">{b.name}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    {/* Amount — bounty sum + M2 program grant. The M2
                        entitlement is schema-backed per project (issue #26). */}
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold">{formatAmount(totalAmount, getProjectCurrency(project))}</p>
                        {(project.bountyPrize.length > 1 || m2Grant > 0) && (
                          <div className="text-xs text-muted-foreground">
                            {project.bountyPrize.map((b: BountyPrize, idx: number) => (
                              <div key={idx}>Bounty: {formatAmount(b.amount, b.currency)}</div>
                            ))}
                            {m2Grant > 0 && (
                              <div>M2 grant: {formatAmount(m2Grant, project.m2Entitlement?.currency)}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* M2 Status */}
                    <TableCell>
                      {getM2StatusDisplay(project)}
                    </TableCell>

                    {/* Payment */}
                    <TableCell>
                      {project.bountiesProcessed ? (
                        <div className="flex items-center gap-1 text-green-500">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm">Paid</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">Not paid</span>
                        </div>
                      )}
                      {/* Show TX link if exists */}
                      {(project.totalPaid?.some((p: any) => p.milestone === 'BOUNTY' && p.transactionProof) ||
                        project.bountyPrize?.some((b: BountyPrize) => b.txHash)) && (
                        <div className="mt-1">
                          {project.totalPaid?.filter((p: any) => p.milestone === 'BOUNTY' && p.transactionProof).map((p: any, idx: number) => (
                            <a
                              key={`tp-${idx}`}
                              href={p.transactionProof.startsWith('http') ? p.transactionProof : `https://polkadot.subscan.io/extrinsic/${p.transactionProof}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              TX <ExternalLink className="h-3 w-3" />
                            </a>
                          ))}
                        </div>
                      )}
                    </TableCell>

                    {/* Actions - unified Confirm Payout for all rows */}
                    {connectedAddress && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center border border-hairline text-display hover:bg-panel-deep w-7 h-7"
                            onClick={() => window.open(`/m2-program/${project.id}`, '_blank')}
                            title="View project"
                            aria-label="Open project page"
                          >
                            <Eye className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            onClick={() => openManageModal(project)}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-2.5 h-7"
                          >
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Settings className="h-3 w-3" />
                                MANAGE
                              </>
                            )}
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
      </div>

      {/* Multi-Tab Manage Project Modal */}
      <Dialog open={!!manageModal} onOpenChange={() => setManageModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">MANAGE PROJECT</DialogTitle>
            <DialogDescription className="text-body">
              Update details for <strong className="text-display">{manageModal?.projectName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="status" className="gap-1">
                <Settings className="h-3 w-3" />
                <span className="hidden sm:inline">Status</span>
              </TabsTrigger>
              <TabsTrigger value="agreement" className="gap-1">
                <ClipboardList className="h-3 w-3" />
                <span className="hidden sm:inline">Agreement</span>
              </TabsTrigger>
              <TabsTrigger value="deliverables" className="gap-1">
                <FileText className="h-3 w-3" />
                <span className="hidden sm:inline">Deliverables</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1">
                <CreditCard className="h-3 w-3" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Project Status */}
            <TabsContent value="status" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Project State</Label>
                <Select
                  value={manageModal?.projectState || "Hackathon Submission"}
                  onValueChange={(value) => setManageModal(prev => prev ? { ...prev, projectState: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Hackathon Submission">Hackathon Submission</SelectItem>
                    <SelectItem value="Milestone Agreed">Milestone Agreed</SelectItem>
                    <SelectItem value="Bounty Payout">Bounty Payout</SelectItem>
                    <SelectItem value="Milestone Delivered">Milestone Delivered</SelectItem>
                    <SelectItem value="Abandoned">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>M2 Status</Label>
                <Select
                  value={manageModal?.m2Status || "none"}
                  onValueChange={(value) => setManageModal(prev => prev ? { ...prev, m2Status: value === "none" ? "" : value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not in M2 program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not in M2 program</SelectItem>
                    <SelectItem value="building">Building</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="bountiesProcessed"
                  checked={manageModal?.bountiesProcessed || false}
                  onCheckedChange={(checked) => setManageModal(prev => prev ? { ...prev, bountiesProcessed: checked === true } : null)}
                />
                <Label htmlFor="bountiesProcessed" className="text-sm font-normal cursor-pointer">
                  Mark bounties as processed (paid)
                </Label>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={saveProjectStatus}
                  disabled={saving === "status"}
                  className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
                >
                  {saving === "status" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  SAVE STATUS
                </button>
              </div>
            </TabsContent>

            {/* Tab 2: M2 Agreement */}
            <TabsContent value="agreement" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Agreed Features (one per line, max 20)</Label>
                <Textarea
                  value={manageModal?.agreedFeatures || ""}
                  onChange={(e) => setManageModal(prev => prev ? { ...prev, agreedFeatures: e.target.value } : null)}
                  placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  {(manageModal?.agreedFeatures || "").split('\n').filter(s => s.trim()).length}/20 features
                </p>
              </div>

              <div className="space-y-2">
                <Label>Documentation Deliverables (one per line, max 10)</Label>
                <Textarea
                  value={manageModal?.documentation || ""}
                  onChange={(e) => setManageModal(prev => prev ? { ...prev, documentation: e.target.value } : null)}
                  placeholder="README with setup instructions&#10;API documentation&#10;Architecture diagram"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {(manageModal?.documentation || "").split('\n').filter(s => s.trim()).length}/10 items
                </p>
              </div>

              <div className="space-y-2">
                <Label>Success Criteria (max 2000 chars)</Label>
                <Textarea
                  value={manageModal?.successCriteria || ""}
                  onChange={(e) => setManageModal(prev => prev ? { ...prev, successCriteria: e.target.value.slice(0, 2000) } : null)}
                  placeholder="Define measurable success criteria..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {(manageModal?.successCriteria || "").length}/2000 characters
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={saveM2Agreement}
                  disabled={saving === "agreement"}
                  className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
                >
                  {saving === "agreement" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  SAVE AGREEMENT
                </button>
              </div>
            </TabsContent>

            {/* Tab 3: Deliverables */}
            <TabsContent value="deliverables" className="space-y-4 mt-4">
              <div className="p-3 bg-muted/50 rounded-md text-sm text-muted-foreground">
                <strong>Admin Note:</strong> Saving here bypasses the Week 5-6 restriction. 
                Status will be set to "Under Review".
              </div>

              <div className="space-y-2">
                <Label>Repository URL (GitHub)</Label>
                <Input
                  value={manageModal?.repoUrl || ""}
                  onChange={(e) => setManageModal(prev => prev ? { ...prev, repoUrl: e.target.value } : null)}
                  placeholder="https://github.com/team/repo"
                />
              </div>

              <div className="space-y-2">
                <Label>Demo URL (YouTube/Loom)</Label>
                <Input
                  value={manageModal?.demoUrl || ""}
                  onChange={(e) => setManageModal(prev => prev ? { ...prev, demoUrl: e.target.value } : null)}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label>Documentation URL</Label>
                <Input
                  value={manageModal?.docsUrl || ""}
                  onChange={(e) => setManageModal(prev => prev ? { ...prev, docsUrl: e.target.value } : null)}
                  placeholder="https://docs.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Summary (10-1000 chars)</Label>
                <Textarea
                  value={manageModal?.summary || ""}
                  onChange={(e) => setManageModal(prev => prev ? { ...prev, summary: e.target.value.slice(0, 1000) } : null)}
                  placeholder="Describe what was built and how it meets the M2 agreement..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {(manageModal?.summary || "").length}/1000 characters
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={saveDeliverables}
                  disabled={saving === "deliverables"}
                  className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
                >
                  {saving === "deliverables" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  SAVE DELIVERABLES
                </button>
              </div>
            </TabsContent>

            {/* Tab 4: Payments */}
            <TabsContent value="payments" className="space-y-4 mt-4">
              <div className="p-3 bg-muted/50 rounded-md text-sm">
                <strong>Payout Address:</strong> {manageModal?.donationAddress || <span className="text-muted-foreground">Not set</span>}
              </div>

              <div className="space-y-2">
                <Label>Milestone</Label>
                <Select
                  value={manageModal?.paymentMilestone || "BOUNTY"}
                  onValueChange={(value) => setManageModal(prev => prev ? { ...prev, paymentMilestone: value as 'M1' | 'M2' | 'BOUNTY' } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M1">M1 (First milestone)</SelectItem>
                    <SelectItem value="M2">M2 (Second milestone)</SelectItem>
                    <SelectItem value="BOUNTY">BOUNTY (Prize payout)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {manageModal?.paymentMilestone === 'BOUNTY' && (
                <div className="space-y-2">
                  <Label>Bounty Name</Label>
                  <Input
                    value={manageModal?.bountyName || ""}
                    onChange={(e) => setManageModal(prev => prev ? { ...prev, bountyName: e.target.value } : null)}
                    placeholder="e.g., Polkadot main track"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    value={manageModal?.paymentAmount || 0}
                    onChange={(e) => setManageModal(prev => prev ? { ...prev, paymentAmount: Number(e.target.value) } : null)}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={manageModal?.paymentCurrency || "USDC"}
                    onValueChange={(value) => setManageModal(prev => prev ? { ...prev, paymentCurrency: value as 'USDC' | 'DOT' } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="DOT">DOT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Transaction Proof URL</Label>
                <Input
                  value={manageModal?.transactionProof || ""}
                  onChange={(e) => setManageModal(prev => prev ? { ...prev, transactionProof: e.target.value } : null)}
                  placeholder="https://polkadot.subscan.io/extrinsic/..."
                />
                <p className="text-xs text-muted-foreground">
                  Subscan URL or block explorer link showing the payment
                </p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={savePayment}
                  disabled={saving === "payment"}
                  className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
                >
                  {saving === "payment" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  CONFIRM PAYMENT
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Bulk Mark as Paid Confirmation Dialog */}
      <Dialog open={bulkMarkPaidDialog} onOpenChange={setBulkMarkPaidDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">MARK ALL AS PAID</DialogTitle>
            <DialogDescription className="text-body">
              This will mark <strong className="text-display">{unpaidCount} projects</strong> as paid (set <code className="font-mono text-display">bountiesProcessed: true</code>).
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="label-hw-dim mb-2">·PROJECTS TO BE UPDATED</p>
            <div className="max-h-48 overflow-y-auto lcd p-2">
              {unpaidProjects.slice(0, 20).map((p) => (
                <div key={p.id} className="text-sm py-1 flex justify-between">
                  <span className="text-body">{p.projectName}</span>
                  <span className="text-label-mid font-mono">{formatAmount(getTotalBounty(p), getProjectCurrency(p))}</span>
                </div>
              ))}
              {unpaidProjects.length > 20 && (
                <div className="label-hw-dim py-1">
                  … AND {unpaidProjects.length - 20} MORE
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setBulkMarkPaidDialog(false)}
              disabled={bulkUpdating}
              className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={bulkMarkAsPaid}
              disabled={bulkUpdating}
              className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
            >
              {bulkUpdating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  UPDATING…
                </>
              ) : (
                <>
                  <CheckCheck className="h-3 w-3" />
                  MARK ALL AS PAID
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
