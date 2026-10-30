import type { ProgramContentSection } from "./api";
import { BITREFILL, mdLink, ZCASH } from "./llms/devResources";
import { llmsFullPath, llmsPath } from "./llms/llmsPrograms";

/**
 * Authored public-page content for the Zcash Free Society Hack (program slug
 * `free-society-hack-2026`). Same pattern as bitrefillContent.ts: rendered as
 * ordered sections above the submit panel, with the `schedule` section also
 * read by the KEY INFO block. Keep in sync with the content migration
 * (supabase/migrations/20261026000000_free_society_hack_2026_content.sql);
 * both are generated from this array.
 *
 * Copy rules: no em-dashes; all times IST (UTC+5:30). Source: the builder doc
 * (tracks and resources). The same sections also feed the generated llms.txt
 * (lib/llms/renderLlms.ts), so an AI assistant reads exactly what builders do.
 * Relative imports only: vite.config.ts and the migration generator bundle it.
 */
/** The venue on Google Maps. */
export const FREE_SOCIETY_HACK_VENUE_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=19.0727556%2C72.8711671&query_place_id=ChIJWdw8iu3I5zsRk3p59YTdif8";

export const FREE_SOCIETY_HACK_BUILDER_PACK_URL =
  "https://app.notion.com/p/Free-Society-Hack-Builder-Pack-3ff3e52aeb15807eace6f16f84a74c14";

/** The program's llms.txt (generated at build), for AI assistants. */
export const FREE_SOCIETY_HACK_LLMS_PATH = llmsPath("free-society-hack-2026");
export const FREE_SOCIETY_HACK_LLMS_FULL_PATH = llmsFullPath("free-society-hack-2026");

const devResourcesBody =
  "**Zcash.** " + ZCASH.intro + "\n\n" +
  ZCASH.knowFirst.map((k) => `- ${k}`).join("\n") + "\n\n" +
  "| Building | Start with | Note |\n| --- | --- | --- |\n" +
  ZCASH.stack.map((s) => `| ${s.building} | ${s.start.map((x) => mdLink(x)).join(" + ")} | ${s.note ?? ""} |`).join("\n") + "\n\n" +
  `**Run it.** Start on your laptop with ${mdLink(ZCASH.local.tool, false)}: it ${ZCASH.local.text} ` +
  `Before the demo, check on public testnet: connect to \`${ZCASH.testnet.server}\`, get TAZ from ` +
  ZCASH.testnet.faucets.map((x) => mdLink(x)).join(", ") +
  " (any mentor can send you more), and check transactions in " + ZCASH.testnet.explorers.map((x) => mdLink(x, false)).join(" or ") + ".\n\n" +
  `**Taking payments:** a ZIP 321 payment link with an order ID in the memo, a viewing key on your server (never the spending key), then wait for confirmation. Or use ${mdLink(ZCASH.cipherpay)}.\n\n` +
  "**Bitrefill.** " + BITREFILL.intro + " Use at least one surface: " +
  BITREFILL.surfaces.map((x) => mdLink(x.surface, false)).join(", ") +
  ". Test with test products (MCP test product `delos-syldavia`); never pay for them with real money or store credit.\n\n" +
  "The full lists (more tools, learning links, every gotcha) are in the Builder Pack and in [llms-full.txt](" + FREE_SOCIETY_HACK_LLMS_FULL_PATH + ").";

