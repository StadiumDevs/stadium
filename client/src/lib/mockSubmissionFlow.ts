// Playground (mock mode) version of the tracked submit flow on the server
// (submission.controller.js submit / mySubmission / submitFeedback / editors):
// drafts, teammate edit access checked against the Luma list, the feedback
// step required before finalizing, and the last-edit stamp. Verification is
// the mock stand-in (mockVerifiedEmails). Imported lazily by api.ts.
import { ApiError, type MySubmission, type SubmissionEditStamp, type SubmissionPayload, type SubmitResult } from "./api";
import type { ExperienceRatings } from "./experienceRatings";
import { mockSubmissionDrafts, type MockEntryMeta } from "./mockSubmissionDrafts";
import { mockVerifiedEmails } from "./mockVerifiedEmails";
import { mockTracked } from "./mockTrackedSubmissions";
import { mockProgramSignups, mockPrograms } from "./mockPrograms";
import { mockRefusals } from "./mockRefusals";

const norm = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();
const now = () => new Date().toISOString();
const checkedIn = (slug: string, email: string) => (mockProgramSignups[slug] || []).some((g) => norm(g.email) === norm(email));

type Access = { meta: MockEntryMeta; role: "owner" | "editor" };

/** The entry this verified email may edit; seeded entries (no meta yet) count as submitted. */
function accessFor(slug: string, email: string): Access | null {
  const found = mockSubmissionDrafts.access(slug, email);
  if (found) return found;
  const seeded = mockTracked.list(slug).find((s) => norm(s.lumaEmail) === norm(email));
  if (!seeded) return null;
  const meta: MockEntryMeta = {
    ownerEmail: norm(seeded.lumaEmail),
    status: "submitted",
    draft: null,
    createdAt: seeded.createdAt,
    finalizedAt: seeded.createdAt,
    feedbackSubmittedAt: seeded.createdAt,
    ratings: null,
    eventLiked: null,
    lastEditedAt: seeded.updatedAt ?? seeded.createdAt,
    lastEditedByEmail: norm(seeded.lumaEmail),
    lastEditedByName: seeded.submitterName,
    editors: [],
  };
  mockSubmissionDrafts.put(slug, meta);
  return { meta, role: "owner" };
}

const requireSession = (sessionEmail: string | null) => {
  const e = norm(sessionEmail);
  if (!e || !mockVerifiedEmails.has(e)) throw new ApiError("Verify your email first.", 401, "verify_email");
  return e;
};

const editorName = (access: Access | null, email: string, payload: SubmissionPayload) =>
  access?.role === "editor"
    ? payload.details?.team?.find((m) => norm(m.email) === email)?.name || email
    : payload.submitterName;

const stampOf = (m: MockEntryMeta): SubmissionEditStamp => ({
  lastEditedAt: m.lastEditedAt,
  lastEditedByName: m.lastEditedByName,
  lastEditedByEmail: m.lastEditedByEmail,
});

