# ITP Player Database → Staff Hub Integration Guide

**For:** Max Bisinger (ITP Staff Hub developer)
**From:** Iker Casanova
**Date:** March 2026
**Source repo:** https://github.com/ikercasanova/ITP-Player-Database
**Live app:** https://ikercasanova.github.io/ITP-Player-Database/

---

## What This Is

The ITP Player Database tracks **athletic performance testing and player development**. It fills the "Performance Tests" section that's currently empty in the Staff Hub, and adds several player-facing features.

This guide explains what data is available, what features exist, and how to integrate them.

---

## Data Export File

**File:** `itp-player-data-export.json`

### Structure

```
{
  exportInfo:       { date, season, totals }
  testDefinitions:  { 11 test types with names, units, categories }
  benchmarks:       { thresholds per age group (U-17/U-19/U-21) }
  players:          [ array of player objects ]
}
```

### Player Matching

Each player has a `matchKey` field (e.g., `"Ashton Tryon"`) for matching to Staff Hub records by name.

### Player Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `matchKey` | string | `"FirstName LastName"` for matching |
| `firstName`, `lastName` | string | Player name |
| `dateOfBirth` | string | ISO date `"2008-03-06"` |
| `ageGroup` | string | `"U-17"`, `"U-19"`, or `"U-21"` |
| `nationality` | string | e.g., `"American"` |
| `foot` | string | `"Right"`, `"Left"`, or `"Both"` |
| `positions` | string[] | e.g., `["RB", "CB"]` |
| `playerType` | string | `"registered"` or `"trial"` |
| `physicalMeasurements.heightCm` | number | Height in cm |
| `physicalMeasurements.weightKg` | number | Weight in kg |
| `physicalMeasurements.bodyFatPct` | number | Body fat percentage |
| `physicalMeasurements.muscleRatePct` | number | Muscle rate percentage |
| `physicalMeasurements.bmi` | number | Computed BMI |
| `performanceTests` | object | See "Test Data Structure" below |
| `videoLinks.highlight` | string | YouTube highlight video URL |
| `videoLinks.fullGame` | string | Full game video URL (YouTube or Veo) |
| `strengths` | string[] | Selected scouting traits (for Player Card) |
| `playingStyle` | string | Generated playing style narrative |
| `trialEvaluation` | object | Trial evaluation data (for trial players) |
| `photoBase64` | string | Player photo as base64 JPEG |

### Test Data Structure

Each test in `performanceTests` is keyed by test ID and contains multi-session data:

```json
"cmj": {
  "best": 40.4,
  "sessions": [
    { "date": "2025-10-23", "attempts": [38.2, 40.4, 39.1], "best": 40.4 },
    { "date": "2025-12-09", "attempts": [39.5, 37.8], "best": 39.5 }
  ]
}
```

- `best` — overall best value across all sessions
- `sessions[].date` — ISO date of the testing session
- `sessions[].attempts` — array of individual attempt values
- `sessions[].best` — best value from that session

### Test Definitions

11 test types across 5 categories:

| Key | Name | Unit | Category | Lower is Better |
|-----|------|------|----------|----------------|
| `cmj` | CMJ | cm | Explosive Power | No |
| `broadJump` | Broad Jump | cm | Explosive Power | No |
| `trapBarDL` | Trap Bar Deadlift | kg | Explosive Power | No |
| `pullUps` | Pull-Ups | reps | Strength | No |
| `ift3015` | 30-15 IFT | km/h | Endurance | No |
| `sprint5m` | 5m Sprint | s | Speed | Yes |
| `sprint10m` | 10m Sprint | s | Speed | Yes |
| `sprint30m` | 30m Sprint | s | Speed | Yes |
| `sprint40yd` | 40yd Dash | s | Speed | Yes |
| `passingAcc` | Passing Accuracy | goals | Technical | No |
| `dribbling` | Dribbling | s | Technical | No |

### Benchmarks

Each age group (U-17, U-19, U-21) has 4 threshold levels per test:

```json
"cmj": { "poor": 36, "average": 40, "good": 44, "elite": 48 }
```

Source: European youth academies, primarily German NLZ (Nachwuchsleistungszentren) programs.

For speed tests (lowerIsBetter: true), poor > average > good > elite numerically.

---

## Features to Integrate

### Feature A: Performance Testing System

**What it does:** Coaches input test results per session (date + multiple attempts). The system tracks best values, evaluates against benchmarks, shows progression charts over time, and provides team-level analytics.

**Key capabilities:**
- Multi-session test input with attempt tracking
- Automatic best-value calculation
- Benchmark evaluation: poor / average / good / elite (color-coded)
- Player profile: progression charts per test, benchmark bars
- Team analytics: distributions, leaderboards, biggest improvers, session comparison

**Data needed from export:** `performanceTests` per player + `benchmarks` + `testDefinitions`

**Source files:**
| File | Purpose | Lines |
|------|---------|-------|
| `js/benchmarks.js` | Test definitions, default thresholds, evaluation logic | 177 |
| `js/testing.js` | Testing session input UI | ~400 |
| `js/analytics.js` | Team analytics (3 tabs: overview, leaderboard, sessions) | ~1200 |
| `js/profile.js` | Player profile charts (progression, benchmark bars) | ~450 |
| `js/benchmarks-view.js` | Benchmark reference page | ~100 |
| `css/components.css` | Benchmark bars, level badges, chart styles | ~1580 |

