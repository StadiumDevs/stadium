/**
 * Playground seed for the Free Society Hack (Zcash) program — mock mode only.
 *
 * The source of truth for the testing playground: `buildFreeSocietyHackSeed()`
 * is pure, so the admin "RESET PLAYGROUND" button (mock mode) can re-seed the
 * local store at any time. Every person, email and link is mock: names carry
 * "(mock)" and every address uses example.com.
 *
 * What it exercises (brief §7):
 *   - 24 Privacy + 8 Agentic Commerce submissions; 2 of the Privacy entries are
 *     also entered in Agentic Commerce ("both").
 *   - Apps with a public URL and non-apps (SDK, CLI, agent) with video only;
 *     4 with no friction notes; 1 with a broken URL; themes spread across all
 *     three; 1 with Works 0 from every judge (blocked from winning).
 *   - 5 Privacy judges + 2 Bitrefill judges; every project fully scored, split
 *     across the evening and morning sessions; two engineered ties (one broken by
 *     Continuing, one by Needed).
 *   - Winners: Privacy top ×1, second ×2, third ×2, plus Bitrefill's four; one
 *     project wins in both tracks. Two podium projects (a second and a third
 *     prize) carry the Ecosystem Prize flag. Results published.
 *   - Ecosystem Prize milestones: one agreed and in progress, one delivered,
 *     partner-confirmed, shared, and paid out.
 *   - Testnet tx checks in all three badge states.
 *   - 14- and 30-day check-in answers.
 */
import type {
  ApiPrizeTier,
  ApiRubricScore,
  ApiTrackedSubmission,
  ApiTxCheck,
  JudgedTrack,
  SubmissionTrack,
  TxCheckStatus,
} from "../api";
import {
  FREE_SOCIETY_HACK_PRIZE_TIERS as TIERS,
  FREE_SOCIETY_HACK_SLUG,
  type ProgramJudge,
} from "../programProfiles";

const SAMPLE_DEMO_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export const FSH_JUDGES: ProgramJudge[] = [
  { email: "judge-a@example.com", name: "Judge A (mock)", tracks: ["privacy"] },
  { email: "judge-b@example.com", name: "Judge B (mock)", tracks: ["privacy"] },
  { email: "judge-c@example.com", name: "Judge C (mock)", tracks: ["privacy"] },
  { email: "judge-d@example.com", name: "Judge D (mock)", tracks: ["privacy"] },
  { email: "judge-e@example.com", name: "Judge E (mock)", tracks: ["privacy"] },
  { email: "bitrefill-judge-1@example.com", name: "Bitrefill Judge 1 (mock)", tracks: ["agentic"] },
  { email: "bitrefill-judge-2@example.com", name: "Bitrefill Judge 2 (mock)", tracks: ["agentic"] },
];
const PRIVACY_JUDGES = FSH_JUDGES.filter((j) => j.tracks.includes("privacy")).map((j) => j.email);
const AGENTIC_JUDGES = FSH_JUDGES.filter((j) => j.tracks.includes("agentic")).map((j) => j.email);

/** Point-person email anyone can use to try the submit form in the playground. */
export const FSH_DEMO_BUILDER_EMAIL = "builder@example.com";

