# Supabase Migration — Design Spec

## Problem

Player data is stored in browser localStorage, which is fragile — clearing browser data, using a different browser/device, or opening the app in Playwright all cause data loss. Multiple coaches need to access the same data from different devices.

## Solution

Replace localStorage with Supabase (free-tier PostgreSQL) as the primary data store. Use localStorage as a write-through cache for offline resilience.

## Access Model

- No authentication — anyone with the link has full read/write access
- No Row Level Security — all rows accessible to the anonymous public role

## Database Schema

One Supabase project, one table:

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY,
  season TEXT NOT NULL DEFAULT '25-26',
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_season ON players(season);
```

- `id`: Player UUID (matches existing `player.id`)
- `season`: Season identifier (e.g., `'25-26'`), maps to `DB.getActiveSeason()`
- `data`: The full player JSON object (same structure as today)
- `created_at`: Row creation timestamp
- `updated_at`: Last modification timestamp

Benchmarks and metadata stay in localStorage — they are small config values, not player data.

**Season metadata note:** `activeSeason` stays in localStorage. Each device can independently switch seasons. This is acceptable because season selection is a conscious choice, not something that needs real-time sync.

## Client Integration

Load Supabase JS client via CDN in `index.html` (pinned version):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js"></script>
```

Initialize in a new file `js/supabase-config.js`:

