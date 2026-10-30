/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The run is saved at every dawn, so a closed tab, a crash or a graphics reset costs a night at most, never the
// run. Continue on the menu picks it up at that dawn: your character, guns, ammo, gear, kits, level, people and the
// nights ahead as they were. The streets are laid out fresh. A run that ends (eaten, quit, or the evac made) takes
// its save with it; boss practice and training are never saved.
import { GS } from '../core/gs.js';
import { store } from '../core/settings.js';
import { LV, S, equip } from './state.js';
import { makeSurvivor, budSetup } from '../actors/backups.js';
import { TAU, rand } from '../core/util.js';

const KEY = 'rr_run',
  V = 1;
export function saveRun() {
  if (!GS.RUN || GS.RUN.practice || GS.RUN.tut || !GS.P || GS.state === 'over' || GS.state === 'won') return;
  const P = GS.P,
    RUN = { ...GS.RUN, sg: null, job: null, jobPend: false, tut: null, metrics: { ...GS.RUN.metrics } };
  const d = {
    v: V,
    at: Date.now(),
    RUN,
    S,
    LV,
    P: { hp: P.hp, owned: P.owned, mag: P.mag, ammo: P.ammo, gun: P.gun, lastGun: P.lastGun },
    wave: GS.wave,
    level: GS.level,
    xp: GS.xp,
    xpNeed: GS.xpNeed,
    score: GS.score,
    kills: GS.kills,
    rerolls: GS.rerolls,
    runSeeds: GS.runSeeds,
    bud: GS.buddies.map(b => ({ nm: b.nm, tr: b.tr, look: b.look, tint: b.tint, hp: b.hp, max: b.max })),
  };
  try {
    store.set(KEY, JSON.stringify(d));
  } catch (e) {}
}
export function savedRun() {
  try {
    const d = JSON.parse(store.get(KEY) || 'null');
    return d && d.v === V && d.RUN && d.P && d.wave > 0 ? d : null;
  } catch (e) {
    return null;
  }
}
export function clearSave() {
  if (GS.RUN && GS.RUN.practice) return; // a practice fight never touches the real run's save
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
}
// after newRun() has set up a fresh run with the saved character and district: put the saved run back into it
export function restoreRun(d) {
  Object.assign(S, d.S);
  for (const k of Object.keys(LV)) delete LV[k];
  Object.assign(LV, d.LV);
  const P = GS.P;
  P.owned = d.P.owned.slice();
  P.mag = { ...d.P.mag };
  P.ammo = { ...d.P.ammo };
  P.hp = Math.min(S.maxHp, d.P.hp);
  equip(P.owned.includes(d.P.gun) ? d.P.gun : 'pistol', true);
  P.lastGun = d.P.lastGun;
  GS.wave = d.wave;
  GS.level = d.level;
  GS.xp = d.xp;
  GS.xpNeed = d.xpNeed;
  GS.score = d.score;
  GS.kills = d.kills;
  GS.rerolls = d.rerolls;
  GS.runSeeds = d.runSeeds;
  for (const [i, s] of (d.bud || []).entries()) {
    const b = Object.assign(makeSurvivor(P.x - 40 + i * 40, P.y + 40), {
      a: rand(0, TAU),
      cd: 0,
      aim: 0,
      look: s.look,
      tint: s.tint,
    });
    budSetup(b, { nm: s.nm, tr: s.tr });
    b.max = Math.max(b.max, s.max || 0);
    b.hp = Math.min(b.max, s.hp || b.max);
    GS.buddies.push(b);
  }
}
