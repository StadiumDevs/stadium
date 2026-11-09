// Playground only: the privacy track tech review fixtures, read straight from
// server/fixtures so the mock and the server use the same file. Loaded lazily
// (one chunk per version), so production bundles never include them.
import type { PrivacyReviewData } from "../privacyReview";

const FIXTURES = import.meta.glob<PrivacyReviewData>("../../../../server/fixtures/*/privacy-track-review/v*.json", { import: "default" });

/** The fixture the program's stats config points to, or null. */
export async function loadMockPrivacyReview(slug: string, config: { version: string } | undefined): Promise<PrivacyReviewData | null> {
  if (!config?.version) return null;
  const load = FIXTURES[`../../../../server/fixtures/${slug}/privacy-track-review/v${config.version}.json`];
  if (!load) throw new Error(`No privacy track review v${config.version} fixture for ${slug}`);
  return load();
}
