/**
 * Mock fixture for the `programs` table. Read in preview mode when
 * VITE_USE_MOCK_DATA=true. Real data comes from Supabase via /api/programs.
 *
 * Extended across the Phase 1 revamp:
 *   - Issue #36 — fixture introduced (empty).
 *   - Issue #37 — Dogfooding 2026 cohort added for public /programs surface.
 *   - Issue #93 — historical hackathons + Bitrefill + singleton tracks added
 *     so previews mirror the canonical-events backfill migration.
 */

import type { ApiProgram, ApiProgramAdminEmail, ApiProgramSignup, ApiProgramSponsor } from "./api";

export const mockPrograms: ApiProgram[] = [
  {
    id: "symbiosis-2025",
    name: "Symbiosis 2025",
    slug: "symbiosis-2025",
    programType: "hackathon",
    description: "WebZero Symbiosis 2025 hackathon.",
    status: "completed",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: "2025-11-19T23:00:00Z",
    location: null,
    maxApplicants: null,
    createdAt: "2025-09-01T00:00:00Z",
    updatedAt: "2025-11-20T00:00:00Z",
  },
  {
    id: "symmetry-2024",
    name: "Symmetry 2024",
    slug: "symmetry-2024",
    programType: "hackathon",
    description: "WebZero Symmetry 2024 hackathon.",
    status: "completed",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: "2024-08-22T04:55:00Z",
    location: null,
    maxApplicants: null,
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2024-08-23T00:00:00Z",
  },
  {
    id: "synergy-2025",
    name: "Synergy 2025",
    slug: "synergy-2025",
    programType: "hackathon",
    description: "WebZero Synergy 2025 hackathon.",
    status: "completed",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: "2025-07-18T23:00:00Z",
    location: null,
    maxApplicants: null,
    createdAt: "2025-05-01T00:00:00Z",
    updatedAt: "2025-07-19T00:00:00Z",
  },
  {
    id: "bitrefill-2026",
    name: "Bitrefill 2026",
    slug: "bitrefill-2026",
    programType: "hackathon",
    description: "WebZero hackathon hosted with Bitrefill in Berlin.",
    status: "open",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: "2026-06-17T09:00:00Z",
    eventEndsAt: "2026-06-17T20:00:00Z",
    location: "Berlin",
    maxApplicants: null,
    eventUrl: "https://luma.com/internetmoneyhack",
    coverImageUrl:
      "https://placehold.co/1200x480/0a0a0a/e0e0e0/png?text=PROMPT+x+PURCHASE%0A-+A+Bitrefill+Hackathon",
    content: [
      {
        type: "schedule",
        title: "Schedule",
        rows: [
          { time: "11:30", label: "Brunch & kick-off" },
          { time: "18:00", label: "Submission deadline" },
        ],
      },
    ],
    prizeTiers: [
      { amount: 500, currency: "EUR", label: "Bitrefill giftcard" },
      { amount: 200, currency: "EUR", label: "Bitrefill giftcard" },
      { amount: 100, currency: "EUR", label: "Bitrefill giftcard" },
    ],
    resultsPublishedAt: null,
    createdAt: "2026-05-20T00:00:00Z",
    updatedAt: "2026-05-20T00:00:00Z",
  },
  {
    id: "m2-incubator",
    name: "M2 Incubator",
    slug: "m2-incubator",
    programType: "m2_incubator",
    description:
      "Projects who've continued hacking in our mentorship and milestone-focused incubation programs.",
    status: "open",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: null,
    location: null,
    maxApplicants: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "dogfooding",
    name: "Dogfooding",
    slug: "dogfooding",
    programType: "dogfooding",
    description:
      "Continuation track where past winners trade structured feedback by using each other's products. Apply on an ongoing basis to get what you're building featured at our upcoming events.",
    status: "open",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: null,
    location: null,
    maxApplicants: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "dogfooding-2026-denver",
    name: "Dogfooding 2026 Denver",
    slug: "dogfooding-2026-denver",
    programType: "dogfooding",
    description:
      "Whether you're new to web3 or deep in it: when's the last time you actually used a new product, not just heard about one? Dogfooding Denver showcased 3–4 products built by WebZero hackathon teams. No jargon-filled panels, no slideshows, just hands-on time with real apps. Attendees picked a product, spent 30 minutes on guided tasks, and submitted feedback that went directly to the builders. No technical background or wallet required, just curiosity. The feedback shapes what gets built next.",
    status: "completed",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: null,
    eventEndsAt: null,
    location: "Denver",
    maxApplicants: null,
    eventUrl: "https://luma.com/dogfooding",
    content: [
      {
        type: "text",
        title: "Why you're here",
        body:
          "The products you're about to try are early. Really early. They're being built right now by teams coming out of WebZero hackathons, and they need people like you to use them, break them, and tell them what's working, what's not, what you like and what could be improved.\n\nThis isn't a demo. You're not here to watch. You're here to get your hands on things before anyone else and have a real say in what gets built next.\n\nPlay a role in helping our builders validate what they're creating. Your feedback goes directly to them.",
      },
      {
        type: "text",
        title: "What makes this different",
        body:
          "Most web3 events are panels and pitches. You sit, you listen, you leave.\n\nToday you'll actually use products. You'll get stuck, figure things out, maybe get frustrated, hopefully get surprised. That's the point. Real usage, real feedback, real impact, and getting to be among the first to try cutting-edge web3 products.",
      },
      {
        type: "steps",
        title: "What you need to do",
        items: [
          "Pick a product",
          "Use it for ~30 minutes (follow the guided tasks)",
          "Fill out the feedback form for that product",
          "Repeat with another product if you want",
        ],
      },
      {
        type: "text",
        title: "The debrief",
        body:
          "At the end, we'll come together and share what stood out: what surprised you, what worked, what didn't. The builders aren't all here in person, but we're keeping track of your feedback and sending it straight to them. At the end we'll also draw the lucky raffle winner.",
      },
      {
        type: "cta",
        title: "Feedback form",
        label: "Open the feedback form",
        url: "https://vuqtecqlwni.typeform.com/to/SRtkKFuI",
      },
      {
        type: "schedule",
        title: "Schedule",
        rows: [
          { time: "1:00 PM", label: "Doors open" },
          { time: "1:15 PM", label: "Product previews" },
          { time: "1:25 PM", label: "Hands-on time" },
          { time: "3:15 PM", label: "Group debrief" },
          { time: "3:40 PM", label: "Raffle & wrap-up" },
        ],
      },
      {
        type: "lineup",
        title: "The products",
        items: [
          {
            name: "Open Arkiv",
            blurb:
              "A censorship-resistant, offline-first data submission protocol for journalists, whistleblowers, and citizens in high-risk environments.",
            tryItems: ["Download the TestFlight app", "Start sending messages"],
            links: [
              { label: "Website", url: "https://openarkiv.vercel.app/" },
              {
                label: "More info",
                url: "https://stadium.joinwebzero.com/m2-program/openarkiv-8bc72d",
              },
            ],
          },
          {
            name: "Khoj",
            blurb: "A treasure hunt app that turns Web3 onboarding into an adventure.",
            tryItems: [
              "Create or join a team to start the treasure hunt",
              "Complete the treasure hunt",
            ],
            links: [
              { label: "Play", url: "https://playkhoj.com/" },
              { label: "Docs", url: "https://docs.playkhoj.com/" },
            ],
          },
          {
            name: "Kinectica",
            blurb: "Access to eSIM data plans using any stablecoin.",
            tryItems: [
              "Go to the dashboard and connect your wallet",
              "Mint an account",
              "Mint an NFT",
              "Load the account into the NFT",
              "Load the QR code into your phone as an eSIM",
            ],
            links: [{ label: "Dashboard", url: "https://dash.kinecta.app/" }],
          },
          {
            name: "Station",
            blurb: "Music streaming for the decentralized curious.",
            tryItems: [
              "Set up your own cloud server (Hetzner credits provided, no out-of-pocket cost)",
              "Host your own music",
              "Play it back via the web app",
            ],
            links: [
              { label: "Docs", url: "https://docs.qnch.network/getting-started/quick-start" },
              { label: "Listener app", url: "https://beta.qnch.network" },
            ],
          },
        ],
      },
      {
        type: "text",
        title: "Giving good feedback",
        body:
          "Be honest. \"This confused me\" is more useful than \"it was fine.\" The builders want to know: What was confusing? Where did you get stuck? What worked well? Would you use this again?",
      },
      {
        type: "stats",
        title: "Feedback snapshot",
        items: [
          { label: "Products tested", value: "4" },
          { label: "Khoj ease (avg)", value: "5/7" },
          { label: "Would recommend", value: "All yes" },
        ],
      },
      {
        type: "feedback",
        title: "What attendees said",
        items: [
          {
            product: "Station / Kinectica",
            quote:
              "It worked. Currently there are a lot of steps and it does require a wallet, which is fine, but will be a barrier for non-web3 users.",
            recommend: true,
          },
          {
            product: "Station / Kinectica",
            quote:
              "Pretty easy! But knowing you need to connect via the in-wallet browser would be a good tip in the documentation.",
            recommend: true,
          },
          {
            product: "Station / Kinectica",
            quote:
              "It was complicated and a teammate had to help me. Confusing at first having to be in MetaMask and explore for Kinectica.",
            recommend: true,
          },
          {
            product: "Khoj",
            quote:
              "If I wasn't already familiar with web3 wallets, getting testnet funds would have been challenging. Make it clearer that a team shares the same set of picture clues. We thought there were 6 per user. And there's no way to skip a clue if you're playing in a bigger space.",
            rating: "5/7",
            recommend: true,
          },
          {
            product: "Khoj",
            quote:
              "I'd like to see in-app instructions: more one step at a time. It's hard to bounce back and forth to an instructions list. The steps themselves were easy.",
            rating: "5/7",
            recommend: true,
          },
          {
            product: "Khoj",
            quote:
              "Confusing because you needed to refer to the docs. The in-game screens didn't have the necessary detail. Thankfully an organiser helped us.",
            rating: "6/7",
            recommend: true,
          },
        ],
      },
      {
        type: "text",
        title: "Raffle",
        body:
          "Every feedback survey you submit = one raffle entry. More surveys, more chances to win exclusive WebZero merch.",
      },
    ],
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-21T00:00:00Z",
  },
  {
    id: "pitchoff-2026-denver",
    name: "PitchOff! Denver 2026",
    slug: "pitchoff-2026-denver",
    programType: "pitch_off",
    description:
      "A live pitch event in Denver where WebZero builders presented their projects to the room. Attendees signed up, chose the projects they were most excited about, and could opt into the bounty round.",
    status: "completed",
    owner: "webzero",
    applicationsOpenAt: null,
    applicationsCloseAt: null,
    eventStartsAt: "2026-02-21T00:00:00Z",
    eventEndsAt: "2026-02-21T23:59:59Z",
    location: "Denver",
    maxApplicants: null,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-21T00:00:00Z",
  },
];

