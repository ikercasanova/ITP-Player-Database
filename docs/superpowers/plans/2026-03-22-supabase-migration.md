# Supabase Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage with Supabase as the primary data store, using localStorage as a write-through cache for offline resilience.

**Architecture:** One Supabase table (`players`) stores player objects as JSONB rows keyed by UUID + season. `db.js` methods become async, writing to localStorage first (instant) then Supabase (background). All callers get `async`/`await` treatment. Metadata and benchmarks stay in localStorage (sync).

**Tech Stack:** Supabase JS v2 (CDN), vanilla JS (no build tools)

**Spec:** `docs/superpowers/specs/2026-03-22-supabase-migration-design.md`

---

## Important Notes

**Methods that stay synchronous (localStorage only):**
- `DB.getMeta()`, `DB.saveMeta()` — season config
- `DB.getBenchmarks()`, `DB.saveBenchmarks()` — benchmark thresholds
- `DB.getLatestSession()`, `DB.getPreviousSession()` — pure utility, reads from player object not storage
- `DB.migrateTestFormat()` — pure data transform

**Methods that become async (Supabase):**
- `DB.getAll()`, `DB.get()`, `DB.save()`, `DB.delete()`
- `DB.updateTestResult()`, `DB._saveAll()`
- `DB.importPlayers()`, `DB.importJSON()`, `DB.exportJSON()`
- `DB.clearAll()`, `DB.startNewSeason()`

---

## Chunk 1: Supabase Setup + Core DB Rewrite

### Task 1: Create Supabase Project (Manual — User)

- [ ] **Step 1: Create Supabase account and project**

Go to https://supabase.com, create a free account, then create a new project. Wait for it to provision (~2 minutes).

- [ ] **Step 2: Run schema SQL**

In the Supabase dashboard, go to SQL Editor and run:

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY,
  season TEXT NOT NULL DEFAULT '25-26',
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_players_season ON players(season);

-- Disable RLS for open access
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open_access" ON players FOR ALL USING (true) WITH CHECK (true);
```

- [ ] **Step 3: Copy credentials**

From Project Settings → API, copy:
- Project URL (e.g., `https://abcdefg.supabase.co`)
- Anon/public key (starts with `eyJ...`)

---

### Task 2: Create `js/supabase-config.js`

**Files:**
- Create: `js/supabase-config.js`

- [ ] **Step 1: Create the config file**

```js
'use strict';

/* ═══════════════════════════════════════════════════════════════
   supabase-config.js — Supabase client initialization
═══════════════════════════════════════════════════════════════ */

const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

const supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

- [ ] **Step 2: Update `index.html` — add CDN script and config**

Add before the existing `<script src="js/db.js">` line:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/dist/umd/supabase.min.js"></script>
<script src="js/supabase-config.js"></script>
```

- [ ] **Step 3: Commit**

```bash
git add js/supabase-config.js index.html
git commit -m "Add Supabase client config and CDN script"
```

---

### Task 3: Rewrite `js/db.js` — Async + Supabase + Write-Through Cache

**Files:**
- Rewrite: `js/db.js`

This is the core change. Every player CRUD method becomes async, writes to localStorage first, then Supabase.

- [ ] **Step 1: Rewrite db.js**

Replace the entire file with the new async implementation. Key changes:

