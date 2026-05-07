#!/usr/bin/env node
'use strict';

/**
 * export-for-staff-hub.js — Export all player data + benchmarks for Max's ITP Staff Hub
 *
 * Usage:
 *   node scripts/export-for-staff-hub.js [--no-photos]
 *
 * Produces: itp-player-data-export.json in the project root
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://vnwjgmzckpmgjxzdwjmb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZud2pnbXpja3BtZ2p4emR3am1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzI0MzUsImV4cCI6MjA4OTc0ODQzNX0.NR-yRa2Mpzk3IkHie6hsoBhf4rTsYoXax2CDNNQCJ3o';
const SEASON = '25-26';

const includePhotos = !process.argv.includes('--no-photos');

// ── Test definitions (mirror of benchmarks.js) ────────────────
const TEST_DEFS = {
  cmj:        { name: 'CMJ',              unit: 'cm',    category: 'Explosive Power', lowerIsBetter: false },
  broadJump:  { name: 'Broad Jump',       unit: 'cm',    category: 'Explosive Power', lowerIsBetter: false },
  trapBarDL:  { name: 'Trap Bar Deadlift',unit: 'kg',    category: 'Explosive Power', lowerIsBetter: false },
  pullUps:    { name: 'Pull-Ups',         unit: 'reps',  category: 'Strength',        lowerIsBetter: false },
  ift3015:    { name: '30-15 IFT',        unit: 'km/h',  category: 'Endurance',       lowerIsBetter: false },
  sprint5m:   { name: '5m Sprint',        unit: 's',     category: 'Speed',           lowerIsBetter: true },
  sprint10m:  { name: '10m Sprint',       unit: 's',     category: 'Speed',           lowerIsBetter: true },
  sprint30m:  { name: '30m Sprint',       unit: 's',     category: 'Speed',           lowerIsBetter: true },
  sprint40yd: { name: '40yd Dash',        unit: 's',     category: 'Speed',           lowerIsBetter: true },
  passingAcc: { name: 'Passing Accuracy', unit: 'goals', category: 'Technical',       lowerIsBetter: false },
  dribbling:  { name: 'Dribbling',        unit: 's',     category: 'Technical',       lowerIsBetter: true },
};

// ── Default benchmarks (mirror of benchmarks.js) ──────────────
const BENCHMARKS = {
  'U-17': {
    cmj:        { poor: 34, average: 38, good: 42, elite: 46 },
    broadJump:  { poor: 190, average: 210, good: 230, elite: 245 },
    trapBarDL:  { poor: 60, average: 80, good: 100, elite: 120 },
    pullUps:    { poor: 2, average: 5, good: 8, elite: 12 },
    ift3015:    { poor: 17.5, average: 19.0, good: 20.0, elite: 21.0 },
    sprint5m:   { poor: 1.15, average: 1.08, good: 1.02, elite: 0.97 },
    sprint10m:  { poor: 1.88, average: 1.80, good: 1.74, elite: 1.68 },
    sprint30m:  { poor: 4.50, average: 4.30, good: 4.15, elite: 4.02 },
    sprint40yd: { poor: 5.20, average: 4.95, good: 4.75, elite: 4.55 },
    passingAcc: { poor: 3, average: 5, good: 7, elite: 9 },
    dribbling:  { poor: 18.0, average: 15.5, good: 13.5, elite: 12.0 },
  },
  'U-19': {
    cmj:        { poor: 36, average: 40, good: 44, elite: 48 },
    broadJump:  { poor: 200, average: 220, good: 240, elite: 255 },
    trapBarDL:  { poor: 75, average: 95, good: 115, elite: 140 },
    pullUps:    { poor: 3, average: 7, good: 10, elite: 14 },
    ift3015:    { poor: 18.5, average: 20.0, good: 21.0, elite: 22.0 },
    sprint5m:   { poor: 1.12, average: 1.05, good: 0.99, elite: 0.95 },
    sprint10m:  { poor: 1.84, average: 1.76, good: 1.70, elite: 1.65 },
    sprint30m:  { poor: 4.40, average: 4.20, good: 4.05, elite: 3.92 },
    sprint40yd: { poor: 5.05, average: 4.85, good: 4.65, elite: 4.48 },
    passingAcc: { poor: 4, average: 6, good: 8, elite: 10 },
    dribbling:  { poor: 17.0, average: 14.5, good: 12.5, elite: 11.0 },
  },
  'U-21': {
    cmj:        { poor: 38, average: 42, good: 46, elite: 50 },
    broadJump:  { poor: 210, average: 230, good: 250, elite: 265 },
    trapBarDL:  { poor: 85, average: 105, good: 130, elite: 155 },
    pullUps:    { poor: 4, average: 8, good: 12, elite: 16 },
    ift3015:    { poor: 19.0, average: 20.5, good: 21.5, elite: 22.5 },
    sprint5m:   { poor: 1.10, average: 1.03, good: 0.97, elite: 0.93 },
    sprint10m:  { poor: 1.82, average: 1.74, good: 1.68, elite: 1.63 },
    sprint30m:  { poor: 4.35, average: 4.15, good: 4.00, elite: 3.85 },
    sprint40yd: { poor: 4.95, average: 4.78, good: 4.58, elite: 4.42 },
    passingAcc: { poor: 5, average: 7, good: 9, elite: 10 },
    dribbling:  { poor: 16.0, average: 13.5, good: 12.0, elite: 10.5 },
  }
};

// ── HTTP helper ───────────────────────────────────────────────
function supaGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Clean up player data for export ───────────────────────────
function exportPlayer(data) {
  const p = { ...data };

  const exported = {
    matchKey: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
    firstName: p.firstName || '',
    lastName: p.lastName || '',
    dateOfBirth: p.dateOfBirth || null,
    ageGroup: p.ageGroup || null,
    nationality: p.nationality || null,
    foot: p.foot || null,
    positions: p.positions || [],
    playerType: p.playerType || 'registered',

    physicalMeasurements: {
      heightCm: p.heightCm || null,
      weightKg: p.weightKg || null,
      bodyFatPct: p.bodyFatPct || null,
      muscleRatePct: p.muscleRatePct || null,
      bmi: p.bmi || null,
    },

    performanceTests: p.tests || {},

    videoLinks: {
      highlight: p.highlightUrl || null,
      fullGame: p.fullGameUrl || null,
    },

    // Player Card data
    strengths: p.strengths || [],
    playingStyle: p.playingStyle || null,

    // Trial evaluation data
    trialEvaluation: p.trialEvaluation || null,
    trialDates: p.trialDates || null,

    // Development review / coach notes
    developmentReview: p.developmentReview || null,
    coachNotes: p.coachNotes || null,

    // Photo
    photoBase64: includePhotos ? (p.photoBase64 || null) : '(excluded with --no-photos)',

    // Timestamps
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null,
  };

  return exported;
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log('\nExporting ITP Player Database for Staff Hub integration...\n');

  // Fetch all players
  const rows = await supaGet(`/rest/v1/players?season=eq.${encodeURIComponent(SEASON)}&select=id,data`);
  if (!Array.isArray(rows)) {
    console.error('Failed to fetch players:', rows);
    process.exit(1);
  }

  console.log(`Found ${rows.length} players in season "${SEASON}".`);

  const players = rows.map(r => exportPlayer(r.data));

  // Count stats
  const withTests = players.filter(p => p.performanceTests && Object.keys(p.performanceTests).length > 0).length;
  const withPhotos = players.filter(p => p.photoBase64 && p.photoBase64 !== '(excluded with --no-photos)').length;
  const withMeasurements = players.filter(p => p.physicalMeasurements.heightCm).length;

  const exportData = {
    exportInfo: {
      exportDate: new Date().toISOString().split('T')[0],
      season: SEASON,
      source: 'ITP Player Database (ikercasanova.github.io/ITP-Player-Database)',
      sourceRepo: 'https://github.com/ikercasanova/ITP-Player-Database',
      totalPlayers: players.length,
      playersWithTestData: withTests,
      playersWithPhotos: withPhotos,
      playersWithMeasurements: withMeasurements,
      photosIncluded: includePhotos,
    },
    testDefinitions: TEST_DEFS,
    benchmarks: BENCHMARKS,
    players: players,
  };

  // Write output
  const outPath = path.join(__dirname, '..', 'itp-player-data-export.json');
  fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2));

  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);

  console.log(`\n--- Export Summary ---`);
  console.log(`  Players:          ${players.length}`);
  console.log(`  With test data:   ${withTests}`);
  console.log(`  With photos:      ${withPhotos}`);
  console.log(`  With measurements:${withMeasurements}`);
  console.log(`  Photos included:  ${includePhotos ? 'Yes' : 'No (--no-photos)'}`);
  console.log(`  File size:        ${sizeMB} MB`);
  console.log(`  Output:           ${outPath}`);
  console.log(`\nDone!\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
