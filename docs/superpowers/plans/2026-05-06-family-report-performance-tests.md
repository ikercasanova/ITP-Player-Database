# Family Report Performance Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the family report's "Performance Tests" + "Season Progression Charts" sections with one merged section where each test gets a vertical-stack card containing a one-sentence description, latest result with threshold scale, and a per-test progression chart. Sprints (5m / 30m / 40yd) are unified into one Speed card with a custom SVG "speed curve" chart (X = distance, Y = time, one polyline per session).

**Architecture:** All new rendering lives on the existing `Report` object in `js/report.js`. Per-test cards reuse the existing `Profile.renderProgressionChart` helper for the progression line chart (no need to reinvent SVG line rendering). The Speed card has a brand-new `_renderSpeedCurve` SVG renderer because the X-axis is distance, not time. Threshold rows reuse the `.rpt-thresh-*` styles already defined in `css/report.css` and a duplicated `_computeVisualPct` helper from the trial report. Static per-test description strings live in `js/benchmarks.js` next to `TEST_DEFS`.

**Tech Stack:** Vanilla JS (no build step), HTML, CSS. SVG for charts. Manual verification via Playwright (no test runner). Git commits between tasks.

**Reference spec:** `docs/superpowers/specs/2026-05-06-family-report-performance-tests-design.md`

**Files modified across all tasks:**
- `js/benchmarks.js` — add TEST_DESCRIPTIONS map (Task 1)
- `js/report.js` — add helpers + new render methods, replace `_renderPerformanceTests`, drop `_renderProgressionCharts` call (Tasks 2–6, 7)
- `css/report.css` — add card / chart / caption styles (Task 8)

---

## Task 1: Add TEST_DESCRIPTIONS map to benchmarks.js

**Files:**
- Modify: `js/benchmarks.js` (add new constant after `TEST_DEFS` block, around line 20)

- [ ] **Step 1: Add the constant**

Open `js/benchmarks.js`. Just below the `TEST_DEFS` object (line ~20) and before `TEST_GROUPS` (line ~23), insert:

```javascript
/** Plain-English, parent-facing one-sentence description per test.
 *  The 'speed' key is used by the unified Speed card on the family report,
 *  which covers sprint5m + sprint30m + sprint40yd together. */
const TEST_DESCRIPTIONS = {
  speed:      'How fast a player can run at top speed, for example on a breakaway or racing for a through ball.',
  cmj:        'How high a player can jump from a standing start, for example to rise above defenders on a corner or win a header.',
  broadJump:  "How explosive a player's first step is, useful for breaking away from a defender or accelerating into space.",
  trapBarDL:  'Lower body strength used to hold off opponents in duels and stay strong on the ball under contact.',
  pullUps:    'Upper body and grip strength, important for shielding the ball, holding position, and winning physical battles.',
  ift3015:    'How well a player can keep running at intensity, the engine that lets them stay sharp from kickoff to final whistle.',
  passingAcc: 'Precision and consistency on the ball, measuring how reliably a player delivers the right pass in the right place under pressure.',
  dribbling:  'Close control speed with the ball at feet, measuring how quickly a player can navigate tight spaces or beat a defender.',
};
```

- [ ] **Step 2: Sanity check the file still parses**

Open `http://localhost:8081/` in a browser and confirm the app still loads (no SyntaxError in console). The constant is used only in later tasks; at this point we just verify it's syntactically valid.

- [ ] **Step 3: Commit**

```bash
git add js/benchmarks.js
git commit -m "feat(family-report): add TEST_DESCRIPTIONS map for per-test parent-facing copy"
```

---

## Task 2: Add `Report._computeVisualPct` helper

The trial report has this helper to make threshold-bar fill widths align with the visible mark centers (12.5 / 37.5 / 62.5 / 87.5%). The family report needs the same logic. Duplicate it onto `Report` so the two reports stay independent.

**Files:**
- Modify: `js/report.js` (insert helper inside the `Report` object, right after the existing helpers — search for the `// ── Helpers ─────` block; if none exists at the bottom, place the helper directly above `_exportPDF`)

- [ ] **Step 1: Add the helper**

Inside the `Report` object literal in `js/report.js`, add:

```javascript
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
```

- [ ] **Step 2: Verify in browser console**

Reload the app and run in the DevTools console:

