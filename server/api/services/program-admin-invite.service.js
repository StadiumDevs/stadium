import { getEmailTransport } from './email-transport.js';
import { renderEmail } from './notification-templates/index.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://stadium.joinwebzero.com';

class ProgramAdminInviteService {
  /**
   * Email a freshly-granted program admin their onboarding link. Best-effort:
   * returns { ok:false, reason:'provider_not_configured' } when Resend is unset
   * so the caller can surface that the grant landed but no email went out.
   */
  async send({ email, programName, slug }) {
    const transport = await getEmailTransport();
    if (!transport) return { ok: false, reason: 'provider_not_configured' };

    const link = `${FRONTEND_URL}/admin/programs/${encodeURIComponent(slug)}`;
    const { subject, html, text } = renderEmail('program_admin_invite', {
      email,
      programName,
      link,
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

export default new ProgramAdminInviteService();
