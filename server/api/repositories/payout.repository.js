import { supabase } from '../../db.js';
import { generateId } from '../utils/id.js';

// Prize payouts: the winner's payout details and one payment per award.
// Tables: submission_payout_details, submission_payments
// (supabase/migrations/20261111000000_submission_payouts.sql). Service role only.

const detailsOf = (row) =>
  row
    ? {
        submissionId: row.submission_id,
        legalName: row.legal_name,
        taxCountry: row.tax_country,
        network: row.network,
        address: row.address,
        confirmedAt: row.confirmed_at,
        submittedByEmail: row.submitted_by_email ?? null,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by ?? null,
      }
    : null;

const paymentOf = (row) =>
  row
    ? {
        id: row.id,
        submissionId: row.submission_id,
        award: row.award,
        amount: Number(row.amount),
        currency: row.currency,
        network: row.network,
        address: row.address,
        txHash: row.tx_hash,
        paidAt: row.paid_at,
        paidBy: row.paid_by ?? null,
        note: row.note ?? null,
        notifiedAt: row.notified_at ?? null,
      }
    : null;

class PayoutRepository {
  async getDetails(submissionId) {
    const { data, error } = await supabase.from('submission_payout_details').select('*').eq('submission_id', submissionId).maybeSingle();
    if (error) throw error;
    return detailsOf(data);
  }

  async listDetails(submissionIds) {
    if (!submissionIds.length) return [];
    const { data, error } = await supabase.from('submission_payout_details').select('*').in('submission_id', submissionIds);
    if (error) throw error;
    return (data || []).map(detailsOf);
  }

  /** Saves the details; `by` is the email or wallet that saved them. */
  async upsertDetails(submissionId, { legalName, taxCountry, network, address }, { by, email = null } = {}) {
    const at = new Date().toISOString();
    const row = {
      submission_id: submissionId,
      legal_name: legalName,
      tax_country: taxCountry,
      network,
      address,
      confirmed_at: at,
      updated_at: at,
      updated_by: by ?? null,
    };
    if (email) row.submitted_by_email = email;
    const { data, error } = await supabase.from('submission_payout_details').upsert(row, { onConflict: 'submission_id' }).select('*').single();
    if (error) throw error;
    return detailsOf(data);
  }

  async listPayments(submissionIds) {
    if (!submissionIds.length) return [];
    const { data, error } = await supabase.from('submission_payments').select('*').in('submission_id', submissionIds);
    if (error) throw error;
    return (data || []).map(paymentOf);
  }

  async createPayment(p) {
    const { data, error } = await supabase
      .from('submission_payments')
      .insert({
        id: generateId('payment', { randomBytes: 6 }),
        submission_id: p.submissionId,
        award: p.award,
        amount: p.amount,
        currency: p.currency,
        network: p.network,
        address: p.address,
        tx_hash: p.txHash,
        paid_at: p.paidAt,
        paid_by: p.paidBy ?? null,
        note: p.note ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return paymentOf(data);
  }

  async markNotified(id) {
    const { error } = await supabase.from('submission_payments').update({ notified_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  async deletePayment(submissionId, award) {
    const { data, error } = await supabase.from('submission_payments').delete().eq('submission_id', submissionId).eq('award', award).select('*');
    if (error) throw error;
    return (data || []).map(paymentOf)[0] ?? null;
  }
}

export default new PayoutRepository();
