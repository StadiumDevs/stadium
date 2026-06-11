/**
 * Minimal in-memory fake of the Supabase client, covering the query surface the
 * repositories actually use: from().select/insert/upsert/delete, .eq, .order,
 * .limit, .maybeSingle/.single, count+head, and onConflict upserts. Tables are
 * created lazily, so writes to tables the simulation doesn't seed (e.g.
 * program_audit_logs) just work.
 *
 * This is test/sim infrastructure only — it never ships and is not wired to any
 * route. It lets the judging simulation drive the REAL services/repositories
 * without a live Supabase.
 */
export function createFakeSupabase(initial = {}) {
  const store = { ...initial };
  const getTable = (name) => {
    if (!store[name]) store[name] = [];
    return store[name];
  };

  const makeBuilder = (table) => {
    const state = {
      op: 'select',
      count: false,
      head: false,
      filters: [],
      orders: [],
      limitN: null,
      payload: null,
      conflict: null,
      returning: false,
      _result: null,
    };

    const matches = (row) => state.filters.every((f) => row[f.col] === f.val);

    const mutate = () => {
      const t = getTable(table);
      const rows = Array.isArray(state.payload) ? state.payload : [state.payload];
      if (state.op === 'insert') {
        const inserted = rows.map((r) => ({ ...r }));
        t.push(...inserted);
        state._result = inserted;
      } else if (state.op === 'upsert') {
        const cols = state.conflict ? state.conflict.split(',').map((s) => s.trim()) : [];
        state._result = rows.map((r) => {
          const idx = cols.length ? t.findIndex((e) => cols.every((c) => e[c] === r[c])) : -1;
          if (idx >= 0) {
            t[idx] = { ...t[idx], ...r };
            return t[idx];
          }
          const nr = { ...r };
          t.push(nr);
          return nr;
        });
      }
    };

    const settle = (single) => {
      if (state.op === 'insert' || state.op === 'upsert') {
        const data = state.returning ? state._result : null;
        return { data: single ? (data ? data[0] ?? null : null) : data, error: null };
      }
      if (state.op === 'delete') {
        store[table] = getTable(table).filter((r) => !matches(r));
        return { data: null, error: null };
      }
      if (state.op === 'update') {
        const rows = getTable(table).filter(matches);
        rows.forEach((r) => Object.assign(r, state.payload));
        return { data: single ? rows[0] ?? null : rows, error: null };
      }
      // select
      let rows = getTable(table).filter(matches);
      for (const o of [...state.orders].reverse()) {
        rows = [...rows].sort((a, b) => {
          const av = a[o.col];
          const bv = b[o.col];
          if (av === bv) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          return (av < bv ? -1 : 1) * (o.asc ? 1 : -1);
        });
      }
      if (state.limitN != null) rows = rows.slice(0, state.limitN);
      if (state.head && state.count) return { count: rows.length, data: null, error: null };
      if (state.count) return { count: rows.length, data: rows, error: null };
      return { data: single ? rows[0] ?? null : rows, error: null };
    };

    const builder = {
      select(_cols, opts) {
        if (opts) {
          state.count = opts.count === 'exact' || !!opts.count;
          state.head = !!opts.head;
        }
        state.returning = true;
        return builder;
      },
      insert(payload) {
        state.op = 'insert';
        state.payload = payload;
        mutate();
        return builder;
      },
      upsert(payload, opts) {
        state.op = 'upsert';
        state.payload = payload;
        state.conflict = opts?.onConflict ?? null;
        mutate();
        return builder;
      },
      delete() {
        state.op = 'delete';
        return builder;
      },
      update(payload) {
        state.op = 'update';
        state.payload = payload;
        return builder;
      },
      eq(col, val) {
        state.filters.push({ col, val });
        return builder;
      },
      neq() {
        return builder;
      },
      not() {
        return builder;
      },
      order(col, opts) {
        state.orders.push({ col, asc: opts?.ascending !== false });
        return builder;
      },
      limit(n) {
        state.limitN = n;
        return builder;
      },
      maybeSingle() {
        return Promise.resolve(settle(true));
      },
      single() {
        return Promise.resolve(settle(true));
      },
      then(resolve, reject) {
        try {
          resolve(settle(false));
        } catch (e) {
          if (reject) reject(e);
        }
      },
    };
    return builder;
  };

  return {
    store,
    supabase: { from: (table) => makeBuilder(table) },
  };
}
