// Per-program post-submission feedback questions, keyed by program slug. The
// submission form renders these when a config exists and stores the answers in
// the submission's `feedback` JSONB. No em-dashes in copy.

import type { SubmissionTrack } from "@/lib/api";

export type FeedbackQuestion =
  // Multi-select where the builder also stars the one surface they relied on most.
  | { id: "surfaces"; kind: "multi-primary"; label: string; hint?: string; options: string[] }
  // Single-select radio group.
  | { id: string; kind: "single"; label: string; hint?: string; options: string[] }
  // Free-text, one line. Optional unless marked required.
  | { id: string; kind: "text"; label: string; hint?: string; placeholder?: string; required?: boolean };

export type FeedbackConfig = {
  questions: FeedbackQuestion[];
  /** Tracked programs: only entries in these tracks are asked (and must answer). Absent = everyone. */
  tracks?: SubmissionTrack[];
  /** Section heading on the form (default "FEEDBACK"). */
  title?: string;
  /** One line under the heading. */
  note?: string;
};

// Shape persisted with the submission and sent to the API. Keys mirror the
// question ids above; `surfacesPrimary` is the starred Q1 option.
export type FeedbackAnswers = {
  surfaces: string[];
  surfacesPrimary: string | null;
  agentEnv: string;
  deadlineStatus: string;
  biggestBlocker: string;
  couldntHandle: string;
  wouldKeepBuilding: string;
};

// The Bitrefill survey (also asked of Free Society Hack Agentic Commerce entries).
// Server keys: validateFeedback / validateRequiredSurvey in submission.validator.js.
const BITREFILL_SURVEY: FeedbackQuestion[] = [
  {
    id: "surfaces",
    kind: "multi-primary",
    label: "Which Bitrefill surfaces did you build with?",
    hint: "Select all that apply, and star the one you relied on most.",
    options: [
      "Hosted MCP",
      "Self-hosted MCP",
      "CLI",
      "Agent Skills (bitrefill/agents)",
      "x402 payments",
      "REST API",
    ],
  },
  {
    id: "agentEnv",
    kind: "single",
    label: "Which agent environment did you use?",
    options: ["Claude Code", "Cursor", "Custom agent framework", "Other"],
  },
  {
    id: "deadlineStatus",
    kind: "single",
    label: "Where did you land by the deadline?",
    options: [
      "Agent bought and paid on its own, running in about an hour",
      "Agent bought and paid on its own, but it took most of the day",
      "A purchase worked, but I handled (or mocked) the payment",
      "Search/pricing worked, never completed a buy",
      "Couldn't get a core flow going",
    ],
  },
  {
    id: "biggestBlocker",
    kind: "single",
    label: "What was your single biggest blocker?",
    options: [
      "Access / keys / OAuth",
      "Couldn't figure it out from the docs",
      "Finding the right product in the catalog",
      "Creating or paying invoices",
      "The x402 flow",
      "Webhooks / order status",
      "It didn't work, or wasn't possible to do",
      "Nothing major, it was smooth",
    ],
  },
  {
    id: "couldntHandle",
    kind: "text",
    label: "What did you try to do that Bitrefill couldn't handle?",
    placeholder: "One line, optional",
    required: false,
  },
  {
    id: "wouldKeepBuilding",
    kind: "single",
    label: "After today, would you keep building on Bitrefill?",
    options: ["Yes, already planning to", "Maybe", "No"],
  },
];

const FEEDBACK_BY_SLUG: Record<string, FeedbackConfig> = {
  "bitrefill-2026": { questions: BITREFILL_SURVEY },
  // Required for Agentic and Both entries (server: bitrefillSurveyTracks).
  "free-society-hack-2026": {
    questions: BITREFILL_SURVEY,
    tracks: ["agentic", "both"],
    title: "BITREFILL SURVEY (REQUIRED FOR AGENTIC COMMERCE)",
    note: "Six quick questions for Bitrefill. Goes to Bitrefill, not the public page.",
  },
};

/** Feedback config for a program's submission form, or null when none exists. */
export function getSubmissionFeedback(slug: string): FeedbackConfig | null {
  return FEEDBACK_BY_SLUG[slug] ?? null;
}

/** Whether a tracked entry in `track` is asked the survey (untracked programs: always). */
export function feedbackAppliesTo(config: FeedbackConfig, track: SubmissionTrack | "" | null | undefined): boolean {
  if (!config.tracks) return true;
  return !!track && config.tracks.includes(track);
}

/** The survey answers as labelled lines for judge and admin views (empty when none). */
export function formatSurvey(feedback: Partial<FeedbackAnswers> | null | undefined): { label: string; value: string }[] {
  if (!feedback) return [];
  const surfaces = (feedback.surfaces ?? []).map((x) => (x === feedback.surfacesPrimary ? `${x} ★` : x)).join(", ");
  const rows = [
    { label: "Surfaces (★ relied on most)", value: surfaces },
    { label: "Agent environment", value: feedback.agentEnv ?? "" },
    { label: "Where they landed", value: feedback.deadlineStatus ?? "" },
    { label: "Biggest blocker", value: feedback.biggestBlocker ?? "" },
    { label: "Couldn't handle", value: feedback.couldntHandle ?? "" },
    { label: "Keep building", value: feedback.wouldKeepBuilding ?? "" },
  ];
  return rows.filter((r) => r.value.trim());
}
