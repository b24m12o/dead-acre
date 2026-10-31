/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { clamp, d2, rand, randi } from '../core/util.js';
import { MH, MW, TILE, cars, grid } from '../world/map.js';
import { dijk, los } from '../world/nav.js';
import { AC, noise, sfxBus, spat, thr } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { distort, ring } from '../render/effects.js';
import { hurtPlayer } from './combat.js';
import { RADIO, radio } from '../audio/radio.js';
/* =====================================================================
   Campaign: districts, 15 nights to evac, Infection levels, objectives,
   events, challenges and outfits
   ===================================================================== */
/* ======================= Campaign: chapters on a route map, missions generated on the fly ======================= */
export let NOISE = { x: 0, y: 0, t: -9 }; // where the last gunshot rang out: the dead turn toward it
/* Noise: the dead amble until something tells them where you are. A gunshot wakes every zombie within earshot of that gun,
   explosions wake half the map, and a car alarm pulls the crowd to the car instead of to you. */
export const SUPP = { pistol: 1, smg: 1, rifle: 1 };
export const LOUD = {
  pistol: 620,
  smg: 700,
  shotgun: 900,
  rifle: 980,
  auto: 960,
  hunter: 1400,
  lmg: 1100,
  lever: 1250,
  launcher: 900,
};
let lastRingT = -9;
GS.noiseRings = [];
GS.loudSaid = false;
GS.alarmSaid = false;
export function makeNoise(x, y, r, soft) {
  if (GS.ev === 'storm') r *= 0.6; // the rain drowns shots out
  NOISE.x = x;
  NOISE.y = y;
  NOISE.t = GS.time;
  NOISE.r = r;
  if (GS.time - lastRingT > 0.3 || r > 1000) {
    lastRingT = GS.time;
    GS.noiseRings.push({ x, y, r, t0: GS.time });
    if (GS.noiseRings.length > 6) GS.noiseRings.shift();
  }
  let woke = 0,
    hordeOff = 0;
  const r2 = r * r;
  for (const e of GS.enemies) {
    if (e.dead || d2(e.x, e.y, x, y) > r2) continue;
    if (e.lure && e.lure.horde && d2(e.x, e.y, x, y) > 560 * 560) {
      e.lure.heard = { x, y };
      continue;
    } // far off, a roaming horde only turns toward the sound; up close it comes for you
    if (
      e.lure &&
      e.lure.alarm > 0 &&
      !e.lure.horde &&
      !e.lure.noise &&
      (soft || d2(e.x, e.y, e.lure.x, e.lure.y) < 260 * 260)
    )
      continue; // right beside a screaming car they can't hear you (a little alarm clock doesn't drown a gun out)
    if (e.horde && e.lure && e.lure.noise) hordeOff++;
    e.lure = null;
    e.heardT = GS.time; // a clock already ringing won't take this one back: you are louder
    if (!(e.aw > 0)) {
      woke++;
      e.wokeT = GS.time;
      if (woke < 3 && thr('wake', 260)) sfx.groan(e.x, e.y);
    }
    e.aw = Math.max(e.aw || 0, 8);
  }
  if (hordeOff >= 3)
    for (const e of GS.enemies)
      if (e.horde && !e.dead && e.lure && e.lure.noise) {
        e.lure = null;
        e.heardT = GS.time;
        e.aw = Math.max(e.aw || 0, 8);
      } // a horde moves as one: when the ones that heard you turn off the clock, the rest of it follows them
  if (woke >= 6 && r >= 900 && !GS.loudSaid && GS.state === 'play' && GS.wave > 0) {
    GS.loudSaid = true;
    radio(RADIO.loud);
  }
}
export function startAlarm(c) {
  c.alarm = 15;
  c.alarmUsed = true;
  c.sirT = 0;
  c.alAge = 0;
  c.ph = randi(0, 2);
  const seeds = [],
    ctx = Math.floor(c.x / TILE),
    cty = Math.floor(c.y / TILE);
  for (let j = -2; j <= 2; j++)
    for (let i = -2; i <= 2; i++) {
      const tx = ctx + i,
        ty = cty + j;
      if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
      const t = ty * MW + tx;
      if (!grid[t]) seeds.push(t);
    }
  c.flow = c.flow || new Uint16Array(MW * MH);
  dijk(c.flow, seeds, false);
  GS.noiseRings.push({ x: c.x, y: c.y, r: 1000, t0: GS.time, alarm: true });
  for (const e of GS.enemies) {
    if (e.dead || e.big || e.fly || e.type === 'flower' || e.type === 'wasp' || d2(e.x, e.y, c.x, c.y) > 1000 * 1000)
      continue;
    if (e.los && d2(e.x, e.y, GS.P.x, GS.P.y) < 230 * 230) continue; // already on you
    e.lure = c;
    e.aw = 0;
    if (e.st !== 'jump') {
      e.st = 'move';
      e.stT = 1;
    }
    e.swell = 0;
    e.charging = 0;
  }
  if (!GS.alarmSaid) {
    GS.alarmSaid = true;
    radio(RADIO.alarm);
  }
}
export function alarmNote(f0, f1, dur, type, vol, bus, delay = 0) {
  // a held note: alarms sustain, they don't chirp
  const t = AC.currentTime + delay,
    o = AC.createOscillator(),
    g = AC.createGain(),
    f = AC.createBiquadFilter();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.linearRampToValueAtTime(f1, t + dur * 0.9);
  f.type = 'lowpass';
  f.frequency.value = 2400;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.012);
  g.gain.setValueAtTime(vol, t + dur - 0.03);
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(f);
  f.connect(g);
  g.connect(bus || sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}
