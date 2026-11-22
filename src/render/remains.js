/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The dead stay. A body that has lain where it fell for its time, and the dried blood, brass and burn marks round
// it, are painted into the ground itself instead of fading out: the street at dawn shows the whole night, and it is
// still there the next night you spend at the place. Painted remains cost nothing to keep: they are part of the
// ground picture (its colour at three sizes, and its surface normals, so they take the light as they did), drawn
// there by the same sprite shader that drew them alive. Nothing is painted while no frame is being drawn (a
// stepped test, a hidden tab): then bodies and marks simply run out as they always did.
import { GS } from '../core/gs.js';
import { d2 } from '../core/util.js';
import { gl } from './gl.js';
import { P_SPRITE, bset, cullBox, flush, inkMode, makeRT, makeTex, quad, setH } from './sprites.js';
import { R } from './atlas.js';
import { MAPREG, MH, MW, NM, TILE, WH, WW, grassCells, mapA, texMapA, texMapE, texMapN } from '../world/map.js';
import { HUMAN } from './effects.js';
import { drawEnemy } from './draw-enemies.js';
import { figCam, figFlush } from './fig3d.js';
import { LYB, lyState } from './draw-bodies.js';
import { pileKeep } from '../world/piles.js';

import { lain } from '../world/life.js';
export const REMAINS = {
  hold: 1.6, // seconds before its time is up that a body is handed over: it never starts to fade
  every: 300, // ms between paintings, so a horde's worth goes in over a few seconds, not in one frame
  regions: 4, // patches of ground painted per go
  box: 256, // a patch, in world px
  rest: 6, // a body is painted only once it lies still: under this speed
  age: 20, // brass, burn marks and the like are painted in once they have lain this long
  shade: 0.2, // how dark its own shadow is painted over and beside a body
};
GS.baked = { bodies: 0, marks: 0 };
const SZ = 512; // the patch at the ground picture's finest size (1.5 px to the world px) fits with room to spare
let RT = null,
  lastT = 0;

const KINDS = () => [
  R.splat0,
  R.splat1,
  R.splat2,
  R.splat3,
  R.shell,
  R.mag,
  R.scorch,
  R.fprint,
  R.ab_egg,
  R.riotflat,
  R.rockchip,
];
let kinds = null;
// a mark that belongs to the ground once it is old: blood, brass, burns. Never a hole the dead climbed out of or
// anything a boss still owns (those close up or are picked up again), and never the fine specks, which fade so the
// ground doesn't fill with little dark shapes
export function markStays(d) {
  if (!d.reg || d.noBake) return false;
  kinds = kinds || KINDS();
  return kinds.includes(d.reg);
}
const glowing = d => (d.emit[0] + d.emit[1] + d.emit[2]) * (d.life / d.max) > 0.02;
const markDue = d =>
  markStays(d) &&
  !(d.gs && d.s < d.gs * 0.98) && // a pool still spreading
  !glowing(d) &&
  (d.life <= 5.2 || (!d.blood && d.max - d.life > REMAINS.age));
export const bodyStays = e => (e.keep || 0) >= 20 && e.type !== 'queen' && !e.noBake;
const bodyStill = e =>
  !(e.z > 0) && !(e.vz > 0) && Math.hypot(e.rvx || 0, e.rvy || 0) < REMAINS.rest && !(e.burn > 0) && e.dying > 1.2;
const painting = () => GS.time - (GS.bakeT ?? -9) < 0.6;

// each step of the world: whatever is due is held just short of fading until the next frame paints it in
export function remainsTick(dt) {
  if (!painting()) return;
  for (const e of GS.corpses)
    if (bodyStays(e) && e.dying > e.keep - REMAINS.hold) {
      e.keep = e.dying + REMAINS.hold;
      e.bake = true;
      if (!bodyStill(e) && (e.bakeW = (e.bakeW || 0) + dt) > 6) e.noBake = true; // still sliding or burning after all this time: it goes the old way
    }
  for (const d of GS.decals)
    if (markDue(d)) {
      d.life = Math.max(d.life, 5.2);
      d.bake = true;
    }
}
// the street is over-full: the oldest body that can stay goes into the ground now instead of vanishing
export function remainsFull() {
  if (!painting()) return false;
  const e = GS.corpses.find(c => bodyStays(c) && !c.bake);
  if (!e) return false;
  e.keep = Math.min(e.keep, e.dying + REMAINS.hold);
  return true;
}

