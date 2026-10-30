/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The horde: on a horde night one huge pack of the dead comes in off the edge of the map as a single moving mass and
// drifts through the streets toward wherever you are, at a walk. You can see it coming on the radar and pick where to
// meet it. The moment it has you (it sees you up close, or you fire into it), the whole mass turns and runs you down,
// and it doesn't let go. It flows like water: one shared route for all of it, spreading into the side streets when
// the main one clogs. Kill every last one and the convoy drops supplies.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, clamp, d2, pick, rand, angDiff } from '../core/util.js';
import { MH, MW, TILE, WH, WW, grid } from '../world/map.js';
import { dijk, flow } from '../world/nav.js';
import { MUS } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { showStreak } from '../ui/callouts.js';
import { radio } from '../audio/radio.js';
import { makeElite, makeEnemy } from '../actors/enemies.js';
import { flashLight, shake } from '../render/effects.js';
import { TW } from './districts.js';
import { dropCrate } from './combat.js';
import { bump } from './challenges.js';

GS.horde = null;
export const hordeSize = w =>
  GS.RUN && GS.RUN.hm
    ? Math.min(400, 130 + 34 * w) // Horde Mode: bigger every wave, to a cap the frame rate can carry
    : Math.round((w <= 4 ? 200 : w <= 8 ? 250 : w <= 12 ? 300 : 340) * (TW('horde') ? 1.2 : 1));
const DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
const dirName = a => DIRS[Math.round((((a % TAU) + TAU) % TAU) / (TAU / 8)) % 8];
// where it comes in: open ground near the map's edge that connects to you, as far from you as the map allows
function entry(away) {
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
      d =
        d2(x, y, P.x, P.y) *
        rand(0.8, 1) *
        (away && Math.abs(angDiff(Math.atan2(y - P.y, x - P.x), away)) < 1.6 ? 0.05 : 1); // a second column comes from another side
    if (d > bd) {
      bd = d;
      best = [x, y];
    }
  }
  return best || [clamp(P.x + 1400, 4 * TILE, WW - 4 * TILE), clamp(P.y, 4 * TILE, WH - 4 * TILE)];
}
// the point it is walking to, and the shared route there (crowd-aware, so it fans out round a clog)
const newLure = () => ({ x: 0, y: 0, alarm: 1e9, horde: true, flow: new Uint16Array(MW * MH) });
function aim(H, x, y, L = H.lure) {
  const tx = clamp(Math.floor(x / TILE), 1, MW - 2),
    ty = clamp(Math.floor(y / TILE), 1, MH - 2),
    seeds = [];
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) if (!grid[(ty + j) * MW + tx + i]) seeds.push((ty + j) * MW + tx + i);
  if (!seeds.length) return;
  L.x = (tx + 0.5) * TILE;
  L.y = (ty + 0.5) * TILE;
  dijk(L.flow, seeds, true);
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
    startT: GS.RUN.hm && GS.wave === 1 ? 40 : 14, // the first wave of Horde Mode gives you time to lay the kit
    roamT: 0,
    reT: 0,
    growlT: 2,
    done: false,
    x: 0,
    y: 0,
  };
  GS.horde.lure = newLure();
}
function arrive(H) {
  H.arriveT = GS.time;
  const [x, y] = entry();
  H.x = x;
  H.y = y;
  H.a = Math.atan2(y - GS.P.y, x - GS.P.x);
  H.ents = [[x, y]];
  if (GS.RUN.hm ? GS.wave >= 5 : GS.wave >= 11) {
    const e2 = entry(H.a);
    H.ents.push(e2);
    H.a2 = Math.atan2(e2[1] - GS.P.y, e2[0] - GS.P.x);
  } // late hordes split: two masses from two sides, meeting on you
  H.gather = H.ents.map(([ex, ey]) => {
    const L = newLure();
    aim(H, ex, ey, L);
    return L;
  }); // it masses at the edge of the map first, then moves off all together
  H.side = Math.random() < 0.5 ? -1 : 1;
  showStreak(
    'Horde',
    `${H.n} of them, coming in from the ${dirName(H.a)}${H.ents.length > 1 ? ` and the ${dirName(H.a2)}` : ''} · watch the radar and pick your ground`,
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
      if (e.lure && e.lure.horde) e.lure = null;
      e.aw = Math.max(e.aw || 0, 6);
      sprint(e);
    }
  showStreak('It has you', 'The whole horde is coming · keep moving, pick a choke point', true);
  MUS.sting = true;
  MUS.floor = 0.9;
  MUS.floorT = GS.time + 30;
  sfx.rumble(H.x, H.y);
}
function member(H) {
  const [ex, ey] = H.ents[H.spawned % H.ents.length],
    x = ex + rand(-40, 40),
    y = ey + rand(-40, 40),
    brute = (GS.RUN.hm ? GS.wave >= 3 : GS.wave >= 8) && H.spawned % 40 === 20, // later hordes carry brutes in them
    e = makeEnemy(brute ? 'beetle' : 'skitter', x, y);
  if (!brute && GS.wave >= 5 && Math.random() < 0.04) makeElite(e);
  if (brute) {
    e.emerge = 1;
    e.horde = true;
    if (H.alert) e.aw = 6;
    else e.lure = H.moving ? H.lure : H.gather[(H.spawned - 1) % H.gather.length];
    return e;
  }
  e.emerge = 1;
  e.horde = true;
  e.hp *= GS.RUN.hm ? 0.8 + 0.05 * GS.wave : 0.8;
  e.maxHp = e.hp;
  e.dmg *= GS.RUN.hm ? 1 + 0.05 * GS.wave : 0.9; // one of a horde goes down a little easier than a lone one: it is the mass that kills you
  if (H.alert) {
    e.aw = 6;
    sprint(e);
  } else e.lure = H.moving ? H.lure : H.gather[(H.spawned - 1) % H.gather.length];
  return e;
}
// once it has you, every one of them sprints: the horde arrives as one wall, not a straggling line
function sprint(e) {
  if (!e.run) {
    e.run = true;
    e.sp *= 2.05;
  }
  e.sp *= rand(0.95, 1.08) * (GS.RUN.hm ? 1 + 0.015 * GS.wave : 1);
}
const CHAIN_GAP = 2.5; // seconds between kills before the chain breaks
const CHAIN_CALL = { 25: 'Twenty-five', 50: 'Fifty', 100: 'A hundred', 150: 'A hundred and fifty', 200: 'Two hundred' };
export function hordeKilled(e, src) {
  const H = GS.horde;
  if (!H || !e.horde) return;
  H.killed++;
  // how it went: fire, the wire, blasts, and the kill chain while the mass is on you
  if (src === 'fire') H.fire = (H.fire || 0) + 1;
  else if (src === 'wire') H.wire = (H.wire || 0) + 1;
  else if (src === 'boom' || src === 'shell' || src === 'frag') H.boom = (H.boom || 0) + 1;
  H.chain = GS.time - (H.lastK ?? -9) < CHAIN_GAP ? (H.chain || 0) + 1 : 1;
  H.lastK = GS.time;
  H.best = Math.max(H.best || 0, H.chain);
  if (CHAIN_CALL[H.chain]) {
    showStreak(`${H.chain} chain`, `${CHAIN_CALL[H.chain]} without a breath · keep it going`);
    sfx.streak && sfx.streak();
  }
  GS.score += Math.min(50, H.chain) * 2; // the chain pays: every kill in it is worth more
  if (H.killed >= H.n && !H.done) {
    H.done = true;
    bump('hordes');
    statMaxH('hordeBest', H.best);
    const pay = Math.round(H.n / 4),
      secs = Math.round(GS.time - (H.arriveT || GS.time)),
      bits = [
        `${H.n} killed in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
        H.fire ? `${H.fire} by fire` : '',
        H.wire ? `${H.wire} on the wire` : '',
        H.boom ? `${H.boom} in blasts` : '',
        H.blast >= 5 ? `biggest blast ${H.blast}` : '',
        `best chain ${H.best}`,
        `+${pay} scrap`,
      ].filter(Boolean);
    GS.runSeeds += pay;
    // the last one falls in slow motion
    GS.slowmo = 1.6;
    GS.hitstop = Math.max(GS.hitstop, 0.12);
    flashLight(e.x, e.y, 260, [1.4, 1.1, 0.8], 0.6);
    shake(0.25);
    GS.later.push({ t: 0.9, fn: () => showStreak('Horde down', bits.join(' · '), true) });
    GS.later.push({
      t: 1.2,
      fn: () => radio('Supply crate down. Ammo and gear inside, no gun. Grab it while it is quiet.'),
    });
    GS.later.push({ t: 1.4, fn: () => dropCrate() });
    hordeBox(false);
  }
}
// biggest single blast tonight (explode tells us after each one)
export function hordeBlast(n) {
  if (GS.horde && !GS.horde.done) GS.horde.blast = Math.max(GS.horde.blast || 0, n);
}
function statMaxH(k, v) {
  GS.meta.stats = GS.meta.stats || {};
  GS.meta.stats[k] = Math.max(GS.meta.stats[k] || 0, v);
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
  // it walks in off the edge as a column, two dozen a second, packed close
  if (H.spawned < H.n) {
    H.acc = (H.acc || 0) + dt * 40;
    while (H.acc >= 1 && H.spawned < H.n) {
      H.acc--;
      H.spawned++;
      member(H);
    }
  } else if (!H.moving) {
    H.moving = true;
    for (const e of GS.enemies) if (e.horde && !e.dead && e.lure && e.lure.horde) e.lure = H.lure;
    pass(H);
    H.reT = 10;
    sfx.rumble(H.x, H.y);
  } // all of it is here: it moves off
  let cx = 0,
    cy = 0,
    m = 0;
  for (const e of GS.enemies)
    if (e.horde && !e.dead) {
      m++;
      cx += e.x;
      cy += e.y;
      if (H.alert) e.aw = Math.max(e.aw || 0, 3);
      else if (!(e.lure && e.lure.horde) && e.aw > 0) H.woke = (H.woke || 0) + 1; // a shot or a glimpse of you pulled this one off the route
    }
  if (m) {
    H.x = cx / m;
    H.y = cy / m;
  } // where the mass is now: its middle
  if (!H.alert && H.moving) {
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
    if (H.roamT > 80) alertAll(H);
    H.growlT -= dt;
    if (H.growlT <= 0 && m) {
      H.growlT = rand(1.2, 2.4);
      const e = pick(GS.enemies.filter(e => e.horde && !e.dead));
      if (e) sfx.groan(e.x, e.y);
    } // you hear it before you see it
  }
  if (!H.alert && (H.woke || 0) >= 3) alertAll(H); // three of them have you: it all comes
  H.woke = 0;
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
    live = H.chain > 1 && GS.time - H.lastK < CHAIN_GAP,
    t = `${left} left` + (live ? ` · chain ${H.chain}` : '');
  if (el.dataset.t !== t) {
    el.dataset.t = t;
    $('hordeN').textContent = t;
    $('hordeFill').style.transform = `scaleX(${left / H.n})`;
  }
  el.classList.toggle('alert', H.alert);
}
