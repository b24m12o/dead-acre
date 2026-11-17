/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// What was in their pockets: now and then one of the night's dead drops a small leather pouch, and whatever is in it
// is yours for the rest of the run. Each is small; a run's worth adds up. It comes to you like a box of rounds, so it
// never pulls you out of a fight, and a night gives up at most a couple (the cards wait for dawn: upgrades.js lvWait).
import { GS } from '../core/gs.js';
import { rand } from '../core/util.js';
import { sfx } from '../audio/sfx.js';
import { floatText } from '../render/effects.js';
import { showStreak } from '../ui/callouts.js';
import { S } from './state.js';

export const POUCH = {
  chance: 0.03, // any of the dead, in the fight
  elite: 0.4,
  perNight: 2,
  cap: 6, // of any one kind in a run
};
export const POCKET = {
  dmg: { name: 'Hollow points', sub: 'damage +3%', apply: () => (S.dmg *= 1.03) },
  rate: { name: 'Gun oil', sub: 'fire rate +3%', apply: () => (S.rate *= 1.03) },
  reload: { name: 'Speed loader', sub: 'reloads 5% quicker', apply: () => (S.reloadK *= 1.05) },
  hp: {
    name: 'Painkillers',
    sub: 'max health +5',
    apply: () => {
      S.maxHp += 5;
      if (GS.P) GS.P.hp = Math.min(S.maxHp, GS.P.hp + 5);
    },
  },
  ammo: { name: 'Mag pouch', sub: 'carry 6% more ammo', apply: () => (S.ammoK *= 1.06) },
};
const fighting = () => !!GS.nightLive && !GS.nightDone && GS.state === 'play' && GS.wave > 0;
// called for every kill (combat.js)
export function pouchDrop(e) {
  if (!fighting() || GS.RUN.tut || e.type === 'egg' || e.type === 'flower') return;
  const R = GS.RUN,
    got = (R.pockets = R.pockets || {}),
    night = (R.pouchN = R.pouchN || {});
  if ((night[GS.wave] || 0) >= POUCH.perNight) return;
  if (Math.random() >= (e.elite ? POUCH.elite : POUCH.chance)) return;
  const left = Object.keys(POCKET).filter(id => (got[id] || 0) < POUCH.cap);
  if (!left.length) return;
  night[GS.wave] = (night[GS.wave] || 0) + 1;
  GS.pickups.push({
    k: 'pouch',
    id: left[Math.floor(Math.random() * left.length)],
    v: 1,
    x: e.x,
    y: e.y,
    vx: rand(-60, 60),
    vy: rand(-60, 60),
    t: 0,
  });
}
// picked up (update.js, with the other pickups)
export function takePouch(k) {
  const R = GS.RUN,
    got = (R.pockets = R.pockets || {}),
    P = POCKET[k.id];
  if (!P || (got[k.id] || 0) >= POUCH.cap) return;
  got[k.id] = (got[k.id] || 0) + 1;
  P.apply();
  sfx.ammo();
  floatText(GS.P.x, GS.P.y - 40, `${P.name} · ${P.sub}`, '#e8c890', 16);
  if (!(GS.meta.tips && GS.meta.tips.pouch)) {
    GS.meta.tips = GS.meta.tips || {};
    GS.meta.tips.pouch = 1;
    showStreak('From their pockets', 'Small things the dead carried · each one stays with you for the run');
  }
}
