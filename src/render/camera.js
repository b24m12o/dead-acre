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
// a shot nudges the view back along the barrel and it settles in well under a tenth of a second: the gun's punch
// felt in the frame, not a shake (it follows the Screen shake setting)
const KICK = {
  pistol: 1.4,
  smg: 1.1,
  rifle: 1.6,
  lmg: 1.9,
  shotgun: 3.6,
  auto: 2.6,
  hunter: 4,
  lever: 3.2,
  launcher: 3,
};
export function camKick(a, g) {
  if (!opt.shake) return;
  const k = KICK[g] || 1.5;
  GS.kick = { x: -Math.cos(a) * k, y: -Math.sin(a) * k, t: GS.time };
}
export function shakeOff() {
  const t2 = GS.trauma * GS.trauma,
    m = 9 * t2,
    K = GS.kick,
    kf = K ? Math.exp(-Math.max(0, GS.time - K.t) * 32) : 0;
  return [
    m * (Math.sin(GS.time * 47) * 0.6 + Math.sin(GS.time * 29 + 1.3) * 0.4) + (K ? K.x * kf : 0),
    m * (Math.sin(GS.time * 41 + 2.1) * 0.6 + Math.sin(GS.time * 23) * 0.4) + (K ? K.y * kf : 0),
  ];
}