export async function mockSaveTracked(slug: string, input: SubmissionPayload, sessionEmail: string | null): Promise<SubmitResult> {
  const wantsDraft = input.intent === "draft";
  const session = norm(sessionEmail);
  const verified = !!session && mockVerifiedEmails.has(session);
  if (wantsDraft && !verified) throw new ApiError("Verify your email to save a draft.", 401, "verify_email");

  const access = verified ? accessFor(slug, session) : null;
  const payload: SubmissionPayload = access
    ? {
        ...input,
        lumaEmail: access.meta.ownerEmail,
        ...(access.role === "editor" ? { submitterName: mockTracked.list(slug).find((s) => norm(s.lumaEmail) === access.meta.ownerEmail)?.submitterName ?? access.meta.draft?.submitterName ?? input.submitterName } : {}),
      }
    : input;
  const owner = norm(payload.lumaEmail);
  let existing = access?.meta ?? mockSubmissionDrafts.get(slug, owner);
  if (!existing && mockTracked.list(slug).some((s) => norm(s.lumaEmail) === owner)) existing = accessFor(slug, owner)?.meta ?? null;
  if (existing && !access && !(verified && session === owner)) {
    const reason = "Verify your email to update your submission.";
    mockRefusals.record(slug, payload, "update_unverified", reason);
    throw new ApiError(reason, 401, "verify_to_update");
  }

  const asDraft = wantsDraft && (!existing || existing.status === "draft");
  const feedbackDone = !!existing?.feedbackSubmittedAt;
  const hasRatings = !!payload.ratings;
  if (!asDraft && !feedbackDone && !hasRatings) {
    throw new ApiError("Submit the event feedback before you finalize.", 400, "feedback_required");
  }
  if (!existing && !checkedIn(slug, owner)) {
    if (verified) {
      const message =
        "Received. Your email isn't on Luma's checked-in list yet, so an organiser will confirm it. You don't need to submit again.";
      mockRefusals.record(slug, payload, "not_checked_in", message, true);
      return { status: "pending", outcome: "pending", message };
    }
    const reason = "Only checked-in attendees can submit. Use the email you checked in with on Luma.";
    mockRefusals.record(slug, payload, "not_checked_in", reason);
    throw new ApiError(reason, 403, "not_checked_in");
  }

  const at = now();
  const program = mockPrograms.find((p) => p.slug === slug);
  const late = !asDraft && !!(program?.eventEndsAt && Date.now() > Date.parse(program.eventEndsAt));
  const editorEmail = verified ? session : owner;
  const meta: MockEntryMeta = {
    ownerEmail: owner,
    status: asDraft ? "draft" : "submitted",
    draft: asDraft ? { ...payload, intent: undefined, ratings: undefined } : null,
    createdAt: existing?.createdAt ?? at,
    finalizedAt: asDraft ? null : existing?.finalizedAt ?? at,
    feedbackSubmittedAt: existing?.feedbackSubmittedAt ?? (hasRatings ? at : null),
    ratings: payload.ratings ?? existing?.ratings ?? null,
    eventLiked: payload.eventLiked ?? existing?.eventLiked ?? null,
    lastEditedAt: at,
    lastEditedByEmail: editorEmail,
    lastEditedByName: editorName(access, editorEmail, payload),
    // A teammate taken off the team list loses edit access (point person saves only).
    editors:
      access?.role === "owner" && existing
        ? existing.editors.filter((e) => (payload.details?.team ?? []).some((m) => norm(m.email) === e))
        : existing?.editors ?? [],
  };
  let id = `draft-${owner}`;
  if (!asDraft && payload.details) {
    // Finalized (or updated): hand it to the judging store, batched by finalize time.
    const sub = mockTracked.add(slug, {
      ...payload,
      details: payload.details,
      late,
      createdAt: meta.finalizedAt ?? at,
    });
    void mockTracked.recheckTx(slug, sub.id);
    id = sub.id;
  }
  mockSubmissionDrafts.put(slug, meta);
  const finalizing = !asDraft && (!existing || existing.status === "draft");
  return {
    status: "success",
    data: { id, late, status: meta.status, finalizedAt: meta.finalizedAt, feedbackSubmittedAt: meta.feedbackSubmittedAt, ...stampOf(meta) },
    resubmitted: !!existing && !finalizing,
    outcome: asDraft ? "draft" : existing && !finalizing ? "updated" : "created",
  };
}

