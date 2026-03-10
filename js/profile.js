'use strict';

/* ═══════════════════════════════════════════════════════════════
   profile.js — Player detail page with benchmark visualizations
═══════════════════════════════════════════════════════════════ */

const Profile = {

  // Level colors for SVG (matching CSS --bench-* variables)
  LEVEL_COLORS: {
    poor:    '#E53E3E',
    average: '#ED8936',
    good:    '#38A169',
    elite:   '#3182CE',
    none:    '#999999'
  },

  init() {},

  /** Current view mode for benchmarks: 'charts' or 'numbers' */
  _benchView: 'charts',

  show(playerId) {
    const player = DB.get(playerId);
    if (!player) {
      location.hash = '#roster';
      return;
    }

    const container = document.getElementById('profile-content');
    container.innerHTML = Profile.render(player);

    // Expand/collapse attempts
    container.querySelectorAll('.bench-expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.parentElement.querySelector('.bench-attempts');
        if (target) {
          target.classList.toggle('open');
          btn.textContent = target.classList.contains('open') ? 'Hide attempts' : 'Show attempts';
        }
      });
    });

    // Bench view toggle
    Profile._initBenchToggle(player);
  },

  render(player) {
    const age = App.computeAge(player.dateOfBirth);
    const heightFt = App.cmToFeetInches(player.heightCm);
    const weightLbs = App.kgToLbs(player.weightKg);

    // Photo header
    const photoCSS = player.photoBase64
      ? `<img class="profile-header-photo" src="${player.photoBase64}" alt="">`
      : '';

    // Position pills
    const positions = (player.positions || []).map((p, i) => {
      const code = typeof p === 'string' ? p : p.code;
      return `<span class="pos-badge ${i === 0 ? 'pos-badge-primary' : 'pos-badge-secondary'}">${code}</span>`;
    }).join(' ');

    // Quick info pills
    const pills = [];
    if (age) pills.push(`<span class="info-pill"><span class="info-pill-label">Age</span> ${age}</span>`);
    if (positions) pills.push(`<span class="info-pill"><span class="info-pill-label">Pos</span> ${positions}</span>`);
    if (player.foot) pills.push(`<span class="info-pill"><span class="info-pill-label">Foot</span> ${player.foot}</span>`);
    if (player.nationality) pills.push(`<span class="info-pill"><span class="info-pill-label">Nat</span> ${player.nationality}</span>`);

    // Body composition
    const bodyComp = [];
    if (player.heightCm) {
      bodyComp.push({ value: `${player.heightCm} cm`, sub: heightFt, label: 'Height' });
    }
    if (player.weightKg) {
      bodyComp.push({ value: `${player.weightKg} kg`, sub: weightLbs ? `${weightLbs} lbs` : '', label: 'Weight' });
    }
    if (player.bodyFatPct) {
      bodyComp.push({ value: `${player.bodyFatPct}%`, sub: '', label: 'Body Fat' });
    }
    if (player.bmi) {
      bodyComp.push({ value: player.bmi.toFixed(1), sub: '', label: 'BMI' });
    }
    if (player.muscleRatePct) {
      bodyComp.push({ value: `${player.muscleRatePct}%`, sub: '', label: 'Muscle Rate' });
    }

    const bodyCompHTML = bodyComp.length > 0
      ? `<div class="profile-section">
           <div class="profile-section-title">Body Composition</div>
           <div class="body-comp-grid">
             ${bodyComp.map(bc => `
               <div class="body-comp-item">
                 <div class="body-comp-value">${bc.value}</div>
                 ${bc.sub ? `<div class="body-comp-sub">${bc.sub}</div>` : ''}
                 <div class="body-comp-label">${bc.label}</div>
               </div>`).join('')}
           </div>
         </div>`
      : '';

    // Physical tests grouped by category
    const testsHTML = Profile.renderBenchmarks(player);

    // Videos
    const videos = [];
    if (player.highlightUrl) videos.push({ label: 'Highlight Reel', url: player.highlightUrl });
    if (player.fullGameUrl) videos.push({ label: 'Full Game', url: player.fullGameUrl });

    const videosHTML = videos.length > 0
      ? `<div class="profile-section">
           <div class="profile-section-title">Videos</div>
           ${videos.map(v => `
             <a href="${v.url}" target="_blank" rel="noopener" class="video-link">
               <div class="video-link-icon">
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg>
               </div>
               <div>
                 <div class="video-link-label">${v.label}</div>
                 <div class="video-link-url">${v.url}</div>
               </div>
             </a>`).join('')}
         </div>`
      : '';

    return `
      <div class="profile-page">
        <div class="back-row">
          <button class="btn-back" onclick="location.hash='#roster'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Roster
          </button>
        </div>

        <div class="profile-header">
          ${photoCSS}
          <div class="profile-header-info">
            <div class="profile-name">${player.firstName}<br>${player.lastName}</div>
            ${player.ageGroup ? `<span class="profile-age-group">${player.ageGroup}</span>` : ''}
          </div>
        </div>

        <div class="profile-body">
          <div class="profile-section">
            <div class="quick-info">${pills.join('')}</div>
          </div>

          ${bodyCompHTML}

          ${testsHTML}

          ${videosHTML}
        </div>

        <div class="profile-actions">
          <button class="btn btn-outline" onclick="location.hash='#edit/${player.id}'">Edit Player</button>
          <button class="btn btn-danger" onclick="App.confirmDelete(DB.get('${player.id}'), () => { App.toast('Player deleted'); location.hash='#roster'; })">Delete</button>
        </div>
      </div>`;
  },

  // ── Delta Computation Helper ──────────────────────────────

  computeDelta(latest, previous, def) {
    if (!latest || !previous || latest.best === null || previous.best === null) return '';
    const diff = latest.best - previous.best;
    const absDiff = Math.abs(diff);
    const formatted = absDiff < 1 ? absDiff.toFixed(2) : absDiff.toFixed(1);
    let cls, sign;
    if (def.lowerIsBetter) {
      if (diff < -0.001) { cls = 'delta-up'; sign = '-'; }
      else if (diff > 0.001) { cls = 'delta-down'; sign = '+'; }
      else { cls = 'delta-same'; sign = ''; }
    } else {
      if (diff > 0.001) { cls = 'delta-up'; sign = '+'; }
      else if (diff < -0.001) { cls = 'delta-down'; sign = '-'; }
      else { cls = 'delta-same'; sign = ''; }
    }
    return `<span class="delta-badge ${cls}">${sign}${formatted}</span>`;
  },

  // ── SVG Progression Chart ─────────────────────────────────

  renderProgressionChart(player, testKey, width, height, opts) {
    opts = opts || {};
    const isSparkline = opts.sparkline || false;

    const testData = player.tests?.[testKey];
    const sessions = testData?.sessions || [];
    const points = sessions
      .filter(s => s.best !== null && s.best !== undefined)
      .map(s => ({ date: s.date, value: Number(s.best) }));

    if (points.length === 0) return '';

    // Taller chart height for non-sparkline
    if (!isSparkline && height <= 140) height = 170;

    const def = TEST_DEFS[testKey];
    const thresh = Benchmarks.getThresholds(player.ageGroup, testKey);
    const colors = Profile.LEVEL_COLORS;

    // Month abbreviations for date formatting
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Padding — more right padding for zone labels
    const padLeft = isSparkline ? 8 : 34;
    const padRight = isSparkline ? 8 : (thresh ? 42 : 20);
    const padTop = isSparkline ? 8 : 24;
    const padBottom = isSparkline ? 20 : 28;

    const plotLeft = padLeft;
    const plotRight = width - padRight;
    const plotTop = padTop;
    const plotBottom = height - padBottom;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    // Y-axis range — include both data and benchmark thresholds
    const dataValues = points.map(p => p.value);
    let yMin, yMax;
    if (thresh) {
      const allVals = [...dataValues, thresh.poor, thresh.average, thresh.good, thresh.elite];
      yMin = Math.min(...allVals);
      yMax = Math.max(...allVals);
    } else {
      yMin = Math.min(...dataValues);
      yMax = Math.max(...dataValues);
    }
    // Add 5% margin
    const range = yMax - yMin || 1;
    yMin -= range * 0.05;
    yMax += range * 0.05;

    // Value-to-Y mapping
    const valueToY = (v) => {
      if (def.lowerIsBetter) {
        return plotTop + ((v - yMin) / (yMax - yMin)) * plotHeight;
      }
      return plotBottom - ((v - yMin) / (yMax - yMin)) * plotHeight;
    };

    // X positions — evenly spaced
    const xPositions = points.map((_, i) => {
      if (points.length === 1) return plotLeft + plotWidth / 2;
      return plotLeft + (i / (points.length - 1)) * plotWidth;
    });

    // Generate unique gradient ID
    const gradId = `area-grad-${testKey}-${Math.random().toString(36).slice(2, 6)}`;

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">`;

    // Gradient definition for area fill
    if (!isSparkline) {
      svg += `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#333" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#333" stop-opacity="0.01"/>
      </linearGradient></defs>`;
    }

    // Background
    svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#FAFAFA" rx="4"/>`;

    // Benchmark zone bands
    if (thresh) {
      const levels = [
        { key: 'elite', label: 'Elite', color: colors.elite },
        { key: 'good', label: 'Good', color: colors.good },
        { key: 'average', label: 'Avg', color: colors.average },
        { key: 'poor', label: 'Poor', color: colors.poor }
      ];

      const bandEdges = [
        plotTop,
        valueToY(thresh.elite),
        valueToY(thresh.good),
        valueToY(thresh.average),
        plotBottom
      ];

      for (let i = 0; i < 4; i++) {
        const y1 = Math.min(bandEdges[i], bandEdges[i + 1]);
        const y2 = Math.max(bandEdges[i], bandEdges[i + 1]);
        const h = y2 - y1;
        if (h > 0) {
          svg += `<rect x="${plotLeft}" y="${y1}" width="${plotWidth}" height="${h}" fill="${levels[i].color}" opacity="0.10"/>`;
        }

        // Zone labels on right edge (non-sparkline only)
        if (!isSparkline && h > 12) {
          const labelY = y1 + h / 2 + 3;
          svg += `<text x="${plotRight + 6}" y="${labelY.toFixed(1)}" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="8" fill="${levels[i].color}" opacity="0.7">${levels[i].label}</text>`;
        }
      }
    }

    // Grid line at each data point's X
    if (!isSparkline && points.length > 1) {
      for (let i = 0; i < points.length; i++) {
        const x = xPositions[i];
        svg += `<line x1="${x}" y1="${plotTop}" x2="${x}" y2="${plotBottom}" stroke="#E0E0E0" stroke-width="0.5"/>`;
      }
    }

    // Area fill under line (non-sparkline, multiple points)
    if (!isSparkline && points.length > 1) {
      const areaPoints = points.map((p, i) => `${xPositions[i].toFixed(1)},${valueToY(p.value).toFixed(1)}`);
      const areaPath = `M${xPositions[0].toFixed(1)},${plotBottom} L${areaPoints.join(' L')} L${xPositions[xPositions.length - 1].toFixed(1)},${plotBottom} Z`;
      svg += `<path d="${areaPath}" fill="url(#${gradId})"/>`;
    }

    // Data line
    if (points.length > 1) {
      const linePoints = points.map((p, i) => `${xPositions[i].toFixed(1)},${valueToY(p.value).toFixed(1)}`).join(' ');
      svg += `<polyline points="${linePoints}" fill="none" stroke="#333" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }

    // Data dots + labels
    for (let i = 0; i < points.length; i++) {
      const x = xPositions[i];
      const y = valueToY(points[i].value);
      const { level } = Benchmarks.evaluate(player.ageGroup, testKey, points[i].value);
      const dotColor = colors[level] || colors.none;

      // Larger dots (5px) with stronger stroke
      svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isSparkline ? 3 : 5}" fill="${dotColor}" stroke="white" stroke-width="2"/>`;

      // Value label (skip for sparklines)
      if (!isSparkline) {
        const labelY = y < plotTop + 18 ? y + 16 : y - 10;
        svg += `<text x="${x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="11" font-family="Barlow Condensed, sans-serif" font-weight="700" fill="#333">${points[i].value}</text>`;
      }

      // Delta annotation on latest data point (non-sparkline, 2+ points)
      if (!isSparkline && i === points.length - 1 && points.length >= 2) {
        const prev = points[i - 1].value;
        const curr = points[i].value;
        const diff = curr - prev;
        if (Math.abs(diff) > 0.001) {
          const improved = def.lowerIsBetter ? diff < 0 : diff > 0;
          const sign = diff > 0 ? '+' : '';
          const deltaText = sign + (Math.abs(diff) < 1 ? diff.toFixed(2) : diff.toFixed(1));
          const dColor = improved ? '#38A169' : '#E53E3E';
          const dBg = improved ? 'rgba(56,161,105,0.15)' : 'rgba(229,62,62,0.15)';
          const dw = deltaText.length * 6.5 + 10;
          const dy = y < plotTop + 30 ? y + 24 : y - 22;
          svg += `<rect x="${(x - dw / 2).toFixed(1)}" y="${(dy - 9).toFixed(1)}" width="${dw}" height="15" fill="${dBg}" rx="3"/>`;
          svg += `<text x="${x.toFixed(1)}" y="${(dy + 2).toFixed(1)}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="9" fill="${dColor}">${deltaText}</text>`;
        }
      }

      // Date label — month abbreviation format
      if (!isSparkline || i === 0 || i === points.length - 1) {
        const dateStr = points[i].date;
        const parts = dateStr.split('-');
        let dateLabel;
        if (parts.length >= 3) {
          const monthIdx = parseInt(parts[1], 10) - 1;
          dateLabel = `${MONTHS[monthIdx]} ${parseInt(parts[2], 10)}`;
        } else {
          dateLabel = dateStr;
        }
        svg += `<text x="${x.toFixed(1)}" y="${plotBottom + (isSparkline ? 12 : 16)}" text-anchor="middle" font-size="${isSparkline ? 8 : 9}" font-family="Barlow, sans-serif" fill="#888">${dateLabel}</text>`;
      }
    }

    svg += '</svg>';
    return `<div class="progression-chart">${svg}</div>`;
  },

  // ── Speed Grouped Bar Chart (by distance) ───────────────

  renderSpeedBars(player, speedTestKeys) {
    const colors = Profile.LEVEL_COLORS;

    const hasAny = speedTestKeys.some(tk => {
      const td = player.tests?.[tk];
      return td && td.best !== null && td.best !== undefined;
    });
    if (!hasAny) return '';

    // Collect all session dates across all sprint tests
    const sessionDates = new Set();
    for (const tk of speedTestKeys) {
      const sessions = player.tests?.[tk]?.sessions || [];
      for (const s of sessions) {
        if (s.best !== null && s.best !== undefined) sessionDates.add(s.date);
      }
    }
    const sortedDates = [...sessionDates].sort((a, b) => b.localeCompare(a)); // newest first
    if (sortedDates.length === 0) return '';

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtDate = (iso) => {
      const [y, m, d] = iso.split('-');
      return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
    };

    // Badge color map
    const badgeColors = {
      poor: { bg: 'rgba(229,62,62,0.12)', fg: '#E53E3E' },
      average: { bg: 'rgba(237,137,54,0.12)', fg: '#ED8936' },
      good: { bg: 'rgba(56,161,105,0.12)', fg: '#38A169' },
      elite: { bg: 'rgba(49,130,206,0.12)', fg: '#3182CE' },
      none: { bg: '#F0F0F0', fg: '#999' }
    };

    // Filter to tests that have data
    const activeTests = speedTestKeys.filter(tk => {
      const td = player.tests?.[tk];
      return td && td.sessions && td.sessions.some(s => s.best != null);
    });

    // ── Layout constants ──
    const svgW = 760;
    const labelW = 90;       // distance name on left
    const annotW = 130;      // value + badge + delta on right
    const stripW = svgW - labelW - annotW; // zone strip width
    const stripH = 52;       // zone strip height
    const dateLabelH = 14;   // space for date labels below strip
    const stripSpacing = 18; // gap between strips
    const stripTotal = stripH + dateLabelH + stripSpacing;
    const padTop = 12;
    const padBottom = 8;

    const svgH = padTop + activeTests.length * stripTotal - stripSpacing + padBottom;

    let svg = `<svg viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">`;
    svg += `<rect x="0" y="0" width="${svgW}" height="${svgH}" fill="#FAFAFA" rx="6"/>`;

    for (let ti = 0; ti < activeTests.length; ti++) {
      const tk = activeTests[ti];
      const def = TEST_DEFS[tk];
      const thresh = Benchmarks.getThresholds(player.ageGroup, tk);

      // Collect session data points for this test (oldest → newest for line drawing)
      const sessions = player.tests?.[tk]?.sessions || [];
      const points = sortedDates
        .map(date => {
          const s = sessions.find(s => s.date === date);
          return s?.best != null ? { date, value: Number(s.best) } : null;
        })
        .filter(Boolean)
        .reverse(); // oldest first for line drawing

      if (points.length === 0) continue;

      const stripY = padTop + ti * stripTotal;
      const stripX = labelW;
      const stripCY = stripY + stripH / 2;

      // Separator line between strips
      if (ti > 0) {
        const sepY = stripY - stripSpacing / 2;
        svg += `<line x1="12" y1="${sepY.toFixed(1)}" x2="${svgW - 12}" y2="${sepY.toFixed(1)}" stroke="#E8E8E8" stroke-width="1"/>`;
      }

      // ── Distance label (left) ──
      svg += `<text x="8" y="${(stripCY + 4).toFixed(1)}" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="13" fill="#333" letter-spacing="0.3">${def.name}</text>`;

      // ── Compute axis range ──
      // For lowerIsBetter (sprints): elite (fast) on LEFT, poor (slow) on RIGHT
      const allValues = points.map(p => p.value);
      let axisMin, axisMax; // min = left edge (fast), max = right edge (slow)

      if (thresh) {
        axisMin = thresh.elite;
        axisMax = thresh.poor;
        // Extend to include any data values beyond range
        const dataMin = Math.min(...allValues);
        const dataMax = Math.max(...allValues);
        if (dataMin < axisMin) axisMin = dataMin;
        if (dataMax > axisMax) axisMax = dataMax;
        // Add 8% margin on each side
        const range = axisMax - axisMin || 0.1;
        axisMin -= range * 0.08;
        axisMax += range * 0.08;
      } else {
        // No thresholds — just use data range
        axisMin = Math.min(...allValues);
        axisMax = Math.max(...allValues);
        const range = axisMax - axisMin || 0.1;
        axisMin -= range * 0.15;
        axisMax += range * 0.15;
      }

      // Map time value to X position within strip (fast=left, slow=right)
      const valueToX = (val) => {
        const norm = (val - axisMin) / (axisMax - axisMin);
        return stripX + norm * stripW;
      };

      // ── Zone background rects ──
      if (thresh) {
        const zones = [
          { key: 'elite',   from: axisMin,       to: thresh.elite,   color: colors.elite,   label: 'ELITE' },
          { key: 'good',    from: thresh.elite,   to: thresh.good,    color: colors.good,    label: 'GOOD' },
          { key: 'average', from: thresh.good,    to: thresh.average, color: colors.average,  label: 'AVG' },
          { key: 'poor',    from: thresh.average, to: axisMax,        color: colors.poor,    label: 'POOR' },
        ];

        for (const zone of zones) {
          const x1 = valueToX(zone.from);
          const x2 = valueToX(zone.to);
          const zx = Math.min(x1, x2);
          const zw = Math.abs(x2 - x1);
          if (zw < 0.5) continue;

          // Zone background
          svg += `<rect x="${zx.toFixed(1)}" y="${stripY}" width="${zw.toFixed(1)}" height="${stripH}" fill="${zone.color}" opacity="0.10"/>`;

          // Zone label centered
          if (zw > 28) {
            const labelX = zx + zw / 2;
            svg += `<text x="${labelX.toFixed(1)}" y="${(stripCY + 3).toFixed(1)}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="9" fill="${zone.color}" opacity="0.55" letter-spacing="0.5">${zone.label}</text>`;
          }
        }

        // Threshold boundary lines + value labels
        const boundaries = [
          { val: thresh.elite,   label: thresh.elite.toFixed(2) },
          { val: thresh.good,    label: thresh.good.toFixed(2) },
          { val: thresh.average, label: thresh.average.toFixed(2) },
        ];
        for (const b of boundaries) {
          const bx = valueToX(b.val);
          if (bx > stripX + 2 && bx < stripX + stripW - 2) {
            svg += `<line x1="${bx.toFixed(1)}" y1="${stripY}" x2="${bx.toFixed(1)}" y2="${(stripY + stripH).toFixed(1)}" stroke="#CCC" stroke-width="0.8" stroke-dasharray="3,2"/>`;
            svg += `<text x="${bx.toFixed(1)}" y="${(stripY - 2).toFixed(1)}" text-anchor="middle" font-family="Barlow, sans-serif" font-size="7.5" fill="#BBB">${b.label}</text>`;
          }
        }
      } else {
        // No thresholds — plain gray strip
        svg += `<rect x="${stripX}" y="${stripY}" width="${stripW}" height="${stripH}" fill="#F0F0F0" rx="3"/>`;
      }

      // Strip border outline
      svg += `<rect x="${stripX}" y="${stripY}" width="${stripW}" height="${stripH}" fill="none" stroke="#E0E0E0" stroke-width="0.5" rx="3"/>`;

      // ── Connecting line between dots ──
      if (points.length >= 2) {
        const linePoints = points.map(p => {
          const px = valueToX(p.value);
          return `${px.toFixed(1)},${stripCY.toFixed(1)}`;
        }).join(' ');
        svg += `<polyline points="${linePoints}" fill="none" stroke="#CCCCCC" stroke-width="1.5" stroke-linecap="round"/>`;
      }

      // ── Session dots ──
      const latest = points[points.length - 1]; // newest
      for (let pi = 0; pi < points.length; pi++) {
        const p = points[pi];
        const px = valueToX(p.value);
        const isLatest = pi === points.length - 1;
        const { level } = Benchmarks.evaluate(player.ageGroup, tk, p.value);

        if (isLatest) {
          // Latest dot: larger, colored, white stroke
          const dotColor = colors[level] || colors.none;
          svg += `<circle cx="${px.toFixed(1)}" cy="${stripCY.toFixed(1)}" r="7" fill="${dotColor}" stroke="white" stroke-width="2.5"/>`;
          // Value label above dot
          svg += `<text x="${px.toFixed(1)}" y="${(stripY + 9).toFixed(1)}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="10" fill="#333">${p.value}s</text>`;
        } else {
          // Older dot: smaller, gray
          svg += `<circle cx="${px.toFixed(1)}" cy="${stripCY.toFixed(1)}" r="5" fill="#BBB" stroke="white" stroke-width="1.5"/>`;
          // Value label above dot
          svg += `<text x="${px.toFixed(1)}" y="${(stripY + 9).toFixed(1)}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="500" font-size="9" fill="#999">${p.value}s</text>`;
        }

        // Date label below strip
        svg += `<text x="${px.toFixed(1)}" y="${(stripY + stripH + 11).toFixed(1)}" text-anchor="middle" font-family="Barlow, sans-serif" font-weight="${isLatest ? '600' : '400'}" font-size="9" fill="${isLatest ? '#555' : '#AAA'}">${fmtDate(p.date)}</text>`;
      }

      // ── Directional arrow near latest dot (if 2+ sessions) ──
      if (points.length >= 2) {
        const prev = points[points.length - 2];
        const latestX = valueToX(latest.value);
        const prevX = valueToX(prev.value);
        const diff = latest.value - prev.value;
        const improved = diff < 0; // lower is better for sprints
        const arrowColor = improved ? '#38A169' : '#E53E3E';

        // Arrow pointing in direction of movement (left = faster = improved)
        const arrowDir = latestX < prevX ? -1 : 1; // -1 = pointing left
        const arrowBaseX = latestX + arrowDir * 12;
        const arrowTipX = arrowBaseX + arrowDir * 7;
        const aCY = stripCY;

        svg += `<line x1="${arrowBaseX.toFixed(1)}" y1="${aCY.toFixed(1)}" x2="${arrowTipX.toFixed(1)}" y2="${aCY.toFixed(1)}" stroke="${arrowColor}" stroke-width="2" stroke-linecap="round"/>`;
        svg += `<polyline points="${(arrowTipX - arrowDir * 3).toFixed(1)},${(aCY - 3).toFixed(1)} ${arrowTipX.toFixed(1)},${aCY.toFixed(1)} ${(arrowTipX - arrowDir * 3).toFixed(1)},${(aCY + 3).toFixed(1)}" fill="none" stroke="${arrowColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      }

      // ── Right-side annotations ──
      const annotX = stripX + stripW + 10;
      const { level: latestLevel } = Benchmarks.evaluate(player.ageGroup, tk, latest.value);

      // Latest value (large)
      svg += `<text x="${annotX}" y="${(stripCY - 6).toFixed(1)}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="16" fill="#333">${latest.value} <tspan font-weight="400" fill="#AAA" font-size="11">s</tspan></text>`;

      // Level badge
      const bc = badgeColors[latestLevel] || badgeColors.none;
      const levelText = latestLevel === 'none' ? '—' : latestLevel.toUpperCase();
      const bw = levelText.length * 6.5 + 10;
      svg += `<rect x="${annotX}" y="${(stripCY + 2).toFixed(1)}" width="${bw.toFixed(1)}" height="15" fill="${bc.bg}" rx="3"/>`;
      svg += `<text x="${(annotX + bw / 2).toFixed(1)}" y="${(stripCY + 12).toFixed(1)}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="9" fill="${bc.fg}" letter-spacing="0.3">${levelText}</text>`;

      // Delta badge (if 2+ sessions)
      if (points.length >= 2) {
        const prev = points[points.length - 2];
        const diff = latest.value - prev.value;
        if (Math.abs(diff) > 0.001) {
          const improved = diff < 0;
          const deltaText = (improved ? '' : '+') + diff.toFixed(2);
          const dc = improved
            ? { bg: 'rgba(56,161,105,0.12)', fg: '#38A169' }
            : { bg: 'rgba(229,62,62,0.12)', fg: '#E53E3E' };
          const dw = deltaText.length * 6 + 10;
          const dx = annotX + bw + 4;
          svg += `<rect x="${dx.toFixed(1)}" y="${(stripCY + 2).toFixed(1)}" width="${dw.toFixed(1)}" height="15" fill="${dc.bg}" rx="3"/>`;
          svg += `<text x="${(dx + dw / 2).toFixed(1)}" y="${(stripCY + 12).toFixed(1)}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="9" fill="${dc.fg}">${deltaText}</text>`;
        }
      }
    }

    svg += '</svg>';
    return `<div class="speed-profile-card"><div class="speed-session-card">${svg}</div></div>`;
  },

  // ── Bench View Toggle ────────────────────────────────────

  _initBenchToggle(player) {
    const container = document.getElementById('profile-content');
    const toggleBtns = container.querySelectorAll('.bench-toggle-btn');
    if (!toggleBtns.length) return;

    toggleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode === Profile._benchView) return;
        Profile._benchView = mode;

        // Update active toggle
        toggleBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

        // Swap content
        const chartsWrap = container.querySelector('.bench-charts-view');
        const tableWrap = container.querySelector('.bench-table-view');
        if (chartsWrap) chartsWrap.style.display = mode === 'charts' ? '' : 'none';
        if (tableWrap) tableWrap.style.display = mode === 'numbers' ? '' : 'none';

        // Lazy-render the table on first switch
        if (mode === 'numbers' && tableWrap && !tableWrap.dataset.rendered) {
          tableWrap.innerHTML = Profile.renderBenchmarksTable(player);
          tableWrap.dataset.rendered = '1';
        }
      });
    });
  },

  // ── Numbers Table View ──────────────────────────────────

  renderBenchmarksTable(player) {
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const fmtDate = (iso) => {
      const [y, m, d] = iso.split('-');
      return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
    };

    // Collect all unique session dates across ALL tests, sorted oldest-first
    const allDates = new Set();
    const categories = Benchmarks.getTestsByCategory();
    for (const testKeys of Object.values(categories)) {
      for (const tk of testKeys) {
        const sessions = player.tests?.[tk]?.sessions || [];
        for (const s of sessions) {
          if (s.best != null) allDates.add(s.date);
        }
      }
    }
    const sortedDates = [...allDates].sort((a, b) => a.localeCompare(b));

    // Build table rows — flat list of all tests with data
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
        const previous = DB.getPreviousSession(player, tk);
        const { level } = Benchmarks.evaluate(player.ageGroup, tk, latest?.best ?? testData.best);

        // Delta between latest and previous
        const deltaHTML = Profile.computeDelta(latest, previous, def);

        // Build session cells
        let sessionCells = '';
        for (const date of sortedDates) {
          const sessions = testData.sessions || [];
          const session = sessions.find(s => s.date === date);
          const val = session?.best ?? null;
          if (val !== null) {
            const { level: cellLevel } = Benchmarks.evaluate(player.ageGroup, tk, val);
            sessionCells += `<td class="bench-table-val"><span class="bench-table-dot" data-level="${cellLevel}"></span>${val}</td>`;
          } else {
            sessionCells += `<td class="bench-table-val bench-table-empty">—</td>`;
          }
        }

        catRows += `<tr>
          <td class="bench-table-test">${def.name}</td>
          <td class="bench-table-unit">${def.unit}</td>
          ${sessionCells}
          <td class="bench-table-level" data-level="${level}">${level === 'none' ? '—' : level}</td>
          <td class="bench-table-delta">${deltaHTML}</td>
        </tr>`;
      }

      if (catHasData) {
        rows += `<tr class="bench-table-cat-row"><td colspan="${sortedDates.length + 4}">${catName}</td></tr>`;
        rows += catRows;
      }
    }

    // Date headers
    const dateHeaders = sortedDates.map(d => `<th>${fmtDate(d)}</th>`).join('');

    return `<table class="bench-table">
      <thead>
        <tr>
          <th class="bench-table-th-test">Test</th>
          <th class="bench-table-th-unit">Unit</th>
          ${dateHeaders}
          <th>Level</th>
          <th>Delta</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  },

  // ── Benchmarks Section ────────────────────────────────────

  renderBenchmarks(player) {
    if (!player.tests || !player.ageGroup) {
      return `<div class="profile-section">
                <div class="profile-section-title">Physical Tests</div>
                <div class="no-data">No test data recorded yet.</div>
              </div>`;
    }

    const categories = Benchmarks.getTestsByCategory();
    let hasAnyTests = false;
    let html = '';

    for (const [catName, testKeys] of Object.entries(categories)) {
      // Check if this category is fully grouped (Speed)
      const isGrouped = categoryIsFullyGrouped(catName);

      if (isGrouped) {
        // Check if player has any data in this group
        const hasGroupData = testKeys.some(tk => {
          const td = player.tests[tk];
          return td && td.best !== null && td.best !== undefined;
        });

        if (hasGroupData) {
          hasAnyTests = true;
          const cardHTML = Profile.renderSpeedBars(player, testKeys);
          html += `<div class="bench-category">
                     <div class="bench-category-title">${catName}</div>
                     ${cardHTML}
                   </div>`;
        }
        continue;
      }

      // Non-grouped categories — individual bench-items with charts
      let catHTML = '';
      let catHasTests = false;

      for (const testKey of testKeys) {
        const testData = player.tests[testKey];
        if (!testData || testData.best === null || testData.best === undefined) continue;

        catHasTests = true;
        hasAnyTests = true;
        const def = TEST_DEFS[testKey];

        // Use latest session for display
        const latest = DB.getLatestSession(player, testKey);
        const previous = DB.getPreviousSession(player, testKey);
        const displayBest = latest?.best ?? testData.best;
        const { level, pct } = Benchmarks.evaluate(player.ageGroup, testKey, displayBest);

        // Delta badge
        const deltaHTML = Profile.computeDelta(latest, previous, def);

        // Latest session attempts
        const attempts = latest?.attempts || [];
        const hasMultiple = attempts.filter(a => a !== null && a !== undefined).length > 1;
        const attemptsHTML = hasMultiple ? `
          <div class="bench-attempts">
            <div class="bench-attempts-row">
              ${attempts.map((a, i) => {
                if (a === null || a === undefined) return '';
                const isBest = Number(a) === displayBest;
                return `<span class="bench-attempt-val${isBest ? ' best' : ''}">Att ${i+1}: ${a} ${def.unit}</span>`;
              }).join('')}
            </div>
          </div>
          <button class="bench-expand-btn">Show attempts</button>` : '';

        // Progression chart
        const chartHTML = Profile.renderProgressionChart(player, testKey, 760, 170);

        catHTML += `
          <div class="bench-item">
            <div class="bench-row">
              <span class="bench-test-name">${def.name}</span>
              <div class="bench-value-wrap">
                <span class="bench-value">${displayBest}</span>
                <span class="bench-unit">${def.unit}</span>
                <span class="bench-level-label" data-level="${level}">${level === 'none' ? '—' : level}</span>
                ${deltaHTML}
              </div>
            </div>
            <div class="bench-bar-track">
              <div class="bench-bar-fill" data-level="${level}" style="width:${pct}%"></div>
            </div>
            ${chartHTML}
            ${attemptsHTML}
          </div>`;
      }

      if (catHasTests) {
        html += `<div class="bench-category">
                   <div class="bench-category-title">${catName}</div>
                   ${catHTML}
                 </div>`;
      }
    }

    if (!hasAnyTests) {
      return `<div class="profile-section">
                <div class="profile-section-title">Physical Tests</div>
                <div class="no-data">No test data recorded yet.</div>
              </div>`;
    }

    const chartsActive = Profile._benchView === 'charts';

    return `<div class="profile-section">
              <div class="profile-section-title-row">
                <div class="profile-section-title" style="margin-bottom:0">Physical Tests</div>
                <div class="bench-toggle">
                  <button class="bench-toggle-btn ${chartsActive ? 'active' : ''}" data-mode="charts" title="Chart view">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </button>
                  <button class="bench-toggle-btn ${!chartsActive ? 'active' : ''}" data-mode="numbers" title="Numbers view">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  </button>
                </div>
              </div>
              <div class="bench-charts-view" style="${chartsActive ? '' : 'display:none'}">${html}</div>
              <div class="bench-table-view" style="${!chartsActive ? '' : 'display:none'}"></div>
            </div>`;
  }
};
