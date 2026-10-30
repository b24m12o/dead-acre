/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Traps for the horde. The dawn before a horde night the convoy drops a trap kit, and what you don't use keeps:
//  · Fuel can: hold the trap key and walk to pour a trail of fuel. A shot through it, a blast, a flare or a burning
//    zombie lights it, and the fire runs the length of the trail.
//  · Barbed wire: a coil across the street at your feet. The dead wade through it at a third of their pace and it
//    cuts them as they go, until it is torn apart.
//  · Car rig: stand by a parked car and rig it. The next hit, a shot or a zombie pounding on it, blows it twice as big.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { d2, rand, randi } from '../core/util.js';
import { R } from '../render/atlas.js';
import { cars } from '../world/map.js';
import { query, solidPt } from '../world/nav.js';
import { sfx } from '../audio/sfx.js';
import { noise } from '../audio/audio.js';
import { decal, floatText, sparks } from '../render/effects.js';
import { firePool } from '../world/fire.js';
import { hurtEnemy } from './combat.js';
import { showStreak } from '../ui/callouts.js';
import { kn } from '../core/binds.js';

export const TRAP = {
  fuel: { name: 'Fuel can', short: 'Fuel' },
  wire: { name: 'Barbed wire', short: 'Wire' },
  rig: { name: 'Car rig', short: 'Car rig' },
};
const ORDER = ['fuel', 'wire', 'rig'],
  CAN = 44, // puddles a can pours: about eight metres of trail
  STEP = 18;
GS.fuel = [];
GS.wires = [];
export function resetTraps() {
  GS.fuel = [];
  GS.wires = [];
  pouring = null;
}
let pouring = null,
  pill = '';
