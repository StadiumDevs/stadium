/**
 * Builds the llms.txt files (https://llmstxt.org) for programs with a profile,
 * so an AI assistant can help a builder pick a valid idea, check a submission
 * against the requirements and choose tools. Generated at build time by the
 * plugin in vite.config.ts from the same sources the site uses: the program's
 * page content, its profile (tracks, themes, rubric) and the developer
 * resources. Nothing here is hand-copied, so it can't drift from the site.
 *
 * Pure functions, relative imports only (bundled by the Vite config loader).
 */
import type { ProgramContentSection } from "../api";
import {
  FREE_SOCIETY_HACK_2026_CONTENT,
  FREE_SOCIETY_HACK_BUILDER_PACK_URL,
} from "../freeSocietyHackContent";
import { getProgramProfile, maxScore, type ProgramTrack } from "../programProfiles";
import { BITREFILL, mdLink, ZCASH } from "./devResources";
import { llmsFullPath, llmsPath } from "./llmsPrograms";

export type LlmsProgram = {
  slug: string;
  name: string;
  summary: string;
  when: string;
  where: string;
  deadline: string;
  lumaUrl: string;
  builderPackUrl: string;
  judgingGuideUrl?: string;
  content: ProgramContentSection[];
};

/** Programs that publish an llms.txt. */
export const LLMS_PROGRAMS: LlmsProgram[] = [
  {
    slug: "free-society-hack-2026",
    name: "Free Society Hack",
    summary:
      "A one-day Zcash hackathon with a Bitrefill track, in person in Mumbai. Two tracks: Privacy (Zcash), build something people can use privately with shielded ZEC on testnet; and Agentic Commerce (by Bitrefill), an AI agent that finds, buys and pays for real products through Bitrefill on its own. A project can enter and win in both.",
    when: "Wed 4 Nov 2026, 11:00 IST (hack starts) to Thu 5 Nov 2026 (top teams contacted 11:00, demos 12:00, prizes 13:30 IST)",
    where: "True Tramm Trunk, BKC, Mumbai (in person)",
    deadline: "Thu 5 Nov 2026, 00:00 IST",
    lumaUrl: "https://luma.com/freesocietyhackathon",
    builderPackUrl: FREE_SOCIETY_HACK_BUILDER_PACK_URL,
    content: FREE_SOCIETY_HACK_2026_CONTENT,
  },
];

export { llmsFullPath, llmsPath };

// Page sections that llms-full.txt replaces with a fuller version.
const SKIP_IN_FULL = new Set(["Developer resources", "Builder Pack"]);

