/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// What else is alive on the streets. Crows: a few at a time, come down in a group on the street and on the dead,
// walking, hopping and pecking at what's lying there; a shot, or you or one of the dead coming near, and they're up
// all at once, beating hard and climbing away (each a beat behind the last), off over the roofs; a while later others
// come down somewhere else. Flies over the dead. Moths round the lit lamps at night. Steam off some of the manhole lids,
// carried off by the wind.
import { GS } from '../core/gs.js';
import { TILT } from '../core/scale.js';
import { TAU, angDiff, rand } from '../core/util.js';
import { R } from '../render/atlas.js';
import { quad, setH } from '../render/sprites.js';
import { blockPt } from './nav.js';
import { part } from '../render/effects.js';
import { HATCHES } from './sewers.js';

// (a number from 0 to 1 for a pair of whole numbers: the same each time)
const hsh = (a, b) => ((((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000) / 1000;
export const crows = [];
let nextFlock = 4,
  flockN = 0;
// the dead painted into the street (remains.js): where they lie, for the flies; the last hundred and fifty
export const lying = [];
export function lain(e) {
  if (e.burnt) return;
  lying.push({ x: e.x, y: e.y, id: e.id | 0 });
  if (lying.length > 150) lying.shift();
}
export function resetLife() {
  crows.length = 0;
  lying.length = 0;
  nextFlock = rand(3, 8);
}
// somewhere open for a flock to come down: by one of the dead lying out of reach of the fight if there is one, else on
// the street, out from you
function landingSpot(P) {
  const near = GS.corpses.filter(e => {
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    return d > 260 && d < 800 && !blockPt(e.x, e.y);
  });
  if (near.length && Math.random() < 0.7) {
    const e = near[Math.floor(Math.random() * near.length)];
    return [e.x + rand(-10, 10), e.y + rand(-10, 10), e];
  }
  for (let t = 0; t < 30; t++) {
    const a = rand(0, TAU),
      d = rand(280, 760),
      x = P.x + Math.cos(a) * d,
      y = P.y + Math.sin(a) * d;
    let ok = true;
    for (const [ox, oy] of [
      [0, 0],
      [24, 0],
      [-24, 0],
      [0, 24],
      [0, -24],
    ])
      if (blockPt(x + ox, y + oy)) ok = false;
    if (ok) return [x, y, null];
  }
  return null;
}
// a flock coming in: from off over the roofs, high, each to its own patch of the spot, gliding down in
function comeIn(P) {
  const L = landingSpot(P);
  if (!L) return;
  const [x, y] = L,
    n = 3 + Math.floor(Math.random() * 4),
    a = rand(0, TAU),
    id = ++flockN;
  for (let i = 0; i < n; i++) {
    const tx = x + rand(-26, 26),
      ty = y + rand(-16, 16),
      d = rand(700, 900);
    crows.push({
      id,
      x: tx + Math.cos(a) * d,
      y: ty + Math.sin(a) * d,
      z: rand(170, 230),
      tx,
      ty,
      a: a + Math.PI,
      st: 'in',
      v: rand(150, 175),
      vz: 0,
      fl: rand(0, TAU),
      t: rand(0, 2),
      peck: 0,
      hop: 0,
      k: rand(0.92, 1.08),
      seed: Math.random(),
    });
  }
}
// what puts them up: you near (nearer when you go quietly), one of the dead near, a shot anywhere close
function alarmed(c, P) {
  const dp = Math.hypot(P.x - c.x, P.y - c.y),
    run = Math.hypot(P.vx || 0, P.vy || 0) > 90;
  if (dp < (run ? 150 : 105)) return [P.x, P.y];
  if (GS.time - (P.lastShotT ?? -9) < 0.12 && dp < 1000) return [P.x, P.y]; // (a shot carries: they go up at one fifty metres off)
  for (const b of GS.buddies)
    if (GS.time - (b.lastShotT ?? -9) < 0.12 && Math.hypot(b.x - c.x, b.y - c.y) < 900) return [b.x, b.y];
  for (const e of GS.enemies)
    if (!e.dead && Math.abs(e.x - c.x) < 60 && Math.abs(e.y - c.y) < 60 && Math.hypot(e.x - c.x, e.y - c.y) < 55)
      return [e.x, e.y];
  return null;
}
function takeOff(c, from, delay) {
  c.st = 'up';
  c.t = -delay;
  const away = Math.atan2(c.y - from[1], c.x - from[0]) + rand(-0.6, 0.6);
  c.a = away;
  c.v = 0;
  c.vz = 0;
}
export function tickLife(dt) {
  const P = GS.P;
  if (!P || GS.state === 'menu') return;
  // a new flock now and then, while it's been quiet a while and there aren't many about
  nextFlock -= dt;
  if (nextFlock <= 0) {
    nextFlock = rand(14, 32);
    const flocks = new Set(crows.map(c => c.id));
    if (flocks.size < 2 && GS.time - (P.lastShotT ?? -9) > 6) comeIn(P);
  }
  for (const c of crows) {
    c.t += dt;
    if (c.st === 'in') {
      // gliding down to its spot, a few beats now and then, braking with its wings at the last
      const dx = c.tx - c.x,
        dy = c.ty - c.y,
        d = Math.hypot(dx, dy);
      c.a += angDiff(c.a, Math.atan2(dy, dx)) * Math.min(1, dt * 3);
      const sp = Math.min(c.v, 40 + d * 0.9);
      c.x += Math.cos(c.a) * sp * dt;
      c.y += Math.sin(c.a) * sp * dt;
      // (its height down a slope to the spot: it can't come in past it and have to circle round)
      c.z = Math.max(0, Math.min(c.z, d * 0.3, c.z - dt * 30 * Math.min(1, d / 40)));
      c.fl += dt * (d < 60 ? 15 : Math.sin(c.t * 1.3 + c.seed * 9) > 0.3 ? 11 : 0);
      if (d < 10 && c.z < 4) {
        c.st = 'ground';
        c.z = 0;
        c.t = rand(0, 1);
      }
      const al = alarmed(c, P);
      if (al && c.z < 60) takeOff(c, al, 0);
    } else if (c.st === 'ground') {
      // walking about, pecking at what's there, a hop now and then; turned this way and that
      c.peck = Math.max(0, c.peck - dt);
      c.hop = Math.max(0, c.hop - dt);
      if (c.peck <= 0 && c.hop <= 0 && Math.random() < dt * 1.1) c.peck = rand(0.35, 0.7);
      if (c.peck <= 0 && c.hop <= 0 && Math.random() < dt * 0.5) {
        c.hop = 0.22;
        c.a += rand(-1.2, 1.2);
      }
      if (c.hop > 0) {
        const nx = c.x + Math.cos(c.a) * 34 * dt,
          ny = c.y + Math.sin(c.a) * 34 * dt;
        if (!blockPt(nx, ny)) {
          c.x = nx;
          c.y = ny;
        }
        c.z = Math.sin((1 - c.hop / 0.22) * Math.PI) * 3;
      } else {
        c.z = 0;
        if (c.peck <= 0 && Math.random() < dt * 0.6) c.a += rand(-0.9, 0.9);
      }
      const al = alarmed(c, P);
      if (al)
        for (const o of crows) if (o.id === c.id && o.st === 'ground') takeOff(o, al, o === c ? 0 : rand(0.04, 0.3));
    } else if (c.st === 'up') {
      if (c.t < 0) continue; // (a beat behind the first)
      // up hard, beating fast, then away over the roofs
      c.vz = Math.max(c.vz, 150 - c.t * 50);
      c.z += c.vz * dt;
      c.v = Math.min(190, c.v + dt * 380);
      c.x += Math.cos(c.a) * c.v * dt;
      c.y += Math.sin(c.a) * c.v * dt;
      c.a += Math.sin(c.t * 2 + c.seed * 7) * dt * 0.6;
      c.fl += dt * (c.t < 1.2 ? 17 : 12);
      if (c.z > 260 || Math.hypot(c.x - P.x, c.y - P.y) > 1300) c.gone = true;
    }
  }
  for (let i = crows.length - 1; i >= 0; i--) if (crows[i].gone) crows.splice(i, 1);
  // steam off some of the lids near you, a puff at a time
  for (const h of HATCHES) {
    if (h.open || hsh(h.x, h.y) > 0.35) continue;
    if (Math.abs(h.x - P.x) > 700 || Math.abs(h.y - P.y) > 500) continue;
    if (Math.random() < dt * 5)
      part({
        k: 2,
        x: h.x + rand(-7, 7),
        y: h.y + rand(-5, 5),
        vx: rand(-4, 4),
        vy: rand(-16, -9),
        life: rand(1.8, 3.0),
        max: 3.0,
        size: rand(0.35, 0.6),
        grow: 1.8,
        drag: 0.5,
        rot: rand(0, TAU),
        vr: rand(-0.6, 0.6),
        c: [0.62, 0.64, 0.66],
        wind: 0.8,
      });
  }
}

// ---------- drawing ----------
// a crow, from above (the atlas's crow and cwing: paint/birds.js): its body, the head darting forward as it pecks;
// flying, its wings spread from its shoulders, their span narrowing as they beat up and down past level and swept
// back on the upstroke. Lifted up the screen by its height; in a shadow pass drawn where it is on the ground, the pass
// throwing it from its height
export function drawCrow(c) {
  const zz = Math.max(0, c.z),
    sh = !!GS.SHMODE;
  setH(zz + 1.5);
  const k = c.k * 0.5, // (the pictures are twice life size: a crow 0.45 m nose to tail, its wings a metre across)
    x = c.x,
    y = sh ? c.y : c.y - zz * TILT,
    ca = Math.cos(c.a),
    sa = Math.sin(c.a);
  if (!sh && zz < 6) quad(R.blob, c.x, c.y + 0.5, c.a, 0.3 * k, 0.16 * k, 0, 0, 0, 0.3, 0, 0, 0, 0); // under it, on the street
  if (c.st !== 'ground') {
    const ph = c.fl,
      w = 1.5 * k * (0.3 + 0.7 * Math.abs(Math.cos(ph))),
      sweep = -1.4 * Math.max(0, -Math.sin(ph)) * k;
    for (const s of [1, -1]) {
      const rx = -sa * s,
        ry = ca * s,
        cx = x + ca * (0.8 * k + sweep) + rx * (1.6 * k + 5.6 * w),
        cy = y + sa * (0.8 * k + sweep) + ry * (1.6 * k + 5.6 * w);
      quad(R.cwing, cx, cy, c.a + (s * Math.PI) / 2, w, s * k * 1.4, 1, 1, 1, 1, 0, 0, 0, 0);
    }
  }
  const pk = c.st === 'ground' && c.peck > 0 ? Math.max(0, Math.sin((1 - c.peck / 0.6) * Math.PI * 3)) : 0;
  quad(R.crow, x + ca * pk * 0.9, y + sa * pk * 0.9, c.a, k * (1 + pk * 0.05), k, 1, 1, 1, 1, 0, 0, 0, 0);
  setH(0);
}
// flies over one of the dead: a few black specks circling and darting over it, each its own way round
export function drawFlies(e) {
  if (GS.SHMODE) return;
  const n = 3 + (Math.abs(e.id | 0) % 4),
    t = GS.time;
  for (let i = 0; i < n; i++) {
    const s = hsh(e.id | 0, i * 7 + 1),
      w = 5 + s * 6,
      r = 6 + hsh(e.id | 0, i * 7 + 2) * 9,
      a = t * w * (s > 0.5 ? 1 : -1) + s * 20 + Math.sin(t * 13 + i) * 0.6,
      z = 4 + Math.sin(t * 3.1 + i * 2) * 2.5 + s * 5,
      x = e.x + Math.cos(a) * r + Math.sin(t * 17 + i) * 1.2,
      y = e.y - 10 + Math.sin(a) * r * 0.6 - z * TILT;
    quad(R.blob, x, y, 0, 0.03, 0.03, 0.02, 0.02, 0.02, 0.85, 0, 0, 0, 0);
  }
}
// moths round a lit lamp's head (its height lifted lh up the screen, lit k): pale specks in its light, wheeling
export function drawMoths(L, lh, k) {
  const n = (4 + hsh(L.hx | 0, L.hy | 0) * 4) | 0,
    t = GS.time;
  for (let i = 0; i < n; i++) {
    const s = hsh(L.hx | 0, i * 13 + 3),
      a = t * (2.2 + s * 3.5) * (i % 2 ? 1 : -1) + s * 31,
      r = 16 + s * 18 + Math.sin(t * 2.7 + i) * 4, // (out round the glare, where they show)
      x = L.hx + Math.cos(a) * r + Math.sin(t * 9 + i * 3) * 1.5,
      y = L.hy - lh + Math.sin(a) * r * 0.55 + 4 + Math.cos(t * 7 + i) * 2;
    quad(R.glow, x, y, 0, 0.035, 0.035, 0, 0, 0, 0, 2.6 * k, 2.4 * k, 1.9 * k, 0);
  }
}
