import { useCallback, useEffect, useRef, useState } from "react";
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
import { api, type ApiProgram, type SubmitResult, ApiError, USE_MOCK_DATA } from "@/lib/api";
import { useSocialAuth } from "@/lib/auth/useSocialAuth";
import { mockVerifiedEmails } from "@/lib/mockVerifiedEmails";
import { useToast } from "@/hooks/use-toast";
import { MarkdownBody } from "@/components/program/MarkdownBody";
import { getSubmissionTerms } from "@/lib/submissionTerms";
import {
  getSubmissionFeedback,
  type FeedbackAnswers,
} from "@/lib/submissionFeedback";
import { getProgramProfile } from "@/lib/programProfiles";
import { TrackedSubmissionFields } from "@/components/program/tracked/TrackedSubmissionFields";
import {
  detailsToTrackedForm,
  emptyTrackedForm,
  trackedFormToDetails,
  validateTrackedForm,
  videoOptional,
  type TrackedFormState,
} from "@/components/program/tracked/trackedForm";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The demo video ask differs by track (Free Society Hack builder doc).
const videoLabel = (track: TrackedFormState["track"]) =>
  track === "privacy"
    ? "DEMO VIDEO LINK (2 MINUTES MAX, OPTIONAL)"
    : track === "agentic"
      ? "DEMO VIDEO (3 MINUTES MAX) OR A LIVE LINK SHOWING THE AGENT MAKE A PURCHASE"
      : track === "both"
        ? "DEMO VIDEO (SHOW THE ZCASH FLOW AND THE AGENT'S PURCHASE)"
        : "DEMO VIDEO LINK";
const isHttpUrl = (v: string) => /^https?:\/\/.+/i.test(v.trim());
const BRIEF_MAX = 500;

/**
 * Public project-submission form for a hackathon program. Anyone can submit;
 * no login required. The form is kept on this device as a draft while it's
 * filled in. Fallbacks: a builder not on the Luma list can verify their email
 * (sign-in link) and is either let in after a fresh Luma check or held for an
 * organiser; updating an existing submission needs the email verified; a
 * failed send keeps the draft and retries. Captures the fields judges need: name, the email used on
 * Luma, project title, a video demo link, and a GitHub URL. For programs with
 * submission terms (see submissionTerms.ts) the submitter must agree to them,
 * and for programs with a feedback config (submissionFeedback.ts) the feedback
 * questions are collected and required.
 */
type Draft = {
  submitterName: string;
  lumaEmail: string;
  projectTitle: string;
  projectBrief: string;
  videoUrl: string;
  githubUrl: string;
  agreedToTerms: boolean;
  surfaces: string[];
  surfacesPrimary: string | null;
  singles: Record<string, string>;
  texts: Record<string, string>;
  tracked: TrackedFormState;
};
type Problem = "not_checked_in" | "verify_to_update" | "retry";

