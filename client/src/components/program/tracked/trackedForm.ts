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
  frictionNotes: string;
  frictionAreas: string[];
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
  frictionAreas: [],
  anonymous: false,
});

export const PITCH_MAX = 140;
const splitLinks = (v: string) => v.split(/[\s,]+/).map((l) => l.trim()).filter(Boolean);
const isHttpUrl = (v: string) => /^https?:\/\/.+/i.test(v.trim());
export const isApp = (appType: string) => /app/i.test(appType);
const needsTxid = (profile: ProgramProfile, track: TrackedFormState["track"]) =>
  !!track && judgedTracksOf(track).some((t) => trackById(profile, t).requiresTxid);

export function validateTrackedForm(profile: ProgramProfile, f: TrackedFormState): string | null {
  if (!f.track) return "Choose a track.";
  if (f.track !== "agentic" && f.themes.length === 0) return "Pick at least one theme.";
  if (!f.pitch.trim()) return "A one-line pitch is required.";
  if (f.pitch.trim().length > PITCH_MAX) return `The pitch must be ${PITCH_MAX} characters or fewer.`;
  if (!f.appType) return "Say what kind of project it is.";
  if (isApp(f.appType) && !isHttpUrl(f.publicUrl)) return "Apps need a public URL (http/https).";
  if (f.publicUrl.trim() && !isHttpUrl(f.publicUrl)) return "The public URL must start with http:// or https://";
  if (!f.technologies.trim()) return "List every technology you used.";
  if (needsTxid(profile, f.track) && !f.testnetTxid.trim()) return "Privacy entries need one testnet transaction id.";
  // Same rule as the server (validateSubmissionDetails): a Zcash txid is 64 hex characters.
  if (needsTxid(profile, f.track) && !/^[0-9a-f]{64}$/i.test(f.testnetTxid.trim())) {
    return "A testnet transaction id is 64 hex characters (copy it from your wallet or the explorer).";
  }
  if (!f.nextStep.trim()) return "A next milestone for the 30 days is required.";
  if (splitLinks(f.nextStepLinks).some((l) => !isHttpUrl(l))) return "Each next-milestone link must start with http:// or https://";
  for (const m of f.team) {
    if (!m.name.trim()) return "Each teammate needs a name (or remove the row).";
  }
  return null;
}

export function trackedFormToDetails(
  f: TrackedFormState,
): Omit<ApiSubmissionDetails, "txCheck" | "milestone" | "checkIns"> {
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
    pool: privacy ? "Orchard, unified addresses" : null,
    testnetTxid: privacy ? f.testnetTxid.trim() || null : null,
    nextStep: f.nextStep.trim(),
    nextStepLinks: splitLinks(f.nextStepLinks),
    frictionNotes: f.frictionNotes.trim() || null,
    frictionAreas: f.frictionAreas,
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
    frictionAreas: d.frictionAreas ?? [],
    anonymous: !!d.anonymous,
  };
}