export function alarmTick(dt) {
  const on = [];
  for (const c of cars) {
    if (!(c.alarm > 0)) continue;
    c.alarm -= dt;
    if (c.dead) {
      c.alarm = 0;
      continue;
    }
    c.alAge = (c.alAge || 0) + dt;
    on.push(c);
  }
  if (!AC || !GS.P || !on.length) return;
  if (on.length > 2) on.sort((a, b) => d2(a.x, a.y, GS.P.x, GS.P.y) - d2(b.x, b.y, GS.P.x, GS.P.y));
  for (let i = 0; i < Math.min(2, on.length); i++) {
    // only the two nearest are heard; the rest would be mush
    const c = on[i];
    c.sirT = (c.sirT || 0) - dt;
    if (c.sirT > 0) continue;
    const dd = Math.hypot(c.x - GS.P.x, c.y - GS.P.y),
      v = 0.05 * clamp(1 - dd / 1600, 0.12, 1),
      b = spat(c.x, c.y),
      pat = Math.floor(c.alAge / 3 + (c.ph || 0)) % 3; // the alarm cycles its patterns every 3 s, like the real thing
    if (pat === 0) {
      c.sirT = 0.46;
      alarmNote(640, 1180, 0.42, 'square', v, b);
      alarmNote(652, 1190, 0.42, 'sawtooth', v * 0.3, b);
    } else if (pat === 1) {
      c.sirT = 0.36;
      alarmNote(850, 850, 0.17, 'square', v, b);
      alarmNote(650, 650, 0.17, 'square', v, b, 0.18);
    } else {
      c.sirT = 0.5;
      alarmNote(415, 415, 0.25, 'sawtooth', v * 0.9, b);
      alarmNote(520, 520, 0.25, 'sawtooth', v * 0.9, b);
    }
  }
}
export function poundCar(e, c, dt) {
  // the lured crowd beats on the car
  e.poundT = (e.poundT ?? rand(0, 0.8)) - dt;
  if (e.poundT > 0) return;
  e.poundT = rand(0.6, 1.2);
  const a = Math.atan2(c.y - e.y, c.x - e.x);
  c.jvx = (c.jvx || 0) + Math.cos(a) * rand(10, 22);
  c.jvy = (c.jvy || 0) + Math.sin(a) * rand(10, 22);
  c.jva = (c.jva || 0) + rand(-0.02, 0.02);
  e.lunge = 0.42;
  if (c.hp > c.max * 0.35) c.hp -= 0.6;
  if (thr('pound', 120)) {
    const dd = Math.hypot(c.x - GS.P.x, c.y - GS.P.y),
      v = clamp(1 - dd / 900, 0, 1);
    if (v > 0) noise(0.09, 0.22 * v, 520, 110, 'lowpass');
  }
}
export function screamAt(e) {
  // a shriek: dazes you if you're in front of it and close, and calls every zombie within earshot
  sfx.scream(e.x, e.y);
  e.squash = 0.2;
  distort(e.x, e.y, 0.012, 0.6, 0.5);
  for (let i = 0; i < 3; i++)
    GS.later.push({ t: i * 0.09, fn: () => ring(e.x, e.y, 14, 260 + i * 40, 0.55, [0.32, 0.3, 0.33], 0.45) });
  const d = Math.hypot(GS.P.x - e.x, GS.P.y - e.y);
  if (GS.state === 'play' && d < 330 && los(e.x, e.y, GS.P.x, GS.P.y)) {
    GS.P.daze = Math.max(GS.P.daze || 0, 1.9 - d / 330);
    GS.chroma = Math.max(GS.chroma, 0.01);
    if (d < 120) hurtPlayer(6 * (1 + 0.04 * GS.wave), e.x, e.y);
  }
  for (const o of GS.enemies)
    if (!o.dead && o !== e && d2(o.x, o.y, e.x, e.y) < 420 * 420) {
      o.frenzy = 3;
    }
}
