/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// What a roof does to a throw. Anything lobbed (a grenade from the launcher, dynamite, a flare, a flashbang, a mine,
// a noise maker, a molotov, a pipe bomb) arcs over cars, fences and the broken walls of a ruin, and clean over a
// house it only passes. It does not go through a roof: thrown from inside a roofed building, or into one, it has to
// leave or enter by a doorway or a gap in the wall, or it hits the wall and drops there.
import { MH, MW, TILE, houses, ttype } from './map.js';

// a wall proper (its own and a room's partitions): a crate or a table inside is thrown over like anything else
const wall = (i, j) => {
  if (i < 0 || j < 0 || i >= MW || j >= MH) return true;
  const t = ttype[j * MW + i];
  return t === 1 || t === 5;
};
const inside = (o, x, y) => x > o.x * TILE && x < (o.x + o.w) * TILE && y > o.y * TILE && y < (o.y + o.h) * TILE;
// from (x0, y0) to (tx, ty): null when the throw gets there, or [x, y], where it comes down against the wall instead
export function roofStop(x0, y0, tx, ty) {
  const dx = tx - x0,
    dy = ty - y0,
    L = Math.hypot(dx, dy);
  if (L < 1) return null;
  const ux = dx / L,
    uy = dy / L;
  let best = null;
  for (const o of houses) {
    if (!o.roof || o.open) continue;
    if (!inside(o, x0, y0) && !inside(o, tx, ty)) continue; // over it, start to finish
    for (let d = 6; d < L; d += 6) {
      const x = x0 + ux * d,
        y = y0 + uy * d;
      if (!inside(o, x, y)) continue;
      const i = Math.floor(x / TILE),
        j = Math.floor(y / TILE);
      if (wall(i, j) && i >= o.x && j >= o.y && i < o.x + o.w && j < o.y + o.h) {
        if (!best || d < best) best = d;
        break;
      }
    }
  }
  if (best === null) return null;
  const d = Math.max(0, best - 20); // it drops at the foot of the wall, on the thrower's side
  return [x0 + ux * d, y0 + uy * d];
}
