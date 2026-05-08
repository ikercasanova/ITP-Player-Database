# Speed Card v2 — Speed Curve Redesign + Results Table

## Context

The Speed card on the family report (shipped 2026-05-06) shows a "speed curve" chart where X = sprint distance, Y = raw time. The chart works mechanically but isn't legible to parents:

- **No benchmark coloring on the Y-axis.** Each sprint distance has different thresholds (5m elite = 0.97s, 30m elite = 4.02s, 40yd elite = 4.55s) so a single raw-time Y-axis can't show academy benchmark bands meaningfully. Parents see a line that means nothing without context.
- **No way to tell which line is which testing session.** All older sessions render as identical light-gray polylines; latest is red. With three or more sessions a parent can't match a line to a date.
- **Hard to find the actual numbers.** The chart hides the seconds; parents have to count points and guess.
- **No date label on the headline numbers above the chart.** The threshold rows show 5m / 30m / 40yd values but don't say *when* the player ran them.

This redesign normalizes the chart to a percentile Y-axis (so benchmark bands work uniformly), color-codes sessions distinctly with the latest still emphasized, adds a "Latest test · <date>" pill above the threshold rows, and adds a results table below the chart with raw values per session per distance.

## Goals

- Replace the raw-time Y-axis with a 0–100% performance level Y-axis backed by colored benchmark bands (Below Avg / Avg / Good / Elite), matching the visual language of the other per-test progression charts.
- Render each session in a distinct color: latest in FC Köln red and thicker; previous sessions in steel blue and warm tan respectively.
- Add a color-coded date legend below the chart so each line can be matched to its date.
- Add a "Latest test · <date>" pill under the description, so the threshold rows above are explicitly labeled as the latest session's data.
- Add a small results table below the chart showing every session's raw times for 5m, 30m, 40yd. The first-column date in each row uses the same color as that session's line (with a leading dot indicator). Latest row stays bold across all cells.

## Non-Goals (this pass)

- Changes to other test cards (CMJ, Broad Jump, etc.). The "Latest test" pill is added to the Speed card only in this pass; rolling it out to every card is a follow-up.
- Restructuring the underlying data model. We continue to read `player.tests.sprint5m / sprint30m / sprint40yd` as today.
- Visual changes to the threshold rows themselves (5m / 30m / 40yd) above the chart.
- Changes to other pages (profile, analytics).

## Design

### Layout (top to bottom)

