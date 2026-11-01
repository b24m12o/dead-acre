/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The ride out. Once you're aboard, the chopper doesn't just cut to the end screen: it lifts off the landing zone and
// flies low over the town and off the far edge of the map, and you're in the side door on the gun. You can't be hurt
// and you can't lose here; it's the last stretch, earned. Hold click to fire where you aim; the gun heats as it fires
// and locks up for a moment if you hold it too long. The dead pour out of the streets under you, and twice on the
// way there are survivors in the open with the dead closing on them: whoever is still standing when you have flown
// past made it, and the convoy picks them up. The end screen counts what you did from the door.
import { GS } from '../core/gs.js';
import { TAU, angDiff, clamp, d2, damp, lerp, rand } from '../core/util.js';
import { MH, MW, TILE, WH, WW, grid } from '../world/map.js';
import { dijk, query } from '../world/nav.js';
import { noise, playR, playS } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { cam } from './state.js';
import { mouse } from '../core/input.js';
import { ZOOM } from '../render/sprites.js';
import { makeEnemy } from '../actors/enemies.js';
import { makeSurvivor } from '../actors/backups.js';
import { dust, floatText, part, shake, sparks } from '../render/effects.js';
import { hurtEnemy, releaseGrab } from './combat.js';
import { banner } from './waves.js';
import { showStreak } from '../ui/callouts.js';

const LIFT = 3.2, // seconds rising off the landing zone
  SPEED = 115, // px/s along the route: a low, slow pass, not a getaway
  RIDE_Z = 230;
