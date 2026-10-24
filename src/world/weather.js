/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { d2, lerp, rand } from '../core/util.js';
import { opt } from '../core/settings.js';
import { ui } from '../render/gl.js';
import { VH, VW, quad, viewH, viewW } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { AC, noise } from '../audio/audio.js';
import { ring } from '../render/effects.js';
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
          }
      /* every flash shows you to the whole street */ GS.later.push({
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
  }
  GS.lightning = Math.max(0, GS.lightning - dt * 5);
  const base = { sun: [0.29, 0.345, 0.52], sky: [0.225, 0.252, 0.37] }; // moonlight: cold and low, enough to read the ground by
  let sun = base.sun.slice(),
    sky = base.sky.slice();
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
export function drawFog() {
  const dense = Math.max(GS.FOGB, GS.ev === 'fog' ? 1 : GS.RUN.district === 'cemetery' ? 0.45 : 0.16);
  if (!dense) return;
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
