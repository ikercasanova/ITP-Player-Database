'use strict';

/* ═══════════════════════════════════════════════════════════════
   scout.js — Trait taxonomy, phrase pools, and scouting
   description generator for ITP Player Cards
═══════════════════════════════════════════════════════════════ */

const SCOUT_TRAITS = {
  technical: {
    label: 'Technical',
    traits: {
      ballControl:      'Ball Control',
      firstTouch:       'First Touch',
      passingRange:     'Passing Range',
      crossing:         'Crossing',
      dribbling:        'Dribbling',
      finishing:        'Finishing',
      longRangeShooting:'Long-Range Shooting',
      setPieces:        'Set Pieces',
    }
  },
  mental: {
    label: 'Mental',
    traits: {
      gameReading:      'Game Reading',
      positioning:      'Positioning',
      leadership:       'Leadership',
      composure:        'Composure',
      workRate:         'Work Rate',
      creativity:       'Creativity',
      decisionMaking:   'Decision-Making',
    }
  },
  physical: {
    label: 'Physical',
    traits: {
      pace:             'Pace',
      power:            'Power',
      agility:          'Agility',
      stamina:          'Stamina',
      explosiveness:    'Explosiveness',
      balance:          'Balance',
      aerialPresence:   'Aerial Presence',
    }
  },
  defensive: {
    label: 'Defensive',
    traits: {
      tackling:         'Tackling',
      marking:          'Marking',
      interceptions:    'Interceptions',
      oneVOneDefending: '1v1 Defending',
    }
  },
  character: {
    label: 'Character',
    traits: {
      coachable:            'Coachable',
      highCeiling:          'High Ceiling',
      competitiveMentality: 'Competitive Mentality',
      versatile:            'Versatile',
      teamPlayer:           'Team Player',
    }
  }
};

// ── Short phrases for grouped strength bullets ───────────────

const SHORT_PHRASES = {
  // Technical
  ballControl:       'excellent ball control',
  firstTouch:        'a refined first touch',
  passingRange:      'impressive passing range',
  crossing:          'dangerous crossing',
  dribbling:         'sharp dribbling',
  finishing:         'clinical finishing',
  longRangeShooting: 'a powerful long-range shot',
  setPieces:         'set-piece quality',
  // Mental
  gameReading:       'reads the game well',
  positioning:       'intelligent positioning',
  leadership:        'natural leadership',
  composure:         'composure under pressure',
  workRate:          'a relentless work rate',
  creativity:        'creative vision',
  decisionMaking:    'mature decision-making',
  // Physical
  pace:              'explosive pace',
  power:             'physical power',
  agility:           'sharp agility',
  stamina:           'excellent stamina',
  explosiveness:     'dynamic explosiveness',
  balance:           'outstanding balance',
  aerialPresence:    'aerial dominance',
  // Defensive
  tackling:          'strong tackling',
  marking:           'disciplined marking',
  interceptions:     'sharp interceptions',
  oneVOneDefending:  'solid 1v1 defending',
  // Character
  coachable:         'highly coachable',
  highCeiling:       'high development ceiling',
  competitiveMentality: 'fierce competitor',
  versatile:         'tactical versatility',
  teamPlayer:        'selfless team player',
};

// ── Build grouped strength bullet sentences ──────────────────

function buildStrengthBullets(labels) {
  if (!labels || !labels.length) return [];

  // Build reverse lookup: label → { key, category }
  const labelToInfo = {};
  const categoryOrder = ['technical', 'mental', 'physical', 'defensive', 'character'];
  for (const catKey of categoryOrder) {
    const cat = SCOUT_TRAITS[catKey];
    for (const [traitKey, traitLabel] of Object.entries(cat.traits)) {
      labelToInfo[traitLabel] = { key: traitKey, category: catKey };
    }
  }

  // Group selected labels by category
  const groups = {};
  for (const label of labels) {
    const info = labelToInfo[label];
    if (!info) continue;
    if (!groups[info.category]) groups[info.category] = [];
    groups[info.category].push(info.key);
  }

  // Build one sentence per category (in order)
  const bullets = [];
  for (const cat of categoryOrder) {
    const keys = groups[cat];
    if (!keys || !keys.length) continue;

    const phrases = keys.map(k => SHORT_PHRASES[k] || k);
    let sentence;
    if (phrases.length === 1) {
      sentence = phrases[0];
    } else if (phrases.length === 2) {
      sentence = phrases[0] + ' and ' + phrases[1];
    } else {
      sentence = phrases.slice(0, -1).join(', ') + ', and ' + phrases[phrases.length - 1];
    }
    // Capitalize first letter
    bullets.push(sentence.charAt(0).toUpperCase() + sentence.slice(1));
  }

  return bullets;
}