const have = () => (GS.RUN && GS.RUN.traps) || {};
export const anyTraps = () => ORDER.some(t => have()[t] > 0);
export function giveTraps(kit) {
  GS.RUN.traps = { ...have() };
  for (const [t, n] of Object.entries(kit)) GS.RUN.traps[t] = (GS.RUN.traps[t] || 0) + n;
  if (!have()[GS.RUN.trapSel]) GS.RUN.trapSel = ORDER.find(t => have()[t] > 0);
}
export function cycleTrap() {
  if (GS.state !== 'play' || !anyTraps()) return;
  const i = ORDER.indexOf(GS.RUN.trapSel);
  for (let k = 1; k <= ORDER.length; k++) {
    const t = ORDER[(i + k) % ORDER.length];
    if (have()[t] > 0) {
      GS.RUN.trapSel = t;
      sfx.swap();
      return;
    }
  }
}
// the nearest intact car you are standing beside
function carNear() {
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
export function trapDown() {
  if (GS.state !== 'play' || !GS.P || !anyTraps()) return;
  let t = GS.RUN.trapSel;
  if (!(have()[t] > 0)) t = GS.RUN.trapSel = ORDER.find(k => have()[k] > 0);
  const P = GS.P;
  if (have().rig > 0 && t !== 'rig' && carNear()) t = 'rig'; // beside a car with a rig in the kit: that's what you meant
  if (t === 'fuel') {
    pouring = { pts: [], left: CAN, lx: P.x, ly: P.y, lit: false };
    GS.fuel.push(pouring);
    GS.RUN.traps.fuel--;
    puddle(pouring, P.x, P.y);
    floatText(P.x, P.y - 44, 'Pouring fuel · walk the line', '#e8c46a', 13);
  } else if (t === 'wire') {
    const a = P.aimA,
      x = P.x + Math.cos(a) * 40,
      y = P.y + Math.sin(a) * 40;
    if (solidPt(x, y)) return floatText(P.x, P.y - 44, 'No room for wire there', '#cfd6d9', 13);
    GS.wires.push({ x, y, a: a + Math.PI / 2, hw: 58, hp: 45 + GS.wave * 4, max: 45 + GS.wave * 4, cut: 0 });
    GS.RUN.traps.wire--;
    sfx.swap();
    noise(0.25, 0.05, 4200, 2600, 'bandpass');
    floatText(P.x, P.y - 44, 'Wire down', '#cfd6d9', 13);
  } else if (t === 'rig') {
    const c = carNear();
    if (!c) return floatText(P.x, P.y - 44, 'Stand by a car to rig it', '#cfd6d9', 13);
    c.rig = true;
    c.hp = Math.min(c.hp, 1);
    c.hasAlarm = false;
    GS.RUN.traps.rig--;
    sfx.ting();
    floatText(c.x, c.y - 40, 'Rigged · one hit and it goes', '#ff8a6a', 14);
  }
  if (!(have()[GS.RUN.trapSel] > 0)) GS.RUN.trapSel = ORDER.find(k => have()[k] > 0);
}
export function trapUp() {
  if (pouring) endPour();
}
function endPour() {
  if (pouring && pouring.pts.length < 3) {
    for (const p of pouring.pts) if (p.d) p.d.life = 0;
    GS.fuel.splice(GS.fuel.indexOf(pouring), 1);
    GS.RUN.traps.fuel = (GS.RUN.traps.fuel || 0) + 1;
  } // let go straight away: the can goes back in the kit
  pouring = null;
}
function puddle(tr, x, y) {
  const d = decal(R['splat' + randi(0, 3)], x, y, rand(0.42, 0.55), [0.05, 0.045, 0.035, 0.82], [0, 0, 0], 9999);
  tr.pts.push({ x, y, lit: 0, d });
  tr.left--;
}
// light the trail at the puddle nearest (x, y), if one is within r
export function igniteFuel(x, y, r) {
  for (const tr of GS.fuel)
    for (const p of tr.pts)
      if (!p.lit && d2(p.x, p.y, x, y) < r * r) {
        p.lit = GS.time;
        return true;
      }
  return false;
}
let chkT = 0;
export function tickTraps(dt) {
  const P = GS.P;
  if (!P) return;
  // pouring: a puddle every stride or so while the key is held
  if (pouring) {
    if (GS.state !== 'play' || P.hp <= 0) endPour();
    else if (Math.hypot(P.x - pouring.lx, P.y - pouring.ly) >= STEP) {
      pouring.lx = P.x;
      pouring.ly = P.y;
      puddle(pouring, P.x, P.y);
      if (Math.random() < 0.3) noise(0.12, 0.03, 900, 300, 'lowpass');
      if (pouring.left <= 0) {
        floatText(P.x, P.y - 44, 'Can empty', '#e8c46a', 13);
        endPour();
      }
    }
  }
  // what lights the fuel: a round through it, fire, a flare, a burning zombie
  chkT -= dt;
  const full = chkT <= 0;
  if (full) chkT = 0.1;
  for (const tr of GS.fuel) {
    for (let i = 0; i < tr.pts.length; i++) {
      const p = tr.pts[i];
      if (p.lit) {
        if (!p.fire && GS.time - p.lit > 0) {
          p.fire = true;
          firePool(p.x, p.y, 30, 9);
          if (p.d) p.d.life = 0;
          if (i === 0 || !tr.pts[i - 1].lit || !tr.pts[i + 1] || !tr.pts[i + 1].lit) {
            noise(0.4, 0.06, 700, 200, 'lowpass'); // the whoomph as it catches
          }
          for (const q of [tr.pts[i - 1], tr.pts[i + 1]]) if (q && !q.lit) q.lit = GS.time + 0.06; // it runs along the line
        }
        continue;
      }
      for (const b of GS.pbullets) {
        if (b.shell || b.t < 0) continue;
        const px = b.x - b.vx * dt,
          py = b.y - b.vy * dt,
          vx = b.x - px,
          vy = b.y - py,
          L2 = vx * vx + vy * vy || 1,
          u = Math.max(0, Math.min(1, ((p.x - px) * vx + (p.y - py) * vy) / L2));
        if (d2(px + vx * u, py + vy * u, p.x, p.y) < 14 * 14) {
          p.lit = GS.time;
          sparks(p.x, p.y, [1, 0.7, 0.3], 6, 180);
          break;
        }
      }
      if (p.lit || !full) continue;
      for (const f of GS.firePools)
        if (d2(f.x, f.y, p.x, p.y) < (f.r + 12) ** 2) {
          p.lit = GS.time;
          break;
        }
      if (p.lit) continue;
      for (const f of GS.flares)
        if (d2(f.x, f.y, p.x, p.y) < 40 * 40) {
          p.lit = GS.time;
          break;
        }
      if (p.lit) continue;
      query(p.x, p.y, 40, e => {
        if (!p.lit && !e.dead && e.burn > 0 && d2(e.x, e.y, p.x, p.y) < 26 * 26) p.lit = GS.time;
      });
    }
  }
  GS.fuel = GS.fuel.filter(tr => tr === pouring || tr.pts.some(p => !p.fire) || false);
  // the wire: slows and cuts whatever wades into it, and wears out doing it
  for (const w of GS.wires) {
    const c = Math.cos(w.a),
      s = Math.sin(w.a);
    query(w.x, w.y, w.hw + 30, e => {
      if (e.dead || e.big || e.fly || !(e.emerge >= 1)) return;
      const dx = e.x - w.x,
        dy = e.y - w.y,
        along = dx * c + dy * s,
        across = -dx * s + dy * c;
      if (Math.abs(along) > w.hw || Math.abs(across) > 16 + e.r * 0.4) return;
      e.wired = GS.time + 0.2;
      e.wireT = (e.wireT || 0) - dt;
      if (e.wireT <= 0) {
        e.wireT = 0.45;
        hurtEnemy(e, 3 + GS.wave * 0.5, false, 0, 0, 0, 'wire', e.x, e.y);
      }
      w.hp -= dt * 2.2;
    });
    if (w.hp <= 0 && !w.gone) {
      w.gone = true;
      sparks(w.x, w.y, [0.8, 0.8, 0.75], 8, 160);
      floatText(w.x, w.y - 20, 'Wire torn apart', '#cfd6d9', 12);
    }
  }
  GS.wires = GS.wires.filter(w => !w.gone);
  trapPill();
}
// the kit, on screen while you carry any of it
function trapPill() {
  const el = $('trapPill');
  if (!el) return;
  const on = GS.state === 'play' && anyTraps();
  let h = '';
  if (on) {
    const sel = GS.RUN.trapSel,
      near = have().rig > 0 && carNear();
    h =
      `<span class="tk">Traps</span>` +
      ORDER.filter(t => have()[t] > 0)
        .map(t => `<span class="${t === sel ? 'on' : ''}">${TRAP[t].short} ×${have()[t]}</span>`)
        .join('') +
      `<span class="tk">${kn('trap')} ${near ? 'rig this car' : sel === 'fuel' ? 'hold to pour' : 'place'} · ${kn('trapNext')} switch</span>`;
  }
  if (h !== pill) {
    pill = h;
    el.innerHTML = h;
    el.hidden = !on;
  }
}
export function trapKitStreak(kit) {
  const parts = Object.entries(kit).map(
    ([t, n]) => `${n} ${TRAP[t].name.toLowerCase()}${n > 1 && t !== 'wire' ? 's' : ''}`
  );
  showStreak('Trap kit', `${parts.join(' · ')} · ${kn('trap')} to place, ${kn('trapNext')} to switch`, true);
}