```javascript
Report._computeVisualPct(213, { poor: 190, average: 210, good: 230, elite: 245 }, false)
```

Expected: a number around 41.25 (just past the average mark).

- [ ] **Step 3: Commit**

```bash
git add js/report.js
git commit -m "feat(family-report): add _computeVisualPct helper for visually-aligned threshold fills"
```

---

## Task 3: Add `Report._renderSingleTestCard(player, testKey)`

Renders one self-contained card for a single (non-sprint) test. Returns `''` when the player has no result for that test.

**Files:**
- Modify: `js/report.js` (insert above the existing `_renderPerformanceTests` at line ~482)

- [ ] **Step 1: Add the method**

In `js/report.js`, add this method to the `Report` object directly above `_renderPerformanceTests`:

```javascript
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

    return `
      <div class="rpt-test-card-block" data-level="${level}">
        <div class="rpt-test-card-block-name">${def.name}</div>
        ${desc ? `<div class="rpt-test-card-block-desc">${desc}</div>` : ''}
        <div class="rpt-test-card-block-row">
          <div class="rpt-test-card-block-row-name">Latest</div>
          <div class="rpt-test-card-block-row-value" data-level="${level}">${fmt(value)}<span class="rpt-test-card-block-row-unit">${def.unit}</span></div>
          <div class="rpt-test-card-block-row-bar">${scaleHtml}</div>
        </div>
        ${chartHtml}
      </div>`;
  },
```

- [ ] **Step 2: Smoke test in browser console**

Reload, then in DevTools:

```javascript
const players = await DB.getAll();
const p = players.find(x => x.tests?.cmj?.best != null);
Report._renderSingleTestCard(p, 'cmj').slice(0, 200);
```

Expected: a string starting with `<div class="rpt-test-card-block" data-level="...">`.

- [ ] **Step 3: Commit**

```bash
git add js/report.js
git commit -m "feat(family-report): add _renderSingleTestCard for vertical-stack test cards"
```

---

## Task 4: Add `Report._renderSpeedCard(player)`

The unified sprint card. Holds 3 threshold rows (5m, 30m, 40yd) and the speed curve chart (added in Task 5; for now, this method emits the threshold rows and a placeholder for the chart).

**Files:**
- Modify: `js/report.js` (insert directly below `_renderSingleTestCard`)

- [ ] **Step 1: Add the method**

```javascript
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

    // Speed curve chart (added in Task 5)
    const curveHtml = Report._renderSpeedCurve(player);

    return `
      <div class="rpt-test-card-block">
        <div class="rpt-test-card-block-name">Speed</div>
        ${desc ? `<div class="rpt-test-card-block-desc">${desc}</div>` : ''}
        ${rows}
        ${curveHtml}
      </div>`;
  },
```

- [ ] **Step 2: Add a stub `_renderSpeedCurve` so this method works in isolation**

Right below `_renderSpeedCard`, add a temporary stub. It will be replaced in Task 5:

```javascript
  // Stub — replaced in Task 5
  _renderSpeedCurve(player) { return ''; },
```

- [ ] **Step 3: Smoke test in browser console**

```javascript
const players = await DB.getAll();
const p = players.find(x => x.tests?.sprint30m?.best != null);
Report._renderSpeedCard(p).slice(0, 200);
```

Expected: a string starting with `<div class="rpt-test-card-block">`.

- [ ] **Step 4: Commit**

```bash
git add js/report.js
git commit -m "feat(family-report): add _renderSpeedCard with sprint threshold rows"
```

---

## Task 5: Implement `Report._renderSpeedCurve(player)`

Replace the Task 4 stub with the real SVG speed curve. X-axis = sprint distance (5m, 30m, 40yd), Y-axis = time (seconds). Each session that has all three distances is one polyline. Latest session in red, older sessions in light gray.

**Files:**
- Modify: `js/report.js` (replace the stub from Task 4)

- [ ] **Step 1: Replace the stub**

Find the `_renderSpeedCurve(player) { return ''; }` line added in Task 4 and replace it with:

