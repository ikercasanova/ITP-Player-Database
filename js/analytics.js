'use strict';

/* =================================================================
   analytics.js — Team Analytics: aggregate stats & distributions
================================================================= */

const Analytics = {
  activeGroup: 'all',

  init() {},

  show() {
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
    Analytics.bindEvents(container);
  },

  // ── Compute Stats ───────────────────────────────────────────

  computeStats(players) {
    const categories = Benchmarks.getTestsByCategory();
    const totalPlayers = players.length;
    let testedPlayers = 0;

    // Overall distribution across ALL test evaluations
    const overallDist = { poor: 0, average: 0, good: 0, elite: 0 };
    let overallTotal = 0;

    // Per-category, per-test stats
    const catStats = {};

    // Track which players have at least 1 test result
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

        // Per-test distribution
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

    testedPlayers = testedSet.size;

    // Dominant level
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

  // ── Build HTML ──────────────────────────────────────────────

  buildHTML(stats, players) {
    const levelLabels = { poor: 'Poor', average: 'Average', good: 'Good', elite: 'Elite' };
    const levelOrder = ['elite', 'good', 'average', 'poor'];

    // Summary cards
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

    // Overall distribution bar
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

    // Per-category sections
    let categoriesHTML = '';
    for (const [category, catData] of Object.entries(stats.categories)) {
      let testsHTML = '';
      for (const [testKey, test] of Object.entries(catData.tests)) {
        const avgDisplay = test.avg !== null
          ? (Number.isInteger(test.avg) ? test.avg : test.avg.toFixed(2))
          : '—';
        const distTotal = test.distribution.poor + test.distribution.average +
                          test.distribution.good + test.distribution.elite;

        testsHTML += `
          <div class="analytics-test-row">
            <div class="analytics-test-header">
              <span class="analytics-test-name">${test.name}</span>
              <span class="analytics-test-avg-value">${avgDisplay} <span class="analytics-test-unit">${test.unit}</span></span>
            </div>
            ${distTotal > 0 ? Analytics.renderStackedBar(test.distribution, true) : '<div class="dist-bar-sm dist-bar-empty"></div>'}
            <div class="analytics-test-count">${test.count} of ${stats.totalPlayers} tested</div>
          </div>`;
      }

      categoriesHTML += `
        <div class="analytics-category">
          <h3 class="profile-section-title">${category}</h3>
          ${testsHTML}
        </div>`;
    }

    // Age group tabs
    const groups = ['all', 'U-17', 'U-19', 'U-21'];
    const tabLabels = { all: 'All', 'U-17': 'U-17', 'U-19': 'U-19', 'U-21': 'U-21' };
    const tabsHTML = `
      <div class="analytics-toolbar">
        <div class="age-tabs">
          ${groups.map(g =>
            `<button class="age-tab ${g === Analytics.activeGroup ? 'active' : ''}" data-group="${g}">${tabLabels[g]}</button>`
          ).join('')}
        </div>
      </div>`;

    return `
      <div class="analytics-page">
        <h2 class="analytics-title">Team Analytics</h2>
        ${tabsHTML}
        ${summaryHTML}
        ${overallBarHTML}
        ${categoriesHTML}
      </div>`;
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

  bindEvents(container) {
    container.querySelectorAll('.age-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        Analytics.activeGroup = tab.dataset.group;
        Analytics.render();
      });
    });
  }
};
