/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { clamp } from '../core/util.js';
import { quad, setH } from './sprites.js';
import { R } from './atlas.js';
import { cars } from '../world/map.js';
export function carKey(c) {
  return c.y + Math.abs(Math.sin(c.a)) * (c.truck ? 58 : 39) + Math.abs(Math.cos(c.a)) * 20;
}
export function carHits(x, y, a, truck) {
  const L = truck ? 118 : 78,
    W = truck ? 44 : 38,
    cs = (o, l) => {
      const ca = Math.cos(o.a),
        sa = Math.sin(o.a),
        k = l / 4;
      return [-1.5, -0.5, 0.5, 1.5].map(t => [o.x + ca * t * k, o.y + sa * t * k]);
    },
    me = cs({ x, y, a }, L);
  for (const c of cars) {
    const l2 = c.truck ? 118 : 78,
      w2 = c.truck ? 44 : 38,
      them = cs(c, l2),
      r = (W + w2) / 2 - 2;
    for (const [ax, ay] of me) for (const [bx, by] of them) if ((ax - bx) ** 2 + (ay - by) ** 2 < r * r) return true;
  }
  return false;
} // four circles along each car: a parked car never sits inside another
export function drawCar(c) {
  if (!(c.jx || c.jy || c.ja)) drawCar0(c);
  else {
    const ox = c.x,
      oy = c.y,
      oa = c.a;
    c.x += c.jx;
    c.y += c.jy;
    c.a += c.ja;
    drawCar0(c);
    c.x = ox;
    c.y = oy;
    c.a = oa;
  }
  if (!GS.SHMODE && c.hasAlarm && !c.alarmUsed && !c.dead && !c.burnt && (GS.time * 0.9 + c.x * 0.013) % 1 < 0.08)
    quad(
      R.glow,
      c.x + Math.cos(c.a) * 9 + (c.jx || 0),
      c.y + Math.sin(c.a) * 9 + (c.jy || 0),
      0,
      0.035,
      0.035,
      0,
      0,
      0,
      1,
      2.6,
      0.12,
      0.08,
      0
    ); // armed alarm: a red LED blinking on the dash
}
function drawCar0(c) {
  const reg =
      c.burnt || c.fire > 0.5
        ? R.carburn
        : c.tanker
          ? c.truck
            ? R.tanker
            : R.fuelvan
          : c.police
            ? R.police
            : c.truck
              ? R.truck
              : R.car,
    sc = (c.burnt || c.fire > 0.5) && c.truck ? 1.45 : 1;
  if (GS.SHMODE) {
    setH(c.truck ? 24 : 16);
    quad(reg, c.x, c.y, c.a, sc, sc, 1, 1, 1, 1, 0, 0, 0, 0);
    return;
  }
  const t = c.police || c.tanker || c.burnt || c.fire > 0.5 ? [1, 1, 1] : c.tint,
    fl = c.flash > 0 ? 1 : 0;
  const lit = c.lights ? (c.hp < c.max * 0.5 && Math.sin(GS.time * 23 + c.x) > 0.3 ? 0.2 : 1.8) : 0;
  const hk = (c.burnt ? 1 : 0.62 + 0.38 * clamp(c.hp / c.max, 0, 1)) * (c.fire ? 0.85 : 1); // a car on fire is a blistered, blackening shell under the flames
  setH(c.truck ? 24 : 14);
  quad(reg, c.x, c.y, c.a, sc, sc, t[0] * hk, t[1] * hk, t[2] * hk, 1, lit, lit, lit, fl); // one 3D-baked car: roof, glass, bonnet and tyres from above, lit like everything else
  if (c.holes && !c.burnt) {
    const ca = Math.cos(c.a),
      sa = Math.sin(c.a);
    for (const h of c.holes)
      quad(R.bhole, c.x + h.u * ca - h.v * sa, c.y + h.u * sa + h.v * ca, h.r, 0.8, 0.8, 0.5, 0.5, 0.5, 1, 0, 0, 0, 0);
  }
  if (c.police && !c.burnt) {
    const on = Math.sin(GS.time * 14) > 0;
    setH(16);
    quad(
      on ? R.lightbar : R.lightbar2,
      c.x - Math.cos(c.a) * 2,
      c.y - Math.sin(c.a) * 2,
      c.a,
      1,
      1,
      1,
      1,
      1,
      1,
      3.5,
      3.5,
      3.5,
      0
    );
  }
}
export function drawWreck(w) {
  if (GS.SHMODE) {
    setH(10);
    quad(R.carburn, w.x, w.y, w.a, w.s, w.s, 1, 1, 1, 1, 0, 0, 0, 0);
    return;
  }
  setH(12 * w.s);
  quad(R.carburn, w.x, w.y, w.a, w.s, w.s, 0.9, 0.9, 0.9, 1, 0, 0, 0, 0);
}
