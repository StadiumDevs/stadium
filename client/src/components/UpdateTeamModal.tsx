import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface TeamMember {
  name: string;
  wallet: string;
  role?: string;
  twitter?: string;
  github?: string;
  linkedin?: string;
}

interface UpdateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  initialMembers: TeamMember[];
  initialPayoutAddress: string;
  onSubmit: (data: { members: TeamMember[]; payoutAddress: string }) => Promise<void>;
}

export function UpdateTeamModal({
  open,
  onOpenChange,
  projectId,
  initialMembers,
  initialPayoutAddress,
  onSubmit
}: UpdateTeamModalProps) {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [payoutAddress, setPayoutAddress] = useState(initialPayoutAddress);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setMembers(initialMembers.length > 0 ? initialMembers : [{ name: '', wallet: '' }]);
      setPayoutAddress(initialPayoutAddress);
    }
  }, [open, initialMembers, initialPayoutAddress]);

  const handleAddMember = () => {
    setMembers([...members, { name: '', wallet: '' }]);
  };

  const handleRemoveMember = (index: number) => {
    if (members.length <= 1) {
      toast({
        title: "Error",
        description: "Project must have at least one team member",
        variant: "destructive",
      });
      return;
    }
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, field: 'name' | 'wallet' | 'role' | 'twitter' | 'github' | 'linkedin', value: string) => {
    const updated = [...members];
    updated[index][field] = value;
    setMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all members have a name
    const hasEmptyName = members.some(m => !m.name.trim());
    if (hasEmptyName) {
      toast({
        title: "Error",
        description: "All team members must have a name",
        variant: "destructive",
      });
      return;
    }
    
    // Validate payout address
    if (!payoutAddress.trim()) {
      toast({
        title: "Error",
        description: "Payout address is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit({ members, payoutAddress });
      toast({
        title: "Success",
        description: "Team updated successfully!",
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update team",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Team</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Members Section */}
          <div>
            <h3 className="font-medium mb-3">Team Members</h3>
            <div className="space-y-4">
              {members.map((member, index) => (
                <div key={index} className="border border-subtle rounded-lg p-4 bg-muted/30 space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`name-${index}`}>Name *</Label>
                      <Input 
                        id={`name-${index}`}
                        placeholder="Name" 
                        value={member.name}
                        onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`wallet-${index}`}>Wallet Address</Label>
                      <Input 
                        id={`wallet-${index}`}
                        placeholder="0x... (optional)" 
                        value={member.wallet}
                        onChange={(e) => handleMemberChange(index, 'wallet', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    {members.length > 1 && (
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveMember(index)}
                        aria-label="Remove team member"
                        disabled={isSubmitting}
                        className="mt-6"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`role-${index}`}>Role (optional)</Label>
                      <Input 
                        id={`role-${index}`}
                        placeholder="e.g., Developer, Designer" 
                        value={member.role || ''}
                        onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor={`twitter-${index}`}>Twitter (optional)</Label>
                      <Input 
                        id={`twitter-${index}`}
                        placeholder="@username" 
                        value={member.twitter || ''}
                        onChange={(e) => handleMemberChange(index, 'twitter', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`github-${index}`}>GitHub (optional)</Label>
                      <Input 
                        id={`github-${index}`}
                        placeholder="username" 
                        value={member.github || ''}
                        onChange={(e) => handleMemberChange(index, 'github', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`linkedin-${index}`}>LinkedIn (optional)</Label>
                      <Input 
                        id={`linkedin-${index}`}
                        placeholder="username or URL" 
                        value={member.linkedin || ''}
                        onChange={(e) => handleMemberChange(index, 'linkedin', e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              onClick={handleAddMember}
              className="mt-3"
              disabled={isSubmitting}
            >
              <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              Add Member
            </Button>
          </div>
          
          {/* Payout Address Section */}
          <div>
            <h3 className="font-medium mb-3">Payout Address</h3>
            <Input 
              placeholder="0x..."
              value={payoutAddress}
              onChange={(e) => setPayoutAddress(e.target.value)}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Wallet address to receive M2 payment ($2,000 USDC)
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

