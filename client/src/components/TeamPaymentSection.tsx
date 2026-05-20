import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Wallet, 
  ExternalLink, 
  Copy, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  Twitter,
  Github,
  Linkedin,
  Globe,
  Plus,
  Trash2,
  Loader2,
  Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type WalletChain = 'substrate' | 'ethereum' | 'solana';

const CHAIN_OPTIONS: { value: WalletChain; label: string }[] = [
  { value: 'substrate', label: 'Polkadot' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'solana', label: 'Solana' },
];

const chainLabel = (chain?: WalletChain) =>
  CHAIN_OPTIONS.find((o) => o.value === (chain || 'substrate'))?.label ?? 'Polkadot';

interface TeamMember {
  name: string;
  walletAddress?: string;
  walletChain?: WalletChain;
  role?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
  customUrl?: string;
}

interface Payment {
  milestone: 'M1' | 'M2';
  amount: number;
  currency: 'USDC' | 'DOT';
  transactionProof?: string;
  paidDate?: string;
}

interface TeamPaymentSectionProps {
  teamMembers?: TeamMember[];
  donationAddress?: string;
  donationChain?: WalletChain;
  totalPaid?: Payment[];
  m2Status?: 'building' | 'under_review' | 'completed';
  isTeamMember: boolean;
  isAdmin: boolean;
  isConnected: boolean;
  onSave: (data: {
    teamMembers: TeamMember[];
    donationAddress: string;
    donationChain: WalletChain;
  }) => Promise<void>;
}