const bodyR = e => (e.type === 'beetle' ? 104 : 58) * (e.sc || 1);
const markR = d => Math.max(d.reg.w, d.reg.h) * d.s * 0.71;
// the soft shadow a body lies in (the scene draws the same one under the bodies that are still bodies)
export function bodyAO(e, al) {
  const ao = (x, y, r, a, ex) => quad(R.blob, x, y, a, (r * ex) / 15, r / 15, 0, 0, 0, al, 0, 0, 0, 0);
  if (LYB[e.type]) {
    const K = e.type === 'beetle' ? 1.9 : 1,
      g = lyState(e).g,
      fa = e.fallA ?? 0;
    quad(
      R.blob,
      e.x - Math.cos(fa) * 3 * K,
      e.y - Math.sin(fa) * 3 * K,
      fa,
      (18 * K * (1 + 2 * g)) / 15,
      (18 * K) / 15,
      0,
      0,
      0,
      al * 1.15,
      0,
      0,
      0,
      0
    );
  } else ao(e.x, e.y, e.r * 1.7, e.fallA ?? 0, 1.5);
}
// the grass a body lies on is flat under it: tufts are drawn over the ground, so they would stand up through a painted body
function flatten(e) {
  const fa = e.fallA ?? e.a ?? 0,
    L = e.type === 'beetle' ? 34 : 18,
    r = e.type === 'beetle' ? 40 : 24;
  for (const k of [-1, 0, 1]) {
    const x = e.x - Math.cos(fa) * L * k,
      y = e.y - Math.sin(fa) * L * k,
      tx0 = Math.max(0, Math.floor((x - r) / TILE)),
      tx1 = Math.min(MW - 1, Math.floor((x + r) / TILE)),
      ty0 = Math.max(0, Math.floor((y - r) / TILE)),
      ty1 = Math.min(MH - 1, Math.floor((y + r + 10) / TILE)); // a tuft stands up from its root: one rooted just below the body covers it too
    for (let ty = ty0; ty <= ty1; ty++)
      for (let tx = tx0; tx <= tx1; tx++) {
        const c = grassCells[ty * MW + tx];
        if (c && c.length) grassCells[ty * MW + tx] = c.filter(g => d2(g.x, g.y - 6, x, y) > r * r);
      }
  }
}
function drawMark(d) {
  quad(d.reg, d.x, d.y, d.rot, d.s, d.s, d.tint[0], d.tint[1], d.tint[2], d.tint[3], 0, 0, 0, 0);
}
// one size of one ground texture: the patch as it is, the remains over it, and the result copied back
function pass(tex, size, level, att, box, draw, shade) {
  const s = size / WW,
    x0 = Math.max(0, Math.floor(box[0] * s)),
    y0 = Math.max(0, Math.floor(box[1] * s)),
    x1 = Math.min(size, Math.ceil(box[2] * s)),
    y1 = Math.min(size, Math.ceil(box[3] * s)),
    w = x1 - x0,
    h = y1 - y0;
  if (w <= 0 || h <= 0 || w > SZ || h > SZ) return;
  gl.viewport(0, 0, w, h);
  gl.uniform4f(P_SPRITE.u.uCam, x0 / s, y1 / s, w / s, -h / s); // upside down: row 0 of the target is the patch's top row, as in the texture
  GS.bTexA = GS.bTexE = GS.bTexN = null;
  GS.qn = 0;
  bset(texMapA, texMapE, texMapN, false);
  quad(MAPREG, WW / 2, WH / 2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0);
  flush();
  bset(GS.texAtlA, GS.texAtlE, GS.texAtlN, false);
  figCam([x0 / s, y1 / s, w / s, -h / s], SZ); // the 3D bodies paint in through the same camera, at this target's size
  draw(shade);
  figCam(null);
  flush();
  gl.readBuffer(att);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.copyTexSubImage2D(gl.TEXTURE_2D, level, x0, y0, 0, 0, w, h);
}

