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
import { api, type ApiProgram, type MySubmission, type SubmissionPayload, type SubmissionState, type SubmitResult, ApiError, USE_MOCK_DATA } from "@/lib/api";
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
import { RequiredMark } from "@/components/program/RequiredMark";
import { ExperienceRatingField } from "@/components/program/ExperienceRatingField";
import {
  EXPERIENCE_RATING_CATEGORIES,
  isRatingsComplete,
  ratingFieldId,
  type ExperienceRatingsDraft,
} from "@/lib/experienceRatings";
import {
  detailsToTrackedForm,
  emptyTrackedForm,
  invalidBorder,
  invalidText,
  trackedFormToDetails,
  validateTrackedForm,
  videoOptional,
  type FieldIssue,
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
const EVENT_LIKED_MAX = 500;

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
 * questions are collected and required. Every program asks the builder to rate
 * the event (experienceRatings.ts), also required.
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
  ratings: ExperienceRatingsDraft;
  eventLiked?: string;
};
type Problem = "not_checked_in" | "verify_to_update" | "retry";
type StoredDraft = Draft & { savedAt?: string };

/** Tracked programs: the team's entry on Stadium, as last loaded or saved. */
type Entry = Partial<SubmissionState> & { role: "owner" | "editor"; editors: string[] };

const DRAFT_SAVE_MS = 400;
const RETRY_AFTER_MS = 5000;
// Unsaved changes kept on this device. Tracked programs keep one per verified
// email, so the point person and a teammate sharing a laptop never overwrite
// each other's; the legacy form keeps one per program.
const draftKey = (slug: string, who?: string | null) =>
  who ? `stadium_submit_draft_${slug}:${who.trim().toLowerCase()}` : `stadium_submit_draft_${slug}`;
const readDraft = (slug: string, who?: string | null): StoredDraft | null => {
  try {
    const raw = localStorage.getItem(draftKey(slug, who));
    return raw ? (JSON.parse(raw) as StoredDraft) : null;
  } catch {
    return null;
  }
};
const writeDraft = (slug: string, d: StoredDraft | null, who?: string | null) => {
  try {
    if (d) localStorage.setItem(draftKey(slug, who), JSON.stringify(d));
    else localStorage.removeItem(draftKey(slug, who));
  } catch {
    // Storage unavailable: the form still works, it just isn't kept.
  }
};
const normEmail = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();