/**
 * Per-program sponsor fixtures, keyed by program slug. Mock writes mutate
 * this in place so the preview mirrors the real /api/programs/:slug/sponsors
 * shape closely enough for UI work.
 */
export const mockProgramSponsors: Record<string, ApiProgramSponsor[]> = {
  "bitrefill-2026": [
    {
      id: "sponsor-bitrefill-2026-bitrefill",
      programId: "bitrefill-2026",
      name: "Bitrefill",
      submissionTarget: 10,
      targetProfiles: ["developer", "designer"],
      applicationInstructions:
        "Send a 1-paragraph pitch to apply@bitrefill.com with your wallet address and a link to your repo.",
      followUpNotes: "Send 1-week recap email; confirm winning team has KYC docs ready.",
      applyUrl: "https://bitrefill.com/apply",
      createdAt: "2026-05-20T00:00:00Z",
      updatedAt: "2026-05-20T00:00:00Z",
    },
  ],
};

// PitchOff! Denver builder submissions (preview/mock only — prod reads
// Supabase). Real data from the event's responses CSV, projected to the
// public-safe fields only. Telegram/contact + dates are intentionally omitted.
const BUILD_COL = "What did you build?";
const REPO_COL = "Github link or demo URL";
const DOCS_COL = "README or project doc link";
const TOOLS_COL = "What tools did you use?";

