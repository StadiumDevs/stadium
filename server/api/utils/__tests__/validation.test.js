import { describe, it, expect } from 'vitest';
import { validateProgram, validateProgramContent } from '../validation.js';

describe('validateProgramContent', () => {
  it('accepts null / undefined (clears content)', () => {
    expect(validateProgramContent(null).valid).toBe(true);
    expect(validateProgramContent(undefined).valid).toBe(true);
  });

  it('rejects a non-array', () => {
    const r = validateProgramContent({ type: 'text', body: 'x' });
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/array or null/);
  });

  it('accepts an empty array', () => {
    expect(validateProgramContent([]).valid).toBe(true);
  });

  it('rejects more than 40 sections', () => {
    const many = Array.from({ length: 41 }, () => ({ type: 'text', body: 'x' }));
    expect(validateProgramContent(many).valid).toBe(false);
  });

  it('rejects an unknown section type', () => {
    const r = validateProgramContent([{ type: 'banner', body: 'x' }]);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/content\[0\]\.type/);
  });

  it('accepts a full, well-formed content array', () => {
    const content = [
      { type: 'text', title: 'Why', body: 'Because.' },
      { type: 'steps', title: 'Do', items: ['Pick a product', 'Use it'] },
      { type: 'schedule', rows: [{ time: '1:00 PM', label: 'Doors open' }] },
      {
        type: 'lineup',
        items: [
          {
            name: 'Open Arkiv',
            blurb: 'Censorship-resistant data.',
            tryItems: ['Download the app', 'Send a message'],
            links: [{ label: 'Website', url: 'https://openarkiv.vercel.app/' }],
          },
        ],
      },
      { type: 'stats', items: [{ label: 'Products tested', value: '4' }] },
      {
        type: 'feedback',
        items: [{ product: 'Khoj', quote: 'Steps were easy.', rating: '5/7', recommend: true }],
      },
      { type: 'cta', label: 'Feedback form', url: 'https://example.com/form' },
    ];
    expect(validateProgramContent(content).valid).toBe(true);
  });

  it('requires a body on text sections', () => {
    expect(validateProgramContent([{ type: 'text' }]).valid).toBe(false);
  });

  it('requires http(s) urls on cta', () => {
    const r = validateProgramContent([{ type: 'cta', label: 'x', url: 'ftp://nope' }]);
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/http\(s\) URL/);
  });

  it('requires http(s) urls on lineup links', () => {
    const r = validateProgramContent([
      { type: 'lineup', items: [{ name: 'X', links: [{ label: 'site', url: 'nope' }] }] },
    ]);
    expect(r.valid).toBe(false);
  });

  it('rejects a non-string step item', () => {
    const r = validateProgramContent([{ type: 'steps', items: ['ok', 42] }]);
    expect(r.valid).toBe(false);
  });

  it('rejects a non-boolean recommend on feedback', () => {
    const r = validateProgramContent([
      { type: 'feedback', items: [{ quote: 'hi', recommend: 'yes' }] },
    ]);
    expect(r.valid).toBe(false);
  });
});

describe('validateProgram with content', () => {
  const base = { name: 'Dogfooding', slug: 'dogfooding-x', programType: 'dogfooding', status: 'open' };

  it('accepts a program carrying valid content', () => {
    const r = validateProgram({ ...base, content: [{ type: 'text', body: 'hi' }] });
    expect(r.valid).toBe(true);
  });

  it('rejects a program carrying invalid content', () => {
    const r = validateProgram({ ...base, content: [{ type: 'text' }] });
    expect(r.valid).toBe(false);
  });

  it('allows clearing content with null in a partial patch', () => {
    const r = validateProgram({ content: null }, { partial: true });
    expect(r.valid).toBe(true);
  });
});
