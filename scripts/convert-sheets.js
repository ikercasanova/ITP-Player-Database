#!/usr/bin/env node
'use strict';

/**
 * convert-sheets.js
 * One-time script: parse the ITP Google Sheets CSV export into seed-players.json
 * Usage: node scripts/convert-sheets.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ── Embedded CSV (exported from Google Sheets) ────────────────────────
const CSV_RAW = `"NAME_PLAYER METRIC","BASIC INFORMATION PLAYER INFO DATE_BIRTH ","AGE ","NATIONALITY ","FOOT ","POSITION ","HIGHLIGHT URL ","FULL GAME URL ","HEIGHT_EU M","WEIGHT_EU KG","HEIGHT_US FEET","WEIGHT_US LBS","BODY_FAT %","MUSCLE_RATE %","BMI ","PHYSICAL TESTS EXPLOSIVE/STRENGTH COUNTERMOVEMENT JUMP CMJ_1 CM","CMJ_2 ","CMJ_3 ","CMJ_COMP ","CMJ_REF ","BROAD JUMP BRD_JUMP_1 M","BRD_JUMP_2 ","BRD_JUMP_3 ","BRD_JUMP_COMP ","BRD_JUMP_REF ","TRAP-BAR DEADLIFT TRP_BAR_1 MAX KG","TRP_BAR_2 ","TRP_BAR_3 ","TRP_BAR__COMP ","TRP_BAR__REF ","PULL-UP PULL_UP_1 MAX REPS","PULL_UP_2 ","PULL_UP_3 ","PULL_UP_COMP ","PULL_UP_REF ","ENDURANCE 30-15 IFT (VIFT) 30-15_IFT_1 KM/H","30-15_IFT_2 ","30-15_IFT_3 ","30-15_IFT_COMP ","30-15_IFT_REF ","SPEED 5-METER SPRINT 5M_1 SECONDS","5M_2 ","5M_3 ","5M_COMP ","5M_REF ","10-METER SPRINT 10M_1 SECONDS","10M_2 ","10M_3 ","10M_COMP ","10M_REF ","20-METER SPRINT 20M_1 SECONDS","20M_2 ","20M_3 ","20M_COMP ","20M_REF ","30-METER SPRINT 30M_1 SECONDS","30M_2 ","30M_3 ","30M_COMP ","30M_REF ","40-YARD SPRINT 40YDS_1 SECONDS","40YDS_2 ","40YDS_3 ","40YDS_COMP ","40YDS_REF ","TECHNICAL TESTS PASSING ACCURACY Pass_1 GOALS","Pass_2 ","Pass_3 ","Pass_COMP ","Pass_REF ","DRIBBLING Dribble_1 SECONDS","Dribble_2 ","Dribble_3 ","Dribble_COMP ","Dribble_REF "
"U-17","","","","","","","","","","","","","","","23/10/2025","","","","","18/10/2025","08/12/2025","04/02/2026","","","","09/12/2025","","","","","09/12/2025","","","","","08/12/2025","","","","23/10/2025","08/12/2025","04/02/2026","","","23/10/2025","08/12/2025","","","","","","","","","23/10/2025","08/12/2025","","","","23/10/2025","08/12/2025","","","","","09/12/2025","","","","","09/12/2025","","",""
"Abdul","19/03/2009","16","USA","RIGHT","RW, LW","","","1.78","67.5","5'10","149","10.3%","57.60%","21.30%","38","","","-100.0%","Poor: <36; Average: 36-39; Good: 40-43; Elite: 44-48","2.24","2.3","","-100.00%","Poor: <2.00; Average: 2.00-2.09; Good: 2.10-2.19; Elite: 2.20-2.35","","1.85","","-100.00%","Poor: <1.40x; Average: 1.40-1.49x; Good: 1.50-1.59x; Elite: 1.60-1.90x","","7","","-100.00%","Poor: <6; Average: 6-8; Good: 9-11; Elite: 12-15","","20","","-100.00%","Poor: <16.8; Average: 16.8-17.3; Good: 17.4-17.9; Elite: 18.0-19.0","1.25","1.01","","100.00%","Still pending","2.03","1.81","","100.00%","Poor: >1.78; Average: 1.73-1.78; Good: 1.70-1.72; Elite: 1.64-1.69","","","","#DIV/0!","Poor: >3.30; Average: 3.24-3.30; Good: 3.18-3.23; Elite: 3.05-3.17","4.56","4.46","","100.00%","Poor: >4.60; Average: 4.50-4.60; Good: 4.40-4.49; Elite: 4.25-4.39","5.41","5.26","","100.00%","Still pending","","9","","-100.00%","Poor: <9; Average: 10-12; Good: 13-16; Elite: 17-19+","","12.68","","","Poor: >12.86; Average: 11:51-12:85; Good: 11:01-11:50; Elite: 10:60-11"
"Bhanu","17/03/2009","16","INDIA","RIGHT","RB, CB","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"Hartej","05/07/2009","16","CANADA","RIGHT","CM, RB","","","1.81","72.0","5'11","159","10.8%","60.90%","21.90%","39.3","","","-100.0%","","2.48","2.48","","-100.00%","","","2.50","","-100.00%","","","9","","-100.00%","","","20.5","","-100.00%","","1.27","1.24","","100.00%","","2.06","1.98","","100.00%","","","","","#DIV/0!","","4.72","4.57","","100.00%","","5.57","5.37","","100.00%","","","11","","-100.00%","","","11.98","","",""
"Sammy","31/03/2009","16","USA/NIEDERLANDE/MEXIKO","RIGHT","LW, RW, ST","https://www.youtube.com/watch?v=tdidGkFAgsc","https://app.veo.co/matches/20250927-cf8caff0-c225-4394-9051-7a7617bd7cc3-eb5aa80e/","1.80","74.0","5'11","163","11.3%","62.40%","22.60%","","","","","","","2.42","","-100.00%","","","","","","","","","","","","","20","","-100.00%","","","1.08","","","","","1.78","","","","","","","#DIV/0!","","","4.16","","","","","4.87","","","","","14","","-100.00%","","","11.9","","",""
"Shun","01/03/2009","17","JAPAN","RIGHT","CM, CDM","","","1.79","68.0","5'10","150","10.3%","58.10%","21.30%","26","","","-100.0%","","2.45","","","-100.00%","","","","","","","","","","","","","","","","","1.03","","","100.00%","","1.78","","","100.00%","","","","","#DIV/0!","","4.24","","","100.00%","","5.05","","","100.00%","","","","","","","","","","",""
"U-19","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"Ashton","6/3/2008","17","USA","RIGHT","RB, CB","","","1.78","72.5","5'10","160","11.3%","61.00%","22.60%","40.4","","","-100.0%","Poor: <38; Average: 38-41; Good: 42-45; Elite: 46-52","2.41","","","","Poor: <2.10; Average: 2.10-2.19; Good: 2.20-2.29; Elite: 2.30-2.45","","2.21","","-100.00%","Poor: <1.60x; Average: 1.60-1.69x; Good: 1.70-1.79x; Elite: 1.80-2.10x","","9","","-100.00%","Poor: <7; Average: 7-9; Good: 10-12; Elite: 13-18","","","","","Poor: <17.5; Average: 17.5-18.0; Good: 18.1-18.5; Elite: 18.6-19.8","1.17","","","100.00%","Still pending","1.94","","","100.00%","Poor: >1.74; Average: 1.69-1.74; Good: 1.66-1.68; Elite: 1.60-1.65","","","","#DIV/0!","Poor: >3.22; Average: 3.16-3.22; Good: 3.10-3.15; Elite: 2.95-3.09","4.35","","","100.00%","Poor: >4.48; Average: 4.38-4.48; Good: 4.30-4.37; Elite: 4.15-4.29","5.11","","","100.00%","Still pending","","12","","-100.00%","Poor: <9; Average: 10-12; Good: 13-16; Elite: 17-19+","","12.24","","","Poor: >12.86; Average: 11:51-12:85; Good: 11:01-11:50; Elite: 10:60-11"
"Jamol","3/8/2007","18","UZBEKISTAN","RIGHT","CM, AM","","","1.75","66.0","5'9","145.5","10.6%","56.10%","21.60%","","","","","","2.33","","","","","","2.20","","-100.00%","","","8","","-100.00%","","","19","","-100.00%","","1.08","","","100.00%","","1.8","","","100.00%","","","","","#DIV/0!","","4.12","","","100.00%","","4.91","","","100.00%","","","17","","-100.00%","","","11.69","","",""
"Julian","02/05/2007","18","USA","RIGHT","GK","","","1.82","69.0","5'11","152","10.0%","59.10%","20.90%","41.8","","","-100.0%","","2.38","2.48","","-100.00%","","","","","","","","","","","","","","","","","","1.15","","","","","1.9","","","","","","","#DIV/0!","","","4.36","","","","","5.16","","","","","","","","","","","","",""
"Karan","13/9/2008","17","INDIA","RIGHT","RB, CDM","","","1.68","64","5'6","141","11.5%","54.00%","22.80%","","","","","","","2.34","","-100.00%","","","2.50","","-100.00%","","","10","","-100.00%","","","19","","-100.00%","","","1.08","","","","","1.85","","","","","","","#DIV/0!","","","4.34","","","","","5.15","","","","","13","","-100.00%","","","12.65","","",""
"Lucas","25/7/2008","17","USA","RIGHT","CM, RW","","https://app.veo.co/matches/20251107-spiel-7-nov-2025-e8663f2c/","1.74","55","5'8","121","7.9%","47.90%","18.10%","","","","","","2.23","2.24","","-100.00%","","","1.91","","-100.00%","","","5","","-100.00%","","","20","","-100.00%","","","1.24","","","","","2.02","","","","","","","#DIV/0!","","","4.59","","","","","5.36","","","","","14","","-100.00%","","","12.85","","",""
"Noah","21/12/2006","19","UK","RIGHT","GK","https://youtu.be/0hR1cMMl8GA","https://app.veo.co/matches/20250917-1-fc-koln-sv-schlebusch-259508e9/","1.9","75","6'3","165","","","","44.6","","","-100.0%","","","","2.45","","","","","","","","","","","","","","","","","","1.2","","1.08","10.00%","","1.9","","1.77","6.84%","","","","","#DIV/0!","","4.36","","4.26","2.29%","","5.09","","5.01","1.57%","","","","","","","","","","",""
"Patrick","29/11/2007","18","USA","LEFT","RB, LB, RW","","","1.75","64","5'9","141","10.0%","54.50%","20.80%","","","","","","","2.34","","-100.00%","","","","","","","","","","","","","18.5","","-100.00%","","","1.07","","","","","1.8","","","","","","","#DIV/0!","","","4.41","","","","","5.29","","","","","","","","","","","","",""
"Rylan","03/10/2007","18","USA","LEFT","LB","","","1.80","69.0","5'10","152","10.4%","59.00%","21.40%","33.7","","","-100.0%","","2.32","2.33","","-100.00%","","","2.25","","-100.00%","","","8","","-100.00%","","","21.5","","-100.00%","","1.18","0.96","","100.00%","","1.94","1.72","","100.00%","","","","","#DIV/0!","","4.4","4.2","","100.00%","","5.17","4.96","","100.00%","","","13","","-100.00%","","","12.27","","",""
"Samu","24/12/2006","19","USA","RIGHT","RB, CB, CDM","https://youtu.be/rQjb9nNthpE","https://app.veo.co/matches/20251025-spiel-25-okt-2025-79987f9d/","1.70","63.0","5'7","139","10.7%","53.50%","21.80%","49","","","-100.0%","","2.5","2.42","","-100.00%","","","2.30","","-100.00%","","","17","","-100.00%","","","21","","-100.00%","","1.01","1.16","","100.00%","","1.75","1.9","","100.00%","","","","","#DIV/0!","","4.12","4.33","","100.00%","","4.88","5.09","","100.00%","","","13","","-100.00%","","","10.68","","",""
"Stefan","09/08/2007","18","USA","LEFT","LB","","","1.77","66.5","5'10","147","10.3%","56.70%","21.20%","32.6","","","-100.0%","","2.31","2.36","","-100.00%","","","1.88","","-100.00%","","","8","","-100.00%","","","20","","-100.00%","","1.13","1.02","","100.00%","","1.87","1.76","","100.00%","","","","","#DIV/0!","","4.22","4.13","","100.00%","","4.98","4.9","","100.00%","","","10","","-100.00%","","","12.68","","",""
"Santi","04/05/2007","18","PERU","LEFT","ST, LW","","https://app.veo.co/matches/20260117-spiel-17-jan-2026-25fbd5c4/","1.80","83.0","5'11","183","13.7%","68.30%","25.70%","","","","","","","2.44","","-100.00%","","","1.69","","-100.00%","","","10","","-100.00%","","","20.5","","-100.00%","","","1.18","","","","","1.88","","","","","","","#DIV/0!","","","4.32","","","","","5.12","","","","","14","","-100.00%","","","12.85","","",""
"William","3/3/2008","18","USA","RIGHT","CB, RB","https://youtu.be/506HuoJ4YZ4","https://app.veo.co/matches/20250917-1-fc-koln-sv-schlebusch-259508e9/","1.86","70.9","6'1","156","9.7%","60.80%","20.50%","38.7","","","-100.0%","","2.27","2.29","","-100.00%","","","1.69","","-100.00%","","","7","","-100.00%","","","20","","-100.00%","","1.2","1.09","","100.00%","","1.89","1.86","","100.00%","","","","","#DIV/0!","","4.42","4.45","","100.00%","","5.24","5.23","","100.00%","","","14","","-100.00%","","","11.65","","",""
"U-21","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"Alexander Linza","16/01/2007","19","USA","LEFT","LB","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"Colin Dickinson","18/11/2006","19","USA","RIGHT","ST, AM","https://youtu.be/MnhFvZSOuNI?si=T-f8xU_Y5wTsLZtk","https://app.veo.co/matches/20250917-1-fc-koln-sv-schlebusch-259508e9/","1.94","90","6'3","198","12.4%","74.80%","23.90%","41.5","","","-100.00%","Poor: <40; Average: 40-43; Good: 44-47; Elite: 48-55","","2.48","","-100.00%","Poor: <2.15; Average: 2.15-2.24; Good:2.25-2.34; Elite: 2.35-2.50","","1.94","","-100.00%","Poor: <1.80x; Average: 1.80-1.89x; Good: 1.90-1.99x; Elite: 2.00-2.30x","","7","","-100.00%","Poor: <8; Average: 8-10; Good: 11-14; Elite: 15-20+","","21.5","","-100.00%","Poor: <18.0; Average: 18.0-18.5; Good: 18.6-19.0; Elite: 19.1-20.5","","1.13","","","Still pending","","1.92","","","Poor: >1.70; Average: 1.65-1.70; Good: 1.62-1.64; Elite: 1.55-1.61","","","","#DIV/0!","Poor: >3.15; Average: 3.08-3.15; Good: 3.01-3.07; Elite: 2.85-3.00","","4.44","","","Poor: >4.40; Average: 4.30-4.40; Good: 4.20-4.29; Elite: 4.05-4.19","","5.21","","","Still pending","","10","","-100.00%","Poor: <9; Average: 10-12; Good: 13-16; Elite: 17-19+","","11.8","","","Poor: >12.86; Average: 11:51-12:85; Good: 11:01-11:50; Elite: 10:60-11"
"Collin Middleton","31/01/2006","20","USA","LEFT","CB, LB","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""
"Conor","18/4/2006","19","USA","RIGHT","RW, RB","https://youtu.be/tUS9Tjk2ipY?feature=shared","","1.84","85","6'0","187","13.3%","70.10%","25.20%","44.6","","","-100.00%","","","2.41","","-100.00%","","","","","","","","","","","","","19","","-100.00%","","1.18","1.1","","100.00%","","1.87","1.81","","100.00%","","","","","#DIV/0!","","4.23","4.17","","100.00%","","4.98","4.91","","100.00%","","","","","","","","","","",""
"Jalen","14/03/2006","19","USA","RIGHT","LW, RW, ST","https://youtu.be/066iS3dTp34?si=QewN1BC2yesHstsz","https://app.veo.co/matches/20250730-match-1-fc-koln-bundesliga-talent-squad-09497761/","1.82","76.0","6'0","167.5","13.9%","62.10%","22.90%","50.3","","","-100.00%","","","2.56","","-100.00%","","","1.91","","-100.00%","","","11","","-100.00%","","","20.5","","-100.00%","","1.1","0.91","","100.00%","","1.83","1.65","","100.00%","","","","","#DIV/0!","","4.19","4.07","","100.00%","","4.95","4.81","","100.00%","","","10","","-100.00%","","","11.19","","",""
"Jordan","21/01/2002","24","RWANDA","RIGHT","CM, CDM","","","1.93","84.0","6'3","185","11.6%","70.30%","22.70%","37","","","-100.00%","","","","","","","","","","","","","","","","","","","","","","1.17","","","100.00%","","2.03","","","100.00%","","","","","#DIV/0!","","4.55","","","100.00%","","5.36","","","100.00%","","","","","","","","","","",""
"Marwan","02/06/2006","19","USA","LEFT","ST, RW, LW","https://youtu.be/_xz0hSLHvhY?si=5P8OsrwfeRhhdv9T","https://app.veo.co/matches/20250917-1-fc-koln-sv-schlebusch-259508e9/","1.92","88","6'3","194","12.2%","73.30%","23.80%","38.1","","","-100.00%","","","2.33","","-100.00%","","","1.70","","-100.00%","","","3","","-100.00%","","","19","","-100.00%","","1.12","1.05","","100.00%","","1.82","1.79","","100.00%","","","","","#DIV/0!","","4.28","4.26","","100.00%","","5.07","5.07","","100.00%","","","9","","-100.00%","","","11.83","","",""
"Omar","11/07/2006","19","BOSNIA AND HERZEGOVINA","RIGHT","CM, CDM, LW","https://youtu.be/vQvzhkh4IqY?feature=shared","","1.77","64.5","5'10","142","9.9%","55.20%","20.60%","","","","","","","","2.23","","","","","","","","","14","","-100.00%","","","","","","","","","1.3","","","","","2.03","","","","","","#DIV/0!","","","","4.54","","","","","5.34","","","","","","","","","","","",""`;

// ── CSV parser (handles quoted fields) ────────────────────────────────
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field.trim()); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(field.trim());
        if (row.some(c => c !== '')) rows.push(row);
        row = []; field = '';
      } else { field += ch; }
    }
  }
  row.push(field.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

// ── Helpers ───────────────────────────────────────────────────────────

const AGE_GROUP_LABELS = ['U-17', 'U-19', 'U-21'];
const SKIP_PLAYERS = new Set(['Bhanu', 'Alexander Linza', 'Collin Middleton']);

const NATIONALITY_MAP = {
  'USA':                       'American',
  'UK':                        'British',
  'CANADA':                    'Canadian',
  'INDIA':                     'Indian',
  'JAPAN':                     'Japanese',
  'UZBEKISTAN':                'Uzbekistani',
  'PERU':                      'Peruvian',
  'RWANDA':                    'Rwandan',
  'BOSNIA AND HERZEGOVINA':    'Bosnian',
  'USA/NIEDERLANDE/MEXIKO':    'American / Dutch / Mexican',
};

const POS_MAP = { AM: 'CAM' };
const VALID_POS = new Set(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']);

function normalizePos(code) {
  code = (code || '').trim().toUpperCase();
  if (POS_MAP[code]) code = POS_MAP[code];
  return VALID_POS.has(code) ? code : null;
}

function parseDOB(raw) {
  if (!raw) return null;
  const parts = raw.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function parseNum(raw) {
  if (!raw || raw === '' || raw.includes('#DIV/0!') || raw.includes('Poor') || raw.includes('Still')) return null;
  const cleaned = raw.replace('%', '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function stripPercent(raw) {
  if (!raw || raw === '') return null;
  const cleaned = raw.replace('%', '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function titleCaseFoot(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === 'right') return 'Right';
  if (lower === 'left') return 'Left';
  if (lower === 'both') return 'Both';
  return raw;
}

// ── Test definitions matching the app's TEST_DEFS keys in benchmarks.js ──
const TEST_DEFS = [
  { key: 'cmj',        startCol: 15, unit: 'cm',    convertVal: v => v,                                      lowerIsBetter: false },
  { key: 'broadJump',  startCol: 20, unit: 'cm',    convertVal: v => v < 3 ? Math.round(v * 100) : Math.round(v), lowerIsBetter: false },
  { key: 'trapBarDL',  startCol: 25, unit: 'kg',    convertVal: v => v,                                      lowerIsBetter: false },
  { key: 'pullUps',    startCol: 30, unit: 'reps',  convertVal: v => v,                                      lowerIsBetter: false },
  { key: 'ift3015',    startCol: 35, unit: 'km/h',  convertVal: v => v,                                      lowerIsBetter: false },
  { key: 'sprint5m',   startCol: 40, unit: 's',     convertVal: v => v,                                      lowerIsBetter: true },
  { key: 'sprint10m',  startCol: 45, unit: 's',     convertVal: v => v,                                      lowerIsBetter: true },
  // 20m sprint (cols 50-54) — SKIPPED
  { key: 'sprint30m',  startCol: 55, unit: 's',     convertVal: v => v,                                      lowerIsBetter: true },
  { key: 'sprint40yd', startCol: 60, unit: 's',     convertVal: v => v,                                      lowerIsBetter: true },
  { key: 'passingAcc', startCol: 65, unit: 'goals', convertVal: v => v,                                      lowerIsBetter: false },
  { key: 'dribbling',  startCol: 70, unit: 's',     convertVal: v => v,                                      lowerIsBetter: true },
];

// ── Main conversion ───────────────────────────────────────────────────

function convert() {
  const rows = parseCSV(CSV_RAW);
  console.log(`Parsed ${rows.length} CSV rows`);

  // Extract session dates from the U-17 date row (row index 1)
  const dateRow = rows[1];
  const sessionDates = {};
  for (const def of TEST_DEFS) {
    sessionDates[def.key] = [
      parseDOB(dateRow[def.startCol])     || null,
      parseDOB(dateRow[def.startCol + 1]) || null,
      parseDOB(dateRow[def.startCol + 2]) || null,
    ];
  }

  // Slot fallback: if a test slot has no date, borrow from another test's same slot
  const slotFallback = [null, null, null];
  for (let slot = 0; slot < 3; slot++) {
    for (const def of TEST_DEFS) {
      if (sessionDates[def.key][slot]) { slotFallback[slot] = sessionDates[def.key][slot]; break; }
    }
  }
  console.log('Slot fallback dates:', slotFallback);

  const players = [];
  let currentAgeGroup = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[0] || '').trim();

    if (AGE_GROUP_LABELS.includes(name)) { currentAgeGroup = name; continue; }
    if (!name) continue;
    if (SKIP_PLAYERS.has(name)) { console.log(`  Skipping ${name} (no data)`); continue; }

    const hasBodyData = row[8] || row[9];
    const hasTestData = TEST_DEFS.some(def =>
      row[def.startCol] || row[def.startCol + 1] || row[def.startCol + 2]
    );
    if (!hasBodyData && !hasTestData) { console.log(`  Skipping ${name} (empty row)`); continue; }

    // ── Basic info ────────────────────────────────────────────
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    const dob = parseDOB(row[1]);
    const nationalityRaw = (row[3] || '').trim();
    const nationality = NATIONALITY_MAP[nationalityRaw] || nationalityRaw;
    const foot = titleCaseFoot(row[4]);

    const posRaw = (row[5] || '').split(',').map(s => s.trim()).filter(Boolean);
    const positions = posRaw.map(normalizePos).filter(Boolean);

    const highlightUrl = (row[6] || '').trim();
    const fullGameUrl = (row[7] || '').trim();

    // ── Body composition ──────────────────────────────────────
    let heightCm = null;
    const heightRaw = parseNum(row[8]);
    if (heightRaw !== null) {
      heightCm = heightRaw < 3 ? Math.round(heightRaw * 100) : Math.round(heightRaw);
    }
    const weightKg = parseNum(row[9]);
    const bodyFatPct = stripPercent(row[12]);
    const muscleRatePct = stripPercent(row[13]);

    let bmi = null;
    if (heightCm && weightKg) {
      const hm = heightCm / 100;
      bmi = Math.round((weightKg / (hm * hm)) * 10) / 10;
    }

    // ── Parse tests → session-based format ────────────────────
    // The sheet has 3 attempt columns per test, each from a different session date.
    // Group by date to create proper sessions.
    const dateToAttempts = {}; // { date: { testKey: { slot, value } } }

    for (const def of TEST_DEFS) {
      for (let slot = 0; slot < 3; slot++) {
        const rawVal = parseNum(row[def.startCol + slot]);
        if (rawVal === null) continue;
        const value = def.convertVal(rawVal);
        const date = sessionDates[def.key][slot] || slotFallback[slot] || `unknown-session-${slot + 1}`;

        if (!dateToAttempts[date]) dateToAttempts[date] = {};
        if (!dateToAttempts[date][def.key]) dateToAttempts[date][def.key] = [];
        dateToAttempts[date][def.key].push(value);
      }
    }

    // Build the tests object in the app's exact format
    const tests = {};
    for (const def of TEST_DEFS) {
      const sessions = [];

      // Gather sessions for this test, sorted by date
      const dates = Object.keys(dateToAttempts).sort();
      for (const date of dates) {
        const values = dateToAttempts[date]?.[def.key];
        if (!values || values.length === 0) continue;

        // Pad to 3 attempts
        const attempts = [values[0] ?? null, values[1] ?? null, values[2] ?? null];
        const validNums = attempts.filter(v => v !== null).map(Number).filter(n => !isNaN(n));
        const best = validNums.length > 0
          ? (def.lowerIsBetter ? Math.min(...validNums) : Math.max(...validNums))
          : null;

        sessions.push({ date, attempts, best });
      }

      if (sessions.length === 0) continue;

      // All-time best
      const allBests = sessions.map(s => s.best).filter(b => b !== null);
      const overallBest = allBests.length > 0
        ? (def.lowerIsBetter ? Math.min(...allBests) : Math.max(...allBests))
        : null;

      tests[def.key] = { sessions, best: overallBest, unit: def.unit };
    }

    // ── Assemble player ───────────────────────────────────────
    const now = new Date().toISOString();
    const player = {
      id: crypto.randomUUID(),
      firstName,
      lastName,
      dateOfBirth: dob,
      nationality,
      foot,
      positions,
      ageGroup: currentAgeGroup,
      heightCm,
      weightKg,
      bodyFatPct,
      muscleRatePct,
      bmi,
      tests,
      photoBase64: null,
      highlightUrl,
      fullGameUrl,
      createdAt: now,
      updatedAt: now,
    };

    players.push(player);
    console.log(`  + ${firstName} ${lastName} (${currentAgeGroup}) — ${Object.keys(tests).length} tests`);
  }

  // ── Write output ────────────────────────────────────────────
  const outPath = path.join(__dirname, '..', 'data', 'seed-players.json');
  fs.writeFileSync(outPath, JSON.stringify(players, null, 2), 'utf8');
  console.log(`\nWrote ${players.length} players to ${outPath}`);

  const groups = {};
  for (const p of players) { groups[p.ageGroup] = (groups[p.ageGroup] || 0) + 1; }
  console.log('By age group:', groups);
}

convert();