const builderSignup = (
  n: number,
  name: string,
  fields: { build?: string; repo?: string; docs?: string; tools?: string },
): ApiProgramSignup => ({
  id: `pitchoff-signup-${n}`,
  programId: "pitchoff-2026-denver",
  email: `pitchoff-${n}@telegram.imported`,
  name,
  wallet: null,
  registeredAt: "2026-02-20T21:00:00Z",
  source: "luma",
  rawRow: {
    [BUILD_COL]: fields.build ?? "",
    [REPO_COL]: fields.repo ?? "",
    [DOCS_COL]: fields.docs ?? "",
    [TOOLS_COL]: fields.tools ?? "",
  },
  importedInBatchAt: "2026-02-22T00:00:00Z",
  createdAt: "2026-02-22T00:00:00Z",
});

/** Per-program signup fixtures (mock mode). */
// Bitrefill checked-in guests (the "approved guests" list). Only these emails
// may submit a project. Includes the seed submitter emails so the judging mock
// stays consistent, plus the demo emails used elsewhere.
const bitrefillGuest = (
  id: number,
  name: string,
  email: string,
): ApiProgramSignup => ({
  id: `bitrefill-guest-${id}`,
  programId: "bitrefill-2026",
  email,
  name,
  source: "luma",
  registeredAt: "2026-06-16T18:00:00Z",
  importedInBatchAt: "2026-06-17T11:25:00Z",
});

