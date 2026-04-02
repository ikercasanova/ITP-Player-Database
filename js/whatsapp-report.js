'use strict';

/* ═══════════════════════════════════════════════════════════════
   whatsapp-report.js — Player testing report cards for WhatsApp
   Generates downloadable PNG images (1080×1350px) per player
   showing test results vs NLZ, team median, age-group median, team best
═══════════════════════════════════════════════════════════════ */

const WhatsAppReport = {

  init() {},

  // ── Batch page ────────────────────────────────────────────────
  async show() {
    const container = document.getElementById('wa-report-content');
    container.innerHTML = '<div style="padding:20px;text-align:center;color:#888">Loading players...</div>';

    const players = (await DB.getAll()).filter(p => p.playerType !== 'trial');
    const teamStats = WhatsAppReport._calcTeamStats(players);

    container.innerHTML = `
      <div style="max-width:700px;margin:0 auto;padding:20px 16px 80px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
          <button class="btn-back" onclick="location.hash='#roster'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
          <div>
            <h2 style="margin:0;font-size:20px">Player Report Cards</h2>
            <p style="margin:2px 0 0;color:#888;font-size:13px">${players.length} players · Download PNG report cards</p>
          </div>
        </div>

        <button class="btn btn-primary" id="wa-download-all" style="width:100%;margin-bottom:20px">
          Download All Reports (${players.length})
        </button>

        <div id="wa-player-list">
          ${players.map(p => {
            const name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
            const testCount = WhatsAppReport._countTests(p);
            return `<div class="wa-player-row" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:white;border-radius:8px;margin-bottom:8px;border:1px solid rgba(0,0,0,0.06)">
              <div>
                <div style="font-weight:600;font-size:14px">${name}</div>
                <div style="font-size:12px;color:#888">${p.ageGroup || '—'} · ${testCount} tests</div>
              </div>
              <button class="btn btn-outline btn-sm wa-download-one" data-id="${p.id}" ${testCount === 0 ? 'disabled style="opacity:0.4"' : ''}>
                Download
              </button>
            </div>`;
          }).join('')}
        </div>

        <div id="wa-preview-area" style="margin-top:24px"></div>
      </div>`;

    // Bind events
    container.querySelector('#wa-download-all').addEventListener('click', async () => {
      const btn = container.querySelector('#wa-download-all');
      btn.disabled = true;
      btn.textContent = 'Generating...';
      for (const p of players) {
        if (WhatsAppReport._countTests(p) === 0) continue;
        await WhatsAppReport._generateAndDownload(p, teamStats);
        await new Promise(r => setTimeout(r, 300)); // brief delay between downloads
      }
      btn.disabled = false;
      btn.textContent = `Download All Reports (${players.length})`;
      App.toast('All reports downloaded');
    });

    container.querySelectorAll('.wa-download-one').forEach(btn => {
      btn.addEventListener('click', async () => {
        const player = players.find(p => p.id === btn.dataset.id);
        if (!player) return;
        btn.textContent = '...';
        await WhatsAppReport._generateAndDownload(player, teamStats);
        btn.textContent = 'Download';
        App.toast('Report downloaded');
      });
    });
  },

  // ── Single player (from profile) ──────────────────────────────
  async showForPlayer(playerId) {
    const player = await DB.get(playerId);
    if (!player) return;
    const players = (await DB.getAll()).filter(p => p.playerType !== 'trial');
    const teamStats = WhatsAppReport._calcTeamStats(players);
    await WhatsAppReport._generateAndDownload(player, teamStats);
    App.toast('Report downloaded');
  },

  // ── Generate card + download PNG ──────────────────────────────
  async _generateAndDownload(player, teamStats) {
    // Load html2canvas
    if (!window.html2canvas) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    const cardEl = WhatsAppReport._buildCard(player, teamStats);

    // Render in a wrapper div appended to the active view — normal document flow
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;overflow:visible;';
    wrapper.appendChild(cardEl);

    const previewArea = document.getElementById('wa-report-content') || document.body;
    previewArea.appendChild(wrapper);
    cardEl.scrollIntoView({ block: 'start' });
    await new Promise(r => setTimeout(r, 400));

    const canvas = await html2canvas(cardEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#111111',
      scrollY: -window.scrollY,
    });

    wrapper.remove();

    // Download PNG
    const lastName = (player.lastName || 'Player').replace(/\s+/g, '_');
    const firstName = (player.firstName || '').replace(/\s+/g, '_');
    const filename = `${firstName}_${lastName}_Report.png`;

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  // ── Build card HTML element ───────────────────────────────────
  _buildCard(player, teamStats) {
    const card = document.createElement('div');
    const name = `${player.firstName || ''} ${player.lastName || ''}`.trim().toUpperCase();
    const ag = player.ageGroup || '';
    const pos = (player.positions || []).map(p => typeof p === 'string' ? p : p.code).join(' / ');

    // Collect tests with data — skip redundant/transitional tests for a clean card
    const skipTests = new Set(['sprint20m', 'sprint10m', 'ift3015']);
    // Tests that are internal-only (no German academy comparison)
    const internalOnly = new Set(['passingAcc', 'dribbling']);
    const testRows = [];
    for (const [testKey, def] of Object.entries(TEST_DEFS)) {
      if (skipTests.has(testKey)) continue;
      const t = player.tests?.[testKey];
      if (!t || t.best == null) continue;
      const val = t.best;
      const stats = teamStats[testKey];
      const eval_ = Benchmarks.evaluate(ag, testKey, val);
      const nlzAvg = internalOnly.has(testKey) ? null : (DEFAULT_BENCHMARKS[ag]?.[testKey]?.average ?? null);
      const isInternal = internalOnly.has(testKey);

      testRows.push({ testKey, def, val, eval_, stats, nlzAvg, isInternal });
    }

    // Max speed
    const maxSpeed = Profile._calcMaxSpeed(player.tests);

    // Colors
    const levelColors = { poor: '#E53E3E', average: '#ED8936', good: '#38A169', elite: '#3182CE', none: '#666' };
    const levelLabels = { poor: 'POOR', average: 'AVG', good: 'GOOD', elite: 'ELITE', none: '—' };

    // Build test rows HTML
    const rowsHTML = testRows.map(({ testKey, def, val, eval_, stats, nlzAvg, isInternal }) => {
      const color = levelColors[eval_.level] || '#666';
      const label = levelLabels[eval_.level] || '—';
      let pct = Math.max(5, Math.min(100, eval_.pct));
      const displayVal = val < 10 ? val.toFixed(2) : val;
      const agMedian = stats?.ageGroupMedian?.[ag];

      const formatV = v => {
        if (v == null) return '—';
        return v < 10 ? v.toFixed(2) : Math.round(v * 10) / 10;
      };

      // For tests without NLZ thresholds, use team min-max range to position values
      const hasThresholds = !!Benchmarks.getThresholds(ag, testKey);
      const toPct = (v) => {
        if (hasThresholds) {
          return Benchmarks.evaluate(ag, testKey, v).pct;
        }
        // Fallback: position relative to team min-max range with padding
        const min = stats?.teamMin;
        const max = stats?.teamMax;
        if (min == null || max == null || max === min) return 50;
        // Add 20% padding on each side so values don't crowd the edges
        const range = max - min;
        const paddedMin = min - range * 0.2;
        const paddedMax = max + range * 0.2;
        const raw = def.lowerIsBetter
          ? 100 * (paddedMax - v) / (paddedMax - paddedMin)
          : 100 * (v - paddedMin) / (paddedMax - paddedMin);
        return Math.max(10, Math.min(90, raw));
      };

      // Recalculate player bar position for tests without standard thresholds
      if (!hasThresholds) pct = Math.max(5, Math.min(100, toPct(val)));

      // Build tick markers — above-bar markers and below-bar markers to avoid crowding
      const aboveMarkers = [];
      const belowMarkers = [];
      if (nlzAvg != null) {
        aboveMarkers.push({ pct: Math.max(2, Math.min(98, toPct(nlzAvg))), label: 'German Academy Avg', val: formatV(nlzAvg), color: '#E3000F', style: 'dashed' });
      }
      if (stats?.teamMedian != null) {
        aboveMarkers.push({ pct: Math.max(2, Math.min(98, toPct(stats.teamMedian))), label: 'ITP 25/26 Median', val: formatV(stats.teamMedian), color: '#999', style: 'solid' });
      }
      if (agMedian != null) {
        belowMarkers.push({ pct: Math.max(2, Math.min(98, toPct(agMedian))), label: `${ag} ITP Median`, val: formatV(agMedian), color: '#ccc', style: 'dotted' });
      }

      // When two above markers are very close, stack them vertically instead of overlapping
      let aboveStacked = false;
      if (aboveMarkers.length === 2) {
        // Ensure correct ordering: lower pct first
        if (aboveMarkers[0].pct > aboveMarkers[1].pct) {
          [aboveMarkers[0], aboveMarkers[1]] = [aboveMarkers[1], aboveMarkers[0]];
        }
        if (Math.abs(aboveMarkers[0].pct - aboveMarkers[1].pct) < 15) {
          aboveStacked = true;
        }
      }

      const aboveHTML = aboveStacked
        ? aboveMarkers.map((m, i) => `
        <div style="position:absolute;left:${m.pct}%;bottom:100%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center">
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:11px;color:${m.color};white-space:nowrap;margin-bottom:${i === 0 ? '16px' : '2px'}">${m.label}: ${m.val}</span>
          <div style="width:0;height:${i === 0 ? '24px' : '10px'};border-left:2px ${m.style} ${m.color}"></div>
        </div>`).join('')
        : aboveMarkers.map(m => `
        <div style="position:absolute;left:${m.pct}%;bottom:100%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center">
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:11px;color:${m.color};white-space:nowrap;margin-bottom:2px">${m.label}: ${m.val}</span>
          <div style="width:0;height:10px;border-left:2px ${m.style} ${m.color}"></div>
        </div>`).join('');

      const belowHTML = belowMarkers.map(m => `
        <div style="position:absolute;left:${m.pct}%;top:100%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center">
          <div style="width:0;height:10px;border-left:2px ${m.style} ${m.color}"></div>
          <span style="font-family:'Barlow Condensed',sans-serif;font-size:11px;color:${m.color};white-space:nowrap;margin-top:2px">${m.label}: ${m.val}</span>
        </div>`).join('');

      return `
        <div style="margin-bottom:24px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;color:#fff;letter-spacing:1px">${def.name.toUpperCase()}</span>
            <div style="display:flex;align-items:baseline;gap:8px">
              <span style="font-family:'Barlow Condensed',sans-serif;font-size:11px;color:#666;letter-spacing:0.5px">PERSONAL BEST</span>
              <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:26px;color:#fff">${displayVal}</span>
              <span style="font-size:13px;color:#999">${def.unit}</span>
            </div>
          </div>
          <div style="margin:${aboveStacked ? '42px' : '28px'} 0 28px">
            <div style="position:relative;height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:visible">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:4px"></div>
              ${aboveHTML}
              ${belowHTML}
            </div>
          </div>
        </div>`;
    }).join('');

    // Max speed row
    const maxSpeedHTML = maxSpeed ? `
      <div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
          <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:20px;color:#fff;letter-spacing:1px">MAX SPEED</span>
          <div style="display:flex;align-items:baseline;gap:6px">
            <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:26px;color:#3182CE">${maxSpeed}</span>
            <span style="font-size:13px;color:#999">km/h</span>
          </div>
        </div>
        <div style="font-size:12px;color:#666;font-style:italic">Calculated from fastest sprint segment</div>
      </div>` : '';

    card.style.cssText = `
      width:1080px;background:#111;color:#fff;
      font-family:'Barlow',sans-serif;
      box-sizing:border-box;
    `;

    card.innerHTML = `
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#111 0%,#2a0005 50%,#E3000F 100%);padding:40px 48px 32px">
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:16px;color:rgba(255,255,255,0.6);letter-spacing:3px;margin-bottom:16px">1. FC KÖLN — INTERNATIONAL TALENT PATHWAY</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:48px;color:#fff;line-height:1.1">${name}</div>
        <div style="font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:20px;color:rgba(255,255,255,0.7);margin-top:8px">${ag}${pos ? ' · ' + pos : ''}</div>
      </div>

      <!-- Explanation -->
      <div style="padding:24px 48px 0;border-top:1px solid rgba(255,255,255,0.08)">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:14px;color:#888;line-height:1.5">
          Your <span style="color:#fff;font-weight:600">personal best</span> scores are shown as the filled bar. Comparison markers show the <span style="color:#E3000F">German Academy average</span>, the <span style="color:#999">ITP 2025/26 team median</span>, and your <span style="color:#ccc">age group ITP median</span>.
        </div>
      </div>

      <!-- Test rows -->
      <div style="padding:24px 48px 36px">
        ${rowsHTML}
        ${maxSpeedHTML}
      </div>

      <!-- Footer -->
      <div style="padding:20px 48px;background:rgba(255,255,255,0.03);border-top:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:600;font-size:13px;color:#666;letter-spacing:2px">PERFORMANCE TESTING REPORT · 2025-26</span>
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:13px;color:#E3000F;letter-spacing:1px">FC KÖLN ITP</span>
      </div>
    `;

    return card;
  },

  // ── Compute team stats ────────────────────────────────────────
  _calcTeamStats(players) {
    const stats = {};

    for (const [testKey, def] of Object.entries(TEST_DEFS)) {
      const allValues = [];
      const byAgeGroup = {};

      for (const p of players) {
        const best = p.tests?.[testKey]?.best;
        if (best == null) continue;
        allValues.push(best);
        const ag = p.ageGroup || 'unknown';
        if (!byAgeGroup[ag]) byAgeGroup[ag] = [];
        byAgeGroup[ag].push(best);
      }

      if (allValues.length === 0) {
        stats[testKey] = { teamMedian: null, teamBest: null, ageGroupMedian: {} };
        continue;
      }

      const median = arr => {
        const s = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
      };

      const teamBest = def.lowerIsBetter ? Math.min(...allValues) : Math.max(...allValues);
      const ageGroupMedian = {};
      for (const [ag, vals] of Object.entries(byAgeGroup)) {
        ageGroupMedian[ag] = median(vals);
      }

      stats[testKey] = {
        teamMedian: median(allValues),
        teamBest,
        teamMin: Math.min(...allValues),
        teamMax: Math.max(...allValues),
        ageGroupMedian,
      };
    }

    return stats;
  },

  _countTests(player) {
    if (!player.tests) return 0;
    return Object.values(player.tests).filter(t => t && t.best != null).length;
  },
};
