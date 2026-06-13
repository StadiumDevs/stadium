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
