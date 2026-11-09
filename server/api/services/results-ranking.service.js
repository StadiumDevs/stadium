// The ranking snapshot stored with published results: for each judged track,
// whether it was ranked on normalized scores and by which method. Taken from
// the live leaderboard at publish time, so a later toggle change, a new score
// or a track falling back to raw never changes what was published.

import programSubmissionRepository from '../repositories/program-submission.repository.js';
import submissionRubricScoreRepository from '../repositories/submission-rubric-score.repository.js';
import programAdminEmailRepository from '../repositories/program-admin-email.repository.js';
import { isAbandoned } from '../constants/trackedPrograms.js';
import { RUBRIC_TRACKS } from '../constants/rubrics.js';
import { computeLeaderboard } from './rubric-leaderboard.service.js';

/**
 * Pure: one entry per track. A track counts as normalized only when the admin
 * published with normalization on and the track had enough scoring judges.
 * @param {Record<string, { normalization: { enabled: boolean, available?: boolean, method: string } }>} boards
 * @param {boolean} normalized  the admin's APPLY NORMALIZATION toggle
 */
export function rankingSnapshot(boards, normalized) {
  const out = {};
  for (const [track, board] of Object.entries(boards)) {
    const n = board.normalization ?? {};
    const on = !!normalized && !!n.enabled && n.available !== false;
    out[track] = { normalized: on, method: on ? n.method : null };
  }
  return out;
}

/** Loads the program's judging data and returns the snapshot for every track. */
export async function snapshotForProgram({ program, tracked, normalized }) {
  const [all, scores, judges] = await Promise.all([
    programSubmissionRepository.listByProgramId(program.id),
    submissionRubricScoreRepository.listByProgram(program.id),
    programAdminEmailRepository.listJudges(program.id),
  ]);
  const submissions = all.filter((s) => !isAbandoned(s, tracked, program));
  const boards = {};
  for (const track of RUBRIC_TRACKS) boards[track] = computeLeaderboard({ track, submissions, scores, judges });
  return rankingSnapshot(boards, normalized);
}
