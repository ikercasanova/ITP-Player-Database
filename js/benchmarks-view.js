'use strict';

/* ═══════════════════════════════════════════════════════════════
   benchmarks-view.js — Benchmark reference page
   Shows thresholds per age group, sourced from European academies / NLZ
═══════════════════════════════════════════════════════════════ */

const BenchmarksView = {
  activeAgeGroup: 'U-19',

  init() {},

  show() {
    const container = document.getElementById('benchmarks-content');
    container.innerHTML = BenchmarksView._render();
    BenchmarksView._bindEvents(container);
  },

  _render() {
    const ageGroups = ['U-17', 'U-19', 'U-21'];
    const ag = BenchmarksView.activeAgeGroup;
    const benchmarks = Benchmarks.getAllForAgeGroup(ag);
    const cats = Benchmarks.getTestsByCategory();

    const tabs = ageGroups.map(g => `
      <button class="bench-tab ${g === ag ? 'active' : ''}" data-ag="${g}">${g}</button>
    `).join('');

    const categories = Object.entries(cats).map(([catName, keys]) => {
      const rows = keys.map(key => {
        const def = TEST_DEFS[key];
        const thresh = benchmarks[key];
        if (!thresh) return '';

        const levels = def.lowerIsBetter
          ? [
              { label: 'Elite',   val: thresh.elite,   color: '#3182CE' },
              { label: 'Good',    val: thresh.good,    color: '#38A169' },
              { label: 'Average', val: thresh.average, color: '#ED8936' },
              { label: 'Poor',    val: thresh.poor,    color: '#E53E3E' },
            ]
          : [
              { label: 'Poor',    val: thresh.poor,    color: '#E53E3E' },
              { label: 'Average', val: thresh.average, color: '#ED8936' },
              { label: 'Good',    val: thresh.good,    color: '#38A169' },
              { label: 'Elite',   val: thresh.elite,   color: '#3182CE' },
            ];

        const chips = levels.map(l =>
          `<div class="bench-chip">
            <div class="bench-chip-dot" style="background:${l.color}"></div>
            <div class="bench-chip-label">${l.label}</div>
            <div class="bench-chip-val">${l.val} <span class="bench-chip-unit">${def.unit}</span></div>
          </div>`
        ).join('');

        const dirNote = def.lowerIsBetter ? '↓ lower is better' : '↑ higher is better';

        return `<div class="bench-row">
          <div class="bench-row-header">
            <span class="bench-test-name">${def.name}</span>
            <span class="bench-dir-note">${dirNote}</span>
          </div>
          <div class="bench-chips">${chips}</div>
        </div>`;
      }).join('');

      return `<div class="bench-category">
        <div class="bench-category-title">${catName}</div>
        ${rows}
      </div>`;
    }).join('');

    return `
      <div class="bench-page">
        <div class="bench-header">
          <h2 class="bench-title">Performance Benchmarks</h2>
          <p class="bench-source">
            Based on data from <strong>European youth academies</strong>, primarily
            German <strong>NLZ</strong> (Nachwuchsleistungszentren) programs.
            Values reflect sub-elite to elite youth standards for each age group.
          </p>
        </div>

        <div class="bench-tabs">${tabs}</div>

        <div class="bench-legend">
          <span class="bench-legend-item"><span class="bench-chip-dot" style="background:#E53E3E"></span>Poor</span>
          <span class="bench-legend-item"><span class="bench-chip-dot" style="background:#ED8936"></span>Average</span>
          <span class="bench-legend-item"><span class="bench-chip-dot" style="background:#38A169"></span>Good</span>
          <span class="bench-legend-item"><span class="bench-chip-dot" style="background:#3182CE"></span>Elite</span>
        </div>

        <div class="bench-body">${categories}</div>

        <div class="bench-footer">
          <p>These thresholds are updated periodically based on the latest available research and academy data. Individual variation may apply depending on position and training load.</p>
        </div>
      </div>
    `;
  },

  _bindEvents(container) {
    container.querySelectorAll('.bench-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        BenchmarksView.activeAgeGroup = btn.dataset.ag;
        BenchmarksView.show();
      });
    });
  },
};
