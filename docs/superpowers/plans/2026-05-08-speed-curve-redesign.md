# Speed Card v2 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans (recommended for this small scope) or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the family-report Speed card chart to use a percentile Y-axis with benchmark bands, distinct colors per session (latest emphasized), a "Latest test · <date>" pill above the threshold rows, and a color-coded results table below the chart.

**Architecture:** All changes contained in `js/report.js` (one rewrite of `_renderSpeedCurve`, edits to `_renderSpeedCard`, two new helpers `_renderSpeedLegend` and `_renderSpeedResultsTable`) and `css/report.css` (new card-internal styles).

**Reference spec:** `docs/superpowers/specs/2026-05-08-speed-curve-redesign-design.md`

**Files modified:**
- `js/report.js` — rewrite chart, add helpers, restructure speed card markup
- `css/report.css` — append new styles for pill / legend / results table

---

## Task 1: Add session palette helper

A small helper that, given an ordered list of sessions (oldest → newest), assigns a color/stroke/opacity per session per the spec.

**Files:**
- Modify: `js/report.js` — add helper inside the `Report` object near the existing `_computeVisualPct` (around line 770)

- [ ] **Step 1: Add `_speedSessionStyle(idx, total)`**

```javascript
  // Returns { color, stroke, opacity, dotR } for a session at zero-based age `idx`
  // (0 = oldest of the rendered sessions, total-1 = latest).
  // Cap on rendered sessions = 6; older ones should be filtered before this call.
  _speedSessionStyle(idx, total) {
    const isLatest = idx === total - 1;
    if (isLatest) {
      return { color: '#E3000F', stroke: 2.8, opacity: 1, dotR: 4.2 };
    }
    // From newest non-latest backward: 2nd = steel blue, 3rd = warm tan, then alternate
    const generationsBack = (total - 1) - idx; // 1 = 2nd most recent, 2 = 3rd, ...
    const palette = ['#5B7BA8', '#C49B6C'];
    const color = palette[(generationsBack - 1) % palette.length];
    const fadeStep = Math.max(0, generationsBack - 1) * 0.15;
    const opacity = Math.max(0.45, 0.95 - fadeStep);
    const stroke = generationsBack === 1 ? 1.9 : 1.7;
    const dotR = generationsBack === 1 ? 3.2 : 3.0;
    return { color, stroke, opacity, dotR };
  },
```

- [ ] **Step 2: Verify with `node -c js/report.js`.**

- [ ] **Step 3: Commit**

```bash
git add js/report.js
git commit -m "feat(family-report): add _speedSessionStyle palette helper"
```

---

## Task 2: Rewrite `_renderSpeedCurve` (percentile Y + benchmark bands)

Replace the current SVG entirely. New version uses `_computeVisualPct` to map each session's distance time to a 0–100 percentile, plots that on Y, and paints the four benchmark bands as background.

**Files:**
- Modify: `js/report.js` — replace existing `_renderSpeedCurve` (around line 595)

- [ ] **Step 1: Replace the method**

Find `_renderSpeedCurve(player) {` and replace its entire body (through the closing `},`) with:

