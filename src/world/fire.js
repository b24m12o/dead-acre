/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { roofStop } from './roofs.js';
import { GK } from '../core/scale.js';
import { GS } from '../core/gs.js';
import { TAU, clamp, d2, lerp, rand } from '../core/util.js';
import { quad, viewH, viewW } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { thrown } from '../render/draw-player.js';
import { MH, MW, TILE, cars, fires, houses, ttype } from './map.js';
import { query } from './nav.js';
import { AC, noise, noiseBuf, sfxBus, spat } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { S, cam } from '../game/state.js';
import { chips, decal, flashLight, floatText, part, shake } from '../render/effects.js';
import { explode, hurtEnemy, hurtPlayer } from '../game/combat.js';
import { WINDX } from './physics.js';
import { startAlarm } from '../game/noise.js';
import { bump } from '../game/challenges.js';
import { bark, nearestUp } from '../audio/barks.js';
export let carAt = new Int16Array(1);
GS.firePools = [];
GS.molos = [];
export function hotSpots(o, n, w, h) {
  if (!o.hs) {
    o.hs = [];
    for (let i = 0; i < n; i++) o.hs.push([rand(0.2, 0.8), rand(0.25, 0.75), rand(0.7, 1.2)]);
  }
  return o.hs;
} // where a fire actually burns: a few fixed seats, not the whole area at once
export function fireBeds() {
  // under each fire, a bed of embers that glows and flickers; the flames stand on it
  const bed = (x, y, r, k) => {
    const fk = k * (0.8 + Math.sin(GS.time * 9 + x * 0.3) * 0.12 + Math.sin(GS.time * 23 + y) * 0.08);
    quad(R.glow, x, y, 0, r / 26, r / 34, 0, 0, 0, 0.7 * fk, 0.9, 0.26, 0.04, 0);
    quad(R.glow, x, y, 0, r / 60, r / 76, 0, 0, 0, 0.9 * fk, 1.5, 0.72, 0.2, 0);
  };
  for (const o of houses)
    if (o.burning)
      for (const [u, v, k] of hotSpots(o, 3)) bed((o.x + u * o.w) * TILE, (o.y + v * o.h) * TILE - 32, 30 * k, 0.9);
  for (const c of cars)
    if (c.fire && !c.dead)
      for (const [u, , k] of hotSpots(c, 2)) {
        const d = (u - 0.5) * 60;
        bed(c.x + Math.cos(c.a) * d, c.y + Math.sin(c.a) * d - 8, 15 * k, 1);
      }
  for (const fp of GS.firePools) bed(fp.x, fp.y, fp.r * 0.9, Math.min(1, fp.life / 1.5));
  for (const f of fires) bed(f.x, f.y - 14, 18, 0.9);
}
function ember(x, y) {
  part({
    k: 1,
    x: x + rand(-6, 6),
    y,
    vx: rand(-25, 25) + WINDX * 0.5,
    vy: rand(-110, -50),
    life: rand(0.7, 1.5),
    max: 1.5,
    size: rand(0.35, 0.6),
    drag: 0.7,
    c: [1, rand(0.4, 0.6), 0.15],
  });
} // a spark carried up off the fire
export function flame(x, y, n = 1, spread = 6, size = 1) {
  if (size > 0.9 && Math.random() < 0.12 * size) ember(x, y - 10 * size);
  for (let i = 0; i < n; i++)
    part({
      k: 10,
      x: x + rand(-spread, spread),
      y: y + rand(-spread, spread),
      vx: rand(-14, 14),
      vy: rand(-55, -20),
      life: rand(0.35, 0.7),
      max: 0.7,
      size: rand(0.22, 0.42) * size,
      drag: 1,
    });
}
export function smoke(x, y, n, R0 = 60, dark = false) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU),
      s = rand(5, R0 * (dark ? 1 : 0.6)),
      g = dark ? rand(0.2, 0.26) : 0.24;
    part({
      k: 2,
      x: x + (rand(-8, 8) + Math.cos(a) * (dark ? R0 * 0.3 : 0)) * GK,
      y: y + (rand(-8, 8) + Math.sin(a) * (dark ? R0 * 0.3 : 0)) * GK, // (R0 in the old size of things, like the rest)
      vx: Math.cos(a) * s * 0.4,
      vy: Math.sin(a) * s * 0.4 - rand(10, 30),
      life: rand(1.6, 3.2) * (dark ? 1.3 : 1),
      max: 3.2 * (dark ? 1.3 : 1),
      size: rand(0.8, 1.4) * Math.max(0.6, R0 / 70) * (dark ? 1.25 : 1),
      grow: rand(1, 1.8),
      rot: rand(0, TAU),
      vr: rand(-0.6, 0.6),
      drag: 0.9,
      c: [g, g * 0.95, g * 0.9],
      wind: 0.8,
    });
  }
}
export function fireball(x, y, R0) {
  // a rolling ball of flame: billowing puffs that cool from yellow to orange to dull red, a few licking tongues on top
  let L;
  for (let i = 0; i < 18; i++) {
    const a = rand(0, TAU),
      s = rand(20, R0 * 1.5);
    part({
      k: 13,
      x: x + Math.cos(a) * R0 * 0.2 * GK,
      y: y + Math.sin(a) * R0 * 0.2 * GK,
      vx: Math.cos(a) * s * 0.7,
      vy: Math.sin(a) * s * 0.7 - rand(10, 40), // it rolls up and over where it went off, not out in a star
      life: (L = rand(0.7, 1.3)),
      max: L,
      size: (rand(0.8, 1.3) * R0) / 45,
      rot: rand(0, TAU),
      vr: rand(-2, 2),
      drag: 4,
    });
  }
  for (let i = 0; i < 10; i++) {
    const a = rand(0, TAU),
      s = rand(10, R0 * 0.9);
    part({
      k: 13,
      x: x + Math.cos(a) * R0 * 0.1 * GK,
      y: y + Math.sin(a) * R0 * 0.1 * GK,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - rand(30, 70),
      life: (L = rand(0.9, 1.6)),
      max: L,
      size: (rand(1.1, 1.6) * R0) / 45,
      rot: rand(0, TAU),
      vr: rand(-2, 2),
      drag: 3,
    });
  } // the inner billows rise and roll, rather than flying out in a star
  GS.later.push({ t: 0.18, fn: () => flame(x, y, 8, R0 * 0.3 * GK, R0 / 95) }); // what's left burning where it went off: tongues the size of a man, not comets
}
export function ignite(e, t = 3) {
  if (e.dead || e.fireproof || (e.type === 'queen' && t < 2)) return;
  if (S.evo.inferno) t *= 2;
  if (!(e.burn > 0)) e.burnT = 0.1;
  e.burn = Math.max(e.burn || 0, t);
}
// r at the old size of things (core/scale.js)
export function firePool(x, y, r, life) {
  GS.firePools.push({ x, y, r: r * GK, life, max: life });
  decal(R.scorch, x, y, r / 50, [1, 1, 1, 0.9], [0, 0, 0], 50);
}
export function buildCarMap() {
  // the body each ordinary parked car has, fixed by where it stands: saloons the most, then hatchbacks, estates, SUVs, pickups
  const BODIES = ['car', 'car', 'car', 'hatchback', 'hatchback', 'wagon', 'suv', 'suv', 'pickup'];
  for (const c of cars)
    if (!c.truck && !c.tanker && !c.police && !c.amb && !c.body)
      c.body = BODIES[Math.abs(Math.floor(c.x * 7.13 + c.y * 3.71)) % BODIES.length];
  carAt = new Int16Array(MW * MH).fill(-1);
  cars.forEach((c, i) => {
    c.hp = c.max = c.truck ? 520 : 320;
    c.dead = false;
    c.fire = 0;
    c.hasAlarm = !c.burnt && !c.police && Math.random() < 0.6;
    c.alarm = 0;
    c.alarmUsed = false;
    c.rig = false;
    c.tanker = false;
  });
  {
    let tr = cars.filter(c => c.truck && !c.burnt);
    if (!tr.length) tr = cars.filter(c => !c.burnt && !c.police); // no truck in this district: a fuel van, then
    if (tr.length) {
      const t = tr[Math.floor(Math.random() * tr.length)];
      t.tanker = true;
      t.hasAlarm = false;
      t.col = '#d9d4c6';
      t.hp = t.max = 300;
    }
  } // one truck on the map is a fuel tanker: the biggest bang in the district, if you can bring the horde to it
  for (let ty = 0; ty < MH; ty++)
    for (let tx = 0; tx < MW; tx++)
      if (ttype[ty * MW + tx] === 6) {
        let best = -1,
          bd = 1e9;
        cars.forEach((c, i) => {
          const d = d2(c.x, c.y, (tx + 0.5) * TILE, (ty + 0.5) * TILE);
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        carAt[ty * MW + tx] = best;
      }
}
export function hitCar(tx, ty, dmg, x, y) {
  const i = carAt[ty * MW + tx];
  if (i >= 0) {
    const c = cars[i];
    if (x !== undefined && !c.dead && !c.burnt) {
      c.holes = c.holes || [];
      if (c.holes.length > 40) c.holes.shift(); // (they're small: a car shot up keeps more of them)
      const dx = x - c.x,
        dy = y - c.y,
        ca = Math.cos(-c.a),
        sa = Math.sin(-c.a);
      const u = clamp(dx * ca - dy * sa, -30, 30),
        v = clamp(dx * sa + dy * ca, -14, 14);
      // a round through the glass (the cabin, on a car) cracks it in a star; anywhere else it's a small dark hole in
      // the metal, a centimetre or two with its chipped paint
      const cab = !c.truck && u > -22 && u < 14 && Math.abs(v) < 13,
        roof = Math.abs(u + 4) < 11 && Math.abs(v) < 9.5; // the windscreen, the back window and the side glass round the roof
      c.holes.push({ u, v, r: rand(0, TAU), g: cab && !roof });
    }
    damageCar(c, dmg);
  }
}
export function damageCar(c, dmg) {
  if (!c || c.dead || GS.state !== 'play') return;
  c.hp -= dmg;
  if (c.hasAlarm && !c.alarmUsed && !c.burnt) startAlarm(c);
  if (c.hp < c.max * 0.3 && !c.fire) {
    c.fire = 1;
    if (c.hp > 0) {
      c.warn = floatText(c.x, c.y - 30, "It's going to blow!", '#ffb070', 15); // only while there's still time to get clear
      const b = nearestUp(c.x, c.y, 500);
      if (b && GS.P && (d2(c.x, c.y, GS.P.x, GS.P.y) < (260 * GK) ** 2 || d2(c.x, c.y, b.x, b.y) < (200 * GK) ** 2))
        bark(b, 'car');
    }
  }
  if (c.hp <= 0) blowCar(c);
}
// how far a car's blast reaches: a truck further than a car, a rigged one half again, the fuel tanker twice
// a car is the street's size, not the people's: so is its blast (explode() takes the old size of things, hence / GK)
// how big a burning car's flames are, against the old size of things (a car's fire is the car's size)
const CAR_FLAME = 0.75;
export const carBlastR = c => (c.truck ? 150 : 125) * (c.tanker ? 2 : c.rig ? 1.45 : 1);
function blowCar(c) {
  c.dead = true;
  c.fire = 0;
  if (c.warn) c.warn.life = 0; // the warning goes with the car: never left hanging over the wreck
  c.warn = null;
  bump('cars');
  const k = c.tanker ? 2 : c.rig ? 1.45 : 1; // a rigged car goes up half again as wide; the fuel tanker twice
  if (c.rig) bump('rigs');
  GS.trapBlast = !!c.rig;
  explode(c.x, c.y, carBlastR(c) / GK, (90 + GS.wave * 12) * (c.tanker ? 2.2 : c.rig ? 1.6 : 1), true, c.rig ? 0 : 0.5); // a car you rigged is your trap: the full blast
  if (c.tanker)
    for (const [t, u, s] of [
      [0.04, -1, 0.75],
      [0.07, 1, 0.75],
      [0.12, 0, 1.15],
    ])
      GS.later.push({
        t,
        fn: () => fireball(c.x + Math.cos(c.a) * 44 * u, c.y + Math.sin(c.a) * 44 * u, (carBlastR(c) * s) / GK),
      }); // the tank going up end to end, then the fuel in it: a fireball as wide as the blast's deadly core
  GS.trapBlast = false;
  firePool(c.x, c.y, ((c.truck ? 70 : 55) * k) / GK, c.tanker ? 14 : 9); // the fuel, burning on the road round the wreck: as wide as the car (world size)
  if (c.tanker)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + rand(-0.2, 0.2),
        d = rand(130, 190);
      GS.later.push({ t: 0.1 + i * 0.05, fn: () => firePool(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, 60, 11) });
    } // burning fuel thrown out in a ring
  GS.wrecks.push({ x: c.x, y: c.y, a: c.a, s: c.truck ? 1.5 : 1 });
  shake(0.6);
  GS.hitstop = Math.max(GS.hitstop, 0.05);
  for (let i = 0; i < 10; i++) chips(c.x, c.y, 1, [0.25, 0.25, 0.27], 3, 520);
  smoke(c.x, c.y, 14, 120);
}
GS.wrecks = [];
let fireG = null,
  fireP = null;
function fireAudio(dt) {
  /* fire you can hear: a low roar that swells and pans as you near it, and crackles popping off the flames */
  if (!AC || !noiseBuf || !sfxBus) return;
  const t0 = AC.currentTime;
  if (GS.state !== 'play' || !GS.P) {
    if (fireG) fireG.gain.setTargetAtTime(0, t0, 0.3);
    return;
  }
  let I = 0,
    fx = 0,
    fy = 0,
    best = 1e9;
  const near = (x, y, k) => {
    const d = Math.hypot(x - GS.P.x, y - GS.P.y);
    if (d > 560 * GK) return;
    I += k * clamp(1 - d / 560, 0, 1);
    if (d < best) {
      best = d;
      fx = x;
      fy = y;
    }
  };
  for (const f of fires) near(f.x, f.y, 0.5);
  for (const fp of GS.firePools) near(fp.x, fp.y, 0.7 * Math.min(1, fp.life / 1.5) * Math.min(1.6, fp.r / 50));
  for (let i = 0; i < GS.grassFire.length; i += 4) near(GS.grassFire[i].x, GS.grassFire[i].y, 0.3);
  for (const c of cars) if (c.fire && !c.dead) near(c.x, c.y, 1);
  I = Math.min(1.4, I);
  if (!fireG) {
    const sr = AC.createBufferSource();
    sr.buffer = noiseBuf;
    sr.loop = true;
    const lp = AC.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    lp.Q.value = 0.7;
    fireG = AC.createGain();
    fireG.gain.value = 0;
    sr.connect(lp);
    lp.connect(fireG);
    let out = fireG;
    if (AC.createStereoPanner) {
      fireP = AC.createStereoPanner();
      fireG.connect(fireP);
      out = fireP;
    }
    out.connect(sfxBus);
    sr.start();
  }
  fireG.gain.setTargetAtTime(0.2 * I, t0, 0.25);
  if (fireP && I > 0) fireP.pan.setTargetAtTime(clamp((fx - GS.P.x) / (viewW * 0.55), -0.8, 0.8), t0, 0.2);
  if (I > 0.03 && Math.random() < dt * 24 * I) {
    const b = spat(fx + rand(-30, 30), fy + rand(-30, 30));
    noise(
      rand(0.004, 0.016),
      rand(0.15, 0.4) * Math.min(1, I + 0.2),
      rand(2500, 6500),
      rand(1200, 3000),
      'bandpass',
      0,
      b
    );
    if (Math.random() < 0.22) noise(0.05, 0.14 * Math.min(1, I), 900, 300, 'bandpass', 0.01, b);
  }
}
export function updateFire(dt) {
  fireAudio(dt);
  for (const f of fires)
    if (
      Math.abs(f.x - cam.x - viewW / 2) < viewW &&
      Math.abs(f.y - cam.y - viewH / 2) < viewH &&
      Math.random() < dt * 26
    ) {
      flame(f.x, f.y - 20, 1, 5, 1.15);
      if (Math.random() < 0.15)
        part({
          k: 2,
          x: f.x + rand(-4, 4),
          y: f.y - 34,
          vx: rand(-6, 6),
          vy: rand(-30, -16),
          life: rand(2, 3.4),
          max: 3.4,
          size: rand(0.5, 0.8),
          grow: 1.6,
          drag: 0.5,
          rot: rand(0, TAU),
          vr: rand(-0.6, 0.6),
          c: [0.2, 0.19, 0.18],
          wind: 1,
        });
    }
  for (const c of cars) {
    if (c.dead) continue;
    const near = Math.abs(c.x - cam.x - viewW / 2) < viewW && Math.abs(c.y - cam.y - viewH / 2) < viewH;
    if (c.hp < c.max * 0.6 && near && Math.random() < dt * (c.fire ? 15 : 3))
      smoke(c.x + Math.cos(c.a) * 22 + rand(-8, 8), c.y + Math.sin(c.a) * 22, 1, c.fire ? 85 : 50, !!c.fire); // a burning car pours out thick black smoke
    if (c.fire) {
      if (near)
        for (const [u, , k] of hotSpots(c, 2))
          if (Math.random() < dt * 36 * k) {
            const d = (u - 0.5) * 60 + rand(-10, 10);
            flame(
              c.x + Math.cos(c.a) * d,
              c.y + Math.sin(c.a) * d - 8,
              1,
              11 * k,
              (rand(1.2, 1.7) * k * CAR_FLAME) / GK
            );
          } // many tongues a metre or two high licking out of the car (a car is the street's size: core/scale.js)
      if (GS.state === 'play') {
        c.hp -= dt * c.max * 0.12;
        if (c.hp <= 0) blowCar(c);
      }
    }
  }
  for (const w of GS.wrecks) {
    w.sm = (w.sm ?? 30) - dt;
    w.burn = (w.burn ?? (w.s > 1 ? 22 : 16)) - dt;
    if (w.burn > 0 && Math.abs(w.x - cam.x - viewW / 2) < viewW && Math.abs(w.y - cam.y - viewH / 2) < viewH) {
      const k = Math.min(1, w.burn / 6); // the wreck burns on: fuel, seats and tyres, dying down over its last seconds
      for (const [u, , q] of hotSpots(w, 3))
        if (Math.random() < dt * 30 * q * k) {
          const d = (u - 0.5) * 66 * w.s + rand(-10, 10);
          flame(
            w.x + Math.cos(w.a) * d,
            w.y + Math.sin(w.a) * d - 6,
            1,
            13 * q,
            (rand(1.1, 1.8) * q * k * CAR_FLAME) / GK
          );
        }
      if (Math.random() < dt * 9 * k) smoke(w.x + rand(-14, 14), w.y + rand(-8, 8), 1, 90, true); // black, from burning rubber and plastic
    }
    if (
      w.sm > 0 &&
      Math.abs(w.x - cam.x - viewW / 2) < viewW &&
      Math.abs(w.y - cam.y - viewH / 2) < viewH &&
      Math.random() < dt * 6 * (w.sm / 30)
    )
      smoke(w.x + rand(-14, 14), w.y + rand(-8, 8), 1, 75);
  } // wrecks smoulder for half a minute
  for (const fp of GS.firePools) {
    fp.life -= dt;
    const k = Math.min(1, fp.life / 1.5);
    const area = (fp.r * fp.r) / 2500,
      onS = Math.abs(fp.x - cam.x - viewW / 2) < viewW && Math.abs(fp.y - cam.y - viewH / 2) < viewH;
    if (onS && Math.random() < dt * 34 * area * k) {
      const a = rand(0, TAU),
        d = Math.sqrt(Math.random()) * fp.r * 0.9;
      flame(fp.x + Math.cos(a) * d, fp.y + Math.sin(a) * d, 1, 4, rand(0.9, 1.5) * (1 - (d / fp.r) * 0.4));
    }
    if (onS && Math.random() < dt * 2.5 * area * k) smoke(fp.x + rand(-fp.r, fp.r) * 0.5, fp.y - 20, 1, 70, true); // more tongues, taller in the middle, and the oily smoke a fuel fire throws up
    if (GS.state !== 'play') continue;
    query(fp.x, fp.y, fp.r + 30, e => {
      if (!e.dead && e.z < 12 && d2(e.x, e.y, fp.x, fp.y) < (fp.r + e.r * 0.5) ** 2) ignite(e, 2.6);
    });
    if (GS.P.inv <= 0 && d2(GS.P.x, GS.P.y, fp.x, fp.y) < (fp.r * 0.8) ** 2) {
      hurtPlayer(5 + GS.wave * 0.4, undefined, undefined, 'fire');
      floatText(GS.P.x, GS.P.y - 40, 'Burning!', '#ffb070', 14);
    }
  }
  GS.firePools = GS.firePools.filter(f => f.life > 0);
  for (const m of GS.molos) {
    m.t += dt;
    const k = Math.min(1, m.t / m.dur);
    m.x = lerp(m.x0, m.tx, k);
    m.y = lerp(m.y0, m.ty, k);
    m.z = Math.sin(k * Math.PI) * (40 + m.dur * 120);
    m.spin += dt * 16;
    if (Math.random() < 0.6) flame(m.x, m.y - m.z, 1, 2, 0.5);
    if (k >= 1) {
      m.done = true;
      firePool(m.tx, m.ty, m.r, 4.5);
      fireball(m.tx, m.ty, 50);
      flashLight(m.tx, m.ty, 260, [1.6, 0.8, 0.25], 0.3);
      sfx.molotov();
      query(m.tx, m.ty, m.r + 40, e => {
        if (!e.dead && d2(e.x, e.y, m.tx, m.ty) < (m.r + e.r) ** 2) {
          ignite(e, 4);
          hurtEnemy(e, 15 + GS.wave, false, e.x - m.tx, e.y - m.ty, 0.5, 'fire');
        }
      });
    }
  }
  GS.molos = GS.molos.filter(m => !m.done);
}
export function throwMolotov(p) {
  const r = 62 + 16 * S.molo,
    clear = (r + 40) * GK + p.r; // never where its own fire would reach you: it used to land on crowds 90 px out, led toward you
  let best = null,
    bn = 0;
  query(p.x, p.y, 470 * GK, e => {
    if (e.dead || e.emerge < 1 || d2(e.x + e.vx * 0.3, e.y + e.vy * 0.3, p.x, p.y) < clear * clear) return;
    let n = 0;
    query(e.x, e.y, 95 * GK, o => {
      if (!o.dead && d2(o.x, o.y, e.x, e.y) < (95 * GK) ** 2) n++;
    });
    if (n > bn) {
      bn = n;
      best = e;
    }
  });
  if (!best || roofStop(p.x, p.y, best.x, best.y)) return false; // a roof between you and them: not this time (roofs.js)
  const d = Math.hypot(best.x - p.x, best.y - p.y);
  thrown(p, Math.atan2(best.y - p.y, best.x - p.x));
  GS.molos.push({
    x0: p.x,
    y0: p.y,
    x: p.x,
    y: p.y,
    tx: best.x + best.vx * 0.3,
    ty: best.y + best.vy * 0.3,
    t: 0,
    dur: clamp(d / 520, 0.35, 0.9),
    z: 0,
    spin: 0,
    r,
  });
  sfx.swap();
  return true;
}
export function burnTick(e, dt) {
  if (!(e.burn > 0)) return;
  e.burn -= dt;
  e.burnT -= dt;
  if (Math.random() < dt * 22)
    flame(e.x + rand(-e.r * 0.5, e.r * 0.5), e.y - e.z + rand(-e.r * 0.5, e.r * 0.3), 1, 3, e.r / 14);
  if (e.burnT <= 0) {
    e.burnT = 0.3;
    hurtEnemy(
      e,
      (5 + GS.wave * 0.9) * (e.type === 'queen' ? 2 : 1) * (S.evo.inferno ? 1.5 : 1),
      false,
      0,
      0,
      0,
      'fire',
      e.x,
      e.y
    );
    if (!e.dead && Math.random() < (S.evo.tempest ? 0.35 : 0.25))
      query(e.x, e.y, e.r + 30, o => {
        if (o !== e && !o.dead && d2(o.x, o.y, e.x, e.y) < (o.r + e.r + 6) ** 2) ignite(o, 2);
      });
  }
}
