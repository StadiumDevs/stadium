/**
 * Verify outbound email (Resend) actually works — in one command, with no admin
 * auth and no DB. Sends a single test message through the REAL transport
 * (api/services/email-transport.js), so it exercises the same RESEND_API_KEY +
 * RESEND_FROM_EMAIL + verified-domain path the app uses.
 *
 * This only tests Resend (invite / notification email). The magic-link sign-in
 * email is sent by Supabase Auth, not Resend — see docs/TESTING_EMAIL_AND_SIGNIN.md.
 *
 * Usage (from server/):
 *   npm run verify:email -- you@example.com
 *   # or, to validate the deployed key, put the deploy's RESEND_* in .env first.
 *
 * Exit codes: 0 = sent (prints the Resend message id); 1 = not configured or send failed.
 */
import dotenv from 'dotenv';
import { getEmailTransport } from '../api/services/email-transport.js';

dotenv.config();

async function main() {
  if (process.env.NODE_ENV === 'test') {
    console.error('✗ Refusing to run under NODE_ENV=test (the transport is mocked there).');
    process.exit(1);
  }

  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.argv[2] || from;

  if (!process.env.RESEND_API_KEY) {
    console.error('✗ RESEND_API_KEY is not set — email is disabled (the transport is null).');
    console.error('  Set RESEND_API_KEY (and RESEND_FROM_EMAIL) in server/.env, then re-run.');
    process.exit(1);
  }
  if (!from) {
    console.error('✗ RESEND_FROM_EMAIL is not set — must be an address on a domain verified in Resend.');
    process.exit(1);
  }
  if (!to) {
    console.error('✗ No recipient. Usage: npm run verify:email -- you@example.com');
    process.exit(1);
  }

  const transport = await getEmailTransport();
  if (!transport) {
    // Shouldn't happen given the checks above, but be explicit.
    console.error('✗ Email transport is null — RESEND_API_KEY missing.');
    process.exit(1);
  }

  console.log(`→ Sending a test email from ${from} to ${to} …`);
  try {
    const sentAt = new Date().toISOString();
    const { id } = await transport.send({
      from,
      to,
      subject: 'Stadium email test',
      html: `<p>This is a Stadium email-delivery test sent at ${sentAt}.</p><p>If you received it, Resend is configured correctly.</p>`,
      text: `Stadium email-delivery test sent at ${sentAt}. If you received it, Resend is configured correctly.`,
    });
    console.log(`✓ Sent. Resend message id: ${id}`);
    console.log('  Check the inbox and the Resend dashboard logs to confirm delivery.');
    process.exit(0);
  } catch (err) {
    console.error(`✗ Send failed: ${err?.message || err}`);
    console.error('  Common cause: RESEND_FROM_EMAIL is not on a domain verified in Resend.');
    process.exit(1);
  }
}

main();
