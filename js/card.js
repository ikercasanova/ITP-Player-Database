'use strict';

/* ═══════════════════════════════════════════════════════════════
   card.js — buildCard(player, layoutId) → DOM element
   A4 card (794 × 1123 px)
   Layout configs live in layouts.js (CARD_LAYOUTS)
═══════════════════════════════════════════════════════════════ */

function calcBarPercent(value, cfg) {
  if (value == null || value === '') return 0;
  const v = parseFloat(value);
  if (isNaN(v)) return 0;
  if (cfg.higherIsBetter) {
    // Higher = better → linear scale from min to max
    return Math.max(0, Math.min(100, ((v - cfg.min) / (cfg.max - cfg.min)) * 100));
  }
  // Lower = better (sprints) → invert so faster = longer bar
  return Math.max(0, Math.min(100, ((cfg.max - v) / (cfg.max - cfg.min)) * 100));
}

function calcBenchmarkPercent(cfg) {
  if (cfg.higherIsBetter) {
    return ((cfg.benchmark - cfg.min) / (cfg.max - cfg.min)) * 100;
  }
  return ((cfg.max - cfg.benchmark) / (cfg.max - cfg.min)) * 100;
}

function buildTestsHTML(tests, layout) {
  const benchmarks = layout.benchmarks;

  // Only include tests that have data
  const testEntries = Object.entries(benchmarks).filter(([key, cfg]) => {
    const raw = tests[key];
    return raw != null && raw !== '' && !isNaN(parseFloat(raw));
  });

  if (testEntries.length === 0) return '';

  const legend = `<div class="test-bars-legend">
    <span class="test-legend-item"><span class="test-legend-swatch" style="background:#ED1C24"></span>${layout.labels.player}</span>
    <span class="test-legend-item"><span class="test-legend-swatch" style="background:#888"></span>${layout.benchmarkLabel}</span>
  </div>`;

  const rows = testEntries.map(([key, cfg]) => {
    const raw = tests[key];
    const displayVal = parseFloat(raw) + ' ' + cfg.unit;
    const barPct = calcBarPercent(raw, cfg);
    const benchPct = calcBenchmarkPercent(cfg);

    return `<div class="test-bar-row">
      <div class="test-bar-label">${cfg.label}</div>
      <div class="test-bar-value">${displayVal}</div>
      <div class="test-bar-track">
        <div class="test-bar-fill" style="width:${barPct.toFixed(1)}%"></div>
        <div class="test-bar-benchmark" style="left:${benchPct.toFixed(1)}%"></div>
      </div>
      <div class="test-bar-bench-val">${cfg.benchmark} ${cfg.unit}</div>
    </div>`;
  }).join('');

  return legend + rows;
}


// ── FC Köln Football School logo — official image ─────────────
// Located at assets/logos/koln-fs.webp
const FCK_LOGO_IMG = `<img src="assets/logos/fc-fs-white-full.png" class="card-fck-logo" alt="1. FC Köln Football School">`;

// ── Unit conversions ──────────────────────────────────────────

function cmToFtIn(cm) {
  if (!cm) return '—';
  const totalInches = Math.round(cm / 2.54); // round total first to avoid 5'12"
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${ft}'${inches}"`;
}

function kgToLbs(kg) {
  if (!kg) return '—';
  return Math.round(kg * 2.205) + ' lbs';
}

function formatHeight(cm, format) {
  if (!cm) return '—';
  if (format === 'metric') return `${cm} cm`;
  return `${cm} cm / ${cmToFtIn(cm)}`;
}

function formatWeight(kg, format) {
  if (!kg) return '—';
  if (format === 'metric') return `${kg} kg`;
  return `${kg} kg / ${kgToLbs(kg)}`;
}

