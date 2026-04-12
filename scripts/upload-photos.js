#!/usr/bin/env node
'use strict';

/**
 * upload-photos.js — Read player photos from disk, resize, convert to base64,
 * match to existing Supabase players, and update their photoBase64 field.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vnwjgmzckpmgjxzdwjmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZud2pnbXpja3BtZ2p4emR3am1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzI0MzUsImV4cCI6MjA4OTc0ODQzNX0.NR-yRa2Mpzk3IkHie6hsoBhf4rTsYoXax2CDNNQCJ3o';

const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PHOTO_DIR = path.join(
  'C:', 'Users', 'ikcas',
  'OneDrive - Concordia University, Nebraska',
  'Documentos', 'ITP', 'Player Profile Cards', 'Profile Pictures Players'
);

const SEASON = '25-26';
const MAX_WIDTH = 500;   // px — enough for card/profile display
const JPEG_QUALITY = 75; // good balance of quality/size

// Map: photo filename first name → player matchKey/firstName
// Handles mismatches between filenames and DB names
const NAME_MAP = {
  'AbdulRahman Haruna':        'Abdul Rahman',
  'Alex Linza':                'Alexander Linza',
  'Ashton Tryon':              'Ashton',
  'Bhanu Teja (Sunny)':        'Bhanu (Sunny) Teja',
  'Colin Dickinson':           'Colin Dickinson',
  'Collin Middleton':          'Collin Middleton',
  'Conor Kasewurm':            'Conor',
  'Hartej Parmar':             'Hartej',
  'Jalen Robertson':           'Jalen',
  'Jordan Gisa Mugisha':       'Jordan',
  'Julian Quirk':              'Julian',
  'Lucas Vinson':              'Lucas',
  'Marwan Kouyate':            'Marwan',
  'Noah Clarkson-Hall':        'Noah',
  'Omar Gagula':               'Omar',
  'Patrick Revel':             'Patrick',
  'Rylan Douglas':             'Rylan',
  'Saidjamolkhon Saidakbarov': 'Saidjamolkhon Saidakbarov',
  'Samuel Rincon':             'Samuel Rincon',
  'Samuel Winkel':             'Sammy Winkel',
  'Shunnosuke Manabe':         'Shun',
  'William Way':               'William',
};

function extractName(filename) {
  // Remove extension(s) and position info like "RB,CB" or "CM,RB"
  let name = filename
    .replace(/\.jpe?g$/i, '')
    .replace(/\.jpg$/i, '')
    .replace(/\s+(GK|CB|RB|LB|FB|CM|CDM|CAM|ST|RW|LW|RM|Winger|[A-Z]{2,3})(,[A-Z,]+)?$/i, '')
    .trim();
  return name;
}

async function main() {
  // 1. Load all players from Supabase
  const { data: rows, error } = await supa
    .from('players')
    .select('id, data')
    .eq('season', SEASON);

  if (error) {
    console.error('Failed to fetch players:', error);
    process.exit(1);
  }

  console.log(`Found ${rows.length} players in Supabase\n`);

  // Build lookup: matchKey → row
  const playerMap = new Map();
  for (const row of rows) {
    const key = row.data.matchKey || `${row.data.firstName} ${row.data.lastName}`.trim();
    playerMap.set(key, row);
  }

  // 2. Read photo files
  const files = fs.readdirSync(PHOTO_DIR).filter(f => /\.jpe?g$/i.test(f));
  console.log(`Found ${files.length} photos\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const file of files) {
    const name = extractName(file);
    const matchKey = NAME_MAP[name];

    if (!matchKey) {
      console.log(`  ? No mapping for "${name}" (${file})`);
      notFound++;
      continue;
    }

    const row = playerMap.get(matchKey);
    if (!row) {
      console.log(`  ? No player found for matchKey "${matchKey}" (${file})`);
      notFound++;
      continue;
    }

    // 3. Resize and convert to base64
    const filePath = path.join(PHOTO_DIR, file);
    const resized = await sharp(filePath)
      .resize(MAX_WIDTH, null, { withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    const base64 = `data:image/jpeg;base64,${resized.toString('base64')}`;
    const sizeMB = (Buffer.byteLength(base64) / 1024 / 1024).toFixed(2);

    // 4. Update player data
    const playerData = { ...row.data, photoBase64: base64 };

    const { error: updateErr } = await supa
      .from('players')
      .update({ data: playerData, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (updateErr) {
      console.log(`  X Failed to update ${matchKey}: ${updateErr.message}`);
      skipped++;
    } else {
      console.log(`  OK ${matchKey} — ${sizeMB} MB`);
      updated++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${skipped} failed, ${notFound} not matched`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
