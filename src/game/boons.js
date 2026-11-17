/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Game changers: now and then one of the dead in uniform drops what they carried on duty, and for a few seconds the
// night turns. It lies where they fell, doesn't come to you like a box of rounds does, and is gone in a dozen seconds:
// you go and get it, through whatever is between, or you let it go.
//  · a nurse: Adrenaline, a pair of auto-injectors. Faster on your feet, reloads twice as quick, nothing holds you.
//  · a cop: their go-bag (every gun topped up), or a box of duty rounds (every shot goes through and hits harder).
//  · a firefighter: Turnout gear. Fire and blasts can't touch you; everything else hurts less.
//  · an armored one in riot gear: a drum-fed auto shotgun, one drum, then it's gone.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { d2 } from '../core/util.js';
import { sfx } from '../audio/sfx.js';
import { floatText, glowBurst, ring } from '../render/effects.js';
import { showStreak } from '../ui/callouts.js';
import { GUNS } from './arsenal.js';
import { S, ammoMax, ammoNeed, equip } from './state.js';
import { releaseGrab } from './combat.js';

export const BOONS = {
  adren: {
    name: 'Adrenaline',
    sub: 'Faster on your feet · reloads twice as quick · nothing holds you',
    t: 15,
    col: '#ff9a5a',
  },
  duty: { name: 'Duty rounds', sub: 'Every shot goes through them and hits harder', t: 20, col: '#9ab8ff' },
  bag: { name: 'Go-bag', sub: 'Every gun topped up', t: 0, col: '#ffd08a' },
  gear: { name: 'Turnout gear', sub: 'Fire and blasts can’t touch you · the rest hurts less', t: 25, col: '#ffd25a' },
  drum: { name: 'Drum shotgun', sub: 'One drum, then it’s gone', t: 0, col: '#ff7a6a' },
};
export const BOON = {
  chance: 0.06, // a dead one in the right uniform
  elite: 0.35, // an armored one in riot gear
  gap: 20, // seconds after one is dropped before the next can be
  life: 12, // seconds it lies there
  drum: 24, // shells in the drum
  speed: 1.3,
  reload: 2,
  duty: { dmg: 1.5, pierce: 3 },
  gear: 0.65, // what everything but fire and blasts still does
};
// what this one was carrying, if anything worth having
function boonOf(e) {
  if (e.elite && e.trait === 'armored') return 'drum';
  if (e.type !== 'skitter' && e.type !== 'mini') return null;
  if (e.v === 4) return 'adren';
  if (e.v === 3) return ammoNeed() > 0.75 || Math.random() < 0.5 ? 'bag' : 'duty'; // the bag when you're really short
  if (e.v === 5) return 'gear';
  return null;
}
export const boonOn = id => !!(GS.P && GS.P.boons && GS.P.boons[id] > 0);
// called for every kill (combat.js): the odds rise as you run low on health, when it would help most, and the longer it's
// been since the last one
export function boonDrop(e) {
  const P = GS.P;
  if (!P || GS.state !== 'play' || !(GS.wave > 0) || GS.RUN.tut || P.ride || GS.evac) return;
  if ((GS.boonDrops || []).length || GS.time - (GS.boonT ?? -99) < BOON.gap) return;
  const id = boonOf(e);
  if (!id) return;
  const low = 1 - Math.max(0, Math.min(1, P.hp / S.maxHp)),
    wait = Math.min(3, 0.5 + (GS.time - (GS.boonT ?? -99)) / 90); // the longer since the last, the likelier: the first of a run comes early
  if (Math.random() >= (id === 'drum' ? BOON.elite : BOON.chance * wait) * (1 + low)) return;
  if (id === 'drum' && P.temp) return; // one at a time
  GS.boonT = GS.time;
  (GS.boonDrops = GS.boonDrops || []).push({ id, x: e.x, y: e.y, t: 0, rt: 0 });
  floatText(e.x, e.y - 36, BOONS[id].name, BOONS[id].col, 15);
}
function take(id) {
  const P = GS.P,
    B = BOONS[id];
  P.boons = P.boons || {};
  if (id === 'bag') {
    const types = new Set(P.owned.map(g => GUNS[g].ammo).filter(Boolean));
    for (const t of types) P.ammo[t] = ammoMax(t);
    P.forced = false;
    sfx.ammo();
  } else if (id === 'drum') {
    if (P.owned.includes('auto') && P.temp !== 'auto')
      P.ammo.shells = Math.min(ammoMax('shells'), (P.ammo.shells || 0) + BOON.drum); // you have one: the drum's shells
    else {
      if (!P.owned.includes('auto')) P.owned.push('auto');
      P.temp = 'auto';
      P.mag.auto = BOON.drum;
      equip('auto');
    }
    sfx.pump();
  } else {
    P.boons[id] = B.t;
    if (id === 'adren' && P.held) releaseGrab(1);
    sfx.heal();
  }
  showStreak(B.name, B.sub);
  glowBurst(P.x, P.y, [1, 0.85, 0.45], 18, 200, 0.5, 0.5);
}
// the drum is spent: the gun goes, and you're back on the one you had before
function dropTemp(P) {
  const g = P.temp;
  P.temp = null;
  P.owned = P.owned.filter(o => o !== g);
  delete P.mag[g];
  if (P.gun === g) equip(P.owned.includes(P.lastGun) ? P.lastGun : P.owned[0] || 'pistol');
  floatText(P.x, P.y - 40, 'Drum empty', '#ffb08a', 15);
}
export function tickBoons(dt) {
  const P = GS.P;
  if (!P) return;
  const L = GS.boonDrops || [];
  for (let i = L.length - 1; i >= 0; i--) {
    const k = L[i];
    k.t += dt;
    if ((k.rt -= dt) <= 0) {
      k.rt = 0.9;
      ring(k.x, k.y, 6, 34, 0.6, [1, 0.82, 0.45], 0.35); // a soft pulse on the ground: something there
    }
    if (P.hp > 0 && !P.ride && d2(k.x, k.y, P.x, P.y) < (P.r + 14) ** 2) {
      L.splice(i, 1);
      take(k.id);
    } else if (k.t >= BOON.life) L.splice(i, 1);
  }
  if (P.boons)
    for (const id in P.boons)
      if (P.boons[id] > 0 && (P.boons[id] -= dt) <= 0) {
        P.boons[id] = 0;
        floatText(P.x, P.y - 40, `${BOONS[id].name} wears off`, '#c8c8c8', 14);
      }
  if (boonOn('adren') && P.held) releaseGrab(1);
  if (P.temp && !(P.mag[P.temp] > 0) && !(P.fireCd > 0.05)) dropTemp(P);
}
export function resetBoons() {
  GS.boonDrops = [];
  GS.boonT = -99;
  if (GS.P) {
    GS.P.boons = {};
    if (GS.P.temp) dropTemp(GS.P);
  }
}
// what fire, a blast or anything else does to you in turnout gear (combat.js hurtPlayer)
export const gearK = why => (!boonOn('gear') ? 1 : why === 'fire' || why === 'an explosion' ? 0 : BOON.gear);
// the drops on the ground, for the screen markers and the lights
export const boonDrops = () => GS.boonDrops || [];
// under the gauge: one bar for each that's running, emptying as it runs out
const hc = {};
export function boonHud() {
  const box = $('boonRows'),
    P = GS.P;
  if (!box || !P) return;
  const on = Object.keys(BOONS).filter(id => P.boons && P.boons[id] > 0),
    key = on.join();
  if (hc.key !== key) {
    hc.key = key;
    box.innerHTML = on
      .map(
        id =>
          `<div class="rollrow boon" style="--bc:${BOONS[id].col}"><span>${BOONS[id].name}</span><div class="thin"><i data-b="${id}"></i></div></div>`
      )
      .join('');
  }
  for (const i of box.querySelectorAll('i[data-b]')) {
    const id = i.dataset.b;
    i.style.transform = `scaleX(${Math.max(0, Math.min(1, (P.boons[id] || 0) / BOONS[id].t)).toFixed(3)})`;
  }
}
export const boonBlink = k => (k.t > BOON.life - 3 ? 0.45 + 0.55 * Math.abs(Math.cos(k.t * 7)) : 1); // the last seconds: it flickers
