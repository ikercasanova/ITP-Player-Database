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
      shortPassing:     'Short Passing',
      crossing:         'Crossing',
      dribbling:        'Dribbling',
      finishing:        'Finishing',
      longRangeShooting:'Long-Range Shooting',
      setPieces:        'Set Pieces',
      heading:          'Heading',
      weakFoot:         'Weak Foot Ability',
      receivingUnderPressure: 'Receiving Under Pressure',
      throughBalls:     'Through Balls',
      holdUpPlay:       'Hold-Up Play',
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
      concentration:    'Concentration',
      offTheBall:       'Off-the-Ball Movement',
      anticipation:     'Anticipation',
      communication:    'Communication',
      pressing:         'Pressing',
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
      flexibility:      'Flexibility',
      strength:         'Strength',
      acceleration:     'Acceleration',
    }
  },
  defensive: {
    label: 'Defensive',
    traits: {
      tackling:         'Tackling',
      marking:          'Marking',
      interceptions:    'Interceptions',
      oneVOneDefending: '1v1 Defending',
      coveringDepth:    'Covering Depth',
      defensiveAwareness:'Defensive Awareness',
      aerialDuels:      'Aerial Duels',
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
      resilience:           'Resilience',
      discipline:           'Discipline',
      professionalism:      'Professionalism',
    }
  },
  goalkeeping: {
    label: 'Goalkeeping',
    traits: {
      shotStopping:     'Shot Stopping',
      reflexes:         'Reflexes',
      handling:         'Handling',
      aerialCommand:    'Aerial Command',
      distribution:     'Distribution',
      oneVOneSaving:    '1v1 Saving',
      sweeping:         'Sweeping',
      kickingRange:     'Kicking Range',
      crossClaiming:    'Cross Claiming',
      gkPositioning:    'Positioning (GK)',
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
  heading:           'strong heading ability',
  weakFoot:          'comfortable on both feet',
  receivingUnderPressure: 'composed receiving under pressure',
  throughBalls:      'incisive through balls',
  shortPassing:      'precise short passing',
  holdUpPlay:        'effective hold-up play',
  // Mental
  gameReading:       'reads the game well',
  positioning:       'intelligent positioning',
  leadership:        'natural leadership',
  composure:         'composure under pressure',
  workRate:          'a relentless work rate',
  creativity:        'creative vision',
  decisionMaking:    'mature decision-making',
  concentration:     'sustained concentration',
  offTheBall:        'intelligent off-the-ball movement',
  anticipation:      'sharp anticipation',
  communication:     'vocal communication',
  pressing:          'effective pressing',
  // Physical
  pace:              'explosive pace',
  power:             'physical power',
  agility:           'sharp agility',
  stamina:           'excellent stamina',
  explosiveness:     'dynamic explosiveness',
  balance:           'outstanding balance',
  aerialPresence:    'aerial dominance',
  flexibility:       'natural flexibility',
  strength:          'upper-body strength',
  acceleration:      'quick acceleration',
  // Defensive
  tackling:          'strong tackling',
  marking:           'disciplined marking',
  interceptions:     'sharp interceptions',
  oneVOneDefending:  'solid 1v1 defending',
  coveringDepth:     'excellent covering depth',
  defensiveAwareness:'keen defensive awareness',
  aerialDuels:       'dominance in aerial duels',
  // Character
  coachable:         'highly coachable',
  highCeiling:       'high development ceiling',
  competitiveMentality: 'fierce competitor',
  versatile:         'tactical versatility',
  teamPlayer:        'selfless team player',
  resilience:        'mental resilience',
  discipline:        'tactical discipline',
  professionalism:   'professional attitude',
  // Goalkeeping
  shotStopping:      'outstanding shot stopping',
  reflexes:          'sharp reflexes',
  handling:          'reliable handling',
  aerialCommand:     'commanding aerial presence',
  distribution:      'accurate distribution',
  oneVOneSaving:     'brave 1v1 saving',
  sweeping:          'proactive sweeping',
  kickingRange:      'impressive kicking range',
  crossClaiming:     'confident cross claiming',
  gkPositioning:     'intelligent positioning',
};

// ── German short phrases ──────────────────────────────────────

const SHORT_PHRASES_DE = {
  ballControl: 'hervorragende Ballkontrolle', firstTouch: 'ein feiner erster Kontakt',
  passingRange: 'beeindruckende Passreichweite', shortPassing: 'präzises Kurzpassspiel',
  crossing: 'gefährliche Flanken', dribbling: 'starkes Dribbling',
  finishing: 'klinischer Torabschluss', longRangeShooting: 'einen kraftvollen Fernschuss',
  setPieces: 'Qualität bei Standards', heading: 'starkes Kopfballspiel',
  weakFoot: 'beidfüßig einsetzbar', receivingUnderPressure: 'sicheres Annehmen unter Druck',
  throughBalls: 'präzise Steilpässe', holdUpPlay: 'effektives Festmachen des Balls',
  gameReading: 'gutes Spielverständnis', positioning: 'intelligentes Stellungsspiel',
  leadership: 'natürliche Führungsqualitäten', composure: 'Ruhe unter Druck',
  workRate: 'unermüdlicher Einsatz', creativity: 'kreative Spielgestaltung',
  decisionMaking: 'reife Entscheidungsfindung', concentration: 'hohe Konzentrationsfähigkeit',
  offTheBall: 'intelligentes Freilaufverhalten', anticipation: 'vorausschauendes Spiel',
  communication: 'gute Kommunikation auf dem Platz', pressing: 'effektives Pressing',
  pace: 'explosive Schnelligkeit', power: 'physische Stärke',
  agility: 'hohe Wendigkeit', stamina: 'ausgezeichnete Ausdauer',
  explosiveness: 'dynamische Explosivität', balance: 'hervorragendes Gleichgewicht',
  aerialPresence: 'Kopfballstärke', flexibility: 'natürliche Flexibilität',
  strength: 'körperliche Robustheit', acceleration: 'schnelle Antrittsgeschwindigkeit',
  tackling: 'starkes Tackling', marking: 'diszipliniertes Deckungsspiel',
  interceptions: 'aufmerksames Abfangen', oneVOneDefending: 'starkes 1-gegen-1-Verteidigen',
  coveringDepth: 'gute Absicherung hinter der Kette', defensiveAwareness: 'ausgeprägtes Defensivbewusstsein',
  aerialDuels: 'Dominanz in Kopfballduellen',
  coachable: 'hohe Trainierbarkeit', highCeiling: 'hohes Entwicklungspotenzial',
  competitiveMentality: 'ausgeprägter Wettkampfgeist', versatile: 'taktische Vielseitigkeit',
  teamPlayer: 'selbstloser Teamplayer', resilience: 'mentale Widerstandsfähigkeit',
  discipline: 'taktische Disziplin', professionalism: 'professionelle Einstellung',
  shotStopping: 'starke Torverteidigung', reflexes: 'schnelle Reflexe',
  handling: 'sicheres Ballfangen', aerialCommand: 'Lufthoheit im Strafraum',
  distribution: 'präzise Spieleröffnung', oneVOneSaving: 'mutige 1-gegen-1 Paraden',
  sweeping: 'vorausschauendes Herauslaufen', kickingRange: 'große Schussweite',
  crossClaiming: 'sicheres Flankenabfangen', gkPositioning: 'intelligentes Stellungsspiel',
};

// ── Build grouped strength bullet sentences ──────────────────

function buildStrengthBullets(labels, lang) {
  if (!labels || !labels.length) return [];

  const phrases = (lang === 'de') ? SHORT_PHRASES_DE : SHORT_PHRASES;
  const conjunction = (lang === 'de') ? ' und ' : ' and ';
  const lastConj = (lang === 'de') ? ' und ' : ', and ';

  // Build reverse lookup: label → { key, category }
  const labelToInfo = {};
  const categoryOrder = ['technical', 'mental', 'physical', 'defensive', 'character', 'goalkeeping'];
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

    const parts = keys.map(k => phrases[k] || k);
    let sentence;
    if (parts.length === 1) {
      sentence = parts[0];
    } else if (parts.length === 2) {
      sentence = parts[0] + conjunction + parts[1];
    } else {
      sentence = parts.slice(0, -1).join(', ') + lastConj + parts[parts.length - 1];
    }
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
  // New traits
  heading:               ['strong heading ability', 'aerial quality in both boxes', 'a threat in the air from set pieces and open play'],
  weakFoot:              ['comfort on both feet', 'a reliable weak foot that expands his options', 'the ability to use either foot effectively'],
  receivingUnderPressure:['the composure to receive under pressure', 'confident ball reception even when closely marked', 'the ability to take the ball in tight areas'],
  throughBalls:          ['the vision to play incisive through balls', 'an eye for the killer pass', 'the ability to unlock defences with well-timed passes'],
  shortPassing:          ['precise short passing', 'crisp link-up play in tight spaces', 'quick, accurate distribution over short distances'],
  holdUpPlay:            ['effective hold-up play', 'the strength to bring others into the game', 'the ability to retain possession and lay off under pressure'],
  concentration:         ['sustained concentration throughout the match', 'the focus to stay engaged for the full 90 minutes', 'consistent attention to tactical responsibilities'],
  offTheBall:            ['intelligent off-the-ball movement', 'well-timed runs that stretch the opposition', 'the ability to find space between the lines'],
  anticipation:          ['sharp anticipation of play', 'the ability to read the game a step ahead', 'instinctive movement based on game awareness'],
  communication:         ['vocal presence on the pitch', 'effective communication that organises teammates', 'a commanding voice that improves the team structure'],
  pressing:              ['effective pressing instincts', 'the ability to lead the press and force turnovers', 'intelligent pressing triggers that disrupt the opposition'],
  flexibility:           ['natural flexibility and body control', 'fluid body movement that aids agility', 'suppleness that supports quick changes of direction'],
  strength:              ['upper-body strength in duels', 'the physicality to hold off opponents', 'robust frame that allows him to compete physically'],
  acceleration:          ['quick acceleration over the first few yards', 'explosive first-step pace', 'the burst of speed to beat defenders in tight situations'],
  coveringDepth:         ['excellent covering depth behind the defensive line', 'the awareness to cover space in behind', 'reliable positional cover when teammates push forward'],
  defensiveAwareness:    ['keen defensive awareness', 'the ability to read danger early', 'sound defensive instincts that prevent chances'],
  aerialDuels:           ['dominance in aerial duels', 'the ability to win headers in both boxes', 'physical presence in contested aerial situations'],
  resilience:            ['mental resilience under adversity', 'the ability to bounce back from setbacks', 'a strong mindset that handles pressure situations'],
  discipline:            ['tactical discipline and positional responsibility', 'the maturity to follow the team plan', 'consistent adherence to tactical instructions'],
  professionalism:       ['a professional attitude toward training and development', 'mature approach to preparation and recovery', 'the habits and mindset of a professional player'],
  // Goalkeeping
  shotStopping:          ['outstanding shot stopping ability', 'the reflexes and positioning to keep out shots from all angles', 'reliable hands and strong wrists that deny goal-scoring opportunities'],
  reflexes:              ['sharp reflexes that produce crucial saves', 'lightning-quick reactions to close-range efforts', 'the instinct to make saves that seem impossible'],
  handling:              ['secure handling under pressure', 'clean catching that gives the backline confidence', 'reliable hands in all conditions'],
  aerialCommand:         ['commanding presence in the box', 'authority when coming for crosses and corners', 'dominance in the aerial space around goal'],
  distribution:          ['accurate distribution with hands and feet', 'the ability to start attacks with precise throws and passes', 'a modern goalkeeper who contributes to build-up play'],
  oneVOneSaving:         ['brave 1v1 saving ability', 'the composure and timing to make himself big in one-on-one situations', 'sound technique when confronting attackers in isolation'],
  sweeping:              ['proactive sweeping behind the defensive line', 'the reading of play to come off his line and intercept danger', 'a goalkeeper who acts as an extra defender with intelligent sweeping'],
  kickingRange:          ['impressive kicking range', 'the ability to find teammates with long goal kicks and clearances', 'powerful and accurate distribution over long distances'],
  crossClaiming:         ['confident cross claiming', 'the timing and courage to come and claim crosses', 'authority in dealing with aerial deliveries into the box'],
  gkPositioning:         ['intelligent positioning between the posts', 'the awareness to narrow angles and cover the goal effectively', 'well-judged positioning that reduces the shooting window for opponents'],
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
  resilience:            ['His mental resilience ensures he thrives under pressure and recovers quickly from setbacks.', 'A resilient competitor who rises to challenges rather than shrinking from them.'],
  discipline:            ['His tactical discipline makes him a reliable and coachable player in any system.', 'Coaches will value his consistent adherence to team structure and tactical plans.'],
  professionalism:       ['His professional approach to training and development sets him apart from his peers.', 'A player whose off-field habits and mindset reflect genuine professional standards.'],
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
    const counts = { technical: 0, mental: 0, physical: 0, defensive: 0, goalkeeping: 0 };
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
      goalkeeping: [
        'Commands the penalty area with authority, providing a reliable last line of defense through sharp reflexes and strong positioning.',
        'A modern goalkeeper who combines shot-stopping ability with the composure to play out from the back and start attacks.',
        'Brings confidence to the backline through vocal communication, decisive aerial command, and the ability to make crucial saves in key moments.',
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

// Position-aware archetype names for more specific labels
const ARCHETYPE_BY_POSITION = {
  technical: {
    GK: 'SWEEPER KEEPER', CB: 'BALL-PLAYING DEFENDER', LB: 'CREATIVE FULLBACK', RB: 'CREATIVE FULLBACK',
    CDM: 'DEEP-LYING PLAYMAKER', CM: 'CREATIVE PLAYMAKER', CAM: 'CREATIVE TECHNICIAN',
    LW: 'TECHNICAL WINGER', RW: 'TECHNICAL WINGER', ST: 'SKILLFUL STRIKER',
    _default: 'CREATIVE TECHNICIAN',
  },
  physical: {
    GK: 'COMMANDING KEEPER', CB: 'DOMINANT DEFENDER', LB: 'DYNAMIC FULLBACK', RB: 'DYNAMIC FULLBACK',
    CDM: 'MIDFIELD ENFORCER', CM: 'BOX-TO-BOX ENGINE', CAM: 'DYNAMIC ATTACKER',
    LW: 'EXPLOSIVE WINGER', RW: 'EXPLOSIVE WINGER', ST: 'POWERFUL STRIKER',
    _default: 'ATHLETIC FORCE',
  },
  mental: {
    GK: 'TACTICAL KEEPER', CB: 'INTELLIGENT DEFENDER', LB: 'SMART FULLBACK', RB: 'SMART FULLBACK',
    CDM: 'TACTICAL ANCHOR', CM: 'MIDFIELD CONDUCTOR', CAM: 'CREATIVE THINKER',
    LW: 'INTELLIGENT WINGER', RW: 'INTELLIGENT WINGER', ST: 'CLINICAL FORWARD',
    _default: 'TACTICAL MIND',
  },
  defensive: {
    GK: 'SHOT STOPPER', CB: 'DEFENSIVE ROCK', LB: 'SOLID FULLBACK', RB: 'SOLID FULLBACK',
    CDM: 'MIDFIELD DESTROYER', CM: 'TENACIOUS MIDFIELDER', CAM: 'PRESSING MACHINE',
    LW: 'TWO-WAY WINGER', RW: 'TWO-WAY WINGER', ST: 'HARDWORKING FORWARD',
    _default: 'DEFENSIVE SPECIALIST',
  },
  character: {
    _default: 'NATURAL LEADER',
    GK: 'VOCAL LEADER', CB: 'DEFENSIVE LEADER', CDM: 'MIDFIELD LEADER',
    CM: 'TEAM CAPTAIN', ST: 'INSPIRATIONAL FORWARD',
  },
  goalkeeping: {
    GK: 'COMPLETE KEEPER', _default: 'COMPLETE KEEPER',
  },
};

// Fallback flat names (used when no position available)
const ARCHETYPE_NAMES = {
  technical:    'CREATIVE TECHNICIAN',
  physical:     'ATHLETIC FORCE',
  mental:       'TACTICAL MIND',
  defensive:    'DEFENSIVE SPECIALIST',
  character:    'NATURAL LEADER',
  goalkeeping:  'COMPLETE KEEPER',
};

const ARCHETYPE_PRIORITY = ['technical', 'goalkeeping', 'physical', 'mental', 'defensive', 'character'];

function _getArchetypeName(dominant, position) {
  const posMap = ARCHETYPE_BY_POSITION[dominant];
  if (!posMap) return ARCHETYPE_NAMES[dominant] || 'VERSATILE TALENT';
  const posCode = typeof position === 'string' ? position : position?.code;
  return posMap[posCode] || posMap._default || ARCHETYPE_NAMES[dominant];
}

function getPlayerArchetype(strengths, archetypeOverride, position) {
  // Manual override
  if (archetypeOverride && ARCHETYPE_NAMES[archetypeOverride]) {
    const ARCHETYPE_LABELS = {
      technical:    'Technically Gifted',
      physical:     'Physically Dominant',
      mental:       'Tactically Sharp',
      defensive:    'Defensively Solid',
      character:    'Strong Leader',
      goalkeeping:  'Goalkeeping Specialist',
    };
    // Build secondary cats from traits
    const labelToCat = {};
    for (const [catKey, cat] of Object.entries(SCOUT_TRAITS)) {
      for (const label of Object.values(cat.traits)) labelToCat[label] = catKey;
    }
    const counts = {};
    for (const label of (strengths || [])) {
      const cat = labelToCat[label];
      if (cat) counts[cat] = (counts[cat] || 0) + 1;
    }
    const activeCats = ARCHETYPE_PRIORITY
      .filter(c => counts[c] > 0)
      .slice(0, 3)
      .map(c => ARCHETYPE_LABELS[c]);
    return { name: _getArchetypeName(archetypeOverride, position), categories: activeCats };
  }

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
    technical:    'Technically Gifted',
    physical:     'Physically Dominant',
    mental:       'Tactically Sharp',
    defensive:    'Defensively Solid',
    character:    'Strong Leader',
    goalkeeping:  'Goalkeeping Specialist',
  };
  const activeCats = ARCHETYPE_PRIORITY
    .filter(c => counts[c] > 0)
    .slice(0, 3)
    .map(c => ARCHETYPE_LABELS[c]);

  return {
    name: _getArchetypeName(dominant, position),
    categories: activeCats,
  };
}
