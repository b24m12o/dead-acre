/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { clamp, damp } from '../core/util.js';
import { opt } from '../core/settings.js';
import { VH, VW, ZOOM, viewH, viewW } from './sprites.js';
import { WH, WW } from '../world/map.js';
import { cam } from '../game/state.js';
import { mouse } from '../core/input.js';
/* =====================================================================
   Render
   ===================================================================== */
export function updateCamera(dt) {
  let tlx = 0,
    tly = 0;
  if (GS.state === 'play' && opt.lean) {
    if (mouse.seen) {
      tlx = clamp(((mouse.x - VW / 2) / ZOOM) * 0.12, -70, 70);
      tly = clamp(((mouse.y - VH / 2) / ZOOM) * 0.12, -55, 55);
    } else {
      tlx = Math.cos(GS.P.aimA) * 45;
      tly = Math.sin(GS.P.aimA) * 45;
    }
  }
  if (cam.peek && GS.state === 'play') {
    cam.peek.t -= dt;
    if (cam.peek.t <= 0) cam.peek = null;
    else {
      const dx = cam.peek.x - GS.P.x,
        dy = cam.peek.y - GS.P.y,
        d = Math.hypot(dx, dy) || 1,
        m = Math.min(d * 0.62, 340) / d;
      tlx += dx * m;
      tly += dy * m;
    }
  } // a boss arriving pulls the eye toward it for a moment
  cam.lx += (tlx - cam.lx) * damp(2.2, dt);
  cam.ly += (tly - cam.ly) * damp(2.2, dt);
  const tx = GS.P.x + cam.lx - viewW / 2,
    ty = GS.P.y + cam.ly - viewH / 2;
  const sd = (cur, tgt, v) => {
    const st = 0.16,
      om = 2 / st,
      x = om * dt,
      ex = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const ch = cur - tgt,
      tmp = (cam[v] + om * ch) * dt;
    cam[v] = (cam[v] - om * tmp) * ex;
    return tgt + (ch + tmp) * ex;
  };
  cam.x = sd(cam.x, tx, 'vx');
  cam.y = sd(cam.y, ty, 'vy');
  cam.x = clamp(cam.x, 0, WW - viewW);
  cam.y = clamp(cam.y, 0, WH - viewH);
}
export function shakeOff() {
  const t2 = GS.trauma * GS.trauma,
    m = 9 * t2;
  return [
    m * (Math.sin(GS.time * 47) * 0.6 + Math.sin(GS.time * 29 + 1.3) * 0.4),
    m * (Math.sin(GS.time * 41 + 2.1) * 0.6 + Math.sin(GS.time * 23) * 0.4),
  ];
}
