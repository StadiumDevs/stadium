# Supabase schema and migrations

## What you need to keep

| File | Purpose | Required? |
|------|---------|------------|
| **migrations/** | Used by `supabase db push` and CLI. Do not remove. | **Yes** |
| **migrations/20251122024003_initial_schema.sql** | Placeholder so remote migration history matches; leave as-is. | **Yes** |
| **migrations/20260208000000_initial_schema_from_develop.sql** | Full initial schema (projects, team_members, etc.). | **Yes** |
| **migrations/20260208100000_add_live_url_and_payment_fields.sql** | Adds `live_url`, payment columns, `BOUNTY` milestone. | **Yes** |
| **manual_fix_schema.sql** | Idempotent SQL to run in Dashboard when fixing an existing DB (no CLI). | **Yes** (for fix workflows) |
| **fresh_project_schema.sql** | Full schema for a **new** project; run once in SQL Editor. | **Yes** (for new-project / fresh start) |

## What you can ignore

- **supabase/.temp/** – CLI cache (gitignored). Safe to delete locally; CLI recreates it.

## Summary

All SQL files in this folder are used: migrations for normal `supabase db push`, `manual_fix_schema.sql` for one-off fixes in the Dashboard, `fresh_project_schema.sql` for a brand-new project. No Supabase files here are redundant; you can remove root-level or `docs/` Supabase **documentation** if you want fewer docs, but the schema/migration files themselves should stay.
