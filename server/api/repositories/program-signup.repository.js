import { supabase } from '../../db.js';

const transformSignup = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    programId: row.program_id,
    email: row.email,
    name: row.name,
    wallet: row.wallet,
    registeredAt: row.registered_at,
    source: row.source,
    rawRow: row.raw_row,
    importedInBatchAt: row.imported_in_batch_at,
    createdAt: row.created_at,
  };
};

class ProgramSignupRepository {
  async listByProgramId(programId) {
    const { data, error } = await supabase
      .from('program_signups')
      .select('*')
      .eq('program_id', programId)
      .order('registered_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(transformSignup);
  }

  async listEmailsByProgramId(programId) {
    const { data, error } = await supabase
      .from('program_signups')
      .select('email')
      .eq('program_id', programId);
    if (error) throw error;
    return new Set((data || []).map((r) => r.email));
  }

  async findById(id) {
    const { data, error } = await supabase
      .from('program_signups')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return transformSignup(data);
  }

  /**
   * Insert many signup rows. Each row must already have programId + email set.
   * Returns the inserted rows. Caller is responsible for filtering out dups
   * before calling (so the parser's `skipped` count stays meaningful).
   */
  async insertMany(rows) {
    if (!rows.length) return [];
    // Stamp every row in a batch with the same timestamp so admins can read
    // "last imported X days ago" off MAX(imported_in_batch_at).
    const batchAt = new Date().toISOString();
    const payload = rows.map((r) => ({
      program_id: r.programId,
      email: r.email,
      name: r.name ?? null,
      wallet: r.wallet ?? null,
      registered_at: r.registeredAt ?? null,
      source: r.source || 'luma',
      raw_row: r.rawRow ?? null,
      imported_in_batch_at: batchAt,
    }));
    const { data, error } = await supabase
      .from('program_signups')
      .insert(payload)
      .select('*');
    if (error) throw error;
    return (data || []).map(transformSignup);
  }

  // Reconcile the synced Luma check-in set into program_signups. Upserts every
  // currently-checked-in guest as source='luma_api', then deletes any prior
  // 'luma_api' row whose email is no longer in the set. Rows from other sources
  // ('luma' CSV import, 'manual' admin fallback) are never touched, so the
  // manual escape hatch survives every sync. Returns { upserted, removed }.
  //
  // `guests` is [{ email, name }] (already lowercased + checked-in by the
  // caller). The caller is responsible for the sanity guard (never call this
  // with an empty set when the cache is non-empty).
  async replaceLumaGuests(programId, guests) {
    const batchAt = new Date().toISOString();
    const seen = new Set();
    const payload = [];
    for (const g of guests) {
      const email = typeof g.email === 'string' ? g.email.trim().toLowerCase() : '';
      if (!email || seen.has(email)) continue;
      seen.add(email);
      payload.push({
        program_id: programId,
        email,
        name: g.name ?? null,
        source: 'luma_api',
        imported_in_batch_at: batchAt,
      });
    }

    if (payload.length) {
      const { error } = await supabase
        .from('program_signups')
        .upsert(payload, { onConflict: 'program_id,email' });
      if (error) throw error;
    }

    // Remove luma_api rows that fell out of the checked-in set (e.g. a check-in
    // was undone, or the event id changed). Done in JS membership since
    // Supabase can't express "delete where email NOT IN (large list)" cleanly.
    const { data: existing, error: selErr } = await supabase
      .from('program_signups')
      .select('id, email')
      .eq('program_id', programId)
      .eq('source', 'luma_api');
    if (selErr) throw selErr;
    const stale = (existing || []).filter(
      (r) => !seen.has(String(r.email).trim().toLowerCase()),
    );
    let removed = 0;
    if (stale.length) {
      const { error: delErr } = await supabase
        .from('program_signups')
        .delete()
        .in('id', stale.map((r) => r.id));
      if (delErr) throw delErr;
      removed = stale.length;
    }
    return { upserted: payload.length, removed };
  }

  // Manual single-email add (admin fallback for the event-day edge cases Luma
  // can't cover). Idempotent: re-adding an existing email is a no-op success.
  // Returns the row.
  async addManual(programId, email, name = null) {
    const normalized = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!normalized) throw new Error('email required');
    const { data, error } = await supabase
      .from('program_signups')
      .upsert(
        {
          program_id: programId,
          email: normalized,
          name: name ?? null,
          source: 'manual',
          imported_in_batch_at: new Date().toISOString(),
        },
        { onConflict: 'program_id,email' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return transformSignup(data);
  }

  async lastImportedAt(programId) {
    const { data, error } = await supabase
      .from('program_signups')
      .select('imported_in_batch_at')
      .eq('program_id', programId)
      .not('imported_in_batch_at', 'is', null)
      .order('imported_in_batch_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.imported_in_batch_at ?? null;
  }

  async delete(id) {
    const { error } = await supabase.from('program_signups').delete().eq('id', id);
    if (error) throw error;
  }

  // Case-insensitive membership check: is this email on the program's signup
  // (checked-in / approved guest) list? Compares in JS so it stays correct
  // regardless of how emails were cased on import.
  async existsByEmail(programId, email) {
    const target = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!target) return false;
    const emails = await this.listEmailsByProgramId(programId);
    for (const e of emails) {
      if (typeof e === 'string' && e.trim().toLowerCase() === target) return true;
    }
    return false;
  }

  async countBySource(programId, source) {
    const { count, error } = await supabase
      .from('program_signups')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId)
      .eq('source', source);
    if (error) throw error;
    return count ?? 0;
  }

  async countByProgramId(programId) {
    const { count, error } = await supabase
      .from('program_signups')
      .select('*', { count: 'exact', head: true })
      .eq('program_id', programId);
    if (error) throw error;
    return count ?? 0;
  }
}

export default new ProgramSignupRepository();
