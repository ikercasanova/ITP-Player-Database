'use strict';

/* ═══════════════════════════════════════════════════════════════
   report-traits.js — 4-pillar trait taxonomy, phrase pools,
   cause-effect narrative generator for ITP Family Reports
═══════════════════════════════════════════════════════════════ */

// ── Trait Taxonomy (4 Development Pillars) ────────────────────

const REPORT_TRAITS = {
  technical: {
    label: 'Technical',
    traits: {
      ballControl:       'Ball Control',
      firstTouch:        'First Touch',
      passingRange:      'Passing Range',
      crossing:          'Crossing',
      dribbling:         'Dribbling',
      finishing:         'Finishing',
      longRangeShooting: 'Long-Range Shooting',
      setPieces:         'Set Pieces',
      heading:           'Heading',
      receivingUnderPressure: 'Receiving Under Pressure',
    }
  },
  tactical: {
    label: 'Tactical',
    traits: {
      gameReading:        'Game Reading',
      positioning:        'Positioning',
      decisionMaking:     'Decision-Making',
      pressing:           'Pressing',
      offTheBallMovement: 'Off-the-Ball Movement',
      buildUpPlay:        'Build-Up Play',
      defensiveAwareness: 'Defensive Awareness',
      transitionPlay:     'Transition Play',
      setPieceAwareness:  'Set Piece Awareness',
      communicationOnField: 'Communication on Field',
    }
  },
  physical: {
    label: 'Physical',
    traits: {
      pace:          'Pace',
      power:         'Power',
      agility:       'Agility',
      stamina:       'Stamina',
      explosiveness: 'Explosiveness',
      balance:       'Balance',
      aerialPresence:'Aerial Presence',
      flexibility:   'Flexibility',
    }
  },
  mental: {
    label: 'Mental',
    traits: {
      leadership:           'Leadership',
      composure:            'Composure',
      workRate:             'Work Rate',
      coachability:         'Coachability',
      competitiveMentality: 'Competitive Mentality',
      resilience:           'Resilience',
      confidence:           'Confidence',
      emotionalControl:     'Emotional Control',
    }
  }
};

// ── Cause-Effect Phrase Pools ──────────────────────────────────
// Each trait has: strength phrases, weakness phrases, improvement phrases
// Format: { strength: [cause-effect], weakness: [area + effect], improved: [growth + effect] }

