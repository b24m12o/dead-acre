/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The weekly contract: one set run per calendar week (Monday to Sunday, UTC), the same for everyone who plays that
// week: the same district laid out street for street, the same character (lent to you, even one you haven't
// unlocked), the same Infection level and twists, at Normal difficulty. Your best score that week is kept, and a
// contract pays 20% more scrap.
import { GS } from '../core/gs.js';
import { saveMeta } from '../core/settings.js';
import { HEROES } from './arsenal.js';
import { DISTRICTS, INFECTION, TWISTS } from './districts.js';

export function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())),
    day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day); // the Thursday of this week decides its year
  const y = t.getUTCFullYear(),
    wk = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(wk).padStart(2, '0')}`;
}
const h32 = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
export function prng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function contract(w = weekId()) {
  const r = prng(h32('dead-acre contract ' + w)),
    pick = a => a[Math.floor(r() * a.length)],
    hero = pick(Object.keys(HEROES)),
    district = pick(Object.keys(DISTRICTS)),
    inf = 2 + Math.floor(r() * 4),
    pool = TWISTS.filter(t => t.id !== 'pistol' || hero === 'grenadier').map(t => t.id),
    tw = {};
  while (Object.keys(tw).length < 2) tw[pick(pool)] = true;
  return { week: w, seed: h32('dead-acre map ' + w), hero, district, inf, tw };
}
export function contractLine(c = contract()) {
  const tw = TWISTS.filter(t => c.tw[t.id]).map(t => t.name);
  return `${DISTRICTS[c.district].name} as the ${HEROES[c.hero].name} · Infection ${c.inf} (${INFECTION[c.inf].name.toLowerCase()}) · ${tw.join(' and ')}`;
}
export function contractBest() {
  const m = GS.meta.contract;
  return m && m.week === weekId() ? m : null;
}
// a contract run has ended: keep the week's best
export function recordContract(won) {
  if (!GS.RUN || !GS.RUN.contract) return false;
  const w = GS.RUN.contract.week,
    m = GS.meta.contract && GS.meta.contract.week === w ? GS.meta.contract : { week: w, best: 0, night: 0, tries: 0 },
    nb = GS.score > m.best;
  m.tries++;
  if (nb) m.best = GS.score;
  m.night = Math.max(m.night, won ? 99 : GS.wave);
  GS.meta.contract = m;
  saveMeta();
  return nb;
}
