/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Traps: a belt of them beside your gun, for any night, not only the horde's. Pick one on the Q wheel (or switch with
// the switch key) and the trap key uses it:
//  · Land mine: thrown to the cursor. It arms a moment after it lands and blows when the dead step near it.
//  · Gas drum: set down in front of you. Shoot it (or let a blast or a fire reach it) and it bursts into a wide pool
//    of burning fuel.
//  · Noise maker: an old alarm clock, thrown. For ten seconds it pulls every zombie within earshot to it, the horde
//    too: put it behind your mines and drums.
//  · Car rig: not picked, just used. Stand by a parked car and the trap key rigs it; the next hit blows it twice as big.
// You carry three of each at most. They come in supply crates, and the dawn before a horde brings a full kit.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, clamp, d2, rand } from '../core/util.js';
import { cars } from '../world/map.js';
import { query, solidPt } from '../world/nav.js';
import { sfx } from '../audio/sfx.js';
import { noise } from '../audio/audio.js';
import { floatText, sparks } from '../render/effects.js';
import { explode } from './combat.js';
import { S, cam } from './state.js';
import { startFlare } from './gadgets.js';
import { showStreak } from '../ui/callouts.js';
import { kn } from '../core/binds.js';
import { mouse } from '../core/input.js';
import { ZOOM } from '../render/sprites.js';
import { iconURL } from '../ui/icons.js';

