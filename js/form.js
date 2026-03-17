'use strict';

/* ═══════════════════════════════════════════════════════════════
   form.js — Add/Edit player form with pitch selector
═══════════════════════════════════════════════════════════════ */

const PITCH_POS_COORDS = {
  GK:  { cx: 12,  cy: 50 },
  CB:  { cx: 35,  cy: 50 },
  LB:  { cx: 42,  cy: 20 },
  RB:  { cx: 42,  cy: 80 },
  CDM: { cx: 60,  cy: 50 },
  CM:  { cx: 75,  cy: 50 },
  CAM: { cx: 92,  cy: 50 },
  LW:  { cx: 100, cy: 18 },
  RW:  { cx: 100, cy: 82 },
  ST:  { cx: 120, cy: 50 }
};

const PlayerForm = {
  editingId: null,
  selectedPositions: [],
  photoBase64: null,

  init() {},

  show(playerId) {
    PlayerForm.editingId = playerId || null;
    PlayerForm.selectedPositions = [];
    PlayerForm.photoBase64 = null;

    const container = document.getElementById('edit-content');
    const player = playerId ? DB.get(playerId) : null;

    if (playerId && !player) {
      location.hash = '#roster';
      return;
    }

    if (player) {
      PlayerForm.selectedPositions = (player.positions || []).map((p, i) =>
        typeof p === 'string' ? { rank: i + 1, code: p } : p
      );
      PlayerForm.photoBase64 = player.photoBase64 || null;
    }

    container.innerHTML = PlayerForm.renderForm(player);
    PlayerForm.bindEvents(container);
  },

  renderForm(player) {
    const p = player || {};
    const title = player ? 'Edit Player' : 'Add Player';

    return `
      <div class="form-page">
        <div class="form-page-header">
          <button class="btn-back" onclick="location.hash='${player ? '#profile/' + player.id : '#roster'}'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <h2>${title}</h2>
        </div>

        <form id="player-form" novalidate>

          <!-- Photo -->
          <div class="form-section text-center">
            <div class="photo-upload" id="photo-upload-area">
              <input type="file" id="f-photo" accept="image/*">
              <img id="photo-preview" src="${p.photoBase64 || ''}" style="${p.photoBase64 ? '' : 'display:none'}" alt="">
              <svg class="photo-upload-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="${p.photoBase64 ? 'display:none' : ''}">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            ${p.photoBase64 ? '<button type="button" id="btn-remove-photo" class="btn btn-ghost btn-sm">Remove Photo</button>' : ''}
          </div>

          <!-- Basic Info -->
          <div class="form-section">
            <div class="form-section-title">Basic Info</div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label">Player Type</label>
                <div class="player-type-toggle" id="player-type-toggle">
                  <button type="button" class="type-btn ${(p.playerType || 'registered') === 'registered' ? 'active' : ''}" data-type="registered">Registered</button>
                  <button type="button" class="type-btn ${p.playerType === 'trial' ? 'active' : ''}" data-type="trial">Trial</button>
                </div>
              </div>
            </div>
            <div class="form-row trial-dates-row" id="trial-dates-row" style="${p.playerType === 'trial' ? '' : 'display:none'}">
              <div class="form-field">
                <label class="form-label" for="f-trialStart">Trial Start</label>
                <input class="form-input" type="date" id="f-trialStart" value="${p.trialDates?.start || ''}">
              </div>
              <div class="form-field">
                <label class="form-label" for="f-trialEnd">Trial End</label>
                <input class="form-input" type="date" id="f-trialEnd" value="${p.trialDates?.end || ''}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label" for="f-firstName">First Name</label>
                <input class="form-input" type="text" id="f-firstName" value="${p.firstName || ''}" autocomplete="off">
              </div>
              <div class="form-field">
                <label class="form-label" for="f-lastName">Last Name</label>
                <input class="form-input" type="text" id="f-lastName" value="${p.lastName || ''}" autocomplete="off">
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label" for="f-dateOfBirth">Date of Birth</label>
                <input class="form-input" type="date" id="f-dateOfBirth" value="${p.dateOfBirth || ''}">
              </div>
              <div class="form-field">
                <label class="form-label" for="f-ageGroup">Age Group</label>
                <select class="form-select" id="f-ageGroup">
                  <option value="">Select</option>
                  <option value="U-17" ${p.ageGroup === 'U-17' ? 'selected' : ''}>U-17</option>
                  <option value="U-19" ${p.ageGroup === 'U-19' ? 'selected' : ''}>U-19</option>
                  <option value="U-21" ${p.ageGroup === 'U-21' ? 'selected' : ''}>U-21</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label" for="f-nationality">Nationality</label>
                <input class="form-input" type="text" id="f-nationality" value="${p.nationality || ''}" autocomplete="off">
              </div>
              <div class="form-field">
                <label class="form-label" for="f-foot">Preferred Foot</label>
                <select class="form-select" id="f-foot">
                  <option value="">Select</option>
                  <option value="Right" ${p.foot === 'Right' ? 'selected' : ''}>Right</option>
                  <option value="Left" ${p.foot === 'Left' ? 'selected' : ''}>Left</option>
                  <option value="Both" ${p.foot === 'Both' ? 'selected' : ''}>Both</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Position -->
          <div class="form-section">
            <div class="form-section-title">Position</div>
            <p class="form-hint">Tap positions on the pitch (max 3). First = primary.</p>
            <div class="pitch-selector-wrap" id="pitch-selector"></div>
            <div class="selected-positions" id="selected-positions"></div>
          </div>

          <!-- Body Composition -->
          <div class="form-section">
            <div class="form-section-title">Body Composition</div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label" for="f-heightCm">Height (cm)</label>
                <input class="form-input" type="number" id="f-heightCm" value="${p.heightCm || ''}" min="100" max="220" step="1" inputmode="decimal">
              </div>
              <div class="form-field">
                <label class="form-label" for="f-weightKg">Weight (kg)</label>
                <input class="form-input" type="number" id="f-weightKg" value="${p.weightKg || ''}" min="30" max="150" step="0.1" inputmode="decimal">
              </div>
            </div>
            <div class="form-row">
              <div class="form-field">
                <label class="form-label" for="f-bodyFatPct">Body Fat %</label>
                <input class="form-input" type="number" id="f-bodyFatPct" value="${p.bodyFatPct || ''}" min="3" max="40" step="0.1" inputmode="decimal">
              </div>
              <div class="form-field">
                <label class="form-label" for="f-muscleRatePct">Muscle Rate %</label>
                <input class="form-input" type="number" id="f-muscleRatePct" value="${p.muscleRatePct || ''}" min="20" max="70" step="0.1" inputmode="decimal">
              </div>
            </div>
          </div>

          <!-- Videos -->
          <div class="form-section">
            <div class="form-section-title">Video Links</div>
            <div class="form-field">
              <label class="form-label" for="f-highlightUrl">Highlight Video</label>
              <input class="form-input" type="url" id="f-highlightUrl" value="${p.highlightUrl || ''}" placeholder="https://youtube.com/...">
            </div>
            <div class="form-field">
              <label class="form-label" for="f-fullGameUrl">Full Game Video</label>
              <input class="form-input" type="url" id="f-fullGameUrl" value="${p.fullGameUrl || ''}" placeholder="https://veo.co/...">
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="submit" class="btn btn-primary btn-lg">Save Player</button>
          </div>

        </form>
      </div>`;
  },

  bindEvents(container) {
    // Photo upload
    const photoInput = container.querySelector('#f-photo');
    photoInput.addEventListener('change', e => {
      if (e.target.files[0]) {
        PlayerForm.resizeImage(e.target.files[0], 600, b64 => {
          PlayerForm.photoBase64 = b64;
          const img = container.querySelector('#photo-preview');
          img.src = b64;
          img.style.display = '';
          const icon = container.querySelector('.photo-upload-icon');
          if (icon) icon.style.display = 'none';
        });
      }
    });

    // Remove photo
    const removeBtn = container.querySelector('#btn-remove-photo');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        PlayerForm.photoBase64 = null;
        const img = container.querySelector('#photo-preview');
        img.style.display = 'none';
        img.src = '';
        const icon = container.querySelector('.photo-upload-icon');
        if (icon) icon.style.display = '';
        removeBtn.remove();
      });
    }

    // Player type toggle
    const typeToggle = container.querySelector('#player-type-toggle');
    if (typeToggle) {
      typeToggle.addEventListener('click', e => {
        const btn = e.target.closest('.type-btn');
        if (!btn) return;
        typeToggle.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const trialRow = container.querySelector('#trial-dates-row');
        trialRow.style.display = btn.dataset.type === 'trial' ? '' : 'none';
      });
    }

    // Pitch selector
    PlayerForm.buildPitchSelector(container);
    PlayerForm.renderSelectedPositions(container);

    // Form submit
    container.querySelector('#player-form').addEventListener('submit', e => {
      e.preventDefault();
      PlayerForm.savePlayer(container);
    });
  },

  savePlayer(container) {
    const g = id => container.querySelector('#' + id)?.value.trim() || '';
    const n = id => { const v = parseFloat(container.querySelector('#' + id)?.value); return isNaN(v) ? null : v; };

    const activeType = container.querySelector('#player-type-toggle .type-btn.active');
    const playerType = activeType?.dataset.type || 'registered';

    const data = {
      firstName:     g('f-firstName'),
      lastName:      g('f-lastName'),
      dateOfBirth:   g('f-dateOfBirth'),
      ageGroup:      g('f-ageGroup'),
      nationality:   g('f-nationality'),
      foot:          g('f-foot'),
      heightCm:      n('f-heightCm'),
      weightKg:      n('f-weightKg'),
      bodyFatPct:    n('f-bodyFatPct'),
      muscleRatePct: n('f-muscleRatePct'),
      highlightUrl:  g('f-highlightUrl'),
      fullGameUrl:   g('f-fullGameUrl'),
      positions:     PlayerForm.selectedPositions.map(p => p.code),
      photoBase64:   PlayerForm.photoBase64,
      playerType,
    };

    if (playerType === 'trial') {
      data.trialDates = { start: g('f-trialStart'), end: g('f-trialEnd') };
    }

    // Compute BMI
    if (data.heightCm && data.weightKg) {
      const hm = data.heightCm / 100;
      data.bmi = Math.round((data.weightKg / (hm * hm)) * 10) / 10;
    }

    if (!data.firstName || !data.lastName) {
      App.toast('First and last name are required');
      return;
    }

    if (PlayerForm.editingId) {
      data.id = PlayerForm.editingId;
      // Preserve existing data not in the form
      const existing = DB.get(PlayerForm.editingId);
      if (existing) {
        if (existing.tests) data.tests = existing.tests;
        if (existing.trialEvaluation) data.trialEvaluation = existing.trialEvaluation;
        if (existing.developmentReview) data.developmentReview = existing.developmentReview;
        if (existing.trials) data.trials = existing.trials;
        if (existing.coachNotes) data.coachNotes = existing.coachNotes;
        if (existing.mediaLinks) data.mediaLinks = existing.mediaLinks;
      }
    }

    const saved = DB.save(data);
    App.toast(PlayerForm.editingId ? 'Player updated' : 'Player added');
    location.hash = `#profile/${saved.id}`;
  },

  // ── Image Resize ────────────────────────────────────────────

  resizeImage(file, maxSize, callback) {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height / width) * maxSize);
            width = maxSize;
          } else {
            width = Math.round((width / height) * maxSize);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  // ── Pitch Selector ──────────────────────────────────────────

  buildPitchSelector(container) {
    const wrap = (container || document).querySelector('#pitch-selector');
    if (!wrap) return;

    let dotsHTML = '';
    for (const [code, coord] of Object.entries(PITCH_POS_COORDS)) {
      const selIdx = PlayerForm.selectedPositions.findIndex(p => p.code === code);
      const isSelected = selIdx >= 0;
      const isPrimary = selIdx === 0;

      let fillColor, strokeColor, textColor;
      if (isPrimary) {
        fillColor = '#ED1C24'; strokeColor = 'rgba(255,255,255,0.9)'; textColor = 'white';
      } else if (isSelected) {
        fillColor = 'rgba(255,255,255,0.10)'; strokeColor = 'rgba(255,255,255,0.65)'; textColor = 'rgba(255,255,255,0.85)';
      } else {
        fillColor = 'rgba(255,255,255,0.05)'; strokeColor = 'rgba(255,255,255,0.18)'; textColor = 'rgba(255,255,255,0.5)';
      }

      dotsHTML += `
        <g data-pos="${code}" style="cursor:pointer">
          <circle cx="${coord.cx}" cy="${coord.cy}" r="8" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1"/>
          <text x="${coord.cx}" y="${coord.cy + 0.5}" text-anchor="middle" dominant-baseline="middle"
            fill="${textColor}" font-size="4.5" font-weight="bold" font-family="Arial,sans-serif" pointer-events="none">${code}</text>
        </g>`;
    }

    const stripes = Array.from({length: 10}, (_, i) =>
      `<rect x="${i*15}" y="0" width="15" height="100" fill="${i%2===0 ? '#0d0d0d' : '#161616'}"/>`
    ).join('');

    wrap.innerHTML = `<svg viewBox="0 0 150 100" xmlns="http://www.w3.org/2000/svg"
        style="width:100%;display:block;border-radius:6px;overflow:hidden;">
      ${stripes}
      <rect x="3" y="3" width="144" height="94" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.8"/>
      <line x1="75" y1="3" x2="75" y2="97" stroke="rgba(255,255,255,0.14)" stroke-width="0.6"/>
      <circle cx="75" cy="50" r="12" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.6"/>
      <rect x="3" y="22" width="27" height="56" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.6"/>
      <rect x="3" y="35" width="9" height="30" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.6"/>
      <rect x="120" y="22" width="27" height="56" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.6"/>
      <rect x="138" y="35" width="9" height="30" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="0.6"/>
      ${dotsHTML}
    </svg>`;

    wrap.querySelectorAll('[data-pos]').forEach(el => {
      el.addEventListener('click', e => {
        const code = e.currentTarget.dataset.pos;
        PlayerForm.togglePosition(code, container);
      });
    });
  },

  togglePosition(code, container) {
    const idx = PlayerForm.selectedPositions.findIndex(p => p.code === code);
    if (idx >= 0) {
      PlayerForm.selectedPositions.splice(idx, 1);
    } else if (PlayerForm.selectedPositions.length < 3) {
      PlayerForm.selectedPositions.push({ rank: PlayerForm.selectedPositions.length + 1, code });
    }
    PlayerForm.selectedPositions.forEach((p, i) => { p.rank = i + 1; });
    PlayerForm.buildPitchSelector(container);
    PlayerForm.renderSelectedPositions(container);
  },

  renderSelectedPositions(container) {
    const el = (container || document).querySelector('#selected-positions');
    if (!el) return;

    if (!PlayerForm.selectedPositions.length) {
      el.innerHTML = '<span class="form-hint">No positions selected</span>';
      return;
    }

    const labels = ['1st', '2nd', '3rd'];
    el.innerHTML = PlayerForm.selectedPositions.map((pos, i) => `
      <span class="sel-pos-pill">
        <span class="rank">${labels[i]}</span>
        <strong>${pos.code}</strong>
        <button type="button" class="remove" data-code="${pos.code}" title="Remove">&times;</button>
      </span>`).join('');

    el.querySelectorAll('.remove').forEach(btn => {
      btn.addEventListener('click', e => {
        PlayerForm.togglePosition(e.currentTarget.dataset.code, container);
      });
    });
  }
};
