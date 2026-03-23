#!/usr/bin/env node
'use strict';

/**
 * bulk-photos.js — Match photo files to players by filename and upload to Supabase
 *
 * Usage:
 *   node scripts/bulk-photos.js --folder "C:\path\to\photos" [--season "2025-26"]
 *
 * Filename matching (case-insensitive):
 *   Santi.jpg          → firstName = "Santi"
 *   Santi_Lopez.jpg    → firstName + lastName
 *   Lopez_Santi.jpg    → lastName + firstName (fallback)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Supabase config (from supabase-config.js) ─────────────────
const SUPABASE_URL = 'https://vnwjgmzckpmgjxzdwjmb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZud2pnbXpja3BtZ2p4emR3am1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNzI0MzUsImV4cCI6MjA4OTc0ODQzNX0.NR-yRa2Mpzk3IkHie6hsoBhf4rTsYoXax2CDNNQCJ3o';

// ── CLI args ───────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 ? args[idx + 1] : null;
}

const folder = getArg('--folder');
const season = getArg('--season') || '2025-26';

if (!folder) {
  console.error('Usage: node scripts/bulk-photos.js --folder "C:\\path\\to\\photos" [--season "2025-26"]');
  process.exit(1);
}

if (!fs.existsSync(folder)) {
  console.error(`Folder not found: ${folder}`);
  process.exit(1);
}

// ── HTTP helpers ───────────────────────────────────────────────
function supaRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    };
    if (data) options.headers['Content-Length'] = Buffer.byteLength(data);

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ── Matching logic ─────────────────────────────────────────────
const POSITION_TAGS = ['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST','FB','Winger','RM','LM'];
const POSITION_PATTERN = new RegExp('\\b(' + POSITION_TAGS.join('|') + ')(,(' + POSITION_TAGS.join('|') + '))*\\b', 'gi');

function normalize(str) {
  return str.toLowerCase().replace(/[-_\s]+/g, ' ').trim();
}

function stripFilename(filename) {
  // Remove all extensions (handles ".jpg.jpeg" double extensions)
  let stem = filename.replace(/(\.[a-z]{2,5})+$/i, '');
  // Remove position tags like "GK", "CB,LB", "Winger", etc.
  stem = stem.replace(POSITION_PATTERN, '').trim();
  // Collapse extra spaces
  stem = stem.replace(/\s{2,}/g, ' ').trim();
  return normalize(stem);
}

function matchPlayer(filename, players) {
  const stem = stripFilename(filename);
  // Also try prefixes: just first 2 words, just first word
  const words = stem.split(' ');
  const twoWords = words.slice(0, 2).join(' ');
  const oneWord = words[0];

  // 1. Full cleaned name: firstName + lastName
  for (const p of players) {
    if (normalize(`${p.firstName} ${p.lastName}`) === stem) return { player: p, how: 'full name' };
    if (normalize(`${p.firstName} ${p.lastName}`) === twoWords) return { player: p, how: 'full name (2 words)' };
  }
  // 2. Reversed: lastName + firstName
  for (const p of players) {
    if (normalize(`${p.lastName} ${p.firstName}`) === stem) return { player: p, how: 'reversed name' };
    if (normalize(`${p.lastName} ${p.firstName}`) === twoWords) return { player: p, how: 'reversed name (2 words)' };
  }
  // 3. First name only
  for (const p of players) {
    if (normalize(p.firstName) === oneWord) return { player: p, how: 'first name only' };
  }
  // 4. Last name only
  for (const p of players) {
    if (normalize(p.lastName) === oneWord) return { player: p, how: 'last name only' };
  }
  // 5. Partial first name match (file has nickname — e.g. "Sammy" matches "Samuel")
  for (const p of players) {
    const fn = normalize(p.firstName);
    if (fn.startsWith(oneWord) || oneWord.startsWith(fn)) return { player: p, how: `first name partial (${p.firstName})` };
  }
  return null;
}

// ── Image → base64 ─────────────────────────────────────────────
function imageToBase64(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic' };
  const mime = mimeMap[ext] || 'image/jpeg';
  const data = fs.readFileSync(filePath);
  const sizeMB = (data.length / 1024 / 1024).toFixed(1);
  if (parseFloat(sizeMB) > 5) {
    console.warn(`  ⚠️  ${path.basename(filePath)} is ${sizeMB}MB — consider resizing first for best performance`);
  }
  return `data:${mime};base64,${data.toString('base64')}`;
}

// ── Main ───────────────────────────────────────────────────────
async function main() {
  console.log(`\n📁 Folder:  ${folder}`);
  console.log(`📅 Season:  ${season}`);
  console.log(`🌐 Supabase: ${SUPABASE_URL}\n`);

  // 1. Read image files
  const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic']);
  const files = fs.readdirSync(folder).filter(f => imageExts.has(path.extname(f).toLowerCase()));
  if (files.length === 0) {
    console.error('No image files found in folder.');
    process.exit(1);
  }
  console.log(`Found ${files.length} image file(s).\n`);

  // 2. Fetch players from Supabase
  console.log('Fetching players from Supabase...');
  const res = await supaRequest('GET', `/rest/v1/players?season=eq.${encodeURIComponent(season)}&select=id,data`);
  if (res.status !== 200 || !Array.isArray(res.body)) {
    console.error('Failed to fetch players:', res.status, res.body);
    process.exit(1);
  }
  const rows = res.body;
  console.log(`Found ${rows.length} player(s) in season "${season}".\n`);

  // Extract player objects from the data column
  const players = rows.map(r => ({ _rowId: r.id, ...r.data }));

  // 3. Match files to players
  const matched = [];
  const unmatched = [];

  for (const file of files) {
    const result = matchPlayer(file, players);
    if (result) {
      matched.push({ file, ...result });
    } else {
      unmatched.push(file);
    }
  }

  console.log('─── Match Results ───────────────────────────────────');
  for (const m of matched) {
    console.log(`  ✅  ${m.file.padEnd(35)} → ${m.player.firstName} ${m.player.lastName} (${m.how})`);
  }
  for (const u of unmatched) {
    console.log(`  ❌  ${u.padEnd(35)} → No match found`);
  }
  console.log('─────────────────────────────────────────────────────\n');

  if (matched.length === 0) {
    console.log('No matches found. Check that filenames match player names.');
    process.exit(0);
  }

  console.log(`Ready to upload ${matched.length} photo(s). Starting...\n`);

  // 4. Upload each matched photo
  let saved = 0;
  let failed = 0;

  for (const { file, player } of matched) {
    const filePath = path.join(folder, file);
    process.stdout.write(`  Uploading ${file}...`);

    try {
      const base64 = imageToBase64(filePath);
      const now = new Date().toISOString();
      const updatedData = { ...player, photoBase64: base64, updatedAt: now };
      delete updatedData._rowId; // don't save internal field

      const upRes = await supaRequest(
        'PATCH',
        `/rest/v1/players?id=eq.${encodeURIComponent(player._rowId)}`,
        { data: updatedData, updated_at: now }
      );

      if (upRes.status >= 200 && upRes.status < 300) {
        console.log(` ✅ done`);
        saved++;
      } else {
        console.log(` ❌ failed (${upRes.status})`);
        console.error('    Response:', JSON.stringify(upRes.body));
        failed++;
      }
    } catch (err) {
      console.log(` ❌ error`);
      console.error('   ', err.message);
      failed++;
    }
  }

  console.log('\n─── Summary ─────────────────────────────────────────');
  console.log(`  ✅  Saved:    ${saved}`);
  if (failed > 0) console.log(`  ❌  Failed:   ${failed}`);
  if (unmatched.length > 0) {
    console.log(`  ⚠️   No match: ${unmatched.length} (${unmatched.join(', ')})`);
  }
  console.log('─────────────────────────────────────────────────────');
  console.log('\nDone! Open the app and refresh to see the photos.\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
