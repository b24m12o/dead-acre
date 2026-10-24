/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const DLOOK = {
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
const DIFF = () => DIFFS[meta.diff] || DIFFS.normal;
function normalizeMeta() {
  const record = v => !!v && typeof v === 'object' && !Array.isArray(v);
  meta.seeds = Number.isFinite(Number(meta.seeds))
    ? clamp(Math.floor(Number(meta.seeds)), 0, Number.MAX_SAFE_INTEGER)
    : 0;
  meta.diff = Object.prototype.hasOwnProperty.call(DIFFS, meta.diff) ? meta.diff : 'normal';
  const districtIds = ['town', 'highway', 'cemetery'];
  if (!districtIds.includes(meta.district)) meta.district = 'town';
  meta.infMax = clamp(Number.isFinite(Number(meta.infMax)) ? Math.floor(Number(meta.infMax)) : 0, 0, 10);
  meta.inf = clamp(Number.isFinite(Number(meta.inf)) ? Math.floor(Number(meta.inf)) : 0, 0, meta.infMax);
  for (const id of Object.keys(HEROES)) meta.unlocked[id] = id === 'ranger' ? true : meta.unlocked[id] === true;
  for (const id of Object.keys(meta.unlocked))
    if (!Object.prototype.hasOwnProperty.call(HEROES, id)) delete meta.unlocked[id];
  if (!HEROES[meta.hero] || !meta.unlocked[meta.hero]) meta.hero = 'ranger';
  const cleanPerks = {};
  for (const pk of PERKS) {
    const v = Number(meta.perks[pk.id] || 0);
    if (Number.isFinite(v) && v > 0) cleanPerks[pk.id] = clamp(Math.floor(v), 0, pk.max);
  }
  meta.perks = cleanPerks;
  meta.perkOff = record(meta.perkOff) ? meta.perkOff : {};
  for (const k of Object.keys(meta.perkOff)) if (!PERKS.some(pk => pk.id === k)) delete meta.perkOff[k];
  for (const pk of PERKS) meta.perkOff[pk.id] = meta.perkOff[pk.id] === true;
  for (const k of ['master', 'music', 'sfx']) {
    const v = Number(meta.vol[k]);
    meta.vol[k] = Number.isFinite(v) ? clamp(v, 0, 1) : META_DEF().vol[k];
  }
  if (!['white', 'amber', 'red', 'green'].includes(meta.ch.col)) meta.ch.col = 'white';
  meta.ch.size = clamp(Number.isFinite(Number(meta.ch.size)) ? Number(meta.ch.size) : 1.15, 0.65, 1.8);
  meta.ch.line = meta.ch.line !== false;
  if (!['compact', 'full'].includes(meta.hud.size)) meta.hud.size = 'compact';
  meta.hud.op = clamp(Number.isFinite(Number(meta.hud.op)) ? Number(meta.hud.op) : 1, 0.45, 1);
  if (meta.hud.gfx !== 'balanced') meta.hud.gfx = 'ultra';
  meta.hud.fps = meta.hud.fps === true;
  meta.hud.ts = clamp(Number.isFinite(Number(meta.hud.ts)) ? Number(meta.hud.ts) : 1, 0.75, 1.5);
  for (const k of ['stats', 'chal', 'trophies', 'evacDist', 'tips']) if (!record(meta[k])) meta[k] = {};
  {
    const tw = record(meta.twists) ? meta.twists : {};
    meta.twists = {};
    for (const t of ['pistol', 'nomeds', 'dark', 'glass', 'horde']) if (tw[t] === true) meta.twists[t] = true;
  } // only known twists, only true
  meta.tutDone = meta.tutDone === true;
  meta.tutForce = meta.tutForce === true;
  meta.v = META_VER;
  // Challenge state and lifetime counters come from local storage; coerce malformed values safely.
  for (const k of Object.keys(meta.chal)) meta.chal[k] = meta.chal[k] === true;
  for (const k of Object.keys(meta.stats)) {
    const n = Number(meta.stats[k]);
    if (!Number.isFinite(n) || n < 0) delete meta.stats[k];
    else meta.stats[k] = Math.floor(Math.min(n, 1e9));
  }
  const districts = ['town', 'highway', 'cemetery'];
  for (const k of Object.keys(meta.evacDist)) {
    if (!districts.includes(k) || meta.evacDist[k] !== true) delete meta.evacDist[k];
  }
  for (const k of Object.keys(meta.trophies)) {
    if (!record(meta.trophies[k])) {
      delete meta.trophies[k];
      continue;
    }
    const t = meta.trophies[k];
    for (const f of ['best', 'pbest']) {
      const n = Number(t[f]);
      if (t[f] != null && (!Number.isFinite(n) || n < 0)) delete t[f];
      else if (t[f] != null) t[f] = Math.min(n, 1e6);
    }
    const count = Number(t.n);
    if (t.n != null && (!Number.isFinite(count) || count < 0)) delete t.n;
    else if (t.n != null) t.n = Math.floor(Math.min(count, 1e9));
  }
  for (const k of Object.keys(meta.tips)) meta.tips[k] = meta.tips[k] === true || meta.tips[k] === 1;
  if (!record(meta.daily)) meta.daily = {};
  if (typeof meta.outfit !== 'string') meta.outfit = 'std';
}
normalizeMeta();
setTimeout(saveMeta, 0); // a first write right away: if this browser won't keep the profile, the player is told now, not after a run
let RUN = { hero: meta.hero, district: 'town', inf: 0, endless: false };
