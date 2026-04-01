'use strict';

/* ═══════════════════════════════════════════════════════════════
   benchmarks.js — Test definitions, default thresholds, evaluation
═══════════════════════════════════════════════════════════════ */

const TEST_DEFS = {
  cmj:        { name: 'CMJ',              unit: 'cm',    category: 'Explosive Power', lowerIsBetter: false },
  broadJump:  { name: 'Broad Jump',       unit: 'cm',    category: 'Explosive Power', lowerIsBetter: false },
  trapBarDL:  { name: 'Trap Bar Deadlift',unit: 'kg',    category: 'Explosive Power', lowerIsBetter: false },
  pullUps:    { name: 'Pull-Ups',         unit: 'reps',  category: 'Strength',        lowerIsBetter: false },
  ift3015:    { name: '30-15 IFT',        unit: 'km/h',  category: 'Endurance',       lowerIsBetter: false },
  sprint5m:   { name: '5m Sprint',        unit: 's',     category: 'Speed',           lowerIsBetter: true },
  sprint10m:  { name: '10m Sprint',       unit: 's',     category: 'Speed',           lowerIsBetter: true },
  sprint20m:  { name: '20m Sprint',       unit: 's',     category: 'Speed',           lowerIsBetter: true },
  sprint30m:  { name: '30m Sprint',       unit: 's',     category: 'Speed',           lowerIsBetter: true },
  sprint40yd: { name: '40yd Dash',        unit: 's',     category: 'Speed',           lowerIsBetter: true },
  passingAcc: { name: 'Passing Accuracy', unit: 'goals', category: 'Technical',       lowerIsBetter: false },
  dribbling:  { name: 'Dribbling',        unit: 's',     category: 'Technical',       lowerIsBetter: true },
};

/** Test groups — bundles of related tests that share a single testing session */
const TEST_GROUPS = {
  speed: {
    name: 'Speed Testing',
    tests: ['sprint5m', 'sprint10m', 'sprint20m', 'sprint30m', 'sprint40yd'],
    category: 'Speed'
  }
};

function getGroupForTest(testKey) {
  for (const [gk, group] of Object.entries(TEST_GROUPS)) {
    if (group.tests.includes(testKey)) return gk;
  }
  return null;
}

function categoryIsFullyGrouped(categoryName) {
  const cats = Benchmarks.getTestsByCategory();
  const testsInCat = cats[categoryName] || [];
  if (testsInCat.length === 0) return false;
  const gk = getGroupForTest(testsInCat[0]);
  if (!gk) return false;
  return testsInCat.every(tk => getGroupForTest(tk) === gk);
}

// Default benchmarks per age group — thresholds for each test
const DEFAULT_BENCHMARKS = {
  'U-17': {
    cmj:        { poor: 34, average: 38, good: 42, elite: 46 },
    broadJump:  { poor: 190, average: 210, good: 230, elite: 245 },
    trapBarDL:  { poor: 60, average: 80, good: 100, elite: 120 },
    pullUps:    { poor: 2, average: 5, good: 8, elite: 12 },
    ift3015:    { poor: 17.5, average: 19.0, good: 20.0, elite: 21.0 },
    sprint5m:   { poor: 1.15, average: 1.08, good: 1.02, elite: 0.97 },
    sprint10m:  { poor: 1.88, average: 1.80, good: 1.74, elite: 1.68 },
    sprint20m:  { poor: 3.45, average: 3.30, good: 3.15, elite: 3.02 },
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
    sprint20m:  { poor: 3.35, average: 3.20, good: 3.05, elite: 2.95 },
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
    sprint20m:  { poor: 3.30, average: 3.15, good: 3.00, elite: 2.90 },
    sprint30m:  { poor: 4.35, average: 4.15, good: 4.00, elite: 3.85 },
    sprint40yd: { poor: 4.95, average: 4.78, good: 4.58, elite: 4.42 },
    passingAcc: { poor: 5, average: 7, good: 9, elite: 10 },
    dribbling:  { poor: 16.0, average: 13.5, good: 12.0, elite: 10.5 },
  }
};