const TRAIT_PHRASES = {
  // ── TECHNICAL ────────────────────────────────────────────────
  ballControl: {
    strength: [
      'excellent ball control, allowing him to maintain possession under pressure and create time for himself in tight spaces',
      'strong ability to retain the ball in congested areas, which helps him progress play through the midfield',
      'confident technique on the ball that enables him to operate effectively even when closely marked',
    ],
    weakness: [
      'ball control in high-pressure situations, which can lead to turnovers when pressed aggressively',
      'consistency in his first touch under pressure, limiting his effectiveness in tight spaces',
    ],
    improved: [
      'ball control, now showing greater confidence in retaining possession when under pressure from opponents',
      'his ability to control the ball in tight spaces, leading to smoother transitions out of the back',
    ],
  },
  firstTouch: {
    strength: [
      'a refined first touch that sets up his next action effectively, giving him an advantage in fast-paced situations',
      'the ability to bring the ball under control instantly, creating space for himself and his teammates',
    ],
    weakness: [
      'his first touch, which can be inconsistent and sometimes slows down his play in transition',
      'the quality of his first touch under duress, occasionally allowing defenders to close him down',
    ],
    improved: [
      'his first touch, which has become noticeably cleaner and allows him to play quicker than earlier in the season',
      'the consistency of his first touch, now reliably setting up his next action in dynamic situations',
    ],
  },
  passingRange: {
    strength: [
      'an impressive passing range that allows him to switch play effectively and find teammates in advanced positions',
      'the vision and technique to deliver accurate passes over short and long distances, opening up the pitch',
    ],
    weakness: [
      'his passing range, particularly over longer distances, which limits his ability to switch play effectively',
      'accuracy in his distribution, especially under pressure, leading to some misplaced passes',
    ],
    improved: [
      'his passing range, now capable of switching play with accuracy and finding teammates in advanced positions',
      'the quality of his distribution, showing greater vision and accuracy as the season has progressed',
    ],
  },
  crossing: {
    strength: [
      'dangerous crossing ability from wide areas, consistently delivering quality balls into the box',
      'the technique to whip in accurate crosses on the run, creating chances for his teammates',
    ],
    weakness: [
      'his crossing accuracy, which can be inconsistent and limits the threat he poses from wide positions',
    ],
    improved: [
      'his crossing delivery, now providing more consistent and dangerous service from wide areas',
    ],
  },
  dribbling: {
    strength: [
      'sharp dribbling that allows him to beat defenders in 1v1 situations and progress play into dangerous areas',
      'confidence to take players on, creating numerical advantages and stretching the opposition',
    ],
    weakness: [
      'his dribbling in tight spaces, where he can sometimes lose possession trying to force past defenders',
      'decision-making when dribbling, occasionally holding the ball too long instead of releasing it',
    ],
    improved: [
      'his dribbling, now showing greater confidence to take on opponents and beat them consistently',
      'his ability to drive with the ball, becoming more direct and purposeful in possession',
    ],
  },
  finishing: {
    strength: [
      'clinical finishing, showing composure in front of goal and the instinct to find the back of the net',
      'the ability to convert chances from various positions, making him a reliable goal threat',
    ],
    weakness: [
      'his finishing, where he needs to develop greater composure and accuracy in front of goal',
      'consistency in his finishing, sometimes missing chances that could be converted with better technique',
    ],
    improved: [
      'his finishing, showing improved composure and accuracy in front of goal compared to earlier in the season',
    ],
  },
  longRangeShooting: {
    strength: [
      'a powerful long-range shot that forces goalkeepers to be alert and creates scoring opportunities from distance',
    ],
    weakness: [
      'his shooting from distance, where improved technique would add another dimension to his attacking threat',
    ],
    improved: [
      'his ability to strike from distance, now showing greater power and accuracy on long-range efforts',
    ],
  },
  setPieces: {
    strength: [
      'quality set-piece delivery, making him a valuable asset on corners and free kicks',
    ],
    weakness: [
      'his set-piece technique, an area where improvement would allow him to contribute more on dead-ball situations',
    ],
    improved: [
      'his set-piece delivery, showing improved consistency and accuracy on dead-ball situations',
    ],
  },
  heading: {
    strength: [
      'strong heading ability, both defensively and offensively, making him a threat in both boxes',
    ],
    weakness: [
      'his aerial game, where improved timing and technique would make him more effective in aerial duels',
    ],
    improved: [
      'his heading, now winning more aerial duels through better timing and positioning',
    ],
  },
  receivingUnderPressure: {
    strength: [
      'the composure to receive the ball under pressure and play out effectively, helping his team build from the back',
    ],
    weakness: [
      'his ability to receive under pressure, sometimes struggling to turn or play forward when closely marked',
    ],
    improved: [
      'his ability to receive and turn under pressure, now showing greater awareness of his surroundings',
    ],
  },

  // ── TACTICAL ─────────────────────────────────────────────────
  gameReading: {
    strength: [
      'excellent game reading, allowing him to anticipate play before it develops and make proactive decisions',
      'a mature understanding of the game that helps him position himself effectively and influence play',
    ],
    weakness: [
      'his ability to read the game, sometimes reacting to situations rather than anticipating them',
    ],
    improved: [
      'his game reading, now showing a much better understanding of when to press, hold, or cover',
    ],
  },
  positioning: {
    strength: [
      'intelligent positioning that allows him to be in the right place at the right time, both offensively and defensively',
      'a natural sense for space, consistently finding pockets between the lines',
    ],
    weakness: [
      'his positioning, particularly in defensive transitions, where he can sometimes be caught out of place',
      'spatial awareness in certain phases, occasionally leaving gaps that opponents can exploit',
    ],
    improved: [
      'his positional awareness, now showing much better discipline in maintaining his shape within the team structure',
    ],
  },
  decisionMaking: {
    strength: [
      'mature decision-making for his age, consistently picking the right option under pressure',
      'good judgment in the final third, knowing when to pass, shoot, or dribble',
    ],
    weakness: [
      'his decision-making under pressure, sometimes choosing the wrong option when faster decisions are required',
    ],
    improved: [
      'his decision-making, becoming quicker and more effective in choosing the right action in key moments',
    ],
  },
  pressing: {
    strength: [
      'effective pressing instincts, reading the moment to engage and forcing turnovers in dangerous areas',
      'aggressive pressing that disrupts the opposition\'s build-up play and creates opportunities',
    ],
    weakness: [
      'the timing and intensity of his pressing, which needs to become more consistent and coordinated with teammates',
    ],
    improved: [
      'his pressing, now showing better timing and coordination with teammates to win the ball back higher up the pitch',
    ],
  },
  offTheBallMovement: {
    strength: [
      'intelligent off-the-ball movement that creates space for himself and his teammates',
      'the ability to make penetrating runs that stretch defenses and create scoring opportunities',
    ],
    weakness: [
      'his off-the-ball movement, where more dynamic runs would help him create and exploit space',
    ],
    improved: [
      'his off-the-ball movement, making smarter and more purposeful runs to create and exploit space',
    ],
  },
  buildUpPlay: {
    strength: [
      'a strong ability to contribute to build-up play, helping his team progress the ball from the back',
    ],
    weakness: [
      'his involvement in build-up play, where he needs to offer himself more as a passing option',
    ],
    improved: [
      'his contribution to build-up play, now more involved in progressing the ball through the thirds',
    ],
  },
  defensiveAwareness: {
    strength: [
      'strong defensive awareness, tracking back and providing cover when his team loses possession',
    ],
    weakness: [
      'his defensive awareness, particularly in transition moments when quicker recovery is needed',
    ],
    improved: [
      'his defensive awareness, now consistently tracking back and contributing to defensive solidity',
    ],
  },
  transitionPlay: {
    strength: [
      'excellent ability to contribute in transitions, quickly switching from defense to attack and vice versa',
    ],
    weakness: [
      'his effectiveness in transitions, where quicker decision-making would help him capitalize on turnover moments',
    ],
    improved: [
      'his transition play, now reacting faster when possession changes and making better use of counter-attacking moments',
    ],
  },
  setPieceAwareness: {
    strength: [
      'good awareness on set pieces, knowing where to position himself to create or prevent danger',
    ],
    weakness: [
      'his awareness during set pieces, where better positioning would make him more effective',
    ],
    improved: [
      'his set-piece awareness, now taking up better positions to both attack and defend dead-ball situations',
    ],
  },
  communicationOnField: {
    strength: [
      'strong vocal presence on the field, organizing teammates and providing clear instructions',
    ],
    weakness: [
      'his communication on the field, where being more vocal would help him and his teammates stay organized',
    ],
    improved: [
      'his on-field communication, becoming more vocal and helping his teammates with positioning and awareness',
    ],
  },

  // ── PHYSICAL ─────────────────────────────────────────────────
  pace: {
    strength: [
      'explosive pace that allows him to get in behind defenders and stretch the opposition',
      'genuine speed that creates separation and makes him a constant threat on the counter',
    ],
    weakness: [
      'his pace, which limits his ability to recover defensively and exploit space in behind',
    ],
    improved: [
      'his speed, now showing quicker acceleration and better ability to separate from defenders',
    ],
  },
  power: {
    strength: [
      'physical power that allows him to compete in duels and hold off opponents effectively',
      'a strong frame that gives him an advantage in physical battles and aerial contests',
    ],
    weakness: [
      'his physical strength, where continued development in the gym will help him compete more effectively in duels',
    ],
    improved: [
      'his physical power, now competing more effectively in duels and showing greater upper-body strength',
    ],
  },
  agility: {
    strength: [
      'quick agility that allows him to change direction sharply and evade challenges in tight areas',
    ],
    weakness: [
      'his agility and change of direction, which would help him navigate tight spaces more effectively',
    ],
    improved: [
      'his agility, now changing direction more sharply and effectively in tight spaces',
    ],
  },
  stamina: {
    strength: [
      'excellent stamina, maintaining his intensity and quality throughout the full duration of matches',
    ],
    weakness: [
      'his endurance levels, where improved aerobic capacity would help him sustain intensity for the full 90 minutes',
    ],
    improved: [
      'his stamina, now maintaining a higher intensity for longer periods during matches',
    ],
  },
  explosiveness: {
    strength: [
      'dynamic explosiveness over short distances, giving him an advantage in the first few meters of any sprint',
    ],
    weakness: [
      'his explosive acceleration, where improved power output over short distances would enhance his game',
    ],
    improved: [
      'his explosiveness, showing noticeable improvement in his acceleration and short-distance burst',
    ],
  },
  balance: {
    strength: [
      'outstanding balance that allows him to stay on his feet through contact and maintain control of the ball',
    ],
    weakness: [
      'his balance under contact, where a stronger base would help him remain on his feet in physical duels',
    ],
    improved: [
      'his balance, now staying on his feet more effectively through physical challenges',
    ],
  },
  aerialPresence: {
    strength: [
      'a commanding aerial presence, winning the majority of aerial duels through good timing and leap',
    ],
    weakness: [
      'his aerial game, where improved jump height and timing would help him compete more effectively in the air',
    ],
    improved: [
      'his aerial ability, now winning more headers through better jump timing and body positioning',
    ],
  },
  flexibility: {
    strength: [
      'good flexibility and mobility, reducing his injury risk and allowing him to perform dynamic movements effectively',
    ],
    weakness: [
      'his flexibility and mobility, an area where focused work would support his long-term physical development',
    ],
    improved: [
      'his flexibility, showing improved range of motion that supports his overall athletic performance',
    ],
  },

  // ── MENTAL ───────────────────────────────────────────────────
  leadership: {
    strength: [
      'natural leadership qualities, organizing and motivating those around him on and off the pitch',
      'a vocal presence who takes responsibility and leads by example during training and matches',
    ],
    weakness: [
      'his leadership, where becoming more vocal and assertive would help him influence his teammates positively',
    ],
    improved: [
      'his leadership, becoming more vocal and taking greater responsibility within the group',
    ],
  },
  composure: {
    strength: [
      'composure under pressure, staying calm in high-stakes moments and making sound decisions',
      'a steady temperament that allows him to perform consistently regardless of the situation',
    ],
    weakness: [
      'his composure under pressure, where staying calmer in intense moments would improve his performance',
    ],
    improved: [
      'his composure, now handling pressure situations with greater calmness and clarity',
    ],
  },
  workRate: {
    strength: [
      'a relentless work rate, consistently putting in effort in both attacking and defensive phases',
      'tireless commitment that sets the standard for his teammates and earns the respect of coaches',
    ],
    weakness: [
      'the consistency of his work rate, where maintaining effort throughout the full match would elevate his game',
    ],
    improved: [
      'his work rate, now showing more consistent effort across the full duration of training sessions and matches',
    ],
  },
  coachability: {
    strength: [
      'a highly coachable attitude, responding positively to feedback and implementing changes quickly',
      'receptiveness to coaching that makes him an ideal player for any development program',
    ],
    weakness: [
      'his responsiveness to feedback, where embracing coaching points more openly would accelerate his development',
    ],
    improved: [
      'his coachability, now responding faster to tactical adjustments and implementing feedback effectively',
    ],
  },
  competitiveMentality: {
    strength: [
      'a fierce competitive mentality, bringing intensity and desire to every session and match',
      'a winning mindset that drives him to raise his level in the biggest moments',
    ],
    weakness: [
      'his competitive edge, where developing a stronger inner drive would help him push through challenging moments',
    ],
    improved: [
      'his competitive mentality, now showing greater fight and determination in difficult situations',
    ],
  },
  resilience: {
    strength: [
      'strong mental resilience, bouncing back from setbacks and maintaining his focus after mistakes',
    ],
    weakness: [
      'his resilience after setbacks, where developing a stronger ability to bounce back would support his growth',
    ],
    improved: [
      'his mental resilience, now recovering more quickly from mistakes and maintaining his performance level',
    ],
  },
  confidence: {
    strength: [
      'self-confidence that allows him to express himself on the pitch and take on challenges without hesitation',
    ],
    weakness: [
      'his confidence, particularly in high-pressure situations, where believing in his abilities more would unlock his potential',
    ],
    improved: [
      'his confidence, now playing with greater self-belief and willingness to take risks on the ball',
    ],
  },
  emotionalControl: {
    strength: [
      'excellent emotional control, maintaining focus and discipline even in frustrating or intense moments',
    ],
    weakness: [
      'his emotional control, where staying calmer during heated moments would help him avoid unnecessary situations',
    ],
    improved: [
      'his emotional control, now managing his frustrations better and staying focused during difficult moments',
    ],
  },
};

