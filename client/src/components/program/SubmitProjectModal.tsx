import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { api, type ApiProgram, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isHttpUrl = (v: string) => /^https?:\/\/.+/i.test(v.trim());
const BRIEF_MAX = 500;

/**
 * Public project-submission form for a hackathon program. Anyone can submit;
 * no login required. Captures the fields judges need: name, the email used on
 * Luma, project title, a video demo link, and a GitHub URL.
 */
export function SubmitProjectModal({
  open,
  onOpenChange,
  program,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  program: ApiProgram;
}) {
  const [submitterName, setName] = useState("");
  const [lumaEmail, setEmail] = useState("");
  const [projectTitle, setTitle] = useState("");
  const [projectBrief, setBrief] = useState("");
  const [videoUrl, setVideo] = useState("");
  const [githubUrl, setGithub] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setTitle("");
      setBrief("");
      setVideo("");
      setGithub("");
      setCompany("");
      setError(null);
      setDone(false);
    }
  }, [open]);

  const validate = (): string | null => {
    if (!submitterName.trim()) return "Your name is required.";
    if (!EMAIL_RE.test(lumaEmail.trim())) return "A valid email is required.";
    if (!projectTitle.trim()) return "A project title is required.";
    if (!projectBrief.trim()) return "A short brief of what your project does is required.";
    if (projectBrief.trim().length > BRIEF_MAX) return `The brief must be ${BRIEF_MAX} characters or fewer.`;
    if (!isHttpUrl(videoUrl)) return "A valid video demo link (http/https) is required.";
    if (!isHttpUrl(githubUrl)) return "A valid GitHub URL (http/https) is required.";
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.submitProjectSubmission(program.slug, {
        submitterName: submitterName.trim(),
        lumaEmail: lumaEmail.trim(),
        projectTitle: projectTitle.trim(),
        projectBrief: projectBrief.trim(),
        videoUrl: videoUrl.trim(),
        githubUrl: githubUrl.trim(),
        company,
      });
      setDone(true);
      toast({ title: "Project submitted", description: "Check your email for a confirmation." });
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setError("That email isn't on the checked-in guest list. Use the email you checked in with at the door.");
      } else {
        toast({
          title: "Couldn't submit project",
          description: (e as Error)?.message || "Unknown error",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">
            SUBMIT A PROJECT TO {program.name.toUpperCase()}
          </DialogTitle>
          <DialogDescription className="text-body">
            Use the email you checked in with at the door. Only checked-in attendees can submit.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="panel px-4 py-8 text-center">
            <div className="label-hw text-display mb-2">·SUBMISSION RECEIVED</div>
            <p className="label-hw-dim">
              Your project is in. We've emailed a confirmation to {lumaEmail.trim() || "your inbox"}. Need to change
              something? Reopen this form and submit again with the same email before the deadline.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sub-name" className="label-hw-dim">YOUR NAME</Label>
                <Input id="sub-name" value={submitterName} onChange={(e) => setName(e.target.value)} className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-email" className="label-hw-dim">EMAIL USED ON LUMA</Label>
                <Input id="sub-email" type="email" value={lumaEmail} onChange={(e) => setEmail(e.target.value)} className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-title" className="label-hw-dim">PROJECT TITLE</Label>
                <Input id="sub-title" value={projectTitle} onChange={(e) => setTitle(e.target.value)} className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="sub-brief" className="label-hw-dim">WHAT DOES IT DO?</Label>
                  <span className="label-hw-dim">{projectBrief.trim().length}/{BRIEF_MAX}</span>
                </div>
                <Textarea
                  id="sub-brief"
                  rows={3}
                  maxLength={BRIEF_MAX}
                  placeholder="In 2-3 sentences, describe your project and what it does."
                  value={projectBrief}
                  onChange={(e) => setBrief(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-video" className="label-hw-dim">VIDEO DEMO LINK</Label>
                <Input id="sub-video" placeholder="https://…" value={videoUrl} onChange={(e) => setVideo(e.target.value)} className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-github" className="label-hw-dim">GITHUB URL</Label>
                <Input id="sub-github" placeholder="https://github.com/…" value={githubUrl} onChange={(e) => setGithub(e.target.value)} className="font-mono text-sm" />
              </div>
              {error && <div className="label-hw text-destructive">·{error.toUpperCase()}</div>}
              {/* Honeypot — hidden from users; bots fill it and get silently dropped. */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="hidden"
              />
            </div>
            {submitting && (
              <p className="font-mono text-[10px] tracking-[0.14em] text-label-mid text-center pt-1" role="status" aria-live="polite">
                CHECKING YOU AGAINST THE LUMA GUEST LIST. THIS CAN TAKE A FEW SECONDS.
              </p>
            )}
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
                disabled={submitting}
                className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> VERIFYING CHECK-IN…
                  </>
                ) : (
                  "SUBMIT PROJECT ▸"
                )}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
