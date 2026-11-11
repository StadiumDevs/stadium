// Prize payouts on tracked programs (Free Society Hack).
//
// Winner (verified-email session, the point person only): read and send the
// payout details for their own winning entry, once results are published.
// Platform admin: the payouts table, edit details, record a payment (tx hash
// as proof; emails the winner) or undo it, email payout links, CSV export.
// Payout details never appear in judge, public or stats payloads.

import programService from '../services/program.service.js';
import programSubmissionRepository from '../repositories/program-submission.repository.js';
import payoutRepository from '../repositories/payout.repository.js';
import { trackedProgramFor } from '../constants/trackedPrograms.js';
import {
  NETWORKS,
  networksFor,
  awardsFor,
  owesPayout,
  allPaid,
  validateDetails,
  validatePayment,
  explorerUrl,
  loadPayouts,
  payoutsCsv,
} from '../services/payout.service.js';
import { extractSupabaseToken, getSupabaseUser } from '../auth/supabaseUser.js';
import { getEmailTransport } from '../services/email-transport.js';
import { renderEmail } from '../services/notification-templates/index.js';
import auditLog from '../services/program-audit-log.service.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://stadium.joinwebzero.com';
const isPlatformAdmin = (req) => req.user?.isGlobalAdmin === true;
const actorOf = (req) => ({ chain: req.user?.chain, wallet: req.user?.address, email: req.user?.email });
const actorId = (req) => req.user?.address || req.user?.email || null;
const fail = (res, code, message, extra = {}) => res.status(code).json({ status: 'error', message, ...extra });

const projectLink = (program, submissionId) =>
  `${FRONTEND_URL}/programs/${encodeURIComponent(program.slug)}/projects/${encodeURIComponent(submissionId)}?payout=1`;

