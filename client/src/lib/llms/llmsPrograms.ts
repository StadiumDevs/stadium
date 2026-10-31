/**
 * Which programs publish an llms.txt (generated at build by renderLlms.ts),
 * and where. Small on purpose: the pages import this, not the renderer.
 */
export const LLMS_SLUGS = ["free-society-hack-2026"] as const;

export const hasLlms = (slug?: string | null) => !!slug && (LLMS_SLUGS as readonly string[]).includes(slug);
export const llmsPath = (slug: string) => `/programs/${slug}/llms.txt`;
export const llmsFullPath = (slug: string) => `/programs/${slug}/llms-full.txt`;
