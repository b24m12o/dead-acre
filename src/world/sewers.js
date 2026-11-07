/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Sewer hatches: a few manhole lids out in the asphalt of every street. Now and then, on a night, one of the
// dead's packs comes up out of the sewer instead of out of the dark: the lid scrapes aside where you can see it and
// they drag themselves out one after another, the ones the water took the legs off. Each hatch is used at most
// once every while, and only for ordinary walkers, so a night is no harder for it: just a new way in.
import { GS } from '../core/gs.js';
import { TAU, angDiff, d2, damp, rand } from '../core/util.js';
import { MH, MW, ROAD, TILE, grid, ttype } from './map.js';

export const HATCHES = [];
// a few lids in the middle of the asphalt, well apart, nowhere near water
export function placeHatches() {
  HATCHES.length = 0;
  if (!ROAD) return;
  const ok = (x, y) => {
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) if (ROAD[(y + j) * MW + x + i] !== 1 || grid[(y + j) * MW + x + i]) return false;
    for (let j = -4; j <= 4; j++)
      for (let i = -4; i <= 4; i++) {
        const tx = x + i,
          ty = y + j;
        if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && ttype[ty * MW + tx] === 11) return false;
      }
    return true;
  };
  for (let t = 0; t < 400 && HATCHES.length < 5; t++) {
    const x = 5 + ((Math.random() * (MW - 10)) | 0),
      y = 5 + ((Math.random() * (MH - 10)) | 0);
    if (!ok(x, y)) continue;
    const hx = (x + 0.5) * TILE + rand(-6, 6),
      hy = (y + 0.5) * TILE + rand(-6, 6);
    if (HATCHES.some(h => d2(h.x, h.y, hx, hy) < (11 * TILE) ** 2)) continue;
    HATCHES.push({ x: hx, y: hy, a: rand(0, TAU), open: 0, side: rand(0, TAU), cd: 0, out: [] });
  }
}
// a hatch for a pack to come up from: in sight, but not on top of you
export function hatchFor(px, py) {
  let best = null,
    bd = 1e18;
  for (const h of HATCHES) {
    if (h.cd > GS.time) continue;
    const d = d2(h.x, h.y, px, py);
    if (d < 230 * 230 || d > 620 * 620) continue;
    const r = d * rand(0.7, 1.3);
    if (r < bd) {
      bd = r;
      best = h;
    }
  }
  return best;
}
// the lid goes, and n of them come up after it; spawn(h) makes one at the hatch
export function openHatch(h, n, spawn, sound) {
  h.cd = GS.time + rand(40, 60);
  if (h.open < 1) {
    h.lidT = GS.time;
    h.side = Math.atan2(GS.P.y - h.y, GS.P.x - h.x) + rand(1.2, 1.9) * (Math.random() < 0.5 ? 1 : -1); // slid off to one side
  }
  sound(h, 0);
  GS.sewerPend = (GS.sewerPend || 0) + n; // still to come up: the night isn't over while any are
  const up = () => {
    if (GS.state === 'levelup' || GS.state === 'pause') return GS.later.push({ t: 0.3, fn: up }); // after the cards
    GS.sewerPend = Math.max(0, GS.sewerPend - 1);
    if (GS.state === 'play' && GS.nightLive && !GS.nightDone) spawn(h);
  };
  for (let i = 0; i < n; i++) GS.later.push({ t: 0.75 + i * rand(0.5, 0.8), fn: up });
}
export function tickHatches(dt) {
  for (const h of HATCHES) {
    if (h.lidT === undefined) continue;
    const k = Math.min(1, (GS.time - h.lidT) / 0.55);
    h.open = k * k * (3 - 2 * k);
    h.a += angDiff(h.a, h.side) * damp(1.5, dt) * (1 - h.open) * 0.2; // the lid turns a little as it's shoved
  }
}
