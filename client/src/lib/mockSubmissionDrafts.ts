// Playground (mock mode) stand-in for the server's tracked-submission drafts,
// teammate editors, feedback step and last-edit stamp (submission.controller.js).
// Drafts live here until the team finalizes; finalizing hands the entry to
// mockTracked, so the judging mocks only ever see submitted entries, as on the
// server. localStorage-backed, with an in-memory fallback.
import type { ExperienceRatings } from "./experienceRatings";
import type { SubmissionPayload } from "./api";

export type MockEntryMeta = {
  ownerEmail: string;
  status: "draft" | "submitted";
  /** The saved form while it's a draft (submitted entries live in mockTracked). */
  draft: SubmissionPayload | null;
  createdAt: string;
  finalizedAt: string | null;
  feedbackSubmittedAt: string | null;
  ratings: ExperienceRatings | null;
  eventLiked: string | null;
  lastEditedAt: string;
  lastEditedByEmail: string;
  lastEditedByName: string;
  editors: string[];
};

type State = Record<string, MockEntryMeta>; // by owner email

const key = (slug: string) => `stadium_mock_submission_drafts_${slug}_v1`;
const memory: Record<string, State> = {};

const load = (slug: string): State => {
  try {
    const raw = localStorage.getItem(key(slug));
    if (raw) return JSON.parse(raw) as State;
  } catch {
    // fall through to memory
  }
  return memory[slug] ?? {};
};
const save = (slug: string, state: State) => {
  memory[slug] = state;
  try {
    localStorage.setItem(key(slug), JSON.stringify(state));
  } catch {
    // Storage unavailable: the session keeps working in memory.
  }
};

const norm = (e: string) => e.trim().toLowerCase();

export const mockSubmissionDrafts = {
  /** The entry this email may edit: as the point person, or as a teammate with access. */
  access(slug: string, email: string): { meta: MockEntryMeta; role: "owner" | "editor" } | null {
    const e = norm(email);
    const state = load(slug);
    if (state[e]) return { meta: state[e], role: "owner" };
    const owned = Object.values(state).find((m) => m.editors.includes(e));
    return owned ? { meta: owned, role: "editor" } : null;
  },

  get(slug: string, ownerEmail: string): MockEntryMeta | null {
    return load(slug)[norm(ownerEmail)] ?? null;
  },

  /** Every entry's stamp, for the judge view (by owner email). */
  all(slug: string): State {
    return load(slug);
  },

  put(slug: string, meta: MockEntryMeta) {
    const state = load(slug);
    state[norm(meta.ownerEmail)] = meta;
    save(slug, state);
  },
};
