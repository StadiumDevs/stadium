---
description: One-shot sanity check that the Playwright MCP server is loaded and stadium-tester can drive a browser. Run once after any change to .mcp.json or on a fresh machine.
---

Verify the `stadium-tester` + Playwright MCP wiring is live in this session. No PRs, no commits — just a health check.

## Steps

1. **Check MCP tools are loaded.**
   Look for tool names starting with `mcp__playwright__` in this session. If none are visible, stop and tell the user: `.mcp.json` requires a Claude Code restart in this project directory, plus approval of the Playwright server on first launch. Do not proceed.

2. **Confirm Playwright runs.**
   ```bash
   npx @playwright/mcp@latest --help
   ```
   Should return usage text. If it fails, check Node version and network.

3. **Start a local target.**
   ```bash
   cd client && VITE_USE_MOCK_DATA=true npm run dev
   ```
   (Ask the user to run this in another terminal if the current session can't hold a long-running process.)

4. **Invoke `stadium-tester`** with these trivial scenarios against `http://localhost:5173`:
   - On `/`, page loads → `<title>` or visible header contains "Stadium"
   - On `/winners`, page loads → at least one winner row is visible in the DOM
   - Preview-mode sanity → `window.__STADIUM_MOCK__` evaluates to `true`

5. **Expected output**: `stadium-tester` returns a pass/fail table with 3 scenarios, `__STADIUM_MOCK__ = true`, zero console errors.

## Pass criteria

- All three scenarios PASS
- Tester reports `__STADIUM_MOCK__ = true`
- No MCP-related errors

If any step fails, report the exact error to the user. Common failures:
- `.mcp.json` not picked up → restart Claude Code
- Chromium download timing out → retry; first run is ~150MB
- MCP server not approved → user must approve on first launch dialog
- Local dev server not on 5173 → Vite may have picked another port; check terminal output and retry with that URL
