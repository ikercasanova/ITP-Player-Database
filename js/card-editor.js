'use strict';

/* ═══════════════════════════════════════════════════════════════
   card-editor.js — Player Card editor: trait selector, preview, PDF
   Accessed from player profile via #card/PLAYER_ID
═══════════════════════════════════════════════════════════════ */

const CardEditor = {

  _player: null,
  _selectedTraits: new Set(),
  _partnerLogo: null,
  _cardLayout: 'usa',
  _previewTimer: null,
  _contactId: 'max',

  init() {},

  // ── Entry Point ─────────────────────────────────────────────

  async show(playerId) {
    const player = await DB.get(playerId);
    if (!player) { location.hash = '#roster'; return; }

    CardEditor._player = player;
    CardEditor._selectedTraits = new Set();
    CardEditor._partnerLogo = player.partnerLogoBase64 || null;
    CardEditor._cardLayout = player.cardLayout || 'usa';
    CardEditor._contactId = player.cardContact || 'max';

    // Restore saved traits
    if (player.strengths && player.strengths.length > 0) {
      CardEditor._restoreTraitsFromLabels(player.strengths);
    }

    const container = document.getElementById('card-editor-content');
    container.innerHTML = CardEditor._renderBuilder(player);
    CardEditor._bindEvents(container);
  },

  // ══════════════════════════════════════════════════════════════
  //  BUILDER FORM
  // ══════════════════════════════════════════════════════════════

  _renderBuilder(player) {
    const name = `${player.firstName} ${player.lastName}`;
    const ev = CardEditor;

    return `
      <div class="report-builder">
        <div class="back-row">
          <button class="btn-back" onclick="location.hash='#profile/${player.id}'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back to Profile
          </button>
        </div>

        <div class="report-builder-header">
          <h2>Player Card</h2>
          <p class="report-builder-sub">${name} &middot; ${player.ageGroup || '—'}</p>
        </div>

        <!-- ── Layout Selector ────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Card Layout</div>
          <div class="card-layout-toggle" id="card-layout-toggle">
            ${Object.values(CARD_LAYOUTS).map(l => `
              <button type="button" class="card-layout-btn ${l.id === ev._cardLayout ? 'active' : ''}" data-layout="${l.id}">${l.label}</button>
            `).join('')}
          </div>
        </div>

        <!-- ── Trait Selector ─────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Scouting Traits</div>
          <p class="report-section-desc">Select traits that describe this player. These generate the Key Strengths and Playing Style sections.</p>
          <div id="card-trait-categories">${CardEditor._renderTraitSelector()}</div>
        </div>

        <!-- ── Contact Person ──────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Contact Person</div>
          <div class="card-layout-toggle" id="card-contact-toggle">
            ${Object.values(CARD_CONTACTS).map(c => `
              <button type="button" class="card-layout-btn ${c.id === CardEditor._contactId ? 'active' : ''}" data-contact="${c.id}">${c.label}</button>
            `).join('')}
          </div>
        </div>

        <!-- ── Player Archetype ─────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Player Archetype</div>
          <p class="report-section-desc">The big label on the card. Auto-detected from traits, or pick manually.</p>
          <div class="card-archetype-toggle" id="card-archetype-toggle">
            <button type="button" class="card-archetype-btn ${!CardEditor._player.archetypeOverride ? 'active' : ''}" data-archetype="">Auto</button>
            ${Object.entries(ARCHETYPE_NAMES).map(([key, name]) =>
              `<button type="button" class="card-archetype-btn ${CardEditor._player.archetypeOverride === key ? 'active' : ''}" data-archetype="${key}">${name}</button>`
            ).join('')}
          </div>
        </div>

        <!-- ── Playing Style ──────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Playing Style</div>
          <div class="card-generate-row">
            <button class="btn btn-outline btn-sm" id="card-btn-generate">Generate Playing Style</button>
            <button class="btn btn-ghost btn-sm" id="card-btn-clear-traits">Clear Traits</button>
          </div>
          <textarea class="report-textarea" id="card-playing-style" rows="4" placeholder="Generate from traits or write manually...">${CardEditor._esc(player.playingStyle || '')}</textarea>
        </div>

        <!-- ── Partner Logo ───────────────────────────────── -->
        <div class="report-section">
          <div class="report-section-title">Partner Club Logo</div>
          <div class="card-logo-presets" id="card-logo-presets">
            <div class="card-logo-option ${ev._partnerLogo === 'assets/logos/athletes-usa-dark.png' ? 'selected' : ''}" data-logo="assets/logos/athletes-usa-dark.png" title="Athletes USA">
              <img src="assets/logos/athletes-usa-dark.png" alt="Athletes USA">
            </div>
            <div class="card-logo-option ${ev._partnerLogo === 'assets/logos/athletes-usa.png' ? 'selected' : ''}" data-logo="assets/logos/athletes-usa.png" title="Athletes USA (White)">
              <img src="assets/logos/athletes-usa.png" alt="Athletes USA (White)">
            </div>
            <div class="card-logo-option ${ev._partnerLogo === 'assets/logos/warubi-sports.png' ? 'selected' : ''}" data-logo="assets/logos/warubi-sports.png" title="Warubi Sports">
              <img src="assets/logos/warubi-sports.png" alt="Warubi Sports">
            </div>
            <div class="card-logo-option ${ev._partnerLogo === 'assets/logos/warubi.png' ? 'selected' : ''}" data-logo="assets/logos/warubi.png" title="Warubi">
              <img src="assets/logos/warubi.png" alt="Warubi">
            </div>
            <div class="card-logo-option card-logo-none ${!ev._partnerLogo ? 'selected' : ''}" data-logo="" title="No logo">
              <span>None</span>
            </div>
          </div>
          <div class="card-logo-custom-row">
            <input type="file" id="card-logo-input" accept="image/*" style="display:none">
            <button class="btn btn-ghost btn-sm" id="card-btn-upload-logo">Or upload custom logo</button>
          </div>
        </div>

        <!-- ── Actions ────────────────────────────────────── -->
        <div class="report-actions">
          <button class="btn btn-outline" id="card-btn-save">Save Draft</button>
          <button class="btn btn-primary" id="card-btn-preview">Preview Card</button>
        </div>

        <div id="card-preview-area"></div>
      </div>`;
  },

  _renderTraitSelector() {
    let html = '';
    for (const [catKey, cat] of Object.entries(SCOUT_TRAITS)) {
      const selectedInCat = Object.keys(cat.traits).filter(t => CardEditor._selectedTraits.has(t)).length;
      const countBadge = selectedInCat > 0 ? `<span class="card-trait-count">${selectedInCat}</span>` : '';

      html += `<div class="card-trait-category open">
        <div class="card-trait-category-header">
          <span class="card-trait-chevron">&#9654;</span>
          <span class="card-trait-category-label">${cat.label}</span>
          ${countBadge}
        </div>
        <div class="card-trait-chips">`;

      for (const [traitKey, traitLabel] of Object.entries(cat.traits)) {
        const sel = CardEditor._selectedTraits.has(traitKey) ? ' card-trait-selected' : '';
        html += `<span class="trait-chip${sel}" data-trait="${traitKey}">${traitLabel}</span>`;
      }

      html += `</div></div>`;
    }
    return html;
  },

  // ── Events ──────────────────────────────────────────────────

  _bindEvents(container) {
    // Trait chip clicks
    container.querySelector('#card-trait-categories').addEventListener('click', e => {
      const header = e.target.closest('.card-trait-category-header');
      if (header) {
        header.parentElement.classList.toggle('open');
        return;
      }
      const chip = e.target.closest('.trait-chip');
      if (chip) {
        const key = chip.dataset.trait;
        if (CardEditor._selectedTraits.has(key)) {
          CardEditor._selectedTraits.delete(key);
          chip.classList.remove('card-trait-selected');
        } else {
          CardEditor._selectedTraits.add(key);
          chip.classList.add('card-trait-selected');
        }
        // Update count badges
        container.querySelector('#card-trait-categories').innerHTML = CardEditor._renderTraitSelector();
      }
    });

    // Layout toggle
    container.querySelector('#card-layout-toggle').addEventListener('click', e => {
      const btn = e.target.closest('.card-layout-btn');
      if (!btn) return;
      container.querySelectorAll('.card-layout-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CardEditor._cardLayout = btn.dataset.layout;
    });

    // Contact toggle
    container.querySelector('#card-contact-toggle').addEventListener('click', e => {
      const btn = e.target.closest('.card-layout-btn');
      if (!btn) return;
      container.querySelector('#card-contact-toggle').querySelectorAll('.card-layout-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CardEditor._contactId = btn.dataset.contact;
    });

    // Archetype toggle
    container.querySelector('#card-archetype-toggle').addEventListener('click', e => {
      const btn = e.target.closest('.card-archetype-btn');
      if (!btn) return;
      container.querySelectorAll('.card-archetype-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      CardEditor._player.archetypeOverride = btn.dataset.archetype || null;
    });

    // Generate playing style
    container.querySelector('#card-btn-generate').addEventListener('click', async () => {
      if (CardEditor._selectedTraits.size === 0) {
        App.toast('Select some traits first');
        return;
      }
      const btn = container.querySelector('#card-btn-generate');
      const textarea = container.querySelector('#card-playing-style');
      const cardData = CardEditor._mapPlayerToCard(CardEditor._player);

      // Try Claude API first, fall back to deterministic generator
      const apiKey = CardEditor._getApiKey();
      if (apiKey) {
        btn.textContent = 'Generating...';
        btn.disabled = true;
        try {
          const text = await CardEditor._generateWithAI(cardData, apiKey);
          textarea.value = text;
        } catch (err) {
          console.warn('AI generation failed, using fallback:', err);
          textarea.value = ScoutGenerator.generate(CardEditor._selectedTraits, cardData);
          App.toast('Used offline generator');
        }
        btn.textContent = 'Generate Playing Style';
        btn.disabled = false;
      } else {
        textarea.value = ScoutGenerator.generate(CardEditor._selectedTraits, cardData);
      }
    });

    // Clear traits
    container.querySelector('#card-btn-clear-traits').addEventListener('click', () => {
      CardEditor._selectedTraits = new Set();
      container.querySelector('#card-trait-categories').innerHTML = CardEditor._renderTraitSelector();
    });

    // Partner logo presets
    container.querySelector('#card-logo-presets').addEventListener('click', e => {
      const option = e.target.closest('.card-logo-option');
      if (!option) return;
      container.querySelectorAll('.card-logo-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      CardEditor._partnerLogo = option.dataset.logo || null;
    });

    // Custom logo upload
    container.querySelector('#card-btn-upload-logo').addEventListener('click', () => {
      container.querySelector('#card-logo-input').click();
    });

    container.querySelector('#card-logo-input').addEventListener('change', e => {
      if (e.target.files[0]) {
        CardEditor._resizeImage(e.target.files[0], 400, b64 => {
          CardEditor._partnerLogo = b64;
          container.querySelectorAll('.card-logo-option').forEach(o => o.classList.remove('selected'));
        }, 'image/png');
      }
    });

    // Save draft
    container.querySelector('#card-btn-save').addEventListener('click', async () => {
      CardEditor._syncFormData(container);
      await CardEditor._saveDraft();
      App.toast('Card draft saved');
    });

    // Preview
    container.querySelector('#card-btn-preview').addEventListener('click', async () => {
      CardEditor._syncFormData(container);
      await CardEditor._saveDraft();
      CardEditor._showPreview(container);
    });
  },

  _syncFormData(container) {
    CardEditor._player.playingStyle = container.querySelector('#card-playing-style')?.value || '';
    CardEditor._player.strengths = CardEditor._getStrengthLabels();
    CardEditor._player.partnerLogoBase64 = CardEditor._partnerLogo;
    CardEditor._player.cardLayout = CardEditor._cardLayout;
    CardEditor._player.cardContact = CardEditor._contactId;
    // archetypeOverride already set via click handler
  },

  async _saveDraft() {
    await DB.save(CardEditor._player);
  },

  // ══════════════════════════════════════════════════════════════
  //  DATA MAPPING
  // ══════════════════════════════════════════════════════════════

  _mapPlayerToCard(player) {
    return {
      firstName: player.firstName,
      lastName: player.lastName,
      nationality: player.nationality,
      passportCountry: player.passportCountry || player.nationality,
      dateOfBirth: player.dateOfBirth,
      heightCm: player.heightCm,
      weightKg: player.weightKg,
      foot: player.foot,
      positions: (player.positions || []).map((p, i) =>
        typeof p === 'string' ? { rank: i + 1, code: p } : p
      ),
      photoBase64: player.photoBase64,
      photoPositionY: player.photoPositionY ?? 25,
      partnerLogoBase64: player.partnerLogoBase64 || null,
      tests: {
        cmjCm: player.tests?.cmj?.best ?? null,
        broadJumpCm: player.tests?.broadJump?.best ?? null,
        sprint30mSec: player.tests?.sprint30m?.best ?? null,
        sprint40ydSec: player.tests?.sprint40yd?.best ?? null,
      },
      strengths: player.strengths || [],
      playingStyle: player.playingStyle || '',
      videoUrls: [player.highlightUrl, player.fullGameUrl].filter(Boolean),
      archetypeOverride: player.archetypeOverride || null,
      cardContact: player.cardContact || 'max',
    };
  },

  // ══════════════════════════════════════════════════════════════
  //  PREVIEW
  // ══════════════════════════════════════════════════════════════

  _showPreview(container) {
    const previewArea = container.querySelector('#card-preview-area');
    const cardData = CardEditor._mapPlayerToCard(CardEditor._player);
    const card = buildCard(cardData, CardEditor._cardLayout);

    previewArea.innerHTML = `
      <div class="report-preview-toolbar">
        <button class="btn btn-primary" id="card-btn-export-pdf">Export PDF</button>
        <button class="btn btn-outline" id="card-btn-close-preview">Close Preview</button>
      </div>
      <div class="report-preview-scroll">
        <div class="card-preview-wrapper" id="card-preview-wrapper"></div>
      </div>`;

    previewArea.querySelector('#card-preview-wrapper').appendChild(card);
    previewArea.scrollIntoView({ behavior: 'smooth' });

    // Export PDF
    previewArea.querySelector('#card-btn-export-pdf').addEventListener('click', () => {
      CardEditor._exportPDF();
    });

    // Close
    previewArea.querySelector('#card-btn-close-preview').addEventListener('click', () => {
      previewArea.innerHTML = '';
    });
  },

  _exportPDF() {
    const cardData = CardEditor._mapPlayerToCard(CardEditor._player);
    PDF.export(cardData, CardEditor._cardLayout)
      .then(() => App.toast('PDF exported'))
      .catch(err => {
        console.error('PDF export error:', err);
        App.toast('PDF export failed');
      });
  },

  // ══════════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════════

  _getStrengthLabels() {
    const labels = [];
    for (const key of CardEditor._selectedTraits) {
      for (const cat of Object.values(SCOUT_TRAITS)) {
        if (key in cat.traits) { labels.push(cat.traits[key]); break; }
      }
    }
    return labels;
  },

  _restoreTraitsFromLabels(labels) {
    CardEditor._selectedTraits = new Set();
    for (const label of labels) {
      for (const cat of Object.values(SCOUT_TRAITS)) {
        for (const [key, val] of Object.entries(cat.traits)) {
          if (val === label) { CardEditor._selectedTraits.add(key); break; }
        }
      }
    }
  },

  _resizeImage(file, maxSize, callback, format) {
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
        callback(canvas.toDataURL(format || 'image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  _getApiKey() {
    let key = localStorage.getItem('itp_claude_api_key');
    if (!key) {
      key = window.prompt('Enter your Claude API key for AI-generated descriptions.\n\nGet one at console.anthropic.com.\nSaved locally in your browser.');
      if (key) localStorage.setItem('itp_claude_api_key', key.trim());
    }
    return key ? key.trim() : null;
  },

  async _generateWithAI(cardData, apiKey) {
    const player = CardEditor._player;
    const traits = CardEditor._getStrengthLabels();
    const layout = CARD_LAYOUTS[CardEditor._cardLayout];
    const isGerman = CardEditor._cardLayout === 'german';
    const positions = (player.positions || []).map(p => typeof p === 'string' ? p : p.code).join(', ');

    const prompt = isGerman
      ? `Schreibe einen sehr kurzen Scouting-Bericht (2 Sätze) auf Deutsch für eine Fußballspieler-Profilkarte. Professionell, überzeugend, natürlich klingend. Keine Aufzählungszeichen, keine Bindestriche, kein "KI-Stil". Schreibe wie ein erfahrener Scout.

Spieler: ${player.firstName} ${player.lastName}, ${App.computeAge(player.dateOfBirth) || '?'} Jahre
Position: ${positions || '?'} | Fuß: ${player.foot || '?'} | Größe: ${player.heightCm ? player.heightCm + ' cm' : '?'}
Stärken: ${traits.join(', ')}

NUR 2 Sätze Fließtext. Kein Markdown.`
      : `Write a very short scouting description (2 sentences only) for a football player profile card. Professional, compelling, natural sounding. No bullet points, no dashes, no AI-sounding phrases. Write like an experienced scout.

Player: ${player.firstName} ${player.lastName}, age ${App.computeAge(player.dateOfBirth) || '?'}
Position: ${positions || '?'} | Foot: ${player.foot || '?'} | Height: ${player.heightCm ? player.heightCm + ' cm' : '?'}
Key traits: ${traits.join(', ')}

ONLY 2 sentences of flowing text. No markdown.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('itp_claude_api_key');
        throw new Error('Invalid API key');
      }
      throw new Error(`API error (${response.status})`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  },

  _esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