1. **Heading:** `Speed`
2. **Description:** existing one-sentence parent-facing copy
3. **NEW — Latest test pill:** `LATEST TEST · MAY 8, 2026`. Subtle red left accent, faint red tinted background, Barlow Condensed 700 uppercase. Date is computed as the most recent `session.date` across all three sprint distances the player has results for. If different distances have different latest dates, use the most recent across all three.
4. **Threshold rows (unchanged):** 5m sprint, 30m sprint, 40yd dash with their existing latest value + threshold scale.
5. **NEW — Speed progression chart** (replaces today's raw-time speed curve)
6. **NEW — Date legend** below the chart
7. **NEW — Results table** with every session's raw values

### Chart specifics

- **X-axis:** three fixed positions labeled `5m`, `30m`, `40yd`.
- **Y-axis:** 0 (bottom) → 100 (top), representing performance level vs. age-group benchmark via `Report._computeVisualPct(value, thresh, true /* lowerIsBetter */)`.
- **Background bands** (top to bottom):
  - 75–100%: Elite, blue tint (`#3182CE` at 0.10 alpha).
  - 50–75%: Good, green tint (`#38A169` at 0.10 alpha).
  - 25–50%: Avg, orange tint (`#ED8936` at 0.10 alpha).
  - 0–25%: Below Avg, red tint (`#E53E3E` at 0.10 alpha).
  - White hairline dividers (1px, 0.6 opacity) between each band.
  - Right-edge band labels: `ELITE`, `GOOD`, `AVG`, `BELOW` in Barlow Condensed 700 9px, colored to match each band at 0.85 opacity.
- **Vertical gridlines** at 5m / 30m / 40yd positions (light gray `#D8D5CC`, 0.5 stroke).
- **Bottom X-axis labels** in Barlow Condensed 700 11px.
- **Polylines** — one per testing session that has all three sprint distances recorded. Sessions sorted by date, oldest first. Color, stroke, and dot size vary by recency:
  - **Latest session** (most recent date): `#E3000F` red, stroke-width 2.8, full opacity, dot radius 4.2px.
  - **2nd most recent**: steel blue `#5B7BA8`, stroke 1.9, opacity 0.95, dot 3.2px.
  - **3rd most recent**: warm tan `#C49B6C`, stroke 1.7, opacity 0.95, dot 3.0px.
  - **Older than 3rd** (4+ sessions): cycle through the same `#5B7BA8` and `#C49B6C` palette, growing fainter with each step (opacity reduced by 0.15 per generation, floor 0.45). Cap at 6 lines on chart; if more, drop the oldest from the chart but still include in the table.
- **Empty state:** if no session has all three distances, omit the chart entirely (existing behavior). The threshold rows + table still render whatever data is present.

### Date legend

Below the chart, a horizontal flex list with one swatch per session shown in the chart. Each swatch:
- A short colored line drawn in SVG (20×3 px) matching the session's line stroke and color.
- The session date in `Mon DD, YYYY` format (e.g., `May 8, 2026`).
- The latest session is suffixed with `(latest)`; the oldest with `(oldest)` (only if there are 3+ sessions, to avoid noise on 2-session players).

### Results table

A standard `<table>` with header row `Session | 5m | 30m | 40yd`, one body row per session that has *at least one* sprint result (i.e., even if a session is missing a distance, it appears in the table with `—` for the missing column). Sessions sorted by date, oldest at top, latest at bottom.

- **First column** (date) uses the same color as that session's line in the chart, with a leading bullet (●) of that color and font-weight 800.
- **Sessions not represented in the chart** (i.e., missing one or more distances so they didn't qualify for a polyline): use a neutral `#888` for the date and ● bullet — no color match because they have no corresponding line.
- **Latest row** uses red for all four cells (date + values), font-weight 800.
- Other cells use the default text color and 600 weight.
- Missing values render as `—` in muted gray.

### Edge cases

| Case | Behavior |
|---|---|
| Player has only 1 sprint session, all 3 distances | Chart has 1 line (latest red), legend has 1 entry, table has 1 row. |
| Player has multiple sessions but none with all 3 distances | Chart omitted entirely, legend omitted, table still renders all sessions with `—` for missing columns. |
| Player has more than 6 sessions with full data | Chart shows the 6 most recent, legend has 6 entries, table shows all sessions. |
| Different distances have different latest session dates | "Latest test" pill shows the *most recent* date across all three. Each threshold row continues to show that distance's own latest value (existing behavior). |

### Files to modify

| File | Change |
|---|---|
| `js/report.js` | Rewrite `_renderSpeedCurve(player)` to produce the new SVG (percentile Y, banded background, multi-color session lines). Update `_renderSpeedCard(player)` to: (a) emit the "Latest test" pill, (b) emit the date legend below the chart, (c) emit the results table. Also extract a small `_computeSessionDates(player)` helper if the date math gets repeated. |
| `css/report.css` | Add `.rpt-speed-latest-pill`, `.rpt-speed-legend`, `.rpt-speed-results-table` and descendants. Reuse the existing `.rpt-test-card-block-*` styles for the threshold rows and `.rpt-test-card-chart` for the chart container. |

No changes to `js/benchmarks.js`, no data migrations, no changes to other test cards.

## Verification

1. Serve the app and open a registered player with 3+ sprint testing sessions. Open Family Report → Preview.
2. Confirm:
   - "Latest test · <date>" pill appears under the description, before the threshold rows.
   - Speed progression chart shows colored benchmark bands (Below / Avg / Good / Elite) with Y-axis going up = better.
   - Each session is a distinct color: latest red and thicker, others in steel blue / warm tan.
   - Date legend below the chart matches the line colors.
   - Results table below shows all sessions with the date column color-matched to the chart line.
3. Open a player with only 1 sprint session: chart should still render with one red line; legend has just one entry.
4. Open a player with no complete sprint sessions: chart and legend omitted; table renders with `—` for missing values.
5. PDF export: the new chart and table render correctly in the family report PDF.
6. Cross-age-group spot check: U-17, U-19, U-21 players. Y-axis percentile should reflect the correct age-group thresholds (a 30m of 4.10s lands in different bands across ages).