// ── Position-aware role descriptors ────────────────────────────

const ROLE_MAP = {
  GK:  'goalkeeper',
  CB:  'center-back',
  LB:  'left-back',
  RB:  'right-back',
  CDM: 'defensive midfielder',
  CM:  'central midfielder',
  CAM: 'attacking midfielder',
  LW:  'left winger',
  RW:  'right winger',
  ST:  'center-forward',
};

// ── Build adjective from height ────────────────────────────────

function buildAdjective(heightCm) {
  if (!heightCm) return null;
  if (heightCm < 172) return 'compact';
  if (heightCm < 183) return 'athletic';
  return 'physically imposing';
}

// ── Foot phrasing ──────────────────────────────────────────────

function footPhrase(foot, firstName) {
  if (!foot) return null;
  if (foot === 'Both') return 'comfortable on either foot';
  if (foot === 'Left') return 'naturally left-footed';
  return 'right-footed';
}

// ── Simple deterministic hash from string ──────────────────────

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Phrase pools per trait ──────────────────────────────────────
// Each trait has 3-4 short phrase variants used in compound sentences.

const PHRASE_POOLS = {
  // Technical
  ballControl:       ['excellent ball control', 'assured touch on the ball', 'strong ability to retain possession under pressure', 'confident in tight spaces with the ball at his feet'],
  firstTouch:        ['a refined first touch', 'a clean first touch that sets up his next action', 'the ability to bring the ball under control instantly', 'a first touch that creates time and space'],
  passingRange:      ['an impressive passing range', 'the vision to switch play with long diagonals', 'accurate distribution over short and long distances', 'a wide passing range that opens up the pitch'],
  crossing:          ['dangerous delivery from wide areas', 'accurate crosses into the box', 'the ability to whip in quality crosses on the run', 'consistent crossing ability from the flanks'],
  dribbling:         ['sharp dribbling', 'the confidence to take players on 1v1', 'progressive dribbling that gains ground', 'the ability to beat defenders in tight spaces'],
  finishing:         ['clinical finishing', 'composure in front of goal', 'a natural instinct for finding the net', 'the ability to convert chances with either foot'],
  longRangeShooting: ['a powerful long-range shot', 'the ability to threaten from distance', 'willingness to strike from outside the box', 'a dangerous shot from range'],
  setPieces:         ['a reliable set-piece delivery', 'quality on dead-ball situations', 'the technique to be a threat from set pieces', 'accuracy on free kicks and corners'],

  // Mental
  gameReading:       ['excellent game reading', 'a mature understanding of the game', 'the ability to anticipate play before it develops', 'strong tactical awareness beyond his years'],
  positioning:       ['intelligent positioning', 'a natural sense for space', 'consistent awareness of where to be on the pitch', 'disciplined positional play'],
  leadership:        ['natural leadership qualities', 'a vocal presence who organizes those around him', 'the willingness to take responsibility on the pitch', 'leadership that lifts the players around him'],
  composure:         ['composure under pressure', 'the ability to stay calm in high-pressure situations', 'a steady temperament even in intense moments', 'mental composure that belies his age'],
  workRate:          ['a relentless work rate', 'tireless commitment in and out of possession', 'the engine to cover ground in both phases', 'consistent effort across the full 90 minutes'],
  creativity:        ['creative vision', 'the ability to unlock defenses with imaginative passes', 'a flair for the unexpected', 'creative instincts that can change a game'],
  decisionMaking:    ['mature decision-making', 'good judgment in the final third', 'the ability to pick the right option under pressure', 'sound decision-making for his age'],

  // Physical
  pace:              ['explosive pace', 'the speed to stretch defenses', 'genuine pace that creates separation', 'the acceleration to get in behind'],
  power:             ['physical power', 'a strong frame that holds off opponents', 'the physicality to compete at a high level', 'upper-body strength that aids his hold-up play'],
  agility:           ['quick agility in tight areas', 'nimble footwork that evades challenges', 'the agility to change direction sharply', 'rapid lateral movement'],
  stamina:           ['excellent stamina', 'the endurance to maintain intensity throughout the match', 'a strong aerobic base', 'the fitness to press high for the full game'],
  explosiveness:     ['explosive movement', 'dynamic acceleration over short distances', 'the burst to get away from markers', 'electric off-the-mark speed'],
  balance:           ['outstanding balance', 'the ability to stay on his feet through contact', 'a low center of gravity that keeps him stable', 'balance that allows him to ride challenges'],
  aerialPresence:    ['a commanding aerial presence', 'dominance in the air', 'the leap and timing to win aerial duels', 'a strong presence in both boxes aerially'],

  // Defensive
  tackling:          ['clean tackling', 'well-timed tackles that win possession', 'strong in the challenge', 'aggressive but fair in the tackle'],
  marking:           ['disciplined marking', 'tight man-marking ability', 'the concentration to track runners', 'reliable defensive marking'],
  interceptions:     ['sharp interceptions', 'the anticipation to read passing lanes', 'an ability to cut out danger before it develops', 'proactive in intercepting opposition play'],
  oneVOneDefending:  ['solid 1v1 defending', 'the ability to isolate and contain attackers', 'composed defending in isolation', 'reliable in 1v1 defensive situations'],

  // Character
  coachable:             ['a highly coachable player who responds well to feedback', 'receptive to coaching and eager to improve', 'a student of the game who actively seeks development', 'open to instruction and quick to implement tactical adjustments'],
  highCeiling:           ['a player with significant room for growth', 'considerable development potential', 'a high ceiling suggesting he has not yet reached his peak', 'raw qualities that point to a high upside'],
  competitiveMentality:  ['a fierce competitive mentality', 'the desire to win every individual battle', 'a winning mentality that drives his performance', 'competitive fire that raises his level in big moments'],
  versatile:             ['tactical versatility across multiple positions', 'the flexibility to operate in different roles', 'adaptability that makes him a valuable squad option', 'comfortable deploying in multiple positions'],
  teamPlayer:            ['a selfless team player', 'willingness to work for the collective', 'a team-first mentality that prioritizes the group', 'the ability to put the team above individual glory'],
};

