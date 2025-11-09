import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Copy, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { useState } from "react";

const formSchema = z.object({
  donationAddress: z.string()
    .min(1, "Payout address is required")
    .regex(/^[1-9A-HJ-NP-Za-km-z]{47,48}$/, "Invalid SS58 address (must be 47-48 characters)"),
  confirmed: z.boolean().refine((val) => val === true, {
    message: "You must confirm the address",
  }),
});

type FormData = z.infer<typeof formSchema>;

interface UpdatePayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAddress?: string;
  onSave: (address: string) => Promise<void>;
}

export function UpdatePayoutModal({ 
  open, 
  onOpenChange, 
  currentAddress,
  onSave 
}: UpdatePayoutModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      donationAddress: '',
      confirmed: false,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        donationAddress: '',
        confirmed: false,
      });
    }
  }, [open, form]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };
  
  const onSubmit = async (data: FormData) => {
    try {
      await onSave(data.donationAddress);
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by parent component
      console.error('Failed to update payout address:', error);
    }
  };
  
  const addressLength = form.watch('donationAddress')?.length || 0;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Payout Wallet Address</DialogTitle>
          <DialogDescription>
            This is where your M2 payment will be sent
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Critical:</strong> Double-check this address! Payments cannot be 
            reversed or redirected once sent.
          </AlertDescription>
        </Alert>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {currentAddress && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Current Payout Address</Label>
              <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                <code className="text-xs font-mono flex-1 break-all">
                  {currentAddress}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => copyToClipboard(currentAddress)}
                >
                  {copied ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="donationAddress">
              New Payout Address <span className="text-destructive">*</span>
            </Label>
            <Input
              {...form.register('donationAddress')}
              placeholder="5DAAnuX2qToh7223z2J5tV6a2UqXG1nS1g4G2g1eZA1Lz9aU"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              ⓘ Must be a valid Polkadot/Substrate address (SS58 format, 47-48 characters)
            </p>
            {form.formState.errors.donationAddress && (
              <p className="text-xs text-destructive">
                {form.formState.errors.donationAddress.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Character count: {addressLength}/48
            </p>
          </div>
          
          <div className="flex items-start space-x-2 p-4 border rounded-lg bg-muted/50">
            <Checkbox
              id="confirmed"
              checked={form.watch('confirmed')}
              onCheckedChange={(checked) => form.setValue('confirmed', checked as boolean)}
            />
            <Label
              htmlFor="confirmed"
              className="text-sm font-normal leading-relaxed cursor-pointer"
            >
              I confirm this is the correct payout address and understand payments 
              cannot be reversed
            </Label>
          </div>
          {form.formState.errors.confirmed && (
            <p className="text-xs text-destructive">
              {form.formState.errors.confirmed.message}
            </p>
          )}
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!form.watch('confirmed') || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Updating..." : "Update Address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

