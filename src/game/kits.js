/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Gun kits: once the convoy has no more guns to spare, the late weapon cases bring parts and loads for the guns you
// already carry: a scope, slugs, a bigger belt. Each case holds two kits and you take one; a gun can carry both of its
// kits by the end. kitMod(g) is what a gun's kits add up to, read where the gun fires, loads and reloads.
import { GS } from '../core/gs.js';
import { GUNS } from './arsenal.js';

// m: dmg / spread / reload multiply; magAdd / pierce / crit add; kb multiplies the shove; slug: one solid slug instead
// of buckshot; brace: the gun steadies when you stand still; blast: grenade burst radius; carry: more of its ammo
export const KITS = {
  match: {
    gun: 'pistol',
    name: 'Match Barrel',
    desc: 'A match barrel and trigger: +30% damage and half the spread.',
    m: { dmg: 1.3, spread: 0.5 },
  },
  pmag: {
    gun: 'pistol',
    name: '17-Round Magazines',
    desc: 'Five more rounds a magazine and 25% faster reloads.',
    m: { magAdd: 5, reload: 0.75 },
  },
  slugs: {
    gun: 'shotgun',
    name: 'Slug Rounds',
    desc: 'One solid lead slug instead of buckshot: hits as hard as the whole load at any range and goes through two bodies.',
    m: { slug: 1 },
  },
  tube: {
    gun: 'shotgun',
    name: 'Extended Tube',
    desc: 'Three more shells in the tube and 30% faster loading.',
    m: { magAdd: 3, reload: 0.7 },
  },
  drum12: {
    gun: 'auto',
    name: '20-Round Drum',
    desc: 'Twenty shells before you reload instead of ten.',
    m: { magAdd: 10 },
  },
  magnum: {
    gun: 'auto',
    name: 'Magnum Buckshot',
    desc: '+25% pellet damage and a harder shove.',
    m: { dmg: 1.25, kb: 1.4 },
  },
  stock: {
    gun: 'smg',
    name: 'Stock and Foregrip',
    desc: '45% less spread and +15% damage.',
    m: { spread: 0.55, dmg: 1.15 },
  },
  smgdrum: {
    gun: 'smg',
    name: '50-Round Drum',
    desc: 'Fifty rounds a magazine instead of thirty-two.',
    m: { magAdd: 18 },
  },
  acog: {
    gun: 'rifle',
    name: 'Combat Scope',
    desc: '+15% critical chance and 30% less spread.',
    m: { crit: 0.15, spread: 0.7 },
  },
  greentip: {
    gun: 'rifle',
    name: 'Green-Tip Rounds',
    desc: 'Steel-tipped 5.56: through one more body, +10% damage.',
    m: { pierce: 1, dmg: 1.1 },
  },
  hscope: { gun: 'hunter', name: 'Hunting Scope', desc: '+25% critical chance.', m: { crit: 0.25 } },
  clips: { gun: 'hunter', name: 'Stripper Clips', desc: 'Reloads 45% faster.', m: { reload: 0.55 } },
  hot: {
    gun: 'lever',
    name: 'Hot .30-30 Loads',
    desc: '+25% damage, and they knock the dead down harder.',
    m: { dmg: 1.25, kb: 1.5 },
  },
  saddle: {
    gun: 'lever',
    name: 'Side Saddle',
    desc: 'Spare rounds on the stock: loads 40% faster.',
    m: { reload: 0.6 },
  },
  bipod: {
    gun: 'lmg',
    name: 'Bipod',
    desc: 'Stand still and it braces: 60% less spread and 15% faster fire.',
    m: { brace: 1 },
  },
  belt: { gun: 'lmg', name: '200-Round Belt', desc: 'Twice the belt before you reload.', m: { magAdd: 100 } },
  hedp: {
    gun: 'launcher',
    name: 'HEDP Grenades',
    desc: 'High-explosive dual-purpose rounds: a 30% wider blast.',
    m: { blast: 1.3 },
  },
  bando: {
    gun: 'launcher',
    name: 'Grenade Bandolier',
    desc: 'Carry eight more grenades and reload 30% faster.',
    m: { carry: 8, reload: 0.7 },
  },
};
const NONE = {
  dmg: 1,
  spread: 1,
  reload: 1,
  magAdd: 0,
  pierce: 0,
  crit: 0,
  kb: 1,
  slug: 0,
  brace: 0,
  blast: 1,
  carry: 0,
};
const CACHE = {};
// what the kits on gun g add up to
export function kitMod(g) {
  const ks = (GS.RUN && GS.RUN.kits) || [],
    key = g + ':' + ks.join(',');
  if (CACHE[key]) return CACHE[key];
  const o = { ...NONE };
  for (const id of ks) {
    const k = KITS[id];
    if (!k || k.gun !== g) continue;
    for (const [f, v] of Object.entries(k.m))
      if (f === 'dmg' || f === 'spread' || f === 'reload' || f === 'kb' || f === 'blast') o[f] *= v;
      else o[f] += v;
  }
  return (CACHE[key] = o);
}
// The Gunslinger's sidearm is a six-shot revolver: it keeps the pistol's slot and id (so everything that asks for
// 'pistol' still works) but hits harder, fires slower, holds six and reloads from a speed loader. Set at the start of
// every run, so another hero gets the service pistol back.
const PISTOL0 = { ...GUNS.pistol },
  KIT0 = { match: { ...KITS.match }, pmag: { ...KITS.pmag } },
  REVOLVER = {
    name: 'Revolver',
    reg: 'h_revolver',
    dmg: 26,
    rate: 3.2,
    spread: 0.018,
    mag: 6,
    reload: 1.45,
    kick: 6,
    shell: 0, // a revolver keeps its brass until you reload
    rev: true,
  },
  REVKIT = {
    match: { name: 'Long Barrel', desc: 'A longer barrel and a tuned action: +30% damage and half the spread.' },
    pmag: {
      name: 'Moon Clips',
      desc: 'All six rounds clipped together, in one push: reloads twice as fast.',
      m: { reload: 0.5 },
    },
  };
