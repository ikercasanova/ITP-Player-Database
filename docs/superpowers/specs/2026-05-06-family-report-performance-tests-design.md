# Family Report — Performance Tests Section Redesign

## Context

The ITP Family Report currently has two physical-testing sections that show the same data twice:

1. **Performance Tests** — A grid of test cards with the player's latest result and a benchmark threshold scale.
2. **Season Progression Charts** — A separate grid of line charts plotting the same tests over time (only for tests with 2+ sessions).

Parents read the report end-to-end and see the same numbers twice with no narrative between them. They also have no idea *why* a 30m sprint or a CMJ matters. The numbers are abstract.

This redesign merges the two sections into a single, denser **Performance Tests** section where each test gets a dedicated card holding everything about that test: a one-sentence field-translation description, the latest result with threshold scale, and a progression chart.

This is a content-focused change. Visual design refresh, AI/narrative changes, and PDF page-flow improvements are noted as "out of scope" below and may follow in subsequent passes.

## Goals

- Merge "Performance Tests" + "Season Progression Charts" into one section, with each test treated as one self-contained card.
- Add a one-sentence plain-English field-translation description to each test so parents understand *why* the number matters.
- Group sprint distances (5m / 30m / 40yd) into a single unified Speed card, since they share one testing session and conceptually represent one capacity (top-speed running). 10m and 20m are intentionally excluded since they were not measured consistently across sessions and would create gaps in the speed curve.
- For the Speed card specifically, present session-over-session progression as a *speed curve* (X = distance, Y = time, one curve per session) so parents can see acceleration profile changes over the season, not just per-distance trends.
- Hide cards entirely for tests the player has not done.

## Non-Goals (this pass)

- Visual / typographic refresh of the rest of the family report (header, hero, eval section, coach evaluation, etc.).
- Changes to the AI narrative generation in `report-traits.js`.
- PDF page-flow / pagination work analogous to what we did for the trial report.
- Adding new test types beyond what already exists in `TEST_DEFS`.
- Editing the underlying testing entry workflow.

These are explicitly deferred to later passes.

## Design

### Section structure

One section, titled **Performance Tests**, replaces both the current `_renderPerformanceTests` (report.js:482-567) and `_renderProgressionCharts` (report.js:623-647) outputs. The current `_renderProgressionCharts` is deleted entirely; the chart logic moves inside each per-test card.

Cards render in this fixed order, matching the existing `TEST_DEFS` category order:

1. CMJ (Explosive Power)
2. Broad Jump (Explosive Power)
3. Trap Bar Deadlift (Explosive Power)
4. Pull-Ups (Strength)
5. **Speed** — unified card holding 5m, 30m, 40yd sprints (Speed)
6. 30-15 IFT (Endurance)
7. Passing Accuracy (Technical)
8. Dribbling (Technical)

### Per-test card layout

```
┌────────────────────────────────────────────────────────────────────┐
│ ▎ TEST NAME                                                         │
│   One-sentence field-translation description, italic, gray.         │
│                                                                     │
│   Latest    [big colored value][unit]   [poor avg good elite scale] │
│                                          [────────fill bar────────] │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │  Progression chart (full width, ~110px tall)                 │ │
│   │  Line chart over sessions, with benchmark zones in background│ │
│   └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

Card width: full column of the report (no 2-column grid like today). Each card is its own block.

The threshold row reuses the same `.rpt-thresh-scale` + `.rpt-thresh-bar` + `.rpt-thresh-fill` styles already used by the trial report's Physical Performance section, including the corrected visual-position fill width via `_computeVisualPct` logic. The helper is duplicated onto the `Report` object (same body as `TrialReport._computeVisualPct`); we don't introduce a shared module in this pass.

### Sprint card specifics

The Speed card has a unique structure:

```
┌────────────────────────────────────────────────────────────────────┐
│ ▎ SPEED                                                             │
│   How fast a player can run at top speed, for example on a          │
│   breakaway or racing for a through ball.                           │
│                                                                     │
│   5m sprint    1.05s   [scale][bar]                                 │
│   30m sprint   4.08s   [scale][bar]                                 │
│   40yd dash    4.85s   [scale][bar]                                 │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │  Speed curve. Each line is one testing session.              │ │
│   │  X = distance, Y = time. Lower lines = faster.               │ │
│   │  [chart]                                                      │ │
│   └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

