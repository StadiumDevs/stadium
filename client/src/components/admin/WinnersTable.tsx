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
  Edit,
  Plus,
  Trophy,
  Loader2,
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

interface WinnersTableProps {
  projects: any[];
  onRefresh: () => void;
  connectedAddress?: string;
}

export function WinnersTable({ projects, onRefresh, connectedAddress }: WinnersTableProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);
  const [editingTxHash, setEditingTxHash] = useState<{ projectId: string; bountyIndex: number; txHash: string } | null>(null);
  const [editingBounty, setEditingBounty] = useState<{ projectId: string; bountyIndex: number; bounty: BountyPrize } | null>(null);
  const [addingBounty, setAddingBounty] = useState<{ projectId: string } | null>(null);
  const [newBounty, setNewBounty] = useState<BountyPrize>({ name: "", amount: 0, hackathonWonAtId: "" });

  // Helper to get SIWS auth header
  const getSiwsAuthHeader = async (action: string): Promise<string> => {
    if (!connectedAddress) {
      throw new Error("Please connect your wallet first.");
    }
    
    await web3Enable('Hackathonia');
    const accounts = await web3Accounts();
    const account = accounts.find(a => a.address === connectedAddress) || accounts[0];
    if (!account) throw new Error("No wallet found");
    
    const siws = new SiwsMessage({
      domain: window.location.hostname,
      uri: window.location.origin,
      address: account.address,
      nonce: Math.random().toString(36).slice(2),
      statement: generateSiwsStatement({ action }),
      chainId: 'polkadot:91b171bb158e2d3848fa23a9f1c25182',
      issuedAt: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
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

  // Filter: show projects with bountyPrize OR m2Status (winners)
  const winnerProjects = (projects || []).filter(p => 
    (p.bountyPrize && p.bountyPrize.length > 0) || p.m2Status
  );

  // Sort: by event date (newest first), then M2 first
  const sortedProjects = [...winnerProjects].sort((a, b) => {
    // First sort by event date (newest first)
    const dateA = a.hackathon?.eventStartedAt ? new Date(a.hackathon.eventStartedAt).getTime() : 0;
    const dateB = b.hackathon?.eventStartedAt ? new Date(b.hackathon.eventStartedAt).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    
    // Then by type (M2 first)
    const typeA = a.m2Status ? 0 : 1;
    const typeB = b.m2Status ? 0 : 1;
    return typeA - typeB;
  });

  // Determine winner type
  const getWinnerType = (project: any) => {
    if (project.m2Status) {
      return { label: "M2 Winner", variant: "default" as const };
    }
    return { label: "Bounty", variant: "secondary" as const };
  };

  // Get status badge
  const getStatusBadge = (project: any) => {
    if (project.m2Status === 'completed') {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500">Completed</Badge>;
    }
    if (project.m2Status === 'under_review') {
      return <Badge className="bg-orange-500/10 text-orange-500 border-orange-500">Under Review</Badge>;
    }
    if (project.m2Status === 'building') {
      return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500">Building</Badge>;
    }
    if (project.bountiesProcessed) {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500">Paid</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
  };

  // Calculate total bounty amount
  const getTotalBounty = (project: any) => {
    if (!project.bountyPrize || project.bountyPrize.length === 0) return 0;
    return project.bountyPrize.reduce((sum: number, b: BountyPrize) => sum + b.amount, 0);
  };

  // Toggle bountiesProcessed
  const togglePaymentStatus = async (project: any) => {
    setSaving(project.id);
    try {
      const authHeader = await getSiwsAuthHeader("toggle payment status");
      await api.updateProjectDetails(project.id, {
        bountiesProcessed: !project.bountiesProcessed,
      }, authHeader);
      toast({
        title: "Payment status updated",
        description: project.bountiesProcessed ? "Marked as unpaid" : "Marked as paid",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Failed to update",
        description: error.message || "Could not update payment status",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Update project state
  const updateProjectState = async (projectId: string, newState: string) => {
    setSaving(projectId);
    try {
      const authHeader = await getSiwsAuthHeader("update project state");
      await api.updateProjectDetails(projectId, {
        projectState: newState,
      }, authHeader);
      toast({
        title: "Project state updated",
        description: `State changed to ${newState}`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Failed to update",
        description: error.message || "Could not update project state",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Save TX hash
  const saveTxHash = async () => {
    if (!editingTxHash) return;
    setSaving(editingTxHash.projectId);
    
    try {
      const authHeader = await getSiwsAuthHeader("add transaction hash");
      const project = projects.find(p => p.id === editingTxHash.projectId);
      if (!project) throw new Error("Project not found");
      
      const updatedBounties = [...(project.bountyPrize || [])];
      updatedBounties[editingTxHash.bountyIndex] = {
        ...updatedBounties[editingTxHash.bountyIndex],
        txHash: editingTxHash.txHash,
      };
      
      await api.updateProjectDetails(editingTxHash.projectId, {
        bountyPrize: updatedBounties,
      }, authHeader);
      
      toast({
        title: "TX hash saved",
        description: "Transaction hash has been recorded",
      });
      setEditingTxHash(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message || "Could not save TX hash",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Save bounty edit
  const saveBountyEdit = async () => {
    if (!editingBounty) return;
    setSaving(editingBounty.projectId);
    
    try {
      const authHeader = await getSiwsAuthHeader("edit bounty prize");
      const project = projects.find(p => p.id === editingBounty.projectId);
      if (!project) throw new Error("Project not found");
      
      const updatedBounties = [...(project.bountyPrize || [])];
      updatedBounties[editingBounty.bountyIndex] = editingBounty.bounty;
      
      await api.updateProjectDetails(editingBounty.projectId, {
        bountyPrize: updatedBounties,
      }, authHeader);
      
      toast({
        title: "Bounty updated",
        description: "Prize details have been saved",
      });
      setEditingBounty(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Failed to save",
        description: error.message || "Could not save bounty",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  // Add new bounty
  const addBountyToProject = async () => {
    if (!addingBounty || !newBounty.name || !newBounty.amount) return;
    setSaving(addingBounty.projectId);
    
    try {
      const authHeader = await getSiwsAuthHeader("add bounty prize");
      const project = projects.find(p => p.id === addingBounty.projectId);
      if (!project) throw new Error("Project not found");
      
      const updatedBounties = [
        ...(project.bountyPrize || []),
        {
          ...newBounty,
          hackathonWonAtId: newBounty.hackathonWonAtId || project.hackathon?.id || "",
        },
      ];
      
      await api.updateProjectDetails(addingBounty.projectId, {
        bountyPrize: updatedBounties,
      }, authHeader);
      
      toast({
        title: "Bounty added",
        description: `Added ${newBounty.name} prize`,
      });
      setAddingBounty(null);
      setNewBounty({ name: "", amount: 0, hackathonWonAtId: "" });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Failed to add",
        description: error.message || "Could not add bounty",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
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
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className={connectedAddress ? "w-[20%]" : "w-[25%]"}>Project</TableHead>
                <TableHead className={connectedAddress ? "w-[12%]" : "w-[15%]"}>Event</TableHead>
                <TableHead className={connectedAddress ? "w-[10%]" : "w-[12%]"}>Type</TableHead>
                <TableHead className={connectedAddress ? "w-[10%]" : "w-[12%]"}>Status</TableHead>
                <TableHead className={connectedAddress ? "w-[15%]" : "w-[20%]"}>Amount</TableHead>
                <TableHead className={connectedAddress ? "w-[10%]" : "w-[16%]"}>Payment</TableHead>
                {connectedAddress && <TableHead className="w-[23%] text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProjects.map((project) => {
                const type = getWinnerType(project);
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

                    {/* Type */}
                    <TableCell>
                      <Badge variant={type.variant}>{type.label}</Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {getStatusBadge(project)}
                    </TableCell>

                    {/* Amount */}
                    <TableCell>
                      <div className="space-y-1">
                        {project.bountyPrize && project.bountyPrize.length > 0 ? (
                          <>
                            <p className="font-semibold">${totalBounty.toLocaleString()}</p>
                            {project.bountyPrize.map((b: BountyPrize, idx: number) => (
                              <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                                <span>{b.name}: ${b.amount.toLocaleString()}</span>
                                {connectedAddress && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5"
                                    onClick={() => setEditingBounty({ 
                                      projectId: project.id, 
                                      bountyIndex: idx, 
                                      bounty: { ...b } 
                                    })}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">No bounty</p>
                        )}
                        {connectedAddress && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => setAddingBounty({ projectId: project.id })}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Prize
                          </Button>
                        )}
                      </div>
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
                      {project.bountyPrize?.some((b: BountyPrize) => b.txHash) && (
                        <div className="mt-1">
                          {project.bountyPrize.map((b: BountyPrize, idx: number) => 
                            b.txHash && (
                              <a
                                key={idx}
                                href={b.txHash.startsWith('http') ? b.txHash : `https://polkadot.subscan.io/extrinsic/${b.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                TX <ExternalLink className="h-3 w-3" />
                              </a>
                            )
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* Actions - only show when wallet connected */}
                    {connectedAddress && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
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
                            variant={project.bountiesProcessed ? "outline" : "default"}
                            size="sm"
                            className="h-8"
                            onClick={() => togglePaymentStatus(project)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : project.bountiesProcessed ? (
                              "Mark Unpaid"
                            ) : (
                              "Mark Paid"
                            )}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => {
                              const bounty = project.bountyPrize?.[0];
                              setEditingTxHash({
                                projectId: project.id,
                                bountyIndex: 0,
                                txHash: bounty?.txHash || "",
                              });
                            }}
                          >
                            Add TX
                          </Button>

                          <Select
                            value={project.projectState || "Hackathon Submission"}
                            onValueChange={(value) => updateProjectState(project.id, value)}
                            disabled={isSaving}
                          >
                            <SelectTrigger className="h-8 w-[140px]">
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
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* TX Hash Dialog */}
      <Dialog open={!!editingTxHash} onOpenChange={() => setEditingTxHash(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction Hash</DialogTitle>
            <DialogDescription>
              Enter the transaction hash or Subscan URL for this payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>TX Hash or URL</Label>
              <Input
                value={editingTxHash?.txHash || ""}
                onChange={(e) => setEditingTxHash(prev => prev ? { ...prev, txHash: e.target.value } : null)}
                placeholder="e.g., 0x... or https://polkadot.subscan.io/extrinsic/..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTxHash(null)}>Cancel</Button>
            <Button onClick={saveTxHash} disabled={saving !== null}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bounty Dialog */}
      <Dialog open={!!editingBounty} onOpenChange={() => setEditingBounty(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Prize</DialogTitle>
            <DialogDescription>
              Update the prize details for this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Prize Name</Label>
              <Input
                value={editingBounty?.bounty.name || ""}
                onChange={(e) => setEditingBounty(prev => prev ? { 
                  ...prev, 
                  bounty: { ...prev.bounty, name: e.target.value } 
                } : null)}
                placeholder="e.g., Best DeFi Project"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                value={editingBounty?.bounty.amount || 0}
                onChange={(e) => setEditingBounty(prev => prev ? { 
                  ...prev, 
                  bounty: { ...prev.bounty, amount: Number(e.target.value) } 
                } : null)}
                placeholder="1000"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBounty(null)}>Cancel</Button>
            <Button onClick={saveBountyEdit} disabled={saving !== null}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bounty Dialog */}
      <Dialog open={!!addingBounty} onOpenChange={() => setAddingBounty(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Prize</DialogTitle>
            <DialogDescription>
              Add a new prize/bounty to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Prize Name</Label>
              <Input
                value={newBounty.name}
                onChange={(e) => setNewBounty(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Best DeFi Project"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input
                type="number"
                value={newBounty.amount || ""}
                onChange={(e) => setNewBounty(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="1000"
              />
            </div>
            <div className="space-y-2">
              <Label>Hackathon ID (optional)</Label>
              <Input
                value={newBounty.hackathonWonAtId}
                onChange={(e) => setNewBounty(prev => ({ ...prev, hackathonWonAtId: e.target.value }))}
                placeholder="e.g., synergy-2025"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddingBounty(null); setNewBounty({ name: "", amount: 0, hackathonWonAtId: "" }); }}>
              Cancel
            </Button>
            <Button onClick={addBountyToProject} disabled={saving !== null || !newBounty.name || !newBounty.amount}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Prize
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