export function setSidearm(hero) {
  for (const k of Object.keys(GUNS.pistol)) if (!(k in PISTOL0)) delete GUNS.pistol[k];
  Object.assign(GUNS.pistol, PISTOL0, hero === 'grenadier' ? REVOLVER : {});
  for (const id of Object.keys(KIT0)) Object.assign(KITS[id], KIT0[id], hero === 'grenadier' ? REVKIT[id] : {});
  for (const k of Object.keys(CACHE)) delete CACHE[k];
}
// extra rounds of ammo type t the kits let you carry
export function kitCarry(t) {
  let n = 0;
  for (const id of (GS.RUN && GS.RUN.kits) || []) {
    const k = KITS[id];
    if (k && k.m.carry && GUNS[k.gun].ammo === t) n += k.m.carry;
  }
  return n;
}
// two kits for the next case, for two different guns you carry where possible, never one you already have
export function kitOffer() {
  const have = new Set((GS.RUN && GS.RUN.kits) || []),
    owned = (GS.P && GS.P.owned) || [],
    open = Object.keys(KITS).filter(id => !have.has(id) && owned.includes(KITS[id].gun)),
    byGun = {};
  for (const id of open) (byGun[KITS[id].gun] = byGun[KITS[id].gun] || []).push(id);
  const guns = Object.keys(byGun).sort(() => Math.random() - 0.5);
  guns.sort((a, b) => (a === 'pistol') - (b === 'pistol')); // the guns you were handed by the convoy before the sidearm
  const out = [];
  for (const g of guns) {
    if (out.length >= 2) break;
    out.push(byGun[g][Math.floor(Math.random() * byGun[g].length)]);
  }
  if (out.length < 2) for (const id of open) if (out.length < 2 && !out.includes(id)) out.push(id);
  return out;
}
// the pick cards for a kit case
export function kitPicks(ids, after) {
  return ids.map(id => {
    const k = KITS[id];
    return {
      id: 'kit_' + id,
      kit: id,
      cat: GUNS[k.gun].name + ' · kit',
      name: k.name,
      desc: k.desc,
      max: 1,
      apply() {
        GS.RUN.kits = ((GS.RUN && GS.RUN.kits) || []).concat(id);
        after(k.gun);
      },
    };
  });
}
