// Playground only: the judges' feedback fixtures, read straight from
// server/fixtures (lazy, one chunk per version; never in production bundles).
import type { ProjectFeedbackData } from "../projectFeedback";

const FIXTURES = import.meta.glob<ProjectFeedbackData>("../../../../server/fixtures/*/project-feedback/v*.json", { import: "default" });

export async function loadMockProjectFeedback(slug: string, config: { version: string } | undefined): Promise<ProjectFeedbackData | null> {
  if (!config?.version) return null;
  const load = FIXTURES[`../../../../server/fixtures/${slug}/project-feedback/v${config.version}.json`];
  return load ? load() : null;
}
