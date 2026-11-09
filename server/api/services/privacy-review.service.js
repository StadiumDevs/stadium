// The privacy track tech review section of the stats page. The data is a
// versioned fixture (server/fixtures/<slug>/privacy-track-review/v<version>.json,
// generated from the markdown next to it by scripts/convert-privacy-review.js);
// the program's stats config says which version to read. Stadium never
// re-analyses repos: this file only matches the review's rows to submissions.
//
// Mirrored by client/src/lib/privacyReview.ts (the playground);
// program-stats-parity.test.js checks both agree.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures');

const cache = new Map();

/** The review fixture for a program and version, or null when the config has none. */
export function loadPrivacyReview(slug, reviewConfig, root = FIXTURES) {
  if (!reviewConfig?.version) return null;
  const file = path.join(root, slug, 'privacy-track-review', `v${reviewConfig.version}.json`);
  if (!cache.has(file)) cache.set(file, JSON.parse(fs.readFileSync(file, 'utf8')));
  return cache.get(file);
}

/** Repo URLs compare without case, trailing slashes or a trailing .git. */
export const normalizeRepo = (url) =>
  typeof url === 'string' && url.trim()
    ? url
        .trim()
        .toLowerCase()
        .replace(/\/+$/, '')
        .replace(/\.git$/, '')
        .replace(/\/+$/, '')
    : null;

const REVIEW_TRACKS = ['privacy', 'both'];
const hasPrize = (s) => Object.keys(s.prizes ?? {}).length > 0;

/**
 * Each review row matched to a submission: by repo URL first, then by exact
 * title. Agentic Commerce-only submissions are ignored. A submission claimed by
 * more than one row makes those rows ambiguous too.
 */
export function matchReviewRows(review, submissions) {
  const pool = submissions.filter((s) => REVIEW_TRACKS.includes(s.details?.track));
  const rows = review.projects.map((p) => {
    const repo = normalizeRepo(p.repo);
    const byRepo = repo ? pool.filter((s) => normalizeRepo(s.githubUrl) === repo) : [];
    if (byRepo.length === 1) return { shortName: p.shortName, status: 'matched', by: 'repo', submissionId: byRepo[0].id, candidates: [] };
    if (byRepo.length > 1) return { shortName: p.shortName, status: 'ambiguous', by: 'repo', submissionId: null, candidates: byRepo.map((s) => s.projectTitle) };
    const byTitle = pool.filter((s) => String(s.projectTitle ?? '').trim() === p.title.trim());
    if (byTitle.length === 1) return { shortName: p.shortName, status: 'matched', by: 'title', submissionId: byTitle[0].id, candidates: [] };
    if (byTitle.length > 1) return { shortName: p.shortName, status: 'ambiguous', by: 'title', submissionId: null, candidates: byTitle.map((s) => s.projectTitle) };
    return { shortName: p.shortName, status: 'unmatched', by: null, submissionId: null, candidates: [] };
  });
  const claims = new Map();
  for (const r of rows) if (r.submissionId) claims.set(r.submissionId, [...(claims.get(r.submissionId) ?? []), r.shortName]);
  const byId = new Map(pool.map((s) => [s.id, s]));
  return rows.map((r) => {
    const shared = r.submissionId ? claims.get(r.submissionId) : null;
    if (shared && shared.length > 1) {
      return { ...r, status: 'ambiguous', submissionId: null, candidates: [`${byId.get(r.submissionId).projectTitle} (also matched by ${shared.filter((n) => n !== r.shortName).join(', ')})`] };
    }
    return r;
  });
}

/**
 * The review as published: the fixture plus, per short name, the project the
 * page lists. Names link only when the row matched exactly one submission and
 * that project has a public page (prize winners).
 */
export function buildPrivacyReview(review, submissions) {
  if (!review) return null;
  const byId = new Map(submissions.map((s) => [s.id, s]));
  const refs = {};
  for (const m of matchReviewRows(review, submissions)) {
    const p = review.projects.find((x) => x.shortName === m.shortName);
    const s = m.submissionId ? byId.get(m.submissionId) : null;
    refs[m.shortName] = {
      id: s ? s.id : `review:${m.shortName}`,
      title: m.shortName,
      track: s?.details?.track ?? p.track,
      linkable: !!s && hasPrize(s),
    };
  }
  return { ...review, refs };
}

/** Admin preview only: rows that matched nothing or more than one submission. */
export function privacyReviewChecks(review, submissions) {
  if (!review) return null;
  const rows = matchReviewRows(review, submissions);
  const info = (r) => {
    const p = review.projects.find((x) => x.shortName === r.shortName);
    return { shortName: r.shortName, title: p.title, repo: p.repo, candidates: r.candidates };
  };
  return {
    version: review.version.version,
    total: rows.length,
    matched: rows.filter((r) => r.status === 'matched').length,
    byRepo: rows.filter((r) => r.status === 'matched' && r.by === 'repo').length,
    byTitle: rows.filter((r) => r.status === 'matched' && r.by === 'title').length,
    unmatched: rows.filter((r) => r.status === 'unmatched').map(info),
    ambiguous: rows.filter((r) => r.status === 'ambiguous').map(info),
  };
}
