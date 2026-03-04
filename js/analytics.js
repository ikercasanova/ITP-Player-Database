'use strict';

/* =================================================================
   analytics.js — Team Analytics: leaderboard tables with session
   columns, delta badges, sort controls, category/test navigation
================================================================= */

const Analytics = {
  activeGroup: 'all',
  activeCategory: null,
  activeTest: null,
  sortBy: 'best',

  init() {},

  show() {
    // Auto-select first category/test if not set
    if (!Analytics.activeCategory) {
      const cats = Benchmarks.getTestsByCategory();
      const firstCat = Object.keys(cats)[0];
      if (firstCat) {
        Analytics.activeCategory = firstCat;
        if (categoryIsFullyGrouped(firstCat)) {
          Analytics.activeTest = null;
          Analytics.sortBy = cats[firstCat][0] || 'best';
        } else {
          Analytics.activeTest = cats[firstCat][0] || null;
        }
      }
    }
    Analytics.render();
  },

  render() {
    const container = document.getElementById('analytics-content');
    let players = DB.getAll();

    // Filter by age group
    if (Analytics.activeGroup !== 'all') {
      players = players.filter(p => p.ageGroup === Analytics.activeGroup);
    }

    const stats = Analytics.computeStats(players);
    container.innerHTML = Analytics.buildHTML(stats, players);
    Analytics.bindEvents(container, players);
  },

  // ── Compute Stats ───────────────────────────────────────────

  computeStats(players) {
    const categories = Benchmarks.getTestsByCategory();
    const totalPlayers = players.length;

    const overallDist = { poor: 0, average: 0, good: 0, elite: 0 };
    let overallTotal = 0;

    const catStats = {};
    const testedSet = new Set();

    for (const [category, testKeys] of Object.entries(categories)) {
      catStats[category] = { tests: {} };

      for (const testKey of testKeys) {
        const def = TEST_DEFS[testKey];
        const values = [];

        for (const p of players) {
          const t = p.tests?.[testKey];
          if (t && t.best !== null && t.best !== undefined) {
            const val = Number(t.best);
            if (!isNaN(val)) {
              values.push({ val, ageGroup: p.ageGroup });
              testedSet.add(p.id);
            }
          }
        }

        const dist = { poor: 0, average: 0, good: 0, elite: 0 };
        let sum = 0;

        for (const { val, ageGroup } of values) {
          const { level } = Benchmarks.evaluate(ageGroup, testKey, val);
          if (dist[level] !== undefined) {
            dist[level]++;
            overallDist[level]++;
            overallTotal++;
          }
          sum += val;
        }

        const avg = values.length > 0 ? sum / values.length : null;

        catStats[category].tests[testKey] = {
          name: def.name,
          unit: def.unit,
          count: values.length,
          avg,
          distribution: dist
        };
      }
    }

    const testedPlayers = testedSet.size;

    let dominantLevel = 'average';
    let maxCount = 0;
    for (const [level, count] of Object.entries(overallDist)) {
      if (count > maxCount) {
        maxCount = count;
        dominantLevel = level;
      }
    }

    return {
      totalPlayers,
      testedPlayers,
      overallDistribution: overallDist,
      overallTotal,
      dominantLevel,
      categories: catStats
    };
  },

  // ── Format date as "Mon 'YY" ──────────────────────────────────

  formatDateShort(isoDate) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = isoDate.split('-');
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0].slice(2);
    return `${months[monthIdx]} '${year}`;
  },

  // ── Build HTML ──────────────────────────────────────────────

  buildHTML(stats, players) {
    const levelLabels = { poor: 'Poor', average: 'Average', good: 'Good', elite: 'Elite' };
    const levelOrder = ['elite', 'good', 'average', 'poor'];
    const categories = Benchmarks.getTestsByCategory();

    // ── Summary cards ──
    const summaryHTML = `
      <div class="stat-highlights">
        <div class="stat-card">
          <div class="stat-card-value">${stats.totalPlayers}</div>
          <div class="stat-card-label">Players</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${stats.testedPlayers}</div>
          <div class="stat-card-label">Tested</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">
            <span class="bench-level-label" data-level="${stats.dominantLevel}" style="font-size:14px;padding:3px 12px">
              ${levelLabels[stats.dominantLevel] || '—'}
            </span>
          </div>
          <div class="stat-card-label">Dominant Level</div>
        </div>
      </div>`;

    // ── Overall distribution bar ──
    const overallBarHTML = stats.overallTotal > 0
      ? `<div class="analytics-summary">
          <h3 class="profile-section-title">Overall Distribution</h3>
          ${Analytics.renderStackedBar(stats.overallDistribution, false)}
          <div class="dist-legend">
            ${levelOrder.map(l => {
              const n = stats.overallDistribution[l];
              const pct = stats.overallTotal > 0 ? Math.round(n / stats.overallTotal * 100) : 0;
              return `<span class="dist-legend-item">
                <span class="dist-legend-dot" data-level="${l}"></span>
                ${levelLabels[l]} ${pct}%
              </span>`;
            }).join('')}
          </div>
        </div>`
      : '';

    // ── Age group tabs ──
    const groups = ['all', 'U-17', 'U-19', 'U-21'];
    const tabLabels = { all: 'All', 'U-17': 'U-17', 'U-19': 'U-19', 'U-21': 'U-21' };
    const ageTabsHTML = `
      <div class="analytics-toolbar">
        <div class="age-tabs">
          ${groups.map(g =>
            `<button class="age-tab ${g === Analytics.activeGroup ? 'active' : ''}" data-group="${g}">${tabLabels[g]}</button>`
          ).join('')}
        </div>
      </div>`;

    // ── Category selector + test tabs (or group label) ──
    const catKeys = Object.keys(categories);
    const activeCat = Analytics.activeCategory || catKeys[0];
    const testKeysInCat = categories[activeCat] || [];
    const isGrouped = categoryIsFullyGrouped(activeCat);
    const activeTestKey = isGrouped ? null : (Analytics.activeTest || testKeysInCat[0]);

    let categorySelectHTML;
    if (isGrouped) {
      const groupKey = getGroupForTest(testKeysInCat[0]);
      const group = TEST_GROUPS[groupKey];
      categorySelectHTML = `
        <div class="analytics-controls">
          <select class="category-select" data-role="category-select">
            ${catKeys.map(c =>
              `<option value="${c}" ${c === activeCat ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
          <span class="test-group-label">${group.name}</span>
        </div>`;
    } else {
      categorySelectHTML = `
        <div class="analytics-controls">
          <select class="category-select" data-role="category-select">
            ${catKeys.map(c =>
              `<option value="${c}" ${c === activeCat ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
          <div class="test-tabs">
            ${testKeysInCat.map(tk => {
              const def = TEST_DEFS[tk];
              return `<button class="test-tab ${tk === activeTestKey ? 'active' : ''}" data-test="${tk}">${def.name}</button>`;
            }).join('')}
          </div>
        </div>`;
    }

    // ── Test info bar (non-grouped only) ──
    let testInfoHTML = '';
    if (!isGrouped) {
      const testStats = stats.categories[activeCat]?.tests[activeTestKey];
      if (testStats) {
        const avgDisplay = testStats.avg !== null
          ? (Number.isInteger(testStats.avg) ? testStats.avg : testStats.avg.toFixed(2))
          : '—';
        const distTotal = testStats.distribution.poor + testStats.distribution.average +
                          testStats.distribution.good + testStats.distribution.elite;

        testInfoHTML = `
          <div class="test-info-bar">
            <span class="test-info-name">${testStats.name}</span>
            <span class="test-info-detail">${testStats.count} of ${stats.totalPlayers} tested</span>
            <span class="test-info-detail">Avg: <strong>${avgDisplay} ${testStats.unit}</strong></span>
          </div>
          ${distTotal > 0 ? Analytics.renderStackedBar(testStats.distribution, true) : ''}`;
      }
    }

    // ── Sort controls ──
    let sortOptions;
    if (isGrouped) {
      sortOptions = [
        ...testKeysInCat.map(tk => ({ key: tk, label: TEST_DEFS[tk].name })),
        { key: 'name', label: 'Name' },
        { key: 'ageGroup', label: 'Age Group' }
      ];
      // Ensure sortBy is valid for grouped view
      if (!sortOptions.find(s => s.key === Analytics.sortBy)) {
        Analytics.sortBy = testKeysInCat[0];
      }
    } else {
      sortOptions = [
        { key: 'best', label: 'Best' },
        { key: 'delta', label: 'Delta' },
        { key: 'name', label: 'Name' },
        { key: 'ageGroup', label: 'Age Group' }
      ];
    }
    const sortHTML = `
      <div class="sort-controls">
        <span class="sort-label">Sort:</span>
        ${sortOptions.map(s =>
          `<button class="sort-btn ${s.key === Analytics.sortBy ? 'active' : ''}" data-sort="${s.key}">${s.label}</button>`
        ).join('')}
      </div>`;

    // ── Table ──
    const tableHTML = isGrouped
      ? Analytics.renderGroupedTable(testKeysInCat, players)
      : (activeTestKey ? Analytics.renderFullTable(activeTestKey, players) : '');

    return `
      <div class="analytics-page">
        <h2 class="analytics-title">Team Analytics</h2>
        ${ageTabsHTML}
        ${summaryHTML}
        ${overallBarHTML}
        ${categorySelectHTML}
        ${testInfoHTML}
        ${sortHTML}
        <div class="table-scroll">
          ${tableHTML}
        </div>
      </div>`;
  },

  // ── Full Leaderboard Table ──────────────────────────────────

  renderFullTable(testKey, players) {
    const def = TEST_DEFS[testKey];
    if (!def) return '';

    // Gather all unique session dates + player data
    const dateSet = new Set();
    const rows = [];

    for (const p of players) {
      const t = p.tests?.[testKey];
      if (!t || t.best === null || t.best === undefined) continue;

      const sessions = t.sessions || [];
      for (const s of sessions) dateSet.add(s.date);

      const latest = DB.getLatestSession(p, testKey);
      const previous = DB.getPreviousSession(p, testKey);
      const latestBest = latest?.best ?? t.best;
      const { level } = Benchmarks.evaluate(p.ageGroup, testKey, latestBest);

      // Compute delta value + HTML
      let deltaVal = 0;
      let deltaHTML = '';
      if (latest && previous && latest.best !== null && previous.best !== null) {
        const diff = latest.best - previous.best;
        const absDiff = Math.abs(diff);
        const formatted = absDiff < 1 ? absDiff.toFixed(2) : absDiff.toFixed(1);
        let cls, sign;
        if (def.lowerIsBetter) {
          deltaVal = -diff; // positive deltaVal = improvement for lowerIsBetter
          if (diff < -0.001) { cls = 'delta-up'; sign = '-'; }
          else if (diff > 0.001) { cls = 'delta-down'; sign = '+'; }
          else { cls = 'delta-same'; sign = ''; }
        } else {
          deltaVal = diff; // positive deltaVal = improvement for higherIsBetter
          if (diff > 0.001) { cls = 'delta-up'; sign = '+'; }
          else if (diff < -0.001) { cls = 'delta-down'; sign = '-'; }
          else { cls = 'delta-same'; sign = ''; }
        }
        deltaHTML = `<span class="delta-badge ${cls}">${sign}${formatted}</span>`;
      }

      rows.push({
        player: p,
        best: latestBest,
        level,
        deltaVal,
        deltaHTML,
        sessions
      });
    }

    if (rows.length === 0) return '<div class="no-data">No results for this test.</div>';

    // Session date columns (last 5)
    const dates = [...dateSet].sort().slice(-5);

    // Sort rows
    Analytics.sortRows(rows, def);

    // Build table
    const dateHeaders = dates.map(d => `<th class="col-session">${Analytics.formatDateShort(d)}</th>`).join('');

    const tableRows = rows.map((r, i) => {
      const sessionCells = dates.map(d => {
        const s = r.sessions.find(ss => ss.date === d);
        const val = s?.best !== null && s?.best !== undefined ? s.best : '—';
        return `<td class="col-session">${val}</td>`;
      }).join('');

      return `
        <tr>
          <td class="col-rank" style="color:${i === 0 ? 'var(--red)' : 'var(--gray-300)'}">${i + 1}</td>
          <td class="col-player"><a class="analytics-player-link" href="#profile/${r.player.id}">${r.player.firstName} ${r.player.lastName}</a></td>
          <td class="col-group">${r.player.ageGroup}</td>
          ${sessionCells}
          <td class="col-delta">${r.deltaHTML}</td>
          <td class="col-level"><span class="bench-level-label" data-level="${r.level}">${r.level}</span></td>
        </tr>`;
    }).join('');

    return `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-player">Player</th>
            <th class="col-group">Group</th>
            ${dateHeaders}
            <th class="col-delta">Delta</th>
            <th class="col-level">Level</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>`;
  },

  // ── Sort Rows ──────────────────────────────────────────────

  sortRows(rows, def) {
    switch (Analytics.sortBy) {
      case 'best':
        rows.sort((a, b) => def.lowerIsBetter ? a.best - b.best : b.best - a.best);
        break;
      case 'delta':
        rows.sort((a, b) => b.deltaVal - a.deltaVal);
        break;
      case 'name':
        rows.sort((a, b) => a.player.lastName.localeCompare(b.player.lastName));
        break;
      case 'ageGroup':
        rows.sort((a, b) => {
          const groupCmp = a.player.ageGroup.localeCompare(b.player.ageGroup);
          if (groupCmp !== 0) return groupCmp;
          return def.lowerIsBetter ? a.best - b.best : b.best - a.best;
        });
        break;
    }
  },

  // ── Grouped Table (Speed) ───────────────────────────────────

  renderGroupedTable(testKeys, players) {
    const rows = [];

    for (const p of players) {
      let hasAny = false;
      const cells = {};

      for (const tk of testKeys) {
        const t = p.tests?.[tk];
        const latest = DB.getLatestSession(p, tk);
        const previous = DB.getPreviousSession(p, tk);
        const latestBest = latest?.best ?? t?.best ?? null;

        if (latestBest !== null && latestBest !== undefined) {
          hasAny = true;
          const { level } = Benchmarks.evaluate(p.ageGroup, tk, latestBest);

          let deltaHTML = '';
          if (latest && previous && latest.best !== null && previous.best !== null) {
            const diff = latest.best - previous.best;
            const absDiff = Math.abs(diff);
            const formatted = absDiff < 1 ? absDiff.toFixed(2) : absDiff.toFixed(1);
            let cls, sign;
            // All sprints are lowerIsBetter
            if (diff < -0.001) { cls = 'delta-up'; sign = '-'; }
            else if (diff > 0.001) { cls = 'delta-down'; sign = '+'; }
            else { cls = 'delta-same'; sign = ''; }
            deltaHTML = `<span class="delta-badge ${cls}" style="font-size:10px;padding:0 4px;margin-left:3px">${sign}${formatted}</span>`;
          }

          cells[tk] = { best: latestBest, deltaHTML, level };
        } else {
          cells[tk] = { best: null, deltaHTML: '', level: 'none' };
        }
      }

      if (!hasAny) continue;
      rows.push({ player: p, cells });
    }

    if (rows.length === 0) return '<div class="no-data">No speed test results.</div>';

    Analytics.sortGroupedRows(rows, testKeys);

    const distHeaders = testKeys.map(tk =>
      `<th class="col-sprint">${TEST_DEFS[tk].name}</th>`
    ).join('');

    const tableRows = rows.map((r, i) => {
      const distCells = testKeys.map(tk => {
        const c = r.cells[tk];
        if (c.best === null) return `<td class="col-sprint">—</td>`;
        return `<td class="col-sprint">
          <span class="sprint-val" data-level="${c.level}">${c.best}</span>${c.deltaHTML}
        </td>`;
      }).join('');

      return `<tr>
        <td class="col-rank" style="color:${i === 0 ? 'var(--red)' : 'var(--gray-300)'}">${i + 1}</td>
        <td class="col-player"><a class="analytics-player-link" href="#profile/${r.player.id}">${r.player.firstName} ${r.player.lastName}</a></td>
        <td class="col-group">${r.player.ageGroup}</td>
        ${distCells}
      </tr>`;
    }).join('');

    return `
      <table class="leaderboard-table speed-group-table">
        <thead><tr>
          <th class="col-rank">#</th>
          <th class="col-player">Player</th>
          <th class="col-group">Group</th>
          ${distHeaders}
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>`;
  },

  sortGroupedRows(rows, testKeys) {
    const sortKey = Analytics.sortBy;

    if (sortKey === 'name') {
      rows.sort((a, b) => a.player.lastName.localeCompare(b.player.lastName));
    } else if (sortKey === 'ageGroup') {
      rows.sort((a, b) => {
        const gc = a.player.ageGroup.localeCompare(b.player.ageGroup);
        if (gc !== 0) return gc;
        const aVal = a.cells[testKeys[0]]?.best ?? 999;
        const bVal = b.cells[testKeys[0]]?.best ?? 999;
        return aVal - bVal;
      });
    } else if (testKeys.includes(sortKey)) {
      // Sort by specific sprint distance (lower is better)
      rows.sort((a, b) => {
        const aVal = a.cells[sortKey]?.best ?? 999;
        const bVal = b.cells[sortKey]?.best ?? 999;
        return aVal - bVal;
      });
    }
  },

  // ── Stacked Distribution Bar ────────────────────────────────

  renderStackedBar(distribution, small) {
    const total = distribution.poor + distribution.average +
                  distribution.good + distribution.elite;
    if (total === 0) return `<div class="${small ? 'dist-bar-sm' : 'dist-bar'} dist-bar-empty"></div>`;

    const levels = ['elite', 'good', 'average', 'poor'];
    const segments = levels.map(level => {
      const pct = (distribution[level] / total * 100).toFixed(1);
      if (distribution[level] === 0) return '';
      return `<div class="dist-segment" data-level="${level}" style="width:${pct}%"></div>`;
    }).join('');

    return `<div class="${small ? 'dist-bar-sm' : 'dist-bar'}">${segments}</div>`;
  },

  // ── Event Binding ───────────────────────────────────────────

  bindEvents(container, players) {
    // Age group tabs
    container.querySelectorAll('.age-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        Analytics.activeGroup = tab.dataset.group;
        Analytics.render();
      });
    });

    // Category select dropdown
    const catSelect = container.querySelector('[data-role="category-select"]');
    if (catSelect) {
      catSelect.addEventListener('change', () => {
        Analytics.activeCategory = catSelect.value;
        const cats = Benchmarks.getTestsByCategory();
        const testsInCat = cats[catSelect.value] || [];

        if (categoryIsFullyGrouped(catSelect.value)) {
          Analytics.activeTest = null;
          Analytics.sortBy = testsInCat[0] || 'best';
        } else {
          Analytics.activeTest = testsInCat[0] || null;
          Analytics.sortBy = 'best';
        }
        Analytics.render();
      });
    }

    // Test tabs
    container.querySelectorAll('.test-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        Analytics.activeTest = tab.dataset.test;
        Analytics.sortBy = 'best';
        Analytics.render();
      });
    });

    // Sort buttons
    container.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Analytics.sortBy = btn.dataset.sort;
        Analytics.render();
      });
    });
  }
};