```js
'use strict';

const META_KEY = 'itp_db_meta';
const BENCH_KEY = 'itp_benchmarks';
const PENDING_SYNC_KEY = 'itp_pending_sync';

const DB = {

  // ── Test Format Migration (pure transform, stays sync) ─────

  migrateTestFormat(player) {
    // ... exact same code as before, no changes ...
  },

  // ── Meta / Seasons (stays sync — localStorage only) ────────

  getMeta() { /* same */ },
  saveMeta(meta) { /* same */ },
  getActiveSeason() { /* same */ },
  _playerKey(season) { /* same */ },

  // ── Supabase Online Check ──────────────────────────────────

  _online: true,

  _setOffline() {
    if (DB._online) {
      DB._online = false;
      App.toast('Working offline — changes saved locally');
    }
  },

  _setOnline() {
    DB._online = true;
  },

  // ── Pending Sync Queue ─────────────────────────────────────

  _getPendingSync() {
    try {
      const raw = localStorage.getItem(PENDING_SYNC_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  _addPendingSync(playerId, season) {
    const pending = DB._getPendingSync();
    if (!pending.find(p => p.id === playerId && p.season === season)) {
      pending.push({ id: playerId, season });
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
    }
  },

  _removePendingSync(playerId) {
    const pending = DB._getPendingSync().filter(p => p.id !== playerId);
    localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
  },

  async syncPending() {
    const pending = DB._getPendingSync();
    if (pending.length === 0) return;

    for (const { id, season } of pending) {
      const localPlayers = DB._getLocalAll(season);
      const player = localPlayers.find(p => p.id === id);
      if (!player) {
        DB._removePendingSync(id);
        continue;
      }
      try {
        const { error } = await supa.from('players').upsert({
          id: player.id,
          season,
          data: player,
          updated_at: new Date().toISOString()
        });
        if (!error) {
          DB._removePendingSync(id);
          DB._setOnline();
        }
      } catch { /* still offline, leave in queue */ }
    }
  },

  // ── localStorage Helpers (sync, for cache) ─────────────────

  _getLocalAll(season) {
    try {
      const raw = localStorage.getItem(DB._playerKey(season));
      const players = raw ? JSON.parse(raw) : [];
      for (const p of players) DB.migrateTestFormat(p);
      return players;
    } catch { return []; }
  },

  _saveLocal(players, season) {
    try {
      localStorage.setItem(DB._playerKey(season), JSON.stringify(players));
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }
  },

  // ── Player CRUD (async — Supabase + localStorage cache) ────

  async getAll(season) {
    const s = season || DB.getActiveSeason();
    try {
      const { data, error } = await supa
        .from('players')
        .select('data')
        .eq('season', s);

      if (error) throw error;

      const players = (data || []).map(row => row.data);
      for (const p of players) DB.migrateTestFormat(p);
      // Cache to localStorage
      DB._saveLocal(players, s);
      DB._setOnline();
      // Sync any pending writes
      DB.syncPending();
      return players;
    } catch (err) {
      console.warn('Supabase getAll failed, using cache:', err);
      DB._setOffline();
      return DB._getLocalAll(s);
    }
  },

  async get(id, season) {
    const s = season || DB.getActiveSeason();
    try {
      const { data, error } = await supa
        .from('players')
        .select('data')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      const player = data.data;
      DB.migrateTestFormat(player);
      DB._setOnline();
      return player;
    } catch (err) {
      console.warn('Supabase get failed, using cache:', err);
      DB._setOffline();
      return DB._getLocalAll(s).find(p => p.id === id) || null;
    }
  },

  async save(player) {
    const season = DB.getActiveSeason();
    const now = new Date().toISOString();
    const localPlayers = DB._getLocalAll(season);

    if (!player.id) {
      player = { ...player, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
      localPlayers.push(player);
    } else {
      const idx = localPlayers.findIndex(p => p.id === player.id);
      if (idx >= 0) {
        localPlayers[idx] = { ...localPlayers[idx], ...player, updatedAt: now };
        player = localPlayers[idx];
      } else {
        player = { ...player, createdAt: now, updatedAt: now };
        localPlayers.push(player);
      }
    }

    // Write to localStorage immediately (never fails from user perspective)
    DB._saveLocal(localPlayers, season);

    // Upsert to Supabase (background, may fail)
    try {
      const { error } = await supa.from('players').upsert({
        id: player.id,
        season,
        data: player,
        updated_at: now
      });
      if (error) throw error;
      DB._setOnline();
      DB._removePendingSync(player.id);
    } catch (err) {
      console.warn('Supabase save failed, queued for sync:', err);
      DB._setOffline();
      DB._addPendingSync(player.id, season);
    }

    return player;
  },

  async delete(id) {
    const season = DB.getActiveSeason();
    const localPlayers = DB._getLocalAll(season).filter(p => p.id !== id);
    DB._saveLocal(localPlayers, season);

    try {
      const { error } = await supa.from('players').delete().eq('id', id);
      if (error) throw error;
      DB._setOnline();
      DB._removePendingSync(id);
    } catch (err) {
      console.warn('Supabase delete failed:', err);
      DB._setOffline();
    }
  },

  async _saveAll(players, season) {
    const s = season || DB.getActiveSeason();
    DB._saveLocal(players, s);

    try {
      const now = new Date().toISOString();
      const rows = players.map(p => ({
        id: p.id,
        season: s,
        data: p,
        updated_at: now
      }));
      const { error } = await supa.from('players').upsert(rows);
      if (error) throw error;
      DB._setOnline();
    } catch (err) {
      console.warn('Supabase _saveAll failed:', err);
      DB._setOffline();
      // Mark all as pending
      for (const p of players) DB._addPendingSync(p.id, s);
    }
  },

  // ── Test Result Updates (async) ────────────────────────────

  async updateTestResult(playerId, testKey, attemptIndex, value, sessionDate) {
    const player = await DB.get(playerId);
    if (!player) return null;

    // ... exact same test result logic as before ...
    // (session find/create, attempt set, best compute)

    return DB.save(player);
  },

  // ── Session Helpers (sync — reads from player object) ──────

  getLatestSession(player, testKey) { /* same */ },
  getPreviousSession(player, testKey) { /* same */ },

  // ── Season Management (async) ──────────────────────────────

  async startNewSeason(seasonId, carryOverPlayerIds) {
    // ... same logic but with await on DB.getAll() and DB._saveAll() ...
  },

  // ── Import / Export (async) ────────────────────────────────

  async exportJSON() {
    return JSON.stringify({
      meta: DB.getMeta(),
      players: await DB.getAll(),
      benchmarks: DB.getBenchmarks()
    }, null, 2);
  },

  async importJSON(json) {
    const data = JSON.parse(json);
    if (data.meta) DB.saveMeta(data.meta);
    if (data.players && Array.isArray(data.players)) {
      await DB._saveAll(data.players, data.meta?.activeSeason);
      return data.players.length;
    }
    if (Array.isArray(data)) {
      await DB._saveAll(data);
      return data.length;
    }
    throw new Error('Invalid format');
  },

  async importPlayers(players) {
    const existing = await DB.getAll();
    const now = new Date().toISOString();
    for (const p of players) {
      if (!p.id) p.id = crypto.randomUUID();
      if (!p.createdAt) p.createdAt = now;
      if (!p.updatedAt) p.updatedAt = now;
      existing.push(p);
    }
    await DB._saveAll(existing);
    return players.length;
  },

  // ── Benchmarks (sync — localStorage only) ──────────────────

  getBenchmarks() { /* same */ },
  saveBenchmarks(benchmarks) { /* same */ },

  // ── Danger Zone (async) ────────────────────────────────────

  async clearAll() {
    const meta = DB.getMeta();
    for (const s of meta.seasons) {
      localStorage.removeItem(`itp_players_${s}`);
    }
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(BENCH_KEY);
    localStorage.removeItem(PENDING_SYNC_KEY);

    try {
      await supa.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (err) {
      console.warn('Supabase clearAll failed:', err);
    }
  }
};
```