```javascript
  // Speed progression chart: X = distance, Y = pct vs age-group benchmark (0 poor → 100 elite),
  // background colored by tier, one polyline per session with all 3 distances recorded.
  // Returns '' when no qualifying session exists.
  _renderSpeedCurve(player) {
    const SPRINT_KEYS = ['sprint5m', 'sprint30m', 'sprint40yd'];
    const SPRINT_LABELS = ['5m', '30m', '40yd'];
    const ageGroup = player.ageGroup;
    if (!ageGroup) return '';

    // Collect thresholds for each distance once
    const thresholds = SPRINT_KEYS.map(tk => Benchmarks.getThresholds(ageGroup, tk));
    if (thresholds.some(t => !t)) return '';

    // Group sessions by date across all three distances
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

    // Cap at 6 most recent on the chart (table still shows all)
    const charted = completeSessions.slice(-6);

    // SVG geometry
    const width = 580, height = 240;
    const plot = { left: 70, right: 480, top: 10, bottom: 200 };
    const plotW = plot.right - plot.left;
    const plotH = plot.bottom - plot.top;
    const xPos = [plot.left, plot.left + plotW / 2, plot.right];

    // pct → Y (0 pct = bottom, 100 pct = top)
    const pctToY = (p) => plot.bottom - (p / 100) * plotH;

    // Band edges: 100 → 75 → 50 → 25 → 0 maps top → bottom
    const bandStops = [100, 75, 50, 25, 0];
    const bands = [
      { from: 100, to: 75, color: '#3182CE', label: 'ELITE' },
      { from: 75,  to: 50, color: '#38A169', label: 'GOOD' },
      { from: 50,  to: 25, color: '#ED8936', label: 'AVG' },
      { from: 25,  to: 0,  color: '#E53E3E', label: 'BELOW' },
    ];

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">`;

    // Benchmark zone bands
    for (const b of bands) {
      const y = pctToY(b.from);
      const h = pctToY(b.to) - y;
      svg += `<rect x="${plot.left}" y="${y.toFixed(1)}" width="${plotW}" height="${h.toFixed(1)}" fill="${b.color}" fill-opacity="0.10"/>`;
      // Right-edge label
      const labelY = (y + h / 2 + 3).toFixed(1);
      svg += `<text x="${plot.right + 8}" y="${labelY}" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="9" fill="${b.color}" opacity="0.85">${b.label}</text>`;
    }

    // Hairline dividers between bands
    for (const stop of [75, 50, 25]) {
      svg += `<line x1="${plot.left}" y1="${pctToY(stop).toFixed(1)}" x2="${plot.right}" y2="${pctToY(stop).toFixed(1)}" stroke="#fff" stroke-width="1" opacity="0.6"/>`;
    }

    // Vertical gridlines + X labels
    for (let i = 0; i < SPRINT_LABELS.length; i++) {
      svg += `<line x1="${xPos[i]}" y1="${plot.top}" x2="${xPos[i]}" y2="${plot.bottom}" stroke="#D8D5CC" stroke-width="0.5"/>`;
      svg += `<text x="${xPos[i]}" y="${height - 10}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="11" fill="#444">${SPRINT_LABELS[i]}</text>`;
    }

    // Lines per session
    for (let si = 0; si < charted.length; si++) {
      const s = charted[si];
      const style = Report._speedSessionStyle(si, charted.length);
      // Compute pct for each distance using its own thresholds (lowerIsBetter = true for sprints)
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
```

- [ ] **Step 2: `node -c js/report.js`**

- [ ] **Step 3: Commit**

```bash
git add js/report.js
git commit -m "feat(family-report): rewrite speed curve with percentile Y and benchmark bands"
```

---

## Task 3: Add legend + results table renderers

**Files:**
- Modify: `js/report.js` — add two methods directly below `_renderSpeedCurve`

- [ ] **Step 1: Add `_renderSpeedLegend(player)` and `_renderSpeedResultsTable(player)`**

```javascript
  // Date legend below the speed curve. Shows one swatch per chart-rendered session.
  // Returns '' if the chart was omitted (no complete session).
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
      if (charted.length >= 3 && i === charted.length - 1) suffix = ' (latest)';
      else if (charted.length >= 3 && i === 0) suffix = ' (oldest)';
      else if (charted.length === 2 && i === charted.length - 1) suffix = ' (latest)';
      return `
        <span class="rpt-speed-legend-item" style="color:${style.color}">
          <svg width="20" height="3" style="overflow:visible"><line x1="0" y1="1.5" x2="20" y2="1.5" stroke="${style.color}" stroke-width="${style.stroke}" stroke-opacity="${style.opacity}"/></svg>
          ${fmt(s.date)}${suffix}
        </span>`;
    }).join('');

    return `<div class="rpt-speed-legend">${items}</div>`;
  },

  // Results table: one row per session that has at least one sprint result.
  // Date column is colored to match the chart line; sessions not represented in the chart use neutral gray.
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

    // Identify which sessions were charted (had all 3 distances) so we know which dates get color
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
      const cells = s.times.map(t => t == null ? '<span class="rpt-speed-na">—</span>' : `${Number(t).toFixed(2)}s`);
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
```

- [ ] **Step 2: `node -c js/report.js`**

- [ ] **Step 3: Commit**

```bash
git add js/report.js
git commit -m "feat(family-report): add speed legend and results table renderers"
```

---

## Task 4: Wire latest-test pill + legend + table into `_renderSpeedCard`

**Files:**
- Modify: `js/report.js` — `_renderSpeedCard` (around line 538)

- [ ] **Step 1: Replace `_renderSpeedCard` body**

Find `_renderSpeedCard(player) {` and replace its body (through the closing `},`) with:

```javascript
  _renderSpeedCard(player) {
    const SPRINT_KEYS = ['sprint5m', 'sprint30m', 'sprint40yd'];

    const presentKeys = SPRINT_KEYS.filter(tk => {
      const td = player.tests?.[tk];
      return td && td.best != null;
    });
    if (presentKeys.length === 0) return '';

    const desc = TEST_DESCRIPTIONS.speed || '';
    const ageGroup = player.ageGroup;

    // Latest-test pill: most recent date across all three sprint distances
    let latestDate = null;
    for (const tk of presentKeys) {
      const latest = DB.getLatestSession(player, tk);
      if (latest?.date && (!latestDate || latest.date > latestDate)) latestDate = latest.date;
    }
    const fmtDate = (iso) => {
      const d = new Date(iso + 'T12:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const pillHtml = latestDate
      ? `<div class="rpt-speed-latest-pill"><span class="rpt-speed-latest-pill-lbl">Latest test</span><span class="rpt-speed-latest-pill-date">${fmtDate(latestDate)}</span></div>`
      : '';

    // Threshold rows (unchanged)
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
```

- [ ] **Step 2: `node -c js/report.js`**

- [ ] **Step 3: Commit**

```bash
git add js/report.js
git commit -m "feat(family-report): wire latest-test pill, legend, and results table into Speed card"
```

---

## Task 5: Add CSS for new pieces

**Files:**
- Modify: `css/report.css` — append at the end of file

- [ ] **Step 1: Append**

```css
/* ── Family Report: Speed Card v2 (Pill + Legend + Results Table) ─ */

.rpt-speed-latest-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 14px 11px;
  padding: 3px 10px;
  background: rgba(227, 0, 15, 0.06);
  border-left: 2px solid #E3000F;
  border-radius: 0 4px 4px 0;
  font-family: var(--font-cond);
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--dark);
}

.rpt-speed-latest-pill-lbl  { color: var(--gray-500); }
.rpt-speed-latest-pill-date { color: #E3000F; font-weight: 800; }

.rpt-speed-curve-wrap .rpt-speed-curve-caption {
  font-family: var(--font-cond);
  font-weight: 600;
  font-size: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--gray-500);
  margin-bottom: 8px;
}

.rpt-speed-legend {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding-left: 11px;
}

.rpt-speed-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-cond);
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.rpt-speed-results-table {
  margin-top: 14px;
  border-collapse: collapse;
  width: 100%;
  font-size: 11px;
}

