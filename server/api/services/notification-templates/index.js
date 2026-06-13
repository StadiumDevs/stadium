import * as applicationAccepted from './application-accepted.js';
import * as applicationRejected from './application-rejected.js';
import * as m2Approved from './m2-approved.js';
import * as m2ChangesRequested from './m2-changes-requested.js';
import * as programAdminInvite from './program-admin-invite.js';
import * as submissionConfirmation from './submission-confirmation.js';
import * as prizeAward from './prize-award.js';

const templates = {
  application_accepted: applicationAccepted,
  application_rejected: applicationRejected,
  m2_approved: m2Approved,
  m2_changes_requested: m2ChangesRequested,
  program_admin_invite: programAdminInvite,
  submission_confirmation: submissionConfirmation,
  prize_award: prizeAward,
};

export function renderEmail(eventType, payload) {
  const tmpl = templates[eventType];
  if (!tmpl) throw new Error('unknown_event_type');
  return {
    subject: tmpl.subject(payload),
    html: tmpl.html(payload),
    text: tmpl.text(payload),
  };
}
