import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { web3Enable, web3Accounts, web3FromSource } from '@polkadot/extension-dapp';
import { SiwsMessage } from '@talismn/siws';
import { generateSiwsStatement } from '@/lib/siwsUtils';

interface BountyPrize {
  name: string;
  amount: number;
  hackathonWonAtId: string;
  txHash?: string;
}

interface PayoutModalData {
  projectId: string;
  projectName: string;
  projectState: string;
  bountiesProcessed: boolean;
  txProofUrl: string;
  bountyAmount: number;
  bountyName: string;
  donationAddress: string;
}

interface WinnersTableProps {
  projects: any[];
  onRefresh: () => void;
  connectedAddress?: string;
}

type WinnerFilter = "all" | "main-track" | "bounty";

export function WinnersTable({ projects, onRefresh, connectedAddress }: WinnersTableProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [winnerFilter, setWinnerFilter] = useState<WinnerFilter>("all");
  const [payoutModal, setPayoutModal] = useState<PayoutModalData | null>(null);
  const [bulkMarkPaidDialog, setBulkMarkPaidDialog] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Helper to check if a project is a main track winner
  const isMainTrackWinner = (project: any): boolean => {
    return project.bountyPrize?.some((b: BountyPrize) => 
      b.name.toLowerCase().includes("main track")
    ) || false;
  };

  // Helper to get SIWS auth header for admin actions
  const getSiwsAuthHeader = async (): Promise<string> => {
    if (!connectedAddress) {
      throw new Error("Please connect your wallet first.");
    }
    
    await web3Enable('Hackathonia');
    const accounts = await web3Accounts();
    const account = accounts.find(a => a.address === connectedAddress) || accounts[0];
    
    // DEV MODE: If no wallet available in development, use bypass
    if (!account) {
      if (import.meta.env.DEV) {
        console.log('[DEV] Using dev-bypass auth header');
        return 'dev-bypass';
      }
      throw new Error("No wallet found. Please connect your wallet extension.");
    }
    
    const siws = new SiwsMessage({
      domain: window.location.hostname,
      uri: window.location.origin,
      address: account.address,
      nonce: Math.random().toString(36).slice(2),
      statement: generateSiwsStatement({ action: 'admin-action' }),
    });
    
    const injector = await web3FromSource(account.meta.source!);
    const signRaw = injector?.signer?.signRaw;
    if (!signRaw) throw new Error("Wallet does not support signing");
    
    const message = siws.prepareMessage();
    const { signature } = await signRaw({
      address: account.address,
      data: message,
      type: 'bytes',
    });
    
    return JSON.stringify({
      message,
      signature,
      address: account.address,
    });
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
      return <span className="text-muted-foreground">—</span>;
    }
    if (project.m2Status === 'completed') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500">Completed</Badge>;
    }
    if (project.m2Status === 'under_review') {
      return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500">Under Review</Badge>;
    }
    if (project.m2Status === 'active') {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500">Active</Badge>;
    }
    return <Badge variant="outline">{project.m2Status}</Badge>;
  };

  // Calculate total bounty amount
  const getTotalBounty = (project: any) => {
    if (!project.bountyPrize || project.bountyPrize.length === 0) return 0;
    return project.bountyPrize.reduce((sum: number, b: BountyPrize) => sum + b.amount, 0);
  };

  // Open payout modal with project data
  const openPayoutModal = (project: any) => {
    const bounty = project.bountyPrize?.[0];
    // Check if there's an existing BOUNTY payment in totalPaid
    const existingBountyPayment = project.totalPaid?.find((p: any) => p.milestone === 'BOUNTY');
    
    setPayoutModal({
      projectId: project.id,
      projectName: project.projectName,
      projectState: project.projectState || "Hackathon Submission",
      bountiesProcessed: project.bountiesProcessed || false,
      txProofUrl: existingBountyPayment?.transactionProof || bounty?.txHash || "",
      bountyAmount: getTotalBounty(project),
      bountyName: bounty?.name || "Bounty",
      donationAddress: project.donationAddress || "",
    });
  };

  // Save payout modal changes
  const savePayoutModal = async () => {
    if (!payoutModal) return;
    setSaving(payoutModal.projectId);
    
    try {
      const authHeader = await getSiwsAuthHeader();
      const project = projects.find(p => p.id === payoutModal.projectId);
      if (!project) throw new Error("Project not found");
      
      // Build update data
      const updateData: Record<string, any> = {
        projectState: payoutModal.projectState,
        bountiesProcessed: payoutModal.bountiesProcessed,
      };

      // Update donation address if changed
      if (payoutModal.donationAddress !== project.donationAddress) {
        updateData.donationAddress = payoutModal.donationAddress;
      }

      // Update bounty amount if changed
      const currentAmount = getTotalBounty(project);
      if (payoutModal.bountyAmount !== currentAmount && project.bountyPrize?.length > 0) {
        const updatedBounties = [...project.bountyPrize];
        updatedBounties[0] = {
          ...updatedBounties[0],
          amount: payoutModal.bountyAmount,
        };
        updateData.bountyPrize = updatedBounties;
      }

      // Update project details
      await api.updateProjectDetails(payoutModal.projectId, updateData, authHeader);

      // If marking as paid with TX proof, add BOUNTY entry to totalPaid
      const existingBountyPayment = project.totalPaid?.find((p: any) => p.milestone === 'BOUNTY');
      if (payoutModal.bountiesProcessed && payoutModal.txProofUrl && !existingBountyPayment) {
        await api.confirmPayment(payoutModal.projectId, {
          milestone: 'BOUNTY',
          amount: payoutModal.bountyAmount,
          currency: 'USDC',
          transactionProof: payoutModal.txProofUrl,
          bountyName: payoutModal.bountyName,
        }, authHeader);
      }
      
      toast({
        title: "Project updated",
        description: `${payoutModal.projectName} has been updated`,
      });
      setPayoutModal(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Failed to update",
        description: error.message || "Could not update project",
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
      const authHeader = await getSiwsAuthHeader();
      
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
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No winning projects found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Filter Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <div className="flex gap-1">
            <Button
              variant={winnerFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setWinnerFilter("all")}
            >
              All ({winnerProjects.length})
            </Button>
            <Button
              variant={winnerFilter === "main-track" ? "default" : "outline"}
              size="sm"
              onClick={() => setWinnerFilter("main-track")}
            >
              Main Track ({mainTrackCount})
            </Button>
            <Button
              variant={winnerFilter === "bounty" ? "default" : "outline"}
              size="sm"
              onClick={() => setWinnerFilter("bounty")}
            >
              Other Bounties ({bountyCount})
            </Button>
          </div>
        </div>
        
        {/* Bulk Actions */}
        {connectedAddress && unpaidCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkMarkPaidDialog(true)}
            className="gap-1"
          >
            <CheckCheck className="h-4 w-4" />
            Mark All as Paid ({unpaidCount})
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className={connectedAddress ? "w-[18%]" : "w-[22%]"}>Project</TableHead>
                <TableHead className={connectedAddress ? "w-[12%]" : "w-[15%]"}>Event</TableHead>
                <TableHead className={connectedAddress ? "w-[20%]" : "w-[24%]"}>Track/Bounty</TableHead>
                <TableHead className={connectedAddress ? "w-[10%]" : "w-[12%]"}>Amount</TableHead>
                <TableHead className={connectedAddress ? "w-[10%]" : "w-[12%]"}>M2 Status</TableHead>
                <TableHead className={connectedAddress ? "w-[10%]" : "w-[15%]"}>Payment</TableHead>
                {connectedAddress && <TableHead className="w-[20%] text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProjects.map((project) => {
                const totalBounty = getTotalBounty(project);
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

                    {/* Amount */}
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-semibold">${totalBounty.toLocaleString()}</p>
                        {project.bountyPrize.length > 1 && (
                          <div className="text-xs text-muted-foreground">
                            {project.bountyPrize.map((b: BountyPrize, idx: number) => (
                              <div key={idx}>${b.amount.toLocaleString()}</div>
                            ))}
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(`/m2-program/${project.id}`, '_blank')}
                            title="View project"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8"
                            onClick={() => openPayoutModal(project)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Settings className="h-4 w-4 mr-1" />
                                Manage
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Unified Payout Management Modal */}
      <Dialog open={!!payoutModal} onOpenChange={() => setPayoutModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Payout</DialogTitle>
            <DialogDescription>
              Update payout details for <strong>{payoutModal?.projectName}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Project State Dropdown */}
            <div className="space-y-2">
              <Label>Project State</Label>
              <Select
                value={payoutModal?.projectState || "Hackathon Submission"}
                onValueChange={(value) => setPayoutModal(prev => prev ? { ...prev, projectState: value } : null)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hackathon Submission">Hackathon Submission</SelectItem>
                  <SelectItem value="Bounty Payout">Bounty Payout</SelectItem>
                  <SelectItem value="Milestone Delivered">Milestone Delivered</SelectItem>
                  <SelectItem value="Abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bounty Amount (editable) */}
            <div className="space-y-2">
              <Label>Bounty Amount (USD)</Label>
              <Input
                type="number"
                value={payoutModal?.bountyAmount || 0}
                onChange={(e) => setPayoutModal(prev => prev ? { ...prev, bountyAmount: Number(e.target.value) } : null)}
              />
              <p className="text-xs text-muted-foreground">
                Prize: {payoutModal?.bountyName}
              </p>
            </div>

            {/* Donation Address */}
            <div className="space-y-2">
              <Label>Payout Address</Label>
              <Input
                value={payoutModal?.donationAddress || ""}
                onChange={(e) => setPayoutModal(prev => prev ? { ...prev, donationAddress: e.target.value } : null)}
                placeholder="Enter wallet address..."
              />
            </div>

            {/* TX Proof URL */}
            <div className="space-y-2">
              <Label>TX Proof URL</Label>
              <Input
                value={payoutModal?.txProofUrl || ""}
                onChange={(e) => setPayoutModal(prev => prev ? { ...prev, txProofUrl: e.target.value } : null)}
                placeholder="e.g., https://polkadot.subscan.io/extrinsic/..."
              />
              <p className="text-xs text-muted-foreground">
                Subscan URL or transaction hash for payment proof
              </p>
            </div>

            {/* Bounties Processed Checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="bountiesProcessed"
                checked={payoutModal?.bountiesProcessed || false}
                onCheckedChange={(checked) => setPayoutModal(prev => prev ? { ...prev, bountiesProcessed: checked === true } : null)}
              />
              <Label htmlFor="bountiesProcessed" className="text-sm font-normal cursor-pointer">
                Mark as paid
              </Label>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPayoutModal(null)}>
              Cancel
            </Button>
            <Button 
              onClick={savePayoutModal} 
              disabled={saving !== null}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Mark as Paid Confirmation Dialog */}
      <Dialog open={bulkMarkPaidDialog} onOpenChange={setBulkMarkPaidDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark All as Paid</DialogTitle>
            <DialogDescription>
              This will mark <strong>{unpaidCount} projects</strong> as paid (set <code>bountiesProcessed: true</code>).
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-2">Projects to be updated:</p>
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 bg-muted/30">
              {unpaidProjects.slice(0, 20).map((p) => (
                <div key={p.id} className="text-sm py-1 flex justify-between">
                  <span>{p.projectName}</span>
                  <span className="text-muted-foreground">${getTotalBounty(p).toLocaleString()}</span>
                </div>
              ))}
              {unpaidProjects.length > 20 && (
                <div className="text-sm text-muted-foreground py-1">
                  ... and {unpaidProjects.length - 20} more
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkMarkPaidDialog(false)} disabled={bulkUpdating}>
              Cancel
            </Button>
            <Button onClick={bulkMarkAsPaid} disabled={bulkUpdating}>
              {bulkUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All as Paid
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