export const TRAP = {
  mine: { name: 'Land mine', short: 'Mine', desc: 'Thrown. Blows when they step near it.' },
  drum: { name: 'Gas drum', short: 'Gas drum', desc: 'Set down. Shoot it for a wide pool of fire.' },
  noise: { name: 'Noise maker', short: 'Noise maker', desc: 'Thrown. Pulls them all to it for 10 s.' },
  rig: { name: 'Car rig', short: 'Car rig', desc: 'Hold the trap key by a parked car. The next hit blows it big.' },
};
export const TRAP_ORDER = ['mine', 'drum', 'noise']; // what the wheel and the switch key cycle through
export const TRAP_MAX = { mine: 3, drum: 3, noise: 3, rig: 2 };
GS.lmines = [];
GS.tthrows = [];
export function resetTraps() {
  GS.lmines = [];
  GS.tthrows = [];
}
let pill = '';
export const have = () => (GS.RUN && GS.RUN.traps) || {};
export const anyTraps = () => TRAP_ORDER.some(t => have()[t] > 0) || have().rig > 0;
export function giveTraps(kit) {
  GS.RUN.traps = { ...have() };
  const first = !GS.meta.tips || !GS.meta.tips.t_traps;
  for (const [t, n] of Object.entries(kit)) GS.RUN.traps[t] = Math.min(TRAP_MAX[t] || 3, (GS.RUN.traps[t] || 0) + n);
  if (!(have()[GS.RUN.trapSel] > 0)) GS.RUN.trapSel = TRAP_ORDER.find(t => have()[t] > 0);
  if (first) {
    GS.meta.tips = GS.meta.tips || {};
    GS.meta.tips.t_traps = 1;
    GS.later.push({
      t: 2.5,
      fn: () =>
        showStreak(
          'Traps',
          `${kn('trap')} uses the one you hold · pick it on the ${kn('wheel')} wheel or switch with ${kn('trapNext')}`,
          true
        ),
    });
  } // the first ever: how they work
}
export function selectTrap(t) {
  if (!(have()[t] > 0)) return false;
  GS.RUN.trapSel = t;
  sfx.swap();
  floatText(GS.P.x, GS.P.y - 44, `${TRAP[t].name} ready · ${kn('trap')}`, '#e8c46a', 13);
  return true;
}
export function cycleTrap() {
  if (GS.state !== 'play' || !GS.P) return;
  const i = TRAP_ORDER.indexOf(GS.RUN.trapSel);
  for (let k = 1; k <= TRAP_ORDER.length; k++) {
    const t = TRAP_ORDER[(i + k) % TRAP_ORDER.length];
    if (have()[t] > 0) {
      if (t !== GS.RUN.trapSel) selectTrap(t);
      return;
    }
  }
}
// the nearest intact car you are standing beside
export function carNear() {
  if (!GS.P) return null;
  let best = null,
    bd = 95 * 95;
  for (const c of cars)
    if (!c.dead && !c.burnt && !c.rig) {
      const d = d2(c.x, c.y, GS.P.x, GS.P.y);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
  return best;
}
function throwTo(kind, maxD) {
  const P = GS.P,
    cx = cam.x + mouse.x / ZOOM,
    cy = cam.y + mouse.y / ZOOM,
    a = Math.atan2(cy - P.y, cx - P.x),
    d = clamp(Math.hypot(cx - P.x, cy - P.y), 40, maxD);
  let tx = P.x + Math.cos(a) * d,
    ty = P.y + Math.sin(a) * d;
  for (let k = 0; k < 8 && solidPt(tx, ty); k++) {
    tx -= Math.cos(a) * 24;
    ty -= Math.sin(a) * 24;
  } // short of a wall, never inside it
  GS.tthrows.push({
    kind,
    x0: P.x,
    y0: P.y,
    x: P.x,
    y: P.y,
    tx,
    ty,
    t: 0,
    dur: clamp(d / 560, 0.22, 0.55),
    z: 0,
    spin: rand(0, TAU),
  });
  sfx.swap();
}
// Rigging a car is never an accident: beside a car, a tap of the trap key still uses the trap you hold, and only
// holding the key down for a moment rigs the car (a ring fills over it while you hold)
export const RIG_HOLD = 0.7;
let rigging = null;
export const rigProgress = () => (rigging ? { c: rigging.c, k: Math.min(1, rigging.t / RIG_HOLD) } : null);
export function trapDown() {
  if (GS.state !== 'play' || !GS.P || GS.P.hp <= 0) return;
  const c = have().rig > 0 && carNear();
  if (c) {
    rigging = { c, t: 0 };
    return;
  } // decided on release: a tap is the held trap, a hold is the rig
  useTrap();
}
export function trapUp() {
  if (!rigging) return;
  const done = rigging.t >= RIG_HOLD;
  rigging = null;
  if (!done) useTrap();
}
function rigCar(c) {
  c.rig = true;
  c.hp = Math.min(c.hp, 1);
  c.hasAlarm = false;
  GS.RUN.traps.rig--;
  sfx.ting();
  floatText(c.x, c.y - 40, 'Rigged · one hit and it goes', '#ff8a6a', 14);
}
function useTrap() {
  const P = GS.P;
  let t = GS.RUN.trapSel;
  if (!(have()[t] > 0)) t = GS.RUN.trapSel = TRAP_ORDER.find(k => have()[k] > 0);
  if (!t) {
    floatText(P.x, P.y - 44, 'No traps · supply crates carry them', '#cfd6d9', 13);
    return;
  }
  if (t === 'mine') throwTo('mine', 330);
  else if (t === 'noise') throwTo('noise', 420);
  else if (t === 'drum') {
    const a = P.aimA,
      x = P.x + Math.cos(a) * 34,
      y = P.y + Math.sin(a) * 34;
    if (solidPt(x, y)) return floatText(P.x, P.y - 44, 'No room for the drum there', '#cfd6d9', 13);
    GS.barrels.push({ x, y, r: 14, hp: 20, dead: false, gas: true });
    noise(0.18, 0.06, 500, 160, 'lowpass'); // the clunk of a full drum set down
    floatText(P.x, P.y - 44, 'Gas drum down · shoot it when they come', '#e8c46a', 13);
  }
  GS.RUN.traps[t]--;
  if (!(have()[t] > 0)) GS.RUN.trapSel = TRAP_ORDER.find(k => have()[k] > 0) || t;
}
export function tickTraps(dt) {
  if (!GS.P) return;
  if (rigging) {
    rigging.t += dt;
    if (GS.state !== 'play' || rigging.c.dead || Math.hypot(rigging.c.x - GS.P.x, rigging.c.y - GS.P.y) > 120)
      rigging = null;
    else if (rigging.t >= RIG_HOLD && !rigging.c.rig) {
      rigCar(rigging.c);
      rigging.t = 99;
    }
  }
  for (const g of GS.tthrows) {
    g.t += dt;
    const k = Math.min(1, g.t / g.dur);
    g.x = g.x0 + (g.tx - g.x0) * k;
    g.y = g.y0 + (g.ty - g.y0) * k;
    g.z = Math.sin(k * Math.PI) * (22 + g.dur * 80);
    g.spin += dt * 12;
    if (k >= 1) {
      g.done = true;
      sfx.ting();
      if (g.kind === 'mine') GS.lmines.push({ x: g.tx, y: g.ty, arm: 0.6 });
      else startFlare(g.tx, g.ty, true);
    }
  }
  GS.tthrows = GS.tthrows.filter(g => !g.done);
  for (const m of GS.lmines) {
    m.arm -= dt;
    if (m.arm > 0 || m.done) continue;
    query(m.x, m.y, 70, e => {
      if (!m.done && !e.dead && e.emerge >= 1 && !e.fly && d2(m.x, m.y, e.x, e.y) < (40 + e.r * 0.5) ** 2)
        m.done = true;
    });
    if (m.done) {
      sparks(m.x, m.y, [1, 0.8, 0.45], 18, 600);
      explode(m.x, m.y, 125, (85 + 15 * GS.wave) * (0.5 + 0.5 * S.dmg), false);
    }
  }
  GS.lmines = GS.lmines.filter(m => !m.done);
  trapPill();
}
// the belt, under the gun: the trap you hold, how many, and the key; beside a car, the rig
function trapPill() {
  const el = $('trapPill');
  if (!el) return;
  const on = GS.state === 'play' && anyTraps(),
    sel = GS.RUN && GS.RUN.trapSel,
    car = have().rig > 0 && carNear();
  let h = '';
  if (on) {
    if (car)
      h =
        (sel && have()[sel] > 0
          ? `<img alt="" src="${iconURL(sel)}"><span>${TRAP[sel].short} ×${have()[sel]}</span>`
          : '') + `<span class="tk">Hold ${kn('trap')}</span><span class="on">Rig car ×${have().rig}</span>`;
    else if (sel && have()[sel] > 0)
      h = `<img alt="" src="${iconURL(sel)}"><span>${TRAP[sel].short} ×${have()[sel]}</span><span class="tk">${kn('trap')}</span>`;
    else h = `<span class="tk">Traps · ${kn('wheel')} wheel</span>`;
  }
  if (h !== pill) {
    pill = h;
    el.innerHTML = h;
    el.hidden = !on;
  }
}
export function trapKitStreak(kit) {
  const parts = Object.entries(kit).map(([t, n]) => `${n} ${TRAP[t].name.toLowerCase()}${n > 1 ? 's' : ''}`);
  showStreak('Trap kit', `${parts.join(' · ')} · pick on the ${kn('wheel')} wheel, ${kn('trap')} to use`, true);
}
