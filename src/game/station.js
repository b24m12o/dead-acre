/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The Route 9 gas station: once a pump blows, the tanks under the forecourt catch. A few seconds of hissing and fire
// at the other pumps, then the whole station goes up: the biggest blast in the game, the canopy gone, the forecourt
// burning, the lamps round it flattened. Lure them onto the forecourt first and it takes the lot. It happens once
// a run: a Continue at the gas station later finds it a burnt-out shell.
import { GS } from '../core/gs.js';
import { TAU, d2, rand } from '../core/util.js';
import { MW, TILE, crystals, grid, lamps, roofs, ttype } from '../world/map.js';
import { explode } from './combat.js';
import { firePool, smoke } from '../world/fire.js';
import { decal, distort, flashLight, ring, shake, sparks } from '../render/effects.js';
import { R } from '../render/atlas.js';
import { sfx } from '../audio/sfx.js';
import { noise } from '../audio/audio.js';
import { showStreak } from '../ui/callouts.js';

export const STATION = { fuse: 3.2, r: 340, flatten: 460 };
const roofOf = () => roofs.find(r => r.reg === 'gs_roof');
const pumps = () => crystals.filter(c => c.hue === 2);
GS.station = null;
// a pump has blown: the tanks catch (once)
export function stationCatch(c) {
  if (GS.station || (GS.RUN && GS.RUN.stationGone) || GS.state !== 'play') return;
  const rf = roofOf(),
    ps = pumps();
  if (!rf && ps.length < 2) return; // not the gas station: a lone pump somewhere
  const x = rf ? rf.x : ps.reduce((t, p) => t + p.x, 0) / ps.length,
    y = rf ? rf.y : ps.reduce((t, p) => t + p.y, 0) / ps.length;
  GS.station = { x, y, t: STATION.fuse, hiss: 0, lit: 0, from: c };
  showStreak('The tanks are going', 'Get clear of the forecourt · now', true);
}
export function tickStation(dt) {
  const S = GS.station;
  if (!S || S.done || GS.state !== 'play') return;
  S.t -= dt;
  S.hiss -= dt;
  if (S.hiss <= 0) {
    S.hiss = 0.22;
    noise(0.3, 0.05 + 0.05 * (1 - S.t / STATION.fuse), 3200, 1800, 'highpass');
  } // the hiss of gas forced out under pressure, louder as it builds
  if (S.lit < 2 && S.t < STATION.fuse - 0.9 - S.lit * 0.9) {
    S.lit++;
    for (const p of pumps()) if (p.alive) firePool(p.x, p.y, 34, 4); // flames break out at the pumps still standing
    sparks(S.x, S.y, [1, 0.7, 0.3], 18, 300);
    shake(0.08);
  }
  if (S.t <= 0) blow(S);
}
function blow(S) {
  S.done = true;
  if (GS.RUN) GS.RUN.stationGone = true;
  const w = GS.wave || 1;
  for (const p of pumps())
    if (p.alive) {
      p.alive = false;
      grid[p.ty * MW + p.tx] = 0;
      ttype[p.ty * MW + p.tx] = 0;
    }
  GS.flowTile = -1;
  explode(S.x, S.y, STATION.r, 320 + 34 * w, true, 0.4); // the tanks: the whole forecourt and well beyond it
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU + rand(-0.4, 0.4),
      d = rand(90, 170);
    GS.later.push({
      t: 0.12 + i * 0.13,
      fn: () => explode(S.x + Math.cos(a) * d, S.y + Math.sin(a) * d, 120, 0, false, 0.5),
    }); // and the rolling after-blasts round it (fire and noise; the damage was the first)
  }
  shake(1.3);
  GS.hitstop = Math.max(GS.hitstop, 0.12);
  distort(S.x, S.y, 0.08, 1.4, 0.9);
  ring(S.x, S.y, 30, STATION.r * 1.6, 0.6, [1.7, 1.2, 0.7], 1.6);
  flashLight(S.x, S.y, STATION.r * 3.2, [2.2, 1.3, 0.55], 0.6);
  decal(R.scorch, S.x, S.y, STATION.r / 40, [1, 1, 1, 0.95], [0, 0, 0], 40);
  sfx.boom(S.x, S.y);
  sfx.boom(S.x + 40, S.y);
  for (let i = 0; i < 9; i++) {
    const a = rand(0, TAU),
      d = rand(0, STATION.r * 0.7);
    firePool(S.x + Math.cos(a) * d, S.y + Math.sin(a) * d, rand(50, 80), rand(14, 26));
  } // the forecourt burns
  GS.later.push({ t: 0.6, fn: () => smoke(S.x, S.y, 16, STATION.r, true) });
  const rf = roofOf();
  if (rf) roofs.splice(roofs.indexOf(rf), 1); // the canopy is gone
  for (const L of lamps)
    if (!L.down && !L.lantern && d2(L.bx, L.by, S.x, S.y) < STATION.flatten ** 2) {
      L.down = true;
      L.fa = Math.atan2(L.by - S.y, L.bx - S.x) + rand(-0.3, 0.3);
    } // the blast flattens every lamp round it
  if (GS.RUN && GS.RUN.metrics) GS.RUN.metrics.station = 1;
  GS.later.push({ t: 1.2, fn: () => showStreak('The station went up', 'Nothing on the forecourt lived through that') });
}
// a new map: no fuse burning; and if the station already went up this run, it's a burnt-out shell
export function stationReset() {
  GS.station = null;
  if (!(GS.RUN && GS.RUN.stationGone)) return;
  const rf = roofOf();
  if (!rf && !pumps().length) return;
  for (const p of pumps())
    if (p.alive) {
      p.alive = false;
      grid[p.ty * MW + p.tx] = 0;
      ttype[p.ty * MW + p.tx] = 0;
    }
  const x = rf ? rf.x : 18.5 * TILE,
    y = rf ? rf.y : 20.5 * TILE;
  if (rf) roofs.splice(roofs.indexOf(rf), 1);
  decal(R.scorch, x, y, STATION.r / 40, [1, 1, 1, 0.95], [0, 0, 0], 40);
  GS.flowTile = -1;
}
