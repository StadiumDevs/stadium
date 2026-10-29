// localStorage-backed mock of refused submissions (submission_refusals), used
// when VITE_USE_MOCK_DATA=true. Mirrors the server: every refused submit is kept
// with the reason shown; a master admin can accept (creating the entry with the
// attempt's original time) or dismiss. Keyed by program slug.
import type { ApiSubmissionRefusal, SubmissionPayload } from "./api";

const key = (slug: string) => `stadium_mock_refusals_${slug}_v1`;
const memory: Record<string, ApiSubmissionRefusal[]> = {};

const NOT_CHECKED_IN = "Only checked-in attendees can submit. Use the email you checked in with on Luma.";

// A couple of refusals so the admin section isn't empty in the playground.
const seed = (slug: string): ApiSubmissionRefusal[] => {
  if (slug !== "free-society-hack-2026") return [];
  const details = {
    track: "privacy" as const,
    themes: ["2. The first five minutes"],
    pitch: "A one-tap shielded wallet for first-time users.",
    team: [],
    appType: "web app",
    publicUrl: "https://first-five.example.com",
    demoVideoLength: "1:40",
    technologies: ["WebZjs", "Next.js"],
    network: "testnet (NU7)",
    pool: "shielded (Ironwood), unified addresses",
    testnetTxid: "e".repeat(64),
    nextStep: "User tests with 10 first-time users by 4 Dec.",
    nextStepLinks: [],
    frictionNotes: null,
    privacyNote: "Amounts and memos are shielded. Our server sees the user's email at sign-up; the light-wallet server sees their IP.",
    bitrefillFeedback: null,
    anonymous: false,
  };
  return [
    {
      id: "refusal-1",
      programId: slug,
      lumaEmail: "neha.personal@example.com",
      submitterName: "Neha Kulkarni (mock)",
      projectTitle: "First Five",
      payload: {
        submitterName: "Neha Kulkarni (mock)",
        lumaEmail: "neha.personal@example.com",
        projectTitle: "First Five",
        projectBrief: "Checked in with her work email; submitted with her personal one.",
        videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        githubUrl: "https://github.com/example/first-five",
        agreedToTerms: true,
        details,
      },
      reasonCode: "not_checked_in",
      reason: NOT_CHECKED_IN,
      status: "refused",
      reviewedBy: null,
      reviewedAt: null,
      acceptedSubmissionId: null,
      createdAt: "2026-11-04T19:52:00+05:30",
    },
    {
      id: "refusal-2",
      programId: slug,
      lumaEmail: "late.signup@example.com",
      submitterName: "Rohan Desai (mock)",
      projectTitle: "Shielded Splitwise",
      payload: {
        submitterName: "Rohan Desai (mock)",
        lumaEmail: "late.signup@example.com",
        projectTitle: "Shielded Splitwise",
        projectBrief: "Split bills with friends in shielded ZEC.",
        videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        githubUrl: "https://github.com/example/shielded-splitwise",
        agreedToTerms: true,
        details: { ...details, pitch: "Split bills with friends privately.", publicUrl: "https://split.example.com", testnetTxid: "f".repeat(64) },
      },
      reasonCode: "unverified",
      reason: "Couldn't verify your check-in right now. Please try again in a moment.",
      status: "refused",
      reviewedBy: null,
      reviewedAt: null,
      acceptedSubmissionId: null,
      createdAt: "2026-11-04T21:10:00+05:30",
    },
  ];
};

const load = (slug: string): ApiSubmissionRefusal[] => {
  try {
    const raw = localStorage.getItem(key(slug));
    if (raw) return JSON.parse(raw);
  } catch {
    // Fall back to memory.
  }
  if (!memory[slug]) memory[slug] = seed(slug);
  save(slug, memory[slug]);
  return memory[slug];
};
const save = (slug: string, list: ApiSubmissionRefusal[]) => {
  memory[slug] = list;
  try {
    localStorage.setItem(key(slug), JSON.stringify(list));
  } catch {
    // Storage unavailable: memory only.
  }
};

export const mockRefusals = {
  list(slug: string): ApiSubmissionRefusal[] {
    return [...load(slug)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  record(
    slug: string,
    payload: SubmissionPayload,
    reasonCode: ApiSubmissionRefusal["reasonCode"],
    reason: string,
    emailVerified = false,
  ) {
    const email = payload.lumaEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !payload.projectTitle.trim()) return;
    const { company: _honeypot, ...kept } = payload;
    const r: ApiSubmissionRefusal = {
      id: `refusal-${Date.now()}`,
      programId: slug,
      lumaEmail: email,
      submitterName: payload.submitterName.trim() || null,
      projectTitle: payload.projectTitle.trim(),
      payload: kept,
      reasonCode,
      reason,
      emailVerified,
      status: "refused",
      reviewedBy: null,
      reviewedAt: null,
      acceptedSubmissionId: null,
      createdAt: new Date().toISOString(),
    };
    save(slug, [...load(slug), r]);
  },

  async accept(slug: string, id: string, reviewedBy: string): Promise<ApiSubmissionRefusal> {
    const list = load(slug);
    const r = list.find((x) => x.id === id);
    if (!r) throw Object.assign(new Error("Refused submission not found"), { status: 404 });
    if (r.status === "accepted") throw Object.assign(new Error("Already accepted"), { status: 409 });
    const p = r.payload;
    let createdId: string;
    if (p.details) {
      const { mockTracked } = await import("./mockTrackedSubmissions");
      if (mockTracked.list(slug).some((s) => s.lumaEmail.trim().toLowerCase() === r.lumaEmail)) {
        throw Object.assign(new Error("That email already has a submission for this program"), { status: 409 });
      }
      const sub = mockTracked.add(slug, { ...p, details: p.details, createdAt: r.createdAt });
      void mockTracked.recheckTx(slug, sub.id);
      createdId = sub.id;
    } else {
      const { mockJudging } = await import("./mockJudging");
      createdId = mockJudging.addSubmission({ ...p, createdAt: r.createdAt }).id;
    }
    const updated: ApiSubmissionRefusal = { ...r, status: "accepted", reviewedBy, reviewedAt: new Date().toISOString(), acceptedSubmissionId: createdId };
    save(slug, list.map((x) => (x.id === id ? updated : x)));
    return updated;
  },

  dismiss(slug: string, id: string, reviewedBy: string): ApiSubmissionRefusal {
    const list = load(slug);
    const r = list.find((x) => x.id === id);
    if (!r) throw Object.assign(new Error("Refused submission not found"), { status: 404 });
    if (r.status === "accepted") throw Object.assign(new Error("Already accepted"), { status: 409 });
    const updated: ApiSubmissionRefusal = { ...r, status: "dismissed", reviewedBy, reviewedAt: new Date().toISOString() };
    save(slug, list.map((x) => (x.id === id ? updated : x)));
    return updated;
  },

  reset(slug: string) {
    try {
      localStorage.removeItem(key(slug));
    } catch {
      // ignore
    }
    delete memory[slug];
  },
};
