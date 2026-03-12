'use strict';

/* ═══════════════════════════════════════════════════════════════
   report.js — Family Report Builder: form, preview, PDF export
═══════════════════════════════════════════════════════════════ */

const Report = {

  _player: null,
  _review: null,   // { technical: { strengths:[], weaknesses:[], improved:[] }, ... }
  _trials: [],
  _coachNotes: '',
  _mediaLinks: [],

  init() {},

  // ── Entry Point ─────────────────────────────────────────────

  show(playerId) {
    const player = DB.get(playerId);
    if (!player) { location.hash = '#roster'; return; }

    Report._player = player;

    // Load saved data or initialize empty
    Report._review = player.developmentReview || Report._emptyReview();
    Report._trials = player.trials ? JSON.parse(JSON.stringify(player.trials)) : [];
    Report._coachNotes = player.coachNotes || '';
    Report._mediaLinks = player.mediaLinks ? JSON.parse(JSON.stringify(player.mediaLinks)) : [];

    const container = document.getElementById('report-content');
    container.innerHTML = Report._renderBuilder(player);
    Report._bindEvents(container, player);
  },

  _emptyReview() {
    const r = {};
    for (const pk of Object.keys(REPORT_TRAITS)) {
      r[pk] = { strengths: [], weaknesses: [], improved: [] };
    }
    return r;
  },

  // ══════════════════════════════════════════════════════════════
  //  FORM PANEL — Trait Selectors, Trials, Coach Notes, Media
  // ══════════════════════════════════════════════════════════════

  _renderBuilder(player) {
    const name = `${player.firstName} ${player.lastName}`;

    return `
      <div class="report-builder">
        <div class="back-row">
          <button class="btn-back" onclick="location.hash='#profile/${player.id}'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Profile
          </button>
        </div>

        <div class="report-builder-header">
          <h2>Family Report</h2>
          <p class="report-builder-sub">${name} &middot; ${player.ageGroup || '—'}</p>
        </div>

        <!-- ── Trait Selectors ─────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Development Review</div>
          <p class="report-section-desc">Click a trait to cycle: <span class="trait-legend-s">Strength</span> <span class="trait-legend-w">Weakness</span> <span class="trait-legend-i">Improved</span></p>
          ${Report._renderTraitSelectors()}
        </div>

        <!-- ── Trial Reports ──────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Trial Reports</div>
          <div id="report-trials-list">${Report._renderTrialsList()}</div>
          <button class="btn btn-outline btn-sm" id="btn-add-trial">+ Add Trial</button>
        </div>

        <!-- ── Coach Notes ────────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Coach Notes</div>
          <p class="report-section-desc">Personal observations to weave into the Head Coach evaluation.</p>
          <textarea id="report-coach-notes" class="report-textarea" rows="4" placeholder="e.g. William has shown tremendous growth this season. His attitude in training has been exemplary...">${Report._coachNotes}</textarea>
        </div>

        <!-- ── Media Links ────────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Media Links</div>
          <div id="report-media-list">${Report._renderMediaList()}</div>
          <button class="btn btn-outline btn-sm" id="btn-add-media">+ Add Link</button>
        </div>

        <!-- ── Actions ────────────────────────────────────── -->
        <div class="report-actions">
          <button class="btn btn-ghost" id="btn-report-save">Save Draft</button>
          <button class="btn btn-primary" id="btn-report-preview">Preview Report</button>
        </div>

        <!-- ── Preview Container ──────────────────────────── -->
        <div id="report-preview-area" style="display:none"></div>
      </div>`;
  },

  // ── Trait Selector Grid ──────────────────────────────────────

  _renderTraitSelectors() {
    let html = '';
    for (const [pillarKey, pillar] of Object.entries(REPORT_TRAITS)) {
      const rev = Report._review[pillarKey] || { strengths: [], weaknesses: [], improved: [] };
      html += `<div class="trait-pillar">
        <div class="trait-pillar-label">${pillar.label}</div>
        <div class="trait-grid">`;
      for (const [traitKey, traitLabel] of Object.entries(pillar.traits)) {
        let mode = 'none';
        if (rev.strengths.includes(traitKey)) mode = 'strength';
        else if (rev.weaknesses.includes(traitKey)) mode = 'weakness';
        else if (rev.improved.includes(traitKey)) mode = 'improved';
        html += `<button class="trait-chip" data-pillar="${pillarKey}" data-trait="${traitKey}" data-mode="${mode}">${traitLabel}</button>`;
      }
      html += `</div></div>`;
    }
    return html;
  },

  // ── Trials List ──────────────────────────────────────────────

  _renderTrialsList() {
    if (Report._trials.length === 0) {
      return '<div class="report-empty-hint">No trials added yet.</div>';
    }
    return Report._trials.map((t, i) => `
      <div class="trial-card" data-index="${i}">
        <div class="trial-card-header">
          <input class="trial-input trial-club" placeholder="Club name" value="${Report._esc(t.clubName || '')}">
          <input class="trial-input trial-date" type="date" value="${t.date || ''}">
          <button class="btn-icon trial-remove" title="Remove trial">&times;</button>
        </div>
        <div class="trial-rating-row">
          <span class="trial-rating-label">Rating:</span>
          ${[1,2,3,4,5].map(n => `<button class="trial-star${n <= (t.rating || 0) ? ' active' : ''}" data-n="${n}">&#9733;</button>`).join('')}
        </div>
        <textarea class="trial-input trial-strengths" placeholder="Strengths noted by club..." rows="2">${Report._esc(t.strengthsNoted || '')}</textarea>
        <textarea class="trial-input trial-areas" placeholder="Areas to improve..." rows="2">${Report._esc(t.areasToImprove || '')}</textarea>
        <textarea class="trial-input trial-comments" placeholder="Overall comments..." rows="2">${Report._esc(t.overallComments || '')}</textarea>
      </div>
    `).join('');
  },

  // ── Media Links List ─────────────────────────────────────────

  _renderMediaList() {
    if (Report._mediaLinks.length === 0) {
      return '<div class="report-empty-hint">No media links added.</div>';
    }
    return Report._mediaLinks.map((m, i) => `
      <div class="media-row" data-index="${i}">
        <input class="media-input media-label" placeholder="Label (e.g. Highlight Reel)" value="${Report._esc(m.label || '')}">
        <input class="media-input media-url" placeholder="URL" value="${Report._esc(m.url || '')}">
        <button class="btn-icon media-remove" title="Remove">&times;</button>
      </div>
    `).join('');
  },

  _esc(s) { return s.replace(/"/g, '&quot;').replace(/</g, '&lt;'); },

  // ── Event Binding ────────────────────────────────────────────

  _bindEvents(container, player) {
    // Trait chip clicks — cycle: none → strength → weakness → improved → none
    container.querySelectorAll('.trait-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const pillar = chip.dataset.pillar;
        const trait = chip.dataset.trait;
        const mode = chip.dataset.mode;
        const rev = Report._review[pillar];

        // Remove from all lists
        rev.strengths = rev.strengths.filter(t => t !== trait);
        rev.weaknesses = rev.weaknesses.filter(t => t !== trait);
        rev.improved = rev.improved.filter(t => t !== trait);

        // Cycle to next mode
        const next = mode === 'none' ? 'strength'
                   : mode === 'strength' ? 'weakness'
                   : mode === 'weakness' ? 'improved'
                   : 'none';
        if (next === 'strength') rev.strengths.push(trait);
        else if (next === 'weakness') rev.weaknesses.push(trait);
        else if (next === 'improved') rev.improved.push(trait);

        chip.dataset.mode = next;
      });
    });

    // Add trial
    container.querySelector('#btn-add-trial').addEventListener('click', () => {
      Report._trials.push({ clubName: '', date: '', rating: 0, strengthsNoted: '', areasToImprove: '', overallComments: '' });
      container.querySelector('#report-trials-list').innerHTML = Report._renderTrialsList();
      Report._bindTrialEvents(container);
    });
    Report._bindTrialEvents(container);

    // Add media
    container.querySelector('#btn-add-media').addEventListener('click', () => {
      Report._mediaLinks.push({ label: '', url: '' });
      container.querySelector('#report-media-list').innerHTML = Report._renderMediaList();
      Report._bindMediaEvents(container);
    });
    Report._bindMediaEvents(container);

    // Coach notes
    container.querySelector('#report-coach-notes').addEventListener('input', (e) => {
      Report._coachNotes = e.target.value;
    });

    // Save draft
    container.querySelector('#btn-report-save').addEventListener('click', () => {
      Report._syncFormData(container);
      Report._saveDraft(player);
      App.toast('Draft saved');
    });

    // Preview
    container.querySelector('#btn-report-preview').addEventListener('click', () => {
      Report._syncFormData(container);
      Report._saveDraft(player);
      Report._showPreview(player);
    });
  },

  _bindTrialEvents(container) {
    container.querySelectorAll('.trial-card').forEach(card => {
      const idx = parseInt(card.dataset.index);

      // Remove button
      card.querySelector('.trial-remove').addEventListener('click', () => {
        Report._trials.splice(idx, 1);
        container.querySelector('#report-trials-list').innerHTML = Report._renderTrialsList();
        Report._bindTrialEvents(container);
      });

      // Star rating
      card.querySelectorAll('.trial-star').forEach(star => {
        star.addEventListener('click', () => {
          const n = parseInt(star.dataset.n);
          Report._trials[idx].rating = n;
          card.querySelectorAll('.trial-star').forEach(s => {
            s.classList.toggle('active', parseInt(s.dataset.n) <= n);
          });
        });
      });

      // Text inputs
      const map = { 'trial-club': 'clubName', 'trial-date': 'date', 'trial-strengths': 'strengthsNoted', 'trial-areas': 'areasToImprove', 'trial-comments': 'overallComments' };
      for (const [cls, key] of Object.entries(map)) {
        const el = card.querySelector(`.${cls}`);
        if (el) el.addEventListener('input', () => { Report._trials[idx][key] = el.value; });
      }
    });
  },

  _bindMediaEvents(container) {
    container.querySelectorAll('.media-row').forEach(row => {
      const idx = parseInt(row.dataset.index);
      row.querySelector('.media-remove').addEventListener('click', () => {
        Report._mediaLinks.splice(idx, 1);
        container.querySelector('#report-media-list').innerHTML = Report._renderMediaList();
        Report._bindMediaEvents(container);
      });
      const labelEl = row.querySelector('.media-label');
      const urlEl = row.querySelector('.media-url');
      if (labelEl) labelEl.addEventListener('input', () => { Report._mediaLinks[idx].label = labelEl.value; });
      if (urlEl) urlEl.addEventListener('input', () => { Report._mediaLinks[idx].url = urlEl.value; });
    });
  },

  // ── Sync & Save ──────────────────────────────────────────────

  _syncFormData(container) {
    Report._coachNotes = container.querySelector('#report-coach-notes')?.value || '';
  },

  _saveDraft(player) {
    player.developmentReview = Report._review;
    player.trials = Report._trials;
    player.coachNotes = Report._coachNotes;
    player.mediaLinks = Report._mediaLinks;
    DB.save(player);
  },

  // ══════════════════════════════════════════════════════════════
  //  REPORT PREVIEW — 4-Page A4 Render
  // ══════════════════════════════════════════════════════════════

  _showPreview(player) {
    const area = document.getElementById('report-preview-area');
    area.style.display = '';
    area.innerHTML = `
      <div class="report-preview-toolbar">
        <button class="btn btn-primary" id="btn-export-pdf">Export PDF</button>
        <button class="btn btn-ghost" id="btn-close-preview">Close Preview</button>
      </div>
      <div class="report-preview-scroll">
        <div id="report-pages" class="report-pages">
          ${Report._renderPage1(player)}
          ${Report._renderPage2(player)}
          ${Report._renderPage3(player)}
          ${Report._renderPage4(player)}
        </div>
      </div>`;

    area.querySelector('#btn-close-preview').addEventListener('click', () => {
      area.style.display = 'none';
    });

    area.querySelector('#btn-export-pdf').addEventListener('click', () => {
      Report._exportPDF();
    });

    area.scrollIntoView({ behavior: 'smooth' });
  },

  // ── Page 1: Player Info + Physical + Dev Review (Tech + Tactical) ──

  _renderPage1(player) {
    const age = App.computeAge(player.dateOfBirth);
    const heightFt = App.cmToFeetInches(player.heightCm);
    const dob = player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Body composition grid
    const bodyItems = [];
    if (player.heightCm) bodyItems.push({ label: 'Height', value: `${player.heightCm} cm`, sub: heightFt });
    if (player.weightKg) bodyItems.push({ label: 'Weight', value: `${player.weightKg} kg`, sub: `${App.kgToLbs(player.weightKg)} lbs` });
    if (player.bodyFatPct) bodyItems.push({ label: 'Body Fat', value: `${player.bodyFatPct}%` });
    if (player.bmi) bodyItems.push({ label: 'BMI', value: player.bmi.toFixed(1) });
    if (player.muscleRatePct) bodyItems.push({ label: 'Muscle Rate', value: `${player.muscleRatePct}%` });

    const bodyHTML = bodyItems.length > 0 ? `
      <div class="rpt-physical">
        <div class="rpt-heading">Physical Analysis</div>
        <div class="rpt-body-grid">
          ${bodyItems.map(b => `<div class="rpt-body-cell"><div class="rpt-body-val">${b.value}</div>${b.sub ? `<div class="rpt-body-sub">${b.sub}</div>` : ''}<div class="rpt-body-label">${b.label}</div></div>`).join('')}
        </div>
      </div>` : '';

    // Development review — Technical + Tactical
    const techReview = ReportNarrative.generatePillarReview('technical', Report._review.technical, player);
    const tactReview = ReportNarrative.generatePillarReview('tactical', Report._review.tactical, player);

    const positions = (player.positions || []).map(p => typeof p === 'string' ? p : p.code).join(' / ') || '—';

    return `
      <div class="rpt-page">
        <div class="rpt-page-header">
          <img src="assets/logos/koln-fs.webp" alt="" class="rpt-logo">
          <div class="rpt-page-header-text">
            <div class="rpt-title">ITP Family Report</div>
            <div class="rpt-subtitle">1. FC Koln Football School</div>
          </div>
          <div class="rpt-date">${today}</div>
        </div>

        <div class="rpt-section">
          <div class="rpt-heading">Player Information</div>
          <div class="rpt-info-grid">
            <div class="rpt-info-row"><span class="rpt-info-label">Name</span><span class="rpt-info-value">${player.firstName} ${player.lastName}</span></div>
            <div class="rpt-info-row"><span class="rpt-info-label">Date of Birth</span><span class="rpt-info-value">${dob}</span></div>
            <div class="rpt-info-row"><span class="rpt-info-label">Age</span><span class="rpt-info-value">${age || '—'}</span></div>
            <div class="rpt-info-row"><span class="rpt-info-label">Nationality</span><span class="rpt-info-value">${player.nationality || '—'}</span></div>
            <div class="rpt-info-row"><span class="rpt-info-label">Position</span><span class="rpt-info-value">${positions}</span></div>
            <div class="rpt-info-row"><span class="rpt-info-label">Age Group</span><span class="rpt-info-value">${player.ageGroup || '—'}</span></div>
          </div>
        </div>

        ${bodyHTML}

        <div class="rpt-section">
          <div class="rpt-heading">Development Review</div>
          <div class="rpt-pillar">
            <div class="rpt-pillar-title">Technical</div>
            <p class="rpt-pillar-text">${techReview || '<em>No traits selected.</em>'}</p>
          </div>
          <div class="rpt-pillar">
            <div class="rpt-pillar-title">Tactical</div>
            <p class="rpt-pillar-text">${tactReview || '<em>No traits selected.</em>'}</p>
          </div>
        </div>

        <div class="rpt-page-footer">
          <span>ITP Family Report — ${player.firstName} ${player.lastName}</span>
          <span>Page 1 of 4</span>
        </div>
      </div>`;
  },

  // ── Page 2: Dev Review (Physical + Mental) + Performance Tests ──

  _renderPage2(player) {
    const physReview = ReportNarrative.generatePillarReview('physical', Report._review.physical, player);
    const mentReview = ReportNarrative.generatePillarReview('mental', Report._review.mental, player);

    // Performance test table — all sessions
    const testsHTML = Report._renderTestTable(player);

    return `
      <div class="rpt-page">
        <div class="rpt-page-header rpt-page-header-cont">
          <div class="rpt-title-sm">ITP Family Report</div>
          <div class="rpt-subtitle-sm">${player.firstName} ${player.lastName}</div>
        </div>

        <div class="rpt-section">
          <div class="rpt-pillar">
            <div class="rpt-pillar-title">Physical</div>
            <p class="rpt-pillar-text">${physReview || '<em>No traits selected.</em>'}</p>
          </div>
          <div class="rpt-pillar">
            <div class="rpt-pillar-title">Mental</div>
            <p class="rpt-pillar-text">${mentReview || '<em>No traits selected.</em>'}</p>
          </div>
        </div>

        <div class="rpt-section">
          <div class="rpt-heading">Performance Tests</div>
          ${testsHTML}
          <div class="rpt-bench-legend">
            <span class="rpt-bench-key" data-level="poor">NI</span>
            <span class="rpt-bench-key" data-level="average">Average</span>
            <span class="rpt-bench-key" data-level="good">Good</span>
            <span class="rpt-bench-key" data-level="elite">Elite</span>
          </div>
        </div>

        <div class="rpt-page-footer">
          <span>ITP Family Report — ${player.firstName} ${player.lastName}</span>
          <span>Page 2 of 4</span>
        </div>
      </div>`;
  },

  // ── Page 3: Key Strengths + Progression Charts + Improvements ──

  _renderPage3(player) {
    const strengths = ReportNarrative.getStrengthLabels(Report._review);
    const weaknesses = ReportNarrative.getWeaknessLabels(Report._review);
    const improvements = ReportNarrative.getBiggestImprovements(player);

    // Pick up to 3 tests with most sessions for progression charts
    const chartTests = Report._pickChartTests(player, 3);
    const chartsHTML = chartTests.map(tk => {
      const def = TEST_DEFS[tk];
      return `<div class="rpt-chart-block">
        <div class="rpt-chart-label">${def.name} (${def.unit})</div>
        ${Profile.renderProgressionChart(player, tk, 440, 140)}
      </div>`;
    }).join('');

    return `
      <div class="rpt-page">
        <div class="rpt-page-header rpt-page-header-cont">
          <div class="rpt-title-sm">ITP Family Report</div>
          <div class="rpt-subtitle-sm">${player.firstName} ${player.lastName}</div>
        </div>

        <div class="rpt-two-col">
          <div class="rpt-col">
            <div class="rpt-heading">Key Strengths</div>
            ${strengths.length > 0
              ? `<ul class="rpt-bullet-list">${strengths.map(s => `<li>${s}</li>`).join('')}</ul>`
              : '<p class="rpt-muted">No strengths selected.</p>'}
          </div>
          <div class="rpt-col">
            <div class="rpt-heading">Areas of Opportunity</div>
            ${weaknesses.length > 0
              ? `<ul class="rpt-bullet-list">${weaknesses.map(w => `<li>${w}</li>`).join('')}</ul>`
              : '<p class="rpt-muted">No areas selected.</p>'}
          </div>
        </div>

        ${chartsHTML ? `<div class="rpt-section">
          <div class="rpt-heading">Season Progression</div>
          <div class="rpt-charts-grid">${chartsHTML}</div>
        </div>` : ''}

        ${improvements.length > 0 ? `<div class="rpt-section">
          <div class="rpt-heading">Biggest Improvements This Season</div>
          <ul class="rpt-bullet-list rpt-improvements">
            ${improvements.map(imp => {
              const arrow = imp.lowerIsBetter ? '' : '';
              return `<li>${imp.name}: ${imp.from}${imp.unit} → ${imp.to}${imp.unit} (${imp.lowerIsBetter ? '-' : '+'}${imp.pctChange})</li>`;
            }).join('')}
          </ul>
        </div>` : ''}

        <div class="rpt-page-footer">
          <span>ITP Family Report — ${player.firstName} ${player.lastName}</span>
          <span>Page 3 of 4</span>
        </div>
      </div>`;
  },

  // ── Page 4: Trials + Head Coach Evaluation + Media ──

  _renderPage4(player) {
    // Trials
    const trialsHTML = Report._trials.length > 0
      ? Report._trials.map(t => {
          const stars = '&#9733;'.repeat(t.rating || 0) + '&#9734;'.repeat(5 - (t.rating || 0));
          const dateStr = t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
          return `<div class="rpt-trial">
            <div class="rpt-trial-header">
              <strong>${t.clubName || 'Unknown Club'}</strong>
              ${dateStr ? `<span class="rpt-trial-date">(${dateStr})</span>` : ''}
              <span class="rpt-trial-stars">${stars}</span>
            </div>
            ${t.strengthsNoted ? `<div class="rpt-trial-row"><span class="rpt-trial-label">Strengths:</span> ${t.strengthsNoted}</div>` : ''}
            ${t.areasToImprove ? `<div class="rpt-trial-row"><span class="rpt-trial-label">Areas to Improve:</span> ${t.areasToImprove}</div>` : ''}
            ${t.overallComments ? `<div class="rpt-trial-row"><span class="rpt-trial-label">Notes:</span> ${t.overallComments}</div>` : ''}
          </div>`;
        }).join('')
      : '<p class="rpt-muted">No trial reports recorded.</p>';

    // Head Coach Evaluation
    const coachEval = ReportNarrative.generateCoachEvaluation(
      player, Report._review, Report._coachNotes, Report._trials
    );

    // Media
    const mediaHTML = Report._mediaLinks.filter(m => m.url).length > 0
      ? Report._mediaLinks.filter(m => m.url).map(m =>
          `<div class="rpt-media-row">
            <span class="rpt-media-icon">&#9654;</span>
            <a href="${m.url}" target="_blank" rel="noopener">${m.label || m.url}</a>
          </div>`
        ).join('')
      : '';

    return `
      <div class="rpt-page">
        <div class="rpt-page-header rpt-page-header-cont">
          <div class="rpt-title-sm">ITP Family Report</div>
          <div class="rpt-subtitle-sm">${player.firstName} ${player.lastName}</div>
        </div>

        <div class="rpt-section">
          <div class="rpt-heading">Soccer Tryout Reports</div>
          ${trialsHTML}
        </div>

        <div class="rpt-section">
          <div class="rpt-heading">Head Coach Evaluation</div>
          <div class="rpt-coach-eval">${coachEval}</div>
        </div>

        ${mediaHTML ? `<div class="rpt-section">
          <div class="rpt-heading">Media</div>
          ${mediaHTML}
        </div>` : ''}

        <div class="rpt-page-footer rpt-page-footer-final">
          <img src="assets/logos/koln-fs.webp" alt="" class="rpt-footer-logo">
          <span>ITP Family Report — ${player.firstName} ${player.lastName} — Page 4 of 4</span>
        </div>
      </div>`;
  },

  // ── Test Results Table ───────────────────────────────────────

  _renderTestTable(player) {
    if (!player.tests || !player.ageGroup) {
      return '<p class="rpt-muted">No test data recorded.</p>';
    }

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtDate = (iso) => {
      const [y, m, d] = iso.split('-');
      return `${MONTHS[parseInt(m, 10) - 1]}`;
    };

    // Collect all session dates
    const allDates = new Set();
    const categories = Benchmarks.getTestsByCategory();
    for (const testKeys of Object.values(categories)) {
      for (const tk of testKeys) {
        const sessions = player.tests?.[tk]?.sessions || [];
        for (const s of sessions) { if (s.best != null) allDates.add(s.date); }
      }
    }
    const sortedDates = [...allDates].sort((a, b) => a.localeCompare(b));
    if (sortedDates.length === 0) return '<p class="rpt-muted">No test data recorded.</p>';

    const dateHeaders = sortedDates.map(d => `<th>${fmtDate(d)}</th>`).join('');

    let rows = '';
    for (const [catName, testKeys] of Object.entries(categories)) {
      let catHasData = false;
      let catRows = '';
      for (const tk of testKeys) {
        const testData = player.tests?.[tk];
        if (!testData || testData.best == null) continue;
        catHasData = true;
        const def = TEST_DEFS[tk];
        const latest = DB.getLatestSession(player, tk);
        const { level } = Benchmarks.evaluate(player.ageGroup, tk, latest?.best ?? testData.best);

        let sessionCells = '';
        for (const date of sortedDates) {
          const session = (testData.sessions || []).find(s => s.date === date);
          const val = session?.best ?? null;
          if (val !== null) {
            const { level: cellLevel } = Benchmarks.evaluate(player.ageGroup, tk, val);
            sessionCells += `<td class="rpt-test-val" data-level="${cellLevel}">${val}</td>`;
          } else {
            sessionCells += `<td class="rpt-test-val rpt-test-empty">—</td>`;
          }
        }

        const levelLabel = level === 'none' ? '—' : level.toUpperCase();
        catRows += `<tr>
          <td class="rpt-test-name">${def.name}</td>
          ${sessionCells}
          <td class="rpt-test-level" data-level="${level}">${levelLabel}</td>
        </tr>`;
      }
      if (catHasData) {
        rows += `<tr class="rpt-test-cat"><td colspan="${sortedDates.length + 2}">${catName}</td></tr>`;
        rows += catRows;
      }
    }

    return `<table class="rpt-test-table">
      <thead><tr>
        <th class="rpt-test-th-name">Test</th>
        ${dateHeaders}
        <th>Level</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  },

  // ── Helpers ──────────────────────────────────────────────────

  _pickChartTests(player, count) {
    if (!player.tests) return [];
    const scored = [];
    for (const [tk, td] of Object.entries(player.tests)) {
      const sessions = td?.sessions || [];
      const validSessions = sessions.filter(s => s.best != null);
      if (validSessions.length >= 2) {
        scored.push({ tk, count: validSessions.length });
      }
    }
    scored.sort((a, b) => b.count - a.count);
    return scored.slice(0, count).map(s => s.tk);
  },

  // ── PDF Export ───────────────────────────────────────────────

  _exportPDF() {
    const pages = document.getElementById('report-pages');
    if (!pages) return;

    // Load html2pdf from CDN if needed
    if (typeof html2pdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => Report._doPDFExport(pages);
      document.head.appendChild(script);
    } else {
      Report._doPDFExport(pages);
    }
  },

  _doPDFExport(element) {
    const player = Report._player;
    const filename = `ITP_Family_Report_${player.firstName}_${player.lastName}.pdf`;

    html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], before: '.rpt-page' }
      })
      .from(element)
      .save()
      .then(() => App.toast('PDF exported'))
      .catch(err => {
        console.error('PDF export error:', err);
        alert('PDF export failed. Check console for details.');
      });
  }
};
