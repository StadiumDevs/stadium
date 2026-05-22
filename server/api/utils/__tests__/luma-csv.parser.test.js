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

  // --- Tally/Typeform exports: no email column, Telegram-surrogate identity ---

  it('uses a Telegram surrogate when there is no email column', async () => {
    const csv = [
      'Please enter your name,Please provide your Telegram contact,Which project would you like to try?',
      'Ada,@ada_dev,Proof of Thought',
      'Bo,bo.handle,Chain of Providence',
    ].join('\n');
    const r = await parseLumaCsv(csv);
    expect(r.skipped).toBe(0);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({
      email: 'ada_dev@telegram.imported',
      name: 'Ada',
      telegram: '@ada_dev',
    });
    // The project column is preserved in rawRow for the public aggregate.
    expect(r.rows[0].rawRow['Which project would you like to try?']).toBe('Proof of Thought');
    // Non-@ handles are sanitised too (dots dropped).
    expect(r.rows[1].email).toBe('bohandle@telegram.imported');
  });

  it('skips email-less rows whose Telegram handle sanitises to nothing', async () => {
    const csv = [
      'Name,Telegram',
      'Ghost,@@@',
      'Real,@real_one',
    ].join('\n');
    const r = await parseLumaCsv(csv);
    expect(r.totalParsed).toBe(2);
    expect(r.skipped).toBe(1);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].email).toBe('real_one@telegram.imported');
  });

  it('prefers a real email column over Telegram when both are present', async () => {
    const csv = [
      'Name,Email,Telegram',
      'Cleo,cleo@example.com,@cleo',
    ].join('\n');
    const r = await parseLumaCsv(csv);
    expect(r.rows[0].email).toBe('cleo@example.com');
    expect(r.rows[0].telegram).toBe('@cleo');
  });

  it('parses the real PitchOff! header shape (Team member name(s), Main Telegram contact)', async () => {
    const csv = [
      '#,Team member name(s),Main Telegram contact,What did you build?,Github link or demo URL,README or project doc link,What tools did you use?',
      'abc123,Aditya Parmar,avp1598,Onchain AI provenance,https://github.com/avp1598/polkadot_hack,https://github.com/avp1598/polkadot_hack/blob/main/README.md,"Claude, Cursor and Codex"',
    ].join('\n');
    const r = await parseLumaCsv(csv);
    expect(r.skipped).toBe(0);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      name: 'Aditya Parmar',
      email: 'avp1598@telegram.imported',
      telegram: 'avp1598',
    });
    expect(r.rows[0].rawRow['What did you build?']).toBe('Onchain AI provenance');
    expect(r.rows[0].rawRow['Github link or demo URL']).toBe(
      'https://github.com/avp1598/polkadot_hack',
    );
  });
});
