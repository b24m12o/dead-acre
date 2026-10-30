/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from './gs.js';
import { clamp } from './util.js';
import { META_DEF, META_VER, saveMeta } from './settings.js';
import { HEROES, PERKS } from '../game/arsenal.js';
export const DLOOK = {
  town: {
    ground: '#7a7458',
    tones: [
      'rgba(128,116,84,0.55)',
      'rgba(100,104,72,0.5)',
      'rgba(140,128,96,0.5)',
      'rgba(92,86,66,0.45)',
      'rgba(116,120,84,0.45)',
    ],
    weeds: ['rgba(88,84,58,0.55)', 'rgba(160,150,108,0.5)'],
    edge: '#4c4844',
  },
  highway: {
    ground: '#86765a',
    tones: [
      'rgba(150,128,90,0.55)',
      'rgba(120,108,76,0.5)',
      'rgba(160,140,100,0.5)',
      'rgba(100,92,70,0.45)',
      'rgba(140,120,80,0.45)',
    ],
    weeds: ['rgba(110,96,60,0.55)', 'rgba(184,164,112,0.5)'],
    edge: '#6a6660',
  },
  cemetery: {
    ground: '#56604a',
    tones: [
      'rgba(70,84,60,0.55)',
      'rgba(90,100,72,0.5)',
      'rgba(60,70,54,0.5)',
      'rgba(100,96,80,0.45)',
      'rgba(76,90,70,0.45)',
    ],
    weeds: ['rgba(60,74,48,0.55)', 'rgba(120,132,96,0.5)'],
    edge: '#3e3c38',
  },
};
const DIFFS = {
  relaxed: { hp: 0.8, dmg: 0.6, seeds: 0.7 },
  normal: { hp: 1, dmg: 1, seeds: 1 },
  hard: { hp: 1.3, dmg: 1.4, seeds: 1.5 },
};
export const DIFF = () => (GS.RUN && GS.RUN.contract ? DIFFS.normal : DIFFS[GS.meta.diff] || DIFFS.normal); // a contract is always played at Normal
export function normalizeMeta() {
  const record = v => !!v && typeof v === 'object' && !Array.isArray(v);
  GS.meta.seeds = Number.isFinite(Number(GS.meta.seeds))
    ? clamp(Math.floor(Number(GS.meta.seeds)), 0, Number.MAX_SAFE_INTEGER)
    : 0;
  GS.meta.diff = Object.prototype.hasOwnProperty.call(DIFFS, GS.meta.diff) ? GS.meta.diff : 'normal';
  const districtIds = ['town', 'highway', 'cemetery'];
  if (!districtIds.includes(GS.meta.district)) GS.meta.district = 'town';
  GS.meta.infMax = clamp(Number.isFinite(Number(GS.meta.infMax)) ? Math.floor(Number(GS.meta.infMax)) : 0, 0, 10);
  GS.meta.inf = clamp(Number.isFinite(Number(GS.meta.inf)) ? Math.floor(Number(GS.meta.inf)) : 0, 0, GS.meta.infMax);
  for (const id of Object.keys(HEROES)) GS.meta.unlocked[id] = id === 'ranger' ? true : GS.meta.unlocked[id] === true;
  for (const id of Object.keys(GS.meta.unlocked))
    if (!Object.prototype.hasOwnProperty.call(HEROES, id)) delete GS.meta.unlocked[id];
  if (!HEROES[GS.meta.hero] || !GS.meta.unlocked[GS.meta.hero]) GS.meta.hero = 'ranger';
  const cleanPerks = {};
  for (const pk of PERKS) {
    const v = Number(GS.meta.perks[pk.id] || 0);
    if (Number.isFinite(v) && v > 0) cleanPerks[pk.id] = clamp(Math.floor(v), 0, pk.max);
  }
  GS.meta.perks = cleanPerks;
  GS.meta.perkOff = record(GS.meta.perkOff) ? GS.meta.perkOff : {};
  for (const k of Object.keys(GS.meta.perkOff)) if (!PERKS.some(pk => pk.id === k)) delete GS.meta.perkOff[k];
  for (const pk of PERKS) GS.meta.perkOff[pk.id] = GS.meta.perkOff[pk.id] === true;
  for (const k of ['master', 'music', 'sfx']) {
    const v = Number(GS.meta.vol[k]);
    GS.meta.vol[k] = Number.isFinite(v) ? clamp(v, 0, 1) : META_DEF().vol[k];
  }
  if (!['white', 'amber', 'red', 'green'].includes(GS.meta.ch.col)) GS.meta.ch.col = 'white';
  GS.meta.ch.size = clamp(Number.isFinite(Number(GS.meta.ch.size)) ? Number(GS.meta.ch.size) : 1.15, 0.65, 1.8);
  GS.meta.ch.line = GS.meta.ch.line !== false;
  if (!['compact', 'full'].includes(GS.meta.hud.size)) GS.meta.hud.size = 'compact';
  GS.meta.hud.op = clamp(Number.isFinite(Number(GS.meta.hud.op)) ? Number(GS.meta.hud.op) : 1, 0.45, 1);
  if (GS.meta.hud.gfx !== 'balanced') GS.meta.hud.gfx = 'ultra';
  GS.meta.hud.fps = GS.meta.hud.fps === true;
  GS.meta.hud.ts = clamp(Number.isFinite(Number(GS.meta.hud.ts)) ? Number(GS.meta.hud.ts) : 1, 0.75, 1.5);
  for (const k of ['stats', 'chal', 'trophies', 'evacDist', 'tips']) if (!record(GS.meta[k])) GS.meta[k] = {};
  {
    const tw = record(GS.meta.twists) ? GS.meta.twists : {};
    GS.meta.twists = {};
    for (const t of ['pistol', 'nomeds', 'dark', 'glass', 'horde']) if (tw[t] === true) GS.meta.twists[t] = true;
  } // only known twists, only true
  GS.meta.tutDone = GS.meta.tutDone === true;
  GS.meta.tutForce = GS.meta.tutForce === true;
  GS.meta.v = META_VER;
  // Challenge state and lifetime counters come from local storage; coerce malformed values safely.
  for (const k of Object.keys(GS.meta.chal)) GS.meta.chal[k] = GS.meta.chal[k] === true;
  for (const k of Object.keys(GS.meta.stats)) {
    const n = Number(GS.meta.stats[k]);
    if (!Number.isFinite(n) || n < 0) delete GS.meta.stats[k];
    else GS.meta.stats[k] = Math.floor(Math.min(n, 1e9));
  }
  const districts = ['town', 'highway', 'cemetery'];
  for (const k of Object.keys(GS.meta.evacDist)) {
    if (!districts.includes(k) || GS.meta.evacDist[k] !== true) delete GS.meta.evacDist[k];
  }
  for (const k of Object.keys(GS.meta.trophies)) {
    if (!record(GS.meta.trophies[k])) {
      delete GS.meta.trophies[k];
      continue;
    }
    const t = GS.meta.trophies[k];
    for (const f of ['best', 'pbest']) {
      const n = Number(t[f]);
      if (t[f] != null && (!Number.isFinite(n) || n < 0)) delete t[f];
      else if (t[f] != null) t[f] = Math.min(n, 1e6);
    }
    const count = Number(t.n);
    if (t.n != null && (!Number.isFinite(count) || count < 0)) delete t.n;
    else if (t.n != null) t.n = Math.floor(Math.min(count, 1e9));
  }
  for (const k of Object.keys(GS.meta.tips)) GS.meta.tips[k] = GS.meta.tips[k] === true || GS.meta.tips[k] === 1;
  if (!record(GS.meta.daily)) GS.meta.daily = {};
  if (typeof GS.meta.outfit !== 'string') GS.meta.outfit = 'std';
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  normalizeMeta();
  setTimeout(saveMeta, 0); // a first write right away: if this browser won't keep the profile, the player is told now, not after a run
  GS.RUN = { hero: GS.meta.hero, district: 'town', inf: 0, endless: false };
}
