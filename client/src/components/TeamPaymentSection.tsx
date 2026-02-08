import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface TeamMember {
  name: string;
  walletAddress?: string;
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
  totalPaid?: Payment[];
  m2Status?: 'building' | 'under_review' | 'completed';
  isTeamMember: boolean;
  isAdmin: boolean;
  isConnected: boolean;
  onSave: (data: { teamMembers: TeamMember[]; donationAddress: string }) => Promise<void>;
}

export function TeamPaymentSection({
  teamMembers = [],
  donationAddress,
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

  // Determine if user can edit
  const canEdit = isConnected && (isTeamMember || isAdmin);

  // Initialize edited values when entering edit mode or when props change
  useEffect(() => {
    if (canEdit) {
      setEditedMembers(teamMembers.length > 0 ? [...teamMembers] : [{ name: "", walletAddress: "" }]);
      setEditedPayoutAddress(donationAddress || "");
    }
  }, [canEdit, teamMembers, donationAddress]);

  // Check if there are unsaved changes
  const hasChanges = () => {
    if (!isEditing) return false;
    
    const membersChanged = JSON.stringify(editedMembers) !== JSON.stringify(teamMembers);
    const addressChanged = editedPayoutAddress !== (donationAddress || "");
    
    return membersChanged || addressChanged;
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
          role: m.role?.trim() || undefined,
          twitter: m.twitter?.trim() || undefined,
          github: m.github?.trim() || undefined,
          linkedin: m.linkedin?.trim() || undefined,
          customUrl: m.customUrl?.trim() || undefined,
        })),
        donationAddress: editedPayoutAddress.trim(),
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
    setIsEditing(false);
  };

  // Render read-only team member card
  const renderReadOnlyMember = (member: TeamMember, index: number) => (
    <Card key={member.walletAddress || index} className="bg-secondary/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{member.name}</p>
              {member.role && (
                <Badge variant="secondary" className="text-xs">
                  {member.role}
                </Badge>
              )}
            </div>
            {member.walletAddress && (
              <div className="flex items-center gap-2">
                <code className="text-xs text-muted-foreground font-mono">
                  {truncateAddress(member.walletAddress)}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => copyToClipboard(member.walletAddress!, "Wallet address")}
                >
                  {copiedAddress === member.walletAddress ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
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
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={member.customUrl.startsWith('http') ? member.customUrl : `https://${member.customUrl}`} target="_blank" rel="noopener noreferrer" title="Website">
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render editable team member card
  const renderEditableMember = (member: TeamMember, index: number) => (
    <Card key={index} className="bg-secondary/50 border-primary/20">
      <CardContent className="p-4 space-y-3">
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
            
            {/* Row 2: Wallet Address */}
            <div>
              <Label className="text-xs text-muted-foreground">Wallet Address</Label>
              <Input
                value={member.walletAddress || ""}
                onChange={(e) => updateMember(index, 'walletAddress', e.target.value)}
                placeholder="SS58 address (e.g., 5Abc...)"
                className="h-9 font-mono text-sm"
              />
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
      </CardContent>
    </Card>
  );

  return (
    <Card className="glass-panel">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team & Payment Details
          </CardTitle>
          {canEdit && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Members Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Team Members
            </h3>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={addMember}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
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
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Payment Information
          </h3>
          
          {/* Payout Address */}
          {isEditing ? (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Payout Wallet Address</Label>
              <Input
                value={editedPayoutAddress}
                onChange={(e) => setEditedPayoutAddress(e.target.value)}
                placeholder="SS58 address for receiving payments"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This address will receive M2 milestone payments
              </p>
            </div>
          ) : donationAddress ? (
            <Card className="bg-secondary/50">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  Payout Wallet Address
                </p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-sm font-mono break-all">
                    {donationAddress}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0"
                    onClick={() => copyToClipboard(donationAddress, "Payout address")}
                  >
                    {copiedAddress === donationAddress ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No payout address set. Please add one to receive M2 payments.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Payment History - Always read-only */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Payment History</p>
            
            {totalPaid && totalPaid.length > 0 ? (
              <div className="space-y-2">
                {totalPaid.map((payment, index) => (
                  <Card key={index} className="bg-secondary/30">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <Badge variant="outline" className="bg-primary/10 border-primary">
                              {payment.milestone}
                            </Badge>
                            <span className="font-semibold">
                              {payment.currency === 'DOT' 
                                ? `${payment.amount.toLocaleString()} DOT`
                                : `$${payment.amount.toLocaleString()} ${payment.currency}`}
                            </span>
                          </div>
                          {payment.paidDate && (
                            <p className="text-xs text-muted-foreground">
                              Paid: {new Date(payment.paidDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                          {payment.transactionProof && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              asChild
                            >
                              <a href={payment.transactionProof} target="_blank" rel="noopener noreferrer">
                                View on Subscan
                                <ExternalLink className="ml-1 h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No payments made yet</p>
            )}
            
            {/* M2 Pending Payment */}
            {m2Status && m2Status !== 'completed' && (
              <Card className="bg-secondary/30 border-dashed">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">M2</Badge>
                    <span className="font-semibold">$2,000 USDC</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: {
                      m2Status === 'building' ? 'Awaiting submission' :
                      m2Status === 'under_review' ? 'Under review' :
                      'Processing payment'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Save/Cancel buttons when editing */}
        {isEditing && (
          <>
            <Separator />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !hasChanges()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
