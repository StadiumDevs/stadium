import type { ApiSubmissionDetails, SubmissionTrack } from "@/lib/api";
import { judgedTracksOf, trackById, type ProgramProfile } from "@/lib/programProfiles";

// State, validation and payload mapping for TrackedSubmissionFields.

export type TrackedFormState = {
  track: SubmissionTrack | "";
  themes: string[];
  pitch: string;
  team: { name: string; email: string; role: string }[];
  appType: string;
  publicUrl: string;
  demoVideoLength: string;
  technologies: string;
  testnetTxid: string;
  nextStep: string;
  /** Comma- or newline-separated links to anything already started. */
  nextStepLinks: string;
  /** Builder feedback for the ecosystem teams (free text, optional, not scored). */
  frictionNotes: string;
  /** Privacy and trust note (Privacy and Both). */
  privacyNote: string;
  /** Bitrefill feedback (Agentic and Both). */
  bitrefillWorked: string;
  bitrefillDidnt: string;
  anonymous: boolean;
};

export const emptyTrackedForm = (): TrackedFormState => ({
  track: "",
  themes: [],
  pitch: "",
  team: [],
  appType: "",
  publicUrl: "",
  demoVideoLength: "",
  technologies: "",
  testnetTxid: "",
  nextStep: "",
  nextStepLinks: "",
  frictionNotes: "",
  privacyNote: "",
  bitrefillWorked: "",
  bitrefillDidnt: "",
  anonymous: false,
});

export const PITCH_MAX = 140;
export const PRIVACY_NOTE_MAX = 3000;
export const BITREFILL_FEEDBACK_MAX = 2000;
/** Privacy and Both entries: the privacy and trust note and a testnet txid. */
export const judgesPrivacy = (track: TrackedFormState["track"]) => !!track && track !== "agentic";
/** Agentic and Both entries: the Bitrefill feedback, and a demo video or live link. */
export const judgesAgentic = (track: TrackedFormState["track"]) => track === "agentic" || track === "both";
/** The demo video is optional (strongly preferred) for Privacy-only entries. */
export const videoOptional = (track: TrackedFormState["track"]) => track === "privacy";
const splitLinks = (v: string) => v.split(/[\s,]+/).map((l) => l.trim()).filter(Boolean);
const isHttpUrl = (v: string) => /^https?:\/\/.+/i.test(v.trim());
export const isApp = (appType: string) => /app/i.test(appType);
export const needsTxid = (profile: ProgramProfile, track: TrackedFormState["track"]) =>
  !!track && judgedTracksOf(track).some((t) => trackById(profile, t).requiresTxid);

/** One problem with the form: `field` is the DOM id the form marks red and scrolls to. */
export type FieldIssue = { field: string; message: string };
/** Red text for the label or legend of a field that needs fixing. */
export const invalidText = (bad: boolean) => (bad ? " text-destructive" : "");
/** Red border for an input that needs fixing. */
export const invalidBorder = (bad: boolean) => (bad ? " border-destructive" : "");

