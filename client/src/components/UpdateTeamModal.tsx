import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
    } catch {
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
          <DialogTitle className="font-display tracking-tight">UPDATE TEAM</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Members Section */}
          <div>
            <h3 className="label-hw text-display mb-3">·TEAM MEMBERS</h3>
            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={index} className="lcd p-4 space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`name-${index}`} className="label-hw-dim">NAME *</Label>
                      <Input
                        id={`name-${index}`}
                        placeholder="Name"
                        value={member.name}
                        onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`wallet-${index}`} className="label-hw-dim">WALLET ADDRESS</Label>
                      <Input
                        id={`wallet-${index}`}
                        placeholder="0x… (optional)"
                        value={member.wallet}
                        onChange={(e) => handleMemberChange(index, 'wallet', e.target.value)}
                        disabled={isSubmitting}
                        className="font-mono text-sm"
                      />
                    </div>
                    {members.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(index)}
                        aria-label="Remove team member"
                        disabled={isSubmitting}
                        className="mt-6 inline-flex items-center justify-center border border-hairline text-label-mid hover:text-destructive hover:bg-panel-deep w-9 h-9 flex-shrink-0 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`role-${index}`} className="label-hw-dim">ROLE (OPTIONAL)</Label>
                      <Input
                        id={`role-${index}`}
                        placeholder="e.g., Developer, Designer"
                        value={member.role || ''}
                        onChange={(e) => handleMemberChange(index, 'role', e.target.value)}
                        disabled={isSubmitting}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor={`twitter-${index}`} className="label-hw-dim">TWITTER</Label>
                      <Input
                        id={`twitter-${index}`}
                        placeholder="@username"
                        value={member.twitter || ''}
                        onChange={(e) => handleMemberChange(index, 'twitter', e.target.value)}
                        disabled={isSubmitting}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`github-${index}`} className="label-hw-dim">GITHUB</Label>
                      <Input
                        id={`github-${index}`}
                        placeholder="username"
                        value={member.github || ''}
                        onChange={(e) => handleMemberChange(index, 'github', e.target.value)}
                        disabled={isSubmitting}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`linkedin-${index}`} className="label-hw-dim">LINKEDIN</Label>
                      <Input
                        id={`linkedin-${index}`}
                        placeholder="username or URL"
                        value={member.linkedin || ''}
                        onChange={(e) => handleMemberChange(index, 'linkedin', e.target.value)}
                        disabled={isSubmitting}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddMember}
              disabled={isSubmitting}
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
            >
              <Plus className="w-3 h-3" aria-hidden="true" />
              ADD MEMBER
            </button>
          </div>

          {/* Payout Address Section */}
          <div>
            <h3 className="label-hw text-display mb-3">·PAYOUT ADDRESS</h3>
            <Input
              placeholder="0x…"
              value={payoutAddress}
              onChange={(e) => setPayoutAddress(e.target.value)}
              required
              disabled={isSubmitting}
              className="font-mono text-sm"
            />
            <p className="label-hw-dim mt-2">
              WALLET ADDRESS TO RECEIVE M2 PAYMENT ($2,000 USDC)
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t border-hairline-subtle">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5"
            >
              {isSubmitting ? 'SAVING…' : 'SAVE CHANGES'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

