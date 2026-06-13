import { Resend } from 'resend';

export async function getEmailTransport() {
  if (process.env.NODE_ENV === 'test') {
    // Lazy import: mock-resend.js imports `vi` from vitest — a static import
    // would pull the test framework into the production module graph.
    const { mockResend } = await import('./__tests__/mock-resend.js');
    return mockResend;
  }

  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Optional global BCC archive: every outbound email is blind-copied to the
  // address(es) in EMAIL_BCC (comma-separated). Merged with any caller-supplied bcc.
  const envBcc = (process.env.EMAIL_BCC || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    async send({ from, to, cc, bcc, replyTo, subject, html, text }) {
      const callerBcc = Array.isArray(bcc) ? bcc : bcc ? [bcc] : [];
      const allBcc = [...callerBcc, ...envBcc];
      const { data, error } = await resend.emails.send({
        from,
        to,
        cc,
        bcc: allBcc.length ? allBcc : undefined,
        replyTo: replyTo || undefined,
        subject,
        html,
        text,
      });
      if (error) throw new Error(error.message ?? String(error));
      return { id: data.id };
    },
  };
}
