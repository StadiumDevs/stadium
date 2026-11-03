import type { ApiSubmissionDetails, SubmissionTrack } from "@/lib/api";
import { judgedTracksOf, trackById, type ProgramProfile } from "@/lib/programProfiles";

// State, validation and payload mapping for TrackedSubmissionFields.

export type ContactApp = NonNullable<ApiSubmissionDetails["contact"]>["app"];

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
  /** Optional unified full viewing key (uviewtest…) of the wallet that received the payment. Judges only. */
  viewingKey: string;
  /** Optional wallet birth height (whole number). */
  birthHeight: string;
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
  /** Telegram or WhatsApp, to reach the top teams on demo day (required, admins only). */
  contactApp: ContactApp | "";
  contactHandle: string;
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
  viewingKey: "",
  birthHeight: "",
  nextStep: "",
  nextStepLinks: "",
  frictionNotes: "",
  privacyNote: "",
  bitrefillWorked: "",
  bitrefillDidnt: "",
  contactApp: "",
  contactHandle: "",
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
/**
 * A link typed without a scheme ("github.com/x", common on phones) gets
 * https:// in front; one with a scheme is left as is. Same rule as the server
 * (withScheme in submission.validator.js).
 */
export const withScheme = (v: string) => {
  const s = v.trim();
  if (!s || /^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  // Only something that looks like a domain ("github.com/…"); "not-a-url" stays invalid.
  const bare = s.replace(/^\/+/, "");
  return /^[^\s/.]+(\.[^\s/.]+)+(\/|$)/.test(bare) ? `https://${bare}` : s;
};
export const isHttpUrl = (v: string) => /^https?:\/\/\S+$/i.test(withScheme(v));
const splitLinks = (v: string) => v.split(/[\s,]+/).map((l) => withScheme(l)).filter(Boolean);
export const VIEWING_KEY_MAX = 1000;
const VIEWING_KEY_RE = /^uviewtest[0-9a-z]+$/i;
// Same rules as the server (validateSubmissionDetails).
const TELEGRAM_RE = /^@?[A-Za-z0-9_]{5,32}$/;
const WHATSAPP_RE = /^\+?\d[\d\s().-]{6,19}$/;
/** The problem with the demo-day contact, or null when it's fine. */
export const contactIssue = (app: TrackedFormState["contactApp"], handle: string): string | null => {
  const h = handle.trim();
  if (!app && !h) return "Add a Telegram or WhatsApp contact for demo day.";
  if (!app) return "Choose Telegram or WhatsApp.";
  if (!h) return app === "telegram" ? "Add your Telegram username." : "Add your WhatsApp number.";
  if (app === "telegram" && !TELEGRAM_RE.test(h)) return "A Telegram username is 5–32 letters, digits or _ (e.g. @username).";
  if (app === "whatsapp" && !WHATSAPP_RE.test(h)) return "A WhatsApp number needs the country code (e.g. +41 79 123 45 67).";
  return null;
};
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
  const maxTeammates = profile.maxTeammates;
  if (maxTeammates !== undefined && f.team.length > maxTeammates) {
    add(`trk-team-${maxTeammates}-name`, `Solo or a team of up to ${maxTeammates + 1}: remove a teammate.`);
  }
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
  if (judgesPrivacy(f.track)) {
    const vk = f.viewingKey.trim();
    if (vk && (vk.length > VIEWING_KEY_MAX || !VIEWING_KEY_RE.test(vk))) {
      add("trk-vk", "The viewing key must start with uviewtest (a testnet unified full viewing key).");
    }
    if (f.birthHeight.trim() && !/^\d{1,10}$/.test(f.birthHeight.trim())) add("trk-birth", "The wallet birth height must be a whole number.");
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
    publicUrl: withScheme(f.publicUrl) || null,
    demoVideoLength: f.demoVideoLength.trim() || null,
    technologies: f.technologies.split(",").map((t) => t.trim()).filter(Boolean),
    network: privacy ? "testnet (NU7)" : null,
    pool: privacy ? "shielded (Ironwood), unified addresses" : null,
    testnetTxid: privacy ? f.testnetTxid.trim() || null : null,
    viewingKey: privacy ? f.viewingKey.trim() || null : null,
    birthHeight: privacy && f.birthHeight.trim() ? Number(f.birthHeight.trim()) : null,
    nextStep: f.nextStep.trim(),
    nextStepLinks: splitLinks(f.nextStepLinks),
    frictionNotes: f.frictionNotes.trim() || null,
    privacyNote: privacy ? f.privacyNote.trim() || null : null,
    bitrefillFeedback: judgesAgentic(track) ? { worked: f.bitrefillWorked.trim(), didnt: f.bitrefillDidnt.trim() } : null,
    contact: f.contactApp && f.contactHandle.trim()
      ? { app: f.contactApp, handle: f.contactApp === "telegram" ? f.contactHandle.trim().replace(/^@/, "") : f.contactHandle.trim() }
      : null,
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
    viewingKey: d.viewingKey ?? "",
    birthHeight: d.birthHeight === null || d.birthHeight === undefined ? "" : String(d.birthHeight),
    nextStep: d.nextStep ?? "",
    nextStepLinks: (d.nextStepLinks ?? []).join("\n"),
    frictionNotes: d.frictionNotes ?? "",
    privacyNote: d.privacyNote ?? "",
    bitrefillWorked: d.bitrefillFeedback?.worked ?? "",
    bitrefillDidnt: d.bitrefillFeedback?.didnt ?? "",
    contactApp: d.contact?.app ?? "",
    contactHandle: d.contact?.handle ? (d.contact.app === "telegram" ? `@${d.contact.handle}` : d.contact.handle) : "",
    anonymous: !!d.anonymous,
  };
}
