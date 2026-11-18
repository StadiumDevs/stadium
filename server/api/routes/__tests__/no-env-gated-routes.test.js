// Routes must behave the same in every environment (#313). A route registered
// only when NODE_ENV says "development" (like the old unauthenticated
// /m2-program/dev-test-payment) is an auth special case that goes live on any
// server that forgets to set NODE_ENV=production.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, it, expect } from 'vitest';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.routes.js'));

describe('route registration', () => {
  it('finds the route files', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s does not branch on NODE_ENV', (f) => {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    expect(src).not.toMatch(/NODE_ENV/);
  });

  it('no longer registers the unauthenticated dev-test-payment route', () => {
    const src = fs.readFileSync(path.join(dir, 'm2-program.routes.js'), 'utf8');
    expect(src).not.toMatch(/dev-test-payment/);
  });
});

describe('auth middleware', () => {
  it('has no environment-dependent auth path (no NODE_ENV, no dev-bypass)', () => {
    const src = fs.readFileSync(path.join(dir, '../middleware/auth.middleware.js'), 'utf8');
    expect(src).not.toMatch(/NODE_ENV/);
    expect(src).not.toMatch(/dev-bypass|devBypass/);
  });
});