export const FREE_SOCIETY_HACK_2026_CONTENT: ProgramContentSection[] = [
  {
    type: "schedule",
    title: "Schedule (IST)",
    rows: [
      { time: "Wed 4 Nov 11:00", label: "Hack starts" },
      { time: "Wed 4 Nov 20:00", label: "Evening judging (projects in by now)" },
      { time: "Thu 5 Nov 00:00", label: "Submissions close" },
      { time: "Thu 5 Nov 08:00", label: "Morning judging" },
      { time: "Thu 5 Nov 10:30", label: "Demo line-up out" },
      { time: "Thu 5 Nov 11:00", label: "Demo day" },
      { time: "Thu 5 Nov 13:00", label: "Prize announcements" },
    ],
  },
  {
    type: "markdown",
    title: "Two tracks",
    body:
      "**Privacy (Zcash).** Zcash already does private payments, selective disclosure and encrypted messages. What's missing is the layer that makes them easy to build and use. Pick a theme and build the thing that gets one more person past a gap, or bring your own idea that fits a theme. Judged by five judges in Stadium.\n\n" +
      "**Agentic Commerce (by Bitrefill).** One challenge, one pool, one rubric: build an agent that finds, buys and pays for real products through Bitrefill on its own, so the work gets done while the user sleeps. Judged and paid by Bitrefill.\n\n" +
      "You can enter one track or both. A project can win in both.",
  },
  {
    type: "markdown",
    title: "Themes (Privacy track)",
    body:
      "### 1. Private payment rails\n\n" +
      "Paying and getting paid in shielded ZEC should be as easy as a payment link, for a shop, a freelancer or an AI agent.\n\n" +
      "- **For:** merchants, creators, P2P sellers, agent builders, API sellers, developers new to Zcash.\n" +
      "- **Build:** a checkout that matches payments to orders by memo, batch payouts, shareable payment links, an API that charges agents per call over HTTP 402, an agent wallet with a spending cap, a slice of the @zcash/sdk TypeScript layer, a starter template, an MCP server or llms.txt so AI agents write current Zcash code.\n\n" +
      "### 2. The first five minutes\n\n" +
      "Most people give up before their first shielded payment. Make it understandable and trustworthy.\n\n" +
      "- **For:** first-time users, including people who have never used crypto.\n" +
      "- **Build:** onboarding to a first payment in minutes, paying a name instead of a long address, a plain confirmation screen (who, how much, fee, who can see it), translations, testing on low-end phones. Test with someone who didn't build it.\n\n" +
      "### 3. Privacy beyond the transaction\n\n" +
      "Privacy also depends on what you choose to reveal and what your infrastructure can see.\n\n" +
      "- **For:** accountants, auditors, DAOs and community groups, wallet and app developers, people on monitored networks.\n" +
      "- **Build:** a read-only export from a viewing key, a verifiable receipt for one payment, a 2-of-3 shared treasury, tickets or invoices in encrypted memos; or network privacy: hide your IP and sync pattern from the light-wallet server. Nym is the host partner for network privacy.",
  },
  {
    type: "markdown",
    title: "What a Privacy submission needs",
    body:
      "**Rule:** build on **testnet with NU7**, using shielded funds via unified addresses.\n\n" +
      "| Item | Required |\n| --- | --- |\n" +
      "| **One-line pitch:** what it does and for whom. Works is scored against it | Yes |\n" +
      "| **Demo video, 2 minutes max,** showing every step of the pitch. Judges watch only the first 2 minutes | No, but strongly preferred: it's the easiest way to prove Works |\n" +
      "| **Public URL** where judges can try it on testnet | Yes, for apps people use (web app, checkout, dashboard). SDKs, CLIs, bots, agents and backends skip it and show Zcash working in the video or README, for example a link to the transaction in an explorer |\n" +
      "| **One testnet transaction ID** your project created. Stadium checks it's a real shielded transaction and shows judges a badge; a failed check doesn't block you | Yes |\n" +
      "| **Public repo with a README** listing every technology used and design decisions | Yes |\n" +
      "| **Privacy and trust note:** what your app reveals, to whom, and what users must trust (see below) | Yes |\n" +
      "| **Next step:** what you'll do in the 30 days after, with links to anything you've started | Yes |\n" +
      "| **Feedback:** what slowed you down, in your own words | Optional, not scored |\n\n" +
      "**Out of scope:** Zcash Shielded Assets, mainnet funds, Sprout, v4 transactions, zcashd wallet RPC.",
  },
  {
    type: "markdown",
    title: "Your privacy and trust note",
    body:
      "Judges score **Private** from this note, so write it before you submit. A few honest lines beat a vague claim. Answer four questions:\n\n" +
      "1. **What stays private?** For example: amounts, sender and receiver are shielded on-chain.\n" +
      "2. **What does your app reveal, and to whom?** For example: your server stores emails next to order IDs; the light-wallet server sees the user's IP address.\n" +
      "3. **What do users have to trust?** Name each party: your server, a hosted light-wallet server, a payment processor, an AI model provider, you as the operator.\n" +
      "4. **What would you fix next?** The exposures you know about and haven't solved yet.\n\n" +
      "Self-custody alone isn't a privacy design. Naming a gap doesn't cost points; leaving one out does.\n\n" +
      "**Judges look for the projects most likely to keep going because people need them.** Show every step for real: a small project where everything works can score full marks on Works; a big one with a mocked step can't. A project scoring 0 on Works can't win.",
  },
  {
    type: "markdown",
    title: "Agentic Commerce (by Bitrefill)",
    body:
      "**Directions** (for inspiration, not separate categories):\n\n" +
      "- **It pays for itself.** The agent completes the purchase and the payment with no human checkout.\n" +
      "- **Works while you sleep.** Buying triggered by an event, a schedule or a rule. For example: land in a new country and your eSIM tops up.\n" +
      "- **Shop from chat.** Commerce inside a conversation. For example: \"Send my mom a gift card\" and the code comes back.\n\n" +
      "Agents that pay with crypto and products relevant to India are encouraged.\n\n" +
      "**Rules:** use at least one Bitrefill surface (MCP, CLI, Agent Skills, x402 or the REST API), and show an agent-initiated purchase **working** in the demo, not mocked.\n\n" +
      "| Item | Required |\n| --- | --- |\n" +
      "| **Public repo** with a README explaining the project and the demo URL | Yes |\n" +
      "| **Demo video, 3 minutes max,** or a live link showing the agent make a purchase | Yes |\n" +
      "| **Bitrefill feedback:** what worked and what didn't (questions on the submit form) | Yes |\n\n" +
      "**Judging:** three Bitrefill judges score every submission out of 5 on use of the Bitrefill tech stack, following the requirements, and how innovative it is; the scores are averaged. The ranking picks the winners and the top 5 teams Bitrefill spotlights. The $100 best-feedback prize goes to the most useful feedback.",
  },
  {
    type: "markdown",
    title: "Prizes",
    body:
      "**Privacy (USD, cash): five podium projects**\n\n" +
      "- Top prize: $1,300 (one project)\n" +
      "- Second prize: $300 (two projects)\n" +
      "- Third prize: $200 (two projects)\n\n" +
      "**Ecosystem Prize.** The judges pick two of the five Privacy podium projects. Each gets an ecosystem partner and $100 more for completing a milestone: a real next step for you, about ten hours of work. If you don't finish, you keep your day prize.\n\n" +
      "**Agentic Commerce (by Bitrefill)**\n\n" +
      "- $1,000 · $800 · $600\n" +
      "- $100 for the best feedback\n\n" +
      "Each project names one point person; prizes go to that person.",
  },
  {
    type: "markdown",
    title: "How to submit",
    body:
      "Submit on Stadium by **Thu 5 Nov, 00:00 IST**, with the email you registered with on Luma. Pick your track, or **Both**, and fill in what that track asks for. Entering both? Pick \"Both\" and fill in both tracks' items in one submission (testnet transaction ID, privacy and trust note, Bitrefill feedback, and a demo video).",
  },
  {
    type: "markdown",
    title: "Developer resources",
    body: devResourcesBody,
  },
  {
    type: "markdown",
    title: "Builder Pack",
    body:
      "Everything you need to build, including how Privacy projects are judged, is in the " +
      "[Free Society Hack Builder Pack](" + FREE_SOCIETY_HACK_BUILDER_PACK_URL + ").\n\n" +
      "**Using an AI assistant?** Give it [llms.txt](" + FREE_SOCIETY_HACK_LLMS_PATH + ") or the full [llms-full.txt](" + FREE_SOCIETY_HACK_LLMS_FULL_PATH + "): the tracks, themes, what to submit, how it's judged and the developer resources, in one file it can read.",
  },
  {
    type: "markdown",
    title: "Help on the day",
    body:
      "- **Mentors** from Zcash projects and Bitrefill are on the floor. Any mentor can send you more testnet ZEC (TAZ).\n" +
      "- **Online:** `#zechub` on the [Zcash Discord](https://discord.gg/zcash).\n" +
      "- The WebZero hacker chat on Telegram.",
  },
  {
    type: "markdown",
    title: "The 30 days after",
    body:
      "The two Ecosystem Prize projects track their milestone here:\n\n" +
      "1. **Agree** a one-sentence milestone with your partner by **Fri 13 Nov** (check-in **Thu 19 Nov**)\n" +
      "2. **Deliver** it with a public link by **Fri 4 Dec**; your partner confirms\n" +
      "3. **Share** it at a ZecHub Friday Lounge by **Fri 4 Dec**\n" +
      "4. The $100 is released **Fri 11 Dec**\n\n" +
      "**Everyone else:** we'll be in touch with teams after the hack. Keep building in your community (funding, meetups, ambassadors).",
  },
  {
    type: "markdown",
    title: "FAQ",
    body:
      "**Who can submit?** Builders checked in at [True Tramm Trunk, BKC, Mumbai](" + FREE_SOCIETY_HACK_VENUE_MAP_URL + "). Use the email you registered with on Luma; that person is the project's point person.\n\n" +
      "**Can I enter both tracks?** Yes. Pick \"Both\" on the form and fill in both tracks' items.\n\n" +
      "**Do I need real ZEC?** No. Testnet only. Mainnet funds are out of scope.\n\n" +
      "**Is the demo video required?** For Privacy it's optional but strongly preferred. For Agentic Commerce (and Both) it is required, or a live link showing the purchase.\n\n" +
      "**When do projects appear?** As soon as you submit, on this page.\n\n" +
      "**Can I stay anonymous?** Yes. Tick \"I want to be anonymous\" on the form and your name and your teammates' names are hidden on the public page. Organisers can still see them.",
  },
];
