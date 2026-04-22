# Migration data

Source-of-truth data for Stadium's historical hackathons. The files in this directory back both the one-time migration (into Supabase) and any subsequent data reconciliation scripts.

Never edit these files to reflect app state — edit them to reflect **what actually happened at the event**. Scripts align the DB to these files, not the other way around.

## Files

### `payouts.csv`

Payout records for **symmetry-2024** and **synergy-2025**. Columns: `hackathon-id, Project, Total Prize (USDC), Address, Milestone 1, Milestone 2, Call Data`. Used by the (deleted, to be restored per issue [#28](https://github.com/StadiumDevs/stadium/issues/28)) `fix-bounty-amounts-supabase.js` script.

Does **not** contain symbiosis-2025 rows — that event is covered by `prizes-symbiosis-2025.csv` below.

### `prizes-symbiosis-2025.csv`

Per-project, per-track prize list for **symbiosis-2025**. Columns:

- `hackathon_id` — constant `symbiosis-2025`.
- `project` — project name as it appeared at the event (may not match Stadium's `project_name` exactly; reconciliation script should tolerate minor formatting differences).
- `track` — the track / bounty name the project won (IDEA-THON, SHIP-A-THON, Kusama, Hyperbridge, Marketing 1, Marketing 2, xx Network).
- `total_prize_amount` — numeric value.
- `currency` — `USDC` or `xx` (xx-network tokens denominated by their USD value at the time).
- `notes` — provenance or caveats where relevant.

**A single project can appear in multiple rows** if it won multiple tracks. Plata Mia for example appears three times (IDEA-THON, Hyperbridge, xx Network).

#### Track → `bounty_prizes.name` normalisation

The CSV's `track` column stores the authentic event track name (IDEA-THON, SHIP-A-THON, etc.). Stadium's `bounty_prizes.name` stores a slightly normalised string so that existing main-track substring filters keep working:

| CSV `track` | Stadium `bounty_prizes.name` | Why |
| --- | --- | --- |
| `IDEA-THON` | `IDEA-THON main track` | IDEA-THON is a main-track variant; Stadium's M2 filter uses `.includes('main track')`. The tag is preserved as a prefix. |
| `SHIP-A-THON` | `SHIP-A-THON main track` | Same reasoning as IDEA-THON. |
| `Hyperbridge` | `Hyperbridge` | Non-main-track bounty; raw track name used directly. |
| `Kusama` | `Kusama` | Same. |
| `Marketing 1` / `Marketing 2` | `Marketing 1` / `Marketing 2` | Same. |
| `xx Network` | `xx Network` | Same. |

Any future reconciliation script that reads this CSV must apply the same normalisation on the way into `bounty_prizes.name`. **Do not** strip the `main track` suffix from normalised values — the substring match for M2 eligibility depends on it.

### `prizes-symbiosis-2025.source.png`

The source screenshot this CSV was transcribed from. Captured 2026-04-22 from WebZero's internal prize records. Kept in-repo so future agents can verify the transcription.

### `symbiosis-2025.json`, `synergy-2025.json`, `symmetry-2024.json`

Project metadata (name, description, team, repo, demo, etc.) for each event — not prize data. Used by the initial migration into Supabase.

## Relation to open issues

- [#27](https://github.com/StadiumDevs/stadium/issues/27) — Plata Mia's `bountyPrize` currently stores three bounties concatenated into one row with a wrong amount. `prizes-symbiosis-2025.csv` is the source of truth for the correct three-row split.
- [#28](https://github.com/StadiumDevs/stadium/issues/28) — broader bounty-amount reconciliation across all projects. Uses `payouts.csv` for the two covered hackathons and `prizes-symbiosis-2025.csv` for symbiosis-2025.

## Known gaps in the current schema

Stadium's `bounty_prizes` table has no `currency` column. The xx-network-denominated rows above are stored with their USD-equivalent amount, which can misread as USDC when totalled alongside USDC rows elsewhere. Logged as a backlog item; do not fix inline while working on #27 or #28.
