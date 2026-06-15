// Per-program post-submission feedback questions, keyed by program slug. The
// submission form renders these when a config exists and stores the answers in
// the submission's `feedback` JSONB. No em-dashes in copy.

export type FeedbackQuestion =
  // Multi-select where the builder also stars the one surface they relied on most.
  | { id: "surfaces"; kind: "multi-primary"; label: string; hint?: string; options: string[] }
  // Single-select radio group.
  | { id: string; kind: "single"; label: string; hint?: string; options: string[] }
  // Free-text, one line. Optional unless marked required.
  | { id: string; kind: "text"; label: string; hint?: string; placeholder?: string; required?: boolean };

export type FeedbackConfig = { questions: FeedbackQuestion[] };

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

const FEEDBACK_BY_SLUG: Record<string, FeedbackConfig> = {
  "bitrefill-2026": {
    questions: [
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
    ],
  },
};

/** Feedback config for a program's submission form, or null when none exists. */
export function getSubmissionFeedback(slug: string): FeedbackConfig | null {
  return FEEDBACK_BY_SLUG[slug] ?? null;
}