// ── Athletic qualifier sentences ───────────────────────────────
// Used when test data exceeds benchmarks (from card.js BENCHMARKS)

const ATHLETIC_BENCHMARKS = {
  cmjCm:        { threshold: 36,   label: 'countermovement jump of {val} cm',   higherIsBetter: true },
  broadJumpCm:  { threshold: 220,  label: 'broad jump of {val} cm',             higherIsBetter: true },
  sprint30mSec: { threshold: 4.25, label: '30m sprint time of {val}s',           higherIsBetter: false },
  sprint40ydSec:{ threshold: 4.85, label: '40-yard dash time of {val}s',         higherIsBetter: false },
};

function buildAthleticSentence(tests, seed) {
  if (!tests) return null;
  const exceeds = [];
  for (const [key, cfg] of Object.entries(ATHLETIC_BENCHMARKS)) {
    const v = tests[key];
    if (v == null) continue;
    const val = parseFloat(v);
    if (isNaN(val)) continue;
    const better = cfg.higherIsBetter ? val > cfg.threshold : val < cfg.threshold;
    if (better) {
      exceeds.push(cfg.label.replace('{val}', val));
    }
  }
  if (!exceeds.length) return null;

  const templates = [
    `His verified ${exceeds[0]} confirms his ability to compete physically at the collegiate level.`,
    `Testing data backs up his athletic profile — a ${exceeds[0]} places him above the US college average.`,
    `His ${exceeds[0]} is a standout metric that underlines his physical capabilities.`,
  ];
  if (exceeds.length >= 2) {
    return `His verified ${exceeds[0]} and ${exceeds[1]} confirm his physical readiness to compete at the next level.`;
  }
  return templates[seed % templates.length];
}

