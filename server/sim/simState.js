import { createFakeSupabase } from './fakeSupabase.js';

// Single shared in-memory backend for the simulation. Both the mocked db.js and
// the test body import THIS module, so they observe the same store.
const { store, supabase } = createFakeSupabase();

// token -> { id, email }, populated as the organizer "invites" judges.
const authRegistry = new Map();

export { store, supabase, authRegistry };
