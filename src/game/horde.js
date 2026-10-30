/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The horde: on a horde night one huge pack of the dead comes in off the edge of the map as a single moving mass and
// drifts through the streets toward wherever you are, at a walk. You can see it coming on the radar and pick where to
// meet it. The moment it has you (it sees you up close, or you fire into it), the whole mass turns and runs you down,
// and it doesn't let go. It flows like water: one shared route for all of it, spreading into the side streets when
// the main one clogs. Kill every last one and the convoy drops supplies.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, clamp, d2, pick, rand } from '../core/util.js';
import { MH, MW, TILE, WH, WW, grid } from '../world/map.js';
import { dijk, flow } from '../world/nav.js';
import { MUS } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { showStreak } from '../ui/callouts.js';
import { radio } from '../audio/radio.js';
import { makeEnemy } from '../actors/enemies.js';
import { shake } from '../render/effects.js';
import { TW } from './districts.js';
import { dropCrate } from './combat.js';
import { bump } from './challenges.js';

GS.horde = null;
export const hordeSize = w => Math.round((w <= 4 ? 140 : w <= 8 ? 200 : w <= 12 ? 260 : 320) * (TW('horde') ? 1.2 : 1));
const DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const dirName = a => DIRS[Math.round((((a % TAU) + TAU) % TAU) / (TAU / 8)) % 8];
// where it comes in: open ground near the map's edge that connects to you, as far from you as the map allows
function entry() {
  const P = GS.P;
  let best = null,
    bd = -1;
  for (let k = 0; k < 160; k++) {
    const side = k % 4,
      u = rand(0.1, 0.9),
      tx = side === 0 ? 3 : side === 1 ? MW - 4 : Math.floor(u * MW),
      ty = side === 2 ? 3 : side === 3 ? MH - 4 : Math.floor(u * MH),
      i = ty * MW + tx;
    if (grid[i] || !(flow[i] < 65535)) continue;
    const x = (tx + 0.5) * TILE,
      y = (ty + 0.5) * TILE,
      d = d2(x, y, P.x, P.y) * rand(0.8, 1);
    if (d > bd) {
      bd = d;
      best = [x, y];
    }
  }
  return best || [clamp(P.x + 1400, 4 * TILE, WW - 4 * TILE), clamp(P.y, 4 * TILE, WH - 4 * TILE)];
}
// the point it is walking to, and the shared route there (crowd-aware, so it fans out round a clog)
function aim(H, x, y) {
  const tx = clamp(Math.floor(x / TILE), 1, MW - 2),
    ty = clamp(Math.floor(y / TILE), 1, MH - 2),
    seeds = [];
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) if (!grid[(ty + j) * MW + tx + i]) seeds.push((ty + j) * MW + tx + i);
  if (!seeds.length) return;
  H.lure.x = (tx + 0.5) * TILE;
  H.lure.y = (ty + 0.5) * TILE;
  dijk(H.lure.flow, seeds, true);
}
// roaming, it doesn't walk straight onto you: its route runs past you, a block or so to one side, closer each time
function pass(H) {
  const a = Math.atan2(H.y - GS.P.y, H.x - GS.P.x) + (H.side * Math.PI) / 2,
    off = Math.max(120, 420 - H.roamT * 4);
  aim(H, GS.P.x + Math.cos(a) * off, GS.P.y + Math.sin(a) * off);
}
export function planHorde() {
  const n = hordeSize(GS.wave);
  GS.horde = {
    n,
    spawned: 0,
    killed: 0,
    alert: false,
    startT: 14,
    roamT: 0,
    reT: 0,
    growlT: 2,
    done: false,
    x: 0,
    y: 0,
  };
  GS.horde.lure = { x: 0, y: 0, alarm: 1e9, horde: true, flow: new Uint16Array(MW * MH) };
}
function arrive(H) {
  const [x, y] = entry();
  H.x = x;
  H.y = y;
  H.a = Math.atan2(y - GS.P.y, x - GS.P.x);
  H.side = Math.random() < 0.5 ? -1 : 1;
  pass(H);
  showStreak(
    'Horde',
    `${H.n} of them, coming in from the ${dirName(H.a)} · watch the radar and pick your ground`,
    true
  );
  radio('Nine, big group breaking through on your ' + dirName(H.a) + ' side. Find a choke point.'); // a line Reyes has voiced
  sfx.rumble(GS.P.x + Math.cos(H.a) * 500, GS.P.y + Math.sin(H.a) * 500);
  shake(0.1);
  MUS.floor = 0.6;
  MUS.floorT = GS.time + 14;
  hordeBox(true);
}
function alertAll(H) {
  H.alert = true;
  for (const e of GS.enemies)
    if (e.horde && !e.dead) {
      if (e.lure === H.lure) e.lure = null;
      e.aw = Math.max(e.aw || 0, 6);
    }
  showStreak('It has you', 'The whole horde is coming · keep moving, pick a choke point', true);
  MUS.sting = true;
  MUS.floor = 0.9;
  MUS.floorT = GS.time + 30;
  sfx.rumble(H.x, H.y);
}
function member(H) {
  const x = H.x + rand(-40, 40),
    y = H.y + rand(-40, 40),
    e = makeEnemy('skitter', x, y);
  e.emerge = 1;
  e.horde = true;
  e.hp *= 0.55;
  e.maxHp = e.hp;
  e.dmg *= 0.75; // one of a horde goes down easy and hits light: it is the mass that kills you
  if (!e.run && Math.random() < 0.25) {
    e.run = true;
    e.sp *= 2.05;
    e.hp *= 0.85;
    e.maxHp = e.hp;
  } // most of a horde runs
  if (H.alert) e.aw = 6;
  else e.lure = H.lure;
  return e;
}
export function hordeKilled(e) {
  const H = GS.horde;
  if (!H || !e.horde) return;
  H.killed++;
  if (H.killed >= H.n && !H.done) {
    H.done = true;
    bump('hordes');
    GS.runSeeds += Math.round(H.n / 4);
    showStreak(
      'Horde down',
      `All ${H.n} of them · +${Math.round(H.n / 4)} scrap, the convoy is dropping supplies`,
      true
    );
    radio('Supply crate down. Ammo and gear inside, no gun. Grab it while it is quiet.');
    dropCrate();
    hordeBox(false);
  }
}
// it's still out there: the night can't end until it is dead
export const hordeLive = () => !!(GS.horde && !GS.horde.done);
export function tickHorde(dt) {
  const H = GS.horde;
  if (!H || H.done || GS.state !== 'play') return;
  if (H.startT > 0) {
    H.startT -= dt;
    if (H.startT <= 0) arrive(H);
    return;
  }
  // it walks in off the edge as a column, a dozen a second
  if (H.spawned < H.n) {
    H.acc = (H.acc || 0) + dt * 12;
    while (H.acc >= 1 && H.spawned < H.n) {
      H.acc--;
      H.spawned++;
      member(H);
    }
  }
  let cx = 0,
    cy = 0,
    m = 0;
  for (const e of GS.enemies)
    if (e.horde && !e.dead) {
      m++;
      cx += e.x;
      cy += e.y;
      if (H.alert) e.aw = Math.max(e.aw || 0, 3);
      else if (e.lure !== H.lure && !H.alert && e.aw > 0) H.woke = (H.woke || 0) + 1; // a shot or a glimpse of you pulled this one off the route
    }
  if (m) {
    H.x = cx / m;
    H.y = cy / m;
  } // where the mass is now: its middle
  if (!H.alert) {
    H.roamT += dt;
    H.reT -= dt;
    if (H.lure.heard) {
      const h = H.lure.heard;
      H.lure.heard = null;
      if (H.reT < 7) {
        H.reT = 10;
        aim(H, h.x + rand(-90, 90), h.y + rand(-90, 90));
      }
    } // a shot it hears: the whole mass turns toward it, still at a walk
    if (H.reT <= 0) {
      H.reT = 10;
      pass(H);
    } // it follows the scent: every ten seconds the route bends toward where you are now, to pass you close by
    if ((H.woke || 0) >= 3 || H.roamT > 80) alertAll(H);
    H.woke = 0;
    H.growlT -= dt;
    if (H.growlT <= 0 && m) {
      H.growlT = rand(1.2, 2.4);
      const e = pick(GS.enemies.filter(e => e.horde && !e.dead));
      if (e) sfx.groan(e.x, e.y);
    } // you hear it before you see it
  }
  hordeBox(true);
}
export function endHorde() {
  GS.horde = null;
  hordeBox(false);
}
// the counter under the night plate
function hordeBox(on) {
  const el = $('hordeBox');
  if (!el) return;
  const H = GS.horde;
  if (!on || !H || H.startT > 0) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const left = H.n - H.killed,
    t = `${left} left`;
  if (el.dataset.t !== t) {
    el.dataset.t = t;
    $('hordeN').textContent = t;
    $('hordeFill').style.transform = `scaleX(${left / H.n})`;
  }
  el.classList.toggle('alert', H.alert);
}
