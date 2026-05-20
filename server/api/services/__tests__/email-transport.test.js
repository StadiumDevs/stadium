import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

describe('getEmailTransport', () => {
  it('returns null when NODE_ENV is not test and RESEND_API_KEY is unset', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalKey = process.env.RESEND_API_KEY;

    process.env.NODE_ENV = 'production';
    delete process.env.RESEND_API_KEY;

    const { getEmailTransport } = await import('../email-transport.js');
    const result = await getEmailTransport();

    expect(result).toBeNull();

    process.env.NODE_ENV = originalEnv;
    if (originalKey !== undefined) process.env.RESEND_API_KEY = originalKey;
  });

  it('returns the mock transport (never a real Resend client) when NODE_ENV is test', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const { getEmailTransport } = await import('../email-transport.js');
    const result = await getEmailTransport();

    expect(result).not.toBeNull();
    expect(typeof result.send).toBe('function');

    process.env.NODE_ENV = originalEnv;
  });
});
