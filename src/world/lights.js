/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The street lights as something to fight over. A round through a lamp's bulb pops it: glass, a spit of sparks,
// and that pool of light is gone for as long as you stay at this place. Light works both ways: in a lamp's pool
// you see what's coming, and the dead see you from further off; out of it they have to get closer first. Shoot
// an electrical box and the lamps on its block go out together until dawn brings the power back.
import { GS } from '../core/gs.js';
import { d2, rand } from '../core/util.js';
import { lamps } from './map.js';
import { LAMPV } from '../render/decor.js';
import { lampHot } from '../render/draw-player.js';
import { chips, flashLight, floatText, sparks } from '../render/effects.js';
import { sfx } from '../audio/sfx.js';
import { SIGHT } from '../game/combat.js';

export const BULB_R = 9, // how close a round must pass to a bulb to pop it
  SEEN_DARK = 0.85, // the dead's sight in the dark, as a share of what it is (the street between the lamps)
  SEEN_LIT = 0.55, // and how much further they see you standing full in a lamp's light
  BOX_CUT = 300; // a shot electrical box puts out the lamps this near it
// where a lamp's bulb is, as you see it (its head sits just above its light pool)
export const bulbAt = L => [L.hx, L.hy - LAMPV(L)];
// a round from x0,y0 to x1,y1 this frame: did it pass through a bulb? Pops the first one it did
export function lampShot(x0, y0, x1, y1) {
  const dx = x1 - x0,
    dy = y1 - y0,
    l2 = dx * dx + dy * dy || 1;
  for (const L of lamps) {
    if (L.down || L.shot || L.lantern) continue;
    const [bx, by] = bulbAt(L),
      t = Math.max(0, Math.min(1, ((bx - x0) * dx + (by - y0) * dy) / l2));
    if (d2(x0 + dx * t, y0 + dy * t, bx, by) > BULB_R * BULB_R) continue;
    popLamp(L);
    return true;
  }
  return false;
}
export function popLamp(L) {
  if (L.shot || L.down) return;
  const [bx, by] = bulbAt(L);
  L.shot = true;
  L.off = 0;
  L.on = 0;
  sparks(bx, by, [1, 0.92, 0.65], 12, 260);
  chips(bx, by, 7, [0.85, 0.9, 0.95], 3, 200); // the glass
  flashLight(bx, by, 150, [1.3, 1.15, 0.85], 0.08);
  sfx.lampPop(bx, by);
  if (GS.RUN && GS.RUN.metrics) GS.RUN.metrics.lampsShot = (GS.RUN.metrics.lampsShot || 0) + 1;
  if (GS.meta && !(GS.meta.tips && GS.meta.tips.dark) && GS.state === 'play') {
    GS.meta.tips = GS.meta.tips || {};
    GS.meta.tips.dark = 1;
    floatText(GS.P.x, GS.P.y - 50, 'In the dark they have to get closer to see you', '#cfd6d9', 13);
  } // said once: what a dark street is for
}
// how far the dead can see you right now: less out of the light, further in it
export const seenFrom = () => {
  const P = GS.P;
  return SIGHT() * (SEEN_DARK + SEEN_LIT * (P ? lampHot(P.x, P.y) : 0));
};
// a shot electrical box: the lamps on its block stutter out one after another, until dawn
export function boxCut(x, y) {
  const near = lamps
    .filter(L => !L.down && !L.shot && !L.off && !L.lantern && d2(L.bx, L.by, x, y) < BOX_CUT * BOX_CUT)
    .sort((a, b) => d2(a.bx, a.by, x, y) - d2(b.bx, b.by, x, y));
  near.forEach((L, i) =>
    GS.later.push({
      t: 0.15 + i * rand(0.12, 0.2),
      fn: () => {
        if (L.down || L.shot || L.off) return;
        L.off = GS.time;
        L.on = 0;
        const [bx, by] = bulbAt(L);
        sparks(bx, by, [1, 0.9, 0.6], 6, 200);
        sfx.lampPop(bx, by);
      },
    })
  );
  if (near.length && GS.state === 'play') floatText(x, y - 40, 'The block goes dark', '#cfd6d9', 13);
  return near.length;
}