**Note:** The above is a structural guide. The actual implementation must preserve all internal logic from the current `updateTestResult` (lines 132-186), `migrateTestFormat`, `getLatestSession`, `getPreviousSession`, `getMeta`, etc. verbatim. Only the storage layer changes.

- [ ] **Step 2: Commit**

```bash
git add js/db.js
git commit -m "Rewrite db.js: async Supabase + write-through localStorage cache"
```

---

## Chunk 2: Async Caller Updates — Core Navigation

### Task 4: Update `js/app.js` — Async Init + Migration

**Files:**
- Modify: `js/app.js`

Changes needed:
- `App.init()` (line 10): `DB.getAll().length` → `(await DB.getAll()).length`
- `App.showSeedModal()` (line 111): `DB.importPlayers(players)` → `await DB.importPlayers(players)`
- `App.confirmDelete()` (line 150): `DB.delete(player.id)` → `await DB.delete(player.id)`
- Add migration logic: on init, check if Supabase is empty and localStorage has data → push to Supabase

- [ ] **Step 1: Make `App.init()` async and add migration**

```js
async init() {
  const meta = DB.getMeta();
  const el = document.getElementById('header-season');
  if (el) el.textContent = `20${meta.activeSeason}`;

  // Initialize all modules
  Roster.init();
  Profile.init();
  Testing.init();
  Analytics.init();
  PlayerForm.init();
  Settings.init();
  Report.init();
  TrialReport.init();

  window.addEventListener('hashchange', () => App.route());

  // One-time migration: push localStorage data to Supabase if cloud is empty
  await App.migrateToCloud();

  // First-launch check
  const players = await DB.getAll();
  if (players.length === 0) {
    App.showSeedModal();
  }

  App.route();
},

async migrateToCloud() {
  const localPlayers = DB._getLocalAll();
  if (localPlayers.length === 0) return;

  try {
    const { count, error } = await supa
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('season', DB.getActiveSeason());

    if (error) return; // offline, skip migration
    if (count > 0) return; // Supabase already has data

    // Push local data to Supabase
    const season = DB.getActiveSeason();
    const now = new Date().toISOString();
    const rows = localPlayers.map(p => ({
      id: p.id, season, data: p, updated_at: now
    }));
    await supa.from('players').upsert(rows);
    App.toast(`Migrated ${localPlayers.length} players to cloud`);
  } catch (err) {
    console.warn('Migration check failed:', err);
  }
},
```

