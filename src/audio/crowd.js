/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The crowd: a hundred of the dead should sound like a hundred. The more of them are up and near you, the more of
// the recorded groans run at once, slowed down and low-passed into a moan that comes from where they are. Ten or
// fewer: silence (each one still groans on its own, sfx.js). Eighty or more: the full roar. Effects volume and mute
// apply; it stops in menus, on pause and at dawn.
import { GS } from '../core/gs.js';
import { clamp, d2, rand } from '../core/util.js';
import { AC, SBV, sfxBus, sfxRev } from './audio.js';
import { viewW } from '../render/sprites.js';

export const CROWD = { near: 900, lo: 10, hi: 80, gain: 0.22, slew: 1 / 1.5, maxTakes: 7 };
GS.crowd = { level: 0, n: 0, takes: 0 };
let B = null,
  acc = 0;
function bus() {
  if (B && B.ac === AC && B.out === sfxBus) return B;
  const g = AC.createGain(),
    lp = AC.createBiquadFilter();
  g.gain.value = 0;
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  lp.Q.value = 0.4;
  g.connect(lp);
  lp.connect(sfxBus);
  if (sfxRev) {
    const r = AC.createGain();
    r.gain.value = 0.35;
    lp.connect(r);
    r.connect(sfxRev);
  } // a little room round it
  B = { ac: AC, out: sfxBus, g };
  return B;
}
// how many of the dead are up and within earshot, and the level that makes
export function crowdCount() {
  if (!GS.P) return { n: 0, near: [] };
  const P = GS.P,
    R2 = CROWD.near * CROWD.near,
    near = [];
  for (const e of GS.enemies) if (!e.dead && e.emerge >= 1 && !e.dormant && d2(e.x, e.y, P.x, P.y) < R2) near.push(e);
  return { n: near.length, near };
}
export const crowdTarget = n => clamp((n - CROWD.lo) / (CROWD.hi - CROWD.lo), 0, 1);
export function tickCrowd(dt) {
  const C = GS.crowd,
    on = GS.state === 'play' && GS.nightLive && !GS.nightDone && !GS.RUN?.tut;
  if (!on) {
    C.level = 0;
    acc = 0;
    if (AC && B && B.ac === AC) B.g.gain.setTargetAtTime(0, AC.currentTime, 0.12);
    return;
  }
  const { n, near } = crowdCount(),
    want = crowdTarget(n),
    step = CROWD.slew * dt;
  C.level = C.level < want ? Math.min(want, C.level + step) : Math.max(want, C.level - step); // a swell over 1.5 s, either way
  if (!AC || !sfxBus) return;
  const b = bus();
  b.g.gain.setTargetAtTime(CROWD.gain * C.level, AC.currentTime, 0.35);
  if (C.level < 0.02 || !near.length) return;
  acc += (0.5 + 5 * C.level) * dt;
  const v = SBV && SBV.zgroan;
  while (acc >= 1) {
    acc -= 1;
    if (C.n >= CROWD.maxTakes || !v || !v.length) continue;
    const e = near[(Math.random() * near.length) | 0],
      dx = e.x - GS.P.x,
      d = Math.hypot(dx, e.y - GS.P.y),
      src = AC.createBufferSource(),
      g = AC.createGain();
    src.buffer = v[(Math.random() * v.length) | 0];
    src.playbackRate.value = rand(0.6, 0.85); // slowed: a low moan, not one voice
    g.gain.value = clamp(1.2 - d / CROWD.near, 0.25, 1) * rand(0.7, 1);
    src.connect(g);
    let o = g;
    if (AC.createStereoPanner) {
      const pn = AC.createStereoPanner();
      pn.pan.value = clamp(dx / (viewW * 0.55), -0.85, 0.85);
      g.connect(pn);
      o = pn;
    } // from where they are
    o.connect(b.g);
    C.n++;
    C.takes++;
    src.onended = () => {
      C.n = Math.max(0, C.n - 1);
    };
    src.start(AC.currentTime + rand(0, 0.12));
  }
}