const DRAFT_SAVE_MS = 400;
const RETRY_AFTER_MS = 5000;
const draftKey = (slug: string) => `stadium_submit_draft_${slug}`;
const readDraft = (slug: string): Draft | null => {
  try {
    const raw = localStorage.getItem(draftKey(slug));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
};
const writeDraft = (slug: string, d: Draft | null) => {
  try {
    if (d) localStorage.setItem(draftKey(slug), JSON.stringify(d));
    else localStorage.removeItem(draftKey(slug));
  } catch {
    // Storage unavailable: the form still works, it just isn't kept.
  }
};

export function SubmitProjectModal({
  open,
  onOpenChange,
  program,
  mode = "new",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  program: ApiProgram;
  /** "update": load the builder's own submission (after verifying their email) to edit it. */
  mode?: "new" | "update";
}) {
  const terms = getSubmissionTerms(program.slug);
  const feedbackConfig = getSubmissionFeedback(program.slug);
  // Tracked programs (programProfiles.ts) collect tracks, txid, next milestone, etc.
  const profile = getProgramProfile(program.slug);
  const [tracked, setTracked] = useState<TrackedFormState>(emptyTrackedForm);

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
  const [outcome, setOutcome] = useState<SubmitResult["outcome"] | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [problemMessage, setProblemMessage] = useState("");
  const [retryScheduled, setRetryScheduled] = useState(false);
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [loadedMine, setLoadedMine] = useState(false);
  const [, setVerifyTick] = useState(0);
  const { toast } = useToast();
  const social = useSocialAuth();
  const retried = useRef(false);
  const retryTimer = useRef<number>();
  const done = outcome !== null;

  // Verified = the builder proved they own this email (sign-in link; in the
  // playground, the stand-in marks it verified for the session).
  const emailNorm = lumaEmail.trim().toLowerCase();
  const verified =
    !!emailNorm && (USE_MOCK_DATA ? mockVerifiedEmails.has(emailNorm) : !!social.token && social.email?.toLowerCase() === emailNorm);

  const applyDraft = useCallback((d: Partial<Draft> | null) => {
    setName(d?.submitterName ?? "");
    setEmail(d?.lumaEmail ?? "");
    setTitle(d?.projectTitle ?? "");
    setBrief(d?.projectBrief ?? "");
    setVideo(d?.videoUrl ?? "");
    setGithub(d?.githubUrl ?? "");
    setAgreedToTerms(d?.agreedToTerms ?? false);
    setSurfaces(d?.surfaces ?? []);
    setSurfacesPrimary(d?.surfacesPrimary ?? null);
    setSingles(d?.singles ?? {});
    setTexts(d?.texts ?? {});
    setTracked(d?.tracked ?? emptyTrackedForm());
  }, []);

  // Opening restores this device's draft (never wipes it).
  useEffect(() => {
    if (open) {
      applyDraft(readDraft(program.slug));
      setCompany("");
      setTermsOpen(false);
      setError(null);
      setOutcome(null);
      setProblem(null);
      setLinkSentTo(null);
      setLoadedMine(false);
      retried.current = false;
    }
    return () => window.clearTimeout(retryTimer.current);
  }, [open, program.slug, applyDraft]);

  // Keep the draft as they type (the honeypot is never saved).
  useEffect(() => {
    if (!open || done) return;
    const draft: Draft = {
      submitterName, lumaEmail, projectTitle, projectBrief, videoUrl, githubUrl,
      agreedToTerms, surfaces, surfacesPrimary, singles, texts, tracked,
    };
    const t = window.setTimeout(() => {
      writeDraft(program.slug, draft);
      setDraftSaved(true);
    }, DRAFT_SAVE_MS);
    return () => window.clearTimeout(t);
  }, [open, done, program.slug, submitterName, lumaEmail, projectTitle, projectBrief, videoUrl, githubUrl, agreedToTerms, surfaces, surfacesPrimary, singles, texts, tracked]);

  const startOver = () => {
    writeDraft(program.slug, null);
    applyDraft(null);
    setDraftSaved(false);
    setProblem(null);
    setError(null);
  };

  // Update mode: once the email is verified, load their submission to edit it.
  useEffect(() => {
    if (!open || mode !== "update" || !verified || loadedMine) return;
    setLoadedMine(true);
    api
      .getMySubmission(program.slug, { email: lumaEmail, verifiedToken: social.token })
      .then((r) => {
        const d = r.data;
        setName(d.submitterName ?? "");
        setTitle(d.projectTitle ?? "");
        setBrief(d.projectBrief ?? "");
        setVideo(d.videoUrl ?? "");
        setGithub(d.githubUrl ?? "");
        if (profile) setTracked(detailsToTrackedForm(d.details));
        toast({ title: "Your submission is loaded", description: "Change what you need, then UPDATE SUBMISSION." });
      })
      .catch((e) => {
        const notFound = e instanceof ApiError && e.status === 404;
        toast({
          title: notFound ? "No submission for this email yet" : "Couldn't load your submission",
          description: notFound ? "Fill in the form to submit one." : (e as Error).message,
          variant: notFound ? undefined : "destructive",
        });
      });
  }, [open, mode, verified, loadedMine, program.slug, lumaEmail, social.token, profile, toast]);

  // Prove the email is theirs: a sign-in link (back to this page with the form
  // saved). In the playground there's no email, so it's verified at once.
  const verifyEmail = async (): Promise<boolean> => {
    const email = lumaEmail.trim();
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email first.");
      return false;
    }
    try {
      if (USE_MOCK_DATA) {
        await api.mockVerifyEmail(email);
        setVerifyTick((n) => n + 1);
        toast({ title: "Email verified", description: "Playground: verified without sending an email." });
        return true;
      }
      const back = `${window.location.origin}/programs/${encodeURIComponent(program.slug)}?submit=${mode === "update" ? "update" : "1"}`;
      await social.signInWithEmail(email, back);
      setLinkSentTo(email);
      return false;
    } catch (e) {
      setError((e as Error)?.message || "Couldn't send the sign-in link.");
      return false;
    }
  };

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
    // Privacy-only entries may skip the video (strongly preferred); a given link must still be valid.
    const noVideoOk = !!profile && videoOptional(tracked.track) && !videoUrl.trim();
    if (!noVideoOk && !isHttpUrl(videoUrl)) return "A valid video demo link (http/https) is required.";
    if (!isHttpUrl(githubUrl)) return "A valid GitHub URL (http/https) is required.";

    if (feedbackConfig) {
      for (const q of feedbackConfig.questions) {
        if (q.kind === "multi-primary") {
          if (surfaces.length === 0) return `Please answer: ${q.label}`;
          if (!surfacesPrimary) return "Star the surface you relied on most.";
        } else if (q.kind === "single") {
          if (!singles[q.id]) return `Please answer: ${q.label}`;
        } else if (q.kind === "text" && q.required) {
          if (!(texts[q.id] || "").trim()) return `Please answer: ${q.label}`;
        }
      }
    }

    if (profile) {
      const trackedError = validateTrackedForm(profile, tracked);
      if (trackedError) return trackedError;
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

      const result = await api.submitProjectSubmission(program.slug, {
        submitterName: submitterName.trim(),
        lumaEmail: lumaEmail.trim(),
        projectTitle: projectTitle.trim(),
        projectBrief: projectBrief.trim(),
        videoUrl: videoUrl.trim(),
        githubUrl: githubUrl.trim(),
        company,
        ...(terms ? { agreedToTerms: true } : {}),
        ...(feedback ? { feedback } : {}),
        ...(profile ? { details: trackedFormToDetails(tracked) } : {}),
      }, { verifiedToken: verified && !USE_MOCK_DATA ? social.token : null });
      writeDraft(program.slug, null);
      setOutcome(result.outcome);
      setProblem(null);
      toast({
        title: result.outcome === "pending" ? "Received, waiting for an organiser" : result.outcome === "updated" ? "Submission updated" : "Project submitted",
        description: "Check your email for a confirmation.",
      });
    } catch (e) {
      // The draft stays saved whatever happens.
      const code = e instanceof ApiError ? e.code : undefined;
      const status = e instanceof ApiError ? e.status : 0;
      if (code === "not_checked_in" || status === 403) {
        setProblem("not_checked_in");
        setProblemMessage("That email isn't on the event's checked-in list yet.");
      } else if (code === "verify_to_update" || status === 401) {
        setProblem("verify_to_update");
        setProblemMessage("This email already has a submission. Verify the email to update it.");
      } else if (status === 400 || status === 422) {
        setError((e as Error).message);
      } else {
        // 503 (check-in couldn't be verified), server or network trouble.
        setProblem("retry");
        setProblemMessage(
          status === 503 ? (e as Error).message : "Couldn't reach Stadium. Your form is saved on this device.",
        );
        if (!retried.current) {
          retried.current = true;
          setRetryScheduled(true);
          retryTimer.current = window.setTimeout(() => {
            setRetryScheduled(false);
            submitRef.current();
          }, RETRY_AFTER_MS);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;

  const verifyThenSubmit = async () => {
    if (await verifyEmail()) {
      setProblem(null);
      if (mode !== "update" || problem) await submitRef.current();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">
              {mode === "update" ? "UPDATE YOUR SUBMISSION TO" : "SUBMIT A PROJECT TO"} {program.name.toUpperCase()}
            </DialogTitle>
            <DialogDescription className="text-body">
              {mode === "update"
                ? "Verify the email you submitted with to load your submission and change it."
                : "Use the email you checked in with at the door. Only checked-in attendees can submit."}
            </DialogDescription>
          </DialogHeader>

          {done ? (
            <div className="panel px-4 py-8 text-center" data-testid="submit-outcome" data-outcome={outcome ?? ""}>
              {outcome === "pending" ? (
                <>
                  <div className="label-hw text-display mb-2">·RECEIVED, WAITING FOR AN ORGANISER</div>
                  <p className="label-hw-dim normal-case">
                    Your email ({lumaEmail.trim()}) is verified but isn't on Luma's checked-in list yet, so an organiser will
                    confirm it. Once they do, your project goes live with the time you sent it. You don't need to submit again.
                  </p>
                </>
              ) : (
                <>
                  <div className="label-hw text-display mb-2">{outcome === "updated" ? "·SUBMISSION UPDATED" : "·SUBMISSION RECEIVED"}</div>
                  <p className="label-hw-dim normal-case">
                    {outcome === "updated" ? "Your changes are in." : "Your project is in."} We've emailed a confirmation to{" "}
                    {lumaEmail.trim() || "your inbox"}.{" "}
                    {profile
                      ? 'To change it later, choose "Update my submission" on this page and verify this email.'
                      : "Need to change something? Reopen this form and submit again with the same email before the deadline."}
                  </p>
                </>
              )}
            </div>
          ) : mode === "update" && !verified ? (
            <div className="space-y-3" data-testid="update-gate">
              <div className="space-y-1.5">
                <Label htmlFor="sub-email" className="label-hw-dim">THE EMAIL YOU SUBMITTED WITH</Label>
                <Input id="sub-email" type="email" value={lumaEmail} onChange={(e) => setEmail(e.target.value)} className="font-mono text-sm" />
              </div>
              {linkSentTo ? (
                <p className="label-hw text-display normal-case" data-testid="link-sent">
                  Sign-in link sent to {linkSentTo}. Open it on this device; you'll come back here with your submission loaded.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={verifyEmail}
                  className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-4 py-2"
                >
                  {USE_MOCK_DATA ? "VERIFY THIS EMAIL ▸" : "SEND ME A SIGN-IN LINK ▸"}
                </button>
              )}
              {error && <div className="label-hw text-destructive">·{error.toUpperCase()}</div>}
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="space-y-1.5">
                  <Label htmlFor="sub-name" className="label-hw-dim">{profile ? "POINT PERSON NAME" : "YOUR NAME"}</Label>
                  <Input id="sub-name" value={submitterName} onChange={(e) => setName(e.target.value)} className="font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor="sub-email" className="label-hw-dim">
                      {profile ? "POINT PERSON EMAIL (USED ON LUMA)" : "EMAIL USED ON LUMA"}
                    </Label>
                    {verified && (
                      <span className="label-hw text-led" data-testid="email-verified">
                        ✓ VERIFIED
                      </span>
                    )}
                  </div>
                  {profile && (
                    <p className="label-hw-dim normal-case">Prizes go to the point person. Never shown publicly.</p>
                  )}
                  <Input
                    id="sub-email"
                    type="email"
                    value={lumaEmail}
                    readOnly={mode === "update"}
                    onChange={(e) => setEmail(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-title" className="label-hw-dim">PROJECT TITLE</Label>
                  <Input id="sub-title" value={projectTitle} onChange={(e) => setTitle(e.target.value)} className="font-mono text-sm" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="sub-brief" className="label-hw-dim">{profile ? "DESCRIPTION" : "WHAT DOES IT DO?"}</Label>
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
                  <Label htmlFor="sub-video" className="label-hw-dim">{profile ? videoLabel(tracked.track) : "VIDEO DEMO LINK"}</Label>
                  <Input id="sub-video" placeholder="https://…" value={videoUrl} onChange={(e) => setVideo(e.target.value)} className="font-mono text-sm" />
                  {profile && videoOptional(tracked.track) && (
                    <p className="label-hw-dim normal-case">Optional, but strongly preferred: it's the easiest way to prove Works. Judges watch only the first 2 minutes.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-github" className="label-hw-dim">{profile ? "PUBLIC REPO WITH A README" : "GITHUB URL"}</Label>
                  <Input id="sub-github" placeholder="https://github.com/…" value={githubUrl} onChange={(e) => setGithub(e.target.value)} className="font-mono text-sm" />
                </div>

                {profile && (
                  <TrackedSubmissionFields profile={profile} value={tracked} onChange={setTracked} />
                )}

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
              {problem && (
                <div className="border border-warn rounded-sm p-3 space-y-2" role="alert" data-testid="submit-problem" data-problem={problem}>
                  <p className="text-[13px] text-display">{problemMessage}</p>
                  {problem === "not_checked_in" && (
                    <p className="label-hw-dim normal-case">
                      Use the email you checked in with at the door, or verify this one: we'll check it against Luma again, and
                      if it's still not there an organiser can let your project in.
                    </p>
                  )}
                  {problem === "retry" && retryScheduled && <p className="label-hw-dim">TRYING AGAIN IN A FEW SECONDS…</p>}
                  {linkSentTo ? (
                    <p className="label-hw text-display normal-case" data-testid="link-sent">
                      Sign-in link sent to {linkSentTo}. Open it on this device; your form is saved and will be here when you come
                      back.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {problem === "not_checked_in" && (
                        <button
                          type="button"
                          onClick={() => {
                            setProblem(null);
                            document.getElementById("sub-email")?.focus();
                          }}
                          className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
                        >
                          USE ANOTHER EMAIL
                        </button>
                      )}
                      {(problem === "not_checked_in" || problem === "verify_to_update") && (
                        <button
                          type="button"
                          onClick={verifyThenSubmit}
                          disabled={submitting}
                          className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-3 py-1.5"
                        >
                          VERIFY THIS EMAIL ▸
                        </button>
                      )}
                      {problem === "retry" && (
                        <button
                          type="button"
                          onClick={() => {
                            window.clearTimeout(retryTimer.current);
                            setRetryScheduled(false);
                            handleSubmit();
                          }}
                          disabled={submitting}
                          className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-3 py-1.5"
                        >
                          TRY AGAIN
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {draftSaved && (
                <p className="label-hw-dim flex items-center justify-between gap-2" data-testid="draft-saved">
                  <span>DRAFT SAVED ON THIS DEVICE</span>
                  <button type="button" onClick={startOver} className="underline hover:text-display">
                    START OVER
                  </button>
                </p>
              )}
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
                  ) : mode === "update" ? (
                    "UPDATE SUBMISSION ▸"
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
