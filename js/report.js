'use strict';

/* ═══════════════════════════════════════════════════════════════
   report.js — Family Report Builder: form, preview, PDF export
   Redesigned: dynamic page flow, smart test layout, full charts
═══════════════════════════════════════════════════════════════ */

const Report = {

  _player: null,
  _review: null,   // { technical: { strengths:[], weaknesses:[], improved:[] }, ... }
  _trials: [],
  _coachNotes: '',
  _mediaLinks: [],
  _endOfSeason: false,
  _topImprovements: [],     // [{title, description, source: 'auto'|'coach', testKey?, rawNotes?}, ...]
  _autoCandidateIdx: 0,     // re-roll cursor for the auto item

  init() {},

  // ── Entry Point ─────────────────────────────────────────────

  async show(playerId) {
    const player = await DB.get(playerId);
    if (!player) { location.hash = '#roster'; return; }

    Report._player = player;

    // Load saved data or initialize empty
    Report._review = player.developmentReview || Report._emptyReview();
    Report._trials = player.trials ? JSON.parse(JSON.stringify(player.trials)) : [];
    Report._coachNotes = player.coachNotes || '';
    Report._mediaLinks = player.mediaLinks ? JSON.parse(JSON.stringify(player.mediaLinks)) : [];
    Report._endOfSeason = player.endOfSeason || false;
    Report._topImprovements = player.topImprovements
      ? JSON.parse(JSON.stringify(player.topImprovements))
      : Report._emptyTopImprovements(player);
    Report._autoCandidateIdx = 0;

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

  // Initial Top 3 array. Index 0 is the auto slot (filled lazily after first
  // generation). Indices 1 and 2 are coach-authored slots.
  _emptyTopImprovements() {
    return [
      { title: '', description: '', source: 'auto', testKey: null, rawNotes: '' },
      { title: '', description: '', source: 'coach', rawNotes: '' },
      { title: '', description: '', source: 'coach', rawNotes: '' },
    ];
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
          <p class="report-section-desc">Click to cycle: <span class="trait-legend-s">Strength</span> <span class="trait-legend-si">Str+Improved</span> <span class="trait-legend-w">Weakness</span> <span class="trait-legend-wi">Weak+Improved</span> <span class="trait-legend-i">Improved</span></p>
          ${Report._renderTraitSelectors()}
        </div>

        <!-- ── Trial Reports ──────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Trial Reports</div>
          <p class="report-section-desc">Enter bullet points for each trial. Click "Generate" to create a polished narrative.</p>
          <div id="report-trials-list">${Report._renderTrialsList()}</div>
          <button class="btn btn-outline btn-sm" id="btn-add-trial">+ Add Trial</button>
        </div>

        <!-- ── Top 3 Improvements ─────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Top 3 Improvements</div>
          <p class="report-section-desc">The three biggest improvements this player has made in the program. Item 1 is auto-picked from testing. Items 2 and 3 are your words, polished by AI.</p>
          <div id="report-top-improvements">${Report._renderTopImprovementsBuilder(player)}</div>
        </div>

        <!-- ── Coach Notes ────────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Coach Notes</div>
          <p class="report-section-desc">Personal observations to weave into the Coaching Staff evaluation.</p>
          <label class="report-toggle-row">
            <input type="checkbox" id="report-end-of-season" ${Report._endOfSeason ? 'checked' : ''}>
            <span>End-of-season report</span>
          </label>
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
        const inStr = rev.strengths.includes(traitKey);
        const inWeak = rev.weaknesses.includes(traitKey);
        const inImp = rev.improved.includes(traitKey);
        let mode = 'none';
        if (inStr && inImp) mode = 'strength-improved';
        else if (inWeak && inImp) mode = 'weakness-improved';
        else if (inStr) mode = 'strength';
        else if (inWeak) mode = 'weakness';
        else if (inImp) mode = 'improved';
        html += `<button class="trait-chip" data-pillar="${pillarKey}" data-trait="${traitKey}" data-mode="${mode}">${traitLabel}</button>`;
      }
      html += `</div></div>`;
    }
    return html;
  },

  // ── Trials List — Bullet Points + Generate ─────────────────

  _renderTrialsList() {
    if (Report._trials.length === 0) {
      return '<div class="report-empty-hint">No trials added yet.</div>';
    }
    return Report._trials.map((t, i) => `
      <div class="trial-card" data-index="${i}">
        <div class="trial-card-header">
          <input class="trial-input trial-club" placeholder="Club name" value="${Report._esc(t.clubName || '')}">
          <input class="trial-input trial-coach" placeholder="Coach name" value="${Report._esc(t.coachName || '')}">
          <input class="trial-input trial-date" type="date" value="${t.date || ''}">
          <button class="btn-icon trial-remove" title="Remove trial">&times;</button>
        </div>
        <div class="trial-card-meta">
          <select class="trial-input trial-level">
            <option value="">Competition Level</option>
            <option value="U-17" ${t.competitionLevel === 'U-17' ? 'selected' : ''}>U-17</option>
            <option value="U-19" ${t.competitionLevel === 'U-19' ? 'selected' : ''}>U-19</option>
            <option value="Senior" ${t.competitionLevel === 'Senior' ? 'selected' : ''}>Senior</option>
          </select>
          <select class="trial-input trial-tier">
            <option value="">Tier</option>
            ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}" ${t.tier == n ? 'selected' : ''}>Tier ${n}</option>`).join('')}
          </select>
        </div>
        <textarea class="trial-input trial-bullets" placeholder="Bullet points: good pressing, strong in 1v1 duels, needs better first touch..." rows="3">${Report._esc(t.bullets || t.strengthsNoted || '')}</textarea>
        <div class="trial-gen-row">
          <button class="btn btn-outline btn-sm trial-generate">Generate Text</button>
        </div>
        <textarea class="trial-input trial-generated" placeholder="Generated narrative will appear here. You can edit it." rows="3">${Report._esc(t.generatedText || '')}</textarea>
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

  _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  // ── Top 3 Improvements — Builder UI ──────────────────────────

  _renderTopImprovementsBuilder(player) {
    const items = Report._topImprovements;
    const candidates = ReportNarrative.getBestImprovementCandidates(player, 5);
    const hasAutoCandidates = candidates.length > 0;
    const auto = items[0];

    let autoBlock;
    if (!hasAutoCandidates) {
      autoBlock = `
        <div class="ti-card" data-idx="0">
          <div class="ti-card-head"><span class="ti-num">1</span><span class="ti-label">No test improvements yet</span></div>
          <p class="ti-empty-hint">This player has fewer than two completed sessions for any test, so the auto highlight is unavailable. You can leave this slot blank or use it as a coach-authored item.</p>
          <input class="ti-input ti-title" data-field="title" placeholder="Title (e.g. Game Reading)" value="${Report._esc(auto.title)}">
          <textarea class="ti-input ti-notes" data-field="rawNotes" rows="2" placeholder="Rough notes...">${Report._esc(auto.rawNotes)}</textarea>
          <div class="ti-actions">
            <button class="btn btn-outline btn-sm ti-polish">Polish with AI</button>
          </div>
          <textarea class="ti-input ti-desc" data-field="description" rows="2" placeholder="Polished description appears here. You can edit it.">${Report._esc(auto.description)}</textarea>
        </div>`;
    } else {
      autoBlock = `
        <div class="ti-card ti-card-auto" data-idx="0">
          <div class="ti-card-head">
            <span class="ti-num">1</span>
            <span class="ti-label">Auto from testing</span>
            <button class="btn-ti-reroll" title="Try the next-best test improvement">Re-roll</button>
          </div>
          <input class="ti-input ti-title" data-field="title" placeholder="Click Generate to fill" value="${Report._esc(auto.title)}">
          <textarea class="ti-input ti-desc" data-field="description" rows="2" placeholder="Click Generate to fill">${Report._esc(auto.description)}</textarea>
          ${auto.title ? '' : '<button class="btn btn-outline btn-sm ti-generate-auto">Generate from testing</button>'}
        </div>`;
    }

    const coachBlock = (it, idx) => `
      <div class="ti-card" data-idx="${idx}">
        <div class="ti-card-head"><span class="ti-num">${idx + 1}</span><span class="ti-label">Coach-authored</span></div>
        <input class="ti-input ti-title" data-field="title" placeholder="Title (e.g. Confidence on the ball)" value="${Report._esc(it.title)}">
        <textarea class="ti-input ti-notes" data-field="rawNotes" rows="2" placeholder="Rough notes (e.g. started taking on defenders 1v1, used to dribble away from pressure)">${Report._esc(it.rawNotes)}</textarea>
        <div class="ti-actions">
          <button class="btn btn-outline btn-sm ti-polish">Polish with AI</button>
        </div>
        <textarea class="ti-input ti-desc" data-field="description" rows="2" placeholder="Polished description appears here. You can edit it.">${Report._esc(it.description)}</textarea>
      </div>`;

    return autoBlock + coachBlock(items[1], 1) + coachBlock(items[2], 2);
  },

  _bindTopImprovementsEvents(container, player) {
    const root = container.querySelector('#report-top-improvements');
    if (!root) return;

    root.querySelectorAll('.ti-card').forEach(card => {
      const idx = parseInt(card.dataset.idx, 10);
      card.querySelectorAll('.ti-input').forEach(inp => {
        inp.addEventListener('input', () => {
          Report._topImprovements[idx][inp.dataset.field] = inp.value;
        });
      });

      const polishBtn = card.querySelector('.ti-polish');
      if (polishBtn) {
        polishBtn.addEventListener('click', () => Report._polishImprovement(card, idx, player));
      }

      const rerollBtn = card.querySelector('.btn-ti-reroll');
      if (rerollBtn) {
        rerollBtn.addEventListener('click', () => Report._rerollAutoImprovement(container, player));
      }

      const generateBtn = card.querySelector('.ti-generate-auto');
      if (generateBtn) {
        generateBtn.addEventListener('click', () => Report._rerollAutoImprovement(container, player, /*reset=*/true));
      }
    });
  },

  async _rerollAutoImprovement(container, player, reset) {
    const candidates = ReportNarrative.getBestImprovementCandidates(player, 5);
    if (candidates.length === 0) { App.toast('No test improvements yet'); return; }

    if (reset) Report._autoCandidateIdx = 0;
    else Report._autoCandidateIdx = (Report._autoCandidateIdx + 1) % candidates.length;

    const candidate = candidates[Report._autoCandidateIdx];
    const apiKey = Report._getApiKey();

    const root = container.querySelector('#report-top-improvements');
    const card = root.querySelector('.ti-card[data-idx="0"]');
    const titleEl = card.querySelector('.ti-title');
    const descEl = card.querySelector('.ti-desc');
    const rerollBtn = card.querySelector('.btn-ti-reroll');
    const generateBtn = card.querySelector('.ti-generate-auto');

    const original = rerollBtn ? rerollBtn.textContent : (generateBtn ? generateBtn.textContent : '');
    if (rerollBtn) { rerollBtn.disabled = true; rerollBtn.textContent = 'Generating...'; }
    if (generateBtn) { generateBtn.disabled = true; generateBtn.textContent = 'Generating...'; }

    try {
      const item = await ReportNarrative.generateAutoImprovementItem(player, candidate, apiKey);
      if (item) {
        Report._topImprovements[0] = item;
        titleEl.value = item.title;
        descEl.value = item.description;
        if (generateBtn) generateBtn.style.display = 'none';
      }
    } finally {
      if (rerollBtn) { rerollBtn.disabled = false; rerollBtn.textContent = original || 'Re-roll'; }
      if (generateBtn) { generateBtn.disabled = false; generateBtn.textContent = original || 'Generate from testing'; }
    }
  },

  async _polishImprovement(card, idx, player) {
    const item = Report._topImprovements[idx];
    const titleEl = card.querySelector('.ti-title');
    const notesEl = card.querySelector('.ti-notes');
    const descEl = card.querySelector('.ti-desc');
    const btn = card.querySelector('.ti-polish');

    const title = (titleEl?.value || '').trim();
    const rawNotes = (notesEl?.value || '').trim();
    if (!title) { App.toast('Add a title first'); return; }
    if (!rawNotes) { App.toast('Add a few rough notes first'); return; }

    const apiKey = Report._getApiKey();
    if (!apiKey) return;

    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Polishing...';

    try {
      const polished = await ReportNarrative.polishImprovementDescription(player, title, rawNotes, apiKey);
      if (polished) {
        item.title = title;
        item.rawNotes = rawNotes;
        item.description = polished;
        descEl.value = polished;
        App.toast('Polished');
      }
    } catch (err) {
      App.toast(err.message || 'Polishing failed');
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  },

  _getApiKey() {
    let key = localStorage.getItem('itp_claude_api_key');
    if (!key) {
      key = window.prompt('Enter your Claude API key.\n\nGet one at: console.anthropic.com/settings/keys\nIt will be saved locally in your browser.');
      if (key) localStorage.setItem('itp_claude_api_key', key.trim());
    }
    return key ? key.trim() : null;
  },

  // ── Event Binding ────────────────────────────────────────────

  _bindEvents(container, player) {
    // Trait chip clicks — 6-state cycle: none → strength → strength-improved → weakness → weakness-improved → improved → none
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
        let next;
        switch (mode) {
          case 'none':              next = 'strength'; break;
          case 'strength':          next = 'strength-improved'; break;
          case 'strength-improved': next = 'weakness'; break;
          case 'weakness':          next = 'weakness-improved'; break;
          case 'weakness-improved': next = 'improved'; break;
          case 'improved':          next = 'none'; break;
          default:                  next = 'none';
        }

        if (next === 'strength')          rev.strengths.push(trait);
        if (next === 'strength-improved') { rev.strengths.push(trait); rev.improved.push(trait); }
        if (next === 'weakness')          rev.weaknesses.push(trait);
        if (next === 'weakness-improved') { rev.weaknesses.push(trait); rev.improved.push(trait); }
        if (next === 'improved')          rev.improved.push(trait);

        chip.dataset.mode = next;
      });
    });

    // Add trial
    container.querySelector('#btn-add-trial').addEventListener('click', () => {
      Report._trials.push({ clubName: '', coachName: '', competitionLevel: '', tier: '', date: '', bullets: '', generatedText: '' });
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

    // Top 3 Improvements
    Report._bindTopImprovementsEvents(container, player);

    // Coach notes + end-of-season toggle
    container.querySelector('#report-coach-notes').addEventListener('input', (e) => {
      Report._coachNotes = e.target.value;
    });
    container.querySelector('#report-end-of-season').addEventListener('change', (e) => {
      Report._endOfSeason = e.target.checked;
    });

    // Save draft
    container.querySelector('#btn-report-save').addEventListener('click', async () => {
      Report._syncFormData(container);
      await Report._saveDraft(player);
      App.toast('Draft saved');
    });

    // Preview
    container.querySelector('#btn-report-preview').addEventListener('click', async () => {
      Report._syncFormData(container);
      await Report._saveDraft(player);
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

      // Generate button
      card.querySelector('.trial-generate').addEventListener('click', () => {
        const bulletsEl = card.querySelector('.trial-bullets');
        const genEl = card.querySelector('.trial-generated');
        const bullets = bulletsEl.value.trim();
        if (!bullets) { genEl.value = ''; return; }
        const trial = Report._trials[idx];
        trial.bullets = bullets;
        const text = ReportNarrative.generateTrialNarrative(Report._player, trial);
        genEl.value = text;
        trial.generatedText = text;
      });

      // Text inputs
      const clubEl = card.querySelector('.trial-club');
      const coachEl = card.querySelector('.trial-coach');
      const dateEl = card.querySelector('.trial-date');
      const levelEl = card.querySelector('.trial-level');
      const tierEl = card.querySelector('.trial-tier');
      const bulletsEl = card.querySelector('.trial-bullets');
      const genEl = card.querySelector('.trial-generated');

      if (clubEl) clubEl.addEventListener('input', () => { Report._trials[idx].clubName = clubEl.value; });
      if (coachEl) coachEl.addEventListener('input', () => { Report._trials[idx].coachName = coachEl.value; });
      if (dateEl) dateEl.addEventListener('input', () => { Report._trials[idx].date = dateEl.value; });
      if (levelEl) levelEl.addEventListener('change', () => { Report._trials[idx].competitionLevel = levelEl.value; });
      if (tierEl) tierEl.addEventListener('change', () => { Report._trials[idx].tier = tierEl.value; });
      if (bulletsEl) bulletsEl.addEventListener('input', () => { Report._trials[idx].bullets = bulletsEl.value; });
      if (genEl) genEl.addEventListener('input', () => { Report._trials[idx].generatedText = genEl.value; });
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

  async _saveDraft(player) {
    player.developmentReview = Report._review;
    player.trials = Report._trials;
    player.coachNotes = Report._coachNotes;
    player.mediaLinks = Report._mediaLinks;
    player.endOfSeason = Report._endOfSeason;
    player.topImprovements = Report._topImprovements;
    await DB.save(player);
  },

  // ══════════════════════════════════════════════════════════════
  //  REPORT PREVIEW — Dynamic Flow (no fixed page count)
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
          <div class="rpt-page">
            ${Report._renderHeader(player)}
            ${Report._renderPlayerHero(player)}
            <hr class="rpt-divider">
            ${Report._renderPhysicalAnalysis(player)}
            ${Report._renderDevelopmentReview(player)}
            <hr class="rpt-divider">
            ${Report._renderPerformanceTests(player)}
            ${Report._renderTopImprovements(player)}
            ${Report._renderTrials(player)}
            ${Report._renderCoachEvaluation(player)}
            ${Report._renderMedia()}
            ${Report._renderFooter(player)}
          </div>
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

  // ── Header — Gradient Banner ───────────────────────────────

  _renderHeader(player) {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const meta = DB.getMeta();
    const season = meta.activeSeason || '25-26';
    const seasonDisplay = `Season 20${season.split('-')[0]}/20${season.split('-')[1]}`;
    return `
      <div class="rpt-header-banner">
        <img src="assets/logos/koln-fs.webp" alt="" class="rpt-logo">
        <div class="rpt-header-banner-text">
          <div class="rpt-title">ITP Family Report</div>
          <div class="rpt-subtitle">1. FC K&ouml;ln Football School &middot; International Talent Pathway</div>
        </div>
        <div class="rpt-header-right">
          <div class="rpt-season">${seasonDisplay}</div>
          <div class="rpt-date">${today}</div>
        </div>
      </div>`;
  },

  // ── Player Hero — Photo + Info ─────────────────────────────

  _renderPlayerHero(player) {
    const age = App.computeAge(player.dateOfBirth);
    const dob = player.dateOfBirth ? new Date(player.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—';
    const positions = (player.positions || []).map(p => typeof p === 'string' ? p : p.code).join(' / ') || '—';
    const initials = (player.firstName?.[0] || '') + (player.lastName?.[0] || '');

    const posY = player.photoPositionY ?? 25;
    const photoHTML = player.photoBase64
      ? `<img src="${player.photoBase64}" alt="" class="rpt-player-photo" style="object-position: center ${posY}%">`
      : `<div class="rpt-player-initials">${initials}</div>`;

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
            </div>
          </div>
        </div>
      </div>`;
  },

  // ── Physical Analysis ──────────────────────────────────────

  _renderPhysicalAnalysis(player) {
    const heightFt = App.cmToFeetInches(player.heightCm);
    const bodyItems = [];
    if (player.heightCm) bodyItems.push({ label: 'Height', value: `${player.heightCm} cm`, sub: heightFt });
    if (player.weightKg) bodyItems.push({ label: 'Weight', value: `${player.weightKg} kg`, sub: `${App.kgToLbs(player.weightKg)} lbs` });
    if (player.bodyFatPct) bodyItems.push({ label: 'Body Fat', value: `${player.bodyFatPct}%` });
    if (player.bmi) bodyItems.push({ label: 'BMI', value: player.bmi.toFixed(1) });
    if (player.muscleRatePct) bodyItems.push({ label: 'Muscle Rate', value: `${player.muscleRatePct}%` });

    if (bodyItems.length === 0) return '';

    return `
      <div class="rpt-physical">
        <div class="rpt-heading">Physical Profile</div>
        <div class="rpt-body-grid">
          ${bodyItems.map(b => `<div class="rpt-body-cell"><div class="rpt-body-val">${b.value}</div>${b.sub ? `<div class="rpt-body-sub">${b.sub}</div>` : ''}<div class="rpt-body-label">${b.label}</div></div>`).join('')}
        </div>
      </div>`;
  },

  // ── Development Review — All 4 Pillars ─────────────────────

  _renderDevelopmentReview(player) {
    const pillars = ['technical', 'tactical', 'physical', 'mental'];
    const reviews = pillars.map(pk => ({
      key: pk,
      label: REPORT_TRAITS[pk].label,
      text: ReportNarrative.generatePillarReview(pk, Report._review[pk], player)
    })).filter(r => r.text);

    if (reviews.length === 0) return '';

    return `
      <div class="rpt-section">
        <div class="rpt-heading">Development Review</div>
        ${reviews.map(r => `
          <div class="rpt-pillar">
            <div class="rpt-pillar-title">${r.label}</div>
            <p class="rpt-pillar-text">${r.text}</p>
          </div>
        `).join('')}
      </div>`;
  },

  // Render one card for a single test (CMJ, Broad Jump, Trap Bar, Pull-Ups, IFT, Passing, Dribbling).
  // Returns '' if the player has no result for the test.
  _renderSingleTestCard(player, testKey) {
    const td = player.tests?.[testKey];
    if (!td || td.best == null) return '';

    const def = TEST_DEFS[testKey];
    if (!def) return '';

    const desc = TEST_DESCRIPTIONS[testKey] || '';
    const latest = DB.getLatestSession(player, testKey);
    const value = latest?.best ?? td.best;
    const fmt = (v) => def.unit === 's' ? Number(v).toFixed(2) : (Number.isInteger(v) ? v : Number(v).toFixed(1));

    const ageGroup = player.ageGroup;
    const thresh = ageGroup ? Benchmarks.getThresholds(ageGroup, testKey) : null;
    const evalRes = ageGroup ? Benchmarks.evaluate(ageGroup, testKey, value) : { level: 'none' };
    const level = evalRes.level;
    const lowerIsBetter = !!def.lowerIsBetter;

    // Threshold row
    let scaleHtml = '';
    if (thresh) {
      const order = [['poor', thresh.poor], ['average', thresh.average], ['good', thresh.good], ['elite', thresh.elite]];
      const marks = order.map(([lvl, val]) => `<div class="rpt-thresh-mark" data-level="${lvl}">${fmt(val)}</div>`).join('');
      const visualPct = Report._computeVisualPct(value, thresh, lowerIsBetter);
      scaleHtml = `
        <div class="rpt-thresh-scale">${marks}</div>
        <div class="rpt-thresh-bar">
          <div class="rpt-thresh-fill" data-level="${level}" style="width:${visualPct}%"></div>
        </div>`;
    }

    // Progression chart — only if 2+ valid sessions
    const validSessions = (td.sessions || []).filter(s => s.best != null);
    let chartHtml = '';
    if (validSessions.length >= 2 && typeof Profile !== 'undefined' && Profile.renderProgressionChart) {
      chartHtml = `
        <div class="rpt-test-card-chart">
          ${Profile.renderProgressionChart(player, testKey, 540, 150)}
        </div>`;
    }

    const benchNote = (typeof ITP_BENCHMARK_TESTS !== 'undefined' && ITP_BENCHMARK_TESTS.has(testKey))
      ? '<div class="rpt-test-card-block-bench-note">Benchmarks: ITP cohort</div>'
      : '';

    return `
      <div class="rpt-test-card-block" data-level="${level}">
        <div class="rpt-test-card-block-name">${def.name}</div>
        ${desc ? `<div class="rpt-test-card-block-desc">${desc}</div>` : ''}
        ${benchNote}
        <div class="rpt-test-card-block-row">
          <div class="rpt-test-card-block-row-name">Latest</div>
          <div class="rpt-test-card-block-row-value" data-level="${level}">${fmt(value)}<span class="rpt-test-card-block-row-unit">${def.unit}</span></div>
          <div class="rpt-test-card-block-row-bar">${scaleHtml}</div>
        </div>
        ${chartHtml}
      </div>`;
  },

  // Render the unified Speed card holding 5m, 30m, 40yd sprint threshold rows + speed curve chart.
  // Returns '' if the player has none of the three sprint distances recorded.
  _renderSpeedCard(player) {
    const SPRINT_KEYS = ['sprint5m', 'sprint30m', 'sprint40yd'];

    // Filter to sprints the player has at least one valid session for
    const presentKeys = SPRINT_KEYS.filter(tk => {
      const td = player.tests?.[tk];
      return td && td.best != null;
    });
    if (presentKeys.length === 0) return '';

    const desc = TEST_DESCRIPTIONS.speed || '';
    const ageGroup = player.ageGroup;

    // Latest-test pill: most recent session date across all three sprints
    let latestDate = null;
    for (const tk of presentKeys) {
      const latest = DB.getLatestSession(player, tk);
      if (latest?.date && (!latestDate || latest.date > latestDate)) latestDate = latest.date;
    }
    const fmtPillDate = (iso) => {
      const d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const pillHtml = latestDate
      ? `<div class="rpt-speed-latest-pill"><span class="rpt-speed-latest-pill-lbl">Latest test</span><span class="rpt-speed-latest-pill-date">${fmtPillDate(latestDate)}</span></div>`
      : '';

    // Threshold rows
    const rows = presentKeys.map(tk => {
      const def = TEST_DEFS[tk];
      const td = player.tests[tk];
      const latest = DB.getLatestSession(player, tk);
      const value = latest?.best ?? td.best;
      const fmt = (v) => Number(v).toFixed(2);
      const thresh = ageGroup ? Benchmarks.getThresholds(ageGroup, tk) : null;
      const evalRes = ageGroup ? Benchmarks.evaluate(ageGroup, tk, value) : { level: 'none' };
      const level = evalRes.level;

      let scaleHtml = '';
      if (thresh) {
        const order = [['poor', thresh.poor], ['average', thresh.average], ['good', thresh.good], ['elite', thresh.elite]];
        const marks = order.map(([lvl, val]) => `<div class="rpt-thresh-mark" data-level="${lvl}">${fmt(val)}</div>`).join('');
        const visualPct = Report._computeVisualPct(value, thresh, true);
        scaleHtml = `
          <div class="rpt-thresh-scale">${marks}</div>
          <div class="rpt-thresh-bar">
            <div class="rpt-thresh-fill" data-level="${level}" style="width:${visualPct}%"></div>
          </div>`;
      }

      return `
        <div class="rpt-test-card-block-row" data-level="${level}">
          <div class="rpt-test-card-block-row-name">${def.name}</div>
          <div class="rpt-test-card-block-row-value" data-level="${level}">${fmt(value)}<span class="rpt-test-card-block-row-unit">s</span></div>
          <div class="rpt-test-card-block-row-bar">${scaleHtml}</div>
        </div>`;
    }).join('');

    const curveHtml = Report._renderSpeedCurve(player);
    const legendHtml = Report._renderSpeedLegend(player);
    const tableHtml = Report._renderSpeedResultsTable(player);

    return `
      <div class="rpt-test-card-block">
        <div class="rpt-test-card-block-name">Speed</div>
        ${desc ? `<div class="rpt-test-card-block-desc">${desc}</div>` : ''}
        ${pillHtml}
        ${rows}
        ${curveHtml}
        ${legendHtml}
        ${tableHtml}
      </div>`;
  },

  // Speed progression chart: X = distance, Y = pct vs age-group benchmark
  // (0 = poor, 100 = elite). Benchmark zones colored as background bands.
  // One polyline per session that has all 3 distances recorded.
  _renderSpeedCurve(player) {
    const SPRINT_KEYS = ['sprint5m', 'sprint30m', 'sprint40yd'];
    const SPRINT_LABELS = ['5m', '30m', '40yd'];
    const ageGroup = player.ageGroup;
    if (!ageGroup) return '';

    const thresholds = SPRINT_KEYS.map(tk => Benchmarks.getThresholds(ageGroup, tk));
    if (thresholds.some(t => !t)) return '';

    const byDate = {};
    for (let i = 0; i < SPRINT_KEYS.length; i++) {
      const td = player.tests?.[SPRINT_KEYS[i]];
      if (!td) continue;
      for (const s of (td.sessions || [])) {
        if (s.best == null) continue;
        if (!byDate[s.date]) byDate[s.date] = { date: s.date, times: [null, null, null] };
        byDate[s.date].times[i] = s.best;
      }
    }

    const completeSessions = Object.values(byDate)
      .filter(s => s.times.every(t => t != null))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (completeSessions.length === 0) return '';

    const charted = completeSessions.slice(-6);

    const width = 580, height = 240;
    const plot = { left: 70, right: 480, top: 10, bottom: 200 };
    const plotW = plot.right - plot.left;
    const plotH = plot.bottom - plot.top;
    const xPos = [plot.left, plot.left + plotW / 2, plot.right];
    const pctToY = (p) => plot.bottom - (Math.max(0, Math.min(100, p)) / 100) * plotH;

    // Band stops match the threshold mark center positions used by _computeVisualPct
    // (12.5 / 37.5 / 62.5 / 87.5) so each band actually contains the values for that tier.
    // Result: BELOW band ~38% tall, AVG/GOOD ~25% each, ELITE ~12% — matches profile.js bands.
    const bands = [
      { from: 100,  to: 87.5, color: '#3182CE', label: 'ELITE' },
      { from: 87.5, to: 62.5, color: '#38A169', label: 'GOOD' },
      { from: 62.5, to: 37.5, color: '#ED8936', label: 'AVG' },
      { from: 37.5, to: 0,    color: '#E53E3E', label: 'BELOW' },
    ];

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">`;

    for (const b of bands) {
      const y = pctToY(b.from);
      const h = pctToY(b.to) - y;
      svg += `<rect x="${plot.left}" y="${y.toFixed(1)}" width="${plotW}" height="${h.toFixed(1)}" fill="${b.color}" fill-opacity="0.10"/>`;
      const labelY = (y + h / 2 + 3).toFixed(1);
      svg += `<text x="${plot.right + 8}" y="${labelY}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="9" fill="${b.color}" opacity="0.85">${b.label}</text>`;
    }

    for (const stop of [87.5, 62.5, 37.5]) {
      svg += `<line x1="${plot.left}" y1="${pctToY(stop).toFixed(1)}" x2="${plot.right}" y2="${pctToY(stop).toFixed(1)}" stroke="#fff" stroke-width="1" opacity="0.6"/>`;
    }

    for (let i = 0; i < SPRINT_LABELS.length; i++) {
      svg += `<line x1="${xPos[i]}" y1="${plot.top}" x2="${xPos[i]}" y2="${plot.bottom}" stroke="#D8D5CC" stroke-width="0.5"/>`;
      svg += `<text x="${xPos[i]}" y="${height - 10}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="11" fill="#444">${SPRINT_LABELS[i]}</text>`;
    }

    for (let si = 0; si < charted.length; si++) {
      const s = charted[si];
      const style = Report._speedSessionStyle(si, charted.length);
      const pcts = s.times.map((t, i) => Report._computeVisualPct(t, thresholds[i], true));
      const pts = pcts.map((p, i) => `${xPos[i].toFixed(1)},${pctToY(p).toFixed(1)}`).join(' ');
      svg += `<polyline points="${pts}" fill="none" stroke="${style.color}" stroke-width="${style.stroke}" stroke-opacity="${style.opacity}" stroke-linejoin="round" stroke-linecap="round"/>`;
      for (let i = 0; i < 3; i++) {
        svg += `<circle cx="${xPos[i].toFixed(1)}" cy="${pctToY(pcts[i]).toFixed(1)}" r="${style.dotR}" fill="${style.color}" opacity="${style.opacity}"/>`;
      }
    }

    svg += '</svg>';

    return `
      <div class="rpt-test-card-chart rpt-speed-curve-wrap">
        <div class="rpt-speed-curve-caption">Speed progression vs. age-group benchmark</div>
        ${svg}
      </div>`;
  },

  // Date legend below the speed curve. One swatch per chart-rendered session.
  _renderSpeedLegend(player) {
    const SPRINT_KEYS = ['sprint5m', 'sprint30m', 'sprint40yd'];
    const ageGroup = player.ageGroup;
    if (!ageGroup) return '';
    const thresholds = SPRINT_KEYS.map(tk => Benchmarks.getThresholds(ageGroup, tk));
    if (thresholds.some(t => !t)) return '';

    const byDate = {};
    for (let i = 0; i < SPRINT_KEYS.length; i++) {
      const td = player.tests?.[SPRINT_KEYS[i]];
      if (!td) continue;
      for (const s of (td.sessions || [])) {
        if (s.best == null) continue;
        if (!byDate[s.date]) byDate[s.date] = { date: s.date, times: [null, null, null] };
        byDate[s.date].times[i] = s.best;
      }
    }
    const charted = Object.values(byDate)
      .filter(s => s.times.every(t => t != null))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6);

    if (charted.length === 0) return '';

    const fmt = (iso) => {
      const d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const items = charted.map((s, i) => {
      const style = Report._speedSessionStyle(i, charted.length);
      let suffix = '';
      if (charted.length >= 2 && i === charted.length - 1) suffix = ' (latest)';
      else if (charted.length >= 3 && i === 0) suffix = ' (oldest)';
      return `
        <span class="rpt-speed-legend-item" style="color:${style.color}">
          <svg width="20" height="3" style="overflow:visible"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke="${style.color}" stroke-width="${style.stroke}" stroke-opacity="${style.opacity}"/></svg>
          ${fmt(s.date)}${suffix}
        </span>`;
    }).join('');

    return `<div class="rpt-speed-legend">${items}</div>`;
  },

  // Results table: one row per session that has at least one sprint result.
  // Date column is colored to match the chart line; sessions not represented
  // in the chart use neutral gray.
  _renderSpeedResultsTable(player) {
    const SPRINT_KEYS = ['sprint5m', 'sprint30m', 'sprint40yd'];

    const byDate = {};
    for (let i = 0; i < SPRINT_KEYS.length; i++) {
      const td = player.tests?.[SPRINT_KEYS[i]];
      if (!td) continue;
      for (const s of (td.sessions || [])) {
        if (s.best == null) continue;
        if (!byDate[s.date]) byDate[s.date] = { date: s.date, times: [null, null, null] };
        byDate[s.date].times[i] = s.best;
      }
    }

    const allSessions = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
    if (allSessions.length === 0) return '';

    const charted = allSessions.filter(s => s.times.every(t => t != null)).slice(-6);
    const colorByDate = {};
    charted.forEach((s, i) => {
      const style = Report._speedSessionStyle(i, charted.length);
      colorByDate[s.date] = style.color;
    });
    const latestDate = allSessions[allSessions.length - 1].date;

    const fmt = (iso) => {
      const d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const rows = allSessions.map(s => {
      const isLatest = s.date === latestDate;
      const color = colorByDate[s.date] || '#888';
      const cells = s.times.map(t => t == null ? '<span class="rpt-speed-na">&mdash;</span>' : `${Number(t).toFixed(2)}s`);
      const rowAttrs = isLatest ? 'data-latest' : '';
      return `
        <tr ${rowAttrs} style="--c:${color}">
          <td>${fmt(s.date)}</td>
          <td>${cells[0]}</td>
          <td>${cells[1]}</td>
          <td>${cells[2]}</td>
        </tr>`;
    }).join('');

    return `
      <table class="rpt-speed-results-table">
        <thead>
          <tr><th>Session</th><th>5m</th><th>30m</th><th>40yd</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  },

  // ── Performance Tests — Smart Card Layout ──────────────────

  _renderPerformanceTests(player) {
    if (!player.tests || !player.ageGroup) return '';

    // Order: CMJ, Broad Jump, Trap Bar, Pull-Ups, Speed (unified), IFT, Passing, Dribbling
    const singleCardOrder = ['cmj', 'broadJump', 'trapBarDL', 'pullUps'];
    const afterSpeedOrder = ['ift3015', 'passingAcc', 'dribbling'];

    const cards = [];
    for (const tk of singleCardOrder) {
      const card = Report._renderSingleTestCard(player, tk);
      if (card) cards.push(card);
    }
    const speed = Report._renderSpeedCard(player);
    if (speed) cards.push(speed);
    for (const tk of afterSpeedOrder) {
      const card = Report._renderSingleTestCard(player, tk);
      if (card) cards.push(card);
    }

    if (cards.length === 0) return '';

    return `
      <div class="rpt-section">
        <div class="rpt-heading">Performance Tests</div>
        <div class="rpt-bench-ref">Benchmarks: German Top Academy Standards for ${player.ageGroup}</div>
        ${cards.join('')}
        <div class="rpt-bench-legend">
          <span class="rpt-bench-key" data-level="poor">Below Avg</span>
          <span class="rpt-bench-key" data-level="average">Average</span>
          <span class="rpt-bench-key" data-level="good">Good</span>
          <span class="rpt-bench-key" data-level="elite">Elite</span>
        </div>
      </div>`;
  },

  // ── Top 3 Improvements (auto + coach-authored, AI-polished) ──

  _renderTopImprovements(player) {
    const items = (player.topImprovements || [])
      .slice(0, 3)
      .filter(it => it && (it.title || '').trim() && (it.description || '').trim());

    if (items.length === 0) return '';

    const cards = items.map((it, i) => {
      const sourceChip = it.source === 'auto'
        ? '<span class="rpt-improvement-source-chip">From testing</span>'
        : '';
      return `
        <div class="rpt-improvement-card">
          <div class="rpt-improvement-num">${i + 1}</div>
          <div class="rpt-improvement-body">
            <div class="rpt-improvement-title">${Report._esc(it.title)}${sourceChip}</div>
            <div class="rpt-improvement-desc">${Report._esc(it.description)}</div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="rpt-section rpt-top-improvements">
        <div class="rpt-heading">Top 3 Improvements</div>
        ${cards}
      </div>`;
  },


  // ── Season Highlights — Test Improvements + Improved Traits ──

  _renderSeasonHighlights(player) {
    const testImprovements = ReportNarrative.getBiggestImprovements(player);
    const traitImprovements = ReportNarrative.getImprovedTraitLabels(Report._review);

    if (testImprovements.length === 0 && traitImprovements.length === 0) return '';

    let html = '';

    // Performance improvements
    if (testImprovements.length > 0) {
      html += `<div class="rpt-highlights-group-label">Performance</div>`;
      html += `<ul class="rpt-bullet-list rpt-improvements">`;
      html += testImprovements.map(imp =>
        `<li>${imp.name}: ${imp.from}${imp.unit} &rarr; ${imp.to}${imp.unit} (${imp.lowerIsBetter ? '&minus;' : '+'}${imp.pctChange})</li>`
      ).join('');
      html += `</ul>`;
    }

    // Development trait improvements
    if (traitImprovements.length > 0) {
      html += `<div class="rpt-highlights-group-label">Development</div>`;
      html += `<ul class="rpt-bullet-list rpt-improvements">`;
      html += traitImprovements.map(t => `<li>${t}</li>`).join('');
      html += `</ul>`;
    }

    return `
      <div class="rpt-section rpt-highlights">
        <div class="rpt-heading">Season Highlights</div>
        ${html}
      </div>`;
  },

  // ── Trials Section ─────────────────────────────────────────

  _renderTrials(player) {
    if (Report._trials.length === 0) return '';

    const trialsHTML = Report._trials.map(t => {
      const dateStr = t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
      const text = t.generatedText || t.bullets || '';
      if (!t.clubName && !text) return '';

      const levelStr = t.competitionLevel
        ? `<span class="rpt-trial-date">&middot; ${t.competitionLevel}${t.tier ? ' Tier ' + t.tier : ''}</span>`
        : '';

      return `<div class="rpt-trial">
        <div class="rpt-trial-header">
          <strong>${t.clubName || 'Club Trial'}</strong>
          ${levelStr}
          ${t.coachName ? `<span class="rpt-trial-date">&middot; Coach: ${t.coachName}</span>` : ''}
          ${dateStr ? `<span class="rpt-trial-date">&middot; ${dateStr}</span>` : ''}
        </div>
        ${text ? `<div class="rpt-trial-text">${text}</div>` : ''}
      </div>`;
    }).filter(Boolean).join('');

    if (!trialsHTML) return '';

    return `
      <div class="rpt-section">
        <div class="rpt-heading">Trial Reports</div>
        ${trialsHTML}
      </div>`;
  },

  // ── Coaching Staff Evaluation ───────────────────────────────

  _renderCoachEvaluation(player) {
    const coachEval = ReportNarrative.generateCoachEvaluation(
      player, Report._review, Report._coachNotes, Report._trials, Report._endOfSeason
    );

    if (!coachEval) return '';

    return `
      <div class="rpt-section rpt-coach-section">
        <div class="rpt-heading">Coaching Staff Evaluation</div>
        <div class="rpt-coach-eval-frame">
          <div class="rpt-coach-eval">${coachEval}</div>
        </div>
      </div>`;
  },

  // ── Media ──────────────────────────────────────────────────

  _renderMedia() {
    const links = Report._mediaLinks.filter(m => m.url);
    if (links.length === 0) return '';

    return `
      <div class="rpt-section">
        <div class="rpt-heading">Media</div>
        ${links.map(m =>
          `<div class="rpt-media-row">
            <span class="rpt-media-icon">&#9654;</span>
            <a href="${m.url}" target="_blank" rel="noopener">${m.label || m.url}</a>
          </div>`
        ).join('')}
      </div>`;
  },

  // ── Footer ─────────────────────────────────────────────────

  _renderFooter(player) {
    return `
      <div class="rpt-footer">
        <img src="assets/logos/koln-fs.webp" alt="" class="rpt-footer-logo">
        <span class="rpt-footer-text">ITP Family Report &mdash; ${player.firstName} ${player.lastName} &mdash; 1. FC K&ouml;ln Football School</span>
      </div>
      <div class="rpt-page-accent"></div>`;
  },

  // ── PDF Export ─────────────────────────────────────────────

  // Compute fill width that visually aligns with the four threshold mark centers
  // (12.5%, 37.5%, 62.5%, 87.5%). Mirrors TrialReport._computeVisualPct.
  _computeVisualPct(value, thresh, lowerIsBetter) {
    const { poor, average, good, elite } = thresh;
    const interp = (a, b, base) => {
      const span = a - b;
      if (span === 0) return base + 12.5;
      const ratio = (a - value) / span;
      return base + Math.max(0, Math.min(1, ratio)) * 25;
    };
    if (lowerIsBetter) {
      if (value >= poor)    return Math.max(2, (poor / value) * 12.5);
      if (value >= average) return interp(poor, average, 12.5);
      if (value >= good)    return interp(average, good, 37.5);
      if (value >= elite)   return interp(good, elite, 62.5);
      return Math.min(100, 87.5 + ((elite - value) / elite) * 12.5);
    }
    if (value <= poor)    return Math.max(2, (value / poor) * 12.5);
    if (value <= average) return 12.5 + ((value - poor) / (average - poor)) * 25;
    if (value <= good)    return 37.5 + ((value - average) / (good - average)) * 25;
    if (value <= elite)   return 62.5 + ((value - good) / (elite - good)) * 25;
    return Math.min(100, 87.5 + ((value - elite) / elite) * 12.5);
  },

  // Returns { color, stroke, opacity, dotR } for a session at zero-based age `idx`
  // (0 = oldest of the rendered sessions, total-1 = latest).
  _speedSessionStyle(idx, total) {
    const isLatest = idx === total - 1;
    if (isLatest) {
      return { color: '#E3000F', stroke: 2.8, opacity: 1, dotR: 4.2 };
    }
    const generationsBack = (total - 1) - idx;
    const palette = ['#5B7BA8', '#C49B6C'];
    const color = palette[(generationsBack - 1) % palette.length];
    const fadeStep = Math.max(0, generationsBack - 1) * 0.15;
    const opacity = Math.max(0.45, 0.95 - fadeStep);
    const stroke = generationsBack === 1 ? 1.9 : 1.7;
    const dotR = generationsBack === 1 ? 3.2 : 3.0;
    return { color, stroke, opacity, dotR };
  },

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
        pagebreak: { mode: ['css', 'legacy'], avoid: '.rpt-section' }
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
