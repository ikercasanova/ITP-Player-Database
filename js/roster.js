'use strict';

/* ═══════════════════════════════════════════════════════════════
   roster.js — Dashboard: player grid, search, age group tabs
═══════════════════════════════════════════════════════════════ */

const Roster = {
  activeGroup: 'all',
  searchQuery: '',

  init() {
    // Age group tabs
    document.getElementById('age-tabs').addEventListener('click', e => {
      const tab = e.target.closest('.age-tab');
      if (!tab) return;
      Roster.activeGroup = tab.dataset.group;
      document.querySelectorAll('.age-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      Roster.render();
    });

    // Search
    document.getElementById('roster-search').addEventListener('input', e => {
      Roster.searchQuery = e.target.value.trim().toLowerCase();
      Roster.render();
    });
  },

  render() {
    const grid = document.getElementById('roster-grid');
    const empty = document.getElementById('roster-empty');
    let players = DB.getAll();

    // Filter by age group
    if (Roster.activeGroup !== 'all') {
      players = players.filter(p => p.ageGroup === Roster.activeGroup);
    }

    // Filter by search
    if (Roster.searchQuery) {
      players = players.filter(p => {
        const full = `${p.firstName} ${p.lastName}`.toLowerCase();
        return full.includes(Roster.searchQuery);
      });
    }

    // Sort by last name
    players.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

    if (players.length === 0) {
      grid.innerHTML = '';
      grid.style.display = 'none';
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';
    grid.style.display = '';
    grid.innerHTML = players.map(p => Roster.renderTile(p)).join('');

    // Click handlers
    grid.querySelectorAll('.player-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        location.hash = `#profile/${tile.dataset.id}`;
      });
    });
  },

  renderTile(player) {
    const initials = (player.firstName?.[0] || '') + (player.lastName?.[0] || '');

    const posY = player.photoPositionY ?? 25;
    const photoHTML = player.photoBase64
      ? `<img class="tile-photo" src="${player.photoBase64}" alt="" style="object-position: center ${posY}%">`
      : `<div class="tile-initials">${initials}</div>`;

    const positions = (player.positions || []).slice(0, 3);
    const posHTML = positions.map((pos, i) => {
      const code = typeof pos === 'string' ? pos : pos.code;
      const cls = i === 0 ? 'pos-badge pos-badge-primary' : 'pos-badge pos-badge-secondary';
      return `<span class="${cls}">${code}</span>`;
    }).join('');

    const dots = Benchmarks.getPlayerDots(player);
    const dotsHTML = dots.length > 0
      ? `<div class="tile-bench-dots">${dots.map(l => `<span class="bench-dot" data-level="${l}"></span>`).join('')}</div>`
      : '';

    return `
      <div class="player-tile" data-id="${player.id}">
        <div class="tile-photo-wrap">
          ${photoHTML}
          ${player.ageGroup ? `<span class="tile-age-badge">${player.ageGroup}</span>` : ''}
        </div>
        <div class="tile-info">
          <div class="tile-name">${player.firstName} ${player.lastName}</div>
          <div class="tile-positions">${posHTML}</div>
          ${dotsHTML}
        </div>
      </div>`;
  }
};
