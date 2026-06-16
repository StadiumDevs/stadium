import { describe, it, expect } from 'vitest';
import { validateStatement, VALID_STATEMENTS } from '../statements.js';

describe('validateStatement', () => {
  it('accepts every exact-match statement', () => {
    for (const statement of VALID_STATEMENTS) {
      expect(validateStatement(statement)).toBe(true);
    }
  });

  it('accepts the publish-results statement the client signs (client↔server contract)', () => {
    // generateSiwsStatement('publish-results') in client/src/lib/siwsUtils.ts.
    expect(validateStatement('Publish results on Stadium')).toBe(true);
  });

  it('accepts project-specific statements via pattern match', () => {
    expect(validateStatement('Update team members for Acme Rocket on Stadium')).toBe(true);
    expect(validateStatement('Approve project Acme Rocket on Stadium')).toBe(true);
    expect(validateStatement('Apply project Acme Rocket to program WebZero on Stadium')).toBe(true);
  });

  it('rejects unknown statements', () => {
    expect(validateStatement('Some unknown statement')).toBe(false);
    expect(validateStatement('Drain the treasury on Stadium')).toBe(false);
    expect(validateStatement('')).toBe(false);
  });

  it('rejects a statement that omits the trailing " on Stadium"', () => {
    expect(validateStatement('Update team members for Acme Rocket')).toBe(false);
  });
});