const absolutize = (md: string, origin: string) => md.replace(/\]\(\//g, `](${origin}/`);

const sectionMd = (s: ProgramContentSection, origin: string): string | null => {
  const title = "title" in s && s.title ? `## ${s.title}\n\n` : "";
  switch (s.type) {
    case "markdown":
    case "text":
      return title + absolutize(s.body, origin);
    case "schedule":
      return title + "| Time | What |\n| --- | --- |\n" + s.rows.map((r) => `| ${r.time} | ${r.label} |`).join("\n");
    case "steps":
      return title + s.items.map((x, i) => `${i + 1}. ${x}`).join("\n");
    case "cta":
      return `${title}[${s.label}](${s.url})`;
    default:
      return null;
  }
};

const shortName = (label: string) => label.split(":")[0].trim();

const rubricMd = (t: ProgramTrack) => {
  const r = t.rubric;
  const lines: string[] = [];
  const scale = r.criteria.every((c) => c.max === r.criteria[0].max) ? `each 0 to ${r.criteria[0].max}` : null;
  lines.push(`### ${t.label}: maximum ${maxScore(r)}${scale ? ` (${scale})` : ""}`, "");
  for (const c of r.criteria) {
    lines.push(`- **${c.label}** (0 to ${c.max})`);
    c.levels?.forEach((l, i) => lines.push(`  - ${i}: ${l}`));
  }
  lines.push("", "Each judge scores every criterion; a project's score is the average across its judges.");
  if (r.winnerGate) {
    const gate = r.criteria.find((c) => c.id === r.winnerGate?.criterionId);
    lines.push("", `**Winner rule:** a project whose average ${gate ? shortName(gate.label) : r.winnerGate.criterionId} score is ${r.winnerGate.maxAvg} can't win.`);
  }
  if (r.tieBreaks.length) lines.push("", `**Tie-break:** ${r.tieBreaks.map((x) => x.label).join(", then ")}.`);
  if (r.criteria.some((c) => c.isBonus)) lines.push("", NOT_SCORED);
  return lines.join("\n");
};

const devResourcesMd = () => {
  const z = ZCASH;
  const b = BITREFILL;
  return [
    "## Zcash developer resources",
    "",
    z.intro,
    "",
    "### Know this first",
    "",
    ...z.knowFirst.map((k) => `- ${k}`),
    "",
    "### Pick your stack",
    "",
    "| Building | Start with | Note |",
    "| --- | --- | --- |",
    ...z.stack.map((s) => `| ${s.building} | ${s.start.map((x) => mdLink(x)).join(" + ")} | ${s.note ?? ""} |`),
    "",
    z.stackNote,
    "",
    "### Where to run your app",
    "",
    `1. **On your laptop (start here).** ${mdLink(z.local.tool, false)} ${z.local.text}`,
    `2. **On public testnet (before you demo).** Connect your app to \`${z.testnet.server}\`. Get test coins (TAZ) from a faucet: ${z.testnet.faucets.map((x) => mdLink(x)).join(", ")}; at the hack, any mentor can send you more. Check your transactions in an explorer: ${z.testnet.explorers.map((x) => mdLink(x, false)).join(" or ")}.`,
    "",
    "### Taking payments",
    "",
    ...z.payments.map((p, i) => `${i + 1}. ${p}`),
    "",
    `Don't want to build this yourself? ${mdLink(z.cipherpay)} does all three.`,
    "",
    "### More tools",
    "",
    "| Need | Tool | Note |",
    "| --- | --- | --- |",
    ...z.more.map((m) => `| ${m.need} | ${m.tools.map((x) => mdLink(x)).join(", ")} | ${m.note ?? ""} |`),
    "",
    z.moreNote,
    "",
    "### Learn",
    "",
    ...z.learn.map((x) => `- ${mdLink(x)}`),
    "",
    "### Getting help",
    "",
    ...z.help.map((x) => `- ${mdLink(x, false)}`),
    "",
    "## Bitrefill developer resources",
    "",
    b.intro,
    "",
    "### Know this first",
    "",
    ...b.knowFirst.map((k) => `- ${k}`),
    "",
    "### Pick your surface",
    "",
    "| Surface | Get started | Best for |",
    "| --- | --- | --- |",
    ...b.surfaces.map((s) => `| ${mdLink(s.surface, false)} | ${s.start} | ${s.bestFor} |`),
    "",
    `Building your own agent or MCP client: ${mdLink(b.agentGuide, false)}. Bitrefill's own docs index: ${mdLink(b.docsIndex, false)}.`,
    "",
    "### Test without spending",
    "",
    ...b.testing.map((t) => `- ${t}`),
    "",
    `**Help:** ${b.help}`,
  ].join("\n");
};

const ideaChecklist = (p: LlmsProgram) => {
  const profile = getProgramProfile(p.slug);
  const themes = profile?.themes.map((t) => t.replace(/^\d+\.\s*/, "")).join("; ") ?? "";
  return [
    "## How to come up with a valid idea",
    "",
    "Use this checklist when proposing or reviewing an idea. An idea that fails a **must** is not eligible.",
    "",
    "**Privacy (Zcash) track**",
    "",
    `- **Must** fit one of the three themes: ${themes}. Name the theme and the specific user ("For").`,
    "- **Must** run on Zcash **testnet with NU7**, using **shielded** funds via **unified addresses** (`utest1…`). No mainnet funds, no Zcash Shielded Assets, no Sprout, no v4 transactions, no zcashd wallet RPC.",
    "- **Must** produce **one real shielded testnet transaction** that you can submit as its 64-hex-character transaction ID.",
    "- **Must** be buildable during the hack (11:00 to the 00:00 IST deadline) with every step of the core flow working for real: a small project where everything works can score full marks on Works; a big one with a mocked step can't, and a Works score of 0 can't win.",
    "- **Should** have a clear privacy story you can write honestly in the privacy and trust note: what stays private, what leaks and to whom, who users must trust, what you'd fix next. Self-custody alone isn't a privacy design.",
    "- **Should** have evidence of need (users asked, a partner wants to pilot) and a concrete next step for the 30 days after: Needed and Continuing are scored, and they break ties.",
    "- **Should** be usable by its intended user unaided, in minutes (Easy).",
    "- Polish, the number of features or technologies, and feedback are **not** scored.",
    "",
    "**Agentic Commerce (by Bitrefill) track**",
    "",
    "- **Must** use at least one Bitrefill surface: MCP, CLI, Agent Skills, x402 or the REST API.",
    "- **Must** show the **agent itself** completing a real purchase in the demo (not mocked), using **test products** (never real money or store credit).",
    "- Directions for inspiration: it pays for itself (no human checkout); works while you sleep (event, schedule or rule triggers); shop from chat. Crypto payments and products relevant to India are encouraged.",
    "",
    "**Both tracks:** an agent that pays privately with shielded ZEC can enter both; it must meet every requirement of both tracks.",
  ].join("\n");
};

const FORM_FIELDS = [
  "## The submission form, field by field",
  "",
  "One submission per Luma email. Updating it later needs that email verified with a sign-in link.",
  "",
  "| Field | Privacy | Agentic Commerce | Both |",
  "| --- | --- | --- | --- |",
  "| Your name, Luma email (point person; prizes go to them) | required | required | required |",
  "| Project title; short description (max 500 characters) | required | required | required |",
  "| Demo video link | optional, strongly preferred (2 min max; judges watch the first 2 minutes) | required (3 min max, or a live link showing the agent make a purchase) | required |",
  "| Public repo with a README (every technology used, design decisions; for Agentic also the demo URL) | required | required | required |",
  "| Track; themes (one or more of the three) | required | track only | required |",
  "| One-line pitch: what it does and for whom (max 140 characters) | required | required | required |",
  "| Teammates (name, email, role), up to 5; option to stay anonymous publicly | optional | optional | optional |",
  "| What is it: web app, mobile app, SDK or library, CLI, agent, other | required | required | required |",
  "| Public URL where judges can try it | required for apps | required for apps | required for apps |",
  "| Technologies used | required | required | required |",
  "| One shielded testnet transaction ID (64 hex characters) | required | no | required |",
  "| Privacy and trust note (max 3000 characters) | required | no | required |",
  "| Your next 30-day milestone for continuing the project, and links to anything already started | required | required | required |",
  "| Bitrefill feedback: what worked, what didn't (each max 2000 characters; not public) | no | required | required |",
  "| Feedback for the ecosystem teams: what slowed you down (free text, max 2000) | optional, not scored | optional | optional |",
  "| Agree to the submission terms | required | required | required |",
].join("\n");

const NOT_SCORED =
  "**Bonus (+1):** something exceptional the five criteria don't capture, such as an original technical contribution or a reusable piece for the ecosystem. **Not scored:** number of features or technologies, polish, feedback notes. **Name your gaps:** saying what's missing or still leaks doesn't cost points; hiding it does.";

/** The short index file (llmstxt.org format). */
export function renderLlmsTxt(p: LlmsProgram, origin: string): string {
  const page = `${origin}/programs/${p.slug}`;
  return [
    `# ${p.name}`,
    "",
    `> ${p.summary} When: ${p.when}. Where: ${p.where}. Submissions close ${p.deadline}.`,
    "",
    "Use these files to help a builder: propose ideas that fit a theme and the rules, check a submission against exactly what each track requires and how it is judged, and pick the right tools from the developer resources. Prefer llms-full.txt: it has everything inline. Don't invent requirements that are not listed there.",
    "",
    "## Docs",
    "",
    `- [Everything in one file](${origin}${llmsFullPath(p.slug)}): tracks, themes, rules, how to come up with a valid idea, the submission form field by field, the privacy and trust note, judging rubrics with every score level, prizes, and the Zcash and Bitrefill developer resources`,
    `- [Program page](${page}): the live page, schedule, and the submit form`,
    `- [Builder Pack](${p.builderPackUrl}): the organisers' full guide`,
    ...(getProgramProfile(p.slug)?.tracks.map((t) => t.rubric.guideUrl).filter(Boolean).map((u) => `- [Privacy judging guide](${u}): how judges score Privacy projects`) ?? []),
    `- [Register on Luma](${p.lumaUrl}): only checked-in builders can submit, with their Luma email`,
    "",
    "## Developer resources",
    "",
    `- ${mdLink(ZCASH.local.tool, false)}: a local Zcash network with NU7 and its own faucet`,
    `- ${mdLink(ZCASH.learn[0], false)}: the curated map of Zcash docs, SDKs and nodes`,
    "- [ZIP 321 payment URIs](https://zips.z.cash/zip-0321), [ZIP 316 unified addresses](https://zips.z.cash/zip-0316), [ZIP 317 fees](https://zips.z.cash/zip-0317)",
    `- ${mdLink(BITREFILL.surfaces[1].surface, false)}: Bitrefill's MCP server for agents`,
    `- ${mdLink(BITREFILL.docsIndex, false)}: Bitrefill's own docs index`,
    "",
    "## Optional",
    "",
    `- [Stadium](${origin}/llms.txt): other programs`,
    "",
  ].join("\n");
}

/** Everything inline, for an assistant to read in one go. */
export function renderLlmsFullTxt(p: LlmsProgram, origin: string): string {
  const profile = getProgramProfile(p.slug);
  const sections = p.content
    .filter((s) => !("title" in s && s.title && SKIP_IN_FULL.has(s.title)))
    .map((s) => sectionMd(s, origin))
    .filter((x): x is string => !!x);
  return [
    `# ${p.name}: everything for builders and their AI assistants`,
    "",
    `> ${p.summary}`,
    "",
    "How to use this file: it is the complete, current brief. Use it to (1) propose ideas that fit a theme and pass the checklist below, (2) check a submission against the form, field by field, and the judging rubric, and (3) choose tools from the developer resources. Everything a builder must do is written here; if something isn't here, it isn't required. Times are IST (UTC+5:30).",
    "",
    "## Event",
    "",
    `- **When:** ${p.when}`,
    `- **Where:** ${p.where}${profile?.venueMapUrl ? `. Map: ${profile.venueMapUrl}` : ""}`,
    `- **Submissions close:** ${p.deadline}, on Stadium: ${origin}/programs/${p.slug}`,
    `- **Who can submit:** builders checked in at the venue, using the email they registered with on Luma (${p.lumaUrl})`,
    `- **Builder Pack:** ${p.builderPackUrl}`,
    "",
    ...sections.flatMap((s) => [s, ""]),
    ideaChecklist(p),
    "",
    FORM_FIELDS,
    "",
    "## How it's judged",
    "",
    ...(profile?.tracks.flatMap((t) => [rubricMd(t), ""]) ?? []),
    devResourcesMd(),
    "",
  ].join("\n");
}

/** The site-wide index at /llms.txt. */
export function renderRootLlmsTxt(origin: string): string {
  return [
    "# Stadium",
    "",
    "> Stadium is the web app for WebZero's hackathons and incubator programs: program pages, project submissions, live judging and results.",
    "",
    "Programs with a builder brief for AI assistants (tracks, rules, what to submit, judging, developer resources):",
    "",
    "## Programs",
    "",
    ...LLMS_PROGRAMS.map(
      (p) => `- [${p.name}](${origin}${llmsPath(p.slug)}): ${p.when.split(",")[0]}, ${p.where.split(" (")[0]}. Full brief: ${origin}${llmsFullPath(p.slug)}`,
    ),
    "",
  ].join("\n");
}

/** Every generated file: published path → contents. */
export function llmsFiles(origin: string): Record<string, string> {
  const files: Record<string, string> = { "llms.txt": renderRootLlmsTxt(origin) };
  for (const p of LLMS_PROGRAMS) {
    files[llmsPath(p.slug).slice(1)] = renderLlmsTxt(p, origin);
    files[llmsFullPath(p.slug).slice(1)] = renderLlmsFullTxt(p, origin);
  }
  return files;
}