```javascript
  // Speed curve: X = sprint distance, Y = time, one polyline per session.
  // A session is included only if it has all three distances (5m, 30m, 40yd) recorded.
  _renderSpeedCurve(player) {
    const SPRINT_KEYS = ['sprint5m', 'sprint30m', 'sprint40yd'];
    const SPRINT_LABELS = ['5m', '30m', '40yd'];

    // Group sessions by date across the three distances
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

    // SVG geometry
    const width = 540, height = 160;
    const margin = { top: 18, right: 14, bottom: 32, left: 36 };
    const plotW = width - margin.left - margin.right;
    const plotH = height - margin.top - margin.bottom;

    const xPositions = [
      margin.left,
      margin.left + plotW / 2,
      margin.left + plotW
    ];

    const allTimes = completeSessions.flatMap(s => s.times);
    const tMin = Math.min(...allTimes);
    const tMax = Math.max(...allTimes);
    const pad = (tMax - tMin || 0.5) * 0.08;
    const yMin = tMin - pad;
    const yMax = tMax + pad;
    const valueToY = (v) => margin.top + ((v - yMin) / (yMax - yMin)) * plotH;

    const RED = '#E3000F';
    const GRAY = '#B8B5AE';

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">`;
    svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#FAFAFA" rx="4"/>`;

    // Vertical grid lines + X-axis labels
    for (let i = 0; i < SPRINT_LABELS.length; i++) {
      svg += `<line x1="${xPositions[i]}" y1="${margin.top}" x2="${xPositions[i]}" y2="${margin.top + plotH}" stroke="#E0E0E0" stroke-width="0.5"/>`;
      svg += `<text x="${xPositions[i]}" y="${height - 12}" text-anchor="middle" font-family="Barlow Condensed, sans-serif" font-weight="700" font-size="10" fill="#666" letter-spacing="0.5">${SPRINT_LABELS[i]}</text>`;
    }

    // Y-axis: just min/max time labels (subtle)
    svg += `<text x="${margin.left - 6}" y="${margin.top + 4}" text-anchor="end" font-family="Barlow Condensed, sans-serif" font-size="9" fill="#999">${tMin.toFixed(2)}s</text>`;
    svg += `<text x="${margin.left - 6}" y="${margin.top + plotH}" text-anchor="end" font-family="Barlow Condensed, sans-serif" font-size="9" fill="#999">${tMax.toFixed(2)}s</text>`;

    // One polyline per session
    for (let si = 0; si < completeSessions.length; si++) {
      const s = completeSessions[si];
      const isLatest = si === completeSessions.length - 1;
      const color = isLatest ? RED : GRAY;
      const opacity = isLatest ? 1 : 0.55;
      const stroke = isLatest ? 2.5 : 1.5;

      const pts = s.times.map((t, i) => `${xPositions[i].toFixed(1)},${valueToY(t).toFixed(1)}`).join(' ');
      svg += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-opacity="${opacity}" stroke-linejoin="round" stroke-linecap="round"/>`;

      for (let i = 0; i < 3; i++) {
        svg += `<circle cx="${xPositions[i].toFixed(1)}" cy="${valueToY(s.times[i]).toFixed(1)}" r="${isLatest ? 3.5 : 2.5}" fill="${color}" opacity="${opacity}"/>`;
      }
    }

    svg += '</svg>';

    return `
      <div class="rpt-test-card-chart rpt-speed-curve-wrap">
        <div class="rpt-speed-curve-caption">Speed curve. Each line is one testing session. Lower lines mean faster runs.</div>
        ${svg}
      </div>`;
  },
```

- [ ] **Step 2: Smoke test in browser console**

```javascript
const players = await DB.getAll();
const p = players.find(x => (x.tests?.sprint5m?.sessions?.length || 0) >= 1 && (x.tests?.sprint30m?.sessions?.length || 0) >= 1 && (x.tests?.sprint40yd?.sessions?.length || 0) >= 1);
Report._renderSpeedCurve(p).slice(0, 300);
```

Expected: a string containing `<svg`, OR `''` if no session has all 3 distances. Either is acceptable.

- [ ] **Step 3: Commit**

```bash
git add js/report.js
git commit -m "feat(family-report): implement speed curve SVG renderer for the Speed card"
```

---

## Task 6: Add CSS for the new card layout

**Files:**
- Modify: `css/report.css` (append to the family report section, around line 859 — directly after the existing `.rpt-thresh-direction` block; place before the Two Column Layout section so the family-report block stays grouped)

- [ ] **Step 1: Add the styles**

Append to `css/report.css`:

```css
/* ── Family Report: Vertical-Stack Test Cards ────────────────── */

.rpt-test-card-block {
  background: #FFFFFF;
  border: 1px solid var(--rpt-warm-200);
  border-radius: 8px;
  padding: 16px 20px 18px 20px;
  margin-bottom: 14px;
  page-break-inside: avoid;
}

.rpt-test-card-block-name {
  font-family: var(--font-cond);
  font-weight: 800;
  font-size: 14px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--dark);
  border-left: 3px solid #E3000F;
  padding-left: 8px;
  margin-bottom: 4px;
}

.rpt-test-card-block-desc {
  font-size: 11px;
  font-style: italic;
  color: var(--gray-500, #6B6B6B);
  line-height: 1.5;
  margin: 4px 0 14px 11px;
}

.rpt-test-card-block-row {
  display: grid;
  grid-template-columns: 110px 90px 1fr;
  gap: 12px;
  align-items: center;
  padding: 5px 0;
  border-bottom: 1px dashed var(--rpt-warm-200);
}

.rpt-test-card-block-row:last-of-type {
  border-bottom: none;
}

.rpt-test-card-block-row-name {
  font-family: var(--font-cond);
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--dark);
}

.rpt-test-card-block-row-value {
  font-family: var(--font-cond);
  font-weight: 800;
  font-size: 18px;
  line-height: 1;
  text-align: right;
}

.rpt-test-card-block-row-value[data-level="poor"]    { color: var(--bench-poor); }
.rpt-test-card-block-row-value[data-level="average"] { color: var(--bench-avg); }
.rpt-test-card-block-row-value[data-level="good"]    { color: var(--bench-good); }
.rpt-test-card-block-row-value[data-level="elite"]   { color: var(--bench-elite); }
.rpt-test-card-block-row-value[data-level="none"]    { color: var(--gray-500, #6B6B6B); }

.rpt-test-card-block-row-unit {
  font-family: var(--font-cond);
  font-weight: 600;
  font-size: 10px;
  color: var(--gray-500, #6B6B6B);
  margin-left: 2px;
  letter-spacing: 0.5px;
}

.rpt-test-card-block-row-bar {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rpt-test-card-chart {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--rpt-warm-200);
}

.rpt-speed-curve-caption {
  font-family: var(--font-cond);
  font-weight: 600;
  font-size: 10px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--gray-500, #6B6B6B);
  margin-bottom: 8px;
}

@media print {
  .rpt-test-card-block,
  .rpt-test-card-block-row-value,
  .rpt-thresh-fill {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
```

- [ ] **Step 2: Verify styles parse**

Reload the app, open DevTools and confirm no CSS error in the Console. The styles aren't applied to anything yet (we wire them in Task 7).

- [ ] **Step 3: Commit**

```bash
git add css/report.css
git commit -m "style(family-report): add vertical-stack test card layout"
```

---

## Task 7: Wire the new section into `_showPreview` and replace `_renderPerformanceTests`

This is the only behavior-changing task. Everything before now was additive.

**Files:**
- Modify: `js/report.js` lines 482-567 (`_renderPerformanceTests` body) and `js/report.js` line 363 (remove `_renderProgressionCharts` call from `_showPreview`)

- [ ] **Step 1: Replace `_renderPerformanceTests` body**

In `js/report.js`, find the current `_renderPerformanceTests` method (starts around line 482) and replace its body so it now returns the merged-section markup:

```javascript
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
```

- [ ] **Step 2: Remove the standalone progression-charts call from `_showPreview`**

In `_showPreview` (around line 344), find this line:

```javascript
            ${Report._renderProgressionCharts(player)}
```

Delete it.

- [ ] **Step 2b: Delete the now-unused `_renderProgressionCharts` method**

Find the `_renderProgressionCharts` method (around line 623) and delete the entire method (from the `// ── Progression Charts` comment through the closing `},` after the `</div>` return). Per the spec, the method is removed entirely — no leftover dead code.

After deletion, search the repo to confirm no other caller exists:

```bash
grep -rn "_renderProgressionCharts" js/ css/ index.html
```

Expected: zero matches.

- [ ] **Step 3: Reload + sanity check**

Open `http://localhost:8081/` and navigate to a registered player's Family Report. Click `Preview Report`. Confirm:

- A single section titled "Performance Tests" appears (not two).
- Cards stack vertically.
- The first card the player qualifies for shows: name heading → italic description → threshold row → progression chart (if 2+ sessions).
- The Speed card shows 3 sprint rows + speed curve (if at least one session has all three distances).

- [ ] **Step 4: Commit**

```bash
git add js/report.js
git commit -m "feat(family-report): merge performance tests + season progression into one stacked section"
```

---

## Task 8: Verify end-to-end with Playwright

This is the formal verification gate. Use Playwright to inspect the rendered DOM on a real player.

**Files:**
- Read-only Playwright check; no file changes

- [ ] **Step 1: Make sure the dev server is running**

Run in a separate terminal if not already:

```bash
cd "C:/Users/ikcas/Desktop/ITP-Player-Database" && npx serve -l 8081
```

- [ ] **Step 2: Find a player with rich test data**

Open the app in your usual browser, open DevTools console, and run:

```javascript
const players = await DB.getAll();
players
  .filter(p => p.tests && Object.keys(p.tests).length >= 4)
  .map(p => ({ id: p.id, name: p.firstName + ' ' + p.lastName, ageGroup: p.ageGroup, testKeys: Object.keys(p.tests) }))
  .slice(0, 5);
```

Note one player ID with several test keys.

- [ ] **Step 3: Open that player's family report and capture structure**

In DevTools console:

```javascript
location.hash = '#report/<PLAYER_ID_FROM_STEP_2>';
// Wait for the builder to render, then click Preview, then run:
const cards = Array.from(document.querySelectorAll('.rpt-test-card-block')).map(c => ({
  name: c.querySelector('.rpt-test-card-block-name')?.textContent,
  hasDesc: !!c.querySelector('.rpt-test-card-block-desc'),
  rowCount: c.querySelectorAll('.rpt-test-card-block-row').length,
  hasChart: !!c.querySelector('.rpt-test-card-chart'),
  hasSpeedCurve: !!c.querySelector('.rpt-speed-curve-wrap')
}));
console.table(cards);
```

Confirm:
- Card names appear in the order: CMJ, Broad Jump, Trap Bar Deadlift, Pull-Ups, Speed, 30-15 IFT, Passing Accuracy, Dribbling (only the ones the player has).
- Single-test cards have `rowCount: 1`.
- Speed card has `rowCount: 3` (or fewer if only some distances) and `hasSpeedCurve: true` if any session has all 3.
- Cards with 2+ sessions have `hasChart: true`.

- [ ] **Step 4: Cross-age-group check**

Repeat Step 3 for one U-17 player and one U-21 player. The threshold mark numbers in `.rpt-thresh-mark` elements should reflect the per-age-group benchmarks (different numbers across ages).

- [ ] **Step 5: PDF export check**

Click `Export PDF` from the preview. Open the saved PDF (filename pattern: `ITP_Family_Report_*`). Confirm:

- Performance Tests section renders identically to the preview.
- No regression in other sections (eval section, coach evaluation, footer).
- No "Season Progression Charts" section appears.

- [ ] **Step 6: Edge case — sparse player**

Find a player with only 1 test type or 1 session in any test:

```javascript
const sparse = players.find(p => p.tests && Object.keys(p.tests).length === 1);
console.log(sparse?.id);
```

Open their family report. Confirm:

- Only the card for the test they have appears.
- If that test has only 1 session, no progression chart renders.
- If the player has no tests at all, no Performance Tests section renders.

- [ ] **Step 7: Commit a verification note (optional)**

If you discovered any visual nit during verification, fix it inline and commit. Otherwise no commit needed.

---

## Self-Review Checklist (run before declaring done)

Skim the spec and confirm each section maps to a task in this plan:

- [ ] **Section structure** (single section, no Season Progression) → Task 7
- [ ] **Per-test card layout** (name → desc → threshold row → chart) → Task 3
- [ ] **Sprint card** (3 rows + speed curve) → Tasks 4, 5
- [ ] **Per-test descriptions** (8 sentences, hardcoded) → Task 1
- [ ] **Edge cases** (no result, 1 session, no thresholds, sprint with 0 complete sessions) → covered by guards inside Tasks 3, 4, 5
- [ ] **File modifications listed** (`js/benchmarks.js`, `js/report.js`, `css/report.css`) → matches actual edits
- [ ] **Verification steps** → Task 8

If any spec requirement has no task, stop and add it before handing off.