// ── Closing sentences ──────────────────────────────────────────

const CHARACTER_CLOSERS = {
  coachable:             ['His coachability makes him an ideal candidate for structured development programs.', 'Responds well to coaching, making him a strong fit for a college environment.', 'A coachable mindset positions him for continued growth at the next level.'],
  highCeiling:           ['With significant upside still untapped, his best years are ahead of him.', 'His development trajectory suggests he has considerable room to grow.', 'A player whose ceiling is well above his current level of performance.'],
  competitiveMentality:  ['His competitive edge drives him to raise his game when it matters most.', 'A winner by nature, he brings intensity to every training session and match.', 'His mentality ensures he will thrive in competitive collegiate environments.'],
  versatile:             ['His versatility gives coaching staff tactical flexibility in multiple systems.', 'The ability to play across different positions adds significant value.', 'Positional flexibility makes him an asset in any squad.'],
  teamPlayer:            ['A player who elevates those around him through selfless play.', 'His team-first approach will make him a valued member of any program.', 'Coaches will appreciate his willingness to sacrifice for the collective.'],
};

const GENERIC_CLOSERS = [
  'A player with clear potential to develop further within a structured collegiate program.',
  'Projects as a valuable addition to a college roster with continued development.',
  'Shows the qualities needed to make an impact at the collegiate level.',
  'With the right environment, he has the tools to grow into a significant contributor.',
];

// ── Main generator ─────────────────────────────────────────────