/** Organisers emailed when a winner sends or changes payout details. */
export const notifyRecipients = (payout) => {
  const env = (process.env.PAYOUT_NOTIFY_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return env.length ? env : payout?.notify ?? [];
};

const awardsText = (awards) =>
  awards
    .filter((a) => a.payable && a.due !== 'forfeited')
    .map((a) => `${a.label}, ${a.amount} ${a.currency}`)
    .join('; ');

async function loadProgram(req, res) {
  const tracked = trackedProgramFor(req.params.slug);
  if (!tracked?.payout) {
    fail(res, 404, 'This program has no prize payouts');
    return null;
  }
  const program = await programService.findBySlug(req.params.slug);
  if (!program) {
    fail(res, 404, 'Program not found');
    return null;
  }
  return { tracked, program };
}

async function loadEntry(req, res, program) {
  const s = await programSubmissionRepository.findById(req.params.submissionId);
  if (!s || s.programId !== program.id || !s.details || s.isTestEntry) {
    fail(res, 404, 'Submission not found');
    return null;
  }
  return s;
}

/** The signed-in point person of this entry, or null (response already sent). */
async function requirePointPerson(req, res, s) {
  const token = extractSupabaseToken(req);
  const user = token ? await getSupabaseUser(token) : null;
  const email = user?.email?.trim().toLowerCase();
  if (!email || user.emailConfirmed === false || email !== String(s.lumaEmail).toLowerCase()) {
    fail(res, 401, 'Sign in with the email you submitted with to send your payout details.', { code: 'verify_email' });
    return null;
  }
  return email;
}

/** What the winner sees on their card. */
async function winnerView(ctx, s) {
  const [details, payments] = await Promise.all([payoutRepository.getDetails(s.id), payoutRepository.listPayments([s.id])]);
  const awards = awardsFor(s, ctx.tracked).map((a) => {
    const p = payments.find((x) => x.award === a.award);
    return { ...a, payment: p ? { paidAt: p.paidAt, txUrl: explorerUrl(p.network, p.txHash), network: p.network } : null };
  });
  return {
    submissionId: s.id,
    projectTitle: s.projectTitle,
    currency: ctx.tracked.payout.currency,
    deadline: ctx.tracked.payout.detailsDeadline ?? null,
    networks: networksFor(ctx.tracked.payout),
    awards,
    details,
    // Details lock once a payment is recorded; the organisers can still correct them.
    locked: payments.length > 0,
  };
}

/** Re-derives program_submissions.paid from the payments (keeps the older "paid" UIs right). */
async function syncPaid(s, tracked, actor) {
  const payments = await payoutRepository.listPayments([s.id]);
  const paid = allPaid(awardsFor(s, tracked), payments);
  if (paid !== !!s.paid) await programSubmissionRepository.setPaid(s.id, paid, actor);
  return paid;
}

/** Best effort: tell the organisers a winner sent or changed their details. */
async function emailDetailsReceived({ ctx, s, details, previous }) {
  const to = notifyRecipients(ctx.tracked.payout);
  if (!to.length) return { ok: false, reason: 'no_recipients' };
  const transport = await getEmailTransport();
  if (!transport) return { ok: false, reason: 'provider_not_configured' };
  try {
    const { subject, html, text } = renderEmail('payout_details_received', {
      programName: ctx.program.name,
      projectTitle: s.projectTitle,
      submitterName: s.submitterName,
      email: s.lumaEmail,
      awardsText: awardsText(awardsFor(s, ctx.tracked)) || 'none owed by WebZero',
      legalName: details.legalName,
      taxCountry: details.taxCountry,
      networkLabel: NETWORKS[details.network]?.label ?? details.network,
      address: details.address,
      updated: !!previous,
      previousAddress: previous?.address ?? null,
      previousNetworkLabel: previous ? NETWORKS[previous.network]?.label ?? previous.network : null,
      adminLink: `${FRONTEND_URL}/admin/programs/${encodeURIComponent(ctx.program.slug)}`,
    });
    await transport.send({ from: process.env.RESEND_FROM_EMAIL, to, replyTo: s.lumaEmail, subject, html, text });
    return { ok: true };
  } catch (err) {
    console.error('❌ Payout details notification failed:', err?.message || err);
    return { ok: false, reason: 'send_failed' };
  }
}

async function emailPaid({ program, s, award, payment }) {
  const transport = await getEmailTransport();
  if (!transport) return { ok: false, reason: 'provider_not_configured' };
  try {
    const { subject, html, text } = renderEmail('payout_sent', {
      submitterName: s.submitterName,
      programName: program.name,
      projectTitle: s.projectTitle,
      awardLabel: award.label,
      amount: payment.amount,
      currency: payment.currency,
      networkLabel: NETWORKS[payment.network]?.label ?? payment.network,
      address: payment.address,
      txUrl: explorerUrl(payment.network, payment.txHash),
    });
    await transport.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: s.lumaEmail,
      replyTo: process.env.PRIZE_CONTACT_EMAIL || process.env.RESEND_FROM_EMAIL,
      subject,
      html,
      text,
    });
    await payoutRepository.markNotified(payment.id);
    return { ok: true };
  } catch (err) {
    console.error('❌ Payout email failed:', err?.message || err);
    return { ok: false, reason: 'send_failed' };
  }
}

class PayoutController {
  // Winner: their own payout card.
  async getMine(req, res) {
    try {
      const ctx = await loadProgram(req, res);
      if (!ctx) return;
      if (!ctx.program.resultsPublishedAt) return fail(res, 404, 'Submission not found');
      const s = await loadEntry(req, res, ctx.program);
      if (!s) return;
      if (!(await requirePointPerson(req, res, s))) return;
      if (!owesPayout(s, ctx.tracked)) return fail(res, 404, 'No prize to pay out for this entry');
      res.status(200).json({ status: 'success', data: await winnerView(ctx, s) });
    } catch (error) {
      console.error('❌ Error loading payout details:', error);
      fail(res, 500, 'Failed to load your payout details');
    }
  }

