'use strict';

/* ═══════════════════════════════════════════════════════════════
   db.js — Supabase + localStorage write-through cache
   Player data: async (Supabase primary, localStorage cache)
   Meta/Benchmarks: sync (localStorage only)
═══════════════════════════════════════════════════════════════ */

const META_KEY = 'itp_db_meta';
const BENCH_KEY = 'itp_benchmarks';
const PENDING_SYNC_KEY = 'itp_pending_sync';

const DB = {

  // ── Test Format Migration (pure transform, stays sync) ─────

  migrateTestFormat(player) {
    if (!player || !player.tests) return player;
    let migrated = false;

    for (const [key, testData] of Object.entries(player.tests)) {
      if (!testData || typeof testData !== 'object') continue;
      if (testData.sessions) continue;
      if (Array.isArray(testData.attempts)) {
        const date = (player.updatedAt || new Date().toISOString()).slice(0, 10);
        testData.sessions = [
          { date, attempts: testData.attempts, best: testData.best }
        ];
        delete testData.attempts;
        migrated = true;
      }
    }

    if (migrated) player._needsMigrationSave = true;
    return player;
  },

  // ── Meta / Seasons (sync — localStorage only) ──────────────

  getMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { activeSeason: '25-26', seasons: ['25-26'] };
  },

  saveMeta(meta) {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  },

  getActiveSeason() {
    return DB.getMeta().activeSeason;
  },

  _playerKey(season) {
    return `itp_players_${season || DB.getActiveSeason()}`;
  },

  // ── Online Status ──────────────────────────────────────────

  _online: true,

  _setOffline() {
    if (DB._online) {
      DB._online = false;
      if (typeof App !== 'undefined' && App.toast) {
        App.toast('Working offline — changes saved locally');
      }
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
      } catch { /* still offline */ }
    }
  },

  // ── localStorage Helpers (sync, for cache) ─────────────────

  _getLocalAll(season) {
    try {
      const raw = localStorage.getItem(DB._playerKey(season));
      const players = raw ? JSON.parse(raw) : [];
      for (const p of players) {
        DB.migrateTestFormat(p);
        delete p._needsMigrationSave;
      }
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
      for (const p of players) {
        DB.migrateTestFormat(p);
        delete p._needsMigrationSave;
      }
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
      delete player._needsMigrationSave;
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

    // Write to localStorage immediately
    DB._saveLocal(localPlayers, season);

    // Upsert to Supabase (may fail if offline)
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
      if (rows.length > 0) {
        const { error } = await supa.from('players').upsert(rows);
        if (error) throw error;
      }
      DB._setOnline();
    } catch (err) {
      console.warn('Supabase _saveAll failed:', err);
      DB._setOffline();
      for (const p of players) DB._addPendingSync(p.id, s);
    }
  },

  // ── Test Result Updates (async) ────────────────────────────

  async updateTestResult(playerId, testKey, attemptIndex, value, sessionDate) {
    const player = await DB.get(playerId);
    if (!player) return null;

    if (!player.tests) player.tests = {};
    if (!player.tests[testKey]) {
      player.tests[testKey] = { sessions: [], best: null };
    }

    const test = player.tests[testKey];
    if (!test.sessions) test.sessions = [];

    const date = sessionDate || new Date().toISOString().slice(0, 10);

    let session = test.sessions.find(s => s.date === date);
    if (!session) {
      session = { date, attempts: [null, null, null], best: null };
      test.sessions.push(session);
      test.sessions.sort((a, b) => a.date.localeCompare(b.date));
    }

    session.attempts[attemptIndex] = value;

    const LOWER_IS_BETTER = ['sprint5m', 'sprint10m', 'sprint30m', 'sprint40yd', 'dribbling'];
    const validAttempts = session.attempts.filter(v => v !== null && v !== undefined && v !== '');
    const nums = validAttempts.map(Number).filter(n => !isNaN(n));

    if (nums.length > 0) {
      session.best = LOWER_IS_BETTER.includes(testKey)
        ? Math.min(...nums)
        : Math.max(...nums);
    } else {
      session.best = null;
    }

    const allBests = test.sessions
      .map(s => s.best)
      .filter(b => b !== null && b !== undefined);
    const allNums = allBests.map(Number).filter(n => !isNaN(n));

    if (allNums.length > 0) {
      test.best = LOWER_IS_BETTER.includes(testKey)
        ? Math.min(...allNums)
        : Math.max(...allNums);
    } else {
      test.best = null;
    }

    return DB.save(player);
  },

  // ── Session Helpers (sync — reads from player object) ──────

  getLatestSession(player, testKey) {
    const sessions = player?.tests?.[testKey]?.sessions;
    if (!sessions || sessions.length === 0) return null;
    return sessions[sessions.length - 1];
  },

  getPreviousSession(player, testKey) {
    const sessions = player?.tests?.[testKey]?.sessions;
    if (!sessions || sessions.length < 2) return null;
    return sessions[sessions.length - 2];
  },

  // ── Season Management (async) ──────────────────────────────

  async startNewSeason(seasonId, carryOverPlayerIds) {
    const meta = DB.getMeta();
    if (!meta.seasons.includes(seasonId)) {
      meta.seasons.push(seasonId);
    }

    if (carryOverPlayerIds && carryOverPlayerIds.length) {
      const oldPlayers = await DB.getAll();
      const newPlayers = oldPlayers
        .filter(p => carryOverPlayerIds.includes(p.id))
        .map(p => ({
          ...p,
          id: crypto.randomUUID(),
          tests: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      await DB._saveAll(newPlayers, seasonId);
    }

    meta.activeSeason = seasonId;
    DB.saveMeta(meta);
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

  getBenchmarks() {
    try {
      const raw = localStorage.getItem(BENCH_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  },

  saveBenchmarks(benchmarks) {
    localStorage.setItem(BENCH_KEY, JSON.stringify(benchmarks));
  },

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
      await supa.from('players').delete().gt('updated_at', '1970-01-01');
    } catch (err) {
      console.warn('Supabase clearAll failed:', err);
    }
  }
};
