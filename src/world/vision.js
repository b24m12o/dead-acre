/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { opt } from '../core/settings.js';
import { MH, MW, TILE, grid, ttype } from './map.js';
let opaqueT; // chain-link, cars, trees and posts don't block the view
function rayDist(x0, y0, dx, dy, maxD) {
  // walk the tiles along a ray until an opaque one
  let tx = Math.floor(x0 / TILE),
    ty = Math.floor(y0 / TILE);
  const sx = dx > 0 ? 1 : -1,
    sy = dy > 0 ? 1 : -1;
  const tdx = dx ? Math.abs(TILE / dx) : 1e9,
    tdy = dy ? Math.abs(TILE / dy) : 1e9;
  let tmx = dx ? (dx > 0 ? (tx + 1) * TILE - x0 : x0 - tx * TILE) / Math.abs(dx) : 1e9,
    tmy = dy ? (dy > 0 ? (ty + 1) * TILE - y0 : y0 - ty * TILE) / Math.abs(dy) : 1e9;
  for (let k = 0; k < MW + MH; k++) {
    let t;
    if (tmx < tmy) {
      t = tmx;
      tmx += tdx;
      tx += sx;
    } else {
      t = tmy;
      tmy += tdy;
      ty += sy;
    }
    if (t > maxD) return maxD;
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return t;
    if (opaqueT(ty * MW + tx)) return t;
  }
  return maxD;
}
export function sightClear(x0, y0, x1, y1) {
  const dx = x1 - x0,
    dy = y1 - y0,
    L = Math.hypot(dx, dy);
  return L < 1 || rayDist(x0, y0, dx / L, dy / L, L) >= L - 6;
}
export function sightTick(dt) {
  // fade each zombie in or out as it comes into or leaves your line of sight
  const on = opt.los && GS.P && GS.state !== 'menu',
    k = Math.min(1, dt * 9);
  const upd = e => {
    if (!on || e.big || e.type === 'queen') {
      e.sv = 1;
      return;
    }
    e.svT = (e.svT || 0) - dt;
    if (e.svT <= 0) {
      e.svT = 0.1;
      e.svW = sightClear(GS.P.x, GS.P.y, e.x, e.y - (e.z || 0) * 0.5) ? 1 : 0;
    }
    e.sv = (e.sv ?? 1) + ((e.svW ?? 1) - (e.sv ?? 1)) * k;
  };
  for (const e of GS.enemies) upd(e);
  for (const e of GS.corpses) upd(e);
}
/* ---------- HUD + world ticking ---------- */

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  GS.visOn = 0;
  opaqueT = i => grid[i] === 1 && (ttype[i] === 1 || ttype[i] === 5);
}