// Email-keyed program admins + judges (mutable in the harness so invite/remove
// in the EDIT modal persists). Seeded so the read-only list isn't empty.
export const mockProgramAdminEmails: Record<string, ApiProgramAdminEmail[]> = {
  "bitrefill-2026": [
    { programId: "bitrefill-2026", email: "judge@bitrefill.com", role: "judge", invitedBy: null, createdAt: "2026-06-16T12:00:00Z" },
    { programId: "bitrefill-2026", email: "ops@bitrefill.com", role: "admin", invitedBy: null, createdAt: "2026-06-16T12:00:00Z" },
  ],
};

export const mockProgramSignups: Record<string, ApiProgramSignup[]> = {
  "bitrefill-2026": [
    bitrefillGuest(1, "Aurora Builders", "aurora@example.com"),
    bitrefillGuest(2, "Nimbus Labs", "nimbus@example.com"),
    bitrefillGuest(3, "Comet Crew", "comet@example.com"),
    bitrefillGuest(4, "Dana Builder", "dana@builder.test"),
    bitrefillGuest(5, "Mara Chen", "mara@chen.test"),
    bitrefillGuest(6, "Theo Vance", "theo@vance.test"),
    bitrefillGuest(7, "Lena Ortiz", "lena@ortiz.test"),
    bitrefillGuest(8, "Ravi Anand", "ravi@anand.test"),
    bitrefillGuest(9, "Sora Kim", "sora@kim.test"),
    bitrefillGuest(10, "Bea Fischer", "bea@fischer.test"),
  ],
  "pitchoff-2026-denver": [
    builderSignup(1, "Niha Parkash, Pratyush Sawant", {
      build:
        "ThoughtLock — a local-first idea vault. Write an idea and lock it; the app hashes your content locally (SHA-256, plaintext never leaves your machine) and submits the hash to a smart contract on Polkadot Hub, giving a tamper-proof, timestamped proof of existence you can verify later.",
      docs: "https://docs.google.com/document/d/1kgp5yzakouJDrXYb0MqGfFpIp7KTyboHuQQKgOM2hP8/edit?usp=sharing",
      tools: "Claude",
    }),
    builderSignup(2, "Aditya Parmar", {
      build:
        "Onchain verifiable AI provenance — prove what a public figure actually said versus a deepfake, by anchoring authenticity on-chain.",
      repo: "https://github.com/avp1598/polkadot_hack",
      docs: "https://github.com/avp1598/polkadot_hack/blob/main/README.md",
      tools: "Claude, Cursor and Codex",
    }),
    builderSignup(3, "Stephen Phillips", {
      build:
        "Steal My Idea — prove you published an idea first by hashing your text locally and anchoring only the keccak256 hash on-chain, with author/timestamp/title and an optional bounty escrow released to a builder who ships it.",
      repo: "https://github.com/TheHomelessCoder/hackathon",
      docs: "https://github.com/TheHomelessCoder/hackathon/blob/main/README.md",
      tools: "Next.js (App Router), Scaffold-DOT, Hardhat (PolkaVM), viem/wagmi, Reown AppKit",
    }),
    builderSignup(4, "Sergey, Kyrylo", {
      build: "The tool to track things you learn.",
      repo: "https://github.com/Norman882/PromptOff",
      docs: "https://github.com/Norman882/PromptOff/blob/main/README.md",
      tools: "Cursor, PAPI, React",
    }),
    builderSignup(5, "Rémi Destigny", {
      build:
        "Drop — a privacy-first contact exchange for conferences. Show a QR tied to your Polkadot address; the other person scans it, your on-chain identity resolves via the Polkadot People chain, and you both save each other locally. No server, no account, no data harvested.",
      repo: "https://github.com/Furzel/drop",
      docs: "https://github.com/Furzel/drop/blob/main/README.md",
      tools: "Claude",
    }),
    builderSignup(6, "Shadman Samir, Jagrati Kumari", {
      build:
        "Proof of Thought — a private writing app. Everything you write stays on your device while the app creates a verifiable proof on Polkadot that the work is yours, without ever sharing the content.",
      repo: "https://github.com/jkumari08/proof_of_thought",
      docs: "https://github.com/jkumari08/proof_of_thought/blob/main/README.md",
      tools: "Cursor, Claude Opus 4.6, Gemini 3.0 pro",
    }),
    builderSignup(7, "Michael Fitzpatrick", {
      build:
        "Chain of Thought — decentralized knowledge authorship. Publish ideas, cite each other's work, and fork existing ideas, all anchored on Polkadot (Westend Asset Hub) with content-hash provenance. Git for ideas, with blockchain-backed integrity.",
      repo: "https://chain-of-thought-three.vercel.app/",
      docs: "https://github.com/mfitz3/chain-of-thought/blob/main/README.md",
      tools: "Claude",
    }),
    builderSignup(8, "Laura Walker", {
      build:
        "Compare Contacts — a privacy-first phone app to find mutual connections. Reads contacts locally, creates encrypted fingerprints, exchanges them phone-to-phone, and computes the intersection locally — only mutual contacts are revealed, no raw contacts transmitted.",
      repo: "https://github.com/Laura314159/Compare-Contacts/",
      tools: "Replit, ChatGPT",
    }),
    builderSignup(9, "Amar Kushwaha", {
      build:
        "ZeroGate — a local-first content unlocker. Pay once, own forever, no account. Replaces the Web2 “create account / subscribe” wall with peer-to-peer payments verified on Polkadot.",
      repo: "https://github.com/kushwahaamar-dev/v0id",
      docs: "https://github.com/kushwahaamar-dev/v0id/blob/main/README.md",
      tools: "Antigravity, smoldot, papi, Next.js, Tailwind CSS",
    }),
    builderSignup(10, "Tomoko Kotaka", {
      build:
        "Proof Pad — write a note or idea, hit Stamp, and in seconds get a cryptographic certificate on Polkadot proving it was yours first. Nobody can claim it first — not Google, not anyone.",
      repo: "https://simple-study-translator-quantumalphahou.replit.app",
      docs: "https://github.com/QuantumAlphaCat/proof-pad/blob/main/README.md",
      tools: "Claude, Replit",
    }),
  ],
};

