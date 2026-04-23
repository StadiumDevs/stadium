import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { web3Enable, web3Accounts, web3FromSource } from "@polkadot/extension-dapp";
import { SiwsMessage } from "@talismn/siws";
import { generateSiwsStatement } from "@/lib/siwsUtils";
import { api, type ApiFundingSignal } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const DESCRIPTION_MAX = 500;
const AMOUNT_RANGE_MAX = 100;

const TYPES: Array<{ value: NonNullable<ApiFundingSignal["fundingType"]>; label: string }> = [
  { value: "grant", label: "Grant" },
  { value: "bounty", label: "Bounty" },
  { value: "pre_seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "other", label: "Other" },
];

export function EditFundingSignalModal({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  connectedAddress,
  current,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectTitle: string;
  connectedAddress: string;
  current: ApiFundingSignal | null;
  onSaved: (signal: ApiFundingSignal) => void;
}) {
  const [isSeeking, setIsSeeking] = useState<boolean>(Boolean(current?.isSeeking));
  const [fundingType, setFundingType] = useState<string>(current?.fundingType || "grant");
  const [amountRange, setAmountRange] = useState<string>(current?.amountRange || "");
  const [description, setDescription] = useState<string>(current?.description || "");
  const [descError, setDescError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setIsSeeking(Boolean(current?.isSeeking));
      setFundingType(current?.fundingType || "grant");
      setAmountRange(current?.amountRange || "");
      setDescription(current?.description || "");
      setDescError(null);
      setAmountError(null);
    }
  }, [open, current]);

  const validate = (): boolean => {
    let ok = true;
    if (description.length > DESCRIPTION_MAX) {
      setDescError(`Description must be ${DESCRIPTION_MAX} characters or fewer.`);
      ok = false;
    } else {
      setDescError(null);
    }
    if (amountRange.length > AMOUNT_RANGE_MAX) {
      setAmountError(`Amount range must be ${AMOUNT_RANGE_MAX} characters or fewer.`);
      ok = false;
    } else {
      setAmountError(null);
    }
    return ok;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await web3Enable("Stadium");
      const accounts = await web3Accounts();
      const account = accounts.find((a) => a.address === connectedAddress) || accounts[0];
      if (!account) throw new Error("No wallet account found");

      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: account.address,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({ action: "update-funding-signal", projectTitle }),
      });
      const injector = await web3FromSource(account.meta.source);
      const signed = (await siws.sign(injector)) as unknown as { signature: string; message?: string };
      const messageStr =
        typeof signed.message === "string" && signed.message
          ? signed.message
          : (siws as unknown as { toString: () => string }).toString();
      const authHeader = btoa(
        JSON.stringify({ message: messageStr, signature: signed.signature, address: account.address }),
      );

      const payload = isSeeking
        ? {
            isSeeking,
            fundingType: fundingType as ApiFundingSignal["fundingType"],
            amountRange: amountRange.trim() || null,
            description: description.trim() || null,
          }
        : { isSeeking: false };

      const res = await api.updateFundingSignal(projectId, payload, authHeader);
      onSaved(res.data);
      toast({ title: "Funding signal updated" });
      onOpenChange(false);
    } catch (e) {
      const err = e as Error;
      toast({
        title: "Couldn't save funding signal",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Funding signal</DialogTitle>
          <DialogDescription>
            Let partners and fellow builders know what you're looking for. Visible on your project
            page when the toggle is on.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="funding-seeking" className="text-sm font-medium">
                Actively seeking funding
              </Label>
              <p className="text-xs text-muted-foreground">
                Turn off to hide the badge without losing your notes.
              </p>
            </div>
            <Switch
              id="funding-seeking"
              checked={isSeeking}
              onCheckedChange={setIsSeeking}
              aria-label="Toggle seeking funding"
            />
          </div>

          {isSeeking && (
            <>
              <div className="space-y-1">
                <Label htmlFor="funding-type">Type</Label>
                <Select value={fundingType} onValueChange={setFundingType}>
                  <SelectTrigger id="funding-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="funding-amount">Amount range (optional)</Label>
                <Input
                  id="funding-amount"
                  placeholder="e.g. 30k–60k USD"
                  value={amountRange}
                  maxLength={AMOUNT_RANGE_MAX + 50}
                  onChange={(e) => setAmountRange(e.target.value)}
                  aria-invalid={amountError ? true : undefined}
                />
                {amountError && <p className="text-xs text-destructive">{amountError}</p>}
              </div>

              <div className="space-y-1">
                <Label htmlFor="funding-description">Description (optional)</Label>
                <Textarea
                  id="funding-description"
                  rows={4}
                  placeholder="What are you looking for and what's the best way to help?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  aria-invalid={descError ? true : undefined}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-destructive">{descError || ""}</span>
                  <span
                    className={
                      description.length > DESCRIPTION_MAX
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {description.length} / {DESCRIPTION_MAX}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => (submitting ? null : onOpenChange(false))}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
