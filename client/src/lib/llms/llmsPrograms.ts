/**
 * Which programs publish llms.txt files for AI coding agents, and where. Small
 * on purpose: the pages import this, not the renderer.
 *
 * Each program has a hand-written index (/programs/<slug>/llms.txt) and one
 * self-contained brief per track (/programs/<slug>/<track>/llms.txt). Sources
 * live in ./programs/<slug>/ at the same relative paths, with {{ORIGIN}} for
 * the site origin; the plugin in vite.config.ts serves and emits them.
 */
export const LLMS_SLUGS = ["free-society-hack-2026"] as const;

export type LlmsTrackFile = {
  /** URL segment: the brief is /programs/<slug>/<id>/llms.txt. */
  id: string;
  /** Who it's for, e.g. "Privacy track (Zcash)". */
  label: string;
  /** Short button label. */
  short: string;
  /** What to paste into a coding agent ({url} = the brief's URL). Mirrors the index's "Start" section. */
  prompt: string;
};

export const LLMS_TRACK_FILES: Record<string, LlmsTrackFile[]> = {
  "free-society-hack-2026": [
    {
      id: "privacy",
      label: "Privacy track (Zcash)",
      short: "PRIVACY",
      prompt:
        "Read {url}, save it as AGENTS.md in a new repo, then scaffold the smallest version of my idea that makes one real shielded testnet payment.",
    },
    {
      id: "agentic-commerce",
      label: "Agentic Commerce track (Bitrefill)",
      short: "AGENTIC COMMERCE",
      prompt:
        "Read {url}, save it as AGENTS.md in a new repo, then scaffold the smallest version of my idea with a spend cap before any purchase.",
    },
  ],
};

export const hasLlms = (slug?: string | null) => !!slug && (LLMS_SLUGS as readonly string[]).includes(slug);
/** The program's index (pick a track, start prompts, key times). */
export const llmsPath = (slug: string) => `/programs/${slug}/llms.txt`;
export const llmsTrackFiles = (slug: string): LlmsTrackFile[] => LLMS_TRACK_FILES[slug] ?? [];
export const llmsTrackPath = (slug: string, id: string) => `/programs/${slug}/${id}/llms.txt`;
/** The agent prompt for a track, with the brief's absolute URL filled in. */
export const llmsTrackPrompt = (t: LlmsTrackFile, origin: string, slug: string) =>
  t.prompt.replace("{url}", `${origin}${llmsTrackPath(slug, t.id)}`);
/** Source files to publish, relative to client/src/lib/llms (index first). */
export const llmsSources = (slug: string): { source: string; path: string }[] => [
  { source: `programs/${slug}/llms.txt`, path: llmsPath(slug) },
  ...llmsTrackFiles(slug).map((t) => ({ source: `programs/${slug}/${t.id}/llms.txt`, path: llmsTrackPath(slug, t.id) })),
];
