/**
 * The llms.txt files (https://llmstxt.org) for AI coding agents. Each program's
 * index and per-track briefs are hand-written in ./programs/<slug>/ (paths in
 * llmsPrograms.ts); the plugin in vite.config.ts reads them and passes them in.
 * This file fills in the site origin ({{ORIGIN}}) and builds the site-wide
 * /llms.txt that lists every program and its briefs.
 *
 * Pure functions, relative imports only (bundled by the Vite config loader).
 */
import { FREE_SOCIETY_HACK_BUILDER_PACK_URL } from "../freeSocietyHackContent";
import { llmsPath, llmsSources, llmsTrackFiles, llmsTrackPath } from "./llmsPrograms";

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
    when: "Wed 4 Nov 2026, 11:00 IST (hack starts) to Thu 5 Nov 2026 (top teams announced 11:00, demos 11:45, prizes 13:00 IST)",
    where: "True Tramm Trunk, BKC, Mumbai (in person)",
    deadline: "Thu 5 Nov 2026, 00:00 IST",
    lumaUrl: "https://luma.com/freesocietyhackathon",
    builderPackUrl: FREE_SOCIETY_HACK_BUILDER_PACK_URL,
  },
];

/** The site-wide index at /llms.txt. */
export function renderRootLlmsTxt(origin: string): string {
  return [
    "# Stadium",
    "",
    "> Stadium is the web app for WebZero's hackathons and incubator programs: program pages, project submissions, live judging and results.",
    "",
    "Programs with briefs for AI coding agents. Load the program index, then only the track brief you need: each one is self-contained.",
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

/** Every hand-written source this build needs, relative to client/src/lib/llms. */
export const llmsTrackSources = (): string[] => LLMS_PROGRAMS.flatMap((p) => llmsSources(p.slug).map((x) => x.source));

/** A hand-written file with its {{ORIGIN}} placeholders filled in. */
export const renderTrackBrief = (source: string, origin: string) => source.split("{{ORIGIN}}").join(origin);

/**
 * Every published file: path → contents. `sources` maps a source path (from
 * llmsTrackSources) to its text; a missing file fails loudly so a build never
 * ships a dead link.
 */
export function llmsFiles(origin: string, sources: Record<string, string>): Record<string, string> {
  const files: Record<string, string> = { "llms.txt": renderRootLlmsTxt(origin) };
  for (const p of LLMS_PROGRAMS) {
    for (const { source, path } of llmsSources(p.slug)) {
      const text = sources[source];
      if (text == null) throw new Error(`llms: missing ${source}`);
      files[path.slice(1)] = renderTrackBrief(text, origin);
    }
  }
  return files;
}
