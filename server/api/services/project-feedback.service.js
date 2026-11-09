// Judges' feedback per project, AI-written in a Claude session from the
// normalized scores and the judges' anonymised notes, fact-checked, and shipped
// as a versioned fixture (server/fixtures/<slug>/project-feedback/v<version>.json,
// generated from the markdown next to it by scripts/convert-project-feedback.js).
// Stadium only reads it: rows match submissions by repo URL, then exact title.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { matchReviewRows, privacyReviewChecks } from './privacy-review.service.js';

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures');
const cache = new Map();

/** The feedback fixture for a program and version, or null when the config has none. */
export function loadProjectFeedback(slug, config, root = FIXTURES) {
  if (!config?.version) return null;
  const file = path.join(root, slug, 'project-feedback', `v${config.version}.json`);
  if (!cache.has(file)) cache.set(file, JSON.parse(fs.readFileSync(file, 'utf8')));
  return cache.get(file);
}

// Same matching as the privacy track review (repo URL, then exact title; privacy/both only).
const asReview = (fb) => ({
  version: fb.version,
  projects: fb.projects.map((p) => ({ shortName: p.title, title: p.title, repo: p.repo })),
});

/** submissionId → the public feedback payload, for rows that matched exactly one submission. */
export function feedbackBySubmission(fb, submissions) {
  const out = new Map();
  if (!fb) return out;
  const byTitle = new Map(fb.projects.map((p) => [p.title, p]));
  for (const m of matchReviewRows(asReview(fb), submissions)) {
    if (m.status !== 'matched') continue;
    const p = byTitle.get(m.shortName);
    out.set(m.submissionId, {
      summary: p.summary,
      worked: p.worked,
      improve: p.improve,
      facts: p.facts,
      basis: p.basis,
      version: fb.version.version,
      generatedDate: fb.version.generatedDate,
      generatedBy: fb.version.generatedBy,
    });
  }
  return out;
}

/** Admin checks: feedback rows that matched no submission, or more than one. */
export const projectFeedbackChecks = (fb, submissions) => (fb ? privacyReviewChecks(asReview(fb), submissions) : null);
