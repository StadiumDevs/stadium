import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.test.{js,ts}'],
    // No live lightwalletd calls from tests (tx-check tests pass a fake transport).
    env: { TX_CHECK_DISABLED: 'true' },
  },
});