// Mirror of the server's project-card derivation (program-signup.service):
// one signup row = one public-safe project card; fields detected from raw_row
// by header keyword; PII columns ignored; empty cards dropped.
const MOCK_PII_RE = /email|telegram|phone|contact|discord|whatsapp|wallet|address/i;
const MOCK_TITLE_RE = /project\s*(name|title)|name of (the )?project/i;
const MOCK_BUILD_RE = /what did you build|describe|description|elevator|pitch/i;
const MOCK_REPO_RE = /github|gitlab|\brepo\b|demo/i;
const MOCK_DOCS_RE = /readme|\bdoc(s|ument)?\b|deck|slide|notion|figma|loom/i;
const MOCK_TAGS_RE = /tool|stack|built with|\btags?\b|tech/i;

function mockPick(raw: Record<string, unknown>, re: RegExp): string | null {
  for (const key of Object.keys(raw)) {
    if (re.test(key) && !MOCK_PII_RE.test(key)) {
      const v = raw[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return null;
}

const mockIsUrl = (s: string | null): s is string => !!s && /^https?:\/\/\S+/i.test(s.trim());

export function projectCardsFromMockSignups(slug: string): Array<{
  name: string;
  description?: string | null;
  repoUrl?: string | null;
  docsUrl?: string | null;
  tags: string[];
}> {
  const signups = mockProgramSignups[slug] || [];
  const cards = [];
  for (const s of signups) {
    const raw = (s.rawRow ?? {}) as Record<string, unknown>;
    const repoRaw = mockPick(raw, MOCK_REPO_RE);
    const docsRaw = mockPick(raw, MOCK_DOCS_RE);
    const tagsRaw = mockPick(raw, MOCK_TAGS_RE);
    const card = {
      name: mockPick(raw, MOCK_TITLE_RE) || (s.name ? s.name.trim() : null) || "Untitled project",
      description: mockPick(raw, MOCK_BUILD_RE),
      repoUrl: mockIsUrl(repoRaw) ? repoRaw : null,
      docsUrl: mockIsUrl(docsRaw) ? docsRaw : null,
      tags: tagsRaw ? tagsRaw.split(/[,;|]+/).map((t) => t.trim()).filter(Boolean).slice(0, 8) : [],
    };
    if (!card.description && !card.repoUrl && !card.docsUrl && card.tags.length === 0) continue;
    cards.push(card);
  }
  return cards;
}

/**
 * Tiny CSV parser used only in mock mode so previews can demo the import
 * flow without a backend. Mirrors the canonical-field synonyms the server
 * parser supports.
 */
const HEADER_SYNONYMS = {
  email: ["email", "emailaddress", "mail"],
  name: ["name", "fullname", "attendeename", "pleaseenteryourname", "yourname"],
  wallet: ["wallet", "walletaddress", "address", "cryptowallet", "web3wallet"],
  telegram: [
    "telegram",
    "telegramhandle",
    "telegramusername",
    "telegramcontact",
    "pleaseprovideyourtelegramcontact",
  ],
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[\s_-]+/g, "");

// Mirror of the server parser's Telegram surrogate (luma-csv.parser.js) so the
// preview import behaves like the real one for email-less form exports.
const telegramSurrogateMock = (raw: string): string => {
  const handle = raw.trim().replace(/^@+/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  return handle ? `${handle}@telegram.imported` : "";
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function importMockSignups(
  slug: string,
  csv: string,
  dryRun: boolean,
): {
  totalParsed: number;
  skippedNoEmail: number;
  duplicates: number;
  newCount: number;
  newPreview: Array<{ email: string; name?: string | null; wallet?: string | null }>;
  duplicatePreview: Array<{ email: string; name?: string | null }>;
} {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return {
      totalParsed: 0, skippedNoEmail: 0, duplicates: 0, newCount: 0,
      newPreview: [], duplicatePreview: [],
    };
  }
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const idx = (synonyms: string[]) =>
    header.findIndex((h) => synonyms.includes(norm(h)));
  const emailIdx = idx(HEADER_SYNONYMS.email);
  const nameIdx = idx(HEADER_SYNONYMS.name);
  const walletIdx = idx(HEADER_SYNONYMS.wallet);
  const telegramIdx = idx(HEADER_SYNONYMS.telegram);

  const existing = mockProgramSignups[slug] || [];
  const existingEmails = new Set(existing.map((s) => s.email));

  let totalParsed = 0;
  let skipped = 0;
  type MockRow = {
    email: string;
    name?: string | null;
    wallet?: string | null;
    rawRow: Record<string, string>;
  };
  const newRows: MockRow[] = [];
  const duplicates: Array<{ email: string; name?: string | null }> = [];

  for (let i = 1; i < lines.length; i += 1) {
    totalParsed += 1;
    const cols = parseCsvLine(lines[i]);

    // Preserve every column so the public PROJECTS aggregate can read the
    // "which project" value out of rawRow, exactly like the server.
    const rawRow: Record<string, string> = {};
    header.forEach((h, c) => { rawRow[h] = (cols[c] ?? "").trim(); });

    // Identity: real email column wins; otherwise a Telegram surrogate.
    let email = "";
    if (emailIdx >= 0) {
      email = (cols[emailIdx] || "").trim().toLowerCase();
      if (!email || !email.includes("@")) { skipped += 1; continue; }
    } else if (telegramIdx >= 0) {
      email = telegramSurrogateMock(cols[telegramIdx] || "");
      if (!email) { skipped += 1; continue; }
    } else {
      skipped += 1;
      continue;
    }

    const name = nameIdx >= 0 ? (cols[nameIdx] || "").trim() || null : null;
    const wallet = walletIdx >= 0 ? (cols[walletIdx] || "").trim() || null : null;
    if (existingEmails.has(email)) {
      duplicates.push({ email, name });
    } else {
      newRows.push({ email, name, wallet, rawRow });
      existingEmails.add(email);
    }
  }

  if (!dryRun && newRows.length > 0) {
    const inserted: ApiProgramSignup[] = newRows.map((r, i) => ({
      id: `mock-signup-${Date.now()}-${i}`,
      programId: slug,
      email: r.email,
      name: r.name,
      wallet: r.wallet,
      registeredAt: new Date().toISOString(),
      source: "luma",
      rawRow: r.rawRow,
      createdAt: new Date().toISOString(),
    }));
    mockProgramSignups[slug] = [...existing, ...inserted];
  }

  return {
    totalParsed,
    skippedNoEmail: skipped,
    duplicates: duplicates.length,
    newCount: newRows.length,
    newPreview: newRows.slice(0, 5).map(({ email, name, wallet }) => ({ email, name, wallet })),
    duplicatePreview: duplicates.slice(0, 5),
  };
}
