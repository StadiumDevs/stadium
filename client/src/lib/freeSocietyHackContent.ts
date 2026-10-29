import type { ProgramContentSection } from "@/lib/api";

/**
 * Authored public-page content for the Zcash Free Society Hack (program slug
 * `free-society-hack-2026`). Same pattern as bitrefillContent.ts: rendered as
 * ordered sections above the submit panel, with the `schedule` section also
 * read by the KEY INFO block. Keep in sync with the content migration
 * (supabase/migrations/20261026000000_free_society_hack_2026_content.sql);
 * both are generated from this array.
 *
 * Copy rules: no em-dashes; all times IST (UTC+5:30).
 */
export const FREE_SOCIETY_HACK_BUILDER_PACK_URL =
  "https://app.notion.com/p/Free-Society-Hack-Builder-Pack-3ff3e52aeb15807eace6f16f84a74c14";

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
      "**Privacy (Zcash).** Build something people can use privately with shielded ZEC on testnet. Judged by five judges in Stadium.\n\n" +
      "**Agentic Commerce (by Bitrefill).** An AI agent that searches, buys and pays on Bitrefill by itself. Judged and paid by Bitrefill.\n\n" +
      "You can enter one track or both. A project can win in both.",
  },
  {
    type: "markdown",
    title: "Themes (Privacy track)",
    body:
      "- **1.** Private payment rails\n" +
      "- **2.** The first five minutes\n" +
      "- **3.** Privacy beyond the transaction",
  },
  {
    type: "markdown",
    title: "What a Privacy submission needs",
    body:
      "▢ **Works on testnet with NU7**, using shielded Orchard funds via unified addresses.\n\n" +
      "▢ **A one-line pitch:** what it does and for whom.\n\n" +
      "▢ **One testnet transaction id** your project created. Stadium checks that it exists and is shielded; amounts and memos stay private.\n\n" +
      "▢ **A public URL** if it is an app people use.\n\n" +
      "▢ **A demo video, 2 minutes max.** For non-apps it must show it working with Zcash.\n\n" +
      "▢ **A public repo with a README.**\n\n" +
      "▢ **Every technology you used.**\n\n" +
      "▢ **A next milestone for the 30 days**, with links to anything already started.\n\n" +
      "Feedback on what slowed you down is optional and not scored, but it goes straight to the teams who can fix it.\n\n" +
      "**Out of scope:** Zcash Shielded Assets, mainnet funds, Sprout, v4 transactions, zcashd wallet RPC.",
  },
  {
    type: "markdown",
    title: "Prizes",
    body:
      "**Privacy (USD, cash): five podium projects**\n\n" +
      "- Top prize: $1,300 (one project)\n" +
      "- Second prize: $300 (two projects)\n" +
      "- Third prize: $200 (two projects)\n\n" +
      "**Ecosystem Prize.** The judges pick two of the five podium projects, at any prize level. Each gets a partner and a 30-day milestone. Complete it and $100 more is released on Fri 11 Dec. If it is not completed, you keep your day prize.\n\n" +
      "**Agentic Commerce (by Bitrefill)**\n\n" +
      "- $1,000 · $800 · $600\n" +
      "- $100 for the best feedback\n\n" +
      "Each project names one point person; prizes go to that person.",
  },
  {
    type: "markdown",
    title: "Builder Pack",
    body:
      "Everything you need to build, including how Privacy projects are judged, is in the " +
      "[Free Society Hack Builder Pack](" + FREE_SOCIETY_HACK_BUILDER_PACK_URL + ").",
  },
  {
    type: "markdown",
    title: "The 30 days after",
    body:
      "The two Ecosystem Prize projects track their 30-day milestone here:\n\n" +
      "1. Agree the milestone with your partner by **Fri 13 Nov**\n" +
      "2. Check in with the organisers **Thu 19 Nov**\n" +
      "3. Deliver it with a public link by **Fri 4 Dec** (partner confirms)\n" +
      "4. Share it at a ZecHub Friday Lounge by **Fri 4 Dec**\n" +
      "5. $100 released **Fri 11 Dec**",
  },
  {
    type: "markdown",
    title: "FAQ",
    body:
      "**Who can submit?** Builders checked in at Capital Social, BKC, Mumbai. Use the email you registered with on Luma; that person is the project's point person.\n\n" +
      "**Can I enter both tracks?** Yes. Pick \"Both\" on the form and include a testnet transaction id.\n\n" +
      "**Do I need real ZEC?** No. Testnet only. Mainnet funds are out of scope.\n\n" +
      "**When do projects appear?** As soon as you submit, on this page.\n\n" +
      "**Can I stay anonymous?** Yes. Tick \"I want to be anonymous\" on the form and your name and your teammates' names are hidden on the public page. Organisers can still see them.",
  },
];
