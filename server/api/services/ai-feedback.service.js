// AI feedback for a project page: a short summary, strengths and possible
// improvements, written by Claude from the project's normalized judge scores
// and the judges' individual notes (anonymized). Generated on a platform
// admin's request, stored as a draft, and only public once an admin publishes
// it. Judges are never named or quoted.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';

export const AI_FEEDBACK_MODEL = process.env.AI_FEEDBACK_MODEL || 'claude-opus-5-5';

/** The rubric questions (mirrors the labels in client/src/lib/programProfiles.ts). */
const CRITERION_QUESTIONS = {
  works: 'Works: how much of the demonstrated core flow is real?',
  private: 'Private: does it protect information appropriately?',
  easy: 'Easy: can its intended user use it?',
  needed: 'Needed: is there evidence of a real need?',
  continuing: 'Continuing: is the builder moving it forward?',
  bonus: 'Bonus',
  requirements: 'Requirements',
  techStack: 'Tech stack',
  innovation: 'Innovation',
};

export const FeedbackSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});

const MAX_ITEMS = 3;
const MAX_LEN = { summary: 600, item: 300 };

/** Trim, drop empties, cap lengths and counts. Throws on an unusable result. */
export function cleanFeedback(f) {
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const list = (xs) => (Array.isArray(xs) ? xs.map((x) => str(x, MAX_LEN.item)).filter(Boolean).slice(0, MAX_ITEMS) : []);
  const out = { summary: str(f?.summary, MAX_LEN.summary), strengths: list(f?.strengths), improvements: list(f?.improvements) };
  if (!out.summary) throw new Error('Feedback needs a summary');
  return out;
}

const SYSTEM = `You write short, constructive feedback for hackathon builders about their submitted project.
You are given the project's description, its judge scores per rubric criterion (normalized averages across all judges, each with the track average for comparison), and the judges' individual notes.

Write:
- summary: two or three sentences on how the judges saw the project overall.
- strengths: one to three specific things the project did well.
- improvements: one to three specific, actionable things that would most improve it.

Rules:
- Base everything on the scores and the notes. Don't invent features, numbers or facts that aren't in the input.
- Never quote a judge word for word and never identify or refer to an individual judge ("Judge A said..."). Speak about the judges collectively.
- Be specific to this project, plain and kind. No scores or numbers in the text, no markdown, each item under 25 words.
- If the notes are thin, lean on the scores and keep it shorter rather than padding.`;

/**
 * The user message for one project. Notes are anonymized and stripped of
 * anything that looks like an email address.
 * @param {{ title: string, pitch?: string, description?: string, track: string,
 *   score: { score: number, max: number, criteria: { id: string, score: number, max: number, trackAvg: number }[] },
 *   notes: string[] }} p
 */
export function buildPrompt(p) {
  const scrub = (t) => String(t ?? '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email removed]').trim();
  const lines = [
    `Project: ${scrub(p.title)}`,
    p.pitch ? `Pitch: ${scrub(p.pitch)}` : null,
    p.description ? `Description: ${scrub(p.description)}` : null,
    `Track: ${p.track}`,
    '',
    `Total judge score (normalized average across all judges): ${p.score.score} / ${p.score.max}`,
    'Per criterion:',
    ...p.score.criteria.map((c) => `- ${CRITERION_QUESTIONS[c.id] ?? c.id}: this project ${c.score}, track average ${c.trackAvg}, max ${c.max}`),
    '',
    'Judges\' notes (anonymized, one per judge who left a note):',
    ...(p.notes.length ? p.notes.map((n, i) => `- Judge ${String.fromCharCode(65 + (i % 26))}: ${scrub(n)}`) : ['- (no notes left)']),
  ];
  return lines.filter((l) => l !== null).join('\n');
}

export class AiFeedbackError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export const aiFeedbackConfigured = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let client = null;
const getClient = () => (client ??= new Anthropic());
/** Tests inject a fake client. */
export const setAiClient = (c) => {
  client = c;
};

/** One project's feedback from Claude, validated and cleaned. */
export async function generateFeedback(project) {
  let response;
  try {
    response = await getClient().beta.messages.parse({
      model: AI_FEEDBACK_MODEL,
      max_tokens: 16000,
      // On a policy decline the API retries on a fallback model inside the same call.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(FeedbackSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content: buildPrompt(project) }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new AiFeedbackError('Rate limited by the AI service; try again in a minute.', 429);
    if (e instanceof Anthropic.AuthenticationError) throw new AiFeedbackError('The AI service rejected the API key.', 503);
    if (e instanceof Anthropic.APIError) throw new AiFeedbackError(`AI service error (${e.status ?? 'network'}): ${e.message}`, 502);
    throw e;
  }
  if (response.stop_reason === 'refusal') throw new AiFeedbackError('The AI declined to write feedback for this project.', 422);
  if (!response.parsed_output) throw new AiFeedbackError('The AI returned feedback in an unexpected format.', 502);
  return cleanFeedback(response.parsed_output);
}
