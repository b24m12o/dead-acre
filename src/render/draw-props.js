/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, clamp, lerp } from '../core/util.js';
import { lineQ, quad, setH, viewH, viewW } from './sprites.js';
import { R } from './atlas.js';
import { MH, MW, TILE, cars, crystals, fires, lamps, roofs, trees, ttype } from '../world/map.js';
import { drawRanger, lampHot } from './draw-player.js';
import { drawEnemy } from './draw-enemies.js';
import { drawBlock } from './blocks.js';
import { carKey, drawCar, drawWreck } from './cars.js';
import { decorKey, drawDecor, drawGrave, drawLampPole, drawPole, drawProp, drawTrunk, propShadow } from './decor.js';
import { drawPile } from '../game/objectives.js';
const DQ = [];
function drawCrate(c) {
  if (GS.SHMODE && !c.landed) return;
  setH(c.landed ? 10 : 0);
  const sq = c.squash > 0 ? Math.sin(c.squash * Math.PI) * 0.12 : 0,
    a = c.landed ? c.ang || 0 : (c.thx || 0) * 0.5;
  const dm = c.landed ? 1 / (1 + 3.2 * lampHot(c.x, c.y)) : 1;
  {
    const ks = c.gun ? 1.08 : 1.22;
    quad(
      c.gun ? R.wcase : R.crate,
      c.x + (c.sx || 0),
      c.y - c.z + (c.sy || 0),
      a,
      ks * (1 + sq),
      ks * (1 - sq),
      dm,
      dm,
      dm,
      1,
      0.55,
      0.55,
      0.55,
      0
    ); // a little bigger than before: an air-dropped supply box is about waist-high
  } /* lit like the street, not glowing: the long case and the square box stay readable under a lamp */
} // airborne crates cast a landing shadow instead (contact-shadow pass); the canopy is drawn overhead
GS.chutesDown = [];
const CHUTE_L = 92; // suspension lines: how far the canopy hangs above its load, in screen height
export function chuteGeom(c) {
  const dep = c.dep ?? 1,
    op = dep >= 1 ? 1 : 1 - Math.pow(1 - dep, 3) + Math.sin(dep * Math.PI) * 0.14;
  return {
    cx: c.x - (c.sx || 0) * 0.15,
    cy: c.y - c.z - CHUTE_L * (0.55 + 0.45 * dep),
    br: Math.sin(c.t * 3.1 + (c.ph || 0)) * dep,
    op,
  };
} // the canopy rides the wind; the load swings beneath it
export function drawChutes() {
  // overhead: the canopy breathes, the load swings under it on a fan of lines
  for (const c of GS.crates)
    if (!c.landed) {
      const { cx, cy, br, op } = chuteGeom(c),
        s0 = c.gun ? 1.2 : 1,
        s = s0 * Math.max(0.12, op),
        sx = s * (1 + br * 0.035) * (op < 1 ? 0.7 + 0.3 * op : 1),
        sy = s * (1 - br * 0.03),
        RC = 54,
        kx = c.x + (c.sx || 0),
        ky = c.y - c.z + (c.sy || 0) - 14,
        rot = c.rot || 0;
      for (let i = 0; i < 14; i++) {
        const g = (i / 14) * TAU + rot,
          px = cx + Math.cos(g) * RC * 0.94 * sx,
          py = cy + Math.sin(g) * RC * 0.94 * sy;
        if (py < cy - RC * 0.2 * sy) continue;
        lineQ(px, py, kx, ky, 1.0, 0.3, 0.31, 0.24, 0.8, 0, 0, 0, 0, R.pixel);
      }
      for (const o of [-9, 9]) lineQ(kx, ky, kx + o, ky + 10, 1.1, 0.2, 0.2, 0.14, 0.9, 0, 0, 0, 0, R.pixel);
      quad(R.chute2, cx, cy, rot, sx, sy, 1, 1, 1, 1, 0, 0, 0, 0);
    }
}
function drawChuteDown(h) {
  // the canopy comes down after the load, flattens and lies crumpled downwind of it, then is gone
  const f = clamp(h.t / 1.1, 0, 1),
    e = f * f * (3 - 2 * f),
    fade = clamp(h.life / 1.5, 0, 1),
    L = 62 * h.s + 10,
    ca = Math.cos(h.a),
    sa = Math.sin(h.a);
  const tx = h.cx + ca * L,
    ty = h.cy + 4 + sa * L,
    x = lerp(h.x, tx, e),
    y = lerp(h.y, ty, e),
    z = h.z * (1 - e),
    axn = x - ca * 60 * h.s,
    ayn = y - sa * 60 * h.s;
  if (GS.SHMODE) {
    if (e > 0.6) {
      setH(4);
      quad(R.chutedn, x, y, h.a, h.s, h.s * e, 1, 1, 1, fade, 0, 0, 0, 0);
    }
    return;
  }
  if (h.crate && !h.crate.open && fade > 0.05)
    for (const o of [-5, 0, 5])
      lineQ(
        f < 1 ? x : axn,
        (f < 1 ? y - z : ayn) + o * 0.4,
        h.cx + o * 0.6,
        h.cy - 6,
        0.6,
        0.14,
        0.15,
        0.1,
        0.65 * fade,
        0,
        0,
        0,
        0,
        R.pixel
      );
  if (f < 1) quad(R.chute2, x, y - z, h.rot, h.s * (1 + e * 0.3), h.s * (1 - e * 0.7), 1, 1, 1, 1 - e, 0, 0, 0, 0);
  if (e > 0.05) quad(R.chutedn, x, y, h.a, h.s * (0.6 + 0.4 * e), h.s * (0.3 + 0.7 * e), 1, 1, 1, e * fade, 0, 0, 0, 0);
}
function drawCrystal(c) {
  const g = c.grow < 1 ? c.grow * (2 - c.grow) : 1,
    f = c.flash > 0 ? 1 : 0,
    pu = Math.sin(GS.time * 5 + c.x) > 0 ? 1.6 : 0.6;
  if (GS.SHMODE) {
    setH(26 * g);
    quad(R['crystal' + c.hue], c.x, c.y, c.rot, c.s * g, c.s * g, 1, 1, 1, 1, 0, 0, 0, 0);
    return;
  }
  const sc = c.hue ? [0.3, 0.32, 0.34] : [0.19, 0.25, 0.18],
    bs = 10 * c.s * g * 0.98;
  for (let k = 0; k < 16; k++) {
    const sh = 0.55 + (0.45 * k) / 15;
    quad(R.pixel, c.x, c.y - 4 * g - k * g, c.rot, bs, bs, sc[0] * sh, sc[1] * sh, sc[2] * sh, 1, 0, 0, 0, f);
  }
  quad(R['crystal' + c.hue], c.x, c.y - 20 * g, c.rot, c.s * g, c.s * g, 1, 1, 1, 1, pu, pu, pu, f);
} // plain metal sides rising to the painted top: no stack of repeated hazard stripes
function drawBurnBarrel(f) {
  if (GS.SHMODE && propShadow('o_burn', f.x, f.y)) return;
  if (GS.SHMODE) {
    setH(18);
    quad(R.rustdisc, f.x, f.y, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0);
    return;
  }
  if (!drawProp('o_burn', f.x, f.y))
    for (let k = 0; k <= 17; k++) {
      const sh = 0.4 + (0.6 * k) / 17;
      quad(R.rustdisc, f.x, f.y - k, f.ph, 1, 1, sh, sh, sh, 1, 0, 0, 0, 0);
    }
  const fk = 0.8 + Math.sin(GS.time * 13 + f.ph) * 0.2;
  quad(R.bbtop, f.x, f.y - 18, f.ph, 1, 1, 1, 1, 1, 1, 1.6 * fk, 1.2 * fk, 1 * fk, 0);
}
function drawBarrel(b) {
  if (GS.SHMODE && propShadow('o_drum', b.x, b.y)) return;
  if (GS.SHMODE) {
    setH(16);
    quad(R.canister, b.x, b.y, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0);
    return;
  }
  if (drawProp('o_drum', b.x, b.y)) return;
  for (let k = 0; k <= 9; k++) {
    const sh = 0.62 + (0.38 * k) / 9;
    quad(R.canister, b.x, b.y - k * 1.6, 0, 1, 1, sh, sh * 0.96, sh * 0.94, 1, 0, 0, 0, 0);
  }
} // fewer, lighter slices: a drum, not a dark capsule
function drawPillar(p) {
  drawPole(p[0], p[1], 56, 6, 0.75);
}
function drawGen() {
  if (GS.SHMODE && propShadow('o_gen', GS.obj.x, GS.obj.y)) return;
  if (GS.SHMODE) {
    setH(18);
    quad(R.gen, GS.obj.x, GS.obj.y, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0);
    return;
  }
  const ok = GS.obj.hp / GS.obj.max,
    fl = Math.sin(GS.time * 9) > 0 ? 1 : 0.3,
    lamp = (x, y) =>
      quad(
        R.glow,
        x,
        y,
        0,
        0.07,
        0.07,
        0,
        0,
        0,
        1,
        ok > 0.35 ? 0.3 : 1.4 * fl,
        ok > 0.35 ? 1 : 0.15 * fl,
        ok > 0.35 ? 0.35 : 0.1,
        0
      ); // green while it runs, a red flicker when it is failing
  if (drawProp('o_gen', GS.obj.x, GS.obj.y)) {
    lamp(GS.obj.x + 11, GS.obj.y + 2);
    return;
  } // the status lamp on its panel door
  for (let k = 0; k <= 9; k++) {
    const sh = 0.45 + (0.5 * k) / 9;
    quad(R.gen, GS.obj.x, GS.obj.y - k * 2, 0, 1, 1, sh, sh, sh, 1, 0, 0, 0, 0);
  }
  lamp(GS.obj.x + 13, GS.obj.y - 10);
}
function drawCan(c) {
  setH(14);
  quad(
    R[c.reg || 'fuelcan'],
    c.x,
    c.y - 8 + Math.sin(c.t * 3) * 2,
    Math.sin(c.t) * 0.2,
    c.reg ? 1.35 : 1,
    c.reg ? 1.35 : 1,
    1,
    1,
    1,
    1,
    1.4,
    1.4,
    1.4,
    0
  );
}
export function drawCasters() {
  DQ.length = 0;
  const push = (y, f, a) => DQ.push({ y, f, a });
  const tx0 = Math.max(0, Math.floor((GS.camX - 60) / TILE)),
    tx1 = Math.min(MW - 1, Math.floor((GS.camX + viewW + 60) / TILE)),
    ty0 = Math.max(0, Math.floor((GS.camY - 60) / TILE)),
    ty1 = Math.min(MH - 1, Math.floor((GS.camY + viewH + 120) / TILE));
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      const i = ty * MW + tx,
        t = ttype[i];
      if (t === 5 || t === 1 || t === 9) push((ty + 1) * TILE - 0.5, drawBlock, i);
      else if (t === 8) push((ty + 0.5) * TILE - 2, drawGrave, i);
    }
  const vis = (x, y, m = 130) =>
    x > GS.camX - m && x < GS.camX + viewW + m && y > GS.camY - m && y < GS.camY + viewH + m * 1.4;
  for (const c of cars) if (!c.dead && vis(c.x, c.y)) push(carKey(c), drawCar, c);
  for (const w of GS.wrecks) if (vis(w.x, w.y)) push(w.y + 20, drawWreck, w);
  for (const d of GS.decor) if (vis(d.x, d.y)) push(decorKey(d), drawDecor, d);
  for (const L of lamps) if (vis(L.bx, L.by)) push(L.by, drawLampPole, L);
  for (const t of trees) if (vis(t.x, t.y)) push(t.y, drawTrunk, t);
  for (const r of roofs)
    if (vis(r.x, r.y, 200))
      for (const [ox, oy] of [
        [-110, -40],
        [110, -40],
        [-110, 40],
        [110, 40],
      ])
        push(r.y + oy, drawPillar, [r.x + ox, r.y + oy]);
  for (const c of GS.crates) push(c.y, drawCrate, c);
  for (const h of GS.chutesDown) if (vis(h.x, h.y, 160)) push(h.cy - 30, drawChuteDown, h);
  if (!GS.NOHERO || GS.SHMODE === 1) for (const b of GS.buddies) push(b.y, drawRanger, b);
  for (const c of crystals) if (c.alive && vis(c.x, c.y)) push(c.y + 16, drawCrystal, c);
  for (const f of fires) if (vis(f.x, f.y)) push(f.y + 12, drawBurnBarrel, f);
  for (const b of GS.barrels) if (!b.dead && vis(b.x, b.y)) push(b.y + 10, drawBarrel, b);
  for (const e of GS.corpses) if (vis(e.x, e.y)) push(e.y - 18, drawEnemy, e);
  for (const e of GS.enemies) if (!e.fly && vis(e.x, e.y)) push(e.y + (e.type === 'queen' ? 240 : 0), drawEnemy, e); // bosses tower over the cars and clutter they wade through
  if (GS.state !== 'over' && GS.P && !GS.NOHERO) push(GS.P.y, drawRanger, GS.P);
  if (GS.obj && GS.obj.type === 'gen' && GS.obj.hp > 0) push(GS.obj.y, drawGen, null);
  if (GS.obj && GS.obj.type === 'rescue' && GS.obj.s.hp > 0 && !GS.obj.joined) push(GS.obj.s.y, drawRanger, GS.obj.s);
  if (GS.obj && GS.obj.type === 'fuel') for (const c of GS.obj.cans) if (!c.got) push(c.y, drawCan, c);
  if (GS.obj && GS.obj.type === 'box') for (const q of GS.obj.piles) if (vis(q.x, q.y)) push(q.y - 30, drawPile, q);
  DQ.sort((a, b) => a.y - b.y);
  for (const q of DQ) q.f(q.a);
  for (const g of GS.bangs) {
    setH(g.z + 3);
    quad(R.flashbang, g.x, g.y - g.z, g.spin, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0);
  }
  for (const m of GS.molos) {
    setH(m.z);
    quad(R.molotov, m.x, m.y - m.z, m.spin, 1, 1, 1, 1, 1, 1, 1.5, 1.5, 1.5, 0);
  }
  for (const b of GS.pbullets)
    if (b.shell && b.t >= 0) {
      setH(b.z);
      quad(R.grenade, b.x, b.y - b.z, b.spin, b.mini ? 0.7 : 1, b.mini ? 0.7 : 1, 1, 1, 1, 1, 1.5, 1.5, 1.5, 0);
    }
  for (const m of GS.darts)
    if (m.t >= 0) {
      setH(m.z + 4);
      quad(R.pipebomb, m.x, m.y - m.z, m.spin, 1, 1, 1, 1, 1, 1, 1.4, 1.4, 1.4, 0);
    }
  for (const e of GS.enemies) if (e.fly) drawEnemy(e);
  for (const m of GS.mortars) {
    setH(m.z);
    if (m.slab) {
      quad(R['grave' + m.gk], m.x, m.y - m.z, GS.time * 6, 1.25, 1.25, 1, 1, 1, 1, 0, 0, 0, 0);
      continue;
    }
    if (m.walker) {
      const a = GS.time * 9;
      quad(R['z_torso' + Math.min(2, m.walker.v || 0)], m.x, m.y - m.z, a, 1.15, 1.15, 1, 1, 1, 1, 0.6, 0.6, 0.6, 0);
      quad(
        R['z_head' + Math.min(2, m.walker.hv || 0)],
        m.x + Math.cos(a) * 18,
        m.y - m.z + Math.sin(a) * 18,
        a,
        1.1,
        1.1,
        1,
        1,
        1,
        1,
        0.6,
        0.6,
        0.6,
        0
      );
      continue;
    }
    if (m.flare) {
      quad(R.pixel, m.x, m.y - m.z, GS.time * 9, 5, 1.6, 0.8, 0.12, 0.1, 1, 2.6, 0.5, 0.35, 0);
      continue;
    }
    if (m.ext) quad(R.cf_ext, m.x, m.y - m.z, GS.time * 7, 1.6, 1.6, 1, 1, 1, 1, 0, 0, 0, 0);
    else if (m.rock) quad(R.rockchip, m.x, m.y - m.z, GS.time * 5, 3.4, 3.4, 0.62, 0.6, 0.56, 1, 0, 0, 0, 0);
    else quad(R.acid, m.x, m.y - m.z, GS.time * 6, 1.4, 1.4, 1, 1, 1, 1, 1.5, 1.5, 1.5, 0);
  }
  for (const b of GS.butterflies) {
    setH(b.z);
    const f = Math.abs(Math.sin(b.t * 16));
    for (const sd of [-1, 1])
      quad(
        R.bf_wing,
        b.x + Math.cos(b.a + (sd * Math.PI) / 2) * 2.4 * f,
        b.y - b.z + Math.sin(b.a + (sd * Math.PI) / 2) * 2.4 * f,
        b.a + sd * 1.2,
        (0.3 + f * 0.7) * 0.5,
        sd * 0.5,
        0.6 * b.hue,
        0.58,
        0.55,
        1,
        0,
        0,
        0,
        0
      );
  }
  if (GS.evac && (GS.SHMODE || GS.evac.z < 20)) {
    const e = GS.evac;
    setH(e.z + 60);
    {
      const hk = e.t >= e.land ? 0.8 : 1.4;
      quad(R.heli, e.hx, e.hy - e.z * 0.35, e.ha ?? 2.4, 1 + e.z / 900, 1 + e.z / 900, 1, 1, 1, 1, hk, hk, hk, 0);
    }
    heliRotor(e);
  } // in the air it is drawn later, over roofs and trees
}
export function heliRotor(e) {
  // four main blades smeared by their own speed into a soft disc, the hub on the mast ahead of centre
  const S = 1 + e.z / 900,
    ha = e.ha ?? 2.4,
    cx = e.hx + Math.cos(ha) * 48 * S,
    cy = e.hy - e.z * 0.35 + Math.sin(ha) * 48 * S,
    L = 134 * S,
    spin = GS.time * 24;
  setH(e.z + 72);
  for (let b = 0; b < 4; b++)
    for (let k = 0; k < (GS.SHMODE ? 1 : 4); k++) {
      const a = spin + (b * Math.PI) / 2 - k * 0.06;
      lineQ(
        cx + Math.cos(a) * 6 * S,
        cy + Math.sin(a) * 6 * S,
        cx + Math.cos(a) * L,
        cy + Math.sin(a) * L,
        5 * S,
        0.07,
        0.075,
        0.07,
        GS.SHMODE ? 0.4 : [0.55, 0.32, 0.18, 0.09][k],
        0,
        0,
        0,
        0,
        R.pixel
      );
    }
}
export const PREG = () => [null, null, null, R.chip, R.rockchip, R.leafbit, R.petalbit, R.shell, R.drop, R.g_meat0];
GS.PARTREG = null;
GS.WETV = 0.42;
