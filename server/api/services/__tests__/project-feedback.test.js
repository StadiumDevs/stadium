// Judges' feedback fixture: converter round-trip, content rules, matching to
// submissions, and the public endpoints (only after results are published).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';
import { convertProjectFeedback, projectFeedbackJson } from '../../../scripts/convert-project-feedback.js';
import { loadProjectFeedback, feedbackBySubmission, projectFeedbackChecks } from '../project-feedback.service.js';
import { PROGRAM_STATS } from '../../constants/programStats.js';
import * as client from '../../../../client/src/lib/projectFeedback.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const SLUG = 'free-society-hack-2026';
const DIR = path.resolve(here, '../../../fixtures', SLUG, 'project-feedback');
const md = fs.readFileSync(path.join(DIR, 'v1.0.1.md'), 'utf8');
const fb = loadProjectFeedback(SLUG, PROGRAM_STATS[SLUG].projectFeedback);
const sub = (id, projectTitle, githubUrl, track = 'privacy') => ({ id, projectTitle, githubUrl, prizes: {}, details: { track } });

describe('judges feedback fixture', () => {
  it('the committed JSON is exactly the converter output of the committed markdown', () => {
    expect(fs.readFileSync(path.join(DIR, 'v1.0.1.json'), 'utf8')).toBe(projectFeedbackJson(md));
  });

  it('48 projects, version 1.0.1, every one with a summary and something to improve', () => {
    expect(fb.version.version).toBe('1.0.1');
    expect(fb.projects).toHaveLength(48);
    for (const p of fb.projects) {
      expect(p.summary.length).toBeGreaterThan(10);
      expect(p.improve.length).toBeGreaterThan(0);
    }
    expect(fb.projects.filter((p) => p.basis === 'scores only')).toHaveLength(6);
  });

  it('prizes corrected to the awarded ones (Zec Start third, Mirage second)', () => {
    const p = (t) => fb.projects.find((x) => x.title === t);
    expect(p('Zec Start').prize).toBe('Privacy: third prize (200 USDC)');
    expect(p('Zec Start').summary.startsWith('Third prize.')).toBe(true);
    expect(p('Mirage').prize).toBe('Privacy: second prize (300 USDC)');
  });

  it('no emails, no named judges, no judge counts in the published text', () => {
    const text = JSON.stringify(fb.projects);
    expect(text).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(text).not.toMatch(/\bJudge [A-Z]\b|Judges: \d/);
  });

  it('refuses a file with a missing section or an email in it', () => {
    expect(() => convertProjectFeedback(md.replace(/\n### Zool\n/, '\n'))).toThrow(/Expected 48 projects|no "… · Basis/);
    expect(() => convertProjectFeedback(md.replace('Third prize. A judge saw', 'Third prize. Mail x@y.io. A judge saw'))).toThrow(/email/);
  });
});

describe('matching to submissions', () => {
  it('every row matches its submission by repo (case, .git and / normalised), Obscura by title', () => {
    const subs = fb.projects.map((p, i) => sub(`s${i}`, p.title, p.repo ? `${p.repo.toUpperCase().replace(/\.git$/, '')}/` : null));
    const map = feedbackBySubmission(fb, subs);
    expect(map.size).toBe(48);
    const checks = projectFeedbackChecks(fb, subs);
    expect(checks).toMatchObject({ total: 48, matched: 48, unmatched: [], ambiguous: [] });
    expect(checks.byTitle).toBe(1);
  });

  it('agentic-only submissions are ignored; unmatched rows get no feedback', () => {
    const zeno = fb.projects.find((p) => p.title === 'Zeno Wallet');
    const map = feedbackBySubmission(fb, [sub('z', 'Zeno Wallet', zeno.repo, 'agentic')]);
    expect(map.size).toBe(0);
  });

  it('the payload carries the text and version only', () => {
    const zeno = fb.projects.find((p) => p.title === 'Zeno Wallet');
    const got = feedbackBySubmission(fb, [sub('z', 'Zeno Wallet', zeno.repo)]).get('z');
    expect(Object.keys(got).sort()).toEqual(['about', 'basis', 'facts', 'generatedBy', 'generatedDate', 'improve', 'summary', 'version', 'worked']);
    expect(got.version).toBe('1.0.1');
    // The "AI-generated" popup: facts from the fixture's version block, nothing about normalization.
    expect(got.about).toEqual({
      model: 'claude-opus-5-5',
      generatedDate: '9 Nov 2026',
      projectCount: 48,
      projectsWithNotes: 42,
      notesCount: 72,
      factCheckSources: ['public git histories and READMEs', 'the Privacy Track Tech Review v1.0', "the event's Bitrefill developer docs", 'zips.z.cash'],
      version: '1.0.1',
      latestChange: 'Zec Start and Mirage prize lines corrected to match the awarded prizes (Zec Start: third prize; Mirage: second prize).',
    });
    expect(JSON.stringify(got.about).toLowerCase()).not.toContain('normaliz');
  });

  it('client mirror gives the same result', () => {
    const subs = fb.projects.map((p, i) => sub(`s${i}`, p.title, p.repo));
    expect([...client.feedbackBySubmission(fb, subs).entries()]).toEqual([...feedbackBySubmission(fb, subs).entries()]);
  });
});
