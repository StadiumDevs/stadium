import { getEmailTransport } from './email-transport.js';
import { renderEmail } from './notification-templates/index.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://stadium.joinwebzero.com';

class SubmissionConfirmationService {
  /**
   * Email a submitter confirming their project submission (or resubmission), with
   * a link back to the program page and resubmit instructions. Best-effort:
   * returns { ok:false, reason:'provider_not_configured' } when Resend is unset so
   * the caller can surface that the submission landed but no email went out.
   */
  async send({ email, submitterName, programName, slug, projectTitle, deadline = null, resubmitted = false }) {
    const transport = await getEmailTransport();
    if (!transport) return { ok: false, reason: 'provider_not_configured' };

    const link = `${FRONTEND_URL}/programs/${encodeURIComponent(slug)}`;
    const { subject, html, text } = renderEmail('submission_confirmation', {
      submitterName,
      programName,
      projectTitle,
      link,
      deadline,
      resubmitted,
    });

    await transport.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject,
      html,
      text,
    });
    return { ok: true };
  }
}

export default new SubmissionConfirmationService();
