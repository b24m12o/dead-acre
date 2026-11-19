/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The shadows street lamps throw. Whoever stands under a lamp casts their own shape away from it: each part of the
// figure thrown as far as its height carries it, so the shadow has shoulders and thins to the head. A shadow is the
// absence of that lamp's light and nothing more: it is taken out of the lamps' light only (render.js draws the lamps,
// then these, then every other light), so moonlight, your torch and a muzzle flash still fall inside it, and the
// ground in it keeps its colour. Under two lamps each shadow is fainter, by that lamp's share of the light there.
// Only the nearest figures get the full treatment (the preset says how many); the rest get a soft smear.
import { GS } from '../core/gs.js';
import { PEOPLE } from '../core/scale.js';
import { R } from './atlas.js';
import { gfxPreset, lampFrom, quad, setH, viewH, viewW } from './sprites.js';
import { lamps } from '../world/map.js';
import { lampK } from '../render/draw-player.js';
import { drawEnemy } from './draw-enemies.js';
import { drawRanger } from './draw-player.js';

export const LAMP_SH = {
  dark: 0.94, // how much of a lone lamp's light its shadow keeps off, right under it
  second: 0.3, // a second lamp throws its own shadow too if it gives at least this share of the light
  pole: 84, // how high a street lamp's head is, in the units figures are tall in (lower than the pole is drawn: the shadows are meant to be seen),
  lantern: 46, // and a hung lantern's
};
const lit = [];
export function lampShadowPass() {
  lit.length = 0;
  for (const L of lamps) {
    if (L.down) continue;
    if (
      Math.abs(L.hx - GS.camX - viewW / 2) > viewW * 0.5 + 360 ||
      Math.abs(L.hy - GS.camY - viewH / 2) > viewH * 0.5 + 360
    )
      continue;
    const k = lampK(L);
    if (k < 0.3) continue;
    lit.push({
      x: L.hx,
      y: L.hy,
      R: L.lantern ? 200 : 320,
      H: (L.lantern ? LAMP_SH.lantern : LAMP_SH.pole) * PEOPLE,
      k,
    }); // figures are drawn at PEOPLE: the lamp's head with them
  }
  if (!lit.length) return 0;
  const on = o =>
      Math.abs(o.x - GS.camX - viewW / 2) < viewW * 0.6 + 80 && Math.abs(o.y - GS.camY - viewH / 2) < viewH * 0.6 + 80,
    who = [],
    P = GS.P;
  if (P && GS.state !== 'menu' && GS.state !== 'over' && !P.ride && !GS.NOHERO) who.push([P, drawRanger, 0]);
  for (const s of GS.buddies) if (!(s.down > 0) && on(s)) who.push([s, drawRanger, 1]);
  for (const e of GS.enemies)
    if (!e.dead && !e.fly && e.z < 10 && e.emerge > 0.5 && on(e))
      who.push([e, drawEnemy, 2 + (P ? Math.hypot(e.x - P.x, e.y - P.y) : 0)]);
  who.sort((a, b) => a[2] - b[2]);
  const full = gfxPreset().lsh;
  let drawn = 0;
  for (let i = 0; i < who.length; i++) {
    const [o, draw] = who[i];
    // each lamp's light on this figure, and its share of all of it
    let sum = 0,
      a = null,
      b = null;
    for (const L of lit) {
      const d = Math.hypot(o.x - L.x, o.y - L.y);
      if (d > L.R || d < 4) continue;
      const c = L.k * (1 - (d / L.R) * (d / L.R));
      sum += c;
      if (!a || c > a.c) {
        b = a;
        a = { L, c, d };
      } else if (!b || c > b.c) b = { L, c, d };
    }
    if (!a) continue;
    for (const q of [a, b]) {
      if (!q || (q !== a && q.c / sum < LAMP_SH.second)) continue;
      // the lamp's light thins with distance by itself, so the shadow keeps the same share of it off all the way out and
      // only lets go at the very edge. Under several lamps it is fainter, though less than its bare share of the light:
      // a shadow you can't see grounds nobody
      const al = LAMP_SH.dark * Math.pow(q.c / sum, 0.35) * Math.min(1, (1 - q.d / q.L.R) * 5);
      if (i < full) {
        lampFrom(q.L.x, q.L.y, q.L.H);
        GS.SHMODE = 4;
        GS.SHS = al;
        draw(o);
        GS.SHMODE = false;
        setH(0);
        drawn++;
      } else {
        // further off: one soft smear the length a body would throw
        const ux = (o.x - q.L.x) / q.d,
          uy = (o.y - q.L.y) / q.d,
          rr = o.r || 16,
          len = Math.min(120, ((30 * q.d) / Math.max(34, q.L.H - 30)) * (rr / 16));
        quad(
          R.blob,
          o.x + ux * (len * 0.5 + rr * 0.3),
          o.y + uy * (len * 0.5 + rr * 0.3),
          Math.atan2(uy, ux),
          (len + rr) / 22,
          rr / 14,
          0,
          0,
          0,
          al * 0.9,
          0,
          0,
          0,
          0
        );
      }
    }
  }
  return drawn;
}