```js
const SUPABASE_URL = 'https://<project-ref>.supabase.co';
const SUPABASE_ANON_KEY = '<anon-key>';
const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

The anon key is safe to expose — it's a public key. The variable is named `supa` to avoid shadowing the global `supabase`.

## db.js Changes

All DB methods that touch player data become async. The strategy is **write-through cache**: every write goes to localStorage first (immediate), then to Supabase (async). Reads prefer Supabase but fall back to localStorage.

### Method Mapping

| Current (sync) | New (async) | Implementation |
|---|---|---|
| `DB.getAll(season)` | `await DB.getAll(season)` | Supabase select, cache to localStorage, return `.data` from each row |
| `DB.get(id)` | `await DB.get(id)` | Supabase select single, return row's `.data` |
| `DB.save(player)` | `await DB.save(player)` | Build player object locally, save to localStorage, upsert to Supabase, return the local player object |
| `DB.delete(id)` | `await DB.delete(id)` | Remove from localStorage, delete from Supabase |
| `DB.updateTestResult(...)` | `await DB.updateTestResult(...)` | Calls `DB.get()` then `DB.save()` — becomes async |
| `DB.importPlayers(players)` | `await DB.importPlayers(players)` | Batch upsert to Supabase |
| `DB._saveAll(players)` | `await DB._saveAll(players)` | Batch upsert (NOT delete+insert) to avoid data loss window |
| `DB.exportJSON()` | `await DB.exportJSON()` | Calls `DB.getAll()` — becomes async |
| `DB.importJSON(json)` | `await DB.importJSON(json)` | Calls `DB._saveAll()` — becomes async |
| `DB.startNewSeason(...)` | `await DB.startNewSeason(...)` | Calls `DB.getAll()` and `DB._saveAll()` — becomes async |
| `DB.clearAll()` | `await DB.clearAll()` | Clear localStorage AND delete all rows from Supabase |

### Write-Through Cache (Offline Writes)

Every write follows this order:
1. Build the updated data
2. **Write to localStorage immediately** (ensures data is never lost)
3. **Upsert to Supabase** in the background
4. If Supabase fails, queue the write and retry on reconnect

This is critical for the testing workflow — coaches record data on a field with potentially spotty connectivity. Writes must never fail from the user's perspective.

**Pending writes queue:** When a Supabase write fails, store the player ID in a `pendingSync` set (in-memory + localStorage key `itp_pending_sync`). On next successful Supabase connection (checked on `DB.getAll()` or `App.init()`), push all pending players from localStorage to Supabase.

### Read Strategy (Startup)

1. Load from localStorage immediately → render the UI (fast)
2. Fetch from Supabase in background
3. If Supabase data differs from cache → update localStorage + re-render
4. If Supabase is unreachable → continue with cache, show toast "Working offline"

### Error Handling

- **Network errors on read:** Fall back to localStorage cache, show toast "Working offline"
- **Network errors on write:** Write to localStorage succeeds, queue for Supabase sync, show subtle offline indicator
- **Supabase API errors:** Log to console, show user-friendly toast
- **Return values:** `DB.save()` always returns the player object constructed locally (same as current behavior), regardless of whether the Supabase upsert succeeds

## Async Ripple — Caller Updates

Every file that calls DB methods needs `async`/`await`. These are mechanical changes.

### Files that need async updates:

| File | DB calls | Notable patterns |
|---|---|---|
| `js/app.js` | `DB.getAll()` (seed check), `DB.delete()` | `App.init()` becomes async; migration logic added |
| `js/roster.js` | `DB.getAll()` | `Roster.render()` becomes async |
| `js/profile.js` | `DB.get()`, `DB.save()` | Inline `onclick="DB.get(...)"` must be refactored to event listeners |
| `js/form.js` | `DB.get()`, `DB.save()` | `savePlayer()` becomes async |
| `js/testing.js` | `DB.getAll()`, `DB.get()`, `DB.updateTestResult()` | High-frequency writes during testing sessions — write-through cache essential here |
| `js/analytics.js` | `DB.getAll()` | `Analytics.show()` / `render()` becomes async |
| `js/report.js` | `DB.get()`, `DB.save()` | `Report.show()` becomes async |
| `js/trial-report.js` | `DB.get()`, `DB.save()`, `DB.getMeta()` | `TrialReport.show()` becomes async |
| `js/import.js` | `DB.importJSON()`, `DB.exportJSON()` | Both become async |
| `js/settings.js` | `DB.getBenchmarks()`, `DB.saveBenchmarks()`, `DB.clearAll()`, `DB.startNewSeason()` | Benchmarks stay localStorage (sync); `clearAll` and `startNewSeason` become async |

## One-Time Migration

On first app load after deployment:

1. Check if Supabase `players` table is empty for the active season
2. Check if localStorage has player data
3. If Supabase is empty and localStorage has data → batch upsert local players to Supabase
4. Show toast: "Data migrated to cloud"
5. This runs once; after that Supabase is the source of truth

**Race condition note:** If two browsers open simultaneously with different localStorage data, both may try to migrate. Since we use upsert, last writer wins. This is acceptable — it's a one-time event during initial setup.

## Supabase Project Setup (Manual Steps)

1. Create account at supabase.com
2. Create new project (free tier)
3. Run the SQL schema above in the SQL editor
4. Disable RLS on the `players` table (or add a permissive policy: `CREATE POLICY "open_access" ON players FOR ALL USING (true) WITH CHECK (true)`)
5. Copy the project URL and anon key into `supabase-config.js`

## Files Summary

| File | Action |
|---|---|
| `js/supabase-config.js` | **Create** — Supabase client initialization |
| `js/db.js` | **Rewrite** — async methods, Supabase + write-through localStorage cache |
| `index.html` | **Edit** — add Supabase CDN script + supabase-config.js |
| `js/app.js` | **Edit** — async init, migration logic, pending sync on reconnect |
| `js/roster.js` | **Edit** — async render |
| `js/profile.js` | **Edit** — async show/save, refactor inline onclick DB calls |
| `js/form.js` | **Edit** — async save |
| `js/testing.js` | **Edit** — async DB calls |
| `js/analytics.js` | **Edit** — async show |
| `js/report.js` | **Edit** — async show/save |
| `js/trial-report.js` | **Edit** — async show/save |
| `js/import.js` | **Edit** — async import/export |
| `js/settings.js` | **Edit** — async clearAll/startNewSeason |

## Verification

1. Create Supabase project and run schema SQL
2. Open app — existing localStorage data should auto-migrate to Supabase
3. Add a new player — verify it appears in Supabase dashboard
4. Open app in a different browser — same players should appear
5. Edit a player in one browser, refresh in another — changes visible
6. Disconnect network — app should work from cache, writes saved locally
7. Reconnect — pending writes sync to Supabase automatically
8. Run a testing session — rapid test entries should feel instant (write-through cache)
9. Test all flows: testing sessions, reports, analytics, import/export
