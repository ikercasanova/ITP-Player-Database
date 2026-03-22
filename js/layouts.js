'use strict';

/* ═══════════════════════════════════════════════════════════════
   layouts.js — Card layout configurations
   Each layout defines language strings, benchmarks, contact info,
   and unit formatting for a target audience.
═══════════════════════════════════════════════════════════════ */

const CARD_LAYOUTS = {

  // ── USA Colleges (default — current design) ─────────────────
  usa: {
    id: 'usa',
    label: 'USA Colleges',
    cssClass: 'layout-usa',
    programName: '1. FC KÖLN — INTERNATIONAL TALENT PATHWAY',
    footerText: '1. FC KÖLN INTERNATIONAL TALENT PATHWAY — PLAYER PROFILE',
    sections: {
      overview:    'OVERVIEW',
      contact:     'CONTACT',
      tests:       'PERFORMANCE TESTS',
      profile:     'PLAYER PROFILE',
      strengths:   'KEY STRENGTHS',
      playingStyle:'PLAYING STYLE',
      videos:      'VIDEOS',
      videosHint:  'Download PDF and click on video to watch',
    },
    labels: {
      nationality:  'Nationality',
      passport:     'Passport',
      dateOfBirth:  'Date of Birth',
      height:       'Height',
      weight:       'Weight',
      foot:         'Pref. Foot',
      position:     'Position',
      player:       'Player',
      noVideos:     'No video links added',
      highlight:    'HIGHLIGHT',
      fullGame:     'FULL GAME',
      highlightLabel: 'Highlight Video',
      fullGameLabel:  'Full Game',
    },
    benchmarks: {
      cmjCm:        { label: 'CMJ',        unit: 'cm', benchmark: 36,   higherIsBetter: true,  min: 0,   max: 70  },
      broadJumpCm:  { label: 'BROAD JUMP', unit: 'cm', benchmark: 220,  higherIsBetter: true,  min: 0,   max: 300 },
      sprint30mSec: { label: '30M SPRINT', unit: 's',  benchmark: 4.25, higherIsBetter: false, min: 3.0, max: 6.0 },
      sprint40ydSec:{ label: '40YD DASH',  unit: 's',  benchmark: 4.85, higherIsBetter: false, min: 3.5, max: 6.5 },
    },
    benchmarkLabel: 'US College Avg',
    heightFormat: 'dual',
    weightFormat: 'dual',
    dateLocale: 'en-GB',
    contact: {
      name:  'Max Bisinger',
      role:  'ITP Coordinator',
      email: 'max.bisinger@warubi-sports.com',
      org:   ['1. FC Köln Football School', 'International Talent Pathway'],
    },
  },

  // ── German Clubs (fully in German) ──────────────────────────
  german: {
    id: 'german',
    label: 'German Clubs',
    cssClass: 'layout-german',
    programName: '1. FC KÖLN — INTERNATIONALE TALENTFÖRDERUNG',
    footerText: '1. FC KÖLN INTERNATIONALE TALENTFÖRDERUNG — SPIELERPROFIL',
    sections: {
      overview:    'ÜBERSICHT',
      contact:     'KONTAKT',
      tests:       'LEISTUNGSTESTS',
      profile:     'SPIELERPROFIL',
      strengths:   'STÄRKEN',
      playingStyle:'SPIELSTIL',
      videos:      'VIDEOS',
      videosHint:  'PDF herunterladen und auf Video klicken zum Ansehen',
    },
    labels: {
      nationality:  'Nationalität',
      passport:     'Pass',
      dateOfBirth:  'Geburtsdatum',
      height:       'Größe',
      weight:       'Gewicht',
      foot:         'Fuß',
      position:     'Position',
      player:       'Spieler',
      noVideos:     'Keine Videolinks vorhanden',
      highlight:    'HIGHLIGHT',
      fullGame:     'GANZES SPIEL',
      highlightLabel: 'Highlight-Video',
      fullGameLabel:  'Ganzes Spiel',
    },
    benchmarks: {
      cmjCm:        { label: 'CMJ',        unit: 'cm', benchmark: 36,   higherIsBetter: true,  min: 0,   max: 70  },
      broadJumpCm:  { label: 'BROAD JUMP', unit: 'cm', benchmark: 220,  higherIsBetter: true,  min: 0,   max: 300 },
      sprint30mSec: { label: '30M SPRINT', unit: 's',  benchmark: 4.25, higherIsBetter: false, min: 3.0, max: 6.0 },
    },
    benchmarkLabel: 'Sub-Elite Durchschnitt',
    heightFormat: 'metric',
    weightFormat: 'metric',
    dateLocale: 'de-DE',
    contact: {
      name:  'TBD',
      role:  'TBD',
      email: 'TBD',
      org:   ['1. FC Köln Fußballschule', 'Internationale Talentförderung'],
    },
  },

  // ── International Teams (English, no 40YD) ──────────────────
  international: {
    id: 'international',
    label: 'International Teams',
    cssClass: 'layout-international',
    programName: '1. FC KÖLN — INTERNATIONAL TALENT PATHWAY',
    footerText: '1. FC KÖLN INTERNATIONAL TALENT PATHWAY — PLAYER PROFILE',
    sections: {
      overview:    'OVERVIEW',
      contact:     'CONTACT',
      tests:       'PERFORMANCE TESTS',
      profile:     'PLAYER PROFILE',
      strengths:   'KEY STRENGTHS',
      playingStyle:'PLAYING STYLE',
      videos:      'VIDEOS',
      videosHint:  'Download PDF and click on video to watch',
    },
    labels: {
      nationality:  'Nationality',
      passport:     'Passport',
      dateOfBirth:  'Date of Birth',
      height:       'Height',
      weight:       'Weight',
      foot:         'Pref. Foot',
      position:     'Position',
      player:       'Player',
      noVideos:     'No video links added',
      highlight:    'HIGHLIGHT',
      fullGame:     'FULL GAME',
      highlightLabel: 'Highlight Video',
      fullGameLabel:  'Full Game',
    },
    benchmarks: {
      cmjCm:        { label: 'CMJ',        unit: 'cm', benchmark: 36,   higherIsBetter: true,  min: 0,   max: 70  },
      broadJumpCm:  { label: 'BROAD JUMP', unit: 'cm', benchmark: 220,  higherIsBetter: true,  min: 0,   max: 300 },
      sprint30mSec: { label: '30M SPRINT', unit: 's',  benchmark: 4.25, higherIsBetter: false, min: 3.0, max: 6.0 },
    },
    benchmarkLabel: 'Sub-Elite Avg',
    heightFormat: 'dual',
    weightFormat: 'dual',
    dateLocale: 'en-GB',
    contact: {
      name:  'Max Bisinger',
      role:  'ITP Coordinator',
      email: 'max.bisinger@warubi-sports.com',
      org:   ['1. FC Köln Football School', 'International Talent Pathway'],
    },
  },

};

// ── Contact Options ─────────────────────────────────────────

const CARD_CONTACTS = {
  max: {
    id: 'max',
    label: 'Max Bisinger',
    name: 'Max Bisinger',
    role: 'ITP Coordinator',
    email: 'max.bisinger@warubi-sports.com',
    org: ['1. FC Köln Football School', 'International Talent Pathway'],
  },
  thomas: {
    id: 'thomas',
    label: 'Thomas Ellinger',
    name: 'Thomas Ellinger',
    role: 'ITP Coordinator',
    email: 'th.el@warubi-sports.com',
    org: ['1. FC Köln Football School', 'International Talent Pathway'],
  },
};

function getLayout(id) {
  return CARD_LAYOUTS[id] || CARD_LAYOUTS.usa;
}
