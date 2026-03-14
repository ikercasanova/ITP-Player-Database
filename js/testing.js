'use strict';

/* ═══════════════════════════════════════════════════════════════
   testing.js — Station-based testing session (key mobile UX)
═══════════════════════════════════════════════════════════════ */

const Testing = {
  // Session state
  activeTest:   null,   // test key (for individual tests)
  activeGroup:  null,   // group key (for grouped tests like speed)
  ageGroups:    [],     // selected age groups
  players:      [],     // players in this session
  currentIndex: 0,
  phase:        'setup', // 'setup' | 'queue' | 'summary'
  sessionDate:  null,   // date string for this testing session

  init() {},

  show() {
    if (Testing.phase === 'queue' && Testing.players.length > 0) {
      Testing.renderQueue();
    } else if (Testing.phase === 'summary') {
      Testing.renderSummary();
    } else {
      Testing.phase = 'setup';
      Testing.renderSetup();
    }
  },

  // ── Setup Phase ─────────────────────────────────────────────

  renderSetup() {
    const container = document.getElementById('testing-content');

    // Build test options: grouped tests + individual tests
    const usedInGroups = new Set();
    const groupOptions = [];
    for (const [gk, group] of Object.entries(TEST_GROUPS)) {
      groupOptions.push(`<option value="group:${gk}">${group.name}</option>`);
      for (const tk of group.tests) usedInGroups.add(tk);
    }
    const individualOptions = Object.entries(TEST_DEFS)
      .filter(([key]) => !usedInGroups.has(key))
      .map(([key, def]) => `<option value="${key}">${def.name} (${def.unit})</option>`)
      .join('');

    const testOptions = groupOptions.join('') + individualOptions;

    container.innerHTML = `
      <div class="testing-page">
        <div class="testing-setup">
          <h2>New Testing Session</h2>

          <div class="form-field">
            <label class="form-label" for="test-select">Test</label>
            <select class="form-select" id="test-select">
              <option value="">Select a test...</option>
              ${testOptions}
            </select>
          </div>

          <div class="form-field">
            <label class="form-label">Age Groups</label>
            <div id="test-age-groups" style="display:flex;gap:8px;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:5px;font-size:14px;cursor:pointer">
                <input type="checkbox" value="U-17" checked> U-17
              </label>
              <label style="display:flex;align-items:center;gap:5px;font-size:14px;cursor:pointer">
                <input type="checkbox" value="U-19" checked> U-19
              </label>
              <label style="display:flex;align-items:center;gap:5px;font-size:14px;cursor:pointer">
                <input type="checkbox" value="U-21" checked> U-21
              </label>
            </div>
          </div>

          <div class="form-field">
            <label class="form-label" for="test-session-date">Session Date</label>
            <input type="date" class="form-select" id="test-session-date" value="${new Date().toISOString().slice(0, 10)}">
          </div>

          <button id="btn-start-session" class="btn btn-primary btn-lg btn-block mt-16">Start Session</button>
        </div>

        ${Testing.renderRecentSessions()}
      </div>`;

    container.querySelector('#btn-start-session').addEventListener('click', () => {
      Testing.startSession(container);
    });
  },

  renderRecentSessions() {
    const players = DB.getAll();
    const counts = {};
    for (const p of players) {
      if (!p.tests) continue;
      for (const key of Object.keys(p.tests)) {
        if (p.tests[key]?.best !== null && p.tests[key]?.best !== undefined) {
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }

    if (Object.keys(counts).length === 0) return '';

    // Merge grouped tests into single rows
    const usedKeys = new Set();
    const displayRows = [];

    for (const [gk, group] of Object.entries(TEST_GROUPS)) {
      const maxCount = Math.max(0, ...group.tests.map(tk => counts[tk] || 0));
      if (maxCount > 0) {
        displayRows.push({ name: group.name, count: maxCount });
      }
      group.tests.forEach(tk => usedKeys.add(tk));
    }

    for (const [key, count] of Object.entries(counts)) {
      if (usedKeys.has(key)) continue;
      const def = TEST_DEFS[key];
      if (def) displayRows.push({ name: def.name, count });
    }

    if (displayRows.length === 0) return '';

    const rows = displayRows.map(r => `<div class="settings-row">
      <span class="settings-label">${r.name}</span>
      <span class="settings-value">${r.count} player${r.count !== 1 ? 's' : ''}</span>
    </div>`).join('');

    return `
      <div class="testing-setup" style="margin-top:16px">
        <h2 style="font-size:16px;margin-bottom:10px">Test Coverage</h2>
        ${rows}
      </div>`;
  },

  startSession(container) {
    const selectValue = container.querySelector('#test-select').value;
    if (!selectValue) {
      App.toast('Please select a test');
      return;
    }

    // Detect group vs. individual
    if (selectValue.startsWith('group:')) {
      Testing.activeGroup = selectValue.slice(6);
      Testing.activeTest = null;
    } else {
      Testing.activeGroup = null;
      Testing.activeTest = selectValue;
    }

    const groups = [];
    container.querySelectorAll('#test-age-groups input:checked').forEach(cb => {
      groups.push(cb.value);
    });
    if (groups.length === 0) {
      App.toast('Select at least one age group');
      return;
    }

    Testing.ageGroups = groups;
    Testing.sessionDate = container.querySelector('#test-session-date').value || new Date().toISOString().slice(0, 10);
    Testing.currentIndex = 0;
    Testing.phase = 'queue';

    Testing.players = DB.getAll()
      .filter(p => groups.includes(p.ageGroup))
      .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

    if (Testing.players.length === 0) {
      App.toast('No players in selected age groups');
      Testing.phase = 'setup';
      return;
    }

    Testing.renderQueue();
  },

  // ── Queue Phase ─────────────────────────────────────────────

  renderQueue() {
    if (Testing.activeGroup) {
      Testing.renderGroupedQueue();
      return;
    }

    const container = document.getElementById('testing-content');
    const player = Testing.players[Testing.currentIndex];
    if (!player) return;

    const def = TEST_DEFS[Testing.activeTest];
    const testData = player.tests?.[Testing.activeTest];
    const currentSession = testData?.sessions?.find(s => s.date === Testing.sessionDate);
    const attempts = currentSession?.attempts || [null, null, null];

    // Compute best for display
    const validNums = attempts.filter(v => v !== null && v !== undefined && v !== '')
      .map(Number).filter(n => !isNaN(n));
    let best = null;
    if (validNums.length > 0) {
      best = def.lowerIsBetter ? Math.min(...validNums) : Math.max(...validNums);
    }

    const benchResult = best !== null
      ? Benchmarks.evaluate(player.ageGroup, Testing.activeTest, best)
      : { level: 'none', pct: 0 };

    const initials = (player.firstName?.[0] || '') + (player.lastName?.[0] || '');

    container.innerHTML = `
      <div class="testing-page">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <button class="btn-back" id="btn-end-session">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            End
          </button>
          <span style="font-family:var(--font-cond);font-weight:700;font-size:16px;color:var(--gray-700)">
            ${def.name}
          </span>
          <span style="font-size:13px;color:var(--gray-500)">${Testing.currentIndex + 1} / ${Testing.players.length}</span>
        </div>

        <div class="testing-player-card">
          <div class="testing-player-header">
            ${player.photoBase64
              ? `<img class="testing-player-photo" src="${player.photoBase64}" alt="">`
              : `<div class="testing-player-photo" style="display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:var(--gray-500)">${initials}</div>`
            }
            <div>
              <div class="testing-player-name">${player.firstName} ${player.lastName}</div>
              <div class="testing-player-pos">${player.ageGroup || ''} ${(player.positions || []).map(p => typeof p === 'string' ? p : p.code).join(', ')}</div>
            </div>
          </div>

          <div class="testing-attempts">
            ${[0, 1, 2].map(i => `
              <div class="attempt-row">
                <span class="attempt-label">Attempt ${i + 1}</span>
                <input class="attempt-input" type="number" inputmode="decimal" step="any"
                  data-attempt="${i}" value="${attempts[i] ?? ''}" placeholder="—">
              </div>`).join('')}
          </div>

          <div class="testing-best">
            <span class="testing-best-label">Best:</span>
            <span class="testing-best-value" id="testing-best-display" style="color:var(--bench-${benchResult.level === 'none' ? 'poor' : benchResult.level})">
              ${best !== null ? `${best} ${def.unit}` : '—'}
            </span>
            ${best !== null ? `<span class="bench-level-label" data-level="${benchResult.level}">${benchResult.level}</span>` : ''}
          </div>
        </div>

        <!-- Progress dots -->
        <div class="testing-progress" style="margin-top:14px">
          ${Testing.players.map((_, i) => {
            const pData = _.tests?.[Testing.activeTest];
            const hasBest = pData?.best !== null && pData?.best !== undefined;
            const cls = i === Testing.currentIndex ? 'active' : (hasBest ? 'done' : '');
            return `<span class="progress-dot ${cls}"></span>`;
          }).join('')}
        </div>

        <!-- Navigation -->
        <div class="testing-nav">
          <button class="btn btn-outline" id="btn-prev" ${Testing.currentIndex === 0 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Prev
          </button>
          ${Testing.currentIndex === Testing.players.length - 1
            ? `<button class="btn btn-primary" id="btn-finish">Finish</button>`
            : `<button class="btn btn-primary" id="btn-next">
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>`
          }
        </div>
      </div>`;

    // Bind events
    container.querySelectorAll('.attempt-input').forEach(input => {
      input.addEventListener('input', () => Testing.onAttemptChange(container));
      input.addEventListener('change', () => Testing.onAttemptChange(container));
    });

    container.querySelector('#btn-end-session').addEventListener('click', () => {
      Testing.saveCurrentPlayer(container);
      Testing.phase = 'summary';
      Testing.renderSummary();
    });

    const prevBtn = container.querySelector('#btn-prev');
    if (prevBtn) prevBtn.addEventListener('click', () => Testing.navigate(-1, container));

    const nextBtn = container.querySelector('#btn-next');
    if (nextBtn) nextBtn.addEventListener('click', () => Testing.navigate(1, container));

    const finishBtn = container.querySelector('#btn-finish');
    if (finishBtn) finishBtn.addEventListener('click', () => {
      Testing.saveCurrentPlayer(container);
      Testing.phase = 'summary';
      Testing.renderSummary();
    });

    Testing.initSwipe(container);
  },

  // ── Grouped Queue (Speed Testing) ──────────────────────────

  renderGroupedQueue() {
    const container = document.getElementById('testing-content');
    const player = Testing.players[Testing.currentIndex];
    if (!player) return;

    const group = TEST_GROUPS[Testing.activeGroup];
    const testKeys = group.tests;
    const shortLabels = { sprint5m: '5m', sprint10m: '10m', sprint30m: '30m', sprint40yd: '40yd' };

    // Get current session data for each distance
    const sessionData = {};
    for (const tk of testKeys) {
      const tData = player.tests?.[tk];
      const currentSession = tData?.sessions?.find(s => s.date === Testing.sessionDate);
      sessionData[tk] = currentSession?.attempts || [null, null, null];
    }

    const initials = (player.firstName?.[0] || '') + (player.lastName?.[0] || '');

    // Build attempt rows
    const attemptsHTML = [0, 1, 2].map(i => `
      <div class="speed-attempt-row">
        <span class="attempt-label">Att ${i + 1}</span>
        <div class="speed-inputs">
          ${testKeys.map(tk => `
            <div class="speed-input-cell">
              ${i === 0 ? `<span class="speed-input-header">${shortLabels[tk] || tk}</span>` : ''}
              <input class="speed-attempt-input" type="number" inputmode="decimal" step="any"
                data-attempt="${i}" data-test="${tk}"
                value="${sessionData[tk][i] ?? ''}" placeholder="—">
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Best per distance
    const bestRowHTML = testKeys.map(tk => {
      const vals = [0, 1, 2].map(i => sessionData[tk][i]).filter(v => v !== null && v !== undefined && v !== '').map(Number).filter(n => !isNaN(n));
      const best = vals.length > 0 ? Math.min(...vals) : null;
      const benchResult = best !== null
        ? Benchmarks.evaluate(player.ageGroup, tk, best)
        : { level: 'none' };

      return `<div class="speed-best-cell" id="best-${tk}">
        <span class="speed-input-header">${shortLabels[tk] || tk}</span>
        <span class="speed-best-val" style="color:var(--bench-${benchResult.level === 'none' ? 'poor' : benchResult.level})">
          ${best !== null ? best : '—'}
        </span>
        ${best !== null ? `<span class="bench-level-label" data-level="${benchResult.level}" style="font-size:9px;padding:0 5px">${benchResult.level}</span>` : ''}
      </div>`;
    }).join('');

    container.innerHTML = `
      <div class="testing-page">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <button class="btn-back" id="btn-end-session">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            End
          </button>
          <span style="font-family:var(--font-cond);font-weight:700;font-size:16px;color:var(--gray-700)">
            ${group.name}
          </span>
          <span style="font-size:13px;color:var(--gray-500)">${Testing.currentIndex + 1} / ${Testing.players.length}</span>
        </div>

        <div class="testing-player-card">
          <div class="testing-player-header">
            ${player.photoBase64
              ? `<img class="testing-player-photo" src="${player.photoBase64}" alt="">`
              : `<div class="testing-player-photo" style="display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:var(--gray-500)">${initials}</div>`
            }
            <div>
              <div class="testing-player-name">${player.firstName} ${player.lastName}</div>
              <div class="testing-player-pos">${player.ageGroup || ''} ${(player.positions || []).map(p => typeof p === 'string' ? p : p.code).join(', ')}</div>
            </div>
          </div>

          <div class="speed-attempts">
            ${attemptsHTML}
          </div>

          <div class="speed-best-row">
            <span class="testing-best-label">Best</span>
            <div class="speed-best-cells">${bestRowHTML}</div>
          </div>
        </div>

        <div class="testing-progress" style="margin-top:14px">
          ${Testing.players.map((pl, i) => {
            const hasData = testKeys.some(tk => {
              const td = pl.tests?.[tk];
              const sess = td?.sessions?.find(s => s.date === Testing.sessionDate);
              return sess?.best !== null && sess?.best !== undefined;
            });
            const cls = i === Testing.currentIndex ? 'active' : (hasData ? 'done' : '');
            return `<span class="progress-dot ${cls}"></span>`;
          }).join('')}
        </div>

        <div class="testing-nav">
          <button class="btn btn-outline" id="btn-prev" ${Testing.currentIndex === 0 ? 'disabled' : ''}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Prev
          </button>
          ${Testing.currentIndex === Testing.players.length - 1
            ? `<button class="btn btn-primary" id="btn-finish">Finish</button>`
            : `<button class="btn btn-primary" id="btn-next">
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>`
          }
        </div>
      </div>`;

    // Bind events
    container.querySelectorAll('.speed-attempt-input').forEach(input => {
      input.addEventListener('input', () => Testing.onGroupedAttemptChange(container));
      input.addEventListener('change', () => Testing.onGroupedAttemptChange(container));
    });

    container.querySelector('#btn-end-session').addEventListener('click', () => {
      Testing.saveCurrentPlayer(container);
      Testing.phase = 'summary';
      Testing.renderSummary();
    });

    const prevBtn = container.querySelector('#btn-prev');
    if (prevBtn) prevBtn.addEventListener('click', () => Testing.navigate(-1, container));

    const nextBtn = container.querySelector('#btn-next');
    if (nextBtn) nextBtn.addEventListener('click', () => Testing.navigate(1, container));

    const finishBtn = container.querySelector('#btn-finish');
    if (finishBtn) finishBtn.addEventListener('click', () => {
      Testing.saveCurrentPlayer(container);
      Testing.phase = 'summary';
      Testing.renderSummary();
    });

    Testing.initSwipe(container);
  },

  onGroupedAttemptChange(container) {
    const group = TEST_GROUPS[Testing.activeGroup];
    const player = Testing.players[Testing.currentIndex];

    for (const tk of group.tests) {
      const inputs = container.querySelectorAll(`.speed-attempt-input[data-test="${tk}"]`);
      const vals = Array.from(inputs).map(inp => parseFloat(inp.value)).filter(v => !isNaN(v));
      const best = vals.length > 0 ? Math.min(...vals) : null;

      const benchResult = best !== null
        ? Benchmarks.evaluate(player.ageGroup, tk, best)
        : { level: 'none' };

      const cell = container.querySelector(`#best-${tk} .speed-best-val`);
      if (cell) {
        cell.textContent = best !== null ? best : '—';
        cell.style.color = `var(--bench-${benchResult.level === 'none' ? 'poor' : benchResult.level})`;
      }

      // Update level label
      const levelLabel = container.querySelector(`#best-${tk} .bench-level-label`);
      if (levelLabel && best !== null) {
        levelLabel.dataset.level = benchResult.level;
        levelLabel.textContent = benchResult.level;
      }
    }
  },

  // ── Common ─────────────────────────────────────────────────

  onAttemptChange(container) {
    const def = TEST_DEFS[Testing.activeTest];
    const inputs = container.querySelectorAll('.attempt-input');
    const vals = Array.from(inputs).map(inp => {
      const v = parseFloat(inp.value);
      return isNaN(v) ? null : v;
    });

    const validNums = vals.filter(v => v !== null);
    let best = null;
    if (validNums.length > 0) {
      best = def.lowerIsBetter ? Math.min(...validNums) : Math.max(...validNums);
    }

    const player = Testing.players[Testing.currentIndex];
    const benchResult = best !== null
      ? Benchmarks.evaluate(player.ageGroup, Testing.activeTest, best)
      : { level: 'none', pct: 0 };

    const display = container.querySelector('#testing-best-display');
    if (display) {
      display.textContent = best !== null ? `${best} ${def.unit}` : '—';
      display.style.color = `var(--bench-${benchResult.level === 'none' ? 'poor' : benchResult.level})`;
    }
  },

  saveCurrentPlayer(container) {
    const player = Testing.players[Testing.currentIndex];
    if (!player) return;

    if (Testing.activeGroup) {
      // Grouped: save each distance separately
      const group = TEST_GROUPS[Testing.activeGroup];
      for (const tk of group.tests) {
        const inputs = container.querySelectorAll(`.speed-attempt-input[data-test="${tk}"]`);
        inputs.forEach(inp => {
          const idx = parseInt(inp.dataset.attempt);
          const v = inp.value.trim();
          const num = v === '' ? null : parseFloat(v);
          DB.updateTestResult(player.id, tk, idx, isNaN(num) ? null : num, Testing.sessionDate);
        });
      }
    } else {
      // Single test
      const inputs = container.querySelectorAll('.attempt-input');
      inputs.forEach(inp => {
        const idx = parseInt(inp.dataset.attempt);
        const v = inp.value.trim();
        const num = v === '' ? null : parseFloat(v);
        DB.updateTestResult(player.id, Testing.activeTest, idx, isNaN(num) ? null : num, Testing.sessionDate);
      });
    }

    Testing.players[Testing.currentIndex] = DB.get(player.id);
  },

  navigate(dir, container) {
    Testing.saveCurrentPlayer(container);
    Testing.currentIndex = Math.max(0, Math.min(Testing.players.length - 1, Testing.currentIndex + dir));
    Testing.renderQueue();
  },

  // ── Swipe Support ───────────────────────────────────────────

  initSwipe(container) {
    let startX = 0;
    let startY = 0;

    container.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0 && Testing.currentIndex < Testing.players.length - 1) {
          Testing.navigate(1, container);
        } else if (dx > 0 && Testing.currentIndex > 0) {
          Testing.navigate(-1, container);
        }
      }
    }, { passive: true });
  },

  // ── Summary Phase ───────────────────────────────────────────

  renderSummary() {
    if (Testing.activeGroup) {
      Testing.renderGroupedSummary();
      return;
    }

    const container = document.getElementById('testing-content');
    const def = TEST_DEFS[Testing.activeTest];
    if (!def) {
      Testing.phase = 'setup';
      Testing.renderSetup();
      return;
    }

    const results = Testing.players
      .map(p => {
        const t = p.tests?.[Testing.activeTest];
        const sessionData = t?.sessions?.find(s => s.date === Testing.sessionDate);
        return { player: p, best: sessionData?.best ?? null };
      })
      .filter(r => r.best !== null);

    results.sort((a, b) => def.lowerIsBetter ? a.best - b.best : b.best - a.best);

    const values = results.map(r => r.best);
    const avg = values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : '—';
    const bestResult = results[0];
    const tested = results.length;
    const total = Testing.players.length;

    const levelCounts = { elite: 0, good: 0, average: 0, poor: 0 };
    for (const r of results) {
      const { level } = Benchmarks.evaluate(r.player.ageGroup, Testing.activeTest, r.best);
      if (levelCounts[level] !== undefined) levelCounts[level]++;
    }

    const tableRows = results.map((r, i) => {
      const { level } = Benchmarks.evaluate(r.player.ageGroup, Testing.activeTest, r.best);
      const initials = (r.player.firstName?.[0] || '') + (r.player.lastName?.[0] || '');
      return `<tr>
        <td class="summary-rank">${i + 1}</td>
        <td>
          <div class="summary-player">
            ${r.player.photoBase64
              ? `<img class="summary-photo" src="${r.player.photoBase64}" alt="">`
              : `<div class="summary-photo" style="display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gray-500)">${initials}</div>`
            }
            <span class="summary-name">${r.player.firstName} ${r.player.lastName}</span>
          </div>
        </td>
        <td><span class="summary-value">${r.best}</span> ${def.unit}</td>
        <td><span class="bench-level-label" data-level="${level}">${level}</span></td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="testing-page">
        <div class="testing-summary">
          <h2>Session Complete: ${def.name} <span style="font-size:14px;font-weight:400;color:var(--gray-500)">${Testing.sessionDate}</span></h2>

          <div class="stat-highlights">
            <div class="stat-card">
              <div class="stat-card-value">${tested}/${total}</div>
              <div class="stat-card-label">Tested</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-value">${avg}</div>
              <div class="stat-card-label">Average</div>
            </div>
            <div class="stat-card">
              <div class="stat-card-value" style="color:var(--bench-elite)">${bestResult ? bestResult.best : '—'}</div>
              <div class="stat-card-label">Best</div>
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
            <span class="bench-level-label" data-level="elite">Elite: ${levelCounts.elite}</span>
            <span class="bench-level-label" data-level="good">Good: ${levelCounts.good}</span>
            <span class="bench-level-label" data-level="average">Avg: ${levelCounts.average}</span>
            <span class="bench-level-label" data-level="poor">Below Avg: ${levelCounts.poor}</span>
          </div>

          ${results.length > 0 ? `
            <table class="summary-table">
              <thead><tr><th>#</th><th>Player</th><th>Best</th><th>Level</th></tr></thead>
              <tbody>${tableRows}</tbody>
            </table>` : '<div class="no-data">No results recorded.</div>'}
        </div>

        <div class="form-actions">
          <button class="btn btn-outline" onclick="Testing.phase='setup';Testing.renderSetup()">New Session</button>
          <button class="btn btn-primary" onclick="location.hash='#roster'">Back to Roster</button>
        </div>
      </div>`;
  },

  // ── Grouped Summary (Speed Testing) ────────────────────────

  renderGroupedSummary() {
    const container = document.getElementById('testing-content');
    const group = TEST_GROUPS[Testing.activeGroup];
    const testKeys = group.tests;
    const shortLabels = { sprint5m: '5m', sprint10m: '10m', sprint30m: '30m', sprint40yd: '40yd' };

    const results = Testing.players.map(p => {
      const cells = {};
      let hasAny = false;
      for (const tk of testKeys) {
        const t = p.tests?.[tk];
        const sessionData = t?.sessions?.find(s => s.date === Testing.sessionDate);
        cells[tk] = sessionData?.best ?? null;
        if (cells[tk] !== null) hasAny = true;
      }
      return { player: p, cells, hasAny };
    }).filter(r => r.hasAny);

    // Sort by first distance ascending
    results.sort((a, b) => {
      const aVal = a.cells[testKeys[0]] ?? 999;
      const bVal = b.cells[testKeys[0]] ?? 999;
      return aVal - bVal;
    });

    const tested = results.length;
    const total = Testing.players.length;

    const headerCols = testKeys.map(tk => `<th>${shortLabels[tk] || tk}</th>`).join('');

    const tableRows = results.map((r, i) => {
      const initials = (r.player.firstName?.[0] || '') + (r.player.lastName?.[0] || '');
      const dataCells = testKeys.map(tk => {
        const v = r.cells[tk];
        if (v === null) return `<td>—</td>`;
        const { level } = Benchmarks.evaluate(r.player.ageGroup, tk, v);
        return `<td><span class="sprint-val" data-level="${level}">${v}</span></td>`;
      }).join('');

      return `<tr>
        <td class="summary-rank">${i + 1}</td>
        <td>
          <div class="summary-player">
            ${r.player.photoBase64
              ? `<img class="summary-photo" src="${r.player.photoBase64}" alt="">`
              : `<div class="summary-photo" style="display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--gray-500)">${initials}</div>`
            }
            <span class="summary-name">${r.player.firstName} ${r.player.lastName}</span>
          </div>
        </td>
        ${dataCells}
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="testing-page">
        <div class="testing-summary">
          <h2>Session Complete: ${group.name} <span style="font-size:14px;font-weight:400;color:var(--gray-500)">${Testing.sessionDate}</span></h2>

          <div class="stat-highlights">
            <div class="stat-card">
              <div class="stat-card-value">${tested}/${total}</div>
              <div class="stat-card-label">Tested</div>
            </div>
          </div>

          ${results.length > 0 ? `
            <div class="table-scroll">
              <table class="summary-table speed-summary-table">
                <thead><tr><th>#</th><th>Player</th>${headerCols}</tr></thead>
                <tbody>${tableRows}</tbody>
              </table>
            </div>` : '<div class="no-data">No results recorded.</div>'}
        </div>

        <div class="form-actions">
          <button class="btn btn-outline" onclick="Testing.phase='setup';Testing.renderSetup()">New Session</button>
          <button class="btn btn-primary" onclick="location.hash='#roster'">Back to Roster</button>
        </div>
      </div>`;
  }
};
