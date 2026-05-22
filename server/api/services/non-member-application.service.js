import { getEmailTransport } from './email-transport.js';

// Where applications land. Fixed recipients — the applicant's address only ever
// appears in the body, never as a recipient, so this endpoint can't be abused
// as an open relay to email arbitrary addresses.
const TEAM_TO = 'info@joinwebzero.com';
const TEAM_CC = 'sacha@joinwebzero.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PITCH_MAX = 1000;

/**
 * Validate a non-member application payload. Returns
 * { ok: true, value } or { ok: false, error }.
 */
export function validateNonMemberApplication(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const pitch = typeof body.pitch === 'string' ? body.pitch.trim() : '';
  const walletAddress = typeof body.walletAddress === 'string' ? body.walletAddress.trim() : '';

  if (!name) return { ok: false, error: 'Name is required' };
  if (!email || !EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required' };
  if (!pitch) return { ok: false, error: 'A short pitch is required' };
  if (pitch.length > PITCH_MAX) return { ok: false, error: `Pitch must be ${PITCH_MAX} characters or fewer` };

  return { ok: true, value: { name, email, pitch, walletAddress } };
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

class NonMemberApplicationService {
  /**
   * Email the team a non-member's application. Single email with fixed
   * recipients (info@ + cc sacha@); applicant details live in the body. The
   * team approves manually and replies. Returns { ok } or { ok:false, reason }.
   */
  async submit({ programName, programSlug, name, email, pitch, walletAddress }) {
    const transport = await getEmailTransport();
    if (!transport) return { ok: false, reason: 'provider_not_configured' };

    const subject = `New applicant for ${programName}: ${name}`;
    const text = [
      `Program: ${programName} (${programSlug})`,
      `Name: ${name}`,
      `Email: ${email}`,
      walletAddress ? `Wallet: ${walletAddress}` : null,
      '',
      'Pitch:',
      pitch,
    ]
      .filter((l) => l !== null)
      .join('\n');
    const html = `<h2>New applicant for ${escapeHtml(programName)}</h2>
<p><strong>Name:</strong> ${escapeHtml(name)}<br/>
<strong>Email:</strong> ${escapeHtml(email)}${walletAddress ? `<br/><strong>Wallet:</strong> ${escapeHtml(walletAddress)}` : ''}<br/>
<strong>Program:</strong> ${escapeHtml(programName)} (${escapeHtml(programSlug)})</p>
<p><strong>Pitch:</strong></p>
<p>${escapeHtml(pitch).replace(/\n/g, '<br/>')}</p>`;

    await transport.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: TEAM_TO,
      cc: [TEAM_CC],
      subject,
      html,
      text,
    });
    return { ok: true };
  }
}

export default new NonMemberApplicationService();