  // Winner: send or update the payout details (until a payment is recorded).
  async saveMine(req, res) {
    try {
      const ctx = await loadProgram(req, res);
      if (!ctx) return;
      if (!ctx.program.resultsPublishedAt) return fail(res, 404, 'Submission not found');
      const s = await loadEntry(req, res, ctx.program);
      if (!s) return;
      const email = await requirePointPerson(req, res, s);
      if (!email) return;
      if (!owesPayout(s, ctx.tracked)) return fail(res, 404, 'No prize to pay out for this entry');
      const payments = await payoutRepository.listPayments([s.id]);
      if (payments.length) return fail(res, 409, 'A payment has been sent to these details. Reply to the payout email to change them.');
      const v = validateDetails(req.body, ctx.tracked.payout);
      if (!v.ok) return fail(res, 400, v.error);
      const previous = await payoutRepository.getDetails(s.id);
      await payoutRepository.upsertDetails(s.id, v.value, { by: email, email });
      res.status(200).json({ status: 'success', data: await winnerView(ctx, s) });
      // After the response: a failed email never fails the save.
      const sent = await emailDetailsReceived({ ctx, s, details: v.value, previous });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: { email },
        action: 'payout.details_updated',
        targetType: 'submission',
        targetId: s.id,
        metadata: { by: 'winner', network: v.value.network, firstTime: !previous, organisersEmailed: sent.ok },
      });
    } catch (error) {
      console.error('❌ Error saving payout details:', error);
      fail(res, 500, 'Failed to save your payout details');
    }
  }

  // Platform admin: every winner, their awards, details and payments.
  async list(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can see payouts');
      const ctx = await loadProgram(req, res);
      if (!ctx) return;
      const rows = await loadPayouts(ctx.program, ctx.tracked);
      res.status(200).json({
        status: 'success',
        data: {
          currency: ctx.tracked.payout.currency,
          deadline: ctx.tracked.payout.detailsDeadline ?? null,
          networks: networksFor(ctx.tracked.payout),
          rows,
        },
      });
    } catch (error) {
      console.error('❌ Error listing payouts:', error);
      fail(res, 500, 'Failed to load payouts');
    }
  }

  async csv(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can export payouts');
      const ctx = await loadProgram(req, res);
      if (!ctx) return;
      const rows = await loadPayouts(ctx.program, ctx.tracked);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${ctx.program.slug}-payouts.csv"`);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).send(payoutsCsv(rows));
      auditLog.logSafe({ programId: ctx.program.id, actor: actorOf(req), action: 'payout.csv_export', targetType: 'program', targetId: ctx.program.id, metadata: null });
    } catch (error) {
      console.error('❌ Error exporting payouts:', error);
      fail(res, 500, 'Failed to export payouts');
    }
  }

  // Platform admin: enter or correct a winner's details.
  async saveDetails(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can edit payout details');
      const ctx = await loadProgram(req, res);
      if (!ctx) return;
      const s = await loadEntry(req, res, ctx.program);
      if (!s) return;
      if (!awardsFor(s, ctx.tracked).some((a) => a.payable)) return fail(res, 409, 'This entry has no prize WebZero pays');
      const v = validateDetails({ ...req.body, confirmed: true }, ctx.tracked.payout);
      if (!v.ok) return fail(res, 400, v.error);
      const details = await payoutRepository.upsertDetails(s.id, v.value, { by: actorId(req) });
      res.status(200).json({ status: 'success', data: details });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: actorOf(req),
        action: 'payout.details_updated',
        targetType: 'submission',
        targetId: s.id,
        metadata: { by: 'admin', network: v.value.network },
      });
    } catch (error) {
      console.error('❌ Error saving payout details (admin):', error);
      fail(res, 500, 'Failed to save the payout details');
    }
  }

  // Platform admin: record a payment for one award (tx hash = proof) and email the winner.
  async recordPayment(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can record payments');
      const ctx = await loadProgram(req, res);
      if (!ctx) return;
      const s = await loadEntry(req, res, ctx.program);
      if (!s) return;
      const award = awardsFor(s, ctx.tracked).find((a) => a.award === req.params.award);
      if (!award) return fail(res, 404, 'This entry has no such award');
      if (!award.payable) return fail(res, 409, `${award.paidBy ?? 'Another organiser'} pays this prize, not WebZero`);
      if (award.due === 'forfeited') return fail(res, 409, 'The milestone was not completed, so this prize is not paid');
      const details = await payoutRepository.getDetails(s.id);
      if (!details) return fail(res, 409, 'The winner has not sent payout details yet');
      const existing = (await payoutRepository.listPayments([s.id])).find((p) => p.award === award.award);
      if (existing) return fail(res, 409, 'This award is already marked paid. Undo it first to record a different payment.');
      const v = validatePayment(req.body, details.network);
      if (!v.ok) return fail(res, 400, v.error);
      const payment = await payoutRepository.createPayment({
        submissionId: s.id,
        award: award.award,
        amount: award.amount,
        currency: award.currency,
        network: details.network,
        address: details.address,
        ...v.value,
        paidBy: actorId(req),
      });
      if (award.award === 'ecosystem' && s.details.milestone) {
        await programSubmissionRepository.updateTracked(s.id, {
          milestone: { ...s.details.milestone, payoutStatus: 'released', payoutReleasedAt: payment.paidAt },
        });
      }
      const paid = await syncPaid(s, ctx.tracked, actorId(req));
      const email = req.body?.notify === false ? { ok: false, reason: 'skipped' } : await emailPaid({ program: ctx.program, s, award, payment });
      res.status(200).json({
        status: 'success',
        data: { payment: { ...payment, txUrl: explorerUrl(payment.network, payment.txHash) }, paid, emailed: email.ok, emailReason: email.reason ?? null },
      });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: actorOf(req),
        action: 'payout.paid',
        targetType: 'submission',
        targetId: s.id,
        metadata: { award: award.award, amount: award.amount, currency: award.currency, network: payment.network, txHash: payment.txHash, emailed: email.ok },
      });
    } catch (error) {
      console.error('❌ Error recording a payment:', error);
      fail(res, 500, 'Failed to record the payment');
    }
  }

  // Platform admin: undo a payment record (a mistake). Does not email anyone.
  async deletePayment(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can undo payments');
      const ctx = await loadProgram(req, res);
      if (!ctx) return;
      const s = await loadEntry(req, res, ctx.program);
      if (!s) return;
      const removed = await payoutRepository.deletePayment(s.id, req.params.award);
      if (!removed) return fail(res, 404, 'No payment recorded for this award');
      if (removed.award === 'ecosystem' && s.details.milestone?.payoutStatus === 'released') {
        await programSubmissionRepository.updateTracked(s.id, {
          milestone: { ...s.details.milestone, payoutStatus: 'pending', payoutReleasedAt: null },
        });
      }
      const paid = await syncPaid(s, ctx.tracked, actorId(req));
      res.status(200).json({ status: 'success', data: { paid } });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: actorOf(req),
        action: 'payout.unpaid',
        targetType: 'submission',
        targetId: s.id,
        metadata: { award: removed.award, txHash: removed.txHash },
      });
    } catch (error) {
      console.error('❌ Error undoing a payment:', error);
      fail(res, 500, 'Failed to undo the payment');
    }
  }

  // Platform admin: email the payout link to winners who haven't sent details
  // (or to one entry: body.submissionId). Never automatic.
  async requestDetails(req, res) {
    try {
      if (!isPlatformAdmin(req)) return fail(res, 403, 'Only platform admins can email payout links');
      const ctx = await loadProgram(req, res);
      if (!ctx) return;
      if (!ctx.program.resultsPublishedAt) return fail(res, 409, 'Publish the results first');
      const transport = await getEmailTransport();
      if (!transport) return fail(res, 503, 'Email is not configured on this server');
      const only = typeof req.body?.submissionId === 'string' ? req.body.submissionId : null;
      const rows = await loadPayouts(ctx.program, ctx.tracked);
      const targets = rows.filter(
        (r) => (!only || r.submissionId === only) && !r.details && r.awards.some((a) => a.payable && a.due !== 'forfeited'),
      );
      let sent = 0;
      let failed = 0;
      for (const r of targets) {
        try {
          const { subject, html, text } = renderEmail('payout_request', {
            submitterName: r.submitterName,
            programName: ctx.program.name,
            projectTitle: r.projectTitle,
            awardsText: awardsText(r.awards),
            currency: ctx.tracked.payout.currency,
            deadline: ctx.tracked.payout.detailsDeadline ?? null,
            link: projectLink(ctx.program, r.submissionId),
          });
          await transport.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: r.email,
            replyTo: process.env.PRIZE_CONTACT_EMAIL || process.env.RESEND_FROM_EMAIL,
            subject,
            html,
            text,
          });
          sent += 1;
        } catch (err) {
          failed += 1;
          console.error('❌ Payout request email failed:', err?.message || err);
        }
      }
      res.status(200).json({ status: 'success', data: { sent, failed, eligible: targets.length } });
      auditLog.logSafe({
        programId: ctx.program.id,
        actor: actorOf(req),
        action: 'payout.request_sent',
        targetType: 'program',
        targetId: ctx.program.id,
        metadata: { sent, failed, submissionId: only },
      });
    } catch (error) {
      console.error('❌ Error emailing payout links:', error);
      fail(res, 500, 'Failed to email payout links');
    }
  }
}

export default new PayoutController();
