'use strict';

/* ═══════════════════════════════════════════════════════════════
   trial-report.js — Trial Evaluation Report: builder, preview, PDF
═══════════════════════════════════════════════════════════════ */

const TrialReport = {

  _player: null,
  _evaluation: null, // { traits: {technical: {strengths:[], weaknesses:[]}, ...}, generalNotes, recommendation, recommendationSummary }

  init() {},

  // ── Entry Point ─────────────────────────────────────────────

  show(playerId) {
    const player = DB.get(playerId);
    if (!player) { location.hash = '#roster'; return; }

    TrialReport._player = player;
    TrialReport._evaluation = player.trialEvaluation
      ? JSON.parse(JSON.stringify(player.trialEvaluation))
      : TrialReport._emptyEvaluation();

    const container = document.getElementById('trial-report-content');
    container.innerHTML = TrialReport._renderBuilder(player);
    TrialReport._bindEvents(container, player);
  },

  _emptyEvaluation() {
    const traits = {};
    for (const pk of Object.keys(REPORT_TRAITS)) {
      traits[pk] = { strengths: [], weaknesses: [] };
    }
    return { traits, generalNotes: '', recommendation: '', recommendationSummary: '' };
  },

  // ══════════════════════════════════════════════════════════════
  //  BUILDER FORM
  // ══════════════════════════════════════════════════════════════

  _renderBuilder(player) {
    const name = `${player.firstName} ${player.lastName}`;
    const ev = TrialReport._evaluation;

    return `
      <div class="report-builder">
        <div class="back-row">
          <button class="btn-back" onclick="location.hash='#profile/${player.id}'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Profile
          </button>
        </div>

        <div class="report-builder-header">
          <h2>Trial Evaluation Report</h2>
          <p class="report-builder-sub">${name} &middot; ${player.ageGroup || '—'}</p>
        </div>

        <!-- ── Coaching Evaluation (Trait Chips) ──────────── -->
        <div class="report-section">
          <div class="report-section-title">Coaching Evaluation</div>
          <p class="report-section-desc">Click to cycle: <span class="trl-legend-s">Strength</span> <span class="trl-legend-w">Area to Develop</span></p>
          ${TrialReport._renderTraitSelectors()}
        </div>

        <!-- ── General Notes ──────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">General Notes</div>
          <textarea class="report-textarea" id="trl-general-notes" rows="3" placeholder="Additional observations...">${TrialReport._esc(ev.generalNotes)}</textarea>
        </div>

        <!-- ── Recommendation ─────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Recommendation</div>
          <div class="trl-rec-toggle" id="trl-rec-toggle">
            <button type="button" class="trl-rec-btn trl-rec-offer ${ev.recommendation === 'offer' ? 'active' : ''}" data-rec="offer">Offer</button>
            <button type="button" class="trl-rec-btn trl-rec-revisit ${ev.recommendation === 'revisit' ? 'active' : ''}" data-rec="revisit">Revisit</button>
            <button type="button" class="trl-rec-btn trl-rec-pass ${ev.recommendation === 'pass' ? 'active' : ''}" data-rec="pass">Pass</button>
          </div>
          <textarea class="report-textarea" id="trl-rec-summary" rows="3" placeholder="Summary / reasoning..." style="margin-top:10px">${TrialReport._esc(ev.recommendationSummary)}</textarea>
        </div>

        <!-- ── Actions ────────────────────────────────────── -->
        <div class="report-actions">
          <button class="btn btn-outline" id="trl-btn-save">Save Draft</button>
          <button class="btn btn-primary" id="trl-btn-preview">Preview Report</button>
        </div>

        <div id="trial-report-preview-area"></div>
      </div>`;
  },

  _renderTraitSelectors() {
    const ev = TrialReport._evaluation;
    let html = '';

    for (const [pillarKey, pillar] of Object.entries(REPORT_TRAITS)) {
      const data = ev.traits[pillarKey] || { strengths: [], weaknesses: [] };
      html += `<div class="trait-pillar">
        <div class="trait-pillar-label">${pillar.label}</div>
        <div class="trait-grid">`;

      for (const [traitKey, traitLabel] of Object.entries(pillar.traits)) {
        let mode = '';
        if (data.strengths.includes(traitKey)) mode = 'strength';
        else if (data.weaknesses.includes(traitKey)) mode = 'weakness';

        html += `<span class="trait-chip" data-pillar="${pillarKey}" data-trait="${traitKey}" ${mode ? `data-mode="${mode}"` : ''}>${traitLabel}</span>`;
      }

      html += '</div></div>';
    }

    return html;
  },

  // ── Events ──────────────────────────────────────────────────

  _bindEvents(container) {
    // Trait chip click — cycle: none → strength → weakness → none
    container.querySelectorAll('.trait-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const pillar = chip.dataset.pillar;
        const trait = chip.dataset.trait;
        const current = chip.dataset.mode || '';
        const data = TrialReport._evaluation.traits[pillar];

        // Remove from both arrays
        data.strengths = data.strengths.filter(t => t !== trait);
        data.weaknesses = data.weaknesses.filter(t => t !== trait);

        // Cycle to next state
        if (current === '') {
          data.strengths.push(trait);
          chip.dataset.mode = 'strength';
        } else if (current === 'strength') {
          data.weaknesses.push(trait);
          chip.dataset.mode = 'weakness';
        } else {
          delete chip.dataset.mode;
        }
      });
    });

    // Recommendation toggle
    container.querySelector('#trl-rec-toggle').addEventListener('click', e => {
      const btn = e.target.closest('.trl-rec-btn');
      if (!btn) return;
      const isActive = btn.classList.contains('active');
      container.querySelectorAll('.trl-rec-btn').forEach(b => b.classList.remove('active'));
      if (!isActive) {
        btn.classList.add('active');
        TrialReport._evaluation.recommendation = btn.dataset.rec;
      } else {
        TrialReport._evaluation.recommendation = '';
      }
    });

    // Save draft
    container.querySelector('#trl-btn-save').addEventListener('click', () => {
      TrialReport._syncFormData(container);
      TrialReport._saveDraft();
      App.toast('Draft saved');
    });

    // Preview
    container.querySelector('#trl-btn-preview').addEventListener('click', () => {
      TrialReport._syncFormData(container);
      TrialReport._saveDraft();
      TrialReport._showPreview(container);
    });
  },

  _syncFormData(container) {
    TrialReport._evaluation.generalNotes = container.querySelector('#trl-general-notes')?.value || '';
    TrialReport._evaluation.recommendationSummary = container.querySelector('#trl-rec-summary')?.value || '';
  },

  _saveDraft() {
    const player = TrialReport._player;
    player.trialEvaluation = TrialReport._evaluation;
    DB.save(player);
  },

  // ══════════════════════════════════════════════════════════════
  //  A4 PREVIEW
  // ══════════════════════════════════════════════════════════════

  _showPreview(container) {
    const player = TrialReport._player;
    const ev = TrialReport._evaluation;
    const meta = DB.getMeta();
    const seasonLabel = `20${meta.activeSeason}`;

    const previewArea = container.querySelector('#trial-report-preview-area');

    previewArea.innerHTML = `
      <div class="report-preview-toolbar">
        <button class="btn btn-primary" id="trl-btn-export-pdf">Export PDF</button>
        <button class="btn btn-outline" id="trl-btn-close-preview">Close Preview</button>
      </div>
      <div class="report-preview-scroll">
        <div class="report-pages" id="trl-report-pages">
          <div class="rpt-page">
            ${TrialReport._renderHeader(seasonLabel)}
            ${TrialReport._renderPlayerHero(player)}
            ${TrialReport._renderTestResults(player)}
            <hr class="rpt-divider">
            ${TrialReport._renderCoachingEvaluation(player, ev)}
            ${TrialReport._renderRecommendation(ev)}
            ${TrialReport._renderFooter(player)}
          </div>
        </div>
      </div>`;

    // Scroll to preview
    previewArea.scrollIntoView({ behavior: 'smooth' });

    // Export PDF
    previewArea.querySelector('#trl-btn-export-pdf').addEventListener('click', () => {
      TrialReport._exportPDF();
    });

    // Close
    previewArea.querySelector('#trl-btn-close-preview').addEventListener('click', () => {
      previewArea.innerHTML = '';
    });
  },

  // ── Header Banner ───────────────────────────────────────────

  _renderHeader(seasonLabel) {
    return `
      <div class="rpt-header-banner">
        <img src="assets/logos/koln-fs.webp" alt="" class="rpt-logo">
        <div class="rpt-header-banner-text">
          <div class="rpt-title">Trial Evaluation</div>
          <div class="rpt-subtitle">International Talent Program</div>
        </div>
        <div class="rpt-header-right">
          <div class="rpt-season">${seasonLabel}</div>
          <div class="rpt-date">${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        </div>
      </div>`;
  },

  // ── Player Hero ─────────────────────────────────────────────

  _renderPlayerHero(player) {
    const age = App.computeAge(player.dateOfBirth);
    const dob = player.dateOfBirth ? new Date(player.dateOfBirth + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
    const positions = (player.positions || []).map(p => typeof p === 'string' ? p : p.code).join(' / ') || '—';
    const initials = (player.firstName?.[0] || '') + (player.lastName?.[0] || '');
    const heightFt = App.cmToFeetInches(player.heightCm);
    const weightLbs = App.kgToLbs(player.weightKg);

    const posY = player.photoPositionY ?? 25;
    const photoHTML = player.photoBase64
      ? `<img src="${player.photoBase64}" alt="" class="rpt-player-photo" style="object-position: center ${posY}%">`
      : `<div class="rpt-player-initials">${initials}</div>`;

    // Format trial period
    let trialPeriod = '—';
    if (player.trialDates?.start && player.trialDates?.end) {
      const fmtDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trialPeriod = `${fmtDate(player.trialDates.start)} – ${fmtDate(player.trialDates.end)}, ${new Date(player.trialDates.end + 'T12:00:00').getFullYear()}`;
    } else if (player.trialDates?.start) {
      trialPeriod = new Date(player.trialDates.start + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    return `
      <div class="rpt-player-hero">
        <div class="rpt-player-hero-inner">
          ${photoHTML}
          <div class="rpt-player-details">
            <div class="rpt-player-name">${player.firstName} <span class="rpt-player-surname">${player.lastName}</span></div>
            <div class="rpt-player-meta">${player.ageGroup || '—'} &middot; ${positions} &middot; ${player.nationality || '—'}</div>
            <div class="rpt-info-grid">
              <div class="rpt-info-row"><span class="rpt-info-label">Date of Birth</span><span class="rpt-info-value">${dob}</span></div>
              <div class="rpt-info-row"><span class="rpt-info-label">Age</span><span class="rpt-info-value">${age || '—'}</span></div>
              <div class="rpt-info-row"><span class="rpt-info-label">Foot</span><span class="rpt-info-value">${player.foot || '—'}</span></div>
              ${player.heightCm ? `<div class="rpt-info-row"><span class="rpt-info-label">Height</span><span class="rpt-info-value">${player.heightCm} cm${heightFt ? ` (${heightFt})` : ''}</span></div>` : ''}
              ${player.weightKg ? `<div class="rpt-info-row"><span class="rpt-info-label">Weight</span><span class="rpt-info-value">${player.weightKg} kg${weightLbs ? ` (${weightLbs} lbs)` : ''}</span></div>` : ''}
              <div class="rpt-info-row"><span class="rpt-info-label">Trial Period</span><span class="rpt-info-value">${trialPeriod}</span></div>
            </div>
          </div>
        </div>
      </div>`;
  },

  // ── Performance Test Results ────────────────────────────────

  _renderTestResults(player) {
    if (!player.tests || !player.ageGroup) return '';

    const categories = Benchmarks.getTestsByCategory();
    let rows = '';
    let hasData = false;

    for (const [catName, testKeys] of Object.entries(categories)) {
      let catRows = '';

      for (const tk of testKeys) {
        const testData = player.tests?.[tk];
        if (!testData || testData.best == null) continue;
        hasData = true;

        const def = TEST_DEFS[tk];
        const latest = DB.getLatestSession(player, tk);
        const displayBest = latest?.best ?? testData.best;
        const { level } = Benchmarks.evaluate(player.ageGroup, tk, displayBest);
        const levelLabel = level === 'none' ? '—' : level === 'poor' ? 'Below Avg' : level.charAt(0).toUpperCase() + level.slice(1);

        catRows += `
          <tr>
            <td class="trl-test-name">${def.name}</td>
            <td class="trl-test-value">${displayBest}</td>
            <td class="trl-test-unit">${def.unit}</td>
            <td class="trl-test-level" data-level="${level}">${levelLabel}</td>
          </tr>`;
      }

      if (catRows) {
        rows += `<tr class="trl-test-cat-row"><td colspan="4">${catName}</td></tr>`;
        rows += catRows;
      }
    }

    if (!hasData) return '';

    return `
      <div class="rpt-section">
        <div class="rpt-heading">Performance Test Results</div>
        <div class="rpt-bench-ref">Benchmarks: German Top Academy Standards for ${player.ageGroup}</div>
        <table class="trl-test-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Result</th>
              <th>Unit</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="rpt-bench-legend">
          <span class="rpt-bench-key" data-level="poor">Below Avg</span>
          <span class="rpt-bench-key" data-level="average">Average</span>
          <span class="rpt-bench-key" data-level="good">Good</span>
          <span class="rpt-bench-key" data-level="elite">Elite</span>
        </div>
      </div>`;
  },

  // ── Coaching Evaluation Narrative ───────────────────────────

  _renderCoachingEvaluation(player, ev) {
    const narrative = ReportNarrative.generateTrialEvaluation(player, ev);
    if (!narrative) return '';

    return `
      <div class="rpt-section rpt-coach-section">
        <div class="rpt-heading">Coaching Evaluation</div>
        <div class="rpt-coach-eval-frame">
          <div class="rpt-coach-eval">${narrative}</div>
        </div>
      </div>`;
  },

  // ── Recommendation Banner ──────────────────────────────────

  _renderRecommendation(ev) {
    if (!ev.recommendation && !ev.recommendationSummary) return '';

    const labels = { offer: 'OFFER', revisit: 'REVISIT', pass: 'PASS' };
    const label = labels[ev.recommendation] || '';

    return `
      <div class="rpt-section">
        <div class="rpt-heading">Recommendation</div>
        ${label ? `<div class="trl-rec-banner trl-rec-banner-${ev.recommendation}">${label}</div>` : ''}
        ${ev.recommendationSummary ? `<p class="trl-rec-text">${TrialReport._esc(ev.recommendationSummary)}</p>` : ''}
      </div>`;
  },

  // ── Footer ──────────────────────────────────────────────────

  _renderFooter(player) {
    return `
      <div class="rpt-footer">
        <img src="assets/logos/koln-fs.webp" alt="" class="rpt-footer-logo">
        <span class="rpt-footer-text">ITP Trial Evaluation &mdash; ${player.firstName} ${player.lastName} &mdash; 1. FC K&ouml;ln Football School</span>
      </div>
      <div class="rpt-page-accent"></div>`;
  },

  // ── PDF Export ──────────────────────────────────────────────

  _exportPDF() {
    const pages = document.getElementById('trl-report-pages');
    if (!pages) return;

    if (typeof html2pdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => TrialReport._doPDFExport(pages);
      document.head.appendChild(script);
    } else {
      TrialReport._doPDFExport(pages);
    }
  },

  _doPDFExport(element) {
    const player = TrialReport._player;
    const filename = `ITP_Trial_Report_${player.firstName}_${player.lastName}.pdf`;

    html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '.rpt-section' }
      })
      .from(element)
      .save()
      .then(() => App.toast('PDF exported'))
      .catch(err => {
        console.error('PDF export error:', err);
        alert('PDF export failed. Check console for details.');
      });
  },

  // ── Helpers ─────────────────────────────────────────────────

  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
