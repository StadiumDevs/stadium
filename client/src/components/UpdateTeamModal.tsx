import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

export interface TeamMember {
  name: string;
  wallet: string;
}

interface UpdateTeamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMembers: TeamMember[];
  initialPayoutAddress: string;
  onSubmit: (data: { members: TeamMember[]; payoutAddress: string }) => Promise<void>;
}

// Validate SS58 address (basic validation - accepts addresses starting with 5 or similar)
const isValidWalletAddress = (address: string): boolean => {
  if (!address.trim()) return true; // Empty is valid (optional)
  // Basic SS58 format check (starts with number, length check)
  // More thorough validation would use a SS58 decoder
  return address.trim().length >= 20 && address.trim().length <= 100 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address.trim());
};

export const UpdateTeamModal = ({ 
  open, 
  onOpenChange, 
  initialMembers, 
  initialPayoutAddress, 
  onSubmit 
}: UpdateTeamModalProps) => {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [payoutAddress, setPayoutAddress] = useState(initialPayoutAddress);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setMembers(initialMembers.length > 0 ? initialMembers : [{ name: '', wallet: '' }]);
      setPayoutAddress(initialPayoutAddress);
      setError("");
      setValidationErrors({});
    }
  }, [open, initialMembers, initialPayoutAddress]);

  const handleAddMember = () => {
    setMembers([...members, { name: '', wallet: '' }]);
  };

  const handleRemoveMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
      // Clear validation error for removed member
      const newErrors = { ...validationErrors };
      delete newErrors[`member-${index}`];
      delete newErrors[`wallet-${index}`];
      // Reindex errors
      const updatedErrors: Record<string, string> = {};
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith('member-') || key.startsWith('wallet-')) {
          const [type, oldIndex] = key.split('-');
          const oldIdx = parseInt(oldIndex);
          if (oldIdx < index) {
            updatedErrors[key] = newErrors[key];
          } else if (oldIdx > index) {
            updatedErrors[`${type}-${oldIdx - 1}`] = newErrors[key];
          }
        } else {
          updatedErrors[key] = newErrors[key];
        }
      });
      setValidationErrors(updatedErrors);
    }
  };

  const handleMemberChange = (index: number, field: keyof TeamMember, value: string) => {
    const updated = [...members];
    updated[index][field] = value;
    setMembers(updated);
    
    // Clear validation error for this field
    const key = field === 'name' ? `member-${index}` : `wallet-${index}`;
    const newErrors = { ...validationErrors };
    delete newErrors[key];
    setValidationErrors(newErrors);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validate members
    members.forEach((member, index) => {
      if (!member.name.trim()) {
        errors[`member-${index}`] = 'Name is required';
      }
      if (!isValidWalletAddress(member.wallet)) {
        errors[`wallet-${index}`] = 'Invalid wallet address format';
      }
    });
    
    // Validate payout address
    if (!payoutAddress.trim()) {
      errors.payoutAddress = 'Payout address is required';
    } else if (!isValidWalletAddress(payoutAddress)) {
      errors.payoutAddress = 'Invalid payout address format';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    setError("");
    
    if (!validateForm()) {
      setError("Please fix the validation errors before submitting");
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit({ 
        members: members.filter(m => m.name.trim() || m.wallet.trim()), 
        payoutAddress: payoutAddress.trim() 
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Update Team</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div>
            <Label className="font-medium mb-3 block">Team Members</Label>
            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input 
                      placeholder="Name" 
                      value={member.name}
                      onChange={(e) => handleMemberChange(index, 'name', e.target.value)}
                      disabled={loading}
                      className={validationErrors[`member-${index}`] ? "border-destructive" : ""}
                    />
                    {validationErrors[`member-${index}`] && (
                      <p className="text-xs text-destructive mt-1">{validationErrors[`member-${index}`]}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input 
                      placeholder="SS58 Address (0x... or 5...)" 
                      value={member.wallet}
                      onChange={(e) => handleMemberChange(index, 'wallet', e.target.value)}
                      disabled={loading}
                      className={validationErrors[`wallet-${index}`] ? "border-destructive" : ""}
                    />
                    {validationErrors[`wallet-${index}`] && (
                      <p className="text-xs text-destructive mt-1">{validationErrors[`wallet-${index}`]}</p>
                    )}
                  </div>
                  {members.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRemoveMember(index)}
                      disabled={loading}
                      type="button"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleAddMember}
              className="mt-2"
              disabled={loading}
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add Member
            </Button>
          </div>
          
          <div>
            <Label className="font-medium mb-3 block">Payout Address</Label>
            <Input 
              placeholder="SS58 Address (0x... or 5...)"
              value={payoutAddress}
              onChange={(e) => {
                setPayoutAddress(e.target.value);
                const newErrors = { ...validationErrors };
                delete newErrors.payoutAddress;
                setValidationErrors(newErrors);
              }}
              disabled={loading}
              className={validationErrors.payoutAddress ? "border-destructive" : ""}
            />
            {validationErrors.payoutAddress && (
              <p className="text-xs text-destructive mt-1">{validationErrors.payoutAddress}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Wallet address to receive M2 payment
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

