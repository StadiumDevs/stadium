import { getEmailTransport } from './email-transport.js';
import { renderEmail } from './notification-templates/index.js';
import programSubmissionRepository from '../repositories/program-submission.repository.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://stadium.joinwebzero.com';

class PrizeAwardService {
  /**
   * Email every winner of a program (a submission with a prize) that hasn't yet
   * been notified, then stamp prize_notified_at so re-publishing never double-
   * emails. Best-effort and transient (the notifications table is wallet-keyed;
   * submitters are email-only), mirroring the invite + confirmation services.
   *
   * Returns { ok, reason?, sent, failed }. ok:false / reason:'provider_not_configured'
   * when Resend is unset so the caller can log that winners weren't emailed.
   */
  async notifyWinners({ program }) {
    const transport = await getEmailTransport();
    if (!transport) return { ok: false, reason: 'provider_not_configured', sent: 0, failed: 0 };

    const winners = await programSubmissionRepository.listWinnersToNotify(program.id);
    const link = `${FRONTEND_URL}/programs/${encodeURIComponent(program.slug)}`;
    const replyTo = process.env.PRIZE_CONTACT_EMAIL || process.env.RESEND_FROM_EMAIL;

    let sent = 0;
    let failed = 0;
    for (const w of winners) {
      try {
        const { subject, html, text } = renderEmail('prize_award', {
          submitterName: w.submitterName,
          programName: program.name,
          projectTitle: w.projectTitle,
          prizeAmount: w.prizeAmount,
          prizeCurrency: w.prizeCurrency,
          prizeLabel: w.prizeLabel,
          link,
        });
        await transport.send({
          from: process.env.RESEND_FROM_EMAIL,
          to: w.lumaEmail,
          replyTo,
          subject,
          html,
          text,
        });
        await programSubmissionRepository.setPrizeNotified(w.id);
        sent += 1;
      } catch (err) {
        failed += 1;
        // Leave prize_notified_at unset so a later publish retries this winner.
        console.error(`❌ Prize-award email failed for ${w.lumaEmail}:`, err?.message || err);
      }
    }
    return { ok: true, sent, failed };
  }
}

export default new PrizeAwardService();
