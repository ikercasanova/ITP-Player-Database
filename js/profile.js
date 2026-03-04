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

    const def = TEST_DEFS[testKey];
    const thresh = Benchmarks.getThresholds(player.ageGroup, testKey);
    const colors = Profile.LEVEL_COLORS;

    // Padding
    const padLeft = isSparkline ? 8 : 34;
    const padRight = isSparkline ? 8 : 20;
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
    // For lowerIsBetter: lower values at top (better)
    // For higher-is-better: higher values at top (better)
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

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">`;

    // Background
    svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#FAFAFA" rx="4"/>`;

    // Benchmark zone bands
    if (thresh) {
      const levels = [
        { key: 'elite', color: colors.elite },
        { key: 'good', color: colors.good },
        { key: 'average', color: colors.average },
        { key: 'poor', color: colors.poor }
      ];

      // Determine band boundaries (top to bottom in chart)
      // For lowerIsBetter: elite < good < average < poor (ascending values = descending chart position)
      // For higher-is-better: elite > good > average > poor (descending values = descending chart position)
      // Both cases: elite at top, poor at bottom (because of valueToY mapping)
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
      }
    }

    // Grid line at each data point's Y
    if (!isSparkline && points.length > 1) {
      for (let i = 0; i < points.length; i++) {
        const x = xPositions[i];
        svg += `<line x1="${x}" y1="${plotTop}" x2="${x}" y2="${plotBottom}" stroke="#E0E0E0" stroke-width="0.5"/>`;
      }
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

      svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isSparkline ? 3 : 4}" fill="${dotColor}" stroke="white" stroke-width="1.5"/>`;

      // Value label (skip for sparklines)
      if (!isSparkline) {
        const labelY = y < plotTop + 16 ? y + 14 : y - 8;
        svg += `<text x="${x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="10" font-family="Barlow Condensed, sans-serif" font-weight="700" fill="#333">${points[i].value}</text>`;
      }

      // Date label
      if (!isSparkline || i === 0 || i === points.length - 1) {
        const dateStr = points[i].date;
        const parts = dateStr.split('-');
        const dateLabel = parts.length >= 3 ? `${parts[1]}/${parts[2]}` : dateStr;
        svg += `<text x="${x.toFixed(1)}" y="${plotBottom + (isSparkline ? 12 : 16)}" text-anchor="middle" font-size="${isSparkline ? 8 : 9}" font-family="Barlow, sans-serif" fill="#888">${dateLabel}</text>`;
      }
    }

    svg += '</svg>';
    return `<div class="progression-chart">${svg}</div>`;
  },

  // ── Speed Grouped Card ────────────────────────────────────

  renderSpeedCard(player, speedTestKeys) {
    const colors = Profile.LEVEL_COLORS;

    // Check if player has any speed data
    const hasAny = speedTestKeys.some(tk => {
      const td = player.tests?.[tk];
      return td && td.best !== null && td.best !== undefined;
    });
    if (!hasAny) return '';

    // Mini summary table
    let tableRows = '';
    for (const testKey of speedTestKeys) {
      const def = TEST_DEFS[testKey];
      const testData = player.tests?.[testKey];
      const latest = DB.getLatestSession(player, testKey);
      const previous = DB.getPreviousSession(player, testKey);
      const displayBest = latest?.best ?? testData?.best ?? null;

      if (displayBest === null || displayBest === undefined) {
        tableRows += `<tr>
          <td class="col-distance">${def.name}</td>
          <td class="col-best" style="color:#888">—</td>
          <td class="col-level"><span class="bench-level-label" data-level="none">—</span></td>
          <td class="col-delta"></td>
        </tr>`;
        continue;
      }

      const { level } = Benchmarks.evaluate(player.ageGroup, testKey, displayBest);
      const deltaHTML = Profile.computeDelta(latest, previous, def);

      tableRows += `<tr>
        <td class="col-distance">${def.name}</td>
        <td class="col-best">${displayBest} <span style="font-weight:400;color:#888">${def.unit}</span></td>
        <td class="col-level"><span class="bench-level-label" data-level="${level}">${level === 'none' ? '—' : level}</span></td>
        <td class="col-delta">${deltaHTML}</td>
      </tr>`;
    }

    const tableHTML = `
      <table class="speed-mini-table">
        <thead><tr>
          <th class="col-distance">Distance</th>
          <th class="col-best">Best</th>
          <th class="col-level">Level</th>
          <th class="col-delta">Change</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>`;

    // Sparkline grid (2x2)
    let sparklines = '';
    for (const testKey of speedTestKeys) {
      const def = TEST_DEFS[testKey];
      const testData = player.tests?.[testKey];
      const sessions = testData?.sessions || [];
      const hasData = sessions.some(s => s.best !== null && s.best !== undefined);

      const chartHTML = hasData
        ? Profile.renderProgressionChart(player, testKey, 260, 100, { sparkline: true })
        : '<div style="height:60px;display:flex;align-items:center;justify-content:center;color:#888;font-size:11px">No data</div>';

      sparklines += `
        <div class="sparkline-item">
          <div class="sparkline-label">${def.name}</div>
          ${chartHTML}
        </div>`;
    }

    return `
      <div class="speed-profile-card">
        ${tableHTML}
        <div class="sparkline-grid">${sparklines}</div>
      </div>`;
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
          const cardHTML = Profile.renderSpeedCard(player, testKeys);
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
        const chartHTML = Profile.renderProgressionChart(player, testKey, 540, 140);

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

    return `<div class="profile-section">
              <div class="profile-section-title">Physical Tests</div>
              ${html}
            </div>`;
  }
};
