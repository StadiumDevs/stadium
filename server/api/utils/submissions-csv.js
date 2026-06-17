import { csvCell, csvRow } from './csv.js';

// Keep in sync with FEEDBACK_STRING_KEYS in submission.validator.js.
const FEEDBACK_KEYS = ['agentEnv', 'deadlineStatus', 'biggestBlocker', 'couldntHandle', 'wouldKeepBuilding'];

const HEADER = [
  'submittedAt',
  'submitterName',
  'lumaEmail',
  'projectTitle',
  'projectBrief',
  'videoUrl',
  'githubUrl',
  'late',
  'agreedToTermsAt',
  'surfaces',
  'surfacesPrimary',
  ...FEEDBACK_KEYS,
];

// Flatten program submissions (including the post-submit feedback survey) to a
// CSV an admin/judge can download. Every cell routes through csvCell, which adds
// the formula-injection guard required for any user-submitted content.
export function submissionsToCsv(submissions, { programSlug } = {}) {
  const lines = [HEADER.map(csvCell).join(',')];
  for (const s of submissions || []) {
    const fb = s.feedback && typeof s.feedback === 'object' ? s.feedback : {};
    const surfaces = Array.isArray(fb.surfaces) ? fb.surfaces.join('; ') : '';
    lines.push(
      csvRow([
        s.createdAt,
        s.submitterName,
        s.lumaEmail,
        s.projectTitle,
        s.projectBrief,
        s.videoUrl,
        s.githubUrl,
        s.late ? 'yes' : 'no',
        s.agreedToTermsAt,
        surfaces,
        fb.surfacesPrimary ?? '',
        ...FEEDBACK_KEYS.map((k) => fb[k] ?? ''),
      ]),
    );
  }
  // Self-identifying trailing comment (not parsed as a row by spreadsheets).
  if (programSlug) lines.push(`# program=${programSlug}, exported=${new Date().toISOString()}`);
  return lines.join('\n') + '\n';
}