// ── Deterministic hash for consistent phrase selection ──────────

function _hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Narrative Generator ────────────────────────────────────────

const ReportNarrative = {

  /**
   * Generate a development review paragraph for one pillar.
   * @param {string} pillarKey — 'technical'|'tactical'|'physical'|'mental'
   * @param {object} traits — { strengths: [...keys], weaknesses: [...keys], improved: [...keys] }
   * @param {object} player — full player object (for name, tests, ageGroup)
   * @returns {string} narrative paragraph
   */
  generatePillarReview(pillarKey, traits, player) {
    if (!traits) return '';
    const { strengths = [], weaknesses = [], improved = [] } = traits;
    if (strengths.length === 0 && weaknesses.length === 0 && improved.length === 0) return '';

    const name = player.firstName || 'The player';
    const seed = _hashName(name + pillarKey);
    const sentences = [];

    // Strengths — cause-effect
    if (strengths.length > 0) {
      const sPhrases = strengths.map((key, i) => {
        const pool = TRAIT_PHRASES[key]?.strength;
        if (!pool) return null;
        return pool[(seed + i) % pool.length];
      }).filter(Boolean);

      if (sPhrases.length === 1) {
        sentences.push(`${name} demonstrates ${sPhrases[0]}.`);
      } else if (sPhrases.length === 2) {
        sentences.push(`${name} demonstrates ${sPhrases[0]}.`);
        sentences.push(`He also shows ${sPhrases[1]}.`);
      } else if (sPhrases.length >= 3) {
        sentences.push(`${name} demonstrates ${sPhrases[0]}.`);
        sentences.push(`He also shows ${sPhrases[1]}, as well as ${sPhrases[2]}.`);
      }
    }

    // Physical pillar: enrich with test data
    if (pillarKey === 'physical' && player.tests && player.ageGroup) {
      const testRef = ReportNarrative._buildTestReferences(player);
      if (testRef) sentences.push(testRef);
    }

    // Weaknesses — areas of opportunity
    if (weaknesses.length > 0) {
      const wPhrases = weaknesses.map((key, i) => {
        const pool = TRAIT_PHRASES[key]?.weakness;
        if (!pool) return null;
        return pool[(seed + i) % pool.length];
      }).filter(Boolean);

      if (wPhrases.length === 1) {
        sentences.push(`An area of opportunity is ${wPhrases[0]}.`);
      } else if (wPhrases.length >= 2) {
        sentences.push(`Areas of opportunity include ${wPhrases[0]}.`);
        sentences.push(`Additionally, ${wPhrases[1]}.`);
      }
    }

    // Improvements — growth this season
    if (improved.length > 0) {
      const iPhrases = improved.map((key, i) => {
        const pool = TRAIT_PHRASES[key]?.improved;
        if (!pool) return null;
        return pool[(seed + i) % pool.length];
      }).filter(Boolean);

      if (iPhrases.length === 1) {
        sentences.push(`Notably this season, ${name} has improved ${iPhrases[0]}.`);
      } else if (iPhrases.length >= 2) {
        sentences.push(`This season, ${name} has improved ${iPhrases[0]}.`);
        sentences.push(`He has also developed ${iPhrases[1]}.`);
      }
    }

    return sentences.join(' ');
  },

  /**
   * Build test data references for the Physical pillar narrative.
   */
  _buildTestReferences(player) {
    const refs = [];
    const testMappings = [
      { key: 'cmj', label: 'CMJ', unit: 'cm' },
      { key: 'broadJump', label: 'Broad Jump', unit: 'cm' },
      { key: 'sprint5m', label: '5m sprint', unit: 's' },
      { key: 'sprint30m', label: '30m sprint', unit: 's' },
      { key: 'ift3015', label: '30-15 IFT', unit: 'km/h' },
      { key: 'trapBarDL', label: 'Trap Bar Deadlift', unit: 'kg' },
    ];

    for (const { key, label, unit } of testMappings) {
      const testData = player.tests?.[key];
      if (!testData?.sessions || testData.sessions.length < 2) continue;

      const first = testData.sessions[0];
      const last = testData.sessions[testData.sessions.length - 1];
      if (first.best === null || last.best === null) continue;

      const { level } = Benchmarks.evaluate(player.ageGroup, key, last.best);
      if (level === 'none') continue;

      const levelLabel = level === 'poor' ? 'developing' : level.charAt(0).toUpperCase() + level.slice(1);
      refs.push(`his ${label} progressed from ${first.best} to ${last.best} ${unit} (${levelLabel} range)`);

      if (refs.length >= 2) break;
    }

    if (refs.length === 0) return null;
    if (refs.length === 1) return `His performance data shows that ${refs[0]}.`;
    return `His performance data shows that ${refs[0]}, and ${refs[1]}.`;
  },

  /**
   * Generate the Head Coach evaluation combining all data sources.
   * @param {object} player — full player object
   * @param {object} developmentReview — the 4-pillar trait selections
   * @param {string} coachNotes — free-text personal observations
   * @param {Array} trials — trial report objects
   * @returns {string} comprehensive evaluation narrative
   */
  generateCoachEvaluation(player, developmentReview, coachNotes, trials, endOfSeason = false) {
    const name = player.firstName || 'The player';
    const seed = _hashName(name + 'eval');
    const paragraphs = [];

    // 1. Weave coach notes as the opening (personal voice)
    if (coachNotes && coachNotes.trim()) {
      paragraphs.push(coachNotes.trim());
    }

    // 2. Data-driven summary
    const dataSummary = ReportNarrative._buildDataSummary(player, seed);
    if (dataSummary) paragraphs.push(dataSummary);

    // 3. Key strengths summary (across all pillars)
    const strengthSummary = ReportNarrative._buildStrengthSummary(developmentReview, name);
    if (strengthSummary) paragraphs.push(strengthSummary);

    // 4. Trial references
    if (trials && trials.length > 0) {
      const trialRef = ReportNarrative._buildTrialReferences(trials, name);
      if (trialRef) paragraphs.push(trialRef);
    }

    // 5. Closer (forward-looking or end-of-season farewell)
    const closer = ReportNarrative._buildCloser(player, developmentReview, seed, endOfSeason);
    if (closer) paragraphs.push(closer);

    return paragraphs.join('\n\n');
  },

  _buildDataSummary(player, seed) {
    if (!player.tests) return null;
    const improvements = [];

    for (const [key, testData] of Object.entries(player.tests)) {
      if (!testData?.sessions || testData.sessions.length < 2) continue;
      const first = testData.sessions[0];
      const last = testData.sessions[testData.sessions.length - 1];
      if (first.best === null || last.best === null) continue;

      const def = TEST_DEFS[key];
      if (!def) continue;

      const diff = last.best - first.best;
      const improvement = def.lowerIsBetter ? -diff : diff;
      if (improvement > 0) {
        const pct = Math.abs(diff / first.best * 100).toFixed(0);
        improvements.push({
          name: def.name,
          from: first.best,
          to: last.best,
          unit: def.unit,
          pct,
          improvement
        });
      }
    }

    if (improvements.length === 0) return null;

    improvements.sort((a, b) => b.improvement - a.improvement);
    const top = improvements.slice(0, 4);

    const parts = top.map(t => `${t.name} (${t.from} → ${t.to} ${t.unit})`);
    if (parts.length === 1) {
      return `On the performance side, measurable improvement has been recorded in ${parts[0]}.`;
    }
    return `On the performance side, measurable improvements have been recorded in ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.`;
  },

  _buildStrengthSummary(review, name) {
    if (!review) return null;
    const allStrengths = [];
    for (const pillar of ['technical', 'tactical', 'physical', 'mental']) {
      const s = review[pillar]?.strengths || [];
      for (const key of s) {
        const label = REPORT_TRAITS[pillar]?.traits[key];
        if (label) allStrengths.push(label.toLowerCase());
      }
    }
    if (allStrengths.length === 0) return null;
    if (allStrengths.length <= 4) {
      return `${name}'s key strengths — ${allStrengths.join(', ')} — make him a valuable and well-rounded contributor to the team.`;
    }
    const shown = allStrengths.slice(0, 5);
    return `${name}'s key strengths — ${shown.slice(0, -1).join(', ')}, and ${shown[shown.length - 1]} — highlight his multifaceted development and make him a well-rounded contributor.`;
  },

  _buildTrialReferences(trials, name) {
    const rated = trials.filter(t => t.clubName);
    if (rated.length === 0) return null;

    if (rated.length === 1) {
      const t = rated[0];
      let s = `During his trial at ${t.clubName}`;
      if (t.strengthsNoted) s += `, coaches highlighted ${t.strengthsNoted.toLowerCase()}`;
      s += '.';
      if (t.overallComments) s += ` ${t.overallComments}`;
      return s;
    }

    const clubNames = rated.map(t => t.clubName);
    return `${name} has been on trial at ${clubNames.join(' and ')}, receiving positive feedback from coaching staff at both clubs.`;
  },

  _buildCloser(player, review, seed, endOfSeason = false) {
    const name = player.firstName || 'The player';

    // Check for weaknesses to reference growth areas
    const allWeaknesses = [];
    if (review) {
      for (const pillar of ['technical', 'tactical', 'physical', 'mental']) {
        const w = review[pillar]?.weaknesses || [];
        for (const key of w) {
          const label = REPORT_TRAITS[pillar]?.traits[key];
          if (label) allWeaknesses.push(label.toLowerCase());
        }
      }
    }

    if (endOfSeason) {
      const eosClosers = [
        `It was exciting to see ${name} grow both on and off the field this season. With continued dedication and the right development environment, ${name} has strong potential to reach the next level of his career.`,
        `It was a pleasure working with ${name} this season. His commitment to the program has been outstanding, and we are excited about his future development.`,
        `${name} has had a remarkable season of growth. We look forward to seeing him continue to develop and reach new heights in the seasons ahead.`,
      ];

      if (allWeaknesses.length > 0) {
        const area = allWeaknesses[0];
        return `Continued focus on ${area} will further elevate ${name}'s game. ` + eosClosers[seed % eosClosers.length];
      }
      return eosClosers[seed % eosClosers.length];
    }

    const closers = [
      `With continued dedication and the right development environment, ${name} has strong potential to reach the next level of his career.`,
      `${name} has shown consistent growth throughout the season and projects as a player with significant upside for the future.`,
      `Overall, ${name} has had a productive season with clear development across multiple areas. We look forward to seeing his continued progression.`,
    ];

    if (allWeaknesses.length > 0) {
      const area = allWeaknesses[0];
      return `Continued focus on ${area} will further elevate ${name}'s game. ` + closers[seed % closers.length];
    }

    return closers[seed % closers.length];
  },

  /**
   * Get all strengths as readable labels for the summary section.
   */
  getStrengthLabels(review) {
    const labels = [];
    if (!review) return labels;
    for (const pillar of ['technical', 'tactical', 'physical', 'mental']) {
      for (const key of (review[pillar]?.strengths || [])) {
        const label = REPORT_TRAITS[pillar]?.traits[key];
        if (label) labels.push(label);
      }
    }
    return labels;
  },

  /**
   * Get all weaknesses as readable labels.
   */
  getWeaknessLabels(review) {
    const labels = [];
    if (!review) return labels;
    for (const pillar of ['technical', 'tactical', 'physical', 'mental']) {
      for (const key of (review[pillar]?.weaknesses || [])) {
        const label = REPORT_TRAITS[pillar]?.traits[key];
        if (label) labels.push(label);
      }
    }
    return labels;
  },

  /**
   * Get strengths + standalone improved traits for the Key Strengths section.
   * Traits that are both strength+improved appear once (as strengths).
   * Standalone improved traits get an "(Improved)" suffix.
   */
  getStrengthAndImprovedLabels(review) {
    const labels = [];
    const seen = new Set();
    if (!review) return labels;

    // First: all strength traits (includes strength-improved)
    for (const pillar of ['technical', 'tactical', 'physical', 'mental']) {
      for (const key of (review[pillar]?.strengths || [])) {
        const label = REPORT_TRAITS[pillar]?.traits[key];
        if (label) { labels.push(label); seen.add(key); }
      }
    }

    // Then: standalone improved traits not already a strength
    for (const pillar of ['technical', 'tactical', 'physical', 'mental']) {
      for (const key of (review[pillar]?.improved || [])) {
        if (seen.has(key)) continue;
        const label = REPORT_TRAITS[pillar]?.traits[key];
        if (label) { labels.push(`${label} (Improved)`); seen.add(key); }
      }
    }

    return labels;
  },

  /**
   * Get test-derived strengths for tests rated "good" or "elite".
   * Used to pad Key Strengths when trait-based items are insufficient.
   */
  getTestDerivedStrengths(player) {
    const labels = [];
    if (!player.tests || !player.ageGroup) return labels;

    for (const [key, testData] of Object.entries(player.tests)) {
      if (!testData?.best) continue;
      const { level } = Benchmarks.evaluate(player.ageGroup, key, testData.best);
      if (level === 'good' || level === 'elite') {
        const def = TEST_DEFS[key];
        if (def) labels.push(`${def.name} (${level === 'elite' ? 'Elite' : 'Good'})`);
      }
    }
    return labels;
  },

  /**
   * Get biggest test improvements for the season.
   */
  getBiggestImprovements(player) {
    if (!player.tests) return [];
    const improvements = [];

    for (const [key, testData] of Object.entries(player.tests)) {
      if (!testData?.sessions || testData.sessions.length < 2) continue;
      const first = testData.sessions[0];
      const last = testData.sessions[testData.sessions.length - 1];
      if (first.best === null || last.best === null) continue;

      const def = TEST_DEFS[key];
      if (!def) continue;

      const diff = last.best - first.best;
      const improvement = def.lowerIsBetter ? -diff : diff;
      if (improvement <= 0) continue;

      const pctChange = Math.abs(diff / first.best * 100).toFixed(1);
      improvements.push({
        testKey: key,
        name: def.name,
        unit: def.unit,
        from: first.best,
        to: last.best,
        pctChange: `${pctChange}%`,
        lowerIsBetter: def.lowerIsBetter,
      });
    }

    improvements.sort((a, b) => {
      const aPct = parseFloat(a.pctChange);
      const bPct = parseFloat(b.pctChange);
      return bPct - aPct;
    });

    return improvements;
  },

  /**
   * Get all traits marked as "improved" as readable labels.
   */
  getImprovedTraitLabels(review) {
    const labels = [];
    if (!review) return labels;
    for (const pillar of ['technical', 'tactical', 'physical', 'mental']) {
      for (const key of (review[pillar]?.improved || [])) {
        const label = REPORT_TRAITS[pillar]?.traits[key];
        if (label) labels.push(label);
      }
    }
    return labels;
  },

  /**
   * Generate a polished trial narrative from bullet points.
   * @param {object} player — player object
   * @param {object} trial — { clubName, date, bullets }
   * @returns {string} narrative paragraph
   */
  generateTrialNarrative(player, trial) {
    const name = player.firstName || 'The player';
    const club = trial.clubName || 'the club';
    const raw = (trial.bullets || '').trim();
    if (!raw) return '';

    // Split bullets: comma-separated, newline-separated, or bullet-point separated
    const items = raw
      .split(/[,\n]+/)
      .map(s => s.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);

    if (items.length === 0) return '';

    // Separate positive vs areas-to-improve (look for keywords)
    const negativeKeywords = ['needs', 'needs to', 'improve', 'lack', 'weak', 'struggle', 'work on', 'develop', 'inconsistent', 'limited'];
    const positives = [];
    const areas = [];

    for (const item of items) {
      const lower = item.toLowerCase();
      if (negativeKeywords.some(kw => lower.includes(kw))) {
        areas.push(item);
      } else {
        positives.push(item);
      }
    }

    // Build narrative
    const sentences = [];
    const dateStr = trial.date
      ? new Date(trial.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : null;

    // Opening
    const timeRef = dateStr ? ` in ${dateStr}` : '';
    const levelRef = trial.competitionLevel
      ? ` at the ${trial.competitionLevel}${trial.tier ? ' Tier ' + trial.tier : ''} level`
      : '';
    if (positives.length > 0) {
      if (positives.length === 1) {
        sentences.push(`During his trial at ${club}${levelRef}${timeRef}, ${name} demonstrated ${positives[0].toLowerCase()}, earning positive feedback from the coaching staff.`);
      } else if (positives.length === 2) {
        sentences.push(`During his trial at ${club}${levelRef}${timeRef}, ${name} demonstrated ${positives[0].toLowerCase()} as well as ${positives[1].toLowerCase()}, making a positive impression on the coaching staff.`);
      } else {
        const last = positives.pop();
        sentences.push(`During his trial at ${club}${levelRef}${timeRef}, ${name} showcased several notable qualities including ${positives.map(p => p.toLowerCase()).join(', ')}, and ${last.toLowerCase()}.`);
      }
    } else {
      sentences.push(`${name} participated in a trial at ${club}${levelRef}${timeRef}.`);
    }

    // Coach reference
    if (trial.coachName) {
      sentences.push(`Coach ${trial.coachName} evaluated ${name} across multiple training sessions and match situations.`);
    }

    // Areas
    if (areas.length > 0) {
      const areaText = areas.map(a => a.toLowerCase()).join(' and ');
      sentences.push(`The coaching staff identified ${areaText} as areas for continued development, which aligns with the focus areas in his current training plan.`);
    }

    return sentences.join(' ');
  },
};
