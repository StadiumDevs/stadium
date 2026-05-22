import { describe, it, expect } from 'vitest';
import { csvCell, csvRow } from '../csv.js';

describe('csvCell', () => {
  it('passes plain values through unchanged', () => {
    expect(csvCell('hello')).toBe('hello');
    expect(csvCell(42)).toBe('42');
  });

  it('renders null/undefined as an empty string', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
  });

  it('quotes and escapes values containing commas, quotes, or newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralizes formula-injection leads with a sentinel quote', () => {
    expect(csvCell('=HYPERLINK(http://evil)')).toBe("'=HYPERLINK(http://evil)");
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });

  it('still quotes a formula cell that also contains a comma', () => {
    // sentinel is applied first, then RFC-4180 quoting wraps the comma
    expect(csvCell('=A1,B1')).toBe('"\'=A1,B1"');
  });
});

describe('csvRow', () => {
  it('escapes every cell and joins with commas', () => {
    expect(csvRow(['a', 'b,c', '=x'])).toBe('a,"b,c",\'=x');
  });
});