// once a frame, before anything else is drawn
export function bakeRemains() {
  GS.bakeT = GS.time;
  if (!texMapA || !GS.texAtlA || !R.blob) return;
  const now = performance.now();
  if (now - lastT < REMAINS.every) return;
  let bodies = GS.corpses.filter(e => e.bake && bodyStill(e)),
    marks = GS.decals.filter(d => d.bake);
  if (!bodies.length && !marks.length) return;
  lastT = now;
  if (!RT) RT = makeRT(SZ, SZ, [makeTex(SZ, SZ, false), makeTex(SZ, SZ, false), makeTex(SZ, SZ, false)]);
  const cx = GS.camX,
    cy = GS.camY,
    sh = GS.SHMODE,
    shs = GS.SHS;
  gl.bindFramebuffer(gl.FRAMEBUFFER, RT.fb);
  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  GS.curProg = P_SPRITE;
  gl.useProgram(P_SPRITE.p);
  gl.uniform1i(P_SPRITE.u.uAlb, 0);
  gl.uniform1i(P_SPRITE.u.uEmi, 1);
  gl.uniform1i(P_SPRITE.u.uNrm, 2);
  GS.SHMODE = false;
  setH(0);
  const gone = new Set(),
    H = REMAINS.box / 2,
    aSize = mapA.width;
  for (let n = 0; n < REMAINS.regions && (bodies.length || marks.length); n++) {
    const seed = bodies[0] || marks[0],
      bx = Math.min(WW - H, Math.max(H, seed.x)),
      by = Math.min(WH - H, Math.max(H, seed.y)),
      box = [bx - H, by - H, bx + H, by + H],
      inBox = (o, r) => o.x - r >= box[0] && o.x + r <= box[2] && o.y - r >= box[1] && o.y + r <= box[3];
    const B = bodies.filter(e => e === seed || inBox(e, bodyR(e))).sort((a, b) => a.y - b.y);
    // every mark under a body goes in with it, due or not: left as it was it would lie on top of the body it was under
    const M = GS.decals.filter(
      d =>
        !gone.has(d) &&
        markStays(d) &&
        !glowing(d) &&
        (d === seed || inBox(d, markR(d))) &&
        (d.bake || B.some(e => d2(d.x, d.y, e.x, e.y) < (bodyR(e) + markR(d)) ** 2))
    );
    const draw = shade => {
      for (const d of M) drawMark(d);
      for (const e of B) if (HUMAN[e.type]) bodyAO(e, 0.26);
      if (shade) {
        // the shadow it lies in: its own shapes in black, pushed off along the moonlight as the shadow pass does, and
        // under the body (drawn over it, a body lying flat came out black: its shadow barely moves off it)
        flush();
        GS.SHMODE = true;
        GS.SHS = REMAINS.shade;
        inkMode(true);
        for (const e of B) drawEnemy(e);
        figFlush();
        flush();
        inkMode(false);
        GS.SHMODE = false;
        setH(0);
      }
      for (const e of B) drawEnemy(e);
      figFlush();
    };
    GS.camX = box[0];
    GS.camY = box[1];
    cullBox(box);
    for (let lv = 0; lv < 3; lv++) pass(texMapA, aSize >> lv, lv, gl.COLOR_ATTACHMENT0, box, draw, true);
    pass(texMapN, NM, 0, gl.COLOR_ATTACHMENT2, box, draw, false);
    for (const e of B) {
      gone.add(e);
      pileKeep(e);
      flatten(e);
      lain(e); // (flies stay with it: life.js)
    }
    for (const d of M) gone.add(d);
    GS.baked.bodies += B.length;
    GS.baked.marks += M.length;
    bodies = bodies.filter(e => !gone.has(e));
    marks = marks.filter(d => !gone.has(d));
  }
  cullBox(null);
  GS.camX = cx;
  GS.camY = cy;
  GS.SHMODE = sh;
  GS.SHS = shs;
  GS.bTexA = GS.bTexE = GS.bTexN = null;
  GS.qn = 0;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (gone.size) {
    GS.corpses = GS.corpses.filter(e => !gone.has(e));
    GS.decals = GS.decals.filter(d => !gone.has(d));
  }
}
