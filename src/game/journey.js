/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The campaign: fifteen nights on the road, five in each place. Dead Acre first, where you keep relay 9 on the air
// for the convoy; then Route 9, holding the road behind the trucks; then Hollow Hill, where the chopper can land at
// the hospital. After the boss at the end of a leg the dawn doesn't run out: a convoy truck pulls up, and you walk
// to it (the dead that heard the fight start drifting in) and climb aboard. The run goes with you, gear, guns,
// survivors and all, and the next dawn starts in the new place.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, clamp, d2, rand } from '../core/util.js';
import { MW, RY, TILE, WW, isWall } from '../world/map.js';
import { addLight } from '../render/sprites.js';
import { tone, noise } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { showStreak } from '../ui/callouts.js';
import { floatText } from '../render/effects.js';
import { makeEnemy } from '../actors/enemies.js';
import { freeSpot } from '../actors/backups.js';
import { DISTRICTS } from './districts.js';

export const LEGS = ['town', 'highway', 'cemetery'];
export const LEG_NIGHTS = 5;
export const journeyOn = () => !!(GS.RUN && GS.RUN.journey && !GS.RUN.hm && !GS.RUN.practice);
export const legOf = w => clamp(Math.floor((Math.max(1, w) - 1) / LEG_NIGHTS), 0, LEGS.length - 1);
// the dawn after this night is the one you leave on
export const legEnd = w => journeyOn() && w % LEG_NIGHTS === 0 && legOf(w) < LEGS.length - 1;
export const nextPlace = () => DISTRICTS[LEGS[legOf(GS.wave) + 1]];

// ---- the truck ----
const TL = 118,
  TW_ = 44; // the box truck's length and width, as the parked ones on the map
