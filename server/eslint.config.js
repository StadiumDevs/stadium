// Server lint (#308). Its job is the data-access rule, enforced by code:
//   - API code reaches Supabase only through server/api/repositories/.
//   - MongoDB/Mongoose is gone (#309) and stays gone.
// Style rules are deliberately not enabled here.

const NO_MONGOOSE = {
  name: 'mongoose',
  message: 'MongoDB was removed (#309). Data lives in Supabase; use server/api/repositories/.',
};

const SUPABASE_ONLY_IN_REPOSITORIES = {
  paths: [
    NO_MONGOOSE,
    {
      name: '@supabase/supabase-js',
      message: 'Create Supabase clients only in server/db.js; query through server/api/repositories/.',
    },
  ],
  patterns: [
    {
      regex: '(^|/)db(\\.js)?$',
      message: 'Only server/api/repositories/ may import db.js. Add or extend a repository instead.',
    },
  ],
};

export default [
  { ignores: ['node_modules/**', '.papi/**', 'fixtures/**', 'coverage/**'] },
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    // Existing disable comments target style rules this config doesn't enable.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      'no-restricted-imports': ['error', SUPABASE_ONLY_IN_REPOSITORIES],
    },
  },
  {
    // Allowed to use the Supabase client directly. Everything else goes
    // through a repository. Keep this list short, with a reason for each.
    files: [
      'db.js', // builds the client
      'server.js', // connectToSupabase() at startup
      'api/repositories/**', // the data access layer
      'api/auth/supabaseUser.js', // Supabase *Auth* (verifies email-session tokens), not data
      'scripts/**', // offline tooling against the project in server/.env
      'ci/**', // boot check imports db.js with placeholder env
      'sim/**', // in-memory Supabase fake for journey tests
      '**/__tests__/**', // tests mock db.js
      'tests/**',
    ],
    rules: {
      'no-restricted-imports': ['error', { paths: [NO_MONGOOSE] }],
    },
  },
];
