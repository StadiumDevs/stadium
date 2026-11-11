import { describe, it, expect, vi, afterEach } from 'vitest';
import { createTtlCache } from '../ttl-cache.js';

afterEach(() => vi.useRealTimers());

describe('createTtlCache', () => {
  it('returns a value until it expires', () => {
    vi.useFakeTimers();
    const c = createTtlCache(1000);
    c.set('k', { a: 1 });
    expect(c.get('k')).toEqual({ a: 1 });
    vi.advanceTimersByTime(999);
    expect(c.get('k')).toEqual({ a: 1 });
    vi.advanceTimersByTime(1);
    expect(c.get('k')).toBeUndefined();
  });

  it('delete and clear drop entries; null is a cacheable value', () => {
    const c = createTtlCache(60_000);
    c.set('a', 1);
    c.set('b', null);
    expect(c.get('b')).toBeNull();
    c.delete('a');
    expect(c.get('a')).toBeUndefined();
    c.clear();
    expect(c.get('b')).toBeUndefined();
  });
});