- [ ] **Step 2: Make `showSeedModal` async**

```js
document.getElementById('btn-seed-load').onclick = async () => {
  try {
    const resp = await fetch('data/seed-players.json');
    if (!resp.ok) throw new Error('Could not load seed data');
    const players = await resp.json();
    await DB.importPlayers(players);
    modal.style.display = 'none';
    App.toast(`Loaded ${players.length} players`);
    await Roster.render();
  } catch (err) { ... }
};
```

- [ ] **Step 3: Make `confirmDelete` async**

```js
document.getElementById('btn-delete-confirm').onclick = async () => {
  await DB.delete(player.id);
  modal.style.display = 'none';
  if (callback) callback();
};
```

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "Make App.init async, add cloud migration logic"
```

---

### Task 5: Update `js/roster.js` — Async Render

**Files:**
- Modify: `js/roster.js` (line 32)

- [ ] **Step 1: Make `Roster.render()` async**

Change line 32 from `let players = DB.getAll();` to `let players = await DB.getAll();` and add `async` to the method.

```js
async render() {
  const grid = document.getElementById('roster-grid');
  const empty = document.getElementById('roster-empty');
  let players = await DB.getAll();
  // ... rest stays the same ...
}
```

- [ ] **Step 2: Commit**

```bash
git add js/roster.js
git commit -m "Make Roster.render async for Supabase"
```

---

### Task 6: Update `js/profile.js` — Async Show + Fix Inline onclick

**Files:**
- Modify: `js/profile.js` (lines 24, 53, 185)

- [ ] **Step 1: Make `Profile.show()` async**

```js
async show(playerId) {
  const player = await DB.get(playerId);
  if (!player) { location.hash = '#roster'; return; }
  // ... rest stays the same ...
}
```

- [ ] **Step 2: Make photo save async**

Line 53: `DB.save(player)` → `await DB.save(player)`. Wrap the slider `change` handler:

```js
slider.addEventListener('change', async (e) => {
  player.photoPositionY = parseInt(e.target.value, 10);
  await DB.save(player);
  App.toast('Photo position saved');
});
```

- [ ] **Step 3: Fix inline onclick `DB.get()` pattern**

Line 185: Replace the inline `onclick` that calls `DB.get()` synchronously:

```js
// OLD:
<button class="btn btn-danger" onclick="App.confirmDelete(DB.get('${player.id}'), () => { App.toast('Player deleted'); location.hash='#roster'; })">Delete</button>

