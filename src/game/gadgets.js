/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The second abilities' gear on the ground: the Soldier's claymores and the Deputy's road flares. (The Gunslinger's
// dynamite is a thrown bang: see updateBang.) Ticked once a frame from update, drawn from draw-props.
import { GS } from '../core/gs.js';
import { TAU, angDiff, d2, rand } from '../core/util.js';
import { MH, MW, TILE, grid } from '../world/map.js';
import { dijk, query } from '../world/nav.js';
import { sfx } from '../audio/sfx.js';
import { S } from './state.js';
import { flashLight, part, sparks } from '../render/effects.js';
import { explode } from './combat.js';
import { ignite } from '../world/fire.js';

GS.mines = [];
GS.flares = [];
export function resetGadgets() {
  GS.mines = [];
  GS.flares = [];
}
const abDmg = () => (70 + 14 * GS.wave) * (0.5 + 0.5 * S.dmg);
// the Gunslinger's dynamite, once its fuse burns down
export function dynamiteBlast(x, y) {
  explode(x, y, 150 * (1 + 0.25 * S.abLv), abDmg() * 1.3 * (1 + 0.2 * S.abLv), false);
}
// a flare lands: it burns, and every zombie that can get to it goes to it, the way they go to a car alarm
export function startFlare(x, y) {
  const f = { x, y, alarm: 8 + 4 * S.abLv, flare: true, t: 0, ignT: 0 },
    seeds = [],
    cx = Math.floor(x / TILE),
    cy = Math.floor(y / TILE);
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const tx = cx + i,
        ty = cy + j;
      if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && !grid[ty * MW + tx]) seeds.push(ty * MW + tx);
    }
  f.flow = new Uint16Array(MW * MH);
  dijk(f.flow, seeds, false);
  GS.flares.push(f);
  if (GS.flares.length > 3) GS.flares.shift();
  sfx.ting();
  const R2 = (700 * (1 + 0.4 * S.abLv)) ** 2;
  for (const e of GS.enemies) {
    if (e.dead || e.big || e.fly || e.type === 'flower' || e.type === 'wasp' || d2(e.x, e.y, x, y) > R2) continue;
    e.lure = f;
    e.aw = 0;
    if (e.st !== 'jump') {
      e.st = 'move';
      e.stT = 1;
    }
  }
}
export function tickGadgets(dt) {
  for (const m of GS.mines) {
    if (m.done) continue;
    m.arm -= dt;
    if (m.arm > 0) continue;
    let hit = false;
    query(m.x, m.y, 170, e => {
      if (hit || e.dead || !(e.emerge >= 1) || e.fly) return;
      if (d2(m.x, m.y, e.x, e.y) < 160 * 160 && Math.abs(angDiff(m.a, Math.atan2(e.y - m.y, e.x - m.x))) < 0.7)
        hit = true;
    });
    if (hit) {
      m.done = true;
      const c = Math.cos(m.a),
        s = Math.sin(m.a);
      sparks(m.x, m.y, [1, 0.8, 0.45], 30, 900, m.a, 0.5);
      explode(m.x + c * 60, m.y + s * 60, 115 * (1 + 0.25 * S.abLv), abDmg(), false);
    }
  }
  GS.mines = GS.mines.filter(m => !m.done);
  for (const f of GS.flares) {
    f.alarm -= dt;
    f.t += dt;
    const fl = 0.8 + 0.2 * Math.sin(f.t * 31) * Math.sin(f.t * 13.7);
    flashLight(f.x, f.y, 300 * fl, [2.4 * fl, 0.5 * fl, 0.32 * fl], dt * 1.5);
    if (Math.random() < dt * 14)
      part({
        k: 2,
        x: f.x + rand(-3, 3),
        y: f.y + rand(-3, 3),
        vx: rand(-10, 10),
        vy: rand(-30, -12),
        life: rand(1.4, 2.4),
        max: 2.4,
        size: rand(0.5, 0.8),
        grow: rand(1.2, 2),
        rot: rand(0, TAU),
        vr: rand(-0.6, 0.6),
        drag: 0.8,
        c: [0.55, 0.3, 0.3],
        wind: 0.8,
      }); // pink-red smoke rolling off it
    if (Math.random() < dt * 20) sparks(f.x, f.y, [1, 0.45, 0.3], 1, 90);
    f.ignT -= dt;
    if (f.ignT <= 0) {
      f.ignT = 0.5;
      query(f.x, f.y, 60, e => {
        if (!e.dead && d2(f.x, f.y, e.x, e.y) < (34 + e.r) ** 2) ignite(e, 2);
      });
    }
  }
  GS.flares = GS.flares.filter(f => f.alarm > 0);
}
