/**
 * Builds the llms.txt files (https://llmstxt.org) for programs with a profile,
 * so an AI assistant can help a builder pick a valid idea, check a submission
 * against the requirements and choose tools. Generated at build time by the
 * plugin in vite.config.ts from the same sources the site uses: the program's
 * page content, its profile (tracks, themes, rubric) and the developer
 * resources. The per-track briefs (llms-zcash.txt, llms-bitrefill.txt) are
 * hand-written files in ./programs/<slug>/; the Vite plugin reads them and
 * passes them in, and this file only fills in the site origin.
 *
 * Pure functions, relative imports only (bundled by the Vite config loader).
 */
import { FREE_SOCIETY_HACK_BUILDER_PACK_URL } from "../freeSocietyHackContent";
import { getProgramProfile } from "../programProfiles";
import { BITREFILL, mdLink, ZCASH } from "./devResources";
import { llmsPath, llmsTrackFiles, llmsTrackPath, llmsTrackSource } from "./llmsPrograms";

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
  },
];

export { llmsPath, llmsTrackPath };

/** The short index file (llmstxt.org format). */
export function renderLlmsTxt(p: LlmsProgram, origin: string): string {
  const page = `${origin}/programs/${p.slug}`;
  const tracks = llmsTrackFiles(p.slug);
  return [
    `# ${p.name}`,
    "",
    `> ${p.summary} When: ${p.when}. Where: ${p.where}. Submissions close ${p.deadline}.`,
    "",
    "Use these files to help a builder: propose ideas that fit the track and its rules, check a submission against exactly what the track requires and how it is judged, and pick the right tools. Read the brief for the builder's track; for a project entering both tracks, read both. Don't invent requirements that are not listed there.",
    "",
    "## Docs",
    "",
    ...tracks.map((t) => `- [${t.label}](${origin}${llmsTrackPath(p.slug, t.id)}): ${t.about}`),
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
    ...LLMS_PROGRAMS.flatMap((p) => [
      `- [${p.name}](${origin}${llmsPath(p.slug)}): ${p.when.split(",")[0]}, ${p.where.split(" (")[0]}`,
      ...llmsTrackFiles(p.slug).map((t) => `  - [${t.label}](${origin}${llmsTrackPath(p.slug, t.id)})`),
    ]),
    "",
  ].join("\n");
}

/**
 * The hand-written track briefs this build needs, as source paths relative to
 * client/src/lib/llms. The Vite plugin reads them and passes them back in.
 */
export const llmsTrackSources = (): string[] =>
  LLMS_PROGRAMS.flatMap((p) => llmsTrackFiles(p.slug).map((t) => llmsTrackSource(p.slug, t.id)));

/** A track brief with its {{ORIGIN}} placeholders filled in. */
export const renderTrackBrief = (source: string, origin: string) => source.split("{{ORIGIN}}").join(origin);

/**
 * Every published file: path → contents. `sources` maps a track brief's source
 * path (from llmsTrackSources) to its text; a missing brief fails loudly so a
 * build never ships a dead link.
 */
export function llmsFiles(origin: string, sources: Record<string, string>): Record<string, string> {
  const files: Record<string, string> = { "llms.txt": renderRootLlmsTxt(origin) };
  for (const p of LLMS_PROGRAMS) {
    files[llmsPath(p.slug).slice(1)] = renderLlmsTxt(p, origin);
    for (const t of llmsTrackFiles(p.slug)) {
      const src = sources[llmsTrackSource(p.slug, t.id)];
      if (src == null) throw new Error(`llms: missing track brief ${llmsTrackSource(p.slug, t.id)}`);
      files[llmsTrackPath(p.slug, t.id).slice(1)] = renderTrackBrief(src, origin);
    }
  }
  return files;
}
