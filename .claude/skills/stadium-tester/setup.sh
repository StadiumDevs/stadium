#!/usr/bin/env bash
# Idempotent installer for the stadium-tester skill.
# Installs @playwright/test as a dev-dep in client/ and downloads the Chromium
# browser binary. Safe to run repeatedly — both steps are no-ops if already done.
#
# Run from the repo root:
#   bash .claude/skills/stadium-tester/setup.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CLIENT_DIR="$REPO_ROOT/client"

if [ ! -d "$CLIENT_DIR" ]; then
  echo "ERROR: client/ directory not found at $CLIENT_DIR" >&2
  exit 1
fi

cd "$CLIENT_DIR"

# Step 1: ensure @playwright/test is installed locally
if [ -d "node_modules/@playwright/test" ]; then
  echo "✓ @playwright/test already installed"
else
  echo "→ installing @playwright/test (dev dep) ..."
  npm install --save-dev --silent @playwright/test
  echo "✓ @playwright/test installed"
fi

# Step 2: ensure Chromium browser binary is downloaded
# `npx playwright install chromium` is idempotent — it skips if already present.
echo "→ ensuring Chromium browser binary is present ..."
npx --yes playwright install chromium

echo
echo "✓ stadium-tester is ready. Smoke test:"
echo "    cd client && VITE_USE_MOCK_DATA=true npm run dev   # in another terminal"
echo "    /stadium-tester http://localhost:8080 \"- [ ] On /, page loads → header contains \\\"Stadium\\\"\""
