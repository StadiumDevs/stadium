import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/__tests__/**/*.test.{js,ts}'],
    // No live lightwalletd calls from tests (tx-check tests pass a fake transport).
    // Dummy Supabase settings so db.js can build its client: tests mock every
    // query (or use sim/fakeSupabase.js) and never reach a real project.
    env: {
      TX_CHECK_DISABLED: 'true',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
  },
});