/** Every problem with the tracked fields, in form order (empty when valid). */
export function validateTrackedForm(profile: ProgramProfile, f: TrackedFormState): FieldIssue[] {
  const issues: FieldIssue[] = [];
  const add = (field: string, message: string) => issues.push({ field, message });
  if (!f.track) add("trk-track", "Choose a track.");
  if (judgesPrivacy(f.track) && f.themes.length === 0) add("trk-themes", "Pick at least one theme.");
  if (!f.pitch.trim()) add("trk-pitch", "A one-line pitch is required.");
  else if (f.pitch.trim().length > PITCH_MAX) add("trk-pitch", `The pitch must be ${PITCH_MAX} characters or fewer.`);
  f.team.forEach((m, i) => {
    if (!m.name.trim()) add(`trk-team-${i}-name`, "Each teammate needs a name (or remove the row).");
  });
  if (!f.appType) add("trk-apptype", "Say what kind of project it is.");
  if (isApp(f.appType) && !isHttpUrl(f.publicUrl)) add("trk-url", "Apps need a public URL (http/https).");
  else if (f.publicUrl.trim() && !isHttpUrl(f.publicUrl)) add("trk-url", "The public URL must start with http:// or https://");
  if (!f.technologies.trim()) add("trk-tech", "List the technologies you used.");
  if (needsTxid(profile, f.track)) {
    if (!f.testnetTxid.trim()) add("trk-txid", "Privacy entries need one testnet transaction id.");
    // Same rule as the server (validateSubmissionDetails): a Zcash txid is 64 hex characters.
    else if (!/^[0-9a-f]{64}$/i.test(f.testnetTxid.trim())) {
      add("trk-txid", "A testnet transaction id is 64 hex characters (copy it from your wallet or the explorer).");
    }
  }
  if (judgesPrivacy(f.track) && !f.privacyNote.trim()) add("trk-privacy-note", "Write your privacy and trust note (judges score Private from it).");
  else if (f.privacyNote.trim().length > PRIVACY_NOTE_MAX) add("trk-privacy-note", `The privacy and trust note is max ${PRIVACY_NOTE_MAX} characters.`);
  if (!f.nextStep.trim()) add("trk-next", "Your next 30-day milestone is required.");
  if (splitLinks(f.nextStepLinks).some((l) => !isHttpUrl(l))) add("trk-next-links", "Each link must start with http:// or https://");
  if (judgesAgentic(f.track)) {
    if (!f.bitrefillWorked.trim()) add("trk-bf-worked", "Agentic Commerce entries need the Bitrefill feedback: what worked.");
    if (!f.bitrefillDidnt.trim()) add("trk-bf-didnt", "Agentic Commerce entries need the Bitrefill feedback: what didn't.");
  }
  return issues;
}

export function trackedFormToDetails(
  f: TrackedFormState,
): Omit<ApiSubmissionDetails, "txCheck" | "milestone"> {
  const track = f.track as SubmissionTrack;
  const privacy = track !== "agentic";
  return {
    track,
    themes: privacy ? f.themes : [],
    pitch: f.pitch.trim(),
    team: f.team
      .filter((m) => m.name.trim())
      .map((m) => ({ name: m.name.trim(), email: m.email.trim() || null, role: m.role.trim() || null })),
    appType: f.appType,
    publicUrl: f.publicUrl.trim() || null,
    demoVideoLength: f.demoVideoLength.trim() || null,
    technologies: f.technologies.split(",").map((t) => t.trim()).filter(Boolean),
    network: privacy ? "testnet (NU7)" : null,
    pool: privacy ? "shielded (Ironwood), unified addresses" : null,
    testnetTxid: privacy ? f.testnetTxid.trim() || null : null,
    nextStep: f.nextStep.trim(),
    nextStepLinks: splitLinks(f.nextStepLinks),
    frictionNotes: f.frictionNotes.trim() || null,
    privacyNote: privacy ? f.privacyNote.trim() || null : null,
    bitrefillFeedback: judgesAgentic(track) ? { worked: f.bitrefillWorked.trim(), didnt: f.bitrefillDidnt.trim() } : null,
    anonymous: f.anonymous,
  };
}

/** The reverse of trackedFormToDetails: load a saved submission back into the form (to update it). */
export function detailsToTrackedForm(d: Partial<ApiSubmissionDetails> | null | undefined): TrackedFormState {
  if (!d) return emptyTrackedForm();
  return {
    track: d.track ?? "",
    themes: d.themes ?? [],
    pitch: d.pitch ?? "",
    team: (d.team ?? []).map((m) => ({ name: m.name ?? "", email: m.email ?? "", role: m.role ?? "" })),
    appType: d.appType ?? "",
    publicUrl: d.publicUrl ?? "",
    demoVideoLength: d.demoVideoLength ?? "",
    technologies: (d.technologies ?? []).join(", "),
    testnetTxid: d.testnetTxid ?? "",
    nextStep: d.nextStep ?? "",
    nextStepLinks: (d.nextStepLinks ?? []).join("\n"),
    frictionNotes: d.frictionNotes ?? "",
    privacyNote: d.privacyNote ?? "",
    bitrefillWorked: d.bitrefillFeedback?.worked ?? "",
    bitrefillDidnt: d.bitrefillFeedback?.didnt ?? "",
    anonymous: !!d.anonymous,
  };
}
