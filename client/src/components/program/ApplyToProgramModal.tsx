import { useEffect, useMemo, useState } from "react";
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
import { api, type ApiProgram, type ApiProgramApplication, type ApiProject } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const FEEDBACK_FOCUS_MIN = 1;
const FEEDBACK_FOCUS_MAX = 500;

export function ApplyToProgramModal({
  open,
  onOpenChange,
  program,
  projects,
  connectedAddress,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  program: ApiProgram;
  /** Projects the connected wallet is a team member of. Sorted by updated_at DESC. */
  projects: ApiProject[];
  connectedAddress: string;
  onApplied: (application: ApiProgramApplication) => void;
}) {
  const defaultProjectId = useMemo(() => projects[0]?.id || "", [projects]);
  const [projectId, setProjectId] = useState<string>(defaultProjectId);
  const [feedbackFocus, setFeedbackFocus] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) || projects[0] || null,
    [projects, projectId],
  );

  useEffect(() => {
    if (open) {
      setProjectId(defaultProjectId);
      setFeedbackFocus("");
      setFeedbackError(null);
    }
  }, [open, defaultProjectId]);

  const validate = (): boolean => {
    if (program.programType !== "dogfooding") return true;
    const trimmed = feedbackFocus.trim();
    if (trimmed.length < FEEDBACK_FOCUS_MIN) {
      setFeedbackError("Tell us briefly what you want feedback on.");
      return false;
    }
    if (trimmed.length > FEEDBACK_FOCUS_MAX) {
      setFeedbackError(`Must be ${FEEDBACK_FOCUS_MAX} characters or fewer.`);
      return false;
    }
    setFeedbackError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!selectedProject) return;
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
        statement: generateSiwsStatement({
          action: "apply-to-program",
          projectTitle: selectedProject.projectName,
          programTitle: program.name,
        }),
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

      const application_fields: Record<string, unknown> =
        program.programType === "dogfooding" ? { feedback_focus: feedbackFocus.trim() } : {};

      const res = await api.applyToProgram(
        program.slug,
        { project_id: selectedProject.id, application_fields },
        authHeader,
      );
      onApplied(res.data);
      toast({ title: "Application submitted" });
      onOpenChange(false);
    } catch (e) {
      const err = e as Error;
      toast({
        title: "Couldn't submit application",
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
          <DialogTitle className="font-display tracking-tight">
            APPLY TO {program.name.toUpperCase()}
          </DialogTitle>
          <DialogDescription className="text-body">
            Bring the project you already built — we'll pull the rest from its Stadium page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apply-project" className="label-hw-dim">PROJECT</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="apply-project" className="font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.projectName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {program.programType === "dogfooding" && (
            <div className="space-y-1.5">
              <Label htmlFor="apply-feedback" className="label-hw-dim">
                WHAT DO YOU WANT FEEDBACK ON?
              </Label>
              <Textarea
                id="apply-feedback"
                rows={5}
                placeholder="One or two specific things you'd most like the cohort to dig into."
                value={feedbackFocus}
                onChange={(e) => setFeedbackFocus(e.target.value)}
                aria-invalid={feedbackError ? true : undefined}
                aria-describedby="apply-feedback-error apply-feedback-count"
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between">
                <span id="apply-feedback-error" className="label-hw text-destructive">
                  {feedbackError ? `·${feedbackError.toUpperCase()}` : ""}
                </span>
                <span
                  id="apply-feedback-count"
                  className={
                    feedbackFocus.trim().length > FEEDBACK_FOCUS_MAX
                      ? "label-hw text-destructive"
                      : "label-hw-dim"
                  }
                >
                  {feedbackFocus.trim().length} / {FEEDBACK_FOCUS_MAX}
                </span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => (submitting ? null : onOpenChange(false))}
            disabled={submitting}
            className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedProject}
            className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> SUBMITTING…
              </>
            ) : (
              "SUBMIT APPLICATION ▸"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
