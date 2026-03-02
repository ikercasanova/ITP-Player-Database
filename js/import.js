'use strict';

/* ═══════════════════════════════════════════════════════════════
   import.js — CSV parser for Google Sheets data
═══════════════════════════════════════════════════════════════ */

const CSVImport = {

  parse(csvText) {
    const lines = CSVImport.splitCSVLines(csvText);
    if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

    const headers = lines[0].map(h => h.trim().toLowerCase());
    const players = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      if (row.length < 2 || row.every(c => !c.trim())) continue;

      const get = (names) => {
        for (const name of names) {
          const idx = headers.indexOf(name.toLowerCase());
          if (idx >= 0 && row[idx]) return row[idx].trim();
        }
        return '';
      };
      const getNum = (names) => {
        const v = get(names);
        if (!v) return null;
        const n = parseFloat(v.replace(',', '.'));
        return isNaN(n) ? null : n;
      };

      const firstName = get(['first name', 'firstname', 'first', 'name']);
      const lastName = get(['last name', 'lastname', 'last', 'surname']);
      if (!firstName && !lastName) continue;

      // Height: convert from meters if < 3 (e.g. 1.82 → 182)
      let heightCm = getNum(['height (cm)', 'height', 'heightcm', 'height cm']);
      if (heightCm && heightCm < 3) heightCm = Math.round(heightCm * 100);

      // Positions: split by comma or slash
      const posStr = get(['position', 'positions', 'pos']);
      const positions = posStr ? posStr.split(/[,\/]/).map(p => p.trim()).filter(Boolean) : [];

      // Age group
      let ageGroup = get(['age group', 'agegroup', 'age_group', 'group', 'category']);
      if (!ageGroup) {
        // Try to infer from DOB
        const dob = get(['date of birth', 'dateofbirth', 'dob', 'birthday', 'birth date']);
        if (dob) {
          const year = new Date(dob).getFullYear();
          const currentYear = new Date().getFullYear();
          const age = currentYear - year;
          if (age <= 17) ageGroup = 'U-17';
          else if (age <= 19) ageGroup = 'U-19';
          else ageGroup = 'U-21';
        }
      }

      // Build test data
      const tests = {};
      const mapTest = (testKey, fieldNames) => {
        const v = getNum(fieldNames);
        if (v !== null) {
          tests[testKey] = { attempts: [v, null, null], best: v, unit: TEST_DEFS[testKey]?.unit || '' };
        }
      };

      mapTest('cmj', ['cmj', 'cmj (cm)', 'cmj cm', 'counter movement jump']);
      mapTest('broadJump', ['broad jump', 'broadjump', 'broad jump (cm)', 'standing long jump']);
      mapTest('trapBarDL', ['trap bar', 'trapbar', 'trap bar dl', 'deadlift', 'trap bar deadlift']);
      mapTest('pullUps', ['pull-ups', 'pullups', 'pull ups']);
      mapTest('ift3015', ['30-15 ift', 'ift', '30-15', 'ift 30-15']);
      mapTest('sprint5m', ['5m', '5m sprint', 'sprint 5m']);
      mapTest('sprint10m', ['10m', '10m sprint', 'sprint 10m']);
      mapTest('sprint20m', ['20m', '20m sprint', 'sprint 20m']);
      mapTest('sprint30m', ['30m', '30m sprint', 'sprint 30m']);
      mapTest('sprint40yd', ['40yd', '40yd dash', '40 yard', '40 yd']);
      mapTest('passingAcc', ['passing', 'passing accuracy', 'passing acc']);
      mapTest('dribbling', ['dribbling', 'dribble', 'dribbling time']);

      const player = {
        id: crypto.randomUUID(),
        firstName,
        lastName,
        dateOfBirth: get(['date of birth', 'dateofbirth', 'dob', 'birthday', 'birth date']) || null,
        nationality: get(['nationality', 'nation', 'country']),
        foot: get(['foot', 'preferred foot', 'dominant foot']),
        positions,
        ageGroup: ageGroup || 'U-19',
        photoBase64: null,
        heightCm,
        weightKg: getNum(['weight (kg)', 'weight', 'weightkg', 'weight kg']),
        bodyFatPct: getNum(['body fat', 'body fat %', 'bodyfat', 'bf%']),
        muscleRatePct: getNum(['muscle rate', 'muscle rate %', 'muscle']),
        bmi: null,
        highlightUrl: get(['highlight', 'highlight video', 'highlights']),
        fullGameUrl: get(['full game', 'full game video', 'game video']),
        tests: Object.keys(tests).length > 0 ? tests : {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Compute BMI
      if (player.heightCm && player.weightKg) {
        const hm = player.heightCm / 100;
        player.bmi = Math.round((player.weightKg / (hm * hm)) * 10) / 10;
      }

      players.push(player);
    }

    return players;
  },

  /**
   * Split CSV text into array of arrays, handling quoted fields
   */
  splitCSVLines(text) {
    const lines = [];
    let current = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (ch === '"' && next === '"') {
          field += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          field += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          current.push(field);
          field = '';
        } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
          current.push(field);
          field = '';
          lines.push(current);
          current = [];
          if (ch === '\r') i++;
        } else if (ch === '\r') {
          current.push(field);
          field = '';
          lines.push(current);
          current = [];
        } else {
          field += ch;
        }
      }
    }

    // Last field / line
    if (field || current.length > 0) {
      current.push(field);
      lines.push(current);
    }

    return lines;
  }
};