export function TeamPaymentSection({
  teamMembers = [],
  donationAddress,
  donationChain = 'substrate',
  totalPaid = [],
  m2Status,
  isTeamMember,
  isAdmin,
  isConnected,
  onSave,
}: TeamPaymentSectionProps) {
  const { toast } = useToast();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editable state
  const [editedMembers, setEditedMembers] = useState<TeamMember[]>([]);
  const [editedPayoutAddress, setEditedPayoutAddress] = useState("");
  const [editedPayoutChain, setEditedPayoutChain] = useState<WalletChain>('substrate');

  // Determine if user can edit
  const canEdit = isConnected && (isTeamMember || isAdmin);

  // Initialize edited values when entering edit mode or when props change
  useEffect(() => {
    if (canEdit) {
      setEditedMembers(teamMembers.length > 0 ? [...teamMembers] : [{ name: "", walletAddress: "" }]);
      setEditedPayoutAddress(donationAddress || "");
      setEditedPayoutChain(donationChain);
    }
  }, [canEdit, teamMembers, donationAddress, donationChain]);

  // Check if there are unsaved changes
  const hasChanges = () => {
    if (!isEditing) return false;

    const membersChanged = JSON.stringify(editedMembers) !== JSON.stringify(teamMembers);
    const addressChanged = editedPayoutAddress !== (donationAddress || "");
    const chainChanged = editedPayoutChain !== donationChain;

    return membersChanged || addressChanged || chainChanged;
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const copyToClipboard = async (text: string, label: string = "Address") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(text);
      toast({
        title: "Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatSocialLink = (link: string, platform: string): string => {
    if (!link) return '';
    
    if (link.startsWith('http://') || link.startsWith('https://')) {
      return link;
    }
    
    if (platform === 'twitter') {
      const username = link.startsWith('@') ? link.slice(1) : link;
      return `https://twitter.com/${username}`;
    }
    
    if (platform === 'github') {
      const username = link.replace(/^github\.com\//, '');
      return `https://github.com/${username}`;
    }
    
    if (platform === 'linkedin') {
      const path = link.replace(/^linkedin\.com\//, '');
      return `https://linkedin.com/${path}`;
    }
    
    return link;
  };

  // Team member editing functions
  const updateMember = (index: number, field: keyof TeamMember, value: string) => {
    setEditedMembers(prev => prev.map((m, i) =>
      i === index ? { ...m, [field]: value } : m
    ));
  };

  const updateMemberChain = (index: number, chain: WalletChain) => {
    setEditedMembers(prev => prev.map((m, i) =>
      i === index ? { ...m, walletChain: chain } : m
    ));
  };

  const addMember = () => {
    setEditedMembers(prev => [...prev, { name: "", walletAddress: "" }]);
  };

  const removeMember = (index: number) => {
    if (editedMembers.length > 1) {
      setEditedMembers(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    // Validate at least one member has a name
    const validMembers = editedMembers.filter(m => m.name.trim());
    if (validMembers.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one team member with a name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        teamMembers: validMembers.map(m => ({
          name: m.name.trim(),
          walletAddress: m.walletAddress?.trim() || undefined,
          walletChain: m.walletChain || 'substrate',
          role: m.role?.trim() || undefined,
          twitter: m.twitter?.trim() || undefined,
          github: m.github?.trim() || undefined,
          linkedin: m.linkedin?.trim() || undefined,
          customUrl: m.customUrl?.trim() || undefined,
        })),
        donationAddress: editedPayoutAddress.trim(),
        donationChain: editedPayoutChain,
      });
      
      toast({
        title: "Changes saved successfully",
        description: "Team and payment information has been updated",
      });
      setIsEditing(false);
    } catch (error) {
      // Error toast is handled by the parent component
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setEditedMembers(teamMembers.length > 0 ? [...teamMembers] : [{ name: "", walletAddress: "" }]);
    setEditedPayoutAddress(donationAddress || "");
    setEditedPayoutChain(donationChain);
    setIsEditing(false);
  };

  // Render read-only team member card
  const renderReadOnlyMember = (member: TeamMember, index: number) => (
    <div key={member.walletAddress || index} className="lcd p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-mono text-sm font-bold text-display">{member.name}</p>
              {member.role && (
                <span className="border border-hairline text-label-mid px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase">
                  {member.role}
                </span>
              )}
            </div>
            {member.walletAddress && (
              <div className="flex items-center gap-2">
                <code className="text-xs text-label-dim font-mono">
                  {truncateAddress(member.walletAddress)}
                </code>
                <span className="border border-hairline text-label-mid px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase">
                  {chainLabel(member.walletChain)}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(member.walletAddress!, "Wallet address")}
                  className="text-label-mid hover:text-display p-1"
                  aria-label="Copy wallet address"
                >
                  {copiedAddress === member.walletAddress ? (
                    <CheckCircle2 className="h-3 w-3 text-led" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
              </div>
            )}
            {/* Social Links */}
            {(member.twitter || member.github || member.linkedin || member.customUrl) && (
              <div className="flex gap-2 mt-2">
                {member.twitter && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={formatSocialLink(member.twitter, 'twitter')} target="_blank" rel="noopener noreferrer" title="Twitter">
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {member.github && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={formatSocialLink(member.github, 'github')} target="_blank" rel="noopener noreferrer" title="GitHub">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {member.linkedin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={formatSocialLink(member.linkedin, 'linkedin')} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {member.customUrl && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-label-mid hover:text-display" asChild>
                    <a href={member.customUrl.startsWith('http') ? member.customUrl : `https://${member.customUrl}`} target="_blank" rel="noopener noreferrer" title="Website">
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
    </div>
  );

  // Render editable team member card
  const renderEditableMember = (member: TeamMember, index: number) => (
    <div key={index} className="lcd p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 grid gap-3">
            {/* Row 1: Name and Role */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Name *</Label>
                <Input
                  value={member.name}
                  onChange={(e) => updateMember(index, 'name', e.target.value)}
                  placeholder="Team member name"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Input
                  value={member.role || ""}
                  onChange={(e) => updateMember(index, 'role', e.target.value)}
                  placeholder="e.g., Developer"
                  className="h-9"
                />
              </div>
            </div>
            
            {/* Row 2: Wallet Address + chain */}
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Wallet Address</Label>
                <Input
                  value={member.walletAddress || ""}
                  onChange={(e) => updateMember(index, 'walletAddress', e.target.value)}
                  placeholder="Wallet address"
                  className="h-9 font-mono text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Chain</Label>
                <Select
                  value={member.walletChain || 'substrate'}
                  onValueChange={(v) => updateMemberChain(index, v as WalletChain)}
                >
                  <SelectTrigger className="h-9 w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAIN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Row 3: Social Links */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Twitter className="h-3 w-3" /> Twitter
                </Label>
                <Input
                  value={member.twitter || ""}
                  onChange={(e) => updateMember(index, 'twitter', e.target.value)}
                  placeholder="@username"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Github className="h-3 w-3" /> GitHub
                </Label>
                <Input
                  value={member.github || ""}
                  onChange={(e) => updateMember(index, 'github', e.target.value)}
                  placeholder="username"
                  className="h-9"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Linkedin className="h-3 w-3" /> LinkedIn
                </Label>
                <Input
                  value={member.linkedin || ""}
                  onChange={(e) => updateMember(index, 'linkedin', e.target.value)}
                  placeholder="in/username"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Website
                </Label>
                <Input
                  value={member.customUrl || ""}
                  onChange={(e) => updateMember(index, 'customUrl', e.target.value)}
                  placeholder="https://..."
                  className="h-9"
                />
              </div>
            </div>
          </div>
          
          {/* Remove button */}
          {editedMembers.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => removeMember(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
    </div>
  );

  return (
    <Card className="panel">
      <CardHeader className="pb-3 border-b border-hairline-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-label-mid" aria-hidden="true" />
            <span className="label-hw text-display">·TEAM & PAYMENT DETAILS</span>
          </div>
          {canEdit && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
            >
              EDIT
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Members Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="label-hw text-display">·TEAM MEMBERS</span>
            {isEditing && (
              <button
                type="button"
                onClick={addMember}
                className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5 inline-flex items-center gap-1.5"
              >
                <Plus className="h-3 w-3" /> ADD MEMBER
              </button>
            )}
          </div>
          
          {/* Team Member Cards */}
          <div className="grid gap-3">
            {isEditing ? (
              editedMembers.map((member, index) => renderEditableMember(member, index))
            ) : (
              teamMembers.length > 0 ? (
                teamMembers.map((member, index) => renderReadOnlyMember(member, index))
              ) : (
                <p className="text-sm text-muted-foreground">No team members listed</p>
              )
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Payment Information Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-3.5 w-3.5 text-label-mid" aria-hidden="true" />
            <span className="label-hw text-display">·PAYMENT INFORMATION</span>
          </div>
          
          {/* Payout Address */}
          {isEditing ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Payout Wallet Address</Label>
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Input
                  value={editedPayoutAddress}
                  onChange={(e) => setEditedPayoutAddress(e.target.value)}
                  placeholder="Address for receiving payments"
                  className="font-mono text-sm"
                />
                <Select
                  value={editedPayoutChain}
                  onValueChange={(v) => setEditedPayoutChain(v as WalletChain)}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHAIN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                This address will receive M2 milestone payments. Automated payouts
                run on Polkadot; other chains are settled manually.
              </p>
            </div>
          ) : donationAddress ? (
            <div className="lcd p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="label-hw-dim">PAYOUT WALLET ADDRESS</span>
                <span className="border border-hairline text-label-mid px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase">
                  {chainLabel(donationChain)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono text-display break-all">
                  {donationAddress}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(donationAddress, "Payout address")}
                  className="text-label-mid hover:text-display flex-shrink-0 p-1.5"
                  aria-label="Copy payout address"
                >
                  {copiedAddress === donationAddress ? (
                    <CheckCircle2 className="h-4 w-4 text-led" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="lcd p-3 border-destructive flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <div className="label-hw text-destructive mb-1">·NO PAYOUT ADDRESS</div>
                <p className="text-body text-sm">Please add one to receive M2 payments.</p>
              </div>
            </div>
          )}
          
          {/* Payment History - Always read-only */}
          <div className="space-y-2">
            <span className="label-hw text-display">·PAYMENT HISTORY</span>

            {totalPaid && totalPaid.length > 0 ? (
              <div className="space-y-2">
                {totalPaid.map((payment, index) => (
                  <div key={index} className="lcd p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CheckCircle2 className="h-4 w-4 text-led" />
                          <span className="bg-display text-shell px-2 py-[2px] font-mono text-[10px] font-bold tracking-[0.12em]">
                            {payment.milestone}
                          </span>
                          <span className="font-mono text-sm font-bold text-display tabular-nums">
                            {payment.currency === 'DOT'
                              ? `${payment.amount.toLocaleString()} DOT`
                              : `$${payment.amount.toLocaleString()} ${payment.currency}`}
                          </span>
                        </div>
                        {payment.paidDate && (
                          <p className="label-hw-dim">
                            PAID · {new Date(payment.paidDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }).toUpperCase()}
                          </p>
                        )}
                        {payment.transactionProof && (
                          <a
                            href={payment.transactionProof}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="label-hw-dim hover:text-display inline-flex items-center gap-1"
                          >
                            VIEW ON SUBSCAN <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="label-hw-dim">No payments made yet</p>
            )}

            {/* M2 Pending Payment */}
            {m2Status && m2Status !== 'completed' && (
              <div className="lcd p-3 border-dashed">
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock className="h-4 w-4 text-label-mid" />
                  <span className="border border-display text-display px-2 py-[1px] font-mono text-[10px] font-bold tracking-[0.12em]">
                    M2
                  </span>
                  <span className="font-mono text-sm font-bold text-display tabular-nums">$2,000 USDC</span>
                </div>
                <p className="label-hw-dim mt-1">
                  STATUS · {(m2Status === 'building' ? 'Awaiting submission' :
                    m2Status === 'under_review' ? 'Under review' :
                    'Processing payment').toUpperCase()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Save/Cancel buttons when editing */}
        {isEditing && (
          <>
            <Separator />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasChanges()}
                className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:bg-panel-deep disabled:text-label-dim disabled:border-hairline disabled:cursor-not-allowed px-4 py-1.5 inline-flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> SAVING…
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3" /> SAVE CHANGES
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
