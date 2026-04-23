import { useEffect, useMemo, useState } from "react";
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
          <DialogTitle>Apply to {program.name}</DialogTitle>
          <DialogDescription>
            Bring the project you already built — we'll pull the rest from its Stadium page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="apply-project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="apply-project">
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
            <div className="space-y-1">
              <Label htmlFor="apply-feedback">What do you want feedback on?</Label>
              <Textarea
                id="apply-feedback"
                rows={5}
                placeholder="One or two specific things you'd most like the cohort to dig into."
                value={feedbackFocus}
                onChange={(e) => setFeedbackFocus(e.target.value)}
                aria-invalid={feedbackError ? true : undefined}
                aria-describedby="apply-feedback-error apply-feedback-count"
              />
              <div className="flex items-center justify-between text-xs">
                <span id="apply-feedback-error" className="text-destructive">
                  {feedbackError || ""}
                </span>
                <span
                  id="apply-feedback-count"
                  className={
                    feedbackFocus.trim().length > FEEDBACK_FOCUS_MAX
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  {feedbackFocus.trim().length} / {FEEDBACK_FOCUS_MAX}
                </span>
              </div>
            </div>
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
          <Button onClick={handleSubmit} disabled={submitting || !selectedProject}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              "Submit application"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
