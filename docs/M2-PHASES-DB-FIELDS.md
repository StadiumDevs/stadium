# M2 phases: DB fields required

This doc describes which **database fields** must be set for projects to appear in **Recently shipped**, **M2 graduates**, and **Under review** on the client.

**Main track only:** The M2 program and “Recently shipped” include **only main track winners**. A project is considered main track if at least one `bountyPrize[].name` contains the phrase `"main track"` (case-insensitive), e.g. “Polkadot main track”. Bounty-only winners (e.g. “Kusama bounty”, “xx Network bounty”) are excluded from the M2 program view and from the recently shipped carousel.

---

## Where each phase is used

| Phase | HomePage | M2ProgramPage |
|-------|----------|---------------|
| **Recently shipped** | Yes (carousel of latest M2 completions) | — |
| **M2 graduates** | — | Yes (“M2 Graduates” section) |
| **Under review** | — | Yes (“Under Review” section) |
| **Building** | — | Yes (“Building” section) |

---

## 1. Recently shipped (HomePage)

**Logic:** `projects.filter(p => p.m2Status === 'completed')`, then sort by `completionDate` (newest first), take first 4.

**Required in DB:**

| Field | Required | Notes |
|-------|----------|--------|
| `m2Status` | Yes | Must be `'completed'` |
| `completionDate` | Yes (recommended) | Used for sorting and display; if missing, project still appears but sorts last and date shows empty |
| `hackathon.id` | Yes | Project must be returned by `getProjects()`. HomePage can load “all” or filter by hackathon; either way the project must exist with a valid `hackathon` (e.g. `symbiosis-2025`) |
| `bountyPrize` | No for this section | Recently shipped does not filter by winner; only by `m2Status === 'completed'` |

So: set **`m2Status: 'completed'`** and **`completionDate`** (and ensure **`hackathon`** is set) for Symbiosis 2025 projects you want in “Recently shipped”.

---

## 2. M2 graduates (M2ProgramPage)

**Logic:** `projects.filter(p => p.m2Status === 'completed')`. Projects are loaded with `getProjects({ winnersOnly: true, ... })` with **no** `hackathonId`, so **all** hackathon winners (Symbiosis 2025, Synergy 2025, etc.) are included.

**Required in DB:**

| Field | Required | Notes |
|-------|----------|--------|
| `m2Status` | Yes | Must be `'completed'` |
| `completionDate` | No (optional) | Shown on ProjectCard when present |
| `bountyPrize` | Yes | Must be non-empty (project is a “winner”); otherwise it’s excluded by `winnersOnly: true` |
| `hackathon` | Yes | Must exist so the project is returned by the API |

So: for Symbiosis 2025 winners to appear in M2 graduates, set **`m2Status: 'completed'`**. They must already have **`bountyPrize`** and **`hackathon`** (e.g. `hackathon.id: 'symbiosis-2025'`).

---

## 3. Under review (M2ProgramPage)

**Logic:** `projects.filter(p => p.m2Status === 'under_review')`.

**Required in DB:**

| Field | Required | Notes |
|-------|----------|--------|
| `m2Status` | Yes | Must be `'under_review'` |
| `bountyPrize` | Yes | Non-empty so project is included when loading with `winnersOnly: true` |
| `finalSubmission` | Optional | Schema can require it when `m2Status` is `under_review`; the list view only needs `m2Status`. Set it if you want the project detail page to show submission info. |

So: set **`m2Status: 'under_review'`** (e.g. for Plata Mia). Optionally set **`finalSubmission`** for full UX.

---

## 4. Building (M2ProgramPage)

**Logic:** Building section uses `filteredProjects.filter(p => p.isWinner && p.m2Status === 'building')`. Table view uses `m2Status === 'building'`.

**Required in DB:**

| Field | Required | Notes |
|-------|----------|--------|
| `m2Status` | Yes | `'building'` or unset (client defaults missing to `'building'`) |
| `bountyPrize` | Yes | Non-empty for “winner” / `winnersOnly` |

---

## Manually adding Symbiosis 2025 to Recently shipped and M2 graduates

1. **Ensure projects exist** with:
   - `hackathon.id: 'symbiosis-2025'` (or whatever id you use for Symbiosis 2025)
   - `bountyPrize` non-empty (they are winners)

2. **For “M2 graduates” and “Recently shipped”:**
   - Set **`m2Status: 'completed'`**.
   - Set **`completionDate`** (e.g. date they completed M2) so they sort and display correctly in “Recently shipped”.

3. **M2ProgramPage** loads all winners (no hackathon filter), so any such project will appear in the M2 graduates list. **HomePage** “Recently shipped” shows the same completed projects (from whatever hackathon filter is selected; “all” includes Symbiosis 2025).

You can run a small script or use the admin/API to set `m2Status` and `completionDate` for the desired Symbiosis 2025 projects.

---

## Setting Plata Mia to “Under review”

Run:

```bash
cd server && node scripts/set-plata-mia-under-review.js
```

This sets **`m2Status: 'under_review'`** for the project named “Plata Mia” in the DB.
