// Tiny in-process TTL cache. Used only for data that is identical for every
// caller (public program rows, public scores) to cut repeated Supabase reads.
// Never put per-user or permission-sensitive data in here.
export function createTtlCache(ttlMs) {
  const store = new Map();
  return {
    get(key) {
      const hit = store.get(key);
      if (!hit) return undefined;
      if (hit.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return hit.value;
    },
    set(key, value) {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    },
    delete(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}