// Tracked programs: the sign-in link last sent from this browser. In
// localStorage so it's shared with the tab the link opens in: coming back with
// a session for this email continues straight to the submission, and a reopened
// form shows "link sent" instead of a send button Supabase would throttle.
type LinkSent = { email: string; sentAt: number; cooldownUntil: number };
const LINK_COOLDOWN_MS = 60 * 1000;
// A link older than this no longer auto-continues (the session asks "continue as").
const LINK_TRUST_MS = 60 * 60 * 1000;
const linkKey = (slug: string) => `stadium_signin_link_${slug}`;
const readLinkSent = (slug: string): LinkSent | null => {
  try {
    const raw = localStorage.getItem(linkKey(slug));
    const v = raw ? (JSON.parse(raw) as LinkSent) : null;
    return v && Date.now() - v.sentAt < LINK_TRUST_MS ? v : null;
  } catch {
    return null;
  }
};
const writeLinkSent = (slug: string, v: LinkSent | null) => {
  try {
    if (v) localStorage.setItem(linkKey(slug), JSON.stringify(v));
    else localStorage.removeItem(linkKey(slug));
  } catch {
    // Storage unavailable: the gate still works, it just doesn't remember the link.
  }
};
// Supabase's resend throttle: "For security purposes, you can only request this after 30 seconds."
const throttleSeconds = (e: unknown): number | null => {
  const m = /after (\d+) seconds?/i.exec((e as Error)?.message ?? "");
  if (m) return Number(m[1]);
  const code = (e as { code?: string })?.code;
  return code === "over_email_send_rate_limit" ? 60 : null;
};
const formatStamp = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST"
    : "";

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
  // Tracked programs: drafts on Stadium, opened by the point person or a
  // teammate with edit access after verifying their email.
  const trackedFlow = !!profile;
  const [gateEmail, setGateEmail] = useState("");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [entryLoaded, setEntryLoaded] = useState(false);
  const [restoredFromDevice, setRestoredFromDevice] = useState(false);
  const [feedbackAttempted, setFeedbackAttempted] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [accessBusy, setAccessBusy] = useState<string | null>(null);
  const [accessErrors, setAccessErrors] = useState<Record<string, string>>({});
  // Gate: the link sent from this browser, whether an existing sign-in session
  // was confirmed as the person submitting, and a failed load (never a blank form).
  const [linkSent, setLinkSent] = useState<LinkSent | null>(null);
  const [sessionConfirmed, setSessionConfirmed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const [submitterName, setName] = useState("");
  const [lumaEmail, setEmail] = useState("");
  const [projectTitle, setTitle] = useState("");
  const [projectBrief, setBrief] = useState("");
  const [videoUrl, setVideo] = useState("");
  const [githubUrl, setGithub] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [ratings, setRatings] = useState<ExperienceRatingsDraft>({});
  const [eventLiked, setEventLiked] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);

  // Feedback answers, kept generic and assembled into FeedbackAnswers on submit.
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [surfacesPrimary, setSurfacesPrimary] = useState<string | null>(null);
  const [singles, setSingles] = useState<Record<string, string>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);
  // After the first submit attempt, missing or invalid fields are marked red
  // (recomputed as they type, so a fixed field clears at once).
  const [attempted, setAttempted] = useState(false);
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
  // Tracked: who is signed in (point person or teammate), whatever the form's
  // point-person email says.
  const signedInEmail = trackedFlow
    ? USE_MOCK_DATA
      ? mockVerifiedEmails.has(normEmail(gateEmail))
        ? normEmail(gateEmail)
        : null
      : social.token && social.email
        ? normEmail(social.email)
        : null
    : null;
  // A session only opens a submission once it's confirmed as the person
  // submitting: back from the link we sent, or "continue as" (an organiser's
  // admin session must not silently become a builder).
  const sessionEmail = signedInEmail && (USE_MOCK_DATA || sessionConfirmed) ? signedInEmail : null;
  const cooldownLeft = linkSent ? Math.max(0, Math.ceil((linkSent.cooldownUntil - now) / 1000)) : 0;
  const verified = trackedFlow
    ? !!sessionEmail
    : !!emailNorm && (USE_MOCK_DATA ? mockVerifiedEmails.has(emailNorm) : !!social.token && social.email?.toLowerCase() === emailNorm);
  const isEditor = entry?.role === "editor";
  const isSubmitted = entry?.status === "submitted";
  const feedbackDone = !!entry?.feedbackSubmittedAt;
  const sessionOpts = { verifiedToken: USE_MOCK_DATA ? null : social.token, sessionEmail };

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
    setRatings(d?.ratings ?? {});
    setEventLiked(d?.eventLiked ?? "");
  }, []);

  // Opening restores this device's draft (never wipes it). Tracked programs load
  // the signed-in person's own device draft once their entry is loaded.
  useEffect(() => {
    if (open) {
      if (trackedFlow) {
        applyDraft(null);
        setEntry(null);
        setEntryLoaded(false);
        setRestoredFromDevice(false);
        setFeedbackAttempted(false);
        setAccessErrors({});
        loadStarted.current = false;
        setSessionConfirmed(false);
        setLoadError(null);
        setLinkSent(readLinkSent(program.slug));
        setGateEmail((prev) => prev || readLinkSent(program.slug)?.email || social.email || readDraft(program.slug)?.lumaEmail || "");
      } else {
        applyDraft(readDraft(program.slug));
      }
      setCompany("");
      setTermsOpen(false);
      setError(null);
      setAttempted(false);
      setOutcome(null);
      setProblem(null);
      setLinkSentTo(null);
      setLoadedMine(false);
      retried.current = false;
    }
    return () => window.clearTimeout(retryTimer.current);
    // social.email only seeds the gate; reopening is what resets the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, program.slug, applyDraft, trackedFlow]);

  // Keep the draft as they type (the honeypot is never saved).
  // Tracked: only once the entry is loaded, under the signed-in person's key.
  // `baseline` is the form as loaded or last saved; only a change from it is
  // kept (null = take the next render's form as the baseline, after a load).
  const baseline = useRef<string | null>(null);
  const formShape = JSON.stringify({
    submitterName, lumaEmail, projectTitle, projectBrief, videoUrl, githubUrl,
    agreedToTerms, surfaces, surfacesPrimary, singles, texts, tracked, ratings, eventLiked,
  });
  useEffect(() => {
    if (!open || done) return;
    if (trackedFlow && (!sessionEmail || !entryLoaded)) return;
    const draft: StoredDraft = {
      submitterName, lumaEmail, projectTitle, projectBrief, videoUrl, githubUrl,
      agreedToTerms, surfaces, surfacesPrimary, singles, texts, tracked, ratings, eventLiked,
      savedAt: new Date().toISOString(),
    };
    const shape = formShape;
    if (trackedFlow && baseline.current === null) {
      baseline.current = shape;
      return;
    }
    const t = window.setTimeout(() => {
      // Loading the entry fills the form too; only a change by the builder counts.
      if (trackedFlow && shape === baseline.current) return;
      writeDraft(program.slug, draft, trackedFlow ? sessionEmail : null);
      setDraftSaved(true);
    }, DRAFT_SAVE_MS);
    return () => window.clearTimeout(t);
  }, [open, done, trackedFlow, sessionEmail, entryLoaded, program.slug, formShape, submitterName, lumaEmail, projectTitle, projectBrief, videoUrl, githubUrl, agreedToTerms, surfaces, surfacesPrimary, singles, texts, tracked, ratings, eventLiked]);

  const startOver = () => {
    writeDraft(program.slug, null, trackedFlow ? sessionEmail : null);
    setDraftSaved(false);
    setProblem(null);
    setError(null);
    setAttempted(false);
    // Tracked: drop this device's changes and reload the copy on Stadium.
    if (trackedFlow) {
      setRestoredFromDevice(false);
      setEntryLoaded(false);
      loadStarted.current = false;
    } else {
      applyDraft(null);
    }
  };

  // Apply the entry as saved on Stadium (and who may edit it).
  const applyMine = useCallback(
    (d: MySubmission) => {
      setName(d.submitterName ?? "");
      setEmail(d.lumaEmail ?? "");
      setTitle(d.projectTitle ?? "");
      setBrief(d.projectBrief ?? "");
      setVideo(d.videoUrl ?? "");
      setGithub(d.githubUrl ?? "");
      if (d.details) setTracked(detailsToTrackedForm(d.details));
      if (d.ratings) setRatings(d.ratings);
      setEventLiked(d.eventLiked ?? "");
      // Agreed when it was first saved; the box stays ticked.
      if (d.status === "submitted") setAgreedToTerms(true);
    },
    [],
  );

  // Back from the link we sent: the session is for that email, so continue.
  useEffect(() => {
    if (!open || !trackedFlow || USE_MOCK_DATA || sessionConfirmed || !signedInEmail) return;
    if (linkSent && normEmail(linkSent.email) === signedInEmail) setSessionConfirmed(true);
  }, [open, trackedFlow, sessionConfirmed, signedInEmail, linkSent]);

  // Countdown until the sign-in link can be sent again.
  useEffect(() => {
    if (!open || !linkSent || linkSent.cooldownUntil <= Date.now()) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [open, linkSent]);

  // Tracked: once signed in, load the entry this email may edit (point person
  // or teammate), then this person's unsaved device changes if they're newer.
  const loadStarted = useRef(false);
  useEffect(() => {
    if (!open || !trackedFlow || !sessionEmail || entryLoaded || loadStarted.current) return;
    loadStarted.current = true;
    const who = sessionEmail;
    // A draft kept before sign-in (unkeyed) moves to this person's key.
    let local = readDraft(program.slug, who);
    const loose = readDraft(program.slug);
    if (!local && loose && (!loose.lumaEmail || normEmail(loose.lumaEmail) === who)) {
      local = loose;
      writeDraft(program.slug, loose, who);
      writeDraft(program.slug, null);
    }
    const newer = (d: MySubmission) =>
      !!local?.savedAt && Date.parse(local.savedAt) > Date.parse(d.lastEditedAt ?? d.updatedAt ?? d.createdAt ?? "0");
    api
      .getMySubmission(program.slug, { email: who, verifiedToken: sessionOpts.verifiedToken })
      .then((r) => {
        const d = r.data;
        setEntry({
          role: d.role ?? "owner",
          editors: d.editors ?? [],
          status: d.status ?? "submitted",
          finalizedAt: d.finalizedAt ?? null,
          feedbackSubmittedAt: d.feedbackSubmittedAt ?? null,
          lastEditedAt: d.lastEditedAt ?? null,
          lastEditedByName: d.lastEditedByName ?? null,
          lastEditedByEmail: d.lastEditedByEmail ?? null,
        });
        applyMine(d);
        setLoadError(null);
        if (local && newer(d)) {
          applyDraft(local);
          // The point person's name and email always come from Stadium.
          setEmail(d.lumaEmail ?? "");
          if (d.role === "editor") setName(d.submitterName ?? "");
          setRestoredFromDevice(true);
        } else if (local) {
          writeDraft(program.slug, null, who);
        }
        baseline.current = null;
        setEntryLoaded(true);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          // Nothing on Stadium yet: this person starts the team's entry.
          setEntry(null);
          if (local) {
            applyDraft(local);
            setRestoredFromDevice(true);
          }
          setEmail(who);
          setLoadError(null);
          baseline.current = null;
          setEntryLoaded(true);
          return;
        }
        // Never fall through to an empty form: saving it would overwrite the
        // team's entry. Stay on the gate with a retry.
        loadStarted.current = false;
        setLoadError((e as Error)?.message || "Couldn't load your submission.");
      });
    // sessionOpts is derived from sessionEmail and the token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trackedFlow, sessionEmail, entryLoaded, loadAttempt, program.slug, applyMine, applyDraft]);

  // Update mode: once the email is verified, load their submission to edit it.
  useEffect(() => {
    if (!open || trackedFlow || mode !== "update" || !verified || loadedMine) return;
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
  }, [open, trackedFlow, mode, verified, loadedMine, program.slug, lumaEmail, social.token, profile, toast]);

  // Prove the email is theirs: a sign-in link (back to this page with the form
  // saved). In the playground there's no email, so it's verified at once.
  const verifyEmail = async (): Promise<boolean> => {
    const email = (trackedFlow ? gateEmail : lumaEmail).trim();
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
      if (trackedFlow) {
        const sent = { email: normEmail(email), sentAt: Date.now(), cooldownUntil: Date.now() + LINK_COOLDOWN_MS };
        writeLinkSent(program.slug, sent);
        setLinkSent(sent);
        setNow(Date.now());
      }
      return false;
    } catch (e) {
      // Supabase throttles repeat links: a link was already sent, so say so
      // (with when another can be sent) instead of showing the raw error.
      const wait = throttleSeconds(e);
      if (trackedFlow && wait !== null) {
        const prev = readLinkSent(program.slug);
        const sent = {
          email: normEmail(email),
          sentAt: prev && normEmail(prev.email) === normEmail(email) ? prev.sentAt : Date.now(),
          cooldownUntil: Date.now() + wait * 1000,
        };
        writeLinkSent(program.slug, sent);
        setLinkSent(sent);
        setNow(Date.now());
        setError(null);
        return false;
      }
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

  // Every problem with the form, in form order; `field` is the DOM id to mark red and scroll to.
  const collectIssues = (): FieldIssue[] => {
    const issues: FieldIssue[] = [];
    const add = (field: string, message: string) => issues.push({ field, message });
    if (!submitterName.trim()) add("sub-name", "Your name is required.");
    if (!EMAIL_RE.test(lumaEmail.trim())) add("sub-email", "A valid email is required.");
    if (!projectTitle.trim()) add("sub-title", "A project title is required.");
    if (!projectBrief.trim()) add("sub-brief", "A short brief of what your project does is required.");
    else if (projectBrief.trim().length > BRIEF_MAX) add("sub-brief", `The brief must be ${BRIEF_MAX} characters or fewer.`);
    // Privacy-only entries may skip the video (strongly preferred); a given link must still be valid.
    if (!(videoIsOptional && !videoUrl.trim()) && !isHttpUrl(videoUrl)) add("sub-video", "A valid video demo link (http/https) is required.");
    if (!isHttpUrl(githubUrl)) add("sub-github", "A valid GitHub URL (http/https) is required.");

    if (profile) issues.push(...validateTrackedForm(profile, tracked));

    if (feedbackConfig) {
      for (const q of feedbackConfig.questions) {
        if (q.kind === "multi-primary") {
          if (surfaces.length === 0) add(`fb-${q.id}`, `Please answer: ${q.label}`);
          else if (!surfacesPrimary) add(`fb-${q.id}`, "Star the surface you relied on most.");
        } else if (q.kind === "single") {
          if (!singles[q.id]) add(`fb-${q.id}`, `Please answer: ${q.label}`);
        } else if (q.kind === "text" && q.required) {
          if (!(texts[q.id] || "").trim()) add(`fb-${q.id}`, `Please answer: ${q.label}`);
        }
      }
    }

    // Tracked programs submit the ratings in their own feedback step.
    if (!trackedFlow) {
      for (const { id, label } of EXPERIENCE_RATING_CATEGORIES) {
        if (ratings[id] === undefined) add(ratingFieldId(id), `Please rate: ${label}`);
      }
    }

    if (terms && !agreedToTerms) add("sub-terms", "You must agree to the submission terms.");
    return issues;
  };
  // A draft only needs who and what (tracked programs).
  const collectDraftIssues = (): FieldIssue[] => {
    const issues: FieldIssue[] = [];
    if (!submitterName.trim()) issues.push({ field: "sub-name", message: "Your name is required to save a draft." });
    if (!EMAIL_RE.test(lumaEmail.trim())) issues.push({ field: "sub-email", message: "A valid email is required." });
    if (!projectTitle.trim()) issues.push({ field: "sub-title", message: "A project title is required to save a draft." });
    return issues;
  };
  const [lastIntent, setLastIntent] = useState<"draft" | "finalize">("finalize");
  const videoIsOptional = !!profile && videoOptional(tracked.track);
  const issues = attempted ? (trackedFlow && lastIntent === "draft" ? collectDraftIssues() : collectIssues()) : [];
  const invalid = new Set(issues.map((i) => i.field));
  // Tracked feedback step: ratings marked red once they tried to submit it.
  if (trackedFlow && feedbackAttempted) {
    for (const { id } of EXPERIENCE_RATING_CATEGORIES) if (ratings[id] === undefined) invalid.add(ratingFieldId(id));
  }
  const bad = (id: string) => invalid.has(id);

  // Bring the first field that needs fixing into view and focus it.
  const showFirstIssue = (field: string) => {
    const el = document.getElementById(field);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  };

  // `intent` (tracked programs): "draft" saves the team's entry on Stadium
  // without sending it to judges; "finalize" sends it (and is the only save once
  // it's submitted). `quiet`: a save on the way to something else (feedback,
  // edit access) that stays in the form. Resolves true when saved.
  const handleSubmit = async (want: "draft" | "finalize" = "finalize", { quiet = false } = {}): Promise<boolean> => {
    const intent = trackedFlow ? (isSubmitted ? "finalize" : want) : "finalize";
    setLastIntent(intent);
    setAttempted(true);
    const found = trackedFlow && intent === "draft" ? collectDraftIssues() : collectIssues();
    if (found.length > 0) {
      setError(null);
      showFirstIssue(found[0].field);
      return false;
    }
    if (trackedFlow && intent === "finalize" && !feedbackDone) {
      setError("Submit the event feedback first (at the bottom of the form).");
      showFirstIssue("sub-feedback");
      return false;
    }
    // collectIssues guarantees every rating is set (legacy form); this narrows the type.
    if (!trackedFlow && !isRatingsComplete(ratings)) return false;
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

      const payload: SubmissionPayload = {
        submitterName: submitterName.trim(),
        lumaEmail: lumaEmail.trim(),
        projectTitle: projectTitle.trim(),
        projectBrief: projectBrief.trim(),
        videoUrl: videoUrl.trim(),
        githubUrl: githubUrl.trim(),
        company,
        ...(terms && (agreedToTerms || !trackedFlow) ? { agreedToTerms: true } : {}),
        ...(feedback ? { feedback } : {}),
        // Tracked programs send the ratings in the feedback step instead.
        ...(trackedFlow ? {} : { ratings: ratings as SubmissionPayload["ratings"] }),
        ...(!trackedFlow && eventLiked.trim() ? { eventLiked: eventLiked.trim() } : {}),
        ...(profile ? { details: trackedFormToDetails(tracked), intent } : {}),
      };
      const result = await api.submitProjectSubmission(
        program.slug,
        payload,
        trackedFlow ? sessionOpts : { verifiedToken: verified && !USE_MOCK_DATA ? social.token : null },
      );
      writeDraft(program.slug, null, trackedFlow ? sessionEmail : null);
      setDraftSaved(false);
      setProblem(null);
      if (trackedFlow && result.outcome !== "pending") {
        const d = result.data;
        setEntry((prev) => ({
          role: prev?.role ?? "owner",
          editors: prev?.editors ?? [],
          status: d?.status ?? (intent === "draft" ? "draft" : "submitted"),
          finalizedAt: d?.finalizedAt ?? prev?.finalizedAt ?? null,
          feedbackSubmittedAt: d?.feedbackSubmittedAt ?? prev?.feedbackSubmittedAt ?? null,
          lastEditedAt: d?.lastEditedAt ?? null,
          lastEditedByName: d?.lastEditedByName ?? null,
          lastEditedByEmail: d?.lastEditedByEmail ?? null,
        }));
        setRestoredFromDevice(false);
        // What was just saved is the new baseline: the next change is kept on the device.
        baseline.current = formShape;
      }
      if (trackedFlow && (intent === "draft" || quiet) && result.outcome !== "pending") {
        if (!quiet) {
          toast({ title: "Draft saved on Stadium", description: "Only your team sees it. Finalize and submit when it's ready." });
        }
        return true;
      }
      setOutcome(result.outcome);
      toast({
        title:
          result.outcome === "pending"
            ? "Received, waiting for an organiser"
            : result.outcome === "updated"
              ? "Submission updated"
              : "Project submitted",
        description: "Check your email for a confirmation.",
      });
      return true;
    } catch (e) {
      // The draft stays saved whatever happens.
      const code = e instanceof ApiError ? e.code : undefined;
      const status = e instanceof ApiError ? e.status : 0;
      if (code === "feedback_required") {
        setError("Submit the event feedback first (at the bottom of the form).");
        showFirstIssue("sub-feedback");
      } else if (code === "submissions_closed") {
        setError("Submissions are closed. Your last saved version is the one the judges see.");
      } else if (code === "email_in_use") {
        setError((e as Error).message);
      } else if (code === "not_checked_in" || status === 403) {
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
            submitRef.current(intent, { quiet });
          }, RETRY_AFTER_MS);
        }
      }
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Tracked: the feedback step. Saves the draft first if there's no entry yet.
  const submitFeedback = async () => {
    setFeedbackAttempted(true);
    if (!isRatingsComplete(ratings)) {
      const missing = EXPERIENCE_RATING_CATEGORIES.find(({ id }) => ratings[id] === undefined);
      if (missing) showFirstIssue(ratingFieldId(missing.id));
      return;
    }
    if (!entry && !(await handleSubmit("draft", { quiet: true }))) return;
    setFeedbackBusy(true);
    try {
      const r = await api.submitSubmissionFeedback(program.slug, { ratings, eventLiked: eventLiked.trim() || null }, sessionOpts);
      setEntry((prev) => ({
        role: prev?.role ?? "owner",
        editors: prev?.editors ?? [],
        status: prev?.status ?? "draft",
        finalizedAt: prev?.finalizedAt ?? null,
        ...prev,
        feedbackSubmittedAt: r.data.feedbackSubmittedAt,
        lastEditedAt: r.data.lastEditedAt ?? prev?.lastEditedAt ?? null,
        lastEditedByName: r.data.lastEditedByName ?? prev?.lastEditedByName ?? null,
        lastEditedByEmail: r.data.lastEditedByEmail ?? prev?.lastEditedByEmail ?? null,
      }));
      setError(null);
      toast({ title: "Feedback submitted", description: "Thank you. You can now finalize and submit." });
    } catch (e) {
      toast({ title: "Couldn't submit the feedback", description: (e as Error).message, variant: "destructive" });
    } finally {
      setFeedbackBusy(false);
    }
  };

  // Tracked: the point person gives (or removes) a teammate's edit access. The
  // team list is saved first, since the server checks the teammate is on it.
  const setEditAccess = async (email: string, grant: boolean) => {
    const e = normEmail(email);
    setAccessErrors((prev) => ({ ...prev, [e]: "" }));
    setAccessBusy(e);
    try {
      if (grant && !(await handleSubmit(isSubmitted ? "finalize" : "draft", { quiet: true }))) {
        setAccessErrors((prev) => ({ ...prev, [e]: "Fix the fields marked in red, then try again." }));
        return;
      }
      const r = grant
        ? await api.addSubmissionEditor(program.slug, e, sessionOpts)
        : await api.removeSubmissionEditor(program.slug, e, sessionOpts);
      setEntry((prev) => (prev ? { ...prev, editors: r.data.editors } : prev));
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      setAccessErrors((prev) => ({
        ...prev,
        [e]: code === "not_checked_in" ? "This email isn't checked in on Luma." : (err as Error).message,
      }));
    } finally {
      setAccessBusy(null);
    }
  };

  // Tracked: sign out to let someone else (a teammate) open the submission.
  const switchPerson = async () => {
    if (!USE_MOCK_DATA) await social.signOut();
    writeLinkSent(program.slug, null);
    setLinkSent(null);
    setSessionConfirmed(false);
    setLoadError(null);
    setGateEmail("");
    setEntry(null);
    setEntryLoaded(false);
    loadStarted.current = false;
    applyDraft(null);
    setLinkSentTo(null);
    setDraftSaved(false);
  };
  // ✕ is the only way out of an unfinished form; the draft (and a verified
  // email) stay on this device, so reopening picks up where they left off.
  const closeForm = (v: boolean) => {
    if (!v && !done && trackedFlow && entryLoaded && draftSaved) {
      toast({ title: "Unsaved changes kept on this device", description: "SAVE DRAFT keeps them on Stadium for your team." });
    } else if (!v && !done && mode === "new" && !trackedFlow) {
      toast({ title: "Draft saved on this device", description: "Open SUBMIT again to continue where you left off." });
    }
    onOpenChange(v);
  };
  const submitRef = useRef(handleSubmit);
  submitRef.current = handleSubmit;

  const verifyThenSubmit = async () => {
    if (await verifyEmail()) {
      setProblem(null);
      if (mode !== "update" || problem) await submitRef.current(lastIntent);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (submitting ? null : closeForm(v))}>
        <DialogContent
          className="sm:max-w-lg lg:max-w-[50vw]"
          // Only ✕ closes an unfinished form: a stray click or Escape mustn't drop the builder out.
          onInteractOutside={(e) => (done ? null : e.preventDefault())}
          onEscapeKeyDown={(e) => (done ? null : e.preventDefault())}
          // Open without focusing (and ringing) the first field.
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">
              {trackedFlow ? "YOUR TEAM'S SUBMISSION TO" : mode === "update" ? "UPDATE YOUR SUBMISSION TO" : "SUBMIT A PROJECT TO"}{" "}
              {program.name.toUpperCase()}
            </DialogTitle>
            <DialogDescription className="text-body">
              {trackedFlow
                ? "Save a draft as you go, give teammates edit access, then finalize and submit for judging. Only checked-in attendees can submit."
                : mode === "update"
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
                    {outcome === "updated" ? "Your changes are in." : "Your project is in the judging queue."} We've emailed a confirmation to{" "}
                    {lumaEmail.trim() || "your inbox"}.{" "}
                    {profile
                      ? 'You and teammates with edit access can keep changing it until submissions close: choose "Start / continue my submission" on this page.'
                      : "Need to change something? Reopen this form and submit again with the same email before the deadline."}
                  </p>
                </>
              )}
            </div>
          ) : trackedFlow && (!sessionEmail || !entryLoaded) ? (
            <div className="space-y-3" data-testid="submission-gate">
              {!USE_MOCK_DATA && social.loading ? (
                <p className="label-hw-dim flex items-center gap-2" role="status" data-testid="gate-checking">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> CHECKING YOUR SIGN-IN…
                </p>
              ) : sessionEmail && loadError ? (
                <div className="space-y-2" role="alert" data-testid="gate-load-error">
                  <p className="text-[13px] text-display">Couldn't load the submission for {sessionEmail}: {loadError}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLoadError(null);
                        setLoadAttempt((n) => n + 1);
                      }}
                      className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-2"
                      data-testid="gate-retry"
                    >
                      TRY AGAIN
                    </button>
                    <button type="button" onClick={switchPerson} className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-4 py-2">
                      USE A DIFFERENT EMAIL
                    </button>
                  </div>
                </div>
              ) : sessionEmail ? (
                <p className="label-hw-dim flex items-center gap-2" role="status">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> LOADING YOUR TEAM'S SUBMISSION…
                </p>
              ) : signedInEmail ? (
                <div className="space-y-2" data-testid="gate-continue">
                  <p className="text-body text-[13px] leading-relaxed">
                    You're signed in as <span className="text-display">{signedInEmail}</span>. Continue as this email to open its
                    submission (as the point person, or as a teammate with edit access).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSessionConfirmed(true)}
                      className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-2"
                      data-testid="gate-continue-as"
                    >
                      CONTINUE AS {signedInEmail.toUpperCase()} ▸
                    </button>
                    <button type="button" onClick={switchPerson} className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-4 py-2" data-testid="gate-other-email">
                      USE A DIFFERENT EMAIL
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-body text-[13px] leading-relaxed">
                    The point person opens the team's submission with the email they checked in with on Luma. Teammates the point
                    person gives edit access open it with their own checked-in email.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-gate-email" className="label-hw-dim">YOUR EMAIL (USED ON LUMA)</Label>
                    <Input id="sub-gate-email" type="email" value={gateEmail} onChange={(e) => setGateEmail(e.target.value)} className="font-mono text-sm" />
                  </div>
                  {!USE_MOCK_DATA && linkSent && normEmail(linkSent.email) === normEmail(gateEmail) && (
                    <p className="label-hw text-display normal-case" data-testid="link-sent">
                      Sign-in link sent to {linkSent.email}. Open it on this device (check spam too); you'll come back here with your
                      team's submission open.
                      {cooldownLeft > 0 ? ` You can request a new link in ${cooldownLeft}s.` : ""}
                    </p>
                  )}
                  {USE_MOCK_DATA || !linkSent || normEmail(linkSent.email) !== normEmail(gateEmail) || cooldownLeft === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        void verifyEmail().then((ok) => ok && setVerifyTick((n) => n + 1));
                      }}
                      className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-2"
                      data-testid="gate-verify"
                    >
                      {USE_MOCK_DATA
                        ? "VERIFY THIS EMAIL ▸"
                        : linkSent && normEmail(linkSent.email) === normEmail(gateEmail)
                          ? "SEND A NEW LINK ▸"
                          : "SEND ME A SIGN-IN LINK ▸"}
                    </button>
                  ) : null}
                  {error && <div className="label-hw text-destructive">·{error.toUpperCase()}</div>}
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
              {/* Equal side padding (pulled back with -mx) so focus rings aren't clipped by the scroll edge. */}
              <div className="space-y-4 max-h-[60vh] overflow-y-auto -mx-2 px-2 py-1">
                {trackedFlow && (
                  <div
                    className={
                      "border rounded-sm p-3 space-y-1 " + (isSubmitted ? "border-led" : "border-hairline bg-panel-deep")
                    }
                    data-testid="submission-status"
                    data-status={entry?.status ?? "new"}
                  >
                    <div className={"label-hw " + (isSubmitted ? "text-led" : "text-display")}>
                      {isSubmitted
                        ? "·SUBMITTED · IN THE JUDGING QUEUE · YOU CAN STILL EDIT UNTIL SUBMISSIONS CLOSE"
                        : entry
                          ? "·DRAFT · NOT VISIBLE TO JUDGES UNTIL YOU FINALIZE AND SUBMIT"
                          : "·NEW · SAVE A DRAFT TO KEEP IT ON STADIUM FOR YOUR TEAM"}
                    </div>
                    {entry?.lastEditedAt && (
                      <p className="label-hw-dim normal-case" data-testid="last-saved">
                        Last saved {formatStamp(entry.lastEditedAt)}
                        {entry.lastEditedByName ? ` by ${entry.lastEditedByName}` : ""}
                        {entry.lastEditedByEmail ? ` (${entry.lastEditedByEmail})` : ""}.
                      </p>
                    )}
                    <p className="label-hw-dim normal-case flex flex-wrap items-center gap-x-2">
                      <span data-testid="signed-in-as">
                        Signed in as {sessionEmail}
                        {isEditor ? " (teammate with edit access)" : entry ? " (point person)" : ""}.
                      </span>
                      <button type="button" onClick={switchPerson} className="underline hover:text-display" data-testid="switch-person">
                        NOT YOU?
                      </button>
                    </p>
                    {restoredFromDevice && (
                      <p className="label-hw text-warn normal-case flex flex-wrap items-center gap-x-2" data-testid="restored-from-device">
                        <span>Restored your unsaved changes from this device.</span>
                        <button type="button" onClick={startOver} className="underline hover:text-display">
                          DISCARD
                        </button>
                      </p>
                    )}
                  </div>
                )}
                <p className="label-hw-dim normal-case" data-testid="required-note">
                  Fields marked * are required to finalize.{trackedFlow ? " A draft needs only the point person and a title." : ""}
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-name" className={"label-hw-dim" + invalidText(bad("sub-name"))}>
                    {profile ? "POINT PERSON NAME" : "YOUR NAME"}<RequiredMark />
                  </Label>
                  <Input id="sub-name" value={submitterName} readOnly={isEditor} onChange={(e) => setName(e.target.value)} aria-invalid={bad("sub-name") || undefined} className={"font-mono text-sm" + invalidBorder(bad("sub-name"))} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <Label htmlFor="sub-email" className={"label-hw-dim" + invalidText(bad("sub-email"))}>
                      {profile ? "POINT PERSON EMAIL (USED ON LUMA)" : "EMAIL USED ON LUMA"}<RequiredMark />
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
                    readOnly={mode === "update" || trackedFlow}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={bad("sub-email") || undefined}
                    className={"font-mono text-sm" + invalidBorder(bad("sub-email"))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-title" className={"label-hw-dim" + invalidText(bad("sub-title"))}>PROJECT TITLE<RequiredMark /></Label>
                  <Input id="sub-title" value={projectTitle} onChange={(e) => setTitle(e.target.value)} aria-invalid={bad("sub-title") || undefined} className={"font-mono text-sm" + invalidBorder(bad("sub-title"))} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="sub-brief" className={"label-hw-dim" + invalidText(bad("sub-brief"))}>
                      {profile ? "DESCRIPTION" : "WHAT DOES IT DO?"}<RequiredMark />
                    </Label>
                    <span className="label-hw-dim">{projectBrief.trim().length}/{BRIEF_MAX}</span>
                  </div>
                  <Textarea
                    id="sub-brief"
                    rows={3}
                    maxLength={BRIEF_MAX}
                    placeholder="In 2-3 sentences, describe your project and what it does."
                    value={projectBrief}
                    onChange={(e) => setBrief(e.target.value)}
                    aria-invalid={bad("sub-brief") || undefined}
                    className={"font-mono text-sm" + invalidBorder(bad("sub-brief"))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-video" className={"label-hw-dim" + invalidText(bad("sub-video"))}>
                    {profile ? videoLabel(tracked.track) : "VIDEO DEMO LINK"}<RequiredMark show={!videoIsOptional} />
                  </Label>
                  <Input id="sub-video" placeholder="https://…" value={videoUrl} onChange={(e) => setVideo(e.target.value)} aria-invalid={bad("sub-video") || undefined} className={"font-mono text-sm" + invalidBorder(bad("sub-video"))} />
                  {videoIsOptional && (
                    <p className="label-hw-dim normal-case">Optional, but strongly preferred: it's the easiest way to prove Works. Judges watch only the first 2 minutes.</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sub-github" className={"label-hw-dim" + invalidText(bad("sub-github"))}>
                    {profile ? "PUBLIC REPO WITH A README" : "GITHUB URL"}<RequiredMark />
                  </Label>
                  <Input id="sub-github" placeholder="https://github.com/…" value={githubUrl} onChange={(e) => setGithub(e.target.value)} aria-invalid={bad("sub-github") || undefined} className={"font-mono text-sm" + invalidBorder(bad("sub-github"))} />
                </div>

                {profile && (
                  <TrackedSubmissionFields
                    profile={profile}
                    value={tracked}
                    onChange={setTracked}
                    invalid={invalid}
                    editAccess={{
                      canManage: !isEditor,
                      editors: entry?.editors ?? [],
                      busy: accessBusy,
                      errors: accessErrors,
                      onChange: setEditAccess,
                      ownerEmail: lumaEmail,
                    }}
                  />
                )}

                {feedbackConfig && (
                  <div className="space-y-4 border-t border-hairline-subtle pt-4">
                    <div className="label-hw text-display">·FEEDBACK</div>
                    {feedbackConfig.questions.map((q) => {
                      if (q.kind === "multi-primary") {
                        return (
                          <fieldset key={q.id} id={`fb-${q.id}`} tabIndex={-1} className="space-y-2" aria-invalid={bad(`fb-${q.id}`) || undefined}>
                            <legend className={"label-hw-dim" + invalidText(bad(`fb-${q.id}`))}>{q.label.toUpperCase()}<RequiredMark /></legend>
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
                          <fieldset key={q.id} id={`fb-${q.id}`} tabIndex={-1} className="space-y-2" aria-invalid={bad(`fb-${q.id}`) || undefined}>
                            <legend className={"label-hw-dim" + invalidText(bad(`fb-${q.id}`))}>{q.label.toUpperCase()}<RequiredMark /></legend>
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
                          <Label htmlFor={`fb-${q.id}`} className={"label-hw-dim" + invalidText(bad(`fb-${q.id}`))}>
                            {q.label.toUpperCase()}<RequiredMark show={!!q.required} />
                          </Label>
                          <Input
                            id={`fb-${q.id}`}
                            placeholder={q.placeholder}
                            value={texts[q.id] || ""}
                            onChange={(e) => setTexts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            aria-invalid={bad(`fb-${q.id}`) || undefined}
                            className={"font-mono text-sm" + invalidBorder(bad(`fb-${q.id}`))}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                <div id="sub-feedback" tabIndex={-1} className="space-y-3 border-t border-hairline-subtle pt-4" data-testid="feedback-step">
                  <div className="label-hw text-display">{trackedFlow ? "·EVENT FEEDBACK (REQUIRED BEFORE YOU FINALIZE)" : "·RATE THE EVENT"}</div>
                  <p className="label-hw-dim normal-case">1 is poor, 5 is excellent. Only the organisers see this.</p>
                  {EXPERIENCE_RATING_CATEGORIES.map(({ id, label }) => (
                    <ExperienceRatingField
                      key={id}
                      id={ratingFieldId(id)}
                      label={label}
                      value={ratings[id]}
                      onChange={(score) => setRatings((prev) => ({ ...prev, [id]: score }))}
                      invalid={bad(ratingFieldId(id))}
                    />
                  ))}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor="sub-event-liked" className="label-hw-dim">
                        ANYTHING YOU ESPECIALLY LIKED ABOUT THE EVENT? (OPTIONAL)
                      </Label>
                      <span className="label-hw-dim">{eventLiked.trim().length}/{EVENT_LIKED_MAX}</span>
                    </div>
                    <Textarea
                      id="sub-event-liked"
                      rows={2}
                      maxLength={EVENT_LIKED_MAX}
                      value={eventLiked}
                      onChange={(e) => setEventLiked(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  {trackedFlow && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={submitFeedback}
                        disabled={feedbackBusy || submitting}
                        className={feedbackDone ? "font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5" : "font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"}
                        data-testid="submit-feedback"
                      >
                        {feedbackBusy ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : null}
                        {feedbackDone ? "UPDATE FEEDBACK" : "SUBMIT FEEDBACK"}
                      </button>
                      {feedbackDone && (
                        <span className="label-hw text-led" data-testid="feedback-done">
                          ✓ FEEDBACK SUBMITTED
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {terms && (
                  <div className="flex items-start gap-2 border-t border-hairline-subtle pt-4">
                    <Checkbox
                      id="sub-terms"
                      checked={agreedToTerms}
                      onCheckedChange={(v) => setAgreedToTerms(v === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="sub-terms" className={"text-body text-sm cursor-pointer" + invalidText(bad("sub-terms"))}>
                      I agree to the terms of the hack.<RequiredMark />{" "}
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
                            void handleSubmit(lastIntent);
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
                  <span>{trackedFlow ? "UNSAVED CHANGES KEPT ON THIS DEVICE" : "DRAFT SAVED ON THIS DEVICE"}</span>
                  <button type="button" onClick={startOver} className="underline hover:text-display">
                    {trackedFlow ? "DISCARD" : "START OVER"}
                  </button>
                </p>
              )}
              {submitting && (
                <p className="font-mono text-[10px] tracking-[0.14em] text-label-mid text-center pt-1" role="status" aria-live="polite">
                  CHECKING YOU AGAINST THE LUMA GUEST LIST. THIS CAN TAKE A FEW SECONDS.
                </p>
              )}
              {(error || issues.length > 0) && (
                <div className="label-hw text-destructive" role="alert" data-testid="submit-error">
                  ·{(error ?? issues[0].message).toUpperCase()}
                  {!error && issues.length > 1 ? ` (+${issues.length - 1} MORE MARKED IN RED)` : ""}
                </div>
              )}
              <DialogFooter className="gap-2">
                {trackedFlow ? (
                  <>
                    {!isSubmitted && (
                      <button
                        type="button"
                        onClick={() => void handleSubmit("draft")}
                        disabled={submitting}
                        className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
                        data-testid="save-draft"
                      >
                        SAVE DRAFT
                      </button>
                    )}
                    <div className="flex flex-col items-end gap-1">
                      <button
                        type="button"
                        onClick={() => void handleSubmit("finalize")}
                        disabled={submitting || !feedbackDone}
                        title={feedbackDone ? undefined : "Submit the event feedback first"}
                        className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
                        data-testid="finalize-submit"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> SAVING…
                          </>
                        ) : isSubmitted ? (
                          "SAVE CHANGES ▸"
                        ) : (
                          "FINALIZE AND SUBMIT ▸"
                        )}
                      </button>
                      {!feedbackDone && (
                        <button
                          type="button"
                          onClick={() => showFirstIssue("sub-feedback")}
                          className="label-hw-dim normal-case underline hover:text-display"
                          data-testid="finalize-hint"
                        >
                          Submit the event feedback first
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
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
                )}
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
