/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { TAU, d2, lerp, rand } from '../core/util.js';
import { opt } from '../core/settings.js';
import { ui } from '../render/gl.js';
import { VH, VW, quad, setH, viewH, viewW } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { AC, noise } from '../audio/audio.js';
import { ring, sparks } from '../render/effects.js';
import { cars } from './map.js';
import { TILT } from '../core/scale.js';
import { sfx } from '../audio/sfx.js';
import { placeLook } from './places.js';
import { NIGHT } from '../render/draw-player.js';
let DAWNV = 0;
export const WXV = [0, 0, 0, 1];
export function updateWeather(dt) {
  {
    const inRun = GS.state !== 'menu',
      t = [
        inRun && GS.ev === 'fog' ? 1 : GS.FOGB * 0.6,
        inRun && GS.ev === 'blood' ? 1 : 0,
        inRun && GS.ev === 'storm' ? 1 : 0,
        1 - DAWNV,
      ];
    for (let i = 0; i < 4; i++) WXV[i] += (t[i] - WXV[i]) * Math.min(1, dt * 0.8);
  }
  if (GS.ev === 'storm') {
    GS.lightT -= dt;
    if (GS.lightT <= 0) {
      GS.lightT = rand(5, 12);
      GS.lightning = 1;
      if (GS.state === 'play' && GS.P)
        for (const z of GS.enemies)
          if (!z.dead && d2(z.x, z.y, GS.P.x, GS.P.y) < 900 * 900) {
            if (!(z.aw > 0)) z.wokeT = GS.time;
            z.aw = Math.max(z.aw || 0, 4);
          } // every flash shows you to the whole street
      GS.later.push({
        t: rand(0.4, 1.6),
        fn: () => {
          if (!AC) return;
          noise(2.2, 0.35, 260, 40, 'lowpass');
          noise(1.2, 0.18, 900, 120, 'lowpass', 0.05);
        },
      });
    }
    if (GS.state === 'play' && Math.random() < dt * 30) {
      const x = GS.camX + rand(0, viewW),
        y = GS.camY + rand(0, viewH);
      ring(x, y, 1, 8, 0.25, [0.5, 0.55, 0.65], 0.35);
    }
    if (GS.state === 'play') rainOnCars(dt);
  }
  if (GS.state === 'play' && GS.pud > 0.25) splashing(dt);
  GS.lightning = Math.max(0, GS.lightning - dt * 5);
  const base = { sun: [0.29, 0.345, 0.52], sky: [0.225, 0.252, 0.37] }; // moonlight: cold and low, enough to read the ground by
  const look = placeLook(); // each stop on the road tints the night its own way (places.js)
  let sun = base.sun.map((v, i) => v * look.sun[i]),
    sky = base.sky.map((v, i) => v * look.sky[i]);
  if (GS.ev === 'blood') {
    sun = [0.42, 0.2, 0.21];
    sky = [0.25, 0.18, 0.21];
    if (GS.RUN.district === 'cemetery') {
      sun = sun.map((v, i) => lerp(v, base.sun[i], 0.4));
      sky = sky.map((v, i) => lerp(v, base.sky[i], 0.4));
    }
  } /* red, but you can still read the ground; on the hill the mist already thickens it, so less */
  if (GS.ev === 'blackout') {
    sun = sun.map(v => v * 0.82);
    sky = sky.map(v => v * 0.86);
  }
  if (GS.ev === 'fog') {
    sky = [0.3, 0.32, 0.38];
  }
  GS.FOGB += (GS.FOGBT - GS.FOGB) * Math.min(1, dt * 0.6);
  if (GS.FOGB > 0.01 && GS.ev !== 'fog') sky = sky.map((v, i) => lerp(v, [0.3, 0.32, 0.38][i], GS.FOGB)); // the Gravekeeper's fog rolls in and out
  if (GS.ev === 'storm') {
    sun = sun.map(v => v * 0.85);
  }
  {
    const want = GS.state === 'play' && GS.nightDone && !GS.queue.length && !GS.enemies.length && !GS.evac ? 1 : 0;
    DAWNV += (want - DAWNV) * Math.min(1, dt * (want ? 0.5 : 1.2)); // between nights the light warms toward sunrise
    if (DAWNV > 0.002) {
      sun = sun.map((v, i) => lerp(v, [0.8, 0.54, 0.42][i], DAWNV * 0.65));
      sky = sky.map((v, i) => lerp(v, [0.44, 0.36, 0.38][i], DAWNV * 0.55));
    }
  }

  const fl =
    GS.lightning > 0
      ? opt.flash
        ? GS.lightning * 0.3
        : Math.sin(GS.lightning * 30) > 0
          ? GS.lightning
          : GS.lightning * 0.3
      : 0;
  NIGHT.sun = sun.map((v, i) => v + fl * [1.2, 1.25, 1.4][i]);
  NIGHT.sky = sky.map((v, i) => v + fl * [0.6, 0.65, 0.8][i]);
}
// rain on the cars: drops bursting on the roofs and bonnets, a little spray off each (a car is the street's size:
// its roof about one and a half metres up, its bonnet and boot nearer one)
function rainOnCars(dt) {
  for (const c of cars) {
    if (c.dead || c.truck || c.tanker) continue;
    if (c.x < GS.camX - 60 || c.x > GS.camX + viewW + 60 || c.y < GS.camY - 60 || c.y > GS.camY + viewH + 60) continue;
    if (Math.random() > dt * 22) continue;
    const u = rand(-27, 27),
      v = rand(-12, 12),
      roof = Math.abs(u + 4) < 11 && Math.abs(v) < 9.5,
      z = (roof ? 29 : 19) * (c.burnt ? 0.85 : 1),
      ca = Math.cos(c.a),
      sa = Math.sin(c.a),
      x = c.x + ca * u - sa * v,
      y = c.y + sa * u + ca * v - z * TILT;
    ring(x, y, 1, 8, 0.22, [0.62, 0.66, 0.74], 0.6);
    sparks(x, y, [0.7, 0.75, 0.85], 3, 34, -Math.PI / 2, 1.2);
  }
}
// wading through standing water: a splash at each step, rings opening round the feet, and the sound of it (yours and
// your people's always, the dead's when they're near you)
export const inPuddle = (x, y) => {
  if (!(GS.pud > 0.25)) return false;
  for (const q of GS.puddles || []) {
    const s = q.s * (0.55 + 0.45 * GS.pud),
      dx = (x - q.x) / (20 * s + 6),
      dy = (y - q.y) / (11 * s + 4);
    if (dx * dx + dy * dy < 1) return true;
  }
  return false;
};
function splashing(dt) {
  const P = GS.P,
    seen = o => Math.abs(o.x - GS.camX - viewW / 2) < viewW * 0.6 && Math.abs(o.y - GS.camY - viewH / 2) < viewH * 0.6;
  const wade = (o, loud) => {
    const sp = Math.hypot(o.vx || 0, o.vy || 0);
    if (sp < 25 || !seen(o)) return;
    o._wd = (o._wd || 0) + sp * dt;
    if (o._wd < 20) return; // (a step, about)
    o._wd = 0;
    if (!inPuddle(o.x, o.y)) return;
    ring(o.x, o.y, 2, 12, 0.4, [0.55, 0.6, 0.7], 0.7);
    sparks(o.x, o.y - 2, [0.6, 0.65, 0.75], 4 + (sp > 120 ? 3 : 0), 40 + sp * 0.25, -Math.PI / 2, 1.1);
    if (loud) sfx.splash(o.x, o.y, Math.min(1, sp / 160));
  };
  if (P && !P.ride) wade(P, true);
  for (const b of GS.buddies) if (!b.gone) wade(b, true);
  for (const e of GS.enemies)
    if (!e.dead && !e.fly && !(e.z > 2)) wade(e, P && Math.abs(e.x - P.x) < 260 && Math.abs(e.y - P.y) < 200);
}
export function drawRainUI() {
  if (GS.ev !== 'storm' || GS.state === 'menu') return;
  ui.save();
  ui.strokeStyle = 'rgba(190,205,230,0.28)';
  ui.lineWidth = 1.2;
  ui.beginPath();
  const n = 140,
    t = GS.time * 1.6;
  for (let i = 0; i < n; i++) {
    const sx = ((i * 97.13 + t * 380 + i * i * 0.37) % (VW + 200)) - 100,
      sy = ((i * 53.7 + t * 1300 * (0.8 + (i % 7) * 0.05)) % (VH + 60)) - 30;
    ui.moveTo(sx, sy);
    ui.lineTo(sx - 6, sy + 22);
  }
  ui.stroke();
  ui.restore();
}
// k: the share of it drawn here. Most of it lies on the ground under the figures (drawn before them); a thin veil
// goes over everything, so the mist hangs in the air without hiding the people in it
export function drawFog(k = 1) {
  const dense = k * Math.max(GS.FOGB, GS.ev === 'fog' ? 1 : GS.RUN.district === 'cemetery' ? 0.45 : 0.16);
  if (!dense) return;
  setH(0);
  for (let i = 0; i < 9; i++) {
    const ox = ((GS.time * (8 + i * 2) + i * 517) % (viewW + 700)) - 350,
      oy = ((i * 211 + Math.sin(GS.time * 0.1 + i) * 60) % (viewH + 300)) - 150;
    quad(
      R.cloud,
      GS.camX + ox,
      GS.camY + oy,
      i,
      2.6 + (i % 3) * 0.6,
      1.8,
      0.62,
      0.66,
      0.72,
      0.28 * dense,
      0.05 * dense,
      0.055 * dense,
      0.07 * dense,
      0
    );
  }
}
/* ---------- objective + evac drawing (casters) ---------- */

