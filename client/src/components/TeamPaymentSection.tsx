import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Wallet, 
  Edit, 
  ExternalLink, 
  Copy, 
  CheckCircle2,
  Clock,
  AlertTriangle,
  Twitter,
  Github,
  Linkedin,
  Globe
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
  onEditTeam: () => void;
  onUpdatePayout: () => void;
}

export function TeamPaymentSection({
  teamMembers = [],
  donationAddress,
  totalPaid = [],
  m2Status,
  isTeamMember,
  isAdmin,
  onEditTeam,
  onUpdatePayout,
}: TeamPaymentSectionProps) {
  const { toast } = useToast();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

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
    
    // If already a full URL, return as is
    if (link.startsWith('http://') || link.startsWith('https://')) {
      return link;
    }
    
    // Handle Twitter username format
    if (platform === 'twitter') {
      const username = link.startsWith('@') ? link.slice(1) : link;
      return `https://twitter.com/${username}`;
    }
    
    // Handle GitHub username
    if (platform === 'github') {
      const username = link.replace(/^github\.com\//, '');
      return `https://github.com/${username}`;
    }
    
    // Handle LinkedIn
    if (platform === 'linkedin') {
      const path = link.replace(/^linkedin\.com\//, '');
      return `https://linkedin.com/${path}`;
    }
    
    return link;
  };

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team & Payment Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Members Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Team Members
            </h3>
            {(isTeamMember || isAdmin) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditTeam}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Team
              </Button>
            )}
          </div>
          
          {/* Team Member Cards */}
          <div className="grid gap-3">
            {teamMembers.length > 0 ? (
              teamMembers.map((member, index) => (
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
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                asChild
                              >
                                <a 
                                  href={formatSocialLink(member.twitter, 'twitter')} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  title="Twitter"
                                >
                                  <Twitter className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {member.github && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                asChild
                              >
                                <a 
                                  href={formatSocialLink(member.github, 'github')} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  title="GitHub"
                                >
                                  <Github className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {member.linkedin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                asChild
                              >
                                <a 
                                  href={formatSocialLink(member.linkedin, 'linkedin')} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  title="LinkedIn"
                                >
                                  <Linkedin className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            {member.customUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                asChild
                              >
                                <a 
                                  href={member.customUrl.startsWith('http') ? member.customUrl : `https://${member.customUrl}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  title="Website"
                                >
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
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No team members listed</p>
            )}
          </div>
        </div>
        
        <Separator />
        
        {/* Payment Information Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Payment Information
            </h3>
            {(isTeamMember || isAdmin) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUpdatePayout}
              >
                <Edit className="mr-2 h-4 w-4" />
                Update Address
              </Button>
            )}
          </div>
          
          {/* Payout Address */}
          {donationAddress ? (
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
          
          {/* Payment History */}
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
      </CardContent>
    </Card>
  );
}