// NEW:
<button class="btn btn-danger" data-delete-id="${player.id}">Delete</button>
```

Then in `Profile.show()`, after setting innerHTML, add an event listener:

```js
const deleteBtn = container.querySelector('[data-delete-id]');
if (deleteBtn) {
  deleteBtn.addEventListener('click', async () => {
    const p = await DB.get(deleteBtn.dataset.deleteId);
    if (p) App.confirmDelete(p, () => { App.toast('Player deleted'); location.hash='#roster'; });
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add js/profile.js
git commit -m "Make Profile async, fix inline onclick DB.get pattern"
```

---

## Chunk 3: Async Caller Updates — Forms & Data Entry

### Task 7: Update `js/form.js` — Async Save

**Files:**
- Modify: `js/form.js` (lines 33, 295, 306)

- [ ] **Step 1: Make `PlayerForm.show()` async**

```js
async show(playerId) {
  PlayerForm.editingId = playerId || null;
  // ...
  const player = playerId ? await DB.get(playerId) : null;
  // ... rest stays the same ...
}
```

- [ ] **Step 2: Make `PlayerForm.savePlayer()` async**

```js
async savePlayer(container) {
  // ...
  if (PlayerForm.editingId) {
    data.id = PlayerForm.editingId;
    const existing = await DB.get(PlayerForm.editingId);
    // ... preserve fields ...
  }

  const saved = await DB.save(data);
  App.toast(PlayerForm.editingId ? 'Player updated' : 'Player added');
  location.hash = `#profile/${saved.id}`;
},
```

- [ ] **Step 3: Update form submit handler**

The submit handler in `bindEvents` calls `PlayerForm.savePlayer()` — since it returns a promise now, the handler needs async:

```js
container.querySelector('#player-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  await PlayerForm.savePlayer(container);
});
```

- [ ] **Step 4: Commit**

```bash
git add js/form.js
git commit -m "Make PlayerForm async for Supabase"
```

---

### Task 8: Update `js/testing.js` — Async DB Calls

**Files:**
- Modify: `js/testing.js` (lines 94, 169, 524, 534, 538)

- [ ] **Step 1: Make `Testing.renderRecentSessions()` async**

Line 94: `const players = DB.getAll()` → `const players = await DB.getAll()`

- [ ] **Step 2: Make `Testing.startSession()` async**

Line 169: `Testing.players = DB.getAll()` → `Testing.players = await DB.getAll()`

- [ ] **Step 3: Make `Testing.saveCurrentPlayer()` async**

Lines 524, 534: `DB.updateTestResult(...)` → `await DB.updateTestResult(...)`
Line 538: `Testing.players[Testing.currentIndex] = DB.get(player.id)` → `Testing.players[Testing.currentIndex] = await DB.get(player.id)`

- [ ] **Step 4: Update all callers of these methods to await them**

Search for any place that calls `Testing.renderRecentSessions()`, `Testing.startSession()`, or `Testing.saveCurrentPlayer()` and add `await`.

- [ ] **Step 5: Commit**

```bash
git add js/testing.js
git commit -m "Make Testing async for Supabase"
```

---

## Chunk 4: Async Caller Updates — Analytics, Reports, Settings

### Task 9: Update `js/analytics.js` — Async Render

**Files:**
- Modify: `js/analytics.js` (line 43)

- [ ] **Step 1: Make `Analytics.render()` async**

```js
async render() {
  const container = document.getElementById('analytics-content');
  let players = await DB.getAll();
  // ... rest stays the same ...
}
```

- [ ] **Step 2: Make `Analytics.show()` async**

If `show()` calls `render()`, it needs to be async too:

```js
async show() {
  // ... auto-select logic ...
  await Analytics.render();
},
```

- [ ] **Step 3: Commit**

```bash
git add js/analytics.js
git commit -m "Make Analytics async for Supabase"
```

---

### Task 10: Update `js/report.js` — Async Show/Save

**Files:**
- Modify: `js/report.js` (lines 22, 337)

- [ ] **Step 1: Make `Report.show()` async**

```js
async show(playerId) {
  const player = await DB.get(playerId);
  if (!player) { location.hash = '#roster'; return; }
  // ... rest stays the same ...
}
```

- [ ] **Step 2: Make `Report._saveDraft()` async**

```js
async _saveDraft() {
  // ... sync form data ...
  const player = Report._player;
  // ... set fields ...
  await DB.save(player);
},
```

- [ ] **Step 3: Update event handlers that call _saveDraft**

Any `_saveDraft()` call needs `await`. Find all click handlers that call it and add `async`/`await`.

- [ ] **Step 4: Commit**

```bash
git add js/report.js
git commit -m "Make Report async for Supabase"
```

---

### Task 11: Update `js/trial-report.js` — Async Show/Save

**Files:**
- Modify: `js/trial-report.js` (lines 19, 230)

- [ ] **Step 1: Make `TrialReport.show()` async**

```js
async show(playerId) {
  const player = await DB.get(playerId);
  if (!player) { location.hash = '#roster'; return; }
  // ... rest stays the same ...
}
```

- [ ] **Step 2: Make `TrialReport._saveDraft()` async**

```js
async _saveDraft() {
  const player = TrialReport._player;
  player.trialEvaluation = TrialReport._evaluation;
  await DB.save(player);
},
```

- [ ] **Step 3: Update event handlers**

Save and preview button handlers that call `_saveDraft()` need `async`/`await`.

- [ ] **Step 4: Commit**

```bash
git add js/trial-report.js
git commit -m "Make TrialReport async for Supabase"
```

---

### Task 12: Update `js/settings.js` — Async Import/Export/Clear

**Files:**
- Modify: `js/settings.js` (lines 15, 131, 152, 173, 186)

- [ ] **Step 1: Make player count async**

Line 15: `const players = DB.getAll()` → `const players = await DB.getAll()`. Make `Settings.show()` async.

- [ ] **Step 2: Make export handler async**

```js
// Line 131: export button handler
exportBtn.addEventListener('click', async () => {
  const json = await DB.exportJSON();
  // ... rest stays the same (blob creation, download) ...
});
```

- [ ] **Step 3: Make import handler async**

```js
// Line 152: file input handler
reader.onload = async (ev) => {
  try {
    const count = await DB.importJSON(ev.target.result);
    App.toast(`Imported ${count} players`);
    // ...
  } catch { ... }
};
```

- [ ] **Step 4: Make seed import handler async**

```js
// Line 173: import players handler
reader.onload = async (ev) => {
  const players = JSON.parse(ev.target.result);
  const count = await DB.importPlayers(players);
  // ...
};
```

- [ ] **Step 5: Make clearAll handler async**

```js
// Line 186: danger zone handler
confirmBtn.onclick = async () => {
  await DB.clearAll();
  // ...
};
```

- [ ] **Step 6: Commit**

```bash
git add js/settings.js
git commit -m "Make Settings async for Supabase"
```

---

## Chunk 5: Router Async Dispatch + Final Integration

### Task 13: Update `js/app.js` Router — Async View Dispatch

**Files:**
- Modify: `js/app.js` (route method, lines 39-90)

The router calls `Roster.render()`, `Profile.show()`, `Testing.show()`, `Analytics.show()`, `PlayerForm.show()`, `Report.show()`, `TrialReport.show()`, `Settings.show()` — all of which are now async.

- [ ] **Step 1: Make `App.route()` async and await view methods**

```js
async route() {
  const hash = location.hash || '#roster';
  const parts = hash.slice(1).split('/');
  const view = parts[0];
  const param = parts[1] || null;

  // Hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.view === view);
  });

  // Show target view
  const viewEl = document.getElementById(`view-${view}`);
  if (viewEl) {
    viewEl.classList.add('active');
  } else {
    document.getElementById('view-roster').classList.add('active');
  }

  // Trigger view-specific logic
  switch (view) {
    case 'roster':     await Roster.render(); break;
    case 'profile':    if (param) await Profile.show(param); break;
    case 'testing':    await Testing.show(); break;
    case 'analytics':  await Analytics.show(); break;
    case 'edit':       await PlayerForm.show(param); break;
    case 'report':     if (param) await Report.show(param); break;
    case 'trial-report': if (param) await TrialReport.show(param); break;
    case 'settings':   await Settings.show(); break;
    default:           await Roster.render();
  }

  App.currentView = view;
  window.scrollTo(0, 0);
},
```

- [ ] **Step 2: Update hashchange listener**

```js
window.addEventListener('hashchange', () => App.route());
```

This is fine — `App.route()` returns a promise but we don't need to await it here. The async function will run to completion on its own.

- [ ] **Step 3: Update DOMContentLoaded bootstrap**

```js
document.addEventListener('DOMContentLoaded', () => App.init());
```

Same — `App.init()` is async but the bootstrap doesn't need to await it.

- [ ] **Step 4: Commit**

```bash
git add js/app.js
git commit -m "Make App.route async to dispatch async views"
```

---

### Task 14: Paste Real Supabase Credentials

**Files:**
- Modify: `js/supabase-config.js`

- [ ] **Step 1: Replace placeholder credentials**

After the user has created their Supabase project (Task 1), update `supabase-config.js` with the real project URL and anon key.

- [ ] **Step 2: Test the app**

Open `http://localhost:8081` and verify:
1. Roster loads (data comes from Supabase or migrates from localStorage)
2. Can add a player — check Supabase dashboard Table Editor to see the row
3. Can edit a player — changes persist on refresh
4. Can run a testing session — test results save
5. Analytics loads
6. Reports load and save drafts
7. Import/Export works
8. Settings → Clear All works

- [ ] **Step 3: Commit credentials (or add to .gitignore)**

If this is a private repo, commit the credentials:
```bash
git add js/supabase-config.js
git commit -m "Add Supabase project credentials"
```

If public, add `js/supabase-config.js` to `.gitignore` and create a `js/supabase-config.example.js` template.

- [ ] **Step 4: Final push**

```bash
git push
```

---

## Verification Checklist

After all tasks are complete:

- [ ] Open app in Browser A — roster loads from Supabase
- [ ] Add a player in Browser A — appears in Supabase dashboard
- [ ] Open app in Browser B (different browser) — same players visible
- [ ] Edit player in Browser A, refresh Browser B — changes appear
- [ ] Run a testing session — rapid entries feel instant (write-through cache)
- [ ] Disconnect network — app works from cache, shows "offline" toast
- [ ] Add a player while offline — saves locally
- [ ] Reconnect — pending player syncs to Supabase
- [ ] Export JSON — downloads complete data
- [ ] Import JSON — data loads into both localStorage and Supabase
- [ ] Clear All — removes data from both localStorage and Supabase