const open = (x, y) => {
  const tx = Math.floor(x / TILE),
    ty = Math.floor(y / TILE);
  return tx > 1 && ty > 1 && tx < MW - 2 && ty < MH - 2 && !grid[ty * MW + tx];
};
// the route: from the landing zone in over the middle of the town, across to the far side, and out past the edge
function route(e) {
  const cx = WW / 2,
    cy = WH / 2,
    a = Math.atan2(cy - e.y, cx - e.x),
    side = Math.random() < 0.5 ? -1 : 1,
    p1 = [cx + Math.cos(a + (side * Math.PI) / 2) * 260, cy + Math.sin(a + (side * Math.PI) / 2) * 260],
    p2 = [cx + Math.cos(a) * 700, cy + Math.sin(a) * 700],
    b = a - side * 0.35,
    p3 = [p2[0] + Math.cos(b) * 2600, p2[1] + Math.sin(b) * 2600]; // well past any edge
  const pts = [[e.x, e.y], p1, p2, p3],
    segs = [];
  let L = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    segs.push({ a: pts[i], b: pts[i + 1], l, s: L });
    L += l;
  }
  return { segs, L };
}
const along = (R, s) => {
  s = clamp(s, 0, R.L);
  for (const g of R.segs)
    if (s <= g.s + g.l) {
      const k = (s - g.s) / (g.l || 1);
      return [lerp(g.a[0], g.b[0], k), lerp(g.a[1], g.b[1], k), Math.atan2(g.b[1] - g.a[1], g.b[0] - g.a[0])];
    }
  const g = R.segs[R.segs.length - 1];
  return [g.b[0], g.b[1], Math.atan2(g.b[1] - g.a[1], g.b[0] - g.a[0])];
};
// a spot in the open near a point: for survivors and for the dead coming out of the streets
function spotNear(x, y, r0, r1) {
  for (let k = 0; k < 40; k++) {
    const a = rand(0, TAU),
      r = rand(r0, r1),
      px = x + Math.cos(a) * r,
      py = y + Math.sin(a) * r;
    if (open(px, py) && open(px + 20, py) && open(px - 20, py) && open(px, py + 20) && open(px, py - 20))
      return [px, py];
  }
  return null;
}
export function startRide(e) {
  const R = route(e);
  R.Lmap = R.L;
  for (let s = 0; s < R.L; s += 20) {
    const [x, y] = along(R, s);
    if (x < 60 || y < 60 || x > WW - 60 || y > WH - 60) {
      R.Lmap = s;
      break;
    }
  } // how far along the route the map ends
  e.ride = {
    t: 0,
    s: 0,
    R,
    heat: 0,
    over: 0,
    cd: 0,
    kills: 0,
    saved: 0,
    lost: 0,
    spawnT: 0,
    groups: [],
    done: 0,
  };
  // two groups of survivors in the open along the way
  for (const f of [0.3, 0.64]) {
    const [x, y] = along(R, R.Lmap * f),
      sp = spotNear(x, y, 60, 200) || spotNear(x, y, 60, 360);
    if (!sp) continue;
    const civ = [];
    for (let i = 0; i < 3; i++) {
      const s = makeSurvivor(sp[0] + rand(-22, 22), sp[1] + rand(-22, 22));
      s.hp = s.max = 110 + 8 * GS.wave;
      s.gun = 'pistol';
      civ.push(s);
    }
    e.ride.groups.push({ x: sp[0], y: sp[1], s: R.Lmap * f, civ, on: false, done: false, spawned: 0 });
  }
  GS.P.ride = true;
  GS.P.inv = 1e9;
  GS.P.reload = 0;
  GS.P.vx = GS.P.vy = 0;
  banner('Wheels up', 'You are on the door gun · hold click to fire, let it cool when it glows', false);
  shake(0.12);
}
export const rideKills = e => (e && e.ride ? e.ride.kills : 0);
// one frame of the ride; returns true when the chopper is clear of the map and the run can end
export function rideTick(e, dt) {
  const r = e.ride;
  r.t += dt;
  // the flight: up off the pad, then along the route, climbing as it goes
  if (r.t < LIFT) {
    const k = r.t / LIFT,
      kk = k * k * (3 - 2 * k);
    e.z = RIDE_Z * kk;
    const [, , a] = along(r.R, 1);
    e.ha += angDiff(e.ha, a) * damp(1.5, dt);
  } else {
    r.s += SPEED * dt * Math.min(1, (r.t - LIFT) / 1.5);
    const [x, y, a] = along(r.R, r.s);
    e.hx = x;
    e.hy = y;
    e.ha += angDiff(e.ha, a) * damp(2, dt);
    e.z = RIDE_Z + Math.min(140, Math.max(0, r.s - r.R.L * 0.7) * 0.25) + Math.sin(r.t * 0.8) * 6;
  }
  // you go with it: in the door, above the street it is flying over
  const P = GS.P;
  P.x = e.hx;
  P.y = e.hy;
  P.vx = P.vy = 0;
  P.inv = 1e9;
  P.hp = Math.max(P.hp, 1);
  if (P.held) releaseGrab(0); // nothing on the ground holds on to you up here
  // rotor wash on the ground while it is low
  if (e.z < 160 && Math.random() < dt * 24) {
    const a = rand(0, TAU),
      rr = rand(30, 90);
    part({
      k: 2,
      x: e.hx + Math.cos(a) * rr,
      y: e.hy + Math.sin(a) * rr,
      vx: Math.cos(a) * rand(120, 220),
      vy: Math.sin(a) * rand(120, 220),
      life: rand(0.8, 1.4),
      max: 1.4,
      size: rand(0.6, 1),
      grow: 1.6,
      drag: 1.6,
      rot: rand(0, TAU),
      vr: rand(-2, 2),
      c: [0.42, 0.42, 0.4],
    });
  }
  doorGun(e, r, dt);
  pourOut(e, r, dt);
  groups(e, r, dt);
  // clear of the map: the end
  const off = e.hx < -120 || e.hy < -120 || e.hx > WW + 120 || e.hy > WH + 120;
  if ((off || r.s >= r.R.L) && !r.done) {
    r.done = 1;
    for (const g of r.groups)
      if (!g.done) {
        g.done = true;
        const n = g.civ.filter(s => s.hp > 0).length;
        r.saved += n;
        r.lost += g.civ.length - n;
      } // still standing as you leave: they made it
    return true;
  }
  return false;
}
// the gun in the side door: where you aim, while you hold it, until it overheats
function doorGun(e, r, dt) {
  r.cd -= dt;
  if (r.over > 0) {
    r.over -= dt;
    r.heat = Math.max(0, r.heat - dt * 0.7);
    if (r.over <= 0) r.heat = 0.35;
  } else if (!mouse.down) r.heat = Math.max(0, r.heat - dt * 0.55);
  if (!mouse.down || r.over > 0 || r.cd > 0 || r.t < LIFT * 0.6) return;
  r.cd = 0.072;
  r.heat += 0.028;
  const gx = e.hx - Math.sin(e.ha) * 18,
    gy = e.hy - e.z * 0.35 + Math.cos(e.ha) * 18,
    sp = 10 + r.heat * 26,
    tx = cam.x + mouse.x / ZOOM + rand(-sp, sp),
    ty = cam.y + mouse.y / ZOOM + rand(-sp, sp);
  e.tr.push({ x0: gx, y0: gy, x1: tx, y1: ty, t: 0.07 });
  if (!playS('lmg', 0.4, 0.88, 0, 0.45)) noise(0.06, 0.12, 2200, 500, 'bandpass');
  let best = null,
    bd = 30 * 30;
  query(tx, ty, 40, z => {
    if (z.dead || z.dying !== undefined || z.type === 'queen') return;
    const dd = d2(z.x, z.y, tx, ty);
    if (dd < bd) {
      bd = dd;
      best = z;
    }
  });
  if (best) {
    hurtEnemy(best, 46 + 2 * GS.wave, false, tx - gx, ty - gy, 1.3, 'gunner');
    if (best.dead || best.hp <= 0 || best.dying !== undefined) r.kills++;
  } // only what the door gun drops counts as its kills
  else {
    dust(tx, ty, 2, 50, 0.6, 0.5);
    sparks(tx, ty, [1, 0.8, 0.5], 2, 140);
  }
  if (r.heat >= 1) {
    r.over = 1.5;
    noise(0.6, 0.08, 6000, 3000, 'highpass');
    floatText(GS.P.x, GS.P.y - 60, 'Overheated', '#ff8a5a', 15);
  } // the barrel glows and the gun locks up a moment
}
// the dead coming out of the streets under you, ahead of the chopper, running
function pourOut(e, r, dt) {
  if (r.t < LIFT) return;
  r.spawnT -= dt;
  if (r.spawnT > 0 || GS.enemies.length > 150) return;
  r.spawnT = 0.28;
  const [ax, ay] = along(r.R, r.s + 380),
    sp = spotNear(ax, ay, 120, 420);
  if (!sp) return;
  const n = 2 + ((Math.random() * 3) | 0);
  for (let i = 0; i < n; i++) {
    const z = makeEnemy(Math.random() < 0.08 ? 'beetle' : 'skitter', sp[0] + rand(-16, 16), sp[1] + rand(-16, 16));
    z.emerge = 0.6;
    z.aw = 9;
    if (Math.random() < 0.6) {
      z.run = true;
      z.sp *= 2;
    }
  }
  dust(sp[0], sp[1], 4, 50, 1, 1);
}
// survivors in the open: the dead close in as you come; cover them until you are past
function groups(e, r, dt) {
  for (const g of r.groups) {
    if (g.done) continue;
    const ahead = g.s - r.s;
    if (!g.on && ahead < 950) {
      g.on = true;
      {
        const tx = Math.floor(g.x / TILE),
          ty = Math.floor(g.y / TILE),
          fl = new Uint16Array(MW * MH);
        dijk(fl, [ty * MW + tx], false);
        g.lure = { x: g.x, y: g.y, alarm: 1e9, flare: true, flow: fl };
      } // one lure for the group, with its own way through the streets
      showStreak('Survivors below', 'Cover them as you go over · keep the dead off them', true);
      for (let i = 0; i < 12; i++) {
        const sp = spotNear(g.x, g.y, 300, 460);
        if (!sp) continue;
        const z = makeEnemy('skitter', sp[0], sp[1]);
        z.emerge = 0.7;
        z.aw = 9;
        z.civT = g; // these go for the survivors
        if (Math.random() < 0.3) {
          z.run = true;
          z.sp *= 1.6;
        }
      }
    }
    if (!g.on) continue;
    for (const s of g.civ) {
      s.hurt = Math.max(0, (s.hurt || 0) - dt); // the flash of a hit fades
      if (s.hp <= 0) continue;
      let near = null,
        nd = 1e12;
      query(s.x, s.y, 60, z => {
        if (z.dead || !(z.emerge >= 1)) return;
        const dd = d2(z.x, z.y, s.x, s.y);
        if (dd < nd) {
          nd = dd;
          near = z;
        }
        if (dd < (z.r + s.r + 6) ** 2 && z.dmg > 0) {
          s.hp -= z.dmg * dt * 0.9;
          s.hitT = (s.hitT || 0) - dt;
          if (s.hitT <= 0) {
            s.hitT = 0.45;
            s.hurt = 0.1;
          } // a flash for each blow, not a steady glare
        }
      });
      if (near) s.aimA = s.bodyA = Math.atan2(near.y - s.y, near.x - s.x);
      s.cd = (s.cd || rand(0, 0.5)) - dt;
      if (s.cd <= 0) {
        s.cd = rand(0.5, 0.75);
        let tg = null,
          td = 260 * 260;
        query(s.x, s.y, 260, z => {
          if (z.dead || !(z.emerge >= 1)) return;
          const dd = d2(z.x, z.y, s.x, s.y);
          if (dd < td) {
            td = dd;
            tg = z;
          }
        });
        if (tg) {
          s.aimA = s.bodyA = Math.atan2(tg.y - s.y, tg.x - s.x);
          e.tr.push({ x0: s.x, y0: s.y - 8, x1: tg.x, y1: tg.y, t: 0.07 });
          playR('pistol', 0.22, s.x, s.y, 1);
          hurtEnemy(tg, 12 + GS.wave, false, tg.x - s.x, tg.y - s.y, 0.6, 'buddy');
        }
      } // they fight back with what they have
      if (s.hp <= 0) {
        sparks(s.x, s.y, [0.5, 0.05, 0.04], 10, 160);
        sfx.growl(s.x, s.y);
      }
    }
    // the ones sent at them run for them, not for you
    for (const z of GS.enemies)
      if (z.civT === g && !z.dead) {
        const t = g.civ.find(s => s.hp > 0);
        if (t) {
          z.lure = g.lure;
          z.aw = 0;
        } else {
          z.civT = null;
          if (z.lure === g.lure) z.lure = null;
        }
      }
    if (ahead < -650 || !g.civ.some(s => s.hp > 0)) {
      g.done = true;
      const n = g.civ.filter(s => s.hp > 0).length;
      r.saved += n;
      r.lost += g.civ.length - n;
      floatText(
        g.x,
        g.y - 50,
        n ? `${n} of ${g.civ.length} made it` : 'None of them made it',
        n ? '#c8e6a0' : '#ff6a5a',
        18
      );
      if (n) sfx.heal();
      for (const z of GS.enemies)
        if (z.civT === g) {
          z.civT = null;
          if (z.lure === g.lure) z.lure = null;
        }
      if (g.lure) g.lure.alarm = 0;
    }
  }
}
export const rideCiv = () => {
  const e = GS.evac;
  if (!e || !e.ride) return [];
  const out = [];
  for (const g of e.ride.groups) if (g.on || g.s - e.ride.s < 1100) for (const s of g.civ) if (s.hp > 0) out.push(s);
  return out;
};
