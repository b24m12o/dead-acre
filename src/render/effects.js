/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, d2, keepIf, rand, randi } from '../core/util.js';
import { opt } from '../core/settings.js';
import { R } from './atlas.js';
import { MH, MW, ROAD, TILE } from '../world/map.js';
import { BILE, BLOOD } from './draw-enemies.js';
export function part(o) {
  if (GS.parts.length > 2600) {
    // full: make room in one go, the shortest-lived bits first (sparks and glints go before smoke, gibs and casings)
    let n = 0;
    for (let i = 0; i < GS.parts.length && n < 160; i++) {
      const q = GS.parts[i];
      if (q.k === 0 || q.k === 1) {
        q.life = 0;
        n++;
      }
    }
    if (n < 160) GS.parts.splice(0, 160 - n);
    keepIf(GS.parts, q => q.life > 0);
  }
  GS.parts.push(o);
  return o;
}
export function glowBurst(x, y, col, n, sp, life, size) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU),
      s = rand(sp * 0.2, sp);
    part({
      k: 0,
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(life * 0.5, life),
      max: life,
      size: rand(size * 0.5, size),
      c: col,
      drag: 3,
    });
  }
}
export function sparks(x, y, col, n, sp, dir = null, spread = Math.PI) {
  for (let i = 0; i < n; i++) {
    const a = dir === null ? rand(0, TAU) : dir + rand(-spread, spread),
      s = rand(sp * 0.3, sp);
    part({
      k: 1,
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(0.15, 0.35),
      max: 0.35,
      size: rand(0.6, 1.1),
      c: col,
      drag: 4,
    });
  }
}
export function dust(x, y, n, sp = 40, size = 1, life = 1, c = null) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU),
      s = rand(5, sp);
    part({
      k: 2,
      x: x + rand(-6, 6),
      y: y + rand(-6, 6),
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(life * 0.6, life),
      max: life,
      size: rand(0.5, 0.9) * size,
      grow: rand(0.6, 1.2),
      rot: rand(0, TAU),
      vr: rand(-1, 1),
      drag: 2,
      c,
    });
  }
}
export function chips(x, y, n, col, kind = 3, sp = 240) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU),
      s = rand(60, sp);
    part({
      k: kind,
      x,
      y,
      z: 0,
      vz: rand(80, 220),
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(1.2, 2.4),
      max: 2.4,
      size: rand(0.7, 1.4),
      rot: rand(0, TAU),
      vr: rand(-12, 12),
      drag: 2.5,
      c: col || [1, 1, 1],
    });
  }
}
export function decal(reg, x, y, scale, tint, emit, life = 30) {
  if (
    scale < 0.26 &&
    reg &&
    R.splat0 &&
    (reg === R.splat0 || reg === R.splat1 || reg === R.splat2 || reg === R.splat3)
  ) {
    // tiny splats: round specks that fade sooner, so the ground doesn't fill with little dark shapes
    let near = 0;
    for (let i = GS.decals.length - 1, n = 0; i >= 0 && n < 60; i--, n++) {
      const d = GS.decals[i];
      if (Math.abs(d.x - x) < 14 && Math.abs(d.y - y) < 14) {
        near++;
        if (near > 1) return d;
      }
    }
    reg = R['speck' + randi(0, 2)];
    scale *= 2.6;
    tint = [tint[0], tint[1], tint[2], tint[3] * 0.7];
    life = Math.min(life, 16);
  }
  const isBlood =
    tint &&
    tint[0] > 0.12 &&
    tint[0] > tint[1] * 3.5 &&
    tint[0] > tint[2] * 3.5 &&
    reg &&
    (reg === R.splat0 ||
      reg === R.splat1 ||
      reg === R.splat2 ||
      reg === R.splat3 ||
      reg === R.speck0 ||
      reg === R.speck1 ||
      reg === R.speck2);
  if (isBlood) {
    const tx = Math.floor(x / TILE),
      ty = Math.floor(y / TILE),
      road = tx >= 0 && ty >= 0 && tx < MW && ty < MH && ROAD[ty * MW + tx];
    tint = road ? [tint[0] * 0.7, tint[1] * 0.6, tint[2] * 0.6, tint[3] * 0.92] : [tint[0], tint[1], tint[2], tint[3]];
  } // on asphalt blood soaks in almost black; on pale concrete it stays red
  if (GS.decals.length > 420) GS.decals.shift();
  const d = { reg, x, y, rot: rand(0, TAU), s: scale, tint, emit, life, max: life };
  if (isBlood) {
    d.blood = true;
    d.dry = 1;
  }
  GS.decals.push(d);
  return d;
}
export function flashLight(x, y, r, col, life) {
  GS.dlights.push({ x, y, r, col, life, max: life });
}
export function distort(x, y, s, sp, life) {
  if (GS.dwaves.length >= 8) GS.dwaves.shift();
  GS.dwaves.push({ x, y, s: s / (1 + GS.shakeLoad * 0.8), sp, t: 0, life });
}
GS.shakeLoad = 0; // how much the screen has been shaken lately: the more it has, the less each new jolt adds, so a run of blasts reads as a rumble, not a constant judder
export function shake(v) {
  if (!opt.shake) return;
  const k = 1 / (1 + GS.shakeLoad * 1.6);
  GS.trauma = Math.min(0.85, GS.trauma + v * k * (1 - GS.trauma * 0.5));
  GS.shakeLoad = Math.min(3, GS.shakeLoad + v);
}
export function floatText(x, y, txt, col, size) {
  if (GS.texts.length > 70) GS.texts.shift();
  const L = txt.length > 12 ? 1.6 : 0.8;
  GS.texts.push({ x, y, txt, col, size, life: L, max: L, vy: -60 });
} // a sentence stays up long enough to read
export function ring(x, y, r0, r1, life, col, w = 1) {
  GS.rings.push({ x, y, r0, r1, life, max: life, c: col, w });
}

