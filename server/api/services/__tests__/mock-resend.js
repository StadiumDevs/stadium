import { vi } from 'vitest';

export const mockResend = {
  send: vi.fn().mockResolvedValue({ id: 'res_test_default' }),
};