// standing water: it gathers in the dips while it rains and lingers a night or two after. A puddle is dark, glassy
// (it takes the street lamps' reflections from the lighting pass) and, while it rains, ringed with drops
export function drawPuddles() {
  const want = Math.max(GS.ev === 'storm' && GS.state !== 'menu' ? 1 : 0, (GS.RUN && GS.RUN.wet) || 0);
  GS.pud = (GS.pud || 0) + (want - (GS.pud || 0)) * (want > (GS.pud || 0) ? 0.004 : 0.02);
  if (GS.pud < 0.02 || !GS.puddles) return;
  const rain = GS.ev === 'storm',
    x0 = GS.camX - 80,
    x1 = GS.camX + viewW + 80,
    y0 = GS.camY - 80,
    y1 = GS.camY + viewH + 80;
  setH(0);
  for (const q of GS.puddles) {
    if (q.x < x0 || q.x > x1 || q.y < y0 || q.y > y1) continue;
    const k = GS.pud * (q.mud ? 0.85 : 1),
      s = q.s * (0.55 + 0.45 * GS.pud); // they spread as they fill
    quad(
      R['puddle' + q.v],
      q.x,
      q.y,
      q.a,
      s,
      s,
      q.mud ? 0.9 : 1,
      q.mud ? 0.82 : 1,
      q.mud ? 0.7 : 1,
      0.88 * k,
      0,
      0,
      0,
      0
    );
    if (rain && Math.random() < 0.5 * q.s) {
      const r = rand(0, 1),
        t = rand(0, TAU);
      GS.drips.push({
        x: q.x + Math.cos(t) * r * 22 * s * Math.abs(Math.cos(q.a)) + Math.cos(t) * r * 8,
        y: q.y + Math.sin(t) * r * 12 * s,
        t: 0,
      });
    }
  }
  if (GS.drips.length > 160) GS.drips.splice(0, GS.drips.length - 160);
  for (const d of GS.drips) {
    d.t += 1 / 60;
    const f = d.t / 0.45;
    if (f < 1) {
      const g = 0.32 * (1 - f) * GS.pud;
      quad(R.ring, d.x, d.y, 0, 0.04 + f * 0.1, (0.04 + f * 0.1) * 0.6, 0.8, 0.85, 0.95, g, g * 0.8, g * 0.85, g, 0);
    }
  }
  GS.drips = GS.drips.filter(d => d.t < 0.45); // a drop lands: a ring opens and fades
}
GS.drips = [];
