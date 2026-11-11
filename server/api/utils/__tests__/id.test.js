import { describe, it, expect } from 'vitest';
import { generateId, shortenId, parseShortId } from '../id.js';

const LONG = 'zcash-now-a-keyless-mcp-server-and-llms-txt-that-keep-ai-coding-agents-current-on-zcash-so-a-developer-new-to-zcash-gets-code-that-works-on-today-s-nu7-testnet-the-first-time-70fbde';

describe('project ids and URLs', () => {
  it('new ids keep at most 6 words before the random suffix', () => {
    const id = generateId('Zcash Now: a keyless MCP server and llms.txt that keep AI coding agents current');
    expect(id).toMatch(/^zcash-now-a-keyless-mcp-server-[0-9a-f]{6}$/);
    expect(generateId('Short Name')).toMatch(/^short-name-[0-9a-f]{6}$/);
    expect(generateId('payment', { randomBytes: 6 })).toMatch(/^payment-[0-9a-f]{12}$/);
  });

  it('shortenId gives the URL form of a long existing id; short or odd ids are unchanged', () => {
    expect(shortenId(LONG)).toBe('zcash-now-a-keyless-mcp-server-70fbde');
    expect(shortenId('six-words-are-fine-as-is-abc123')).toBe('six-words-are-fine-as-is-abc123');
    expect(shortenId('legacy_id_with_underscores')).toBe('legacy_id_with_underscores');
    expect(shortenId('a-b-c-d-e-f-g-not-a-hash')).toBe('a-b-c-d-e-f-g-not-a-hash');
  });

  it('parseShortId splits a shortened id; anything else is null (no LIKE wildcards get through)', () => {
    expect(parseShortId('zcash-now-a-keyless-mcp-server-70fbde')).toEqual({ prefix: 'zcash-now-a-keyless-mcp-server', suffix: '70fbde' });
    expect(parseShortId('short-name-70fbde')).toBeNull();
    expect(parseShortId('a%b-c-d-e-f-g-70fbde')).toBeNull();
    expect(parseShortId('a_b-c-d-e-f-g-70fbde')).toBeNull();
    expect(parseShortId(LONG)).toBeNull();
  });
});