export async function mockMySubmission(slug: string, email: string): Promise<{ status: string; data: MySubmission }> {
  const session = requireSession(email);
  const a = accessFor(slug, session);
  if (!a) throw new ApiError("No submission for this email yet", 404);
  const m = a.meta;
  let form: SubmissionPayload | null = m.draft;
  if (!form) {
    const s = mockTracked.list(slug).find((x) => norm(x.lumaEmail) === m.ownerEmail);
    if (!s) throw new ApiError("No submission for this email yet", 404);
    const { txCheck: _t, milestone: _m, ...details } = s.details;
    form = {
      submitterName: s.submitterName,
      lumaEmail: s.lumaEmail,
      projectTitle: s.projectTitle,
      projectBrief: s.projectBrief ?? "",
      videoUrl: s.videoUrl,
      githubUrl: s.githubUrl,
      details,
    };
  }
  return {
    status: "success",
    data: {
      ...form,
      createdAt: m.createdAt,
      status: m.status,
      finalizedAt: m.finalizedAt,
      feedbackSubmittedAt: m.feedbackSubmittedAt,
      ...stampOf(m),
      ratings: m.ratings,
      eventLiked: m.eventLiked,
      role: a.role,
      editors: m.editors,
    },
  };
}

export async function mockSubmitFeedback(
  slug: string,
  body: { ratings: ExperienceRatings; eventLiked?: string | null },
  sessionEmail: string | null,
) {
  const session = requireSession(sessionEmail);
  const a = accessFor(slug, session);
  if (!a) throw new ApiError("No submission for this email yet. Save a draft first.", 404);
  const at = now();
  const team = a.meta.draft?.details?.team ?? mockTracked.list(slug).find((s) => norm(s.lumaEmail) === a.meta.ownerEmail)?.details.team ?? [];
  const name =
    a.role === "editor"
      ? team.find((m) => norm(m.email) === session)?.name || session
      : a.meta.draft?.submitterName ?? a.meta.lastEditedByName;
  const meta: MockEntryMeta = {
    ...a.meta,
    ratings: body.ratings,
    eventLiked: body.eventLiked ?? null,
    feedbackSubmittedAt: a.meta.feedbackSubmittedAt ?? at,
    lastEditedAt: at,
    lastEditedByEmail: session,
    lastEditedByName: name,
  };
  mockSubmissionDrafts.put(slug, meta);
  return { status: "success", data: { feedbackSubmittedAt: meta.feedbackSubmittedAt, ...stampOf(meta) } };
}

export async function mockSetEditor(slug: string, email: string, grant: boolean, sessionEmail: string | null) {
  const session = requireSession(sessionEmail);
  const a = accessFor(slug, session);
  if (!a) throw new ApiError("No submission for this email yet. Save a draft first.", 404);
  if (a.role !== "owner") throw new ApiError("Only the point person can change who can edit.", 403, "owner_only");
  const e = norm(email);
  let editors = a.meta.editors.filter((x) => x !== e);
  if (grant) {
    if (e === a.meta.ownerEmail) throw new ApiError("That's the point person's email: it can already edit.", 400);
    const team = a.meta.draft?.details?.team ?? mockTracked.list(slug).find((s) => norm(s.lumaEmail) === a.meta.ownerEmail)?.details.team ?? [];
    if (!team.some((m) => norm(m.email) === e)) {
      throw new ApiError("Add this teammate (with their email) to the team list and save first.", 400, "not_on_team");
    }
    const other = mockSubmissionDrafts.access(slug, e);
    const ownsSeeded = mockTracked.list(slug).some((s) => norm(s.lumaEmail) === e);
    if (ownsSeeded || (other && other.meta.ownerEmail !== a.meta.ownerEmail)) {
      throw new ApiError("This email is already on another team for this program.", 409, "email_in_use");
    }
    if (!checkedIn(slug, e)) throw new ApiError("This email isn't checked in on Luma.", 403, "not_checked_in");
    editors = [...editors, e];
  }
  mockSubmissionDrafts.put(slug, { ...a.meta, editors });
  return { status: "success", data: { editors } };
}

/** Judge view (mock): the last-edit stamp of each submitted entry, by owner email. */
export function mockEditStamps(slug: string): Record<string, SubmissionEditStamp> {
  return Object.fromEntries(Object.entries(mockSubmissionDrafts.all(slug)).map(([k, m]) => [k, stampOf(m)]));
}
