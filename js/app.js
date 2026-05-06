'use strict';

/* ═══════════════════════════════════════════════════════════════
   app.js — Hash routing, nav controller, init
═══════════════════════════════════════════════════════════════ */

const App = {
  currentView: null,

  async init() {
    // Update season display
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
    CardEditor.init();
    BenchmarksView.init();
    WhatsAppReport.init();

    // Route on hash change
    window.addEventListener('hashchange', () => App.route());

    // Migrate localStorage → Supabase if needed
    await App.migrateToCloud();

    // One-time fix: convert any broadJump values entered in meters to cm
    await App.migrateBroadJumpUnits();

    // First-launch check
    const players = await DB.getAll();
    if (players.length === 0) {
      App.showSeedModal();
    }

    // Initial route
    await App.route();
  },

  // ── Routing ─────────────────────────────────────────────────

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
      case 'roster':
        await Roster.render();
        break;
      case 'profile':
        if (param) await Profile.show(param);
        break;
      case 'testing':
        await Testing.show();
        break;
      case 'analytics':
        await Analytics.show();
        break;
      case 'edit':
        await PlayerForm.show(param);
        break;
      case 'report':
        if (param) await Report.show(param);
        break;
      case 'trial-report':
        if (param) await TrialReport.show(param);
        break;
      case 'card':
        if (param) await CardEditor.show(param);
        break;
      case 'benchmarks':
        BenchmarksView.show();
        break;
      case 'wa-report':
        await WhatsAppReport.show();
        break;
      case 'settings':
        await Settings.show();
        break;
      default:
        await Roster.render();
    }

    App.currentView = view;
    window.scrollTo(0, 0);
  },

  // ── First-Launch Seed Modal ─────────────────────────────────

  showSeedModal() {
    const modal = document.getElementById('modal-seed');
    modal.style.display = '';

    document.getElementById('btn-seed-skip').onclick = () => {
      modal.style.display = 'none';
    };

    document.getElementById('btn-seed-load').onclick = async () => {
      try {
        const resp = await fetch('data/seed-players.json');
        if (!resp.ok) throw new Error('Could not load seed data');
        const raw = await resp.json();
        // Seed file is { "itp_players_25-26": [...] } — extract the array
        const players = Array.isArray(raw) ? raw : (raw[DB._playerKey()] || Object.values(raw)[0] || []);
        await DB.importPlayers(players);
        modal.style.display = 'none';
        App.toast(`Loaded ${players.length} players`);
        await Roster.render();
      } catch (err) {
        alert('Failed to load seed data: ' + err.message);
        modal.style.display = 'none';
      }
    };
  },

  // ── localStorage → Supabase Migration ──────────────────────

  async migrateToCloud() {
    try {
      if (typeof supa === 'undefined') return;

      const season = DB.getActiveSeason();
      const localPlayers = DB._getLocalAll(season);
      if (localPlayers.length === 0) return;

      // Check if Supabase already has data for this season
      const { count, error } = await supa
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('season', season);

      if (error) throw error;
      if (count > 0) return; // Supabase already has data, skip

      // Batch upsert local players to Supabase
      const rows = localPlayers.map(p => ({
        ...p,
        season,
        updated_at: p.updatedAt || new Date().toISOString()
      }));

      const { error: upsertError } = await supa
        .from('players')
        .upsert(rows);

      if (upsertError) throw upsertError;

      App.toast(`Migrated ${localPlayers.length} players to cloud`);
    } catch (err) {
      console.warn('Cloud migration skipped:', err.message);
    }
  },

  // ── One-Time: Broad Jump m → cm Migration ──────────────────

  async migrateBroadJumpUnits() {
    const meta = DB.getMeta();
    if (meta.broadJumpMigratedToCm) return;

    try {
      const players = await DB.getAll();
      let fixedCount = 0;

      for (const p of players) {
        const bj = p.tests?.broadJump;
        if (!bj) continue;

        let changed = false;
        const conv = (v) => (typeof v === 'number' && v > 0 && v < 10) ? Math.round(v * 100) : v;

        if (typeof bj.best === 'number' && bj.best > 0 && bj.best < 10) {
          bj.best = conv(bj.best);
          changed = true;
        }
        if (Array.isArray(bj.sessions)) {
          for (const s of bj.sessions) {
            if (typeof s.best === 'number' && s.best > 0 && s.best < 10) {
              s.best = conv(s.best);
              changed = true;
            }
            if (Array.isArray(s.attempts)) {
              for (let i = 0; i < s.attempts.length; i++) {
                const a = s.attempts[i];
                if (typeof a === 'number' && a > 0 && a < 10) {
                  s.attempts[i] = conv(a);
                  changed = true;
                }
              }
            }
          }
        }

        if (changed) {
          await DB.save(p);
          fixedCount++;
        }
      }

      meta.broadJumpMigratedToCm = true;
      DB.saveMeta(meta);

      if (fixedCount > 0) {
        App.toast(`Fixed broad jump units on ${fixedCount} player${fixedCount === 1 ? '' : 's'}`);
      }
    } catch (err) {
      console.warn('Broad jump unit migration skipped:', err.message);
    }
  },

  // ── Toast ───────────────────────────────────────────────────

  toast(message) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2500);
  },

  // ── Delete Confirmation Modal ───────────────────────────────

  confirmDelete(player, callback) {
    const modal = document.getElementById('modal-delete');
    document.getElementById('modal-delete-name').textContent =
      `${player.firstName} ${player.lastName}`;
    modal.style.display = '';

    document.getElementById('btn-delete-cancel').onclick = () => {
      modal.style.display = 'none';
    };

    document.getElementById('btn-delete-confirm').onclick = async () => {
      await DB.delete(player.id);
      modal.style.display = 'none';
      if (callback) callback();
    };
  },

  // ── Helpers ─────────────────────────────────────────────────

  computeAge(dob) {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  },

  cmToFeetInches(cm) {
    if (!cm) return '';
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    if (inches === 12) return `${feet + 1}'0"`;
    return `${feet}'${inches}"`;
  },

  kgToLbs(kg) {
    if (!kg) return '';
    return Math.round(kg * 2.20462);
  }
};

// ── Bootstrap ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
