import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { web3Enable, web3Accounts, web3FromSource } from "@polkadot/extension-dapp";
import { SiwsMessage } from "@talismn/siws";
import { generateSiwsStatement } from "@/lib/siwsUtils";
import { api, type ApiProjectContinuation, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const STATUS_MAX = 4000;
const SUPPORT_MAX = 4000;

export function ProjectContinuationModal({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  connectedAddress,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectTitle: string;
  connectedAddress: string;
  onSubmitted: (entry: ApiProjectContinuation) => void;
}) {
  const { toast } = useToast();
  const [currentStatus, setCurrentStatus] = useState("");
  const [wantSupport, setWantSupport] = useState(false);
  const [supportFor, setSupportFor] = useState("");
  const [nextStepUrl, setNextStepUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCurrentStatus("");
    setWantSupport(false);
    setSupportFor("");
    setNextStepUrl("");
    setSubmitting(false);
  };

  const validate = (): string | null => {
    const status = currentStatus.trim();
    if (!status) return "Tell us where the project stands today.";
    if (status.length > STATUS_MAX) return `Current status must be ${STATUS_MAX} chars or fewer.`;
    if (supportFor.length > SUPPORT_MAX) return `Support details must be ${SUPPORT_MAX} chars or fewer.`;
    if (nextStepUrl.trim() && !/^https?:\/\//i.test(nextStepUrl.trim())) {
      return "Next-step URL must start with http:// or https://.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast({ title: "Check the form", description: error, variant: "destructive" });
      return;
    }
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
        statement: generateSiwsStatement({ action: "submit-continuation", projectTitle }),
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
      const res = await api.createProjectContinuation(
        projectId,
        {
          currentStatus: currentStatus.trim(),
          wantSupport,
          supportFor: supportFor.trim() || null,
          nextStepUrl: nextStepUrl.trim() || null,
        },
        authHeader,
      );
      onSubmitted(res.data);
      toast({ title: "Submitted. Thanks for the update" });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Couldn't submit",
        description: e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">·WHAT'S NEXT, MILESTONE 3?</DialogTitle>
          <DialogDescription className="text-body">
            Now that M2 is done, where is the project today, and what's the next step we should
            know about? Submissions go to the WebZero ops team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cont-status" className="label-hw-dim">·CURRENT STATUS *</Label>
            <Textarea
              id="cont-status"
              rows={4}
              maxLength={STATUS_MAX + 100}
              placeholder="Shipped to mainnet last week. Onboarding ~10 builders/day."
              value={currentStatus}
              onChange={(e) => setCurrentStatus(e.target.value)}
              className="font-mono text-sm"
            />
            <div className="flex justify-end label-hw-dim">
              {currentStatus.trim().length} / {STATUS_MAX}
            </div>
          </div>

          <div className="lcd p-3 flex items-center justify-between gap-3">
            <div>
              <Label htmlFor="cont-want" className="label-hw text-display">
                ·WANT CONTINUED SUPPORT?
              </Label>
              <p className="label-hw-dim mt-0.5">
                MENTORSHIP, GRANT INTROS, FOLLOW-ON PROGRAMS, ETC.
              </p>
            </div>
            <Switch
              id="cont-want"
              checked={wantSupport}
              onCheckedChange={setWantSupport}
              aria-label="Toggle support requested"
            />
          </div>

          {wantSupport && (
            <div className="space-y-1.5">
              <Label htmlFor="cont-supportfor" className="label-hw-dim">·WHAT WOULD HELP?</Label>
              <Textarea
                id="cont-supportfor"
                rows={3}
                maxLength={SUPPORT_MAX + 100}
                placeholder="Intros to grants programs in Polkadot. Feedback on the multi-chain payout flow."
                value={supportFor}
                onChange={(e) => setSupportFor(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cont-url" className="label-hw-dim">·NEXT-STEP URL (OPTIONAL)</Label>
            <Input
              id="cont-url"
              type="url"
              placeholder="https://… (grant app, demo, blog post)"
              value={nextStepUrl}
              onChange={(e) => setNextStepUrl(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => { if (!submitting) { reset(); onOpenChange(false); } }}
            disabled={submitting}
            className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !currentStatus.trim()}
            className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> SUBMITTING…
              </>
            ) : (
              "SUBMIT ▸"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
