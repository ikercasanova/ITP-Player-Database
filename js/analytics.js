'use strict';

/* =================================================================
   analytics.js — Team Analytics: three-tab layout with
   Overview, Session Report, and Leaderboard
================================================================= */

const Analytics = {
  activeGroup: 'all',
  activeCategory: null,
  activeTest: null,
  sortBy: 'best',

  // Tab state
  activeTab: 'overview',      // 'overview' | 'session' | 'leaderboard'
  sessionDate: null,           // ISO date for Session Report
  sessionCategory: null,       // selected category in Session Report
  sessionTestKey: null,        // selected test in Session Report
  _progressionTest: null,      // selected test for team progression chart

  init() {},

  show() {
    // Auto-select first category/test if not set (for leaderboard)
    if (!Analytics.activeCategory) {
      const cats = Benchmarks.getTestsByCategory();
      const firstCat = Object.keys(cats)[0];
      if (firstCat) {
        Analytics.activeCategory = firstCat;
        if (categoryIsFullyGrouped(firstCat)) {
          Analytics.activeTest = null;
          Analytics.sortBy = cats[firstCat][0] || 'best';
        } else {
          Analytics.activeTest = cats[firstCat][0] || null;
        }
      }
    }
    Analytics.render();
  },

  render() {
    const container = document.getElementById('analytics-content');
    let players = DB.getAll();

    // Filter by age group
    if (Analytics.activeGroup !== 'all') {
      players = players.filter(p => p.ageGroup === Analytics.activeGroup);
    }

    const stats = Analytics.computeStats(players);
    container.innerHTML = Analytics.buildHTML(stats, players);
    Analytics.bindEvents(container, players);
  },

  // ── Compute Stats ───────────────────────────────────────────

  computeStats(players) {
    const categories = Benchmarks.getTestsByCategory();
    const totalPlayers = players.length;

    const overallDist = { poor: 0, average: 0, good: 0, elite: 0 };
    let overallTotal = 0;

    const catStats = {};
    const testedSet = new Set();

    for (const [category, testKeys] of Object.entries(categories)) {
      catStats[category] = { tests: {} };

      for (const testKey of testKeys) {
        const def = TEST_DEFS[testKey];
        const values = [];

        for (const p of players) {
          const t = p.tests?.[testKey];
          if (t && t.best !== null && t.best !== undefined) {
            const val = Number(t.best);
            if (!isNaN(val)) {
              values.push({ val, ageGroup: p.ageGroup });
              testedSet.add(p.id);
            }
          }
        }

        const dist = { poor: 0, average: 0, good: 0, elite: 0 };
        let sum = 0;

        for (const { val, ageGroup } of values) {
          const { level } = Benchmarks.evaluate(ageGroup, testKey, val);
          if (dist[level] !== undefined) {
            dist[level]++;
            overallDist[level]++;
            overallTotal++;
          }
          sum += val;
        }

        const avg = values.length > 0 ? sum / values.length : null;
        const median = Analytics._median(values.map(v => v.val));

        catStats[category].tests[testKey] = {
          name: def.name,
          unit: def.unit,
          count: values.length,
          avg,
          median,
          distribution: dist
        };
      }
    }

    const testedPlayers = testedSet.size;

    let dominantLevel = 'average';
    let maxCount = 0;
    for (const [level, count] of Object.entries(overallDist)) {
      if (count > maxCount) {
        maxCount = count;
        dominantLevel = level;
      }
    }

    return {
      totalPlayers,
      testedPlayers,
      overallDistribution: overallDist,
      overallTotal,
      dominantLevel,
      categories: catStats
    };
  },

  // ── Format date as "Mon 'YY" ──────────────────────────────────

  formatDateShort(isoDate) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const parts = isoDate.split('-');
    const monthIdx = parseInt(parts[1], 10) - 1;
    const year = parts[0].slice(2);
    return `${months[monthIdx]} '${year}`;
  },

  /** Compute median of a numeric array */
  _median(arr) {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },

  // ── Data Utilities ────────────────────────────────────────────

  collectSessionDates(players) {
    const dateSet = new Set();
    for (const p of players) {
      if (!p.tests) continue;
      for (const testData of Object.values(p.tests)) {
        if (!testData?.sessions) continue;
        for (const s of testData.sessions) {
          if (s.date && s.best !== null && s.best !== undefined) {
            dateSet.add(s.date);
          }
        }
      }
    }
    return [...dateSet].sort().reverse();
  },

  computeSessionStats(players, date) {
    const categories = Benchmarks.getTestsByCategory();
    const result = {
      tests: {},
      testedPlayers: new Set(),
      overallDist: { poor: 0, average: 0, good: 0, elite: 0 },
      overallTotal: 0
    };

    for (const [, testKeys] of Object.entries(categories)) {
      for (const testKey of testKeys) {
        const def = TEST_DEFS[testKey];
        const values = [];

        for (const p of players) {
          const sessions = p.tests?.[testKey]?.sessions || [];
          const session = sessions.find(s => s.date === date);
          if (session && session.best !== null && session.best !== undefined) {
            values.push({ val: Number(session.best), ageGroup: p.ageGroup, player: p });
            result.testedPlayers.add(p.id);
          }
        }

        const dist = { poor: 0, average: 0, good: 0, elite: 0 };
        let sum = 0;
        for (const { val, ageGroup } of values) {
          const { level } = Benchmarks.evaluate(ageGroup, testKey, val);
          if (dist[level] !== undefined) {
            dist[level]++;
            result.overallDist[level]++;
            result.overallTotal++;
          }
          sum += val;
        }

        const avg = values.length > 0 ? sum / values.length : null;
        const median = Analytics._median(values.map(v => v.val));
        result.tests[testKey] = { name: def.name, unit: def.unit, count: values.length, avg, median, distribution: dist };
      }
    }

    result.testedCount = result.testedPlayers.size;
    return result;
  },

  computeTeamAverages(players, testKey) {
    const dateSet = new Set();
    for (const p of players) {
      const sessions = p.tests?.[testKey]?.sessions || [];
      for (const s of sessions) {
        if (s.date && s.best !== null && s.best !== undefined) {
          dateSet.add(s.date);
        }
      }
    }

    const dates = [...dateSet].sort();
    return dates.map(date => {
      let sum = 0;
      const vals = [];
      for (const p of players) {
        const sessions = p.tests?.[testKey]?.sessions || [];
        const session = sessions.find(s => s.date === date);
        if (session && session.best !== null && session.best !== undefined) {
          const v = Number(session.best);
          sum += v;
          vals.push(v);
        }
      }
      const count = vals.length;
      return { date, avg: count > 0 ? sum / count : null, median: Analytics._median(vals), count };
    }).filter(d => d.avg !== null);
  },

  computeImprovers(players) {
    const improvers = [];
    const categories = Benchmarks.getTestsByCategory();

    for (const p of players) {
      if (!p.tests || !p.ageGroup) continue;

      for (const testKeys of Object.values(categories)) {
        for (const testKey of testKeys) {
          const sessions = p.tests?.[testKey]?.sessions || [];
          if (sessions.length < 2) continue;

          const latest = sessions[sessions.length - 1];
          const previous = sessions[sessions.length - 2];
          if (latest.best === null || previous.best === null) continue;

          const def = TEST_DEFS[testKey];
          const thresh = Benchmarks.getThresholds(p.ageGroup, testKey);
          if (!thresh) continue;

          const range = Math.abs(thresh.poor - thresh.elite);
          if (range === 0) continue;

          const diff = latest.best - previous.best;
          const improvement = def.lowerIsBetter ? -diff : diff;
          const normalizedPct = (improvement / range) * 100;

          if (normalizedPct > 0) {
            improvers.push({
              player: p,
              testKey,
              testName: def.name,
              unit: def.unit,
              from: previous.best,
              to: latest.best,
              improvement,
              normalizedPct
            });
          }
        }
      }
    }

    improvers.sort((a, b) => b.normalizedPct - a.normalizedPct);
    return improvers.slice(0, 5);
  },

  getSessionForPlayer(player, testKey, date) {
    const sessions = player?.tests?.[testKey]?.sessions || [];
    return sessions.find(s => s.date === date) || null;
  },

  getPreviousSessionBeforeDate(player, testKey, date) {
    const sessions = player?.tests?.[testKey]?.sessions || [];
    let prev = null;
    for (const s of sessions) {
      if (s.date < date) prev = s;
      else break;
    }
    return prev;
  },

  // ── Build HTML (tab dispatch) ─────────────────────────────────

  buildHTML(stats, players) {
    const groups = ['all', 'U-17', 'U-19', 'U-21'];
    const tabLabels = { all: 'All', 'U-17': 'U-17', 'U-19': 'U-19', 'U-21': 'U-21' };
    const ageTabsHTML = `
      <div class="analytics-toolbar">
        <div class="age-tabs">
          ${groups.map(g =>
            `<button class="age-tab ${g === Analytics.activeGroup ? 'active' : ''}" data-group="${g}">${tabLabels[g]}</button>`
          ).join('')}
        </div>
      </div>`;

    const mainTabsHTML = Analytics.buildMainTabs();

    let contentHTML;
    switch (Analytics.activeTab) {
      case 'overview':    contentHTML = Analytics.buildOverviewTab(stats, players); break;
      case 'session':     contentHTML = Analytics.buildSessionTab(stats, players); break;
      case 'leaderboard': contentHTML = Analytics.buildLeaderboardTab(stats, players); break;
      default:            contentHTML = Analytics.buildOverviewTab(stats, players);
    }

    return `
      <div class="analytics-page">
        <h2 class="analytics-title">Team Analytics</h2>
        ${ageTabsHTML}
        ${mainTabsHTML}
        ${contentHTML}
      </div>`;
  },

  buildMainTabs() {
    const tabs = [
      { key: 'overview', label: 'Overview' },
      { key: 'session', label: 'Session Report' },
      { key: 'leaderboard', label: 'Leaderboard' }
    ];
    return `
      <div class="analytics-tabs">
        ${tabs.map(t =>
          `<button class="analytics-tab ${t.key === Analytics.activeTab ? 'active' : ''}" data-tab="${t.key}">${t.label}</button>`
        ).join('')}
      </div>`;
  },

  // ══════════════════════════════════════════════════════════════
  //  TAB 1: OVERVIEW
  // ══════════════════════════════════════════════════════════════

  buildOverviewTab(stats, players) {
    const levelLabels = { poor: 'Poor', average: 'Average', good: 'Good', elite: 'Elite' };
    const levelOrder = ['elite', 'good', 'average', 'poor'];

    // Summary cards
    const summaryHTML = `
      <div class="stat-highlights">
        <div class="stat-card">
          <div class="stat-card-value">${stats.totalPlayers}</div>
          <div class="stat-card-label">Players</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${stats.testedPlayers}</div>
          <div class="stat-card-label">Tested</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">
            <span class="bench-level-label" data-level="${stats.dominantLevel}" style="font-size:14px;padding:3px 12px">
              ${levelLabels[stats.dominantLevel] || '\u2014'}
            </span>
          </div>
          <div class="stat-card-label">Dominant Level</div>
        </div>
      </div>`;

    // Overall distribution bar
    const overallBarHTML = stats.overallTotal > 0
      ? `<div class="analytics-summary">
          <h3 class="profile-section-title">Overall Distribution</h3>
          ${Analytics.renderStackedBar(stats.overallDistribution, false)}
          <div class="dist-legend">
            ${levelOrder.map(l => {
              const n = stats.overallDistribution[l];
              const pct = stats.overallTotal > 0 ? Math.round(n / stats.overallTotal * 100) : 0;
              return `<span class="dist-legend-item">
                <span class="dist-legend-dot" data-level="${l}"></span>
                ${levelLabels[l]} ${pct}%
              </span>`;
            }).join('')}
          </div>
        </div>`
      : '';

    // Benchmark breakdown
    const breakdownHTML = Analytics.renderBenchmarkBreakdown(stats);

    // Biggest improvers
    const improvers = Analytics.computeImprovers(players);
    const improversHTML = Analytics.renderImprovers(improvers);

    // Team progression chart
    const progressionHTML = Analytics.renderTeamProgression(players);

    return summaryHTML + overallBarHTML + breakdownHTML + improversHTML + progressionHTML;
  },

  renderBenchmarkBreakdown(stats) {
    const categories = Benchmarks.getTestsByCategory();
    let rows = '';

    for (const [catName, testKeys] of Object.entries(categories)) {
      for (const testKey of testKeys) {
        const testStats = stats.categories[catName]?.tests[testKey];
        if (!testStats || testStats.count === 0) continue;

        const total = testStats.distribution.poor + testStats.distribution.average +
                      testStats.distribution.good + testStats.distribution.elite;
        if (total === 0) continue;

        rows += `
          <div class="breakdown-row">
            <div class="breakdown-label">${testStats.name}</div>
            <div class="breakdown-bar">${Analytics.renderStackedBar(testStats.distribution, true)}</div>
            <div class="breakdown-count">${testStats.count}</div>
          </div>`;
      }
    }

    if (!rows) return '';

    return `
      <div class="analytics-summary">
        <h3 class="profile-section-title">Benchmark Breakdown</h3>
        <div class="breakdown-header">
          <span></span><span></span><span class="breakdown-count-label">Tested</span>
        </div>
        ${rows}
      </div>`;
  },

  renderImprovers(improvers) {
    if (improvers.length === 0) return '';

    return `
      <div class="analytics-summary">
        <h3 class="profile-section-title">Biggest Improvers</h3>
        <div class="improvers-list">
          ${improvers.map((imp, i) => {
            const def = TEST_DEFS[imp.testKey];
            const absDiff = Math.abs(imp.improvement);
            const formatted = absDiff < 1 ? absDiff.toFixed(2) : absDiff.toFixed(1);
            const sign = def.lowerIsBetter ? '-' : '+';
            return `
              <div class="improver-item">
                <span class="improver-rank">${i + 1}</span>
                <div class="improver-info">
                  <a class="analytics-player-link" href="#profile/${imp.player.id}">${imp.player.firstName} ${imp.player.lastName}</a>
                  <span class="improver-test">${imp.testName}</span>
                </div>
                <div class="improver-delta">
                  <span class="delta-badge delta-up">${sign}${formatted} ${imp.unit}</span>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  },

  renderTeamProgression(players) {
    const categories = Benchmarks.getTestsByCategory();
    const allTestKeys = [];
    for (const testKeys of Object.values(categories)) {
      for (const tk of testKeys) allTestKeys.push(tk);
    }

    const testOptions = allTestKeys.filter(tk => {
      const data = Analytics.computeTeamAverages(players, tk);
      return data.length > 0;
    });

    if (testOptions.length === 0) return '';

    if (!Analytics._progressionTest || !testOptions.includes(Analytics._progressionTest)) {
      Analytics._progressionTest = testOptions[0];
    }
    const activeTest = Analytics._progressionTest;

    const selectHTML = `
      <select class="category-select" data-role="progression-test-select">
        ${testOptions.map(tk =>
          `<option value="${tk}" ${tk === activeTest ? 'selected' : ''}>${TEST_DEFS[tk].name}</option>`
        ).join('')}
      </select>`;

    const chartHTML = Analytics.renderTeamProgressionChart(players, activeTest);

    return `
      <div class="analytics-summary">
        <div class="progression-header">
          <h3 class="profile-section-title" style="margin-bottom:0">Team Progression</h3>
          ${selectHTML}
        </div>
        ${chartHTML}
      </div>`;
  },

  renderTeamProgressionChart(players, testKey) {
    const data = Analytics.computeTeamAverages(players, testKey);
    if (data.length === 0) return '<div class="no-data">No session data for this test.</div>';

    const def = TEST_DEFS[testKey];
    const colors = Profile.LEVEL_COLORS;
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Determine dominant age group for threshold zones
    const ageGroups = {};
    for (const p of players) {
      if (p.ageGroup) ageGroups[p.ageGroup] = (ageGroups[p.ageGroup] || 0) + 1;
    }
    const dominantAge = Object.entries(ageGroups).sort((a, b) => b[1] - a[1])[0]?.[0] || 'U-19';
    const thresh = Benchmarks.getThresholds(dominantAge, testKey);

    const width = 760;
    const height = 214;
    const padLeft = 40;
    const padRight = thresh ? 42 : 20;
    const padTop = 24;
    const padBottom = 54;

    const plotLeft = padLeft;
    const plotRight = width - padRight;
    const plotTop = padTop;
    const plotBottom = height - padBottom;
    const plotWidth = plotRight - plotLeft;
    const plotHeight = plotBottom - plotTop;

    // Y range
    const dataValues = [...data.map(d => d.avg), ...data.filter(d => d.median !== null).map(d => d.median)];
    let yMin, yMax;
    if (thresh) {
      const allVals = [...dataValues, thresh.poor, thresh.average, thresh.good, thresh.elite];
      yMin = Math.min(...allVals);
      yMax = Math.max(...allVals);
    } else {
      yMin = Math.min(...dataValues);
      yMax = Math.max(...dataValues);
    }
    const range = yMax - yMin || 1;
    yMin -= range * 0.05;
    yMax += range * 0.05;

    const valueToY = (v) => {
      if (def.lowerIsBetter) {
        return plotTop + ((v - yMin) / (yMax - yMin)) * plotHeight;
      }
      return plotBottom - ((v - yMin) / (yMax - yMin)) * plotHeight;
    };

    // X positions
    const xInset = Math.min(40, plotWidth * 0.06);
    const xPositions = data.map((_, i) => {
      if (data.length === 1) return plotLeft + plotWidth / 2;
      return (plotLeft + xInset) + (i / (data.length - 1)) * (plotWidth - xInset * 2);
    });

    const gradId = `team-area-${testKey}-${Math.random().toString(36).slice(2, 6)}`;

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">`;

    // Gradient
    svg += `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#333" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#333" stop-opacity="0.01"/>
    </linearGradient></defs>`;

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
          svg += `<rect x="${plotLeft}" y="${y1}" width="${plotWidth}" height="${h}" fill="${levels[i].color}" opacity="0.18"/>`;
        }
        if (h > 12) {
          const labelY = y1 + h / 2 + 3;
          svg += `<text x="${plotRight + 6}" y="${labelY.toFixed(1)}" font-family="Barlow Condensed, sans-serif" font-weight="600" font-size="8" fill="${levels[i].color}" opacity="0.7">${levels[i].label}</text>`;
        }
      }
    }

    // Grid lines
    if (data.length > 1) {
      for (let i = 0; i < data.length; i++) {
        svg += `<line x1="${xPositions[i]}" y1="${plotTop}" x2="${xPositions[i]}" y2="${plotBottom}" stroke="#E0E0E0" stroke-width="0.5"/>`;
      }
    }

    // Area fill
    if (data.length > 1) {
      const areaPoints = data.map((d, i) => `${xPositions[i].toFixed(1)},${valueToY(d.avg).toFixed(1)}`);
      const areaPath = `M${xPositions[0].toFixed(1)},${plotBottom} L${areaPoints.join(' L')} L${xPositions[xPositions.length - 1].toFixed(1)},${plotBottom} Z`;
      svg += `<path d="${areaPath}" fill="url(#${gradId})"/>`;
    }

    // Average line (solid)
    if (data.length > 1) {
      const linePoints = data.map((d, i) => `${xPositions[i].toFixed(1)},${valueToY(d.avg).toFixed(1)}`).join(' ');
      svg += `<polyline points="${linePoints}" fill="none" stroke="#333" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }

    // Median line (dashed)
    const medianData = data.filter(d => d.median !== null);
    if (medianData.length > 1) {
      const medLinePoints = data.map((d, i) => `${xPositions[i].toFixed(1)},${valueToY(d.median).toFixed(1)}`).join(' ');
      svg += `<polyline points="${medLinePoints}" fill="none" stroke="#888" stroke-width="1.5" stroke-dasharray="5,3" stroke-linejoin="round" stroke-linecap="round"/>`;
    }

    // Average dots + labels
    for (let i = 0; i < data.length; i++) {
      const x = xPositions[i];
      const y = valueToY(data[i].avg);
      const { level } = Benchmarks.evaluate(dominantAge, testKey, data[i].avg);
      const dotColor = colors[level] || colors.none;

      const isFirst = i === 0 && data.length > 1;
      const isLast = i === data.length - 1 && data.length > 1;
      const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';

      svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${dotColor}" stroke="white" stroke-width="2"/>`;

      const avgDisplay = data[i].avg < 10 ? data[i].avg.toFixed(2) : data[i].avg.toFixed(1);
      const labelY = y < plotTop + 18 ? y + 16 : y - 10;
      svg += `<text x="${x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="${anchor}" font-size="11" font-family="Barlow Condensed, sans-serif" font-weight="700" fill="#333">${avgDisplay}</text>`;

      // Median dot (smaller, gray)
      if (data[i].median !== null) {
        const my = valueToY(data[i].median);
        svg += `<circle cx="${x.toFixed(1)}" cy="${my.toFixed(1)}" r="3" fill="#888" stroke="white" stroke-width="1.5"/>`;
      }

      // Date label
      const parts = data[i].date.split('-');
      const monthIdx = parseInt(parts[1], 10) - 1;
      const dateLabel = `${MONTHS[monthIdx]} ${parseInt(parts[2], 10)}`;
      svg += `<text x="${x.toFixed(1)}" y="${plotBottom + 14}" text-anchor="${anchor}" font-size="9" font-family="Barlow, sans-serif" fill="#888">${dateLabel}</text>`;

      // Player count
      svg += `<text x="${x.toFixed(1)}" y="${plotBottom + 24}" text-anchor="${anchor}" font-size="8" font-family="Barlow, sans-serif" fill="#AAA">${data[i].count} players</text>`;
    }

    // Legend
    svg += `<line x1="${plotLeft}" y1="${height - 4}" x2="${plotLeft + 16}" y2="${height - 4}" stroke="#333" stroke-width="2"/>`;
    svg += `<text x="${plotLeft + 20}" y="${height - 1}" font-size="8" font-family="Barlow, sans-serif" fill="#555">Avg</text>`;
    svg += `<line x1="${plotLeft + 44}" y1="${height - 4}" x2="${plotLeft + 60}" y2="${height - 4}" stroke="#888" stroke-width="1.5" stroke-dasharray="5,3"/>`;
    svg += `<text x="${plotLeft + 64}" y="${height - 1}" font-size="8" font-family="Barlow, sans-serif" fill="#555">Med</text>`;

    svg += '</svg>';
    return `<div class="progression-chart">${svg}</div>`;
  },

  // ══════════════════════════════════════════════════════════════
  //  TAB 2: SESSION REPORT
  // ══════════════════════════════════════════════════════════════

  buildSessionTab(stats, players) {
    const dates = Analytics.collectSessionDates(players);
    if (dates.length === 0) {
      return '<div class="no-data" style="padding:40px 20px">No testing sessions recorded yet.</div>';
    }

    // Default to most recent
    if (!Analytics.sessionDate || !dates.includes(Analytics.sessionDate)) {
      Analytics.sessionDate = dates[0];
    }

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const datePickerHTML = `
      <div class="session-date-picker">
        <label class="session-date-label">Session Date</label>
        <select class="category-select" data-role="session-date-select">
          ${dates.map(d => {
            const parts = d.split('-');
            const monthIdx = parseInt(parts[1], 10) - 1;
            const label = `${MONTHS[monthIdx]} ${parseInt(parts[2], 10)}, ${parts[0]}`;
            return `<option value="${d}" ${d === Analytics.sessionDate ? 'selected' : ''}>${label}</option>`;
          }).join('')}
        </select>
      </div>`;

    const sessionStats = Analytics.computeSessionStats(players, Analytics.sessionDate);

    // Session summary cards
    const testsRun = Object.values(sessionStats.tests).filter(t => t.count > 0).length;
    const levelLabels = { poor: 'Poor', average: 'Average', good: 'Good', elite: 'Elite' };
    const levelOrder = ['elite', 'good', 'average', 'poor'];

    let sessionDominant = 'average';
    let maxCount = 0;
    for (const [level, count] of Object.entries(sessionStats.overallDist)) {
      if (count > maxCount) { maxCount = count; sessionDominant = level; }
    }

    const sessionSummaryHTML = `
      <div class="stat-highlights">
        <div class="stat-card">
          <div class="stat-card-value">${sessionStats.testedCount}</div>
          <div class="stat-card-label">Players Tested</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">${testsRun}</div>
          <div class="stat-card-label">Tests Run</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-value">
            <span class="bench-level-label" data-level="${sessionDominant}" style="font-size:14px;padding:3px 12px">
              ${levelLabels[sessionDominant] || '\u2014'}
            </span>
          </div>
          <div class="stat-card-label">Dominant Level</div>
        </div>
      </div>`;

    // Session distribution
    const sessionDistHTML = sessionStats.overallTotal > 0
      ? `<div class="analytics-summary">
          <h3 class="profile-section-title">Session Distribution</h3>
          ${Analytics.renderStackedBar(sessionStats.overallDist, false)}
          <div class="dist-legend">
            ${levelOrder.map(l => {
              const n = sessionStats.overallDist[l];
              const pct = sessionStats.overallTotal > 0 ? Math.round(n / sessionStats.overallTotal * 100) : 0;
              return `<span class="dist-legend-item">
                <span class="dist-legend-dot" data-level="${l}"></span>
                ${levelLabels[l]} ${pct}%
              </span>`;
            }).join('')}
          </div>
        </div>`
      : '';

    // Session averages table
    const sessionAvgHTML = Analytics.renderSessionAverages(sessionStats);

    // Session results table
    const sessionResultsHTML = Analytics.renderSessionResults(players, Analytics.sessionDate, sessionStats);

    return datePickerHTML + sessionSummaryHTML + sessionDistHTML + sessionAvgHTML + sessionResultsHTML;
  },

  renderSessionAverages(sessionStats) {
    let rows = '';

    const categories = Benchmarks.getTestsByCategory();
    for (const [, testKeys] of Object.entries(categories)) {
      for (const testKey of testKeys) {
        const test = sessionStats.tests[testKey];
        if (!test || test.count === 0) continue;

        const avgDisplay = test.avg !== null
          ? (test.avg < 10 ? test.avg.toFixed(2) : test.avg.toFixed(1))
          : '\u2014';
        const medDisplay = test.median !== null
          ? (test.median < 10 ? test.median.toFixed(2) : test.median.toFixed(1))
          : '\u2014';
        const total = test.distribution.poor + test.distribution.average +
                      test.distribution.good + test.distribution.elite;

        rows += `
          <tr>
            <td class="session-avg-name">${test.name}</td>
            <td class="session-avg-val">${avgDisplay} <span class="session-avg-unit">${test.unit}</span></td>
            <td class="session-avg-val">${medDisplay} <span class="session-avg-unit">${test.unit}</span></td>
            <td class="session-avg-count">${test.count}</td>
            <td class="session-avg-bar">${total > 0 ? Analytics.renderStackedBar(test.distribution, true) : ''}</td>
          </tr>`;
      }
    }

    if (!rows) return '';

    return `
      <div class="analytics-summary">
        <h3 class="profile-section-title">Session Averages</h3>
        <table class="session-avg-table">
          <thead>
            <tr>
              <th>Test</th>
              <th>Avg</th>
              <th>Median</th>
              <th>Tested</th>
              <th>Distribution</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  renderSessionResults(players, date, sessionStats) {
    const categories = Benchmarks.getTestsByCategory();
    const catKeys = Object.keys(categories);

    // Find tests with data for this session
    const availableTests = [];
    for (const [catName, testKeys] of Object.entries(categories)) {
      for (const tk of testKeys) {
        if (sessionStats.tests[tk] && sessionStats.tests[tk].count > 0) {
          availableTests.push({ key: tk, name: TEST_DEFS[tk].name, category: catName });
        }
      }
    }

    if (availableTests.length === 0) return '';

    // Default session category/test
    const availableCats = [...new Set(availableTests.map(t => t.category))];
    if (!Analytics.sessionCategory || !availableCats.includes(Analytics.sessionCategory)) {
      Analytics.sessionCategory = availableTests[0].category;
    }
    const testsInCat = availableTests.filter(t => t.category === Analytics.sessionCategory);
    if (!Analytics.sessionTestKey || !testsInCat.find(t => t.key === Analytics.sessionTestKey)) {
      Analytics.sessionTestKey = testsInCat[0] ? testsInCat[0].key : availableTests[0].key;
    }

    // Controls
    const controlsHTML = `
      <div class="analytics-controls">
        <select class="category-select" data-role="session-category-select">
          ${availableCats.map(c =>
            `<option value="${c}" ${c === Analytics.sessionCategory ? 'selected' : ''}>${c}</option>`
          ).join('')}
        </select>
        <div class="test-tabs">
          ${testsInCat.map(t =>
            `<button class="test-tab ${t.key === Analytics.sessionTestKey ? 'active' : ''}" data-session-test="${t.key}">${t.name}</button>`
          ).join('')}
        </div>
      </div>`;

    // Build player rows
    const testKey = Analytics.sessionTestKey;
    const def = TEST_DEFS[testKey];
    const rows = [];

    for (const p of players) {
      const session = Analytics.getSessionForPlayer(p, testKey, date);
      if (!session || session.best === null || session.best === undefined) continue;

      const prevSession = Analytics.getPreviousSessionBeforeDate(p, testKey, date);
      const { level } = Benchmarks.evaluate(p.ageGroup, testKey, session.best);

      let deltaVal = 0;
      let deltaHTML = '';
      if (prevSession && prevSession.best !== null) {
        const diff = session.best - prevSession.best;
        const absDiff = Math.abs(diff);
        const formatted = absDiff < 1 ? absDiff.toFixed(2) : absDiff.toFixed(1);
        let cls, sign;
        if (def.lowerIsBetter) {
          deltaVal = -diff;
          if (diff < -0.001) { cls = 'delta-up'; sign = '-'; }
          else if (diff > 0.001) { cls = 'delta-down'; sign = '+'; }
          else { cls = 'delta-same'; sign = ''; }
        } else {
          deltaVal = diff;
          if (diff > 0.001) { cls = 'delta-up'; sign = '+'; }
          else if (diff < -0.001) { cls = 'delta-down'; sign = '-'; }
          else { cls = 'delta-same'; sign = ''; }
        }
        deltaHTML = `<span class="delta-badge ${cls}">${sign}${formatted}</span>`;
      }

      rows.push({ player: p, value: session.best, prevValue: prevSession?.best ?? null, level, deltaVal, deltaHTML });
    }

    if (rows.length === 0) {
      return `<div class="analytics-summary" style="padding-bottom:8px">
        <h3 class="profile-section-title">Session Results</h3>
        ${controlsHTML}
        <div class="no-data">No results for this test in this session.</div>
      </div>`;
    }

    // Sort by value (best first)
    rows.sort((a, b) => def.lowerIsBetter ? a.value - b.value : b.value - a.value);

    // Most improved
    const improvedRows = rows.filter(r => r.deltaVal > 0);
    const mostImproved = improvedRows.length > 0
      ? improvedRows.sort((a, b) => b.deltaVal - a.deltaVal)[0]
      : null;

    let improvedCalloutHTML = '';
    if (mostImproved) {
      const pName = `${mostImproved.player.firstName} ${mostImproved.player.lastName}`;
      improvedCalloutHTML = `
        <div class="most-improved-callout">
          <svg class="most-improved-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bench-good)" stroke-width="2.5" stroke-linecap="round"><polyline points="18 15 12 9 6 15"/></svg>
          <span class="most-improved-text">Most Improved: <strong>${pName}</strong> ${mostImproved.deltaHTML}</span>
        </div>`;
    }

    // Table
    const tableRows = rows.map((r, i) => `
      <tr${mostImproved && r.player.id === mostImproved.player.id ? ' class="session-row-highlight"' : ''}>
        <td class="col-rank" style="color:${i === 0 ? 'var(--red)' : 'var(--gray-300)'}">${i + 1}</td>
        <td class="col-player"><a class="analytics-player-link" href="#profile/${r.player.id}">${r.player.firstName} ${r.player.lastName}</a></td>
        <td class="col-group">${r.player.ageGroup}</td>
        <td class="col-session">${r.value}</td>
        <td class="col-session">${r.prevValue !== null ? r.prevValue : '\u2014'}</td>
        <td class="col-delta">${r.deltaHTML}</td>
        <td class="col-level"><span class="bench-level-label" data-level="${r.level}">${r.level}</span></td>
      </tr>`).join('');

    const tableHTML = `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-player">Player</th>
            <th class="col-group">Group</th>
            <th class="col-session">This Session</th>
            <th class="col-session">Previous</th>
            <th class="col-delta">Delta</th>
            <th class="col-level">Level</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>`;

    return `
      <div class="analytics-summary" style="padding-bottom:8px">
        <h3 class="profile-section-title">Session Results</h3>
        ${controlsHTML}
        ${improvedCalloutHTML}
        <div class="table-scroll">${tableHTML}</div>
      </div>`;
  },

  // ══════════════════════════════════════════════════════════════
  //  TAB 3: LEADERBOARD (extracted from original buildHTML)
  // ══════════════════════════════════════════════════════════════

  buildLeaderboardTab(stats, players) {
    const categories = Benchmarks.getTestsByCategory();
    const catKeys = Object.keys(categories);
    const activeCat = Analytics.activeCategory || catKeys[0];
    const testKeysInCat = categories[activeCat] || [];
    const isGrouped = categoryIsFullyGrouped(activeCat);
    const activeTestKey = isGrouped ? null : (Analytics.activeTest || testKeysInCat[0]);

    // Category selector + test tabs
    let categorySelectHTML;
    if (isGrouped) {
      const groupKey = getGroupForTest(testKeysInCat[0]);
      const group = TEST_GROUPS[groupKey];
      categorySelectHTML = `
        <div class="analytics-controls">
          <select class="category-select" data-role="category-select">
            ${catKeys.map(c =>
              `<option value="${c}" ${c === activeCat ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
          <span class="test-group-label">${group.name}</span>
        </div>`;
    } else {
      categorySelectHTML = `
        <div class="analytics-controls">
          <select class="category-select" data-role="category-select">
            ${catKeys.map(c =>
              `<option value="${c}" ${c === activeCat ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
          <div class="test-tabs">
            ${testKeysInCat.map(tk => {
              const def = TEST_DEFS[tk];
              return `<button class="test-tab ${tk === activeTestKey ? 'active' : ''}" data-test="${tk}">${def.name}</button>`;
            }).join('')}
          </div>
        </div>`;
    }

    // Test info bar (non-grouped only)
    let testInfoHTML = '';
    if (!isGrouped) {
      const testStats = stats.categories[activeCat]?.tests[activeTestKey];
      if (testStats) {
        const avgDisplay = testStats.avg !== null
          ? (Number.isInteger(testStats.avg) ? testStats.avg : testStats.avg.toFixed(2))
          : '\u2014';
        const medDisplay = testStats.median !== null
          ? (Number.isInteger(testStats.median) ? testStats.median : testStats.median.toFixed(2))
          : '\u2014';
        const distTotal = testStats.distribution.poor + testStats.distribution.average +
                          testStats.distribution.good + testStats.distribution.elite;

        testInfoHTML = `
          <div class="test-info-bar">
            <span class="test-info-name">${testStats.name}</span>
            <span class="test-info-detail">${testStats.count} of ${stats.totalPlayers} tested</span>
            <span class="test-info-detail">Avg: <strong>${avgDisplay} ${testStats.unit}</strong></span>
            <span class="test-info-detail">Med: <strong>${medDisplay} ${testStats.unit}</strong></span>
          </div>
          ${distTotal > 0 ? Analytics.renderStackedBar(testStats.distribution, true) : ''}`;
      }
    }

    // Sort controls
    let sortOptions;
    if (isGrouped) {
      sortOptions = [
        ...testKeysInCat.map(tk => ({ key: tk, label: TEST_DEFS[tk].name })),
        { key: 'name', label: 'Name' },
        { key: 'ageGroup', label: 'Age Group' }
      ];
      if (!sortOptions.find(s => s.key === Analytics.sortBy)) {
        Analytics.sortBy = testKeysInCat[0];
      }
    } else {
      sortOptions = [
        { key: 'best', label: 'Best' },
        { key: 'delta', label: 'Delta' },
        { key: 'name', label: 'Name' },
        { key: 'ageGroup', label: 'Age Group' }
      ];
    }
    const sortHTML = `
      <div class="sort-controls">
        <span class="sort-label">Sort:</span>
        ${sortOptions.map(s =>
          `<button class="sort-btn ${s.key === Analytics.sortBy ? 'active' : ''}" data-sort="${s.key}">${s.label}</button>`
        ).join('')}
      </div>`;

    // Table
    const tableHTML = isGrouped
      ? Analytics.renderGroupedTable(testKeysInCat, players)
      : (activeTestKey ? Analytics.renderFullTable(activeTestKey, players) : '');

    return `
      ${categorySelectHTML}
      ${testInfoHTML}
      ${sortHTML}
      <div class="table-scroll">
        ${tableHTML}
      </div>`;
  },

  // ── Full Leaderboard Table ──────────────────────────────────

  renderFullTable(testKey, players) {
    const def = TEST_DEFS[testKey];
    if (!def) return '';

    const dateSet = new Set();
    const rows = [];

    for (const p of players) {
      const t = p.tests?.[testKey];
      if (!t || t.best === null || t.best === undefined) continue;

      const sessions = t.sessions || [];
      for (const s of sessions) dateSet.add(s.date);

      const latest = DB.getLatestSession(p, testKey);
      const previous = DB.getPreviousSession(p, testKey);
      const latestBest = latest?.best ?? t.best;
      const { level } = Benchmarks.evaluate(p.ageGroup, testKey, latestBest);

      let deltaVal = 0;
      let deltaHTML = '';
      if (latest && previous && latest.best !== null && previous.best !== null) {
        const diff = latest.best - previous.best;
        const absDiff = Math.abs(diff);
        const formatted = absDiff < 1 ? absDiff.toFixed(2) : absDiff.toFixed(1);
        let cls, sign;
        if (def.lowerIsBetter) {
          deltaVal = -diff;
          if (diff < -0.001) { cls = 'delta-up'; sign = '-'; }
          else if (diff > 0.001) { cls = 'delta-down'; sign = '+'; }
          else { cls = 'delta-same'; sign = ''; }
        } else {
          deltaVal = diff;
          if (diff > 0.001) { cls = 'delta-up'; sign = '+'; }
          else if (diff < -0.001) { cls = 'delta-down'; sign = '-'; }
          else { cls = 'delta-same'; sign = ''; }
        }
        deltaHTML = `<span class="delta-badge ${cls}">${sign}${formatted}</span>`;
      }

      rows.push({ player: p, best: latestBest, level, deltaVal, deltaHTML, sessions });
    }

    if (rows.length === 0) return '<div class="no-data">No results for this test.</div>';

    const dates = [...dateSet].sort().slice(-5);
    Analytics.sortRows(rows, def);

    const dateHeaders = dates.map(d => `<th class="col-session">${Analytics.formatDateShort(d)}</th>`).join('');

    const tableRows = rows.map((r, i) => {
      const sessionCells = dates.map(d => {
        const s = r.sessions.find(ss => ss.date === d);
        const val = s?.best !== null && s?.best !== undefined ? s.best : '\u2014';
        return `<td class="col-session">${val}</td>`;
      }).join('');

      return `
        <tr>
          <td class="col-rank" style="color:${i === 0 ? 'var(--red)' : 'var(--gray-300)'}">${i + 1}</td>
          <td class="col-player"><a class="analytics-player-link" href="#profile/${r.player.id}">${r.player.firstName} ${r.player.lastName}</a></td>
          <td class="col-group">${r.player.ageGroup}</td>
          ${sessionCells}
          <td class="col-delta">${r.deltaHTML}</td>
          <td class="col-level"><span class="bench-level-label" data-level="${r.level}">${r.level}</span></td>
        </tr>`;
    }).join('');

    return `
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th class="col-rank">#</th>
            <th class="col-player">Player</th>
            <th class="col-group">Group</th>
            ${dateHeaders}
            <th class="col-delta">Delta</th>
            <th class="col-level">Level</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>`;
  },

  // ── Sort Rows ──────────────────────────────────────────────

  sortRows(rows, def) {
    switch (Analytics.sortBy) {
      case 'best':
        rows.sort((a, b) => def.lowerIsBetter ? a.best - b.best : b.best - a.best);
        break;
      case 'delta':
        rows.sort((a, b) => b.deltaVal - a.deltaVal);
        break;
      case 'name':
        rows.sort((a, b) => a.player.lastName.localeCompare(b.player.lastName));
        break;
      case 'ageGroup':
        rows.sort((a, b) => {
          const groupCmp = a.player.ageGroup.localeCompare(b.player.ageGroup);
          if (groupCmp !== 0) return groupCmp;
          return def.lowerIsBetter ? a.best - b.best : b.best - a.best;
        });
        break;
    }
  },

  // ── Grouped Table (Speed) ───────────────────────────────────

  renderGroupedTable(testKeys, players) {
    const rows = [];

    for (const p of players) {
      let hasAny = false;
      const cells = {};

      for (const tk of testKeys) {
        const t = p.tests?.[tk];
        const latest = DB.getLatestSession(p, tk);
        const previous = DB.getPreviousSession(p, tk);
        const latestBest = latest?.best ?? t?.best ?? null;

        if (latestBest !== null && latestBest !== undefined) {
          hasAny = true;
          const { level } = Benchmarks.evaluate(p.ageGroup, tk, latestBest);

          let deltaHTML = '';
          if (latest && previous && latest.best !== null && previous.best !== null) {
            const diff = latest.best - previous.best;
            const absDiff = Math.abs(diff);
            const formatted = absDiff < 1 ? absDiff.toFixed(2) : absDiff.toFixed(1);
            let cls, sign;
            if (diff < -0.001) { cls = 'delta-up'; sign = '-'; }
            else if (diff > 0.001) { cls = 'delta-down'; sign = '+'; }
            else { cls = 'delta-same'; sign = ''; }
            deltaHTML = `<span class="delta-badge ${cls}" style="font-size:10px;padding:0 4px;margin-left:3px">${sign}${formatted}</span>`;
          }

          cells[tk] = { best: latestBest, deltaHTML, level };
        } else {
          cells[tk] = { best: null, deltaHTML: '', level: 'none' };
        }
      }

      if (!hasAny) continue;
      rows.push({ player: p, cells });
    }

    if (rows.length === 0) return '<div class="no-data">No speed test results.</div>';

    Analytics.sortGroupedRows(rows, testKeys);

    const distHeaders = testKeys.map(tk =>
      `<th class="col-sprint">${TEST_DEFS[tk].name}</th>`
    ).join('');

    const tableRows = rows.map((r, i) => {
      const distCells = testKeys.map(tk => {
        const c = r.cells[tk];
        if (c.best === null) return `<td class="col-sprint">\u2014</td>`;
        return `<td class="col-sprint">
          <span class="sprint-val" data-level="${c.level}">${c.best}</span>${c.deltaHTML}
        </td>`;
      }).join('');

      return `<tr>
        <td class="col-rank" style="color:${i === 0 ? 'var(--red)' : 'var(--gray-300)'}">${i + 1}</td>
        <td class="col-player"><a class="analytics-player-link" href="#profile/${r.player.id}">${r.player.firstName} ${r.player.lastName}</a></td>
        <td class="col-group">${r.player.ageGroup}</td>
        ${distCells}
      </tr>`;
    }).join('');

    return `
      <table class="leaderboard-table speed-group-table">
        <thead><tr>
          <th class="col-rank">#</th>
          <th class="col-player">Player</th>
          <th class="col-group">Group</th>
          ${distHeaders}
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>`;
  },

  sortGroupedRows(rows, testKeys) {
    const sortKey = Analytics.sortBy;

    if (sortKey === 'name') {
      rows.sort((a, b) => a.player.lastName.localeCompare(b.player.lastName));
    } else if (sortKey === 'ageGroup') {
      rows.sort((a, b) => {
        const gc = a.player.ageGroup.localeCompare(b.player.ageGroup);
        if (gc !== 0) return gc;
        const aVal = a.cells[testKeys[0]]?.best ?? 999;
        const bVal = b.cells[testKeys[0]]?.best ?? 999;
        return aVal - bVal;
      });
    } else if (testKeys.includes(sortKey)) {
      rows.sort((a, b) => {
        const aVal = a.cells[sortKey]?.best ?? 999;
        const bVal = b.cells[sortKey]?.best ?? 999;
        return aVal - bVal;
      });
    }
  },

  // ── Stacked Distribution Bar ────────────────────────────────

  renderStackedBar(distribution, small) {
    const total = distribution.poor + distribution.average +
                  distribution.good + distribution.elite;
    if (total === 0) return `<div class="${small ? 'dist-bar-sm' : 'dist-bar'} dist-bar-empty"></div>`;

    const levels = ['elite', 'good', 'average', 'poor'];
    const segments = levels.map(level => {
      const pct = (distribution[level] / total * 100).toFixed(1);
      if (distribution[level] === 0) return '';
      return `<div class="dist-segment" data-level="${level}" style="width:${pct}%"></div>`;
    }).join('');

    return `<div class="${small ? 'dist-bar-sm' : 'dist-bar'}">${segments}</div>`;
  },

  // ── Event Binding ───────────────────────────────────────────

  bindEvents(container, players) {
    // Age group tabs
    container.querySelectorAll('.age-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        Analytics.activeGroup = tab.dataset.group;
        Analytics.render();
      });
    });

    // Main tabs (Overview | Session Report | Leaderboard)
    container.querySelectorAll('.analytics-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        Analytics.activeTab = tab.dataset.tab;
        Analytics.render();
      });
    });

    // Category select dropdown (leaderboard)
    const catSelect = container.querySelector('[data-role="category-select"]');
    if (catSelect) {
      catSelect.addEventListener('change', () => {
        Analytics.activeCategory = catSelect.value;
        const cats = Benchmarks.getTestsByCategory();
        const testsInCat = cats[catSelect.value] || [];

        if (categoryIsFullyGrouped(catSelect.value)) {
          Analytics.activeTest = null;
          Analytics.sortBy = testsInCat[0] || 'best';
        } else {
          Analytics.activeTest = testsInCat[0] || null;
          Analytics.sortBy = 'best';
        }
        Analytics.render();
      });
    }

    // Test tabs (leaderboard — have data-test attribute)
    container.querySelectorAll('.test-tab[data-test]').forEach(tab => {
      tab.addEventListener('click', () => {
        Analytics.activeTest = tab.dataset.test;
        Analytics.sortBy = 'best';
        Analytics.render();
      });
    });

    // Sort buttons
    container.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Analytics.sortBy = btn.dataset.sort;
        Analytics.render();
      });
    });

    // Team progression test dropdown
    const progSelect = container.querySelector('[data-role="progression-test-select"]');
    if (progSelect) {
      progSelect.addEventListener('change', () => {
        Analytics._progressionTest = progSelect.value;
        Analytics.render();
      });
    }

    // Session date picker
    const dateSelect = container.querySelector('[data-role="session-date-select"]');
    if (dateSelect) {
      dateSelect.addEventListener('change', () => {
        Analytics.sessionDate = dateSelect.value;
        Analytics.render();
      });
    }

    // Session category select
    const sessCatSelect = container.querySelector('[data-role="session-category-select"]');
    if (sessCatSelect) {
      sessCatSelect.addEventListener('change', () => {
        Analytics.sessionCategory = sessCatSelect.value;
        const categories = Benchmarks.getTestsByCategory();
        const testsInCat = categories[sessCatSelect.value] || [];
        Analytics.sessionTestKey = testsInCat[0] || null;
        Analytics.render();
      });
    }

    // Session test tabs (have data-session-test attribute)
    container.querySelectorAll('[data-session-test]').forEach(tab => {
      tab.addEventListener('click', () => {
        Analytics.sessionTestKey = tab.dataset.sessionTest;
        Analytics.render();
      });
    });
  }
};
