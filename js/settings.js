'use strict';

/* ═══════════════════════════════════════════════════════════════
   settings.js — Season management, benchmark editor, import/export
═══════════════════════════════════════════════════════════════ */

const Settings = {
  benchAgeGroup: 'U-17',

  init() {},

  show() {
    const container = document.getElementById('settings-content');
    const meta = DB.getMeta();
    const players = DB.getAll();

    container.innerHTML = `
      <div class="settings-page">
        <h2>Settings</h2>

        <!-- Season -->
        <div class="settings-section">
          <h3>Season</h3>
          <div class="settings-row">
            <span class="settings-label">Active Season</span>
            <span class="settings-value">20${meta.activeSeason}</span>
          </div>
          <div class="settings-row">
            <span class="settings-label">Players</span>
            <span class="settings-value">${players.length}</span>
          </div>
        </div>

        <!-- Data -->
        <div class="settings-section">
          <h3>Data Management</h3>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-outline btn-block" id="btn-export">Export JSON Backup</button>
            <button class="btn btn-outline btn-block" id="btn-import-json">Import JSON</button>
            <button class="btn btn-outline btn-block" id="btn-import-csv">Import CSV (Google Sheets)</button>
            <input type="file" id="input-import-json" accept=".json" style="display:none">
            <input type="file" id="input-import-csv" accept=".csv,.txt" style="display:none">
          </div>
        </div>

        <!-- Benchmarks -->
        <div class="settings-section">
          <h3>Benchmark Thresholds</h3>
          <div class="form-field mb-12">
            <label class="form-label" for="bench-ag-select">Age Group</label>
            <select class="form-select" id="bench-ag-select">
              <option value="U-17" ${Settings.benchAgeGroup === 'U-17' ? 'selected' : ''}>U-17</option>
              <option value="U-19" ${Settings.benchAgeGroup === 'U-19' ? 'selected' : ''}>U-19</option>
              <option value="U-21" ${Settings.benchAgeGroup === 'U-21' ? 'selected' : ''}>U-21</option>
            </select>
          </div>
          <div id="bench-editor"></div>
          <div style="margin-top:12px;display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" id="btn-save-bench">Save Thresholds</button>
            <button class="btn btn-ghost btn-sm" id="btn-reset-bench">Reset to Defaults</button>
          </div>
        </div>

        <!-- Danger Zone -->
        <div class="settings-section" style="border:1px solid #fecaca">
          <h3 style="color:#dc2626;border-color:#dc2626">Danger Zone</h3>
          <button class="btn btn-danger btn-block" id="btn-clear-all">Clear All Data</button>
        </div>
      </div>`;

    Settings.renderBenchEditor(container);
    Settings.bindEvents(container);
  },

  renderBenchEditor(container) {
    const editor = container.querySelector('#bench-editor');
    const benchmarks = Benchmarks.getAllForAgeGroup(Settings.benchAgeGroup);

    let rows = '';
    for (const [key, def] of Object.entries(TEST_DEFS)) {
      const thresh = benchmarks[key] || { poor: '', average: '', good: '', elite: '' };
      rows += `<tr>
        <td style="font-weight:600;white-space:nowrap">${def.name} <span style="color:var(--gray-500);font-weight:400">(${def.unit})</span></td>
        <td><input type="number" step="any" data-test="${key}" data-level="poor" value="${thresh.poor}"></td>
        <td><input type="number" step="any" data-test="${key}" data-level="average" value="${thresh.average}"></td>
        <td><input type="number" step="any" data-test="${key}" data-level="good" value="${thresh.good}"></td>
        <td><input type="number" step="any" data-test="${key}" data-level="elite" value="${thresh.elite}"></td>
      </tr>`;
    }

    editor.innerHTML = `
      <div style="overflow-x:auto">
        <table class="bench-table">
          <thead>
            <tr>
              <th>Test</th>
              <th style="color:var(--bench-poor)">Poor</th>
              <th style="color:var(--bench-avg)">Avg</th>
              <th style="color:var(--bench-good)">Good</th>
              <th style="color:var(--bench-elite)">Elite</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  bindEvents(container) {
    // Age group switch for benchmarks
    container.querySelector('#bench-ag-select').addEventListener('change', e => {
      Settings.benchAgeGroup = e.target.value;
      Settings.renderBenchEditor(container);
    });

    // Save benchmarks
    container.querySelector('#btn-save-bench').addEventListener('click', () => {
      Settings.saveBenchmarks(container);
    });

    // Reset benchmarks
    container.querySelector('#btn-reset-bench').addEventListener('click', () => {
      const all = DB.getBenchmarks() || {};
      delete all[Settings.benchAgeGroup];
      DB.saveBenchmarks(all);
      Settings.renderBenchEditor(container);
      App.toast('Reset to defaults');
    });

    // Export
    container.querySelector('#btn-export').addEventListener('click', () => {
      const json = DB.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `itp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      App.toast('Backup exported');
    });

    // Import JSON
    container.querySelector('#btn-import-json').addEventListener('click', () => {
      container.querySelector('#input-import-json').click();
    });
    container.querySelector('#input-import-json').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const count = DB.importJSON(ev.target.result);
          App.toast(`Imported ${count} players`);
          Settings.show();
        } catch (err) {
          alert('Import failed: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    // Import CSV
    container.querySelector('#btn-import-csv').addEventListener('click', () => {
      container.querySelector('#input-import-csv').click();
    });
    container.querySelector('#input-import-csv').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const players = CSVImport.parse(ev.target.result);
          const count = DB.importPlayers(players);
          App.toast(`Imported ${count} players from CSV`);
          Settings.show();
        } catch (err) {
          alert('CSV import failed: ' + err.message);
        }
      };
      reader.readAsText(file);
    });

    // Clear all
    container.querySelector('#btn-clear-all').addEventListener('click', () => {
      if (confirm('This will permanently delete ALL data. Are you sure?')) {
        DB.clearAll();
        App.toast('All data cleared');
        location.hash = '#roster';
        Roster.render();
      }
    });
  },

  saveBenchmarks(container) {
    const all = DB.getBenchmarks() || {};
    if (!all[Settings.benchAgeGroup]) all[Settings.benchAgeGroup] = {};

    const inputs = container.querySelectorAll('#bench-editor input[data-test]');
    inputs.forEach(inp => {
      const testKey = inp.dataset.test;
      const level = inp.dataset.level;
      const val = parseFloat(inp.value);
      if (!all[Settings.benchAgeGroup][testKey]) {
        all[Settings.benchAgeGroup][testKey] = {};
      }
      all[Settings.benchAgeGroup][testKey][level] = isNaN(val) ? 0 : val;
    });

    DB.saveBenchmarks(all);
    App.toast('Benchmarks saved');
  }
};
