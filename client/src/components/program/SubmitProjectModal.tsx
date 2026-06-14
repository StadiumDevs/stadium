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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Star } from "lucide-react";
import { api, type ApiProgram, ApiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MarkdownBody } from "@/components/program/MarkdownBody";
import { getSubmissionTerms } from "@/lib/submissionTerms";
import {
  getSubmissionFeedback,
  type FeedbackAnswers,
} from "@/lib/submissionFeedback";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isHttpUrl = (v: string) => /^https?:\/\/.+/i.test(v.trim());
const BRIEF_MAX = 500;

/**
 * Public project-submission form for a hackathon program. Anyone can submit;
 * no login required. Captures the fields judges need: name, the email used on
 * Luma, project title, a video demo link, and a GitHub URL. For programs with
 * submission terms (see submissionTerms.ts) the submitter must agree to them,
 * and for programs with a feedback config (submissionFeedback.ts) the feedback
 * questions are collected and required.
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
  const terms = getSubmissionTerms(program.slug);
  const feedbackConfig = getSubmissionFeedback(program.slug);

  const [submitterName, setName] = useState("");
  const [lumaEmail, setEmail] = useState("");
  const [projectTitle, setTitle] = useState("");
  const [projectBrief, setBrief] = useState("");
  const [videoUrl, setVideo] = useState("");
  const [githubUrl, setGithub] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  // Feedback answers, kept generic and assembled into FeedbackAnswers on submit.
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [surfacesPrimary, setSurfacesPrimary] = useState<string | null>(null);
  const [singles, setSingles] = useState<Record<string, string>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});

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
      setAgreedToTerms(false);
      setTermsOpen(false);
      setSurfaces([]);
      setSurfacesPrimary(null);
      setSingles({});
      setTexts({});
      setError(null);
      setDone(false);
    }
  }, [open]);

  const toggleSurface = (option: string) => {
    setSurfaces((prev) => {
      const has = prev.includes(option);
      const next = has ? prev.filter((o) => o !== option) : [...prev, option];
      // Dropping the starred surface clears the star.
      if (has && surfacesPrimary === option) setSurfacesPrimary(null);
      return next;
    });
  };

  const validate = (): string | null => {
    if (!submitterName.trim()) return "Your name is required.";
    if (!EMAIL_RE.test(lumaEmail.trim())) return "A valid email is required.";
    if (!projectTitle.trim()) return "A project title is required.";
    if (!projectBrief.trim()) return "A short brief of what your project does is required.";
    if (projectBrief.trim().length > BRIEF_MAX) return `The brief must be ${BRIEF_MAX} characters or fewer.`;
    if (!isHttpUrl(videoUrl)) return "A valid video demo link (http/https) is required.";
    if (!isHttpUrl(githubUrl)) return "A valid GitHub URL (http/https) is required.";

    if (feedbackConfig) {
      for (const q of feedbackConfig.questions) {
        if (q.kind === "multi-primary") {
          if (surfaces.length === 0) return "Select at least one Bitrefill surface you built with.";
          if (!surfacesPrimary) return "Star the surface you relied on most.";
        } else if (q.kind === "single") {
          if (!singles[q.id]) return `Please answer: ${q.label}`;
        } else if (q.kind === "text" && q.required) {
          if (!(texts[q.id] || "").trim()) return `Please answer: ${q.label}`;
        }
      }
    }

    if (terms && !agreedToTerms) return "You must agree to the submission terms.";
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
      const feedback: FeedbackAnswers | undefined = feedbackConfig
        ? {
            surfaces,
            surfacesPrimary,
            agentEnv: singles.agentEnv || "",
            deadlineStatus: singles.deadlineStatus || "",
            biggestBlocker: singles.biggestBlocker || "",
            couldntHandle: (texts.couldntHandle || "").trim(),
            wouldKeepBuilding: singles.wouldKeepBuilding || "",
          }
        : undefined;

      await api.submitProjectSubmission(program.slug, {
        submitterName: submitterName.trim(),
        lumaEmail: lumaEmail.trim(),
        projectTitle: projectTitle.trim(),
        projectBrief: projectBrief.trim(),
        videoUrl: videoUrl.trim(),
        githubUrl: githubUrl.trim(),
        company,
        ...(terms ? { agreedToTerms: true } : {}),
        ...(feedback ? { feedback } : {}),
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
    <>
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
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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

                {feedbackConfig && (
                  <div className="space-y-4 border-t border-hairline-subtle pt-4">
                    <div className="label-hw text-display">·FEEDBACK</div>
                    {feedbackConfig.questions.map((q) => {
                      if (q.kind === "multi-primary") {
                        return (
                          <fieldset key={q.id} className="space-y-2">
                            <legend className="label-hw-dim">{q.label.toUpperCase()}</legend>
                            {q.hint && <p className="label-hw-dim normal-case">{q.hint}</p>}
                            <div className="space-y-1.5">
                              {q.options.map((opt) => {
                                const checked = surfaces.includes(opt);
                                const isPrimary = surfacesPrimary === opt;
                                return (
                                  <div key={opt} className="flex items-center gap-2">
                                    <Checkbox
                                      id={`fb-${q.id}-${opt}`}
                                      checked={checked}
                                      onCheckedChange={() => toggleSurface(opt)}
                                    />
                                    <label htmlFor={`fb-${q.id}-${opt}`} className="text-body text-sm flex-1 cursor-pointer">
                                      {opt}
                                    </label>
                                    {checked && (
                                      <button
                                        type="button"
                                        onClick={() => setSurfacesPrimary(opt)}
                                        aria-pressed={isPrimary}
                                        title={isPrimary ? "Relied on most" : "Star the one you relied on most"}
                                        className={`shrink-0 ${isPrimary ? "text-display" : "text-label-dim hover:text-display"}`}
                                      >
                                        <Star className="h-4 w-4" fill={isPrimary ? "currentColor" : "none"} aria-hidden="true" />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </fieldset>
                        );
                      }
                      if (q.kind === "single") {
                        return (
                          <fieldset key={q.id} className="space-y-2">
                            <legend className="label-hw-dim">{q.label.toUpperCase()}</legend>
                            <RadioGroup
                              value={singles[q.id] || ""}
                              onValueChange={(v) => setSingles((prev) => ({ ...prev, [q.id]: v }))}
                            >
                              {q.options.map((opt) => (
                                <div key={opt} className="flex items-center gap-2">
                                  <RadioGroupItem id={`fb-${q.id}-${opt}`} value={opt} />
                                  <label htmlFor={`fb-${q.id}-${opt}`} className="text-body text-sm cursor-pointer">
                                    {opt}
                                  </label>
                                </div>
                              ))}
                            </RadioGroup>
                          </fieldset>
                        );
                      }
                      // text
                      return (
                        <div key={q.id} className="space-y-1.5">
                          <Label htmlFor={`fb-${q.id}`} className="label-hw-dim">{q.label.toUpperCase()}</Label>
                          <Input
                            id={`fb-${q.id}`}
                            placeholder={q.placeholder}
                            value={texts[q.id] || ""}
                            onChange={(e) => setTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {terms && (
                  <div className="flex items-start gap-2 border-t border-hairline-subtle pt-4">
                    <Checkbox
                      id="sub-terms"
                      checked={agreedToTerms}
                      onCheckedChange={(v) => setAgreedToTerms(v === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="sub-terms" className="text-body text-sm cursor-pointer">
                      I have read and agree to the submission terms.{" "}
                      <button
                        type="button"
                        onClick={() => setTermsOpen(true)}
                        className="text-display underline underline-offset-2 hover:text-display-dim"
                      >
                        Read terms
                      </button>
                    </label>
                  </div>
                )}

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
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> SUBMITTING…
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

      {/* Terms reader — a separate dialog so reading and closing it never
          disturbs the in-progress submission form behind it. */}
      {terms && (
        <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display tracking-tight">{terms.title}</DialogTitle>
              <DialogDescription className="text-body">
                Read the full terms below. Close this to return to your submission.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              <MarkdownBody>{terms.body}</MarkdownBody>
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-4 py-1.5"
              >
                CLOSE
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
