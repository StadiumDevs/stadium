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

  return {
    async send({ from, to, cc, subject, html, text }) {
      const { data, error } = await resend.emails.send({ from, to, cc, subject, html, text });
      if (error) throw new Error(error.message ?? String(error));
      return { id: data.id };
    },
  };
}