// Deterministic, valid-looking 64-hex txid per index.
const hexTxid = (seed: number) => {
  let x = (seed * 2654435761) >>> 0;
  let out = "";
  while (out.length < 64) {
    x = (Math.imul(x ^ (x >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    out += x.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
};

// Txids with a non-verified result. Everything else checks out as verified.
export const TXID_NOT_FOUND = hexTxid(901);
export const TXID_NOT_SHIELDED = hexTxid(902);
export const TXID_TIMEOUT = hexTxid(903);
/** The mock lightwalletd: what a lookup of each seeded txid returns. */
export const MOCK_TX_RESULTS: Record<string, TxCheckStatus> = {
  [TXID_NOT_FOUND]: "not_found",
  [TXID_NOT_SHIELDED]: "not_shielded",
  [TXID_TIMEOUT]: "could_not_check",
};

const tier = (label: string): ApiPrizeTier => {
  const t = TIERS.find((x) => x.label === label);
  if (!t) throw new Error(`Unknown tier ${label}`);
  return t;
};

type P = {
  key: string;
  title: string;
  pitch: string;
  description: string;
  track: SubmissionTrack;
  themes: string[];
  appType: string;
  /** null = non-app (video only). */
  publicUrl: string | null;
  person: [string, string];
  team?: [string, string, string][];
  techs: string[];
  nextStep: string;
  /** Links to anything already started toward the next milestone. */
  links?: string[];
  /** Builder asked to hide their and their teammates' names publicly. */
  anonymous?: boolean;
  friction: string | null;
  frictionAreas: string[];
  /** IST clock time on Wed 4 Nov ("HH:MM"). */
  at: string;
  video?: string;
  txid?: string;
};

// The three Privacy themes. Old A–E fixture keys map onto them so the field
// stays spread across all three.
const RAILS = "1. Private payment rails";
const FIRST_FIVE = "2. The first five minutes";
const BEYOND = "3. Privacy beyond the transaction";
const THEME = { A: RAILS, B: FIRST_FIVE, C: FIRST_FIVE, D: BEYOND, E: FIRST_FIVE };

const PROJECTS: P[] = [
  // --- Privacy (Zcash) — the brief's pattern submission, verbatim ---
  {
    key: "chai-ledger",
    title: "Chai Ledger",
    pitch: "Shielded ZEC checkout for small cafés, with a receipt the accountant can check.",
    description:
      "A café owner creates an order, the customer scans a QR and pays shielded ZEC from any wallet. The order id travels in the memo, so the payment matches the order automatically, with no public trail. At month end the owner exports a viewing-key report the accountant can verify. Known gaps: no refunds yet, and only one shop per account.",
    track: "privacy",
    themes: [THEME.A, THEME.D],
    appType: "web app",
    publicUrl: "https://chai-ledger.example.com",
    person: ["Priya Nair (mock)", "priya.nair@example.com"],
    team: [["Arjun Mehta (mock)", "arjun.mehta@example.com", "frontend"]],
    techs: ["WebZjs (ChainSafe)", "testnet.zec.rocks lightwalletd", "Zingo! wallet (test payments)", "Next.js", "Vercel", "Supabase"],
    nextStep:
      "Pilot with two cafés in Bandra by 4 Dec and contribute the memo-matching helper to @zcash/sdk, so any merchant app can match payments to orders.",
    links: ["https://github.com/example/zcash-sdk/issues/1"],
    friction:
      "Testnet faucet was down for about three hours. We rewrote the same WebZjs wrapper other teams have written. Memo size limits for unified addresses were hard to find in the docs.",
    frictionAreas: ["Faucet", "WebZjs or SDK", "Docs"],
    at: "22:41",
    video: "1:54",
    txid: "MOCK-0000000000000000000000000000000000000000000000000000000000000001",
  },
  {
    key: "hushbox",
    title: "Hushbox",
    pitch: "Shielded group savings pots for neighbourhood chit funds.",
    description:
      "Members pay into a shared pot each month from their own wallets; the organiser sees contributions through a viewing key, but members never see each other's balances. Payouts rotate automatically by memo-tagged round.",
    track: "privacy",
    themes: [THEME.A],
    appType: "web app",
    publicUrl: "https://hushbox.example.com",
    person: ["Kavya Rao (mock)", "kavya.rao@example.com"],
    team: [
      ["Dev Malhotra (mock)", "dev.malhotra@example.com", "backend"],
      ["Isha Kapoor (mock)", "isha.kapoor@example.com", "design"],
    ],
    techs: ["WebZjs (ChainSafe)", "testnet.zec.rocks lightwalletd", "SvelteKit", "Fly.io"],
    nextStep: "Run one real chit-fund round with a Pune savings group by 4 Dec, with a ZecHub mentor reviewing the viewing-key flow.",
    links: ["https://hushbox.example.com/pilot-plan"],
    friction: "Unified address parsing differed between two libraries. Faucet rate limits slowed our test rounds.",
    frictionAreas: ["WebZjs or SDK", "Faucet"],
    at: "17:20",
    video: "1:48",
  },
  {
    key: "quiet-payroll",
    title: "Quiet Payroll",
    pitch: "Pay contractors in shielded ZEC, with a per-payee viewing key for their tax filing.",
    description:
      "An employer uploads a payroll CSV, Quiet Payroll batches shielded payments and issues each contractor a viewing key that shows only their own payments. Contractors export a statement for their accountant.",
    track: "privacy",
    themes: [THEME.A, THEME.D],
    appType: "web app",
    publicUrl: "https://quiet-payroll.example.com",
    person: ["Rohan Desai (mock)", "rohan.desai@example.com"],
    team: [["Neha Joshi (mock)", "neha.joshi@example.com", "smart accounts"]],
    techs: ["zcash_client_backend", "Rust", "Axum", "React", "testnet.zec.rocks lightwalletd"],
    nextStep: "Ship batch payouts for a named Mumbai design studio's 12 contractors by 4 Dec, with the studio as launch partner.",
    links: ["https://github.com/example/quiet-payroll/issues/7"],
    friction: "Sync from birthday height took 40 minutes on the indexer. Docs on per-account viewing keys were thin.",
    frictionAreas: ["Node or indexer", "Docs"],
    at: "16:05",
    video: "1:59",
  },
  {
    key: "ticket-veil",
    title: "Ticket Veil",
    pitch: "Event tickets bought with shielded ZEC; the door check proves purchase without revealing the buyer.",
    description:
      "Buyers pay shielded and receive a ticket proof tied to the payment memo. At the door, a scanner verifies the proof against the organiser's viewing key. The Agentic Commerce entry adds an agent that buys tickets and Bitrefill travel top-ups in one order.",
    track: "both",
    themes: [THEME.D, THEME.A],
    appType: "mobile app",
    publicUrl: "https://ticket-veil.example.com",
    person: ["Aditya Kulkarni (mock)", "aditya.kulkarni@example.com"],
    team: [
      ["Sneha Iyer (mock)", "sneha.iyer@example.com", "mobile"],
      ["Farhan Shaikh (mock)", "farhan.shaikh@example.com", "agent"],
    ],
    techs: ["Zashi SDK", "React Native", "Expo", "Bitrefill MCP", "Claude"],
    nextStep: "Sell tickets for one ZecHub meetup in December through Ticket Veil.",
    friction: "Expo builds broke on the Zcash native module. The Bitrefill test product was easy; the Zcash wallet SDK on mobile was not.",
    frictionAreas: ["WebZjs or SDK", "Wallet"],
    at: "19:10",
    video: "1:57",
  },
  {
    key: "tip-jar-sdk",
    title: "Tip Jar SDK",
    pitch: "A drop-in shielded tip button for creators' sites.",
    description:
      "One script tag adds a tip button that shows a unified address QR and confirms the tip arrived, without exposing the creator's balance. Ships with React and plain-JS bindings.",
    track: "privacy",
    themes: [THEME.A],
    appType: "SDK or library",
    publicUrl: null,
    person: ["Meera Menon (mock)", "meera.menon@example.com"],
    techs: ["WebZjs (ChainSafe)", "TypeScript", "Vite", "testnet.zec.rocks lightwalletd"],
    nextStep: "Publish v0.1 to npm and land it on two creator sites by 4 Dec.",
    links: ["https://github.com/example/tip-jar-sdk/pull/3", "https://creator-site.example.com/tip-jar-beta"],
    friction: "Bundling WebZjs WASM for a script-tag build took most of the afternoon.",
    frictionAreas: ["WebZjs or SDK"],
    at: "18:30",
    video: "1:41",
  },
  {
    key: "orchard-receipts",
    title: "Orchard Receipts",
    pitch: "A CLI that turns a shielded payment into a receipt anyone can verify with a viewing key.",
    description:
      "Run one command against a txid and a viewing key to produce a signed PDF receipt. Recipients verify it offline. Built for freelancers who invoice clients.",
    track: "privacy",
    themes: [THEME.D],
    appType: "CLI",
    publicUrl: null,
    person: ["Vikram Bose (mock)", "vikram.bose@example.com"],
    team: [["Ananya Ghosh (mock)", "ananya.ghosh@example.com", "docs"]],
    techs: ["zcash_client_backend", "Rust", "clap", "typst"],
    nextStep: "Integrate with one invoicing tool used by Bengaluru freelancers, with its maintainer as partner.",
    friction: "No clear guidance on which viewing key type to ask users for.",
    frictionAreas: ["Docs"],
    at: "21:15",
    video: "1:50",
  },
  // --- Privacy, the rest of the field ---
  {
    key: "memo-mailbox",
    title: "Memo Mailbox",
    pitch: "Encrypted notes between wallets, carried in shielded memos.",
    description: "A chat-style inbox where every message is a tiny shielded transaction with the note in the memo.",
    track: "privacy",
    themes: [THEME.C],
    appType: "web app",
    publicUrl: "https://memo-mailbox.example.com",
    person: ["Siddharth Rao (mock)", "siddharth.rao@example.com"],
    team: [["Kavya Iyer (mock)", "kavya.iyer@example.com", "design"]],
    anonymous: true,
    techs: ["WebZjs (ChainSafe)", "Next.js", "testnet.zec.rocks lightwalletd"],
    nextStep: "Add threads and ship to ten testers.",
    friction: "lightwalletd timed out repeatedly late in the evening.",
    frictionAreas: ["Node or indexer"],
    at: "23:30",
    video: "1:35",
    txid: TXID_TIMEOUT,
  },
  {
    key: "zecsplit",
    title: "ZecSplit",
    pitch: "Split a dinner bill between friends in shielded ZEC.",
    description: "Scan the bill, assign items, and everyone pays their share to the payer's unified address.",
    track: "privacy",
    themes: [THEME.A],
    appType: "mobile app",
    publicUrl: "https://zecsplit.example.com",
    person: ["Tanvi Shah (mock)", "tanvi.shah@example.com"],
    team: [["Kabir Sethi (mock)", "kabir.sethi@example.com", "mobile"]],
    techs: ["Zashi SDK", "Flutter"],
    nextStep: "Try it with our college friend group.",
    friction: "We sent from a transparent address by mistake and only noticed in the explorer.",
    frictionAreas: ["Wallet"],
    at: "15:40",
    video: "1:28",
    txid: TXID_NOT_SHIELDED,
  },
  {
    key: "faucet-bot",
    title: "Shielded Faucet Bot",
    pitch: "A Telegram bot that drips testnet ZEC to a unified address.",
    description: "Rate-limited per user, sends to Orchard receivers only, and reports its own balance.",
    track: "privacy",
    themes: [THEME.E],
    appType: "agent",
    publicUrl: null,
    person: ["Nikhil Verma (mock)", "nikhil.verma@example.com"],
    techs: ["zingolib", "Python", "python-telegram-bot"],
    nextStep: "Hand it to the ZecHub community to run during workshops.",
    friction: null,
    frictionAreas: [],
    at: "13:50",
    video: "1:12",
  },
  {
    key: "age-pass",
    title: "Proof of Age Pass",
    pitch: "Prove you're over 18 to a shop without showing your ID.",
    description: "A shielded credential the shop checks with a one-time proof; no birthdate is stored.",
    track: "privacy",
    themes: [THEME.D],
    appType: "web app",
    publicUrl: "https://age-pass.example.com",
    person: ["Riya Chatterjee (mock)", "riya.chatterjee@example.com"],
    techs: ["WebZjs (ChainSafe)", "Remix", "Cloudflare"],
    nextStep: "Show it to one liquor retailer in Mumbai.",
    friction: "Hard to tell which parts of the proof are on chain.",
    frictionAreas: ["Docs"],
    at: "20:40",
    video: "1:58",
  },
  {
    key: "ua-address-book",
    title: "Unified Address Book",
    pitch: "A typed address book library that validates and labels unified addresses.",
    description: "Parses UA receivers, warns on transparent-only addresses, and exports contacts.",
    track: "privacy",
    themes: [THEME.B],
    appType: "SDK or library",
    publicUrl: null,
    person: ["Harsh Agarwal (mock)", "harsh.agarwal@example.com"],
    techs: ["TypeScript", "zcash-address (WASM)"],
    nextStep: "Upstream the validator to a wallet project.",
    friction: "Address encoding docs are spread across three ZIPs.",
    frictionAreas: ["Docs", "WebZjs or SDK"],
    at: "16:55",
    video: "1:20",
  },
  {
    key: "lwd-monitor",
    title: "Lightwalletd Health Monitor",
    pitch: "A status page for public testnet lightwalletd servers.",
    description: "Pings servers every minute, records block lag and latency, and alerts on stalls.",
    track: "privacy",
    themes: [THEME.E],
    appType: "web app",
    publicUrl: "https://lwd-monitor.example.com",
    person: ["Pooja Reddy (mock)", "pooja.reddy@example.com"],
    techs: ["Go", "gRPC", "Grafana"],
    nextStep: "Keep it running through December and share uptime numbers.",
    friction: "Two of five public servers were unreachable most of the day.",
    frictionAreas: ["Node or indexer"],
    at: "14:35",
    video: "1:45",
  },
  {
    key: "donations-widget",
    title: "Private Donations Widget",
    pitch: "Let NGOs accept shielded donations with a public running total.",
    description: "Donors give privately; the NGO publishes a total backed by a viewing-key audit.",
    track: "privacy",
    themes: [THEME.A, THEME.D],
    appType: "SDK or library",
    publicUrl: null,
    person: ["Ankit Jain (mock)", "ankit.jain@example.com"],
    techs: ["WebZjs (ChainSafe)", "Web Components"],
    nextStep: "Pilot with one Mumbai NGO.",
    friction: "Faucet down during our only test window.",
    frictionAreas: ["Faucet"],
    at: "19:45",
    video: "1:39",
  },
  {
    key: "remittance-relay",
    title: "Remittance Relay",
    pitch: "Send ZEC home with the fee and arrival time shown up front.",
    description: "A simple send flow tuned for family remittances, with a shielded-by-default path.",
    track: "privacy",
    themes: [THEME.A],
    appType: "web app",
    // Deliberately broken URL (brief §7.2).
    publicUrl: "https://remittance-relay.example.invalid",
    person: ["Sana Qureshi (mock)", "sana.qureshi@example.com"],
    techs: ["WebZjs (ChainSafe)", "Vue"],
    nextStep: "Fix hosting and test with two families.",
    friction: "Our deploy failed at the last minute; the demo video shows the flow.",
    frictionAreas: ["Other"],
    at: "23:50",
    video: "1:31",
  },
  {
    key: "zk-payslip",
    title: "ZK Payslip",
    pitch: "Prove your salary is above a threshold to a landlord without showing the payslip.",
    description: "Reads shielded salary payments via a viewing key and outputs a threshold proof.",
    track: "privacy",
    themes: [THEME.D],
    appType: "CLI",
    publicUrl: null,
    person: ["Manish Pandey (mock)", "manish.pandey@example.com"],
    techs: ["Rust", "halo2"],
    nextStep: "Write up the design for a rental platform.",
    friction: null,
    frictionAreas: [],
    at: "22:05",
    video: "1:55",
  },
  {
    key: "explorer-lite",
    title: "Testnet Explorer Lite",
    pitch: "A fast testnet explorer that shows which pools a transaction touched.",
    description: "Shows Orchard and Sapling action counts per transaction, without amounts.",
    track: "privacy",
    themes: [THEME.E],
    appType: "web app",
    publicUrl: "https://explorer-lite.example.com",
    person: ["Gaurav Mishra (mock)", "gaurav.mishra@example.com"],
    techs: ["zebra", "Rust", "Svelte"],
    nextStep: "Add mainnet read-only mode.",
    friction: "Zebra RPC field names changed between versions.",
    frictionAreas: ["Node or indexer", "Docs"],
    at: "15:10",
    video: "1:44",
  },
  {
    key: "viewing-key-vault",
    title: "Viewing Key Vault",
    pitch: "Share a time-limited viewing key with an accountant, then revoke access.",
    description: "Wraps viewing keys in an expiring share link with an access log.",
    track: "privacy",
    themes: [THEME.B, THEME.D],
    appType: "web app",
    publicUrl: "https://vk-vault.example.com",
    person: ["Divya Nambiar (mock)", "divya.nambiar@example.com"],
    techs: ["WebZjs (ChainSafe)", "Next.js", "Supabase"],
    nextStep: "Talk to three accountants about the flow.",
    friction: "Unclear whether viewing keys can be scoped to a date range.",
    frictionAreas: ["Docs", "Wallet"],
    at: "18:05",
    video: "1:52",
  },
  {
    key: "shielded-escrow",
    title: "Shielded Escrow",
    pitch: "Two-party escrow for freelance gigs, settled in shielded ZEC.",
    description: "A mediator key releases funds when both parties confirm in the memo thread.",
    track: "privacy",
    themes: [THEME.C],
    appType: "web app",
    publicUrl: "https://shielded-escrow.example.com",
    person: ["Rahul Saxena (mock)", "rahul.saxena@example.com"],
    team: [["Ira Banerjee (mock)", "ira.banerjee@example.com", "frontend"]],
    techs: ["zcash_client_backend", "Rust", "Leptos"],
    nextStep: "Run five real gigs through it.",
    friction: "Multi-party flows have no examples in the docs.",
    frictionAreas: ["Docs"],
    at: "20:20",
    video: "1:49",
  },
  {
    key: "merchant-qr-kit",
    title: "Merchant QR Kit",
    pitch: "Printable shielded payment QR codes with amount and order baked in.",
    description: "Generates ZIP-321 payment request QRs for market stalls.",
    track: "privacy",
    themes: [THEME.A],
    appType: "SDK or library",
    publicUrl: null,
    person: ["Lakshmi Krishnan (mock)", "lakshmi.krishnan@example.com"],
    techs: ["TypeScript", "ZIP-321"],
    nextStep: "Print kits for one weekend market.",
    friction: "Wallets disagreed on ZIP-321 memo support.",
    frictionAreas: ["Wallet"],
    at: "14:10",
    video: "1:15",
  },
  {
    key: "feedback-box",
    title: "Anonymous Feedback Box",
    pitch: "Employees send paid, anonymous feedback to HR through shielded memos.",
    description: "A tiny shielded payment carries each note, so spam costs money and senders stay private.",
    track: "privacy",
    themes: [THEME.C],
    appType: "web app",
    publicUrl: "https://feedback-box.example.com",
    person: ["Omkar Patil (mock)", "omkar.patil@example.com"],
    techs: ["WebZjs (ChainSafe)", "Astro"],
    nextStep: "Pilot at our own coworking space.",
    friction: "Memo encoding of emoji broke the parser.",
    frictionAreas: ["WebZjs or SDK"],
    at: "21:40",
    video: "1:33",
  },
  {
    key: "ballot-shield",
    title: "Ballot Shield",
    pitch: "Private polls for housing societies, one shielded token per flat.",
    description: "Each flat gets a voting note; votes are tallied by viewing key without linking flats to votes.",
    track: "privacy",
    themes: [THEME.C, THEME.D],
    appType: "web app",
    publicUrl: "https://ballot-shield.example.com",
    person: ["Shreya Bhatt (mock)", "shreya.bhatt@example.com"],
    techs: ["WebZjs (ChainSafe)", "React"],
    nextStep: "Run the next society AGM vote.",
    friction: null,
    frictionAreas: [],
    at: "17:55",
    video: "1:58",
  },
  {
    key: "zec-allowance",
    title: "Zec Allowance",
    pitch: "Parents send a weekly shielded allowance with spending notes.",
    description: "Scheduled shielded sends with a memo note and a child-friendly balance view.",
    track: "privacy",
    themes: [THEME.A],
    appType: "mobile app",
    publicUrl: "https://zec-allowance.example.com",
    person: ["Yash Thakur (mock)", "yash.thakur@example.com"],
    techs: ["Zashi SDK", "Kotlin"],
    nextStep: "Test with three families.",
    friction: "Android emulator could not reach testnet lightwalletd over TLS.",
    frictionAreas: ["Node or indexer", "Wallet"],
    at: "19:25",
    video: "1:47",
  },
  {
    key: "reserves-lite",
    title: "Proof of Reserves Lite",
    pitch: "A small exchange proves it holds customer ZEC without publishing balances.",
    description: "Aggregates viewing-key totals into a reserves attestation an auditor can re-run.",
    track: "privacy",
    themes: [THEME.D],
    appType: "CLI",
    publicUrl: null,
    person: ["Aman Gupta (mock)", "aman.gupta@example.com"],
    techs: ["Rust", "zcash_client_sqlite"],
    nextStep: "Share the design with one Indian exchange.",
    friction: "Our test transaction never showed up; we may have broadcast to the wrong network.",
    frictionAreas: ["Node or indexer", "Wallet"],
    at: "23:10",
    video: "1:59",
    txid: TXID_NOT_FOUND,
  },
  {
    key: "agent-wallet-guard",
    title: "Agent Wallet Guard",
    pitch: "Spending limits and shielded settlement for AI shopping agents.",
    description:
      "Sits between an agent and its wallet: enforces per-day caps, settles in shielded ZEC, and in the Agentic Commerce entry routes approved purchases to Bitrefill.",
    track: "both",
    themes: [THEME.B],
    appType: "agent",
    publicUrl: null,
    person: ["Zoya Khan (mock)", "zoya.khan@example.com"],
    team: [["Neil D'Souza (mock)", "neil.dsouza@example.com", "agent"]],
    techs: ["WebZjs (ChainSafe)", "Bitrefill MCP", "LangGraph", "Python"],
    nextStep: "Open-source the policy engine and get one agent framework to adopt it.",
    friction: "Juggling two SDKs' auth models in one agent loop.",
    frictionAreas: ["WebZjs or SDK", "Other"],
    at: "20:55",
    video: "1:56",
  },
  // --- Agentic Commerce (by Bitrefill) ---
  {
    key: "tab-settler",
    title: "Tab Settler",
    pitch: "An agent that settles a group trip's tab with each person's local gift cards.",
    description: "Reads a shared expense sheet, picks each person's local brands by country, and buys one multi-product order.",
    track: "agentic",
    themes: [],
    appType: "agent",
    publicUrl: null,
    person: ["Karan Malhotra (mock)", "karan.malhotra@example.com"],
    techs: ["Bitrefill MCP", "Claude", "Google Sheets API"],
    nextStep: "Ship as a Splitwise companion bot.",
    friction: "Order polling rule tripped us up for an hour.",
    frictionAreas: ["Docs"],
    at: "18:45",
    video: "1:58",
  },
  {
    key: "roam-topup",
    title: "Roam Topup",
    pitch: "An agent that tops up your eSIM the moment you land.",
    description: "Watches flight status and buys the right eSIM data pack on arrival.",
    track: "agentic",
    themes: [],
    appType: "agent",
    publicUrl: null,
    person: ["Nisha Arora (mock)", "nisha.arora@example.com"],
    techs: ["Bitrefill MCP", "Gemini CLI", "AviationStack"],
    nextStep: "Beta with 20 frequent flyers.",
    friction: "ICCID lookups were slow on the test product.",
    frictionAreas: ["Other"],
    at: "16:30",
    video: "1:40",
  },
  {
    key: "gift-concierge",
    title: "Gift Concierge",
    pitch: "Tell it who and the budget; it buys and sends the gift card.",
    description: "A chat agent that searches, buys and delivers a gift card with a note.",
    track: "agentic",
    themes: [],
    appType: "web app",
    publicUrl: "https://gift-concierge.example.com",
    person: ["Rhea Fernandes (mock)", "rhea.fernandes@example.com"],
    techs: ["Bitrefill MCP", "OpenRouter", "Next.js"],
    nextStep: "Add calendar reminders for birthdays.",
    friction: null,
    frictionAreas: [],
    at: "14:55",
    video: "1:22",
  },
  {
    key: "bill-pilot",
    title: "Bill Pilot",
    pitch: "An agent that pays recurring bills from a balance under a monthly policy.",
    description: "Policies cap spend per payee; the agent pays and files receipts.",
    track: "agentic",
    themes: [],
    appType: "agent",
    publicUrl: null,
    person: ["Tarun Bhatia (mock)", "tarun.bhatia@example.com"],
    techs: ["Bitrefill MCP", "Cline", "Groq"],
    nextStep: "Support Indian utility bills.",
    friction:
      "Detailed notes: balance checkout worked first try, but the error when a bill payment product was region-locked said only 'invalid'. We logged every tool call and attached the trace.",
    frictionAreas: ["Docs", "Other"],
    at: "21:05",
    video: "1:58",
  },
  {
    key: "reward-drops",
    title: "Reward Drops",
    pitch: "Bulk gift-card rewards for a hackathon's volunteers, issued by an agent.",
    description: "Uploads a list, the agent issues a batch and emails each code.",
    track: "agentic",
    themes: [],
    appType: "CLI",
    publicUrl: null,
    person: ["Deepa Pillai (mock)", "deepa.pillai@example.com"],
    techs: ["Bitrefill API", "Node.js"],
    nextStep: "Use it to reward volunteers at the next WebZero event.",
    friction: "Batch limits weren't documented.",
    frictionAreas: ["Docs"],
    at: "17:35",
    video: "1:18",
  },
  {
    key: "lightning-pantry",
    title: "Lightning Pantry",
    pitch: "Restock a shared office pantry by voice; pays over Lightning.",
    description: "A voice agent turns requests into a grocery gift-card order.",
    track: "agentic",
    themes: [],
    appType: "agent",
    publicUrl: null,
    person: ["Varun Iyer (mock)", "varun.iyer@example.com"],
    techs: ["Bitrefill MCP", "Whisper", "Lightning"],
    nextStep: "Run it in our office for a month.",
    friction: "Lightning invoice expiry was shorter than our agent loop.",
    frictionAreas: ["Other"],
    at: "22:20",
    video: "1:37",
  },
  {
    key: "commission-loop",
    title: "Commission Loop",
    pitch: "A community bot that earns referral commissions and spends them on members' data.",
    description: "Tracks affiliate earnings and recycles them into monthly top-ups.",
    track: "agentic",
    themes: [],
    appType: "agent",
    publicUrl: null,
    person: ["Ishaan Chopra (mock)", "ishaan.chopra@example.com"],
    techs: ["Bitrefill MCP", "Discord.js"],
    nextStep: "Launch in one Discord community.",
    friction: "Affiliate reporting lagged by a day.",
    frictionAreas: ["Other"],
    at: "19:55",
    video: "1:43",
  },
  {
    key: "border-router",
    title: "Border Value Router",
    pitch: "Get $40 of value to someone abroad; the agent picks the right instrument.",
    description: "Compares airtime, local gift cards and bill pay for the destination and buys the best fit.",
    track: "agentic",
    themes: [],
    appType: "web app",
    publicUrl: "https://border-router.example.com",
    person: ["Mitali Sen (mock)", "mitali.sen@example.com"],
    techs: ["Bitrefill MCP", "Claude", "Remix"],
    nextStep: "Add Lagos and Manila presets.",
    friction: "Country coverage data was hard to query.",
    frictionAreas: ["Docs"],
    at: "23:05",
    video: "1:59",
  },
];

// ---------- Scores ----------
// [works, private, easy, needed, continuing, bonus] per Privacy judge A..E.
type PrivRow = [number, number, number, number, number, number];
const PRIVACY_SCORES: Record<string, PrivRow[]> = {
  // Brief §6: totals 14, 12, 12, 16, 11 → average 13.0.
  "chai-ledger": [
    [3, 2, 2, 3, 3, 1],
    [3, 2, 2, 2, 3, 0],
    [2, 2, 2, 3, 2, 1],
    [3, 3, 3, 3, 3, 1],
    [3, 2, 2, 2, 2, 0],
  ],
  // Works 0 from every judge: a strong design write-up with no real Zcash
  // interaction. Averages 12.4 (2nd on total) but the winner gate blocks it.
  "reserves-lite": [
    [0, 3, 3, 3, 3, 1],
    [0, 3, 3, 3, 2, 1],
    [0, 3, 3, 2, 3, 1],
    [0, 3, 3, 3, 3, 1],
    [0, 3, 2, 3, 3, 1],
  ],
  // Tie 1: Hushbox and Quiet Payroll both total 60 (avg 12.0). Hushbox has the
  // higher Continuing (15 vs 10), so it ranks above.
  hushbox: [
    [3, 2, 2, 3, 3, 0],
    [3, 2, 2, 2, 3, 0],
    [2, 2, 2, 3, 3, 0],
    [3, 2, 2, 2, 3, 0],
    [2, 2, 2, 2, 3, 0],
  ],
  "quiet-payroll": [
    [3, 3, 2, 2, 2, 1],
    [3, 2, 2, 2, 2, 1],
    [3, 3, 2, 2, 2, 0],
    [3, 2, 2, 3, 2, 0],
    [3, 2, 2, 2, 2, 0],
  ],
  "ticket-veil": [
    [3, 2, 2, 2, 2, 0],
    [3, 2, 2, 2, 3, 0],
    [3, 2, 2, 2, 2, 0],
    [3, 2, 2, 3, 2, 0],
    [3, 2, 3, 2, 2, 0],
  ],
  // Tie 2: Tip Jar SDK and Orchard Receipts both total 55 (avg 11.0) with equal
  // Continuing (10); Tip Jar has the higher Needed (10 vs 5), so it takes the
  // second third prize.
  "tip-jar-sdk": [
    [3, 2, 2, 2, 2, 0],
    [3, 2, 2, 2, 2, 0],
    [3, 2, 2, 2, 2, 0],
    [3, 2, 2, 2, 2, 0],
    [3, 2, 2, 2, 2, 0],
  ],
  "orchard-receipts": [
    [3, 2, 2, 1, 2, 1],
    [3, 2, 2, 1, 2, 1],
    [3, 2, 2, 1, 2, 1],
    [3, 2, 2, 1, 2, 1],
    [3, 2, 2, 1, 2, 1],
  ],
};

// [requirements 0-2, techStack 0-5, innovation 0-5] per Bitrefill judge.
type AgRow = [number, number, number];
const AGENTIC_SCORES: Record<string, AgRow[]> = {
  "tab-settler": [[2, 5, 5], [2, 5, 4]],
  "ticket-veil": [[2, 4, 5], [2, 4, 4]],
  "roam-topup": [[2, 4, 3], [2, 4, 4]],
};

// Small deterministic hash for the rest of the field (keeps totals below the winners).
const h = (s: string, n: number) => {
  let x = n * 97;
  for (let i = 0; i < s.length; i += 1) x = (x * 31 + s.charCodeAt(i)) >>> 0;
  return x;
};
// Every criterion 1-2 and no bonus: totals top out at 10, below every winner.
const genPrivacy = (key: string, judge: number, txFailed: boolean): PrivRow => {
  const r = (c: number) => 1 + (h(key, judge * 10 + c) % 2);
  return [txFailed ? 1 : r(0), r(1), r(2), r(3), r(4), 0];
};
const genAgentic = (key: string, judge: number): AgRow => [
  1 + (h(key, judge * 10) % 2),
  1 + (h(key, judge * 10 + 1) % 3),
  1 + (h(key, judge * 10 + 2) % 3),
];

const NOTE_POOL = [
  "Clear demo, but the Zcash step is only described in the video.",
  "Good idea; README too thin to run it without the builder.",
  "",
  "Testnet transaction visible in the video. Next milestone is vague.",
  "",
  "Would like to see a named user for the pilot.",
];
const NOTES: Record<string, string[]> = {
  "chai-ledger": [
    "Paid at the URL from Zingo in under a minute; the accountant export is the standout. Server stores customer emails next to orders.",
    "Memo matching is clever. Refunds missing.",
    "Demo video skipped the viewing-key export.",
    "Best end-to-end flow of the night.",
    "Solid; next milestone could name the cafés.",
  ],
  hushbox: ["Real need for chit funds.", "Rescored in the morning after trying the URL again.", "", "Strong partner fit.", ""],
  "quiet-payroll": ["Viewing key per payee is exactly right.", "", "", "Named studio partner is great.", ""],
  "reserves-lite": [
    "Great privacy design, but the demo never touches testnet: Works 0.",
    "Txid not found on testnet; the video is slides.",
    "",
    "Would be a strong winner with a real transaction.",
    "",
  ],
};

// ---------- Build ----------

const istOnHackDay = (hhmm: string) => `2026-11-04T${hhmm}:00+05:30`;
/** Evening judging runs 20:00–22:00 on the 4th; anything in by 20:00 is scored then. */
const sessionFor = (submittedAt: string) =>
  Date.parse(submittedAt) <= Date.parse(istOnHackDay("20:00")) ? "evening" : "morning";
const scoredAt = (session: string, i: number) =>
  session === "evening"
    ? `2026-11-04T${String(20 + Math.floor(i / 30)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}:00+05:30`
    : `2026-11-05T0${8 + Math.floor(i / 30)}:${String((i * 7) % 60).padStart(2, "0")}:00+05:30`;

// Ecosystem Prize flags: one second prize (milestone in progress) and one third
// prize (milestone delivered, confirmed, shared, paid out).
const ECOSYSTEM = new Set(["hushbox", "tip-jar-sdk"]);

const PRIZES: Record<string, Partial<Record<JudgedTrack, ApiPrizeTier>>> = {
  "chai-ledger": { privacy: tier("Privacy: top prize") },
  hushbox: { privacy: tier("Privacy: second prize") },
  "quiet-payroll": { privacy: tier("Privacy: second prize") },
  "ticket-veil": { privacy: tier("Privacy: third prize"), agentic: tier("Agentic Commerce: second") },
  "tip-jar-sdk": { privacy: tier("Privacy: third prize") },
  "tab-settler": { agentic: tier("Agentic Commerce: most innovative") },
  "roam-topup": { agentic: tier("Agentic Commerce: third") },
  "bill-pilot": { agentic: tier("Agentic Commerce: best feedback") },
};

const txCheckFor = (txid: string | null): ApiTxCheck | null => {
  if (!txid) return null;
  const status = MOCK_TX_RESULTS[txid] ?? "verified";
  return { status, checkedAt: "2026-11-04T23:59:00+05:30", attempts: status === "could_not_check" ? 3 : 1 };
};

const checkInsFor = (key: string, i: number) => {
  const out = [];
  if (ECOSYSTEM.has(key)) {
    out.push({ day: 14, stillBuilding: true, link: `https://${key}.example.com/changelog`, answeredAt: "2026-11-19T18:00:00+05:30" });
    out.push({ day: 30, stillBuilding: true, link: `https://${key}.example.com/release`, answeredAt: "2026-12-04T18:00:00+05:30" });
    return out;
  }
  // Roughly 2 in 3 answer at 14 days, 1 in 2 at 30 days; fewer still building later.
  if (i % 3 !== 2) {
    out.push({
      day: 14,
      stillBuilding: i % 4 !== 3,
      link: i % 4 !== 3 ? `https://github.com/example/${key}/commits` : null,
      answeredAt: "2026-11-20T10:00:00+05:30",
    });
  }
  if (i % 2 === 0) {
    out.push({
      day: 30,
      stillBuilding: i % 6 === 0,
      link: i % 6 === 0 ? `https://github.com/example/${key}/releases` : null,
      answeredAt: "2026-12-05T10:00:00+05:30",
    });
  }
  return out;
};

export type TrackedSeed = {
  submissions: ApiTrackedSubmission[];
  scores: ApiRubricScore[];
  resultsPublishedAt: string | null;
  checkInsSent: Record<string, string>;
};

export function buildFreeSocietyHackSeed(): TrackedSeed {
  const submissions: ApiTrackedSubmission[] = PROJECTS.map((p, i) => {
    const createdAt = istOnHackDay(p.at);
    const isPrivacy = p.track !== "agentic";
    const txid = isPrivacy ? p.txid ?? hexTxid(i + 1) : null;
    const prizes = PRIZES[p.key] ?? {};
    let milestone: ApiTrackedSubmission["details"]["milestone"] = null;
    if (p.key === "hushbox") {
      milestone = {
        sentence: p.nextStep,
        partnerName: "Meera Pillai (mock)",
        partnerProject: "ZecHub (mock partner)",
        agreedAt: "2026-11-12T12:00:00+05:30",
        deliveryLink: null,
        partnerConfirmed: null,
        partnerConfirmedAt: null,
        loungeDate: null,
        payoutStatus: "pending",
        payoutReleasedAt: null,
      };
    } else if (p.key === "tip-jar-sdk") {
      milestone = {
        sentence: p.nextStep,
        partnerName: "Arvind Shetty (mock)",
        partnerProject: "Creator Collective (mock partner)",
        agreedAt: "2026-11-11T12:00:00+05:30",
        deliveryLink: "https://github.com/example/tip-jar-sdk/releases/v0.1.0",
        partnerConfirmed: true,
        partnerConfirmedAt: "2026-12-02T12:00:00+05:30",
        loungeDate: "2026-12-04",
        payoutStatus: "released",
        payoutReleasedAt: "2026-12-11T12:00:00+05:30",
      };
    }
    return {
      id: `fsh-${String(i + 1).padStart(2, "0")}-${p.key}`,
      programId: FREE_SOCIETY_HACK_SLUG,
      submitterName: p.person[0],
      lumaEmail: p.person[1],
      projectTitle: p.title,
      projectBrief: p.description,
      // A public CC0 sample clip (MDN), so the judges' inline player has something to play.
      videoUrl: SAMPLE_DEMO_VIDEO,
      githubUrl: `https://github.com/example/${p.key}`,
      late: false,
      createdAt,
      updatedAt: createdAt,
      prizeAmount: null,
      details: {
        track: p.track,
        themes: p.themes,
        pitch: p.pitch,
        team: (p.team ?? []).map(([name, email, role]) => ({ name, email, role })),
        appType: p.appType,
        publicUrl: p.publicUrl,
        demoVideoLength: p.video ?? null,
        technologies: p.techs,
        network: isPrivacy ? "testnet (NU7)" : null,
        pool: isPrivacy ? "Orchard, unified addresses" : null,
        testnetTxid: txid,
        txCheck: txCheckFor(txid),
        nextStep: p.nextStep,
        nextStepLinks: p.links ?? [],
        anonymous: !!p.anonymous,
        frictionNotes: p.friction,
        frictionAreas: p.frictionAreas,
        milestone,
        checkIns: checkInsFor(p.key, i),
      },
      prizes,
      ecosystemPrize: ECOSYSTEM.has(p.key),
    };
  });

  const scores: ApiRubricScore[] = [];
  submissions.forEach((s, i) => {
    const key = s.id.replace(/^fsh-\d+-/, "");
    const session = sessionFor(s.createdAt);
    const failed = s.details.txCheck?.status === "not_found" || s.details.txCheck?.status === "not_shielded";
    if (s.details.track !== "agentic") {
      PRIVACY_JUDGES.forEach((judgeEmail, j) => {
        const [works, priv, easy, needed, continuing, bonus] = PRIVACY_SCORES[key]?.[j] ?? genPrivacy(key, j, failed);
        // Judge B rescored Hushbox in the morning session (two-session continuity).
        const sess = key === "hushbox" && j === 1 ? "morning" : session;
        scores.push({
          submissionId: s.id,
          judgeEmail,
          track: "privacy",
          criteria: { works, private: priv, easy, needed, continuing, bonus },
          notes: NOTES[key]?.[j] ?? NOTE_POOL[h(key, j) % NOTE_POOL.length],
          session: sess,
          updatedAt: scoredAt(sess, i),
        });
      });
    }
    if (s.details.track !== "privacy") {
      AGENTIC_JUDGES.forEach((judgeEmail, j) => {
        const [requirements, techStack, innovation] = AGENTIC_SCORES[key]?.[j] ?? genAgentic(key, j);
        scores.push({
          submissionId: s.id,
          judgeEmail,
          track: "agentic",
          criteria: { requirements, techStack, innovation },
          notes: j === 0 && key === "bill-pilot" ? "Best feedback of the day: full tool-call trace." : "",
          session,
          updatedAt: scoredAt(session, i),
        });
      });
    }
  });

  return {
    submissions,
    scores,
    resultsPublishedAt: "2026-11-05T13:15:00+05:30",
    checkInsSent: { "14": "2026-11-19T09:00:00+05:30", "30": "2026-12-04T09:00:00+05:30" },
  };
}

/** Point-person emails for the mock Luma checked-in guest list. */
export const FSH_GUEST_EMAILS: [string, string][] = [
  ...PROJECTS.map((p) => p.person),
  ["Demo Builder (mock)", FSH_DEMO_BUILDER_EMAIL],
];
