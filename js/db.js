'use strict';

/* ═══════════════════════════════════════════════════════════════
   db.js — localStorage CRUD, season-aware
═══════════════════════════════════════════════════════════════ */

const META_KEY = 'itp_db_meta';
const BENCH_KEY = 'itp_benchmarks';

const DB = {

  // ── Meta / Seasons ──────────────────────────────────────────

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

  // ── Player CRUD ─────────────────────────────────────────────

  getAll(season) {
    try {
      const raw = localStorage.getItem(DB._playerKey(season));
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  get(id, season) {
    return DB.getAll(season).find(p => p.id === id) || null;
  },

  save(player) {
    const players = DB.getAll();
    const now = new Date().toISOString();

    if (!player.id) {
      player = {
        ...player,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };
      players.push(player);
    } else {
      const idx = players.findIndex(p => p.id === player.id);
      if (idx >= 0) {
        players[idx] = { ...players[idx], ...player, updatedAt: now };
        player = players[idx];
      } else {
        player = { ...player, createdAt: now, updatedAt: now };
        players.push(player);
      }
    }

    DB._saveAll(players);
    return player;
  },

  delete(id) {
    const players = DB.getAll().filter(p => p.id !== id);
    DB._saveAll(players);
  },

  _saveAll(players, season) {
    try {
      localStorage.setItem(DB._playerKey(season), JSON.stringify(players));
    } catch (e) {
      alert('Storage quota exceeded. Try removing photos or exporting data.');
      throw e;
    }
  },

  // ── Test Result Updates ─────────────────────────────────────

  updateTestResult(playerId, testKey, attemptIndex, value) {
    const player = DB.get(playerId);
    if (!player) return null;

    if (!player.tests) player.tests = {};
    if (!player.tests[testKey]) {
      player.tests[testKey] = { attempts: [null, null, null], best: null, unit: '' };
    }

    const test = player.tests[testKey];
    test.attempts[attemptIndex] = value;

    // Compute best: for timed tests (lower = better), find minimum; else find maximum
    const LOWER_IS_BETTER = ['sprint5m', 'sprint10m', 'sprint20m', 'sprint30m', 'sprint40yd', 'dribbling'];
    const validAttempts = test.attempts.filter(v => v !== null && v !== undefined && v !== '');
    const nums = validAttempts.map(Number).filter(n => !isNaN(n));

    if (nums.length > 0) {
      test.best = LOWER_IS_BETTER.includes(testKey)
        ? Math.min(...nums)
        : Math.max(...nums);
    } else {
      test.best = null;
    }

    return DB.save(player);
  },

  // ── Season Management ───────────────────────────────────────

  startNewSeason(seasonId, carryOverPlayerIds) {
    const meta = DB.getMeta();
    if (!meta.seasons.includes(seasonId)) {
      meta.seasons.push(seasonId);
    }

    // Carry over selected players (reset their tests)
    if (carryOverPlayerIds && carryOverPlayerIds.length) {
      const oldPlayers = DB.getAll();
      const newPlayers = oldPlayers
        .filter(p => carryOverPlayerIds.includes(p.id))
        .map(p => ({
          ...p,
          id: crypto.randomUUID(),
          tests: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      DB._saveAll(newPlayers, seasonId);
    }

    meta.activeSeason = seasonId;
    DB.saveMeta(meta);
  },

  // ── Import / Export ─────────────────────────────────────────

  exportJSON() {
    return JSON.stringify({
      meta: DB.getMeta(),
      players: DB.getAll(),
      benchmarks: DB.getBenchmarks()
    }, null, 2);
  },

  importJSON(json) {
    const data = JSON.parse(json);

    if (data.meta) DB.saveMeta(data.meta);

    if (data.players && Array.isArray(data.players)) {
      DB._saveAll(data.players, data.meta?.activeSeason);
      return data.players.length;
    }

    // Support flat array import too
    if (Array.isArray(data)) {
      DB._saveAll(data);
      return data.length;
    }

    throw new Error('Invalid format');
  },

  importPlayers(players) {
    const existing = DB.getAll();
    const now = new Date().toISOString();
    for (const p of players) {
      if (!p.id) p.id = crypto.randomUUID();
      if (!p.createdAt) p.createdAt = now;
      if (!p.updatedAt) p.updatedAt = now;
      existing.push(p);
    }
    DB._saveAll(existing);
    return players.length;
  },

  // ── Benchmarks ──────────────────────────────────────────────

  getBenchmarks() {
    try {
      const raw = localStorage.getItem(BENCH_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null; // Will fall back to defaults in benchmarks.js
  },

  saveBenchmarks(benchmarks) {
    localStorage.setItem(BENCH_KEY, JSON.stringify(benchmarks));
  },

  // ── Danger Zone ─────────────────────────────────────────────

  clearAll() {
    const meta = DB.getMeta();
    for (const s of meta.seasons) {
      localStorage.removeItem(`itp_players_${s}`);
    }
    localStorage.removeItem(META_KEY);
    localStorage.removeItem(BENCH_KEY);
  }
};