function formatDate(dateStr, locale) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(locale || 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function calcAge(dateStr) {
  if (!dateStr) return null;
  const dob = new Date(dateStr + 'T12:00:00');
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function val(v) {
  return (v !== undefined && v !== null && v !== '') ? v : '—';
}


// ── YouTube Thumbnail ─────────────────────────────────────────

function getYouTubeInfo(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (match) return { thumb: `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`, url };
  return null;
}

function buildVideosHTML(urls, playerName, layout) {
  const url1 = urls?.[0]?.trim() || '';
  const url2 = urls?.[1]?.trim() || '';
  const name = (playerName || '').toUpperCase();
  const L = layout.labels;

  if (!url1 && !url2) {
    return `<div class="card-no-videos">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="5" width="22" height="16" rx="2" stroke="#ddd" stroke-width="1.5" fill="none"/>
        <path d="M23 11l7-4v14l-7-4V11z" stroke="#ddd" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
      </svg>
      <span>${L.noVideos}</span>
    </div>`;
  }

  let html = '';

  // Slot 1: Highlight Video
  if (url1) {
    const yt = getYouTubeInfo(url1);
    if (yt) {
      html += `<div class="card-video-item" data-url="${url1}">
          <img src="${yt.thumb}" class="card-video-thumb" alt="${L.highlightLabel}"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="card-video-thumb-gen" style="display:none">
            <div class="card-video-thumb-icon">&#9654;</div>
            <div class="card-video-thumb-gen-title">${L.highlight}</div>
            <div class="card-video-thumb-gen-name">${name}</div>
          </div>
          <div class="card-video-label">&#9654; ${L.highlightLabel}</div>
        </div>`;
    } else {
      html += `<div class="card-video-item" data-url="${url1}">
          <div class="card-video-thumb-gen">
            <div class="card-video-thumb-icon">&#9654;</div>
            <div class="card-video-thumb-gen-title">${L.highlight}</div>
            <div class="card-video-thumb-gen-name">${name}</div>
          </div>
          <div class="card-video-label" title="${url1}">&#9654; ${L.highlightLabel}</div>
        </div>`;
    }
  }

  // Slot 2: Full Game
  if (url2) {
    const isVeo = /app\.veo\.co/i.test(url2);
    html += `<div class="card-video-item" data-url="${url2}">
        <div class="card-video-thumb-gen card-video-thumb-gen--game">
          <div class="card-video-thumb-icon">&#9654;</div>
          <div class="card-video-thumb-gen-title">${L.fullGame}</div>
          <div class="card-video-thumb-gen-name">${name}</div>
          ${isVeo ? '<div class="card-video-thumb-gen-source">veo</div>' : ''}
        </div>
        <div class="card-video-label" title="${url2}">&#9654; ${L.fullGameLabel}${isVeo ? ' · Veo' : ''}</div>
      </div>`;
  }

  return html;
}

const POSITION_NAMES_DE = {
  GK: 'TW', CB: 'IV', LB: 'LV', RB: 'RV',
  CDM: 'ZDM', CM: 'ZM', CAM: 'ZOM',
  LW: 'LA', RW: 'RA', ST: 'ST',
};

function buildPositionDisplay(positions, layoutId) {
  if (!positions || !positions.length) return '';
  const isGerman = layoutId === 'german';

  return positions.map((p, i) => {
    const code = typeof p === 'string' ? p : p.code;
    const displayCode = isGerman ? (POSITION_NAMES_DE[code] || code) : code;
    const cls = i === 0 ? 'card-pos-primary' : 'card-pos-secondary';
    return `<span class="${cls}">${displayCode}</span>`;
  }).join('<span class="card-pos-sep">/</span>');
}

// ── Player Archetype Banner ──────────────────────────────────

function buildArchetypeBanner(player) {
  const primaryPos = player.positions?.[0];
  const posCode = typeof primaryPos === 'string' ? primaryPos : primaryPos?.code;
  const arch = getPlayerArchetype(player.strengths, player.archetypeOverride, posCode);
  if (!arch) return '';

  return `<div class="card-archetype-banner">
    <div class="card-archetype-inner">
      <div class="card-archetype-name">${arch.name}</div>
      <div class="card-archetype-cats">${arch.categories.join(' · ')}</div>
    </div>
  </div>`;
}

// ── Main buildCard ────────────────────────────────────────────

function buildCard(player, layoutId) {
  const L = getLayout(layoutId);
  const card = document.createElement('div');
  card.className = `player-card ${L.cssClass}`;


  // Partner logo: shown at bottom of contact cell
  const partnerLogoContactHTML = player.partnerLogoBase64
    ? `<div class="card-partner-in-contact">
        <span class="partner-contact-label">PARTNER</span>
        <img src="${player.partnerLogoBase64}" class="partner-contact-logo" alt="Partner Logo">
       </div>`
    : '';

  const posY = player.photoPositionY != null ? player.photoPositionY : 40;
  const photoContent = player.photoBase64
    ? `<img src="${player.photoBase64}" class="card-photo" alt="Player Photo" style="object-position: center ${posY}%">`
    : `<div class="card-photo-placeholder">
        <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="14" r="9" fill="#ccc"/>
          <path d="M4 38c0-8.8 7.2-16 16-16s16 7.2 16 16" fill="#ccc"/>
        </svg>
       </div>`;

  const tests = player.tests || {};
  // Remove sprint stats for goalkeepers
  const primaryPos = player.positions?.[0];
  const posCode = typeof primaryPos === 'string' ? primaryPos : primaryPos?.code;
  if (posCode === 'GK') {
    delete tests.sprint30mSec;
    delete tests.sprint40ydSec;
  }
  const posDisplay = buildPositionDisplay(player.positions, layoutId);
  const contact = (player.cardContact && typeof CARD_CONTACTS !== 'undefined' && CARD_CONTACTS[player.cardContact])
    ? CARD_CONTACTS[player.cardContact]
    : L.contact;
  const playerName = `${player.firstName || ''} ${player.lastName || ''}`.trim();

  card.innerHTML = `
    <!-- ── 1. HEADER ───────────────────────────────────────── -->
    <div class="card-header">
      <div class="card-header-center">
        <div class="card-program-name">${L.programName}</div>
        <div class="card-player-name-wrap">
          <div class="card-player-name">${player.firstName ? player.firstName.toUpperCase() : ''} ${player.lastName ? player.lastName.toUpperCase() : ''}</div>
        </div>
      </div>
      <div class="card-header-badge">${FCK_LOGO_IMG}</div>
    </div>

    <!-- ── 2. BIO ROW ──────────────────────────────────────── -->
    <div class="card-bio-row">
      <div class="card-photo-cell">
        <div class="card-photo-wrap">
          ${photoContent}
          <div class="card-photo-gradient"></div>
        </div>
      </div>
      <div class="card-overview-cell">
        <div class="card-section-title">${L.sections.overview}</div>
        <table class="card-info-table">
          <tr><td class="info-label">${L.labels.nationality}</td><td class="info-value">${val(player.nationality)}</td></tr>
          <tr><td class="info-label">${L.labels.passport}</td><td class="info-value">${val(player.passportCountry)}</td></tr>
          <tr><td class="info-label">${L.labels.dateOfBirth}</td><td class="info-value">${formatDate(player.dateOfBirth, L.dateLocale)}</td></tr>
          <tr><td class="info-label">${L.labels.height}</td><td class="info-value">${formatHeight(player.heightCm, L.heightFormat)}</td></tr>
          <tr><td class="info-label">${L.labels.weight}</td><td class="info-value">${formatWeight(player.weightKg, L.weightFormat)}</td></tr>
          <tr><td class="info-label">${L.labels.foot}</td><td class="info-value">${val(player.foot)}</td></tr>
        </table>
        ${posDisplay ? `<div class="card-position-display">
          <span class="info-label">${L.labels.position}</span>
          <div class="card-position-values">${posDisplay}</div>
        </div>` : ''}
      </div>
      <div class="card-contact-cell">
        <div class="card-section-title">${L.sections.contact}</div>
        <div class="card-contact-name">${contact.name}</div>
        <div class="card-contact-role">${contact.role}</div>
        <div class="card-contact-email">${contact.email}</div>
        ${contact.org.map(o => `<div class="card-contact-org">${o}</div>`).join('')}
        ${partnerLogoContactHTML}
      </div>
    </div>

    <!-- ── 3. PERFORMANCE TESTS ────────────────────────────── -->
    ${buildTestsHTML(tests, L) ? `<div class="card-section-block card-tests-block">
      <div class="card-section-title">${L.sections.tests}</div>
      ${buildTestsHTML(tests, L)}
    </div>` : ''}

    <!-- ── 5. PLAYER PROFILE ──────────────────────────────── -->
    <div class="card-section-block card-about-block">
      <div class="card-section-title">${L.sections.profile}</div>
      <div class="card-about-inner">
        <div class="card-strengths-col">
          <div class="card-col-heading">${L.sections.strengths}</div>
          ${player.strengths && player.strengths.length
            ? `<ul class="card-strengths-list">${buildStrengthBullets(player.strengths, L.id === 'german' ? 'de' : 'en').map(s =>
                `<li class="card-strength-item">${s}</li>`).join('')}</ul>`
            : '<span class="card-empty-dash">—</span>'}
        </div>
        <div class="card-style-col">
          <div class="card-col-heading">${L.sections.playingStyle}</div>
          <div class="card-about-text">${player.playingStyle
            ? player.playingStyle.replace(/\n/g, '<br>')
            : '<span class="card-empty-dash">—</span>'}</div>
        </div>
      </div>
    </div>

    <!-- ── 5b. ARCHETYPE BANNER ─────────────────────────────── -->
    ${buildArchetypeBanner(player)}

    <!-- ── 6. BOTTOM ROW ───────────────────────────────────── -->
    <div class="card-bottom-row">
      <div class="card-videos-cell">
        <div class="card-section-title">${L.sections.videos}</div>
        <div class="card-videos-content">${buildVideosHTML(player.videoUrls, playerName, L)}</div>
        ${(player.videoUrls?.[0]?.trim() || player.videoUrls?.[1]?.trim())
          ? `<div class="card-videos-hint">${L.sections.videosHint}</div>`
          : ''}
      </div>
    </div>

    <!-- ── 7. FOOTER ───────────────────────────────────────── -->
    <div class="card-footer">
      <span>${L.footerText}</span>
    </div>
  `;

  return card;
}
