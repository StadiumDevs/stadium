/**
 * Which programs publish an llms.txt, and where. Small on purpose: the pages
 * import this, not the renderer.
 *
 * Each program has a generated index (llms.txt, by renderLlms.ts) and one
 * hand-written brief per track, kept in ./programs/<slug>/llms-<id>.txt and
 * served at /programs/<slug>/llms-<id>.txt by the plugin in vite.config.ts.
 */
export const LLMS_SLUGS = ["free-society-hack-2026"] as const;

export type LlmsTrackFile = {
  /** File id: the brief is llms-<id>.txt. */
  id: string;
  /** Who it's for, e.g. "Privacy track (Zcash)". */
  label: string;
  /** Short button label. */
  short: string;
  /** One line on what it covers, for the index. */
  about: string;
};

export const LLMS_TRACK_FILES: Record<string, LlmsTrackFile[]> = {
  "free-society-hack-2026": [
    {
      id: "zcash",
      label: "Privacy track (Zcash)",
      short: "ZCASH",
      about:
        "network facts that override older training data, testnet endpoints, the SDK for each job, themes, rules, the submission checklist and how the track is judged",
    },
    {
      id: "bitrefill",
      label: "Agentic Commerce track (Bitrefill)",
      short: "BITREFILL",
      about: "the brief, hour one, the stack, gotchas, the India catalog, rules, the submission checklist and how the track is judged",
    },
  ],
};

export const hasLlms = (slug?: string | null) => !!slug && (LLMS_SLUGS as readonly string[]).includes(slug);
export const llmsPath = (slug: string) => `/programs/${slug}/llms.txt`;
export const llmsTrackFiles = (slug: string): LlmsTrackFile[] => LLMS_TRACK_FILES[slug] ?? [];
export const llmsTrackPath = (slug: string, id: string) => `/programs/${slug}/llms-${id}.txt`;
/** Where a track brief's source lives, relative to client/src/lib/llms. */
export const llmsTrackSource = (slug: string, id: string) => `programs/${slug}/llms-${id}.txt`;