const ScoutGenerator = {
  _seed: 0,

  generate(selectedTraits, playerData) {
    const seed = hashStr((playerData.firstName || '') + (playerData.lastName || '')) + ScoutGenerator._seed;
    ScoutGenerator._seed++;

    const firstName = playerData.firstName || 'The player';
    const sentences = [];

    // 1. Opening sentence — position-aware
    sentences.push(ScoutGenerator._buildOpener(firstName, playerData, seed));

    // 2. Style description — how the player uses their key traits
    const styleSentence = ScoutGenerator._buildStyleDescription(selectedTraits, firstName, seed);
    if (styleSentence) sentences.push(styleSentence);

    // 3. Closing sentence
    sentences.push(ScoutGenerator._buildCloser(selectedTraits, seed));

    return sentences.filter(Boolean).join(' ');
  },

  _buildOpener(firstName, data, seed) {
    const adj = buildAdjective(data.heightCm);
    const foot = footPhrase(data.foot, firstName);

    // Get position role
    let role = 'versatile player';
    if (data.positions && data.positions.length > 0) {
      const pos = typeof data.positions[0] === 'string' ? data.positions[0] : data.positions[0].code;
      role = ROLE_MAP[pos] || 'midfielder';
    }

    // Build the opener from available parts
    const parts = [];
    if (adj) {
      parts.push(`${firstName} is ${/^[aeiou]/i.test(adj) ? 'an' : 'a'} ${adj} ${role}`);
    } else {
      parts.push(`${firstName} is ${/^[aeiou]/i.test(role) ? 'an' : 'a'} ${role}`);
    }

    if (foot) {
      parts[0] += ` who is ${foot}.`;
    } else {
      parts[0] += '.';
    }

    return parts[0];
  },

  _buildStyleDescription(selectedTraits, firstName, seed) {
    // Group selected traits by category
    const counts = { technical: 0, mental: 0, physical: 0, defensive: 0 };
    for (const traitKey of selectedTraits) {
      const cat = ScoutGenerator._findCategory(traitKey);
      if (cat && cat in counts) counts[cat]++;
    }

    // Determine dominant category
    const dominant = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])[0];
    if (!dominant) return null;

    // Style templates per dominant category
    const STYLE_TEMPLATES = {
      technical: [
        'Technically gifted, he controls the tempo and creates chances through individual quality.',
        'Comfortable receiving under pressure, he progresses play through combination play and skill on the ball.',
        'His technical ability sets him apart — he delivers quality in tight spaces and the final third.',
      ],
      mental: [
        'Reads the game beyond his years, finding space and making smart decisions under pressure.',
        'Tactically aware and composed, he positions himself to influence play at key moments.',
        'His game intelligence gives him an edge — he processes play quickly and picks the right option.',
      ],
      physical: [
        'Uses his athleticism to dominate in transition, covering ground quickly and competing hard in duels.',
        'A physically dynamic player who sets the tone with pace, power, and relentless intensity.',
        'His physical profile gives him an advantage in open spaces where he can press high and attack.',
      ],
      defensive: [
        'Reads danger early and cuts out attacks before they develop, providing a reliable defensive foundation.',
        'Strong in the tackle and positionally disciplined, he wins the ball back and distributes cleanly.',
        'Combines strong 1v1 defending with the awareness to cover for teammates and organize the back line.',
      ],
    };

    const templates = STYLE_TEMPLATES[dominant[0]];
    return templates[seed % templates.length];
  },

  _buildCloser(selectedTraits, seed) {
    // Check for character traits first
    const characterTraits = Object.keys(CHARACTER_CLOSERS);
    for (const ct of characterTraits) {
      if (selectedTraits.has(ct)) {
        const pool = CHARACTER_CLOSERS[ct];
        return pool[seed % pool.length];
      }
    }
    return GENERIC_CLOSERS[seed % GENERIC_CLOSERS.length];
  },

  _findCategory(traitKey) {
    for (const [catKey, cat] of Object.entries(SCOUT_TRAITS)) {
      if (traitKey in cat.traits) return catKey;
    }
    return null;
  }
};

// ── Player Archetype (trading-card style label) ──────────────

const ARCHETYPE_NAMES = {
  technical: 'CREATIVE TECHNICIAN',
  physical:  'ATHLETIC FORCE',
  mental:    'TACTICAL MIND',
  defensive: 'DEFENSIVE SPECIALIST',
  character: 'NATURAL LEADER',
};

const ARCHETYPE_PRIORITY = ['technical', 'physical', 'mental', 'defensive', 'character'];

function getPlayerArchetype(strengths) {
  if (!strengths || !strengths.length) return null;

  // Build reverse lookup: label → category
  const labelToCat = {};
  for (const [catKey, cat] of Object.entries(SCOUT_TRAITS)) {
    for (const label of Object.values(cat.traits)) {
      labelToCat[label] = catKey;
    }
  }

  // Count traits per category
  const counts = {};
  for (const label of strengths) {
    const cat = labelToCat[label];
    if (cat) counts[cat] = (counts[cat] || 0) + 1;
  }

  // Find dominant category (highest count, tiebreak by priority order)
  let dominant = null;
  let maxCount = 0;
  for (const cat of ARCHETYPE_PRIORITY) {
    if ((counts[cat] || 0) > maxCount) {
      maxCount = counts[cat];
      dominant = cat;
    }
  }

  if (!dominant) return null;

  // Secondary categories (all with ≥1 trait)
  const ARCHETYPE_LABELS = {
    technical: 'Technically Gifted',
    physical:  'Physically Dominant',
    mental:    'Tactically Sharp',
    defensive: 'Defensively Solid',
    character: 'Strong Leader',
  };
  const activeCats = ARCHETYPE_PRIORITY
    .filter(c => counts[c] > 0)
    .slice(0, 3)
    .map(c => ARCHETYPE_LABELS[c]);

  return {
    name: ARCHETYPE_NAMES[dominant],
    categories: activeCats,
  };
}
