/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, clamp, rand, randi } from '../core/util.js';
import { addLight, gfxPreset, quad, viewH, viewW } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { MH, MW, TILE, WH, WW, cars, houses, lamps, ttype } from './map.js';
import { noise, playS } from '../audio/audio.js';
import { cam } from '../game/state.js';
import { part, sparks } from '../render/effects.js';
import { lampK } from '../render/draw-player.js';
import { WHT, WST, WSTN, WVAR, WVN, isBlock, windows } from '../render/blocks.js';
import { LAMPV } from '../render/decor.js';
import { flame, hotSpots } from './fire.js';
export let WHOLES = new Map(),
  WBURN = new Float32Array(1);
export function resetWear() {
  WHOLES = new Map();
  WBURN = new Float32Array(MW * MH);
  GS.TDMG = new Float32Array(MW * MH);
  GS.grassFire = [];
}
export function wallHit(i, x, y) {
  const tx = i % MW,
    ty = (i / MW) | 0,
    cx = (tx + 0.5) * TILE,
    cy = (ty + 0.5) * TILE,
    H = WHT[i] || 0,
    st = WSTN[WST[i]];
  if (!H || st === 'fence') return;
  const front = y > cy + 8;
  let h;
  if (front) h = { f: 1, dx: clamp(x - cx, -17, 17), dy: 20 - rand(3, H - 3), r: rand(0, TAU), s: rand(0.8, 1.2) };
  else h = { f: 0, dx: clamp(x - cx, -18, 18), dy: clamp(y - cy, -18, 18) - H, r: rand(0, TAU), s: rand(0.8, 1.2) };
  let L = WHOLES.get(i);
  if (!L) WHOLES.set(i, (L = []));
  L.push(h);
  if (L.length > 10) L.shift();
  if (front) {
    const v = WVN[st] ? WVN[st][WVAR[i]] : '';
    if (v === 'win' && Math.abs(x - cx) < 14) {
      WVAR[i] = WVN[st].indexOf('brk');
      const w = windows.find(o => o.i === i);
      if (w) w.broke = true;
      for (let k = 0; k < 9; k++)
        part({
          k: 3,
          x: cx + rand(-9, 9),
          y: cy + 20 - H * 0.55,
          z: 6,
          vz: rand(40, 140),
          vx: rand(-60, 60),
          vy: rand(30, 140),
          life: rand(1, 1.8),
          max: 1.8,
          size: rand(0.3, 0.55),
          rot: rand(0, TAU),
          vr: rand(-12, 12),
          drag: 2,
          c: [0.5, 0.62, 0.7],
        });
      playS('shell', 0.4, 0.7, 0, 0);
      playS('shell', 0.3, 1.3, 0.04, 0);
      noise(0.25, 0.1, 6000, 3000, 'highpass');
    }
  }
}
export function scorchWalls(x, y, R0) {
  const r = R0 * 1.1;
  for (let ty = Math.floor((y - r) / TILE); ty <= Math.floor((y + r) / TILE); ty++)
    for (let tx = Math.floor((x - r) / TILE); tx <= Math.floor((x + r) / TILE); tx++) {
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
      const i = ty * MW + tx;
      if (!isBlock(ttype[i])) continue;
      const d = Math.hypot((tx + 0.5) * TILE - x, (ty + 0.5) * TILE - y);
      if (d < r) WBURN[i] = Math.min(1, WBURN[i] + (1 - d / r) * 0.9);
    }
}
/* ---------- lamp-cast character shadows ---------- */
export function lampShadows() {
  const who = [];
  if (GS.P && GS.state !== 'menu') who.push(GS.P);
  for (const e of GS.enemies)
    if (
      !e.dead &&
      !e.fly &&
      e.z < 10 &&
      e.emerge > 0.5 &&
      Math.abs(e.x - GS.camX - viewW / 2) < viewW * 0.6 + 80 &&
      Math.abs(e.y - GS.camY - viewH / 2) < viewH * 0.6 + 80
    )
      who.push(e);
  for (const L of lamps) {
    if (
      Math.abs(L.hx - GS.camX - viewW / 2) > viewW * 0.5 + 360 ||
      Math.abs(L.hy - GS.camY - viewH / 2) > viewH * 0.5 + 360
    )
      continue;
    const k = lampK(L);
    if (k < 0.3) continue;
    const RR = L.lantern ? 200 : 320;
    for (const o of who) {
      const dx = o.x - L.hx,
        dy = o.y - L.hy,
        d = Math.hypot(dx, dy);
      if (d > RR || d < 4) continue;
      const ux = dx / d,
        uy = dy / d,
        rr = o.r || 16,
        len = (clamp(d * (L.lantern ? 0.7 : 0.42), 10, 90) * rr) / 16,
        al = 0.8 * (1 - (d / RR) * (d / RR)) * k;
      quad(
        R.blob,
        o.x + ux * (len * 0.5 + rr * 0.3),
        o.y + uy * (len * 0.5 + rr * 0.3),
        Math.atan2(uy, ux),
        (len + rr) / 22,
        rr / 13,
        0,
        0,
        0,
        al,
        0,
        0,
        0,
        0
      );
    }
  }
}
/* ---------- atmosphere: ash & embers, burning buildings, the city beyond ---------- */
const ash = [];
export function updateAsh(dt) {
  const ashTarget = gfxPreset().ash;
  if (ash.length > ashTarget) ash.length = ashTarget;
  if (ash.length < ashTarget)
    for (let i = ash.length; i < ashTarget; i++)
      ash.push({
        x: GS.camX + rand(0, viewW),
        y: GS.camY + rand(0, viewH),
        z: rand(0, 200),
        ph: rand(0, TAU),
        s: rand(0.3, 0.7),
        em: Math.random() < 0.22,
      });
  const wind = 14 + Math.sin(GS.time * 0.2) * 10;
  for (const a of ash) {
    a.z -= dt * (a.em ? 10 : 18);
    a.x += (wind + Math.sin(GS.time * 1.3 + a.ph) * 12) * dt;
    a.y += (Math.cos(GS.time * 0.9 + a.ph) * 6 + (a.em ? -8 : 0)) * dt;
    if (
      a.z < 0 ||
      a.x < GS.camX - 60 ||
      a.x > GS.camX + viewW + 60 ||
      a.y < GS.camY - 260 ||
      a.y > GS.camY + viewH + 60
    ) {
      a.x = GS.camX + rand(-40, viewW);
      a.y = GS.camY + rand(-40, viewH + 40);
      a.z = rand(80, 200);
    }
  }
  for (const o of houses)
    if (
      o.burning &&
      Math.abs((o.x + o.w / 2) * TILE - cam.x - viewW / 2) < viewW &&
      Math.abs((o.y + o.h / 2) * TILE - cam.y - viewH / 2) < viewH
    ) {
      const RH = 32;
      for (const [u, v, k] of hotSpots(o, 3))
        if (Math.random() < dt * 26 * k) {
          const hx = (o.x + u * o.w) * TILE,
            hy = (o.y + v * o.h) * TILE - RH;
          flame(hx, hy, 1, 12 * k, rand(1.2, 1.6) * k);
          if (Math.random() < 0.18)
            part({
              k: 2,
              x: hx + rand(-6, 6),
              y: hy - 20,
              vx: wind * 1.8 + rand(-6, 6),
              vy: rand(-34, -18),
              life: rand(3.5, 5.5),
              max: 5.5,
              size: rand(1.1, 1.7),
              grow: 1.8,
              drag: 0.35,
              rot: rand(0, TAU),
              vr: rand(-0.5, 0.5),
              c: [0.11, 0.1, 0.1],
            });
        } // the roof burns at a few seats, each throwing up its own column of smoke
      if (Math.random() < dt * 5)
        part({
          k: 2,
          x: (o.x + rand(0.5, o.w - 0.5)) * TILE,
          y: (o.y + rand(0.3, o.h - 0.3)) * TILE - RH - 10,
          vx: wind * 1.6 + rand(-8, 8),
          vy: rand(-30, -14),
          life: rand(3, 5),
          max: 5,
          size: rand(1, 1.6),
          grow: 1.6,
          drag: 0.4,
          rot: rand(0, TAU),
          vr: rand(-0.6, 0.6),
          c: [0.16, 0.15, 0.15],
        });
      if (Math.random() < dt * 8)
        part({
          k: 0,
          x: (o.x + rand(0.4, o.w - 0.4)) * TILE,
          y: (o.y + rand(0.3, o.h - 0.3)) * TILE - RH,
          vx: wind + rand(-20, 20),
          vy: rand(-60, -25),
          life: rand(1, 2),
          max: 2,
          size: rand(0.08, 0.14),
          drag: 0.6,
          c: [1, 0.5, 0.15],
        });
    }
  for (const c of cars)
    if (!c.dead && !c.fire && !c.burnt && c.hp < c.max * 0.65 && Math.random() < dt * (c.hp < c.max * 0.45 ? 5 : 2)) {
      const fx = c.x + Math.cos(c.a) * 26,
        fy = c.y + Math.sin(c.a) * 26,
        dk = c.hp < c.max * 0.45;
      part({
        k: 2,
        x: fx + rand(-6, 6),
        y: fy - 14,
        vx: wind + rand(-6, 6),
        vy: rand(-26, -12),
        life: rand(1.6, 2.6),
        max: 2.6,
        size: rand(0.5, 0.8),
        grow: 1.4,
        drag: 0.6,
        rot: rand(0, TAU),
        vr: rand(-1, 1),
        c: dk ? [0.2, 0.2, 0.2] : [0.5, 0.5, 0.52],
      });
      if (dk && Math.random() < 0.15) sparks(fx, fy - 10, [1, 0.8, 0.4], 2, 120);
    }
}
export function drawAsh() {
  if (GS.ev === 'storm' || false) return;
  for (const a of ash)
    if (!a.em) {
      const f = Math.min(1, a.z / 40);
      quad(R.pixel, a.x, a.y - a.z * 0.5, a.ph + GS.time * 0.8, a.s, a.s * 0.6, 0.6, 0.58, 0.56, 0.75 * f, 0, 0, 0, 0);
    }
}
export function drawAshGlow() {
  if (GS.ev === 'storm' || false) return;
  for (const a of ash)
    if (a.em) {
      const tw = 0.6 + Math.sin(GS.time * 7 + a.ph * 5) * 0.4,
        f = Math.min(1, a.z / 40);
      quad(
        R.glow,
        a.x,
        a.y - a.z * 0.5,
        0,
        0.06 + a.s * 0.04,
        0.06 + a.s * 0.04,
        0,
        0,
        0,
        f,
        1.6 * tw,
        0.6 * tw,
        0.15 * tw,
        0
      );
    }
}
export function shaftGlow() {
  const fd = Math.max(
    GS.FOGB,
    GS.ev === 'fog' ? 1 : GS.ev === 'storm' ? 0.75 : GS.RUN.district === 'cemetery' ? 0.6 : 0.35
  );
  for (const L of lamps) {
    const k = lampK(L);
    if (k < 0.05) continue;
    const lh = LAMPV(L) * 2;
    if (
      Math.abs(L.hx - GS.camX - viewW / 2) > viewW * 0.5 + 200 ||
      Math.abs(L.hy - GS.camY - viewH / 2) > viewH * 0.5 + 200
    )
      continue;
    quad(
      R.glow,
      L.hx,
      L.hy - lh * 0.5,
      0,
      L.lantern ? 0.6 : 0.9,
      lh / 34,
      0,
      0,
      0,
      1,
      0.16 * k * fd,
      0.12 * k * fd,
      0.07 * k * fd,
      0
    );
    quad(R.glow, L.hx, L.hy - lh, 0, 2.2, 2.2, 0, 0, 0, 1, 0.07 * k * fd, 0.05 * k * fd, 0.03 * k * fd, 0);
  }
  if (GS.P && GS.state !== 'over' && GS.state !== 'menu') {
    const c = Math.cos(GS.P.aimA),
      s = Math.sin(GS.P.aimA);
    for (let i = 1; i <= 4; i++) {
      const d = i * 55;
      quad(
        R.glow,
        GS.P.x + c * d,
        GS.P.y + s * d - 8,
        GS.P.aimA,
        0.5 + i * 0.35,
        0.35 + i * 0.22,
        0,
        0,
        0,
        1,
        0.05 * fd,
        0.048 * fd,
        0.04 * fd,
        0
      );
    }
  }
  for (const o of houses)
    if (o.burning) {
      const fk = 0.8 + Math.sin(GS.time * 9 + o.x) * 0.2;
      quad(
        R.glow,
        (o.x + o.w / 2) * TILE,
        (o.y + o.h / 2) * TILE - 40,
        0,
        o.w * 0.9,
        o.h * 0.9,
        0,
        0,
        0,
        1,
        0.35 * fk,
        0.14 * fk,
        0.04 * fk,
        0
      );
    }
}
let FARF = [];
export function setupAtmos() {
  for (const o of houses) o.burning = false;
  const cand = houses.filter(
    o =>
      o.roof &&
      o.w >= 3 &&
      o.h >= 3 &&
      Math.hypot((o.x + o.w / 2) * TILE - WW / 2, (o.y + o.h / 2) * TILE - WH / 2) > 500
  );
  const n = GS.RUN.district === 'cemetery' ? 0 : 1 + (Math.random() < 0.4 ? 1 : 0);
  for (let i = 0; i < n && cand.length; i++) cand.splice(randi(0, cand.length - 1), 1)[0].burning = true;
  FARF = [];
  for (let i = 0; i < 5; i++) {
    const side = randi(0, 3),
      t = rand(0.15, 0.85);
    FARF.push({
      x: side === 0 ? -80 : side === 1 ? WW + 80 : t * WW,
      y: side === 2 ? -80 : side === 3 ? WH + 80 : t * WH,
      ph: rand(0, 50),
    });
  }
}
export function atmosLights() {
  for (const o of houses)
    if (o.burning) {
      const fk = 0.75 + Math.sin(GS.time * 13 + o.y) * 0.15 + Math.sin(GS.time * 5.1 + o.x) * 0.1;
      addLight((o.x + o.w / 2) * TILE, (o.y + o.h) * TILE + 20, 300 + o.w * 40, 1.15 * fk, 0.5 * fk, 0.14 * fk);
    }
  for (const f of FARF) {
    const fk = 0.7 + Math.sin(GS.time * 2.3 + f.ph) * 0.2 + Math.sin(GS.time * 7.7 + f.ph) * 0.1;
    addLight(f.x, f.y, 700, 0.55 * fk, 0.22 * fk, 0.06 * fk);
  }
}

/* ---------- physics: ragdolls, things you can kick around, destruction, grass fires, blood and smoke ---------- */
