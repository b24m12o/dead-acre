/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { CINE, cinePlay } from './cine.js';
import { GK } from '../core/scale.js';
import { clawOut } from '../actors/legs.js';
import { CLIP_END, boss3dOn, clipAbom } from '../render/boss3d.js';
import { placeStage } from './setpieces.js';
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, d2, rand, randi } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { R } from '../render/atlas.js';
import { MW, TILE, WH, WW, cars, houses, lamps } from '../world/map.js';
import { flow, blockPt } from '../world/nav.js';
import { MUS, noise, spat } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { S, cam, dropAmmo } from './state.js';
import { showStreak } from '../ui/callouts.js';
import { makeEnemy } from '../actors/enemies.js';
import { banner, lastNight, spawnPoint } from './waves.js';
import { bleed, chips, decal, dust, flashLight, part, pool, ring, shake, sparks } from '../render/effects.js';
import { dropCrate } from './combat.js';
import { bossDeathSfx } from '../actors/bosses.js';
import { BILE } from '../render/draw-enemies.js';
import { LAMPV } from '../render/decor.js';
import { damageCar, firePool } from '../world/fire.js';
import { startAlarm } from './noise.js';
import { DISTRICTS, FINAL_NIGHT, INF, TW } from './districts.js';
import { radio, tip } from '../audio/radio.js';
import { PRACTICE_SET } from './practice.js';
import { nightCleared } from './night-flow.js';
import { startEvac } from './evac.js';
import { bark, heroSay, nearestUp } from '../audio/barks.js';
import { BOSS_J } from './route.js';
import { endHorde } from './horde.js';
GS.FOGB = 0;
GS.FOGBT = 0;
GS.bossDue = false;
export const BOSS_PRE = {
  abom: 'The streetlights are going out',
  roadkill: 'A car alarm is screaming somewhere',
  grave: 'The bell on the hill is ringing',
  chief: 'Sirens on Main Street',
  pz: 'Something walked out of the hospital',
};
const BOSS_RADIO = {
  abom: {
    pre: 'Nine, streetlights are dying on your block one by one. Something is down in the wiring.',
    p1: 'Those sacs on the ground are moving. Shoot them before they open.',
    p2: 'Half the grid just flickered on our board. Whatever it is, it is angry now.',
    kill: 'Lights are coming back on our board. Did you just kill that thing, nine?',
    dawn: 'Sun is up. Whatever lived under that street is not getting up again.',
  },
  roadkill: {
    pre: 'Truckers on nine call it Roadkill. It goes for anything that makes noise. Car alarms drive it crazy.',
    p1: 'It tore a road sign out of the ground. Watch the throw.',
    p2: 'Every wreck it hits sets the next one off. Make the alarms work for you.',
    kill: 'Route 9 just went quiet. First time in weeks.',
    dawn: 'Dawn on Route 9. Nothing out there chasing alarms anymore.',
  },
  grave: {
    pre: 'There was a keeper on Hollow Hill. Blind, but it hears everything. The quieter you are, the longer you live.',
    p1: 'It is pulling up headstones. Do not stand where it can reach.',
    p2: 'Fog has swallowed the hill. The lantern on its hip is the only light left.',
    kill: 'The bell has stopped. The hill is yours, nine.',
    dawn: 'Fog is lifting off Hollow Hill. First quiet morning up there in a long time.',
  },
  chief: {
    pre: 'Engine 4 went into the fire on Main and never came back out. Something in turnout gear just walked out of the smoke.',
    p1: 'It is calling Engine 4 on the fire channel. Its crew is still answering.',
    p2: 'Main Street is burning end to end. Keep moving, nine.',
    kill: 'Engine 4, stand down. Rest easy, Chief.',
    dawn: 'Smoke is still going up from Main Street. The road is open again, nine.', // no count: the Chief is night 8 on the road, 10 elsewhere
  },
  pz: {
    pre: [
      'Nine, the doors of the county hospital just opened.',
      'Whatever started all this walked out of the isolation ward. It is heading your way.',
      'When it breathes in, get behind something. Do not let it scream at you in the open.',
    ],
    p1: 'It is bleeding infection into the street. Do not stand in it.',
    p2: 'The whole town heard that. Hang on, nine. The bird is spinning up.',
    kill: 'Patient Zero is down! The bird is in the air. Get to the landing zone.',
  },
};
export function bossType() {
  if (GS.RUN.journey && !GS.RUN.endless && !GS.RUN.practice) return BOSS_J[GS.wave] || 'abom'; // each where it belongs on the road (route.js)
  return !GS.RUN.endless && GS.wave === FINAL_NIGHT
    ? 'pz'
    : !GS.RUN.endless && GS.wave === 10
      ? 'chief'
      : GS.RUN.district === 'highway'
        ? 'roadkill'
        : GS.RUN.district === 'cemetery'
          ? 'grave'
          : 'abom';
}
export function fmtT(s) {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
export function freeAround(x, y, r = 22) {
  return (
    x > 4 * TILE &&
    y > 4 * TILE &&
    x < WW - 4 * TILE &&
    y < WH - 4 * TILE &&
    !blockPt(x, y) &&
    !blockPt(x + r, y) &&
    !blockPt(x - r, y) &&
    !blockPt(x, y + r) &&
    !blockPt(x, y - r)
  );
}
function stageSpot(d0, d1) {
  for (let k = 0; k < 80; k++) {
    const a = rand(0, TAU),
      r = rand(d0, d1);
    if (k < 50 && Math.abs(Math.sin(a)) > 0.55) continue; // the screen is wider than tall: arrive from the side where it can be seen
    const x = GS.P.x + Math.cos(a) * r,
      y = GS.P.y + Math.sin(a) * r;
    if (!freeAround(x, y, 30)) continue;
    const tx = Math.floor(x / TILE),
      ty = Math.floor(y / TILE);
    if (flow && !(flow[ty * MW + tx] < 65535)) continue;
    return [x, y];
  }
  return spawnPoint(d0, false);
} // close enough to watch it arrive, on ground it can walk from
function lampOff(L, quiet) {
  if (L.down || L.off) return;
  L.off = GS.time;
  L.on = 0;
  if (!quiet) {
    sparks(L.hx, L.hy - LAMPV(L), [1, 0.9, 0.6], 8, 220);
    sfx.lampPop(L.hx, L.hy);
  }
}
function lampsOff(list, gap, t0 = 0, who) {
  list.forEach((L, i) =>
    GS.later.push({
      t: t0 + i * gap,
      fn: () => {
        if (GS.state === 'play' && !(who && who.dead)) lampOff(L);
      },
    })
  );
  return list.length;
}
function lampsNear(x, y, r, max, far, keep = 0) {
  const d = L => d2(L.bx, L.by, x, y),
    l = lamps
      .filter(L => !L.down && !L.off && d(L) < r * r && d2(L.bx, L.by, GS.P.x, GS.P.y) > keep * keep)
      .sort((a, b) => d(a) - d(b))
      .slice(0, max);
  return far ? l.reverse() : l;
} // the nearest ones; 'far' plays them from the outside in
function lampsBack() {
  let i = 0;
  for (const L of lamps) if (L.bflick) L.broken = L.bflick = false;
  for (const L of lamps)
    if (L.off) {
      const l = L;
      GS.later.push({
        t: i++ * 0.07,
        fn: () => {
          l.off = 0;
          l.on = GS.time;
        },
      });
    }
  GS.FOGBT = 0;
} // the power comes back: every dead light stutters on again
function ringFires(cx, cy, n, r0, r1, life, t0 = 0, steps = null) {
  for (let i = 0, k = 0; i < n * 3 && k < n; i++) {
    const a = rand(0, TAU),
      r = rand(r0, r1),
      x = cx + Math.cos(a) * r,
      y = cy + Math.sin(a) * r;
    if (!freeAround(x, y, 12)) continue;
    const kk = k++;
    const go = () => {
      firePool(x, y, rand(34, 50), life);
      flashLight(x, y, 180, [1.4, 0.7, 0.3], 0.2);
      for (let j = 0; j < 4; j++)
        part({
          k: 10,
          x: x + rand(-14, 14),
          y: y + rand(-14, 14),
          z: 4,
          vz: rand(30, 70),
          vx: rand(-15, 15),
          vy: rand(-15, 15),
          life: 0.7,
          max: 0.7,
          size: rand(0.5, 0.9),
          rot: rand(0, TAU),
          vr: rand(-2, 2),
          drag: 1,
        });
    };
    if (steps) steps.push([t0 + kk * 0.15, go]);
    else
      GS.later.push({
        t: t0 + kk * 0.15,
        fn: () => {
          if (GS.state === 'play') go();
        },
      });
  }
}
function whenPlay(fn) {
  const g = () => {
    if (GS.state === 'play') return fn();
    if (GS.state === 'levelup' || GS.state === 'pause') GS.later.push({ t: 0.1, fn: g });
    else GS.bossDue = false;
  };
  return g;
} // a card or the pause menu on the same tick must not cancel a boss
export function bossEntrance(bt, quick) {
  // nothing just digs up any more: each boss announces itself its own way, and the camera leans toward it
  GS.bossDue = true;
  const L = BOSS_RADIO[bt];
  if (L) for (const l of [].concat(L.pre)) radio(l, null, 2);
  GS.later.push({ t: quick ? 0.6 : 2.2, fn: whenPlay(() => (ENTRANCE[bt] || ENTRANCE.walk)(bt)) });
}
function gzSecond() {
  if (!GS.RUN.gzDue) return;
  if (GS.state === 'levelup' || GS.state === 'pause') {
    GS.later.push({ t: 0.2, fn: gzSecond });
    return;
  }
  if (GS.state !== 'play' || GS.evac) return;
  GS.RUN.gzDue = false;
  showStreak('Another one', 'A second Patient Zero is coming');
  const [x, y] = stageSpot(520, 680);
  bossArrive(x, y, true);
}
function bossArrive_tip() {
  GS.later.push({
    t: 9,
    fn: () => {
      if (GS.state === 'play' && GS.boss && !GS.boss.dead) tip('boss');
    },
  });
}
function bossArrive(x, y, walk) {
  GS.bossDue = false;
  if (GS.state !== 'play' && GS.state !== 'cine') return null;
  const cine = GS.state === 'cine';
  bossArrive_tip();
  const e = makeEnemy('queen', x, y);
  GS.nightLive = true;
  if (GS.RUN.practice) GS.RUN.t0 = GS.time; // the practice clock starts when it shows up
  e.a = Math.atan2(GS.P.y - y, GS.P.x - x);
  if (walk) {
    e.emerge = 1;
    e.st = 'roar';
    e.stT = 1.3;
    e.busyT = 1.3;
  } // it walks in and announces itself
  else {
    dust(x, y, 7, 50, 1, 1);
    chips(x, y, 6, null, 4, 140);
    sfx.dig(x, y);
    ring(x, y, 6, 40, 0.4, [0.6, 0.5, 0.4], 0.5);
    decal(R.hole, x, y, 3, [1, 1, 1, 0.9], [0, 0, 0], 14);
  }
  {
    const bb = $('bossBox').firstElementChild;
    if (bb) bb.textContent = bossName();
  }
  if (!cine) banner(bossName(), GS.RUN.practice ? 'Boss practice' : '', true); // the name (in its entrance, on its card); how to fight it is in the boss bar
  sfx.roar(x, y, e.btype);
  shake(0.3);
  {
    const b = nearestUp(x, y);
    if (!b || Math.random() < 0.5) heroSay('boss', 1.2); // you, or one of your people: whoever speaks first, the other holds their tongue
    if (b) bark(b, 'boss', 1.4);
  }
  if (!GS.enemies.some(o => o !== e && o.type === 'queen' && !o.dead)) {
    MUS.bt = e.btype;
    MUS.pos.boss = 0;
    MUS.bph = 0;
    MUS.phJump = null;
    MUS.sec = null;
  } // its own music, from the top
  if (!cine) cam.peek = { x, y, t: 1.6 };
  if (lastNight(GS.wave) && INF(10) && !GS.RUN.practice && !GS.RUN.gzDone) {
    GS.RUN.gzDone = true;
    GS.RUN.gzDue = true;
    GS.later.push({ t: 20, fn: gzSecond });
  } // Ground Zero: a second one always follows
  return e;
}
// each boss's entrance, staged as a scene (cine.js): [time, fn] steps, the moment it comes out, when the camera goes
// back. Its card: the name, and one line of what the radio knows.
// how long a quick kill of each takes (from the fights' start): inside this, and the crate is richer
const BOSS_PAR = { abom: 75, chief: 95, roadkill: 80, grave: 95, pz: 120 };
const SUB = {
  abom: 'Main Street · it lives down in the wiring',
  chief: 'Engine 4 · went into the fire and never came back out',
  roadkill: 'Highway 9 · anything loud, it goes for',
  grave: 'Hollow Hill · blind, and it hears everything',
  pz: 'County Hospital · where it started',
};
// a few steps out into the open (t seconds at sp px/s), then (if roar) it stands and roars. dark: how unlit it starts
// (0 black, 1 lit), coming into the light over lit seconds
function walkOut(e, ang, t, sp, roar, fn, dark = 1, lit = 0.8) {
  if (!e) return e;
  e.cine = { vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t, roar, fn };
  e.rev = dark;
  e.revT = lit;
  return e;
}
const toYou = (x, y) => Math.atan2(GS.P.y - y, GS.P.x - x);
function stage(bt, x, y, steps, reveal, end) {
  cinePlay({ x, y, steps, reveal, end, key: bt, name: bossName(), sub: SUB[bt] || '' });
}
const ENTRANCE = {
  walk(bt) {
    const [x, y] = stageSpot(520, 680);
    stage(bt, x, y, [[0.9, () => walkOut(bossArrive(x, y, true), toYou(x, y), 1.2, 50, 1.3, null, 0.2, 1)]], 0.9, 3.6);
  },
  abom3d(bt) {
    // in 3D (boss3d.js): the lights round where it will surface die one after another, then it climbs out of the
    // street: the asphalt splits, its blades come up out of the hole and stab into the street beyond the rim, its head
    // breaks the surface, it hauls itself up on them, its legs come over the rim one by one and grip, it stands, its
    // tail slides out after it, it roars. The clip poses it; at the end (played out or skipped) the fight takes it over
    // where the clip left it
    const [x, y] = stageSpot(500, 640),
      steps = [],
      L = lampsNear(x, y, 430, 5),
      t0 = 0.5,
      yaw = Math.atan2(GS.P.y - y, GS.P.x - x),
      C = clipAbom(x, y, yaw);
    L.forEach((l, i) => steps.push([t0 + i * 0.15, () => lampOff(l)]));
    const tS = t0 + L.length * 0.15 + 0.2;
    steps.push([tS + 0.25, () => sfx.chitter(x, y, 0.9)]);
    let e = null,
      last = 0;
    const fx = {
      crack: k => {
        decal(R.hole, x + rand(-6, 6), y + rand(-6, 6), 0.8 + 2.6 * k, [1, 1, 1, 0.35 + 0.45 * k], [0, 0, 0], 120);
        dust(x + rand(-40, 40), y + rand(-40, 40), 1 + ((k * 4) | 0), 40 + 40 * k, 1, 1, [0.28, 0.27, 0.25]);
        chips(x, y, 2 + ((k * 6) | 0), null, 4, 80 + 120 * k);
        shake(0.04 + 0.2 * k);
        if (Math.round(k * 5) % 2 === 0) sfx.rumble(x, y);
      },
      burst: () => {
        e = bossArrive(x, y, false);
        if (e) {
          e.emerge = 1;
          e.clip3d = C;
          e.a = e.face = yaw;
          if (GS.state === 'cine') CINE.boss = e;
        }
        decal(R.hole, x, y, 3.6, [1, 1, 1, 0.95], [0, 0, 0], 200);
        for (let i = 0; i < 16; i++) {
          const a = rand(0, TAU),
            sp = rand(90, 280);
          part({
            k: 3,
            x: x + Math.cos(a) * 30,
            y: y + Math.sin(a) * 30,
            z: 6,
            vz: rand(140, 300),
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 1.8,
            max: 1.8,
            size: rand(0.7, 1.4),
            rot: rand(0, TAU),
            vr: rand(-6, 6),
            drag: 1.6,
            c: [0.2, 0.2, 0.22],
          });
        } // slabs of the street, thrown up and falling back
        chips(x, y, 16, null, 4, 300);
        dust(x, y, 10, 100, 1.4, 1.3, [0.24, 0.23, 0.21]);
        shake(0.5);
      },
      stab: p => {
        chips(p[0], p[1], 10, null, 4, 200);
        sparks(p[0], p[1], [1, 0.85, 0.5], 8, 220);
        decal(R.hole, p[0], p[1], 0.7, [1, 1, 1, 0.8], [0, 0, 0], 120);
        sfx.crunch(p[0], p[1]);
        shake(0.3);
      },
      grip: p => {
        chips(p[0], p[1], 7, null, 4, 150);
        dust(p[0], p[1], 3, 40, 0.9, 0.9, [0.3, 0.28, 0.26]);
        decal(R.hole, p[0], p[1], 0.5, [1, 1, 1, 0.6], [0, 0, 0], 120);
        sfx.crunch(p[0], p[1]);
        shake(0.14);
      },
      step: p => {
        dust(p[0], p[1], 3, 40, 0.9, 0.8, [0.3, 0.28, 0.26]);
        shake(0.07);
      },
      haul: () => {
        dust(x, y, 8, 90, 1.3, 1.2, [0.26, 0.25, 0.23]);
        chips(x, y, 8, null, 4, 160);
        sfx.rumble(x, y);
        shake(0.2);
      },
      roar: () => {
        if (e) sfx.roar(e.x, e.y, 'abom');
        shake(0.45);
      },
    };
    const at = t => {
      const tc = Math.min(CLIP_END, t - tS);
      if (tc < 0) return;
      const pose = C.pose(tc);
      C.events(last, tc, pose, fx);
      last = tc;
      if (e && !e.dead) {
        e.pose3 = pose;
        e.p3F = GS.time;
        e.x = pose.bodyP[0];
        e.y = pose.bodyP[1];
      }
    };
    cinePlay({
      x,
      y,
      steps,
      reveal: tS + 2.6,
      end: tS + 5.4,
      key: bt,
      name: bossName(),
      sub: SUB[bt] || '',
      onTick: at,
      onEnd: () => {
        at(tS + CLIP_END); // skipped: on to the end of it
        if (!e) return;
        const pose = C.pose(CLIP_END);
        e.clip3d = null;
        e.pose3 = null;
        e.p3 = null;
        e.x = pose.bodyP[0];
        e.y = pose.bodyP[1];
        e.a = e.face = yaw;
        e.t0 = GS.time;
        if (e.legs)
          e.legs.forEach((Lg, i) => {
            Lg.fx = pose.legs[i][2][0];
            Lg.fy = pose.legs[i][2][1];
            Lg.t = 1;
            Lg.out = undefined;
          }); // its feet where the clip planted them
      },
    });
  },
  abom(bt) {
    if (boss3dOn()) return ENTRANCE.abom3d(bt);
    // the lights round where it will surface die one after another, the street shakes and splits, it clicks, and it
    // tears up out of the asphalt
    const [x, y] = stageSpot(500, 640),
      steps = [],
      L = lampsNear(x, y, 430, 5),
      t0 = 0.8;
    L.forEach((l, i) => steps.push([t0 + i * 0.22, () => lampOff(l)]));
    const tB = t0 + L.length * 0.22 + 0.2;
    steps.push([tB + 0.3, () => sfx.chitter(x, y, 0.9)]);
    for (let k = 0; k < 7; k++)
      steps.push([
        tB + k * 0.19,
        () => {
          const f = (k + 1) / 7;
          shake(0.04 + 0.22 * f);
          dust(x + rand(-24, 24), y + rand(-24, 24), 1 + (k >> 1), 36 + 34 * f, 0.8, 0.9, [0.3, 0.28, 0.26]);
          chips(x, y, 1 + k, null, 4, 60 + 30 * k);
          decal(R.hole, x + rand(-6, 6), y + rand(-6, 6), 0.5 + 0.5 * f, [1, 1, 1, 0.22 * f], [0, 0, 0], 14);
          if (!(k % 2)) sfx.rumble(x, y);
        },
      ]);
    const tR = tB + 1.35;
    steps.push([
      tR,
      () => {
        const e = bossArrive(x, y, false);
        if (e) {
          e.rev = 0;
          e.revT = 2.2;
          e.emRate = 0.42; // slowly: it hauls itself up on its legs
          if (e.legs)
            clawOut(e, 0.3, (gx, gy) => {
              chips(gx, gy, 6, null, 4, 140);
              dust(gx, gy, 3, 40, 0.9, 0.9, [0.3, 0.28, 0.26]);
              decal(R.hole, gx, gy, 0.6, [1, 1, 1, 0.6], [0, 0, 0], 60);
              sfx.crunch(gx, gy);
              shake(0.12);
            }); // a leg at a time over the rim, each one digging into the asphalt
        } // it comes up out of the dark of the hole, under the dust, into the light
        decal(R.hole, x, y, 3.4, [1, 1, 1, 0.95], [0, 0, 0], 90); // the crater stays
        for (let i = 0; i < 14; i++) {
          const a = rand(0, TAU),
            s = rand(90, 260);
          part({
            k: 3,
            x: x + Math.cos(a) * 20,
            y: y + Math.sin(a) * 20,
            z: 6,
            vz: rand(120, 260),
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 1.8,
            max: 1.8,
            size: rand(0.7, 1.3),
            rot: rand(0, TAU),
            vr: rand(-6, 6),
            drag: 1.6,
            c: [0.2, 0.2, 0.22],
          });
        } // slabs of the street, thrown up and falling back
        chips(x, y, 16, null, 4, 300);
        dust(x, y, 14, 110, 1.6, 1.6, [0.24, 0.23, 0.21]);
        ring(x, y, 10, 90, 0.5, [0.55, 0.5, 0.45], 0.6);
        shake(0.55);
        return e;
      },
    ]);
    stage(bt, x, y, steps, tR, tR + 3.2);
  },
  roadkill(bt) {
    // a car alarm starts screaming down the road, the car rocks harder and harder, and it bursts out of the wreck
    const dd = c => Math.hypot(c.x - GS.P.x, c.y - GS.P.y),
      car = cars
        .filter(c => !c.dead && !c.burnt && dd(c) > 380 * GK && dd(c) < 820 * GK)
        .sort((a, b) => Math.abs(dd(a) - 560 * GK) - Math.abs(dd(b) - 560 * GK))[0];
    if (!car) return ENTRANCE.walk(bt);
    const steps = [[0.25, () => startAlarm(car)]];
    for (let k = 0; k < 5; k++)
      steps.push([
        0.8 + k * 0.28,
        () => {
          const f = (k + 1) / 5,
            s = k % 2 ? 1 : -1;
          car.jva = (car.jva || 0) + s * (0.15 + 0.35 * f);
          car.jvx = (car.jvx || 0) + rand(-30, 30) * f;
          car.jvy = (car.jvy || 0) + rand(-30, 30) * f;
          sfx.thump(car.x, car.y);
          shake(0.05 + 0.12 * f);
          if (k > 2) sparks(car.x, car.y, [1, 0.9, 0.6], 6, 200);
        },
      ]);
    const tR = 2.3;
    steps.push([
      tR,
      () => {
        const a = toYou(car.x, car.y);
        let x = car.x,
          y = car.y;
        for (let k = 40; k < 220; k += 8) {
          x = car.x + Math.cos(a) * k;
          y = car.y + Math.sin(a) * k;
          if (freeAround(x, y, 26)) break;
        }
        car.alarm = 0;
        car.hasAlarm = false;
        damageCar(car, car.max * 0.55);
        car.jvx = (car.jvx || 0) - Math.cos(a) * 160;
        car.jvy = (car.jvy || 0) - Math.sin(a) * 160;
        car.jva = (car.jva || 0) + rand(-0.7, 0.7);
        sparks(x, y, [1, 0.9, 0.6], 22, 380);
        for (let i = 0; i < 16; i++)
          part({
            k: 3,
            x,
            y,
            z: 14,
            vz: rand(40, 160),
            vx: Math.cos(a) * rand(80, 260) + rand(-90, 90),
            vy: Math.sin(a) * rand(80, 260) + rand(-90, 90),
            life: 1.6,
            max: 1.6,
            size: rand(0.25, 0.5),
            rot: rand(0, TAU),
            vr: rand(-14, 14),
            drag: 2.5,
            c: [0.75, 0.85, 0.9],
          });
        sfx.shatter();
        sfx.crunch(x, y);
        shake(0.45);
        const e = bossArrive(x, y, true);
        if (e) {
          e.lx = Math.cos(a);
          e.ly = Math.sin(a);
        }
        dust(x, y, 10, 70, 1.3, 1.2, [0.26, 0.25, 0.24]); // out of the wreck's dust
        return walkOut(e, a, 0.8, 60, 1.2, null, 0.3, 0.7);
      },
    ]);
    stage(bt, car.x, car.y, steps, tR, tR + 2.5);
  },
  grave(bt) {
    // fog rolls up the hill, the bell tolls three times, a crypt door grinds open, its lantern swings out of the
    // dark, and it walks out into the open
    let best = null,
      bs = 1e9,
      door = null;
    for (const o of houses)
      if (o.style === 'crypt') {
        const cx = (o.x + o.w / 2) * TILE,
          cy = (o.y + o.h / 2) * TILE;
        for (const [x, y] of [
          [cx, (o.y + o.h) * TILE + 34],
          [cx, o.y * TILE - 34],
          [o.x * TILE - 34, cy],
          [(o.x + o.w) * TILE + 34, cy],
        ]) {
          if (!freeAround(x, y, 22)) continue;
          const d = Math.hypot(x - GS.P.x, y - GS.P.y);
          if (d < 420 * GK || d > 950 * GK) continue;
          const sc = Math.abs(d - 600 * GK) + Math.abs(y - GS.P.y) * 0.6;
          if (sc < bs) {
            bs = sc;
            best = [x, y];
            door = [cx, cy];
          }
        }
      }
    const [x, y] = best || stageSpot(520, 680),
      out = door ? Math.atan2(y - door[1], x - door[0]) : toYou(x, y),
      steps = [[0, () => (GS.FOGBT = Math.max(GS.FOGBT, 0.75))]];
    for (let i = 0; i < 3; i++) steps.push([0.3 + i * 0.7, () => sfx.bell(x, y)]);
    steps.push([2.2, () => sfx.creak(x, y)]);
    steps.push([2.25, () => dust(x, y, 8, 50, 1, 1)]);
    for (let i = 0; i < 4; i++)
      steps.push([2.5 + i * 0.12, () => flashLight(x, y, 120 + i * 30, [1.2, 0.8, 0.4], 0.35)]); // the lantern, swinging out
    const tR = 2.95;
    steps.push([
      tR,
      () => {
        dust(x, y, 10, 70, 1.2, 1);
        return walkOut(bossArrive(x, y, true), out, 1.3, 45, 1.3, null, 0, 1.1); // out of the dark of the crypt
      },
    ]);
    stage(bt, x, y, steps, tR, tR + 2.8);
  },
  chief(bt) {
    // a siren winds up, the street catches fire in a ring, its radio crackles, and it walks out through the flames
    // dragging its axe on the concrete
    const [x, y] = placeStage('chief') || stageSpot(520, 660), // at the Starlite, out of the burnt fire station
      steps = [[0.2, () => sfx.siren(x, y, 2)]];
    ringFires(x, y, 7, 60, 100, 18, 0.5, steps);
    steps.push([1.5, () => sfx.radio(x, y)]);
    const tR = 2.1;
    let scr = 0;
    steps.push([
      tR,
      () => {
        sfx.breath(x, y, true);
        for (let i = 0; i < 10; i++)
          part({
            k: 2,
            x: x + rand(-30, 30),
            y: y + rand(-30, 30),
            vx: rand(-20, 20),
            vy: rand(-30, -10),
            life: rand(1.6, 2.4),
            max: 2.4,
            size: rand(0.8, 1.3),
            grow: 1.8,
            drag: 0.6,
            rot: rand(0, TAU),
            vr: rand(-1, 1),
            c: [0.2, 0.19, 0.19],
          }); // out of the smoke
        return walkOut(
          bossArrive(x, y, true),
          toYou(x, y),
          2.4,
          70,
          1.2,
          (e, dt) => {
            const s = e.a + Math.PI * 0.75,
              ax = e.x + Math.cos(s) * e.r * 1.1,
              ay = e.y + Math.sin(s) * e.r * 1.1;
            if (Math.random() < dt * 14) sparks(ax, ay, [1, 0.8, 0.45], 3, 140); // the axe head on the concrete
            if ((scr -= dt) <= 0) {
              scr = 0.45;
              sfx.scrape(ax, ay);
            }
          },
          0.2,
          1.3
        );
      },
    ]);
    stage(bt, x, y, steps, tR, tR + 3.9);
  },
  pz(bt) {
    // the lights round the hospital go out from the outside in, you hear it breathing, then the front doors burst
    // and it comes out running
    const [x, y] = placeStage('pz') || stageSpot(560, 720), // at County Hospital, out of its front door
      steps = [],
      L = lampsNear(x, y, 900, 7, true);
    L.forEach((l, i) => steps.push([0.7 + i * 0.25, () => lampOff(l)]));
    const tR = 0.9 + L.length * 0.25 + 0.6;
    steps.push([tR - 0.7, () => sfx.breath(x, y, true)]);
    steps.push([
      tR,
      () => {
        sfx.doorBreak(x, y);
        sfx.shatter();
        chips(x, y, 12, null, 3, 260);
        dust(x, y, 12, 90, 1.3, 1.1);
        shake(0.45);
        return walkOut(bossArrive(x, y, true), toYou(x, y), 0.9, 150, 1.4, null, 0, 0.5); // out of the dark of the doorway
      },
    ]);
    stage(bt, x, y, steps, tR, tR + 2.7);
  },
};

export function arenaPhase(e, ph, skip) {
  if (!skip && !GS.RUN.practice) for (let i = 0; i < 2; i++) dropAmmo(e.x, e.y, 1.5, 120);
  if (!skip && !GS.RUN.practice && GS.RUN.burstN) {
    const n = GS.RUN.burstN + (ph === 2 ? 2 : 0),
      lot = [];
    for (let i = 0; i < n; i++) lot.push(i % 4 === 3 ? 'mini' : 'skitter');
    if (ph === 2 && GS.wave >= 8) lot.push('beetle'); // and at its last turn, one brute
    GS.queue.unshift(...lot);
    GS.burstT = 2.5;
  } // its company comes when it turns, in one lot, rather than all through the fight // each boss changes the place it fights in when it gets hurt (a burst through two phases plays both)
  const bt = e.btype,
    L = BOSS_RADIO[bt];
  if (L && !skip) radio(ph === 1 ? L.p1 : L.p2, null, 2);
  if (bt === 'abom') {
    if (ph === 1) lampsOff(lampsNear(e.x, e.y, 650, 6), 0.18, 0, e);
    else {
      for (const l of lamps)
        if (!l.down && !l.off && !l.lantern && !l.broken && Math.random() < 0.6) l.broken = l.bflick = true;
      sfx.lampPop(GS.P.x, GS.P.y);
    }
  } // it feeds on the grid: first the block goes dark, then the lights all over town start to stutter
  else if (bt === 'roadkill') {
    const dd = c => d2(c.x, c.y, GS.P.x, GS.P.y),
      pool2 = cars.filter(c => !c.dead && !c.fire && !c.burnt && dd(c) > (260 * GK) ** 2 && dd(c) < (900 * GK) ** 2);
    for (let i = 0; i < (ph === 1 ? 1 : 3) && pool2.length; i++) {
      const c = pool2.splice(randi(0, pool2.length - 1), 1)[0];
      GS.later.push({
        t: 0.4 + i * 0.6,
        fn: () => {
          if (GS.state === 'play' && !c.dead) {
            c.fire = 1;
            flashLight(c.x, c.y, 260, [1.5, 0.7, 0.3], 0.3);
            dust(c.x, c.y, 6, 60, 1, 1);
            noise(0.7, 0.08, 900, 200, 'lowpass', 0, spat(c.x, c.y));
          }
        },
      });
    }
  } // Route 9 starts burning: the wrecks catch, one, then three more
  else if (bt === 'grave') {
    if (ph === 1) {
      GS.FOGBT = 1;
      sfx.bell(e.x, e.y);
    } else lampsOff(lampsNear(GS.P.x, GS.P.y, 1400, 16, true, 240), 0.08, 0, e);
  } // the fog thickens, then every light on the hill goes out but its lantern
  else if (bt === 'chief') {
    ringFires(GS.P.x, GS.P.y, ph === 1 ? 5 : 8, 300, 480, 25);
    if (ph === 2) sfx.siren(e.x, e.y, 1);
  } // the fire spreads down the block
  else if (bt === 'pz') {
    if (ph === 1) lampsOff(lampsNear(e.x, e.y, 800, 8), 0.2, 0, e);
    else {
      sfx.siren(GS.P.x - 900, GS.P.y, 3, true);
      for (let i = 0; i < 20; i++) noise(0.08, 0.035, 220, 80, 'lowpass', 1.5 + i * 0.12);
    }
  } // the dark follows it; then the town siren, and far off, rotors
}
function recordBoss(bt, secs) {
  const pr = GS.RUN.practice;
  GS.meta.trophies = GS.meta.trophies || {};
  const t = (GS.meta.trophies[bt] = GS.meta.trophies[bt] || {}),
    k = pr ? 'pbest' : 'best',
    nb = !(t[k] <= secs);
  if (nb) t[k] = secs;
  if (!pr) {
    t.n = (t.n || 0) + 1;
    (GS.RUN.bossLog = GS.RUN.bossLog || []).push({ bt, secs, nb, first: t.n === 1 });
  }
  saveMeta();
  return { nb, first: !pr && t.n === 1 };
}
export function bossLogHtml() {
  const l = GS.RUN.bossLog || [];
  if (!l.length) return '';
  return (
    '<div class="blog">' +
    l
      .map(
        b =>
          `${(PRACTICE_SET.find(o => o.bt === b.bt) || { name: '' }).name} down in <b>${fmtT(b.secs)}</b>${b.first ? ' · first kill' : b.nb ? ' · best time' : ''}`
      )
      .join('<br>') +
    '</div>'
  );
}
export function bossDown(e, alone) {
  // the kill is a checkpoint: the horde breaks, the lights come back, the convoy drops a crate
  if (alone && GS.RUN.gzDue) {
    alone = false;
    GS.bossDue = true;
    GS.later.push({ t: 2.5, fn: gzSecond });
  } // Ground Zero: killed the first one early, so the second comes now
  const bt = e.btype,
    secs = GS.time - (e.t0 || GS.time),
    tr = recordBoss(bt, Math.round(secs)),
    nm = bossName();
  bossDeathSfx(e);
  if (alone && (GS.RUN.practice || (lastNight(GS.wave) && !GS.RUN.endless)))
    MUS.cutT =
      GS.time +
      (GS.RUN.practice
        ? 99
        : 4.8) /* any other night the win ending rings straight into the quiet; on the last night the silence holds until the evac fight starts */; // the band stops dead with it
  // the kill is graded: quick (inside its par) and clean (it cost you under a quarter of your health). Its crate holds
  // 5 picks for both, 3 for either, 1 otherwise
  const fast = secs <= (BOSS_PAR[bt] || 90),
    clean = (e.took || 0) < S.maxHp * 0.25,
    picks = fast && clean ? 5 : fast || clean ? 3 : 1,
    grade = fast && clean ? 'Flawless' : clean ? 'Clean kill' : fast ? 'Quick kill' : '';
  GS.RUN.bossPicks = picks;
  if (!GS.RUN.practice) {
    const sc = GS.wave <= 5 ? 40 : GS.wave <= 10 ? 80 : 150;
    GS.runSeeds += sc;
    GS.RUN.lvHold = GS.time + 1.1; // the cards wait until the kill has landed
    banner(
      `${nm} is dead`,
      `${grade ? grade + ' · ' : ''}${fmtT(secs)} · ${picks} ${picks > 1 ? 'picks' : 'pick'} in its crate${tr.first ? ' · first kill' : tr.nb ? ' · best time' : ''}`,
      false
    );
    GS.RUN.bossDawn = (BOSS_RADIO[bt] || {}).dawn;
  } else GS.RUN.pBest = tr.nb;
  if (!alone) return; // Ground Zero: the other one is still up
  GS.bossDue = false;
  GS.later.push({
    t: 0.9,
    fn: () => {
      if (GS.state === 'play') lampsBack();
    },
  });
  {
    const L = BOSS_RADIO[bt];
    if (L) GS.later.push({ t: 1.4, fn: () => radio(L.kill, null, 2) });
  }
  if (GS.RUN.practice) return;
  GS.queue.length = 0;
  let n = 0;
  for (const z of GS.enemies)
    if (z.type === 'egg' && !z.dead) {
      z.dead = true;
      bleed(z.x, z.y, 10, 0, 0, 10, BILE, 160);
      pool(z.x, z.y, 0.6, BILE, 30);
    }
  for (const z of GS.enemies)
    if (!z.dead && z !== e && z.type !== 'queen' && z.type !== 'flower' && z.type !== 'egg') {
      z.rout = rand(4.5, 6.5);
      z.lure = null;
      n++;
    }
  if (n) GS.later.push({ t: 2.3, fn: () => showStreak('They scatter', 'The horde breaks without it') });
  if (GS.horde && !GS.horde.done && !GS.horde.finale && !GS.enemies.some(z => z.type === 'queen' && !z.dead && z !== e))
    endHorde(); // the horde it raised dies with it: what is left of it scatters, and whatever had not risen yet never does
  GS.later.push({
    t: 2.6,
    fn: () => {
      if (GS.state !== 'play') return;
      const cr = dropCrate(
        undefined,
        undefined,
        undefined,
        `Its crate · ammo and ${picks} ${picks > 1 ? 'picks' : 'pick'} of gear`
      );
      if (cr) cr.bossPicks = picks;
    },
  });
  {
    const rw = TW('pistol')
      ? null
      : (bt === 'chief' || GS.wave >= 10) && !GS.P.owned.includes('launcher')
        ? 'launcher'
        : !GS.P.owned.includes('auto')
          ? 'auto'
          : null;
    if (rw)
      GS.later.push({
        t: 3.4,
        fn: () => {
          if (GS.state === 'play') dropCrate(rw);
        },
      });
  } // the auto shotgun for your first boss, the grenade launcher for the Fire Chief
  if (lastNight(GS.wave) && !GS.RUN.endless)
    GS.later.push({
      t: 5, // after the boss's ending has rung out
      fn: () => {
        if (GS.state === 'play' && !GS.evac) {
          nightCleared();
          startEvac();
        }
      },
    }); // the last one down: the bird comes now, not after the stragglers
}
export function bossName() {
  const t = GS.boss && GS.boss.btype ? GS.boss.btype : bossType();
  return t === 'pz'
    ? 'Patient Zero'
    : t === 'chief'
      ? 'Fire Chief'
      : t === 'roadkill'
        ? DISTRICTS.highway.boss
        : t === 'grave'
          ? DISTRICTS.cemetery.boss
          : DISTRICTS.town.boss;
}
/* ---------- first-run training: night 1 opens with a short drill, one control at a time ---------- */