const Benchmarks = {

  getThresholds(ageGroup, testKey) {
    const custom = DB.getBenchmarks();
    if (custom && custom[ageGroup] && custom[ageGroup][testKey]) {
      return custom[ageGroup][testKey];
    }
    const defaults = DEFAULT_BENCHMARKS[ageGroup];
    return defaults ? defaults[testKey] : null;
  },

  getAllForAgeGroup(ageGroup) {
    const custom = DB.getBenchmarks();
    if (custom && custom[ageGroup]) {
      return { ...DEFAULT_BENCHMARKS[ageGroup], ...custom[ageGroup] };
    }
    return DEFAULT_BENCHMARKS[ageGroup] || {};
  },

  getAll() {
    const custom = DB.getBenchmarks();
    const result = {};
    for (const ag of ['U-17', 'U-19', 'U-21']) {
      result[ag] = { ...DEFAULT_BENCHMARKS[ag] };
      if (custom && custom[ag]) {
        Object.assign(result[ag], custom[ag]);
      }
    }
    return result;
  },

  /**
   * Evaluate a test value against thresholds.
   * Returns { level: 'poor'|'average'|'good'|'elite'|'none', pct: 0-100 }
   */
  evaluate(ageGroup, testKey, value) {
    if (value === null || value === undefined || value === '') {
      return { level: 'none', pct: 0 };
    }

    const thresh = Benchmarks.getThresholds(ageGroup, testKey);
    if (!thresh) return { level: 'none', pct: 0 };

    const def = TEST_DEFS[testKey];
    const v = Number(value);

    if (def && def.lowerIsBetter) {
      // Lower is better: poor > average > good > elite
      if (v <= thresh.elite) return { level: 'elite', pct: 100 };
      if (v <= thresh.good)  return { level: 'good',  pct: 75 + 25 * (thresh.good - v) / (thresh.good - thresh.elite) };
      if (v <= thresh.average) return { level: 'average', pct: 50 + 25 * (thresh.average - v) / (thresh.average - thresh.good) };
      if (v <= thresh.poor) return { level: 'poor', pct: 25 + 25 * (thresh.poor - v) / (thresh.poor - thresh.average) };
      return { level: 'poor', pct: Math.max(5, 25 * (1 - (v - thresh.poor) / thresh.poor)) };
    } else {
      // Higher is better: poor < average < good < elite
      if (v >= thresh.elite) return { level: 'elite', pct: 100 };
      if (v >= thresh.good)  return { level: 'good',  pct: 75 + 25 * (v - thresh.good) / (thresh.elite - thresh.good) };
      if (v >= thresh.average) return { level: 'average', pct: 50 + 25 * (v - thresh.average) / (thresh.good - thresh.average) };
      if (v >= thresh.poor) return { level: 'poor', pct: 25 + 25 * (v - thresh.poor) / (thresh.average - thresh.poor) };
      return { level: 'poor', pct: Math.max(5, 25 * v / thresh.poor) };
    }
  },

  /** Get grouped test keys by category */
  getTestsByCategory() {
    const cats = {};
    for (const [key, def] of Object.entries(TEST_DEFS)) {
      if (!cats[def.category]) cats[def.category] = [];
      cats[def.category].push(key);
    }
    return cats;
  },

  /** Get summary benchmark dots for a player (quick overview) */
  getPlayerDots(player) {
    if (!player.tests || !player.ageGroup) return [];
    const dots = [];
    const keyTests = ['cmj', 'broadJump', 'sprint30m', 'sprint5m', 'ift3015'];
    for (const testKey of keyTests) {
      const t = player.tests[testKey];
      if (t && t.best !== null && t.best !== undefined) {
        const { level } = Benchmarks.evaluate(player.ageGroup, testKey, t.best);
        dots.push(level);
      }
    }
    return dots;
  }
};