/* ---------- Combat ---------- */
export const HUMAN = { skitter: 1, wasp: 1, flower: 1, beetle: 1, mini: 1 };
export function bloodOf(e) {
  return e.type === 'hopper' || e.type === 'egg' ? BILE : BLOOD;
}
export function bleed(x, y, z, dx, dy, n, col, sp = 260, size = 1) {
  if (!opt.gore) n = Math.ceil(n * 0.4);
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl;
  dy /= dl;
  for (let i = 0; i < n; i++) {
    const s = rand(0.25, 1) * sp;
    part({
      k: 8,
      x,
      y,
      z,
      vz: rand(20, 170),
      vx: dx * s + rand(-70, 70),
      vy: dy * s + rand(-70, 70),
      life: 3,
      max: 3,
      size: rand(0.55, 1.15) * size,
      rot: 0,
      vr: 0,
      drag: 1.4,
      c: col,
    });
  }
}
GS.GIBN = 0; // pieces on the ground right now: past forty, new ones don't stay long
export function gib(x, y, reg, tc, col, sp = 260, dx = 0, dy = 0, sz = 1) {
  const a = rand(0, TAU),
    s = rand(0.35, 1) * sp;
  part({
    k: 9,
    reg,
    tc,
    x,
    y,
    z: rand(10, 24),
    vz: rand(120, 300),
    vx: Math.cos(a) * s + dx * sp * 0.5,
    vy: Math.sin(a) * s + dy * sp * 0.5,
    life: GS.parts.length > 500 || GS.GIBN > 40 ? rand(2.5, 4) : rand(5, 8),
    max: 8,
    size: rand(0.9, 1.15) * sz,
    rot: rand(0, TAU),
    vr: rand(-14, 14),
    drag: 1.5,
    c: col,
  });
}
export function pool(x, y, scale, col, life = 45) {
  decal(
    R['splat' + randi(0, 3)],
    x,
    y,
    scale,
    [col[0], col[1], col[2], 0.92],
    col === BILE ? [0.12, 0.2, 0.02] : [0, 0, 0],
    life
  );
}
const SPATS = [];
export function spatSprite(k) {
  // a spatter of blood: one wet irregular drop, darker at its rim, specks thrown one way
  if (SPATS[k]) return SPATS[k];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.translate(64, 64);
  const drop = (cx, cy, r, n = 14) => {
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * TAU,
        rr = r * (0.78 + Math.random() * 0.38);
      i ? g.lineTo(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr) : g.moveTo(cx + rr, cy);
    }
    g.closePath();
  };
  const r0 = 9 + k * 2.5;
  drop(0, 0, r0);
  const gr = g.createRadialGradient(-r0 * 0.3, -r0 * 0.3, 1, 0, 0, r0 * 1.2);
  gr.addColorStop(0, 'rgba(150,14,12,0.85)');
  gr.addColorStop(0.7, 'rgba(110,6,8,0.9)');
  gr.addColorStop(1, 'rgba(50,2,4,0.95)');
  g.fillStyle = gr;
  g.fill();
  g.fillStyle = 'rgba(255,220,210,0.25)';
  g.beginPath();
  g.ellipse(-r0 * 0.35, -r0 * 0.4, r0 * 0.28, r0 * 0.12, -0.6, 0, TAU);
  g.fill();
  const dir = Math.random() * TAU;
  for (let i = 0; i < 14; i++) {
    const t = dir + (Math.random() - 0.5) * 1.3,
      d = r0 + 4 + Math.random() * 40,
      r = Math.max(0.8, (1 - d / 60) * (1 + Math.random() * 3));
    drop(Math.cos(t) * d, Math.sin(t) * d, r, 8);
    g.fillStyle = 'rgba(90,4,6,0.85)';
    g.fill();
  }
  return (SPATS[k] = c);
}
export function splatterScreen(x, y, n) {
  if (!opt.gore || !GS.P || d2(x, y, GS.P.x, GS.P.y) > 95 * 95) return;
  for (let i = 0; i < Math.min(n, 2); i++) {
    const edge = randi(0, 3),
      u = rand(0.04, 0.96),
      w = rand(0.02, 0.16);
    GS.screenBlood.push({
      x: edge === 0 ? w : edge === 1 ? 1 - w : u,
      y: edge === 2 ? w : edge === 3 ? 1 - w : u,
      r: rand(22, 46),
      life: rand(1.6, 2.6),
      max: 2.6,
      seed: Math.random() * 99,
      k: randi(0, 3),
      rot: rand(0, TAU),
    });
  } // a few drops hit the edge of the view, not big red discs
  if (GS.screenBlood.length > 14) GS.screenBlood.splice(0, GS.screenBlood.length - 14);
}
