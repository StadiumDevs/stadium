import { describe, it, expect } from 'vitest';
import { parseLumaCsv } from '../luma-csv.parser.js';

describe('parseLumaCsv', () => {
  it('returns no rows for empty input', async () => {
    const r = await parseLumaCsv('');
    expect(r.rows).toEqual([]);
    expect(r.skipped).toBe(0);
    expect(r.totalParsed).toBe(0);
  });

  it('parses the canonical Luma export header set', async () => {
    const csv = [
      'Name,Email,Wallet,Registered At',
      'Alice,alice@example.com,5GrwvaEF...,2026-05-10T12:00:00Z',
      'Bob,BOB@example.com,,2026-05-11T08:30:00Z',
    ].join('\n');
    const r = await parseLumaCsv(csv);
    expect(r.totalParsed).toBe(2);
    expect(r.skipped).toBe(0);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({
      email: 'alice@example.com',
      name: 'Alice',
      wallet: '5GrwvaEF...',
      registeredAt: '2026-05-10T12:00:00.000Z',
    });
    // Email is normalized to lowercase for dedup.
    expect(r.rows[1].email).toBe('bob@example.com');
    expect(r.rows[1].wallet).toBeNull();
  });

  it('accepts header synonyms (email_address, full name, registration date, etc.)', async () => {
    const csv = [
      'Full Name,Email Address,Crypto Wallet,Registration Date',
      'Cathy,cathy@example.com,0xdeadbeef,2026-05-12',
    ].join('\n');
    const r = await parseLumaCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      email: 'cathy@example.com',
      name: 'Cathy',
      wallet: '0xdeadbeef',
    });
    expect(r.rows[0].registeredAt).not.toBeNull();
  });

  it('skips rows missing an email and preserves all other rows', async () => {
    const csv = [
      'Name,Email',
      'NoEmail,',
      'BadEmail,not-an-address',
      'Good,good@example.com',
    ].join('\n');
    const r = await parseLumaCsv(csv);
    expect(r.totalParsed).toBe(3);
    expect(r.skipped).toBe(2);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].email).toBe('good@example.com');
  });

  it('preserves unmodelled columns in rawRow', async () => {
    const csv = [
      'Name,Email,Ticket Type,Custom Q',
      'Alice,alice@example.com,VIP,Ethereum + Solana',
    ].join('\n');
    const r = await parseLumaCsv(csv);
    expect(r.rows[0].rawRow).toMatchObject({
      'Ticket Type': 'VIP',
      'Custom Q': 'Ethereum + Solana',
    });
  });

  it('returns null registeredAt for an unparseable date', async () => {
    const csv = ['Name,Email,Registered At', 'Alice,alice@example.com,not-a-date'].join('\n');
    const r = await parseLumaCsv(csv);
    expect(r.rows[0].registeredAt).toBeNull();
  });
});