.rpt-speed-results-table th,
.rpt-speed-results-table td {
  text-align: left;
  padding: 6px 10px;
  border-bottom: 1px solid var(--rpt-warm-200);
}

.rpt-speed-results-table th {
  font-family: var(--font-cond);
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--gray-500);
  background: var(--rpt-warm-50);
}

.rpt-speed-results-table td {
  font-family: var(--font-cond);
  font-weight: 600;
  font-size: 12px;
  color: var(--dark);
}

/* First-column date colored to match the chart line */
.rpt-speed-results-table tbody tr td:first-child {
  font-weight: 800;
  color: var(--c, #888);
}

.rpt-speed-results-table tbody tr td:first-child::before {
  content: '\2022';
  color: var(--c, #888);
  margin-right: 6px;
  font-size: 12px;
}

/* Latest row: red across all cells */
.rpt-speed-results-table tbody tr[data-latest] td {
  font-weight: 800;
  color: #E3000F;
}

.rpt-speed-na {
  color: var(--gray-500);
  font-weight: 500;
}

@media print {
  .rpt-speed-latest-pill,
  .rpt-speed-results-table tbody tr td,
  .rpt-speed-legend-item {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/report.css
git commit -m "style(family-report): styles for speed card pill, legend, and results table"
```

---

## Task 6: Verify in browser + PDF

- [ ] **Step 1:** Confirm dev server up: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/` → expect 200.

- [ ] **Step 2:** Open the family report for a player with 3+ sprint sessions. Use Playwright to inspect:

```javascript
async () => {
  const players = await DB.getAll();
  // Find one with 3+ sprint sessions (all 3 distances per session)
  return players.filter(p => {
    const d = ['sprint5m', 'sprint30m', 'sprint40yd'].map(k => p.tests?.[k]?.sessions?.filter(s => s.best != null) || []);
    if (d.some(x => x.length === 0)) return false;
    // Find shared dates across all three
    const dates = d[0].map(s => s.date).filter(date => d[1].some(s => s.date === date) && d[2].some(s => s.date === date));
    return dates.length >= 3;
  }).slice(0, 5).map(p => ({ id: p.id, name: p.firstName + ' ' + p.lastName, ageGroup: p.ageGroup }));
}
```

- [ ] **Step 3:** Navigate to that player's family report, click Preview, capture:

```javascript
async () => {
  const card = Array.from(document.querySelectorAll('.rpt-test-card-block')).find(c => c.querySelector('.rpt-test-card-block-name')?.textContent.trim() === 'Speed');
  return {
    hasPill: !!card?.querySelector('.rpt-speed-latest-pill'),
    pillText: card?.querySelector('.rpt-speed-latest-pill')?.textContent?.trim(),
    rowCount: card?.querySelectorAll('.rpt-test-card-block-row').length,
    hasChart: !!card?.querySelector('.rpt-speed-curve-wrap'),
    legendItemCount: card?.querySelectorAll('.rpt-speed-legend-item').length,
    tableRowCount: card?.querySelectorAll('.rpt-speed-results-table tbody tr').length,
    polylineCount: card?.querySelectorAll('.rpt-speed-curve-wrap polyline').length,
  };
}
```

Confirm:
- `hasPill` true, `pillText` shows latest date
- `rowCount` = 3
- `hasChart` true
- `legendItemCount` matches the chart's polyline count
- `tableRowCount` >= polylineCount

- [ ] **Step 4:** Visually inspect via screenshot. Confirm benchmark bands top→bottom are Elite (blue), Good (green), Avg (orange), Below (red). Latest line is red and thicker. Date column in table matches line colors.

- [ ] **Step 5:** Click `Export PDF`. Confirm new chart + table render in the PDF; no broken layouts.

- [ ] **Step 6:** Edge case — find a player with only 1 complete sprint session: legend has one entry, table has one row, chart has one red line.

- [ ] **Step 7:** Edge case — find a player with sprint sessions but never all 3 distances together: chart and legend should be omitted; table still renders with `—` placeholders.

---

## Self-Review Checklist

- [ ] Spec section "Layout" → Tasks 4 (markup) + 5 (styles)
- [ ] Spec section "Chart specifics" (percentile Y, bands, multi-color lines) → Task 2
- [ ] Spec section "Date legend" → Task 3 (`_renderSpeedLegend`)
- [ ] Spec section "Results table" → Task 3 (`_renderSpeedResultsTable`) + Task 5 (color CSS)
- [ ] Spec section "Edge cases" → guards inside the renderers; verified in Task 6 steps 6 & 7
- [ ] No spec requirement without a corresponding task