The "speed curve" chart plots distance on X (5m, 30m, 40yd, labeled in their native units) and time on Y. Each testing session is one polyline connecting the player's recorded splits. Older sessions render in lighter gray; the latest session in red. A short caption above the chart explains how to read it ("Each line is one testing session. Lower lines mean faster runs.") so the visualization is approachable for parents seeing it for the first time.

A session is included in the curve only if it has all three distance times (5m, 30m, 40yd) recorded. Sessions with partial data are skipped from the curve but still contribute their values to the threshold rows above.

### Per-test descriptions

Static, hardcoded one-sentence descriptions stored as a `TEST_DESCRIPTIONS` constant in `js/benchmarks.js` directly below `TEST_DEFS`, keyed by test key. The Speed card uses a special `'speed'` key (since it covers multiple test keys). Same description shown for every player.

| Test | Description |
|---|---|
| Speed (sprint card) | How fast a player can run at top speed, for example on a breakaway or racing for a through ball. |
| CMJ | How high a player can jump from a standing start, for example to rise above defenders on a corner or win a header. |
| Broad Jump | How explosive a player's first step is, useful for breaking away from a defender or accelerating into space. |
| Trap Bar Deadlift | Lower body strength used to hold off opponents in duels and stay strong on the ball under contact. |
| Pull-Ups | Upper body and grip strength, important for shielding the ball, holding position, and winning physical battles. |
| 30-15 IFT | How well a player can keep running at intensity, the engine that lets them stay sharp from kickoff to final whistle. |
| Passing Accuracy | Precision and consistency on the ball, measuring how reliably a player delivers the right pass in the right place under pressure. |
| Dribbling | Close control speed with the ball at feet, measuring how quickly a player can navigate tight spaces or beat a defender. |

### Edge cases

| Case | Behavior |
|---|---|
| Player has no result for a test | Card not rendered. |
| Player has 1 session for a test | Render description + threshold row only; omit the progression chart. |
| Test has no thresholds defined (Passing Accuracy, Dribbling) | Render description + value + chart, but no threshold scale or bar. The progression chart still draws the line; benchmark zones are skipped. |
| Sprint card with one or more sessions that include all 3 distances | Render the speed curve with one line per qualifying session. |
| Sprint card with no session that includes all 3 distances | Render threshold rows only; omit the speed curve chart. |
| Player has no test data at all | Entire Performance Tests section is omitted (no empty header). |

### Files to modify

| File | Change |
|---|---|
| `js/report.js` | Replace `_renderPerformanceTests` (lines 482-567) and delete `_renderProgressionCharts` (lines 623-647). Add `_renderTestCard(player, testKey)`, `_renderSpeedCard(player)`, `_renderSpeedCurve(player)`, and a shared `_computeVisualPct` helper (or import from a shared module). Update `_showPreview` to call the new merged section. |
| `js/benchmarks.js` | Add `TEST_DESCRIPTIONS` map keyed by test key (or by `'speed'` for the sprint card). Either alongside `TEST_DEFS` or as its own export. |
| `css/report.css` | Add styles for `.rpt-test-card` (vertical-stack card), `.rpt-test-card-chart` (chart container), `.rpt-speed-curve-caption`. Reuse `.rpt-thresh-scale` / `.rpt-thresh-bar` / `.rpt-thresh-fill` from the trial-report styles. |

No data migrations required. No changes to `db.js`, `report-traits.js`, `testing.js`, or `form.js`.

## Verification

End-to-end manual test on a real registered player with rich test data (e.g., one of the U-19 players with multiple sessions across all test categories):

1. Serve the app on port 8081 and open the Family Report builder for the player.
2. Click Preview Report. Confirm:
   - One section titled **Performance Tests** appears in place of the previous two sections.
   - Each test the player has done renders as one card with description, threshold row (if applicable), and progression chart (if 2+ sessions).
   - The Speed card shows 5 stacked threshold rows and a speed curve chart with caption.
   - Cards for tests the player hasn't done are absent.
   - Card order matches: CMJ, Broad Jump, Trap Bar, Pull-Ups, Speed, 30-15 IFT, Passing Accuracy, Dribbling.
3. Test edge cases on a sparser player:
   - Player with only one session in CMJ → CMJ card has no chart.
   - Player with no IFT results → no IFT card.
   - Player with sprints recorded but missing one of the three distances in every session → Speed card shows the available rows, no speed curve.
4. Export PDF. Confirm:
   - Section renders identically to the preview.
   - No regression elsewhere in the report (eval section, coach evaluation, footer all unchanged).
5. Cross-age-group spot check: open one U-17 and one U-21 player. Threshold scales should reflect the correct per-age-group numbers.