### Feature B: Player Card Generator

**What it does:** Generates professional A4 player profile cards (794x1123px) with:
- Player photo, name, positions
- Overview (nationality, DOB, height/weight, foot)
- Performance test bars vs benchmarks
- Scouting: trait selection (31 traits, 5 categories) → auto-generated playing style narrative → player archetype classification
- Video links (YouTube thumbnails, Veo support)
- Contact info
- PDF export with clickable video links

**3 layout variants:**
1. **USA Colleges** — English, includes 40yd dash, dual units (cm/ft-in)
2. **German Clubs** — German language, metric only, positions in German
3. **International** — English, metric, no 40yd dash

**Data needed:** All player fields + `strengths[]` + `playingStyle` + photo + test data

**Source files:**
| File | Purpose | Lines |
|------|---------|-------|
| `js/card.js` | `buildCard()` — renders A4 card DOM element | 347 |
| `js/card-editor.js` | Card editor UI (trait selector, layout picker, preview) | ~400 |
| `js/scout.js` | Scouting engine: 31 traits, archetypes, AI-style text generator | 610 |
| `js/layouts.js` | 3 layout configs (labels, benchmarks, contacts) | 185 |
| `js/card-pdf.js` | PDF export (html2pdf, clickable video annotations) | ~150 |
| `css/card.css` | A4 card visual styles | ~850 |

### Feature C: Family Report Generator

**What it does:** Generates a parent-friendly report showing a player's test results, benchmark comparisons, and progression. Designed for coaches to share with player families.

**Source files:**
| File | Purpose |
|------|---------|
| `js/report.js` | Report builder UI + rendering |
| `css/report.css` | Report styles |

### Feature D: Trial Evaluation Report

**What it does:** Structured evaluation for trial players:
1. **Trait chips:** Coach selects strengths (green) and areas for improvement (amber) from a list of 36 traits across 4 pillars
2. **AI narrative:** Claude API generates position-specific sentences for each selected trait
3. **Coaching staff assessment:** Coach writes rough notes → AI polishes into a professional paragraph
4. **Decision:** Accept / Not Accept with auto-generated summary
5. **PDF export:** Professional PDF with FC Köln watermark

**API:** Uses Claude API (`claude-haiku-4-5-20251001`) — API key stored in `localStorage` as `itp_claude_api_key`

**Source files:**
| File | Purpose |
|------|---------|
| `js/trial-report.js` | Full trial report builder, AI integration, PDF export |
| `js/report-traits.js` | 36 traits across 4 pillars (Technical, Tactical, Physical, Mental) |

---

## File Manifest (Full Codebase)

```
ITP-Player-Database/
├── index.html                    # App shell, views, nav, script tags
├── css/
│   ├── app.css                   # Layout, nav, forms, profile, all page styles
│   ├── components.css            # Tiles, benchmark bars, badges, tables
│   ├── card.css                  # A4 player card styles
│   └── report.css                # Family report + trial report styles
├── js/
│   ├── supabase-config.js        # Supabase connection (URL + anon key)
│   ├── db.js                     # Data layer (Supabase + localStorage cache)
│   ├── app.js                    # Routing, init, seed modal
│   ├── roster.js                 # Roster grid view
│   ├── profile.js                # Player profile page + charts
│   ├── form.js                   # Add/edit player form
│   ├── testing.js                # Testing session input
│   ├── analytics.js              # Team analytics (3 tabs)
│   ├── benchmarks.js             # Test definitions + benchmark evaluation
│   ├── benchmarks-view.js        # Benchmark reference page
│   ├── settings.js               # Settings, import/export, benchmark editor
│   ├── import.js                 # CSV import
│   ├── report.js                 # Family report builder
│   ├── report-traits.js          # Trait definitions for trial reports
│   ├── trial-report.js           # Trial evaluation report
│   ├── card.js                   # A4 card renderer
│   ├── card-editor.js            # Card editor module
│   ├── card-pdf.js               # Card PDF export
│   ├── scout.js                  # Scouting engine (traits, archetypes)
│   └── layouts.js                # 3 card layout configurations
├── assets/logos/                  # FC Köln logos
├── data/seed-players.json         # Seed dataset
└── scripts/
    ├── bulk-photos.js             # Bulk photo upload utility
    └── export-for-staff-hub.js    # This export script
```

---

## Database

The app uses **Supabase** (PostgreSQL):
- URL: `https://vnwjgmzckpmgjxzdwjmb.supabase.co`
- Table: `players` with columns: `id` (UUID), `season` (text), `data` (JSONB), `updated_at` (timestamp)
- All player fields are stored inside the `data` JSONB column
- The app also uses localStorage as a write-through cache

---

## Tech Stack

- **Vanilla JS** — no framework, no build tools
- **HTML/CSS** — single `index.html`, hash-based routing
- **Fonts:** Barlow Condensed + Barlow (Google Fonts)
- **PDF:** html2pdf.js (card), html2canvas + jsPDF (trial report)
- **AI:** Claude API for trial report narrative generation
- **Hosting:** GitHub Pages
