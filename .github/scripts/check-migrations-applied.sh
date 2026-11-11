#!/usr/bin/env bash
# Fails when a migration in supabase/migrations/ has not been applied to the
# production database. Merging to main deploys code, never migrations
# (docs/PRODUCTION_DEPLOYMENT.md), so a release must not ship ahead of its
# schema: #280 did, and the payouts admin page failed until the migration ran.
#
# Remote versions come from supabase_migrations.schema_migrations (what
# `supabase db push` / `migration repair` record):
#   - CI: psql against $SUPABASE_MIGRATIONS_DB_URL (a read-only role, see
#     docs/PRODUCTION_DEPLOYMENT.md).
#   - Local test: REMOTE_VERSIONS_FILE=<file with one version per line>.
set -euo pipefail

MIGRATIONS_DIR="${MIGRATIONS_DIR:-supabase/migrations}"

# Local versions: the numeric prefix of each <version>_<name>.sql file.
local_versions=$(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -exec basename {} \; \
  | sed -nE 's/^([0-9]+)_.*\.sql$/\1/p' | sort -u)

if [[ -n "${REMOTE_VERSIONS_FILE:-}" ]]; then
  remote_versions=$(sed 's/[[:space:]]//g' "$REMOTE_VERSIONS_FILE" | grep -v '^$' | sort -u)
else
  if [[ -z "${SUPABASE_MIGRATIONS_DB_URL:-}" ]]; then
    echo "::error::SUPABASE_MIGRATIONS_DB_URL is not set. Add it as a repo secret (read-only role; see docs/PRODUCTION_DEPLOYMENT.md, 'Migrations check')."
    exit 1
  fi
  remote_versions=$(psql "$SUPABASE_MIGRATIONS_DB_URL" -X -A -t -v ON_ERROR_STOP=1 \
    -c "select version from supabase_migrations.schema_migrations order by version" | sed 's/[[:space:]]//g' | grep -v '^$' | sort -u)
fi

missing=$(comm -23 <(echo "$local_versions") <(echo "$remote_versions") | grep -v '^$' || true)
remote_only=$(comm -13 <(echo "$local_versions") <(echo "$remote_versions") | grep -v '^$' || true)

echo "Migrations in repo: $(echo "$local_versions" | grep -c . || true); applied in production: $(echo "$remote_versions" | grep -c . || true)"

if [[ -n "$remote_only" ]]; then
  while read -r v; do
    echo "::warning::Applied in production but not in the repo: $v"
  done <<< "$remote_only"
fi

if [[ -n "$missing" ]]; then
  echo "::error::Not yet applied to production. Apply before merging this release (supabase db push), then re-run this check:"
  while read -r v; do
    f=$(find "$MIGRATIONS_DIR" -maxdepth 1 -name "${v}_*.sql" -exec basename {} \; | head -1)
    echo "::error file=$MIGRATIONS_DIR/$f::Migration not applied to production: $f"
  done <<< "$missing"
  exit 1
fi

echo "All migrations in the repo are applied to production."