export function truckLive() {
  return !!(GS.truck && !GS.truck.gone);
}
// where it can pull up: along the main road from whichever end leaves it a clear run to a spot a fair walk from
// you, or, on ground with no road through it, parked out of sight in the open
export function callTruck(now = false) {
  const P = GS.P,
    row = RY && RY.includes(30) ? 30 : null;
  let t = null;
  if (row !== null) {
    const y = (row + 0.5) * TILE,
      lo = 5 * TILE,
      hi = (MW - 5) * TILE,
      clear = (x0, x1) => {
        const a = clamp(Math.min(x0, x1), TILE / 2, WW - TILE / 2),
          b = clamp(Math.max(x0, x1), TILE / 2, WW - TILE / 2);
        for (let x = a; x <= b; x += TILE / 2)
          for (const dy of [-14, 14]) if (isWall(Math.floor(x / TILE), Math.floor((y + dy) / TILE))) return false;
        return true;
      }; // the lane from the map's edge to the spot, inside the map
    for (const side of P.x < WW / 2 ? [1, -1] : [-1, 1]) {
      const edge = side > 0 ? (MW - 4.5) * TILE : 4.5 * TILE; // in from just inside the map's edge, well off screen
      let stop = clamp(P.x + side * rand(440, 560), lo, hi);
      if (Math.abs(stop - P.x) < 300) continue;
      while (stop > lo && stop < hi && !clear(edge, stop - side * (TL / 2 + 10))) stop += side * TILE; // something on the road: pull up on the near side of it
      if (stop <= lo || stop >= hi || !clear(edge, stop - side * (TL / 2 + 10))) continue;
      t = { x: now ? stop : edge, y, a: side > 0 ? Math.PI : 0, stopX: stop, v: now ? 0 : 260, drive: !now };
      break;
    }
  }
  if (!t) {
    const [x, y] = freeSpot(380, 620, !now);
    t = { x, y, a: rand(0, TAU), stopX: x, v: 0, drive: false, parked: true };
  }
  GS.truck = Object.assign(t, {
    truck: true,
    hp: 1,
    max: 1,
    lights: true,
    tint: [0.72, 0.78, 0.66], // convoy olive, under the grime
    col: '#7a8466',
    t: 0,
    board: 0,
    strT: 9,
    str: 0,
    honked: now,
  });
  if (now) GS.truck.parked = true;
  if (!t.drive) GS.truck.honked = false; // no road to come up: it is simply there, out of sight, and sounds its horn
}
function honk(k = 1) {
  tone(196, 0.42, 'sawtooth', 0.045 * k, 1, 0, 900);
  tone(247, 0.42, 'sawtooth', 0.035 * k, 1, 0, 900);
  tone(196, 0.3, 'sawtooth', 0.04 * k, 1, 0.55, 900);
  tone(247, 0.3, 'sawtooth', 0.03 * k, 1, 0.55, 900);
} // a tired two-tone horn, twice
export function tickTruck(dt, onBoard) {
  const T = GS.truck,
    P = GS.P;
  if (!T || T.gone || !P) return;
  T.t += dt;
  if (T.drive) {
    const left = (T.stopX - T.x) * Math.cos(T.a);
    T.v = Math.min(260, Math.sqrt(2 * 320 * Math.max(0, left)) + 6); // a steady run in, then brakes
    T.x += Math.cos(T.a) * T.v * dt;
    if (left <= 2) {
      T.x = T.stopX;
      T.drive = false;
      T.parked = true;
      T.v = 0;
    }
    if ((T.engT = (T.engT || 0) - dt) <= 0) {
      T.engT = 0.18;
      noise(0.22, 0.02 * clamp(1 - Math.hypot(T.x - P.x, T.y - P.y) / 1400, 0, 1), 140, 90, 'lowpass');
    } // the diesel, as it comes up the road
  }
  if (T.parked && !T.honked) {
    T.honked = true;
    honk();
    showStreak('The truck is here', `${nextPlace().name} is next · walk to it to climb aboard`, true);
  }
  // you can't walk through it
  {
    const c = Math.cos(T.a),
      s = Math.sin(T.a),
      rx = P.x - T.x,
      ry = P.y - T.y,
      u = rx * c + ry * s,
      v = -rx * s + ry * c,
      hu = TL / 2 + P.r * 0.6,
      hv = TW_ / 2 + P.r * 0.6;
    if (Math.abs(u) < hu && Math.abs(v) < hv) {
      let nu = u,
        nv = v;
      if (hu - Math.abs(u) < hv - Math.abs(v)) nu = Math.sign(u || 1) * hu;
      else nv = Math.sign(v || 1) * hv; // out by the shorter way
      P.x = T.x + nu * c - nv * s;
      P.y = T.y + nu * s + nv * c;
    }
  }
  if (T.parked) {
    const near = d2(P.x, P.y, T.x, T.y) < (TL / 2 + 46) ** 2 && P.hp > 0 && !(P.dashT > 0);
    T.board = near ? T.board + dt : Math.max(0, T.board - dt * 2);
    if (T.board >= 1.1) {
      T.gone = true;
      sfx.ammo();
      floatText(P.x, P.y - 44, 'Aboard', '#8ef0b8', 16);
      onBoard();
      return;
    }
    // the dead heard the fight: a few drift in while you make for the truck, more the longer you take
    T.strT -= dt;
    if (T.strT <= 0 && T.str < 10) {
      T.strT = Math.max(1.6, 4.2 - T.str * 0.25);
      T.str++;
      const [x, y] = freeSpot(560, 900, true),
        e = makeEnemy(Math.random() < 0.8 ? 'skitter' : 'hound', x, y);
      e.emerge = 1;
      e.aw = 6;
    }
  }
}
// where it is for the off-screen marker, and how far boarding has got
export function truckMarker() {
  const T = GS.truck;
  return T && !T.gone ? { x: T.x, y: T.y, board: T.board / 1.1 } : null;
}
export function truckLights() {
  const T = GS.truck;
  if (!T || T.gone) return;
  const c = Math.cos(T.a),
    s = Math.sin(T.a),
    fx = T.x + c * (TL / 2 + 8),
    fy = T.y + s * (TL / 2 + 8);
  addLight(fx, fy, 520, 1.0, 0.95, 0.8, T.a, 0.55); // headlights down the road
  const bx = T.x - c * (TL / 2 + 2),
    by = T.y - s * (TL / 2 + 2),
    k = T.parked ? 0.55 + 0.45 * (Math.sin(GS.time * 5) > 0 ? 1 : 0) : 0.8;
  addLight(bx, by, 150, 1.1 * k, 0.55 * k, 0.12 * k); // the hazards blinking at the back, where you climb in
}
export function clearTruck() {
  GS.truck = null;
}
// the travel card: the road so far, the stop ahead, what the radio says
export function showRoute(onGo) {
  const el = $('route'),
    from = legOf(GS.wave),
    to = from + 1;
  if (!el) return onGo();
  el.querySelector('.eyebrow').textContent = `Night ${GS.wave} survived · on the road`;
  el.querySelector('h2').textContent = DISTRICTS[LEGS[to]].name;
  el.querySelector('.rdesc').textContent = DISTRICTS[LEGS[to]].desc;
  const stops = el.querySelectorAll('.stop');
  stops.forEach((s, i) => {
    s.classList.toggle('done', i < to);
    s.classList.toggle('next', i === to);
  });
  el.querySelector('.rcarry').textContent = [
    `${GS.P.owned.length} ${GS.P.owned.length === 1 ? 'gun' : 'guns'}`,
    GS.buddies.length ? `${GS.buddies.length} with you` : 'on your own',
    `level ${GS.level}`,
  ].join(' · '); // what comes with you
  el.style.setProperty('--from', from);
  el.style.setProperty('--to', to);
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
  el.hidden = false;
  const btn = $('routeGo');
  btn.disabled = true;
  btn.textContent = 'On the road…';
  let ready = false,
    done = false;
  const go = () => {
    if (!ready || done) return;
    done = true;
    window.removeEventListener('keydown', key, true);
    el.hidden = true;
    onGo();
  };
  const key = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      go();
    }
  };
  window.addEventListener('keydown', key, true);
  btn.onclick = go;
  return () => {
    ready = true;
    btn.disabled = false;
    btn.textContent = 'Climb out · Enter';
  }; // the caller says when the new place is laid out
}
