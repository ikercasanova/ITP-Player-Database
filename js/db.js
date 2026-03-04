'use strict';

/* ═══════════════════════════════════════════════════════════════
   db.js — localStorage CRUD, season-aware
═══════════════════════════════════════════════════════════════ */

const META_KEY = 'itp_db_meta';
const BENCH_KEY = 'itp_benchmarks';

const DB = {

  // ── Test Format Migration ─────────────────────────────────────

  /**
   * Detect old-format test data (has `attempts` but no `sessions`)
   * and wrap it in a single session using player.updatedAt as date.
   */
  migrateTestFormat(player) {
    if (!player || !player.tests) return player;
    let migrated = false;

    for (const [key, testData] of Object.entries(player.tests)) {
      if (!testData || typeof testData !== 'object') continue;
      // Already new format
      if (testData.sessions) continue;
      // Old format: has attempts array but no sessions
      if (Array.isArray(testData.attempts)) {
        const date = (player.updatedAt || new Date().toISOString()).slice(0, 10);
        testData.sessions = [
          { date, attempts: testData.attempts, best: testData.best }
        ];
        delete testData.attempts;
        // Keep top-level best intact
        migrated = true;
      }
    }

    if (migrated) player._needsMigrationSave = true;
    return player;
  },

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
      const players = raw ? JSON.parse(raw) : [];
      let needsSave = false;
      for (const p of players) {
        DB.migrateTestFormat(p);
        if (p._needsMigrationSave) {
          delete p._needsMigrationSave;
          needsSave = true;
        }
      }
      if (needsSave) DB._saveAll(players, season);
      return players;
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

  updateTestResult(playerId, testKey, attemptIndex, value, sessionDate) {
    const player = DB.get(playerId);
    if (!player) return null;

    if (!player.tests) player.tests = {};
    if (!player.tests[testKey]) {
      player.tests[testKey] = { sessions: [], best: null };
    }

    const test = player.tests[testKey];
    // Ensure sessions array exists (handles edge cases)
    if (!test.sessions) test.sessions = [];

    const date = sessionDate || new Date().toISOString().slice(0, 10);

    // Find or create session for this date
    let session = test.sessions.find(s => s.date === date);
    if (!session) {
      session = { date, attempts: [null, null, null], best: null };
      test.sessions.push(session);
      // Keep sessions sorted chronologically
      test.sessions.sort((a, b) => a.date.localeCompare(b.date));
    }

    session.attempts[attemptIndex] = value;

    // Compute session best
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

    // Recompute all-time best across all sessions
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

  // ── Session Helpers ────────────────────────────────────────

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
