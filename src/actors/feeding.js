/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The dead feeding. A few of the town's own lie dead in each place, where they were caught: by a car's door, on the
// pavement. One of the dead that hasn't noticed you, coming by one of them (or one of your people who bled out), goes
// down on its knees over the body and feeds, its head down: so it sees you only close (FEED.sight of how far it
// would), though it hears as well as ever. It sees you, hears a shot, is hit: it gets up off its knees (FEED.rise)
// and comes. Two at most to a body; a body fed on long enough is left (its bones picked: nothing to come back to).
import { PEOPLE } from '../core/scale.js';
import { GS } from '../core/gs.js';
import { TAU, angDiff } from '../core/util.js';
import { HLOOK } from '../render/draw-player.js';
import { NPC_TINTS } from './backups.js';
import { cars } from '../world/map.js';
import { blockPt, los } from '../world/nav.js';
import { sfx } from '../audio/sfx.js';
import { pool } from '../render/effects.js';
import { BLOOD } from '../render/draw-enemies.js';

export const FEED = {
  near: 170, // how far off one comes to a body it passes (8 m; the street's units, 20 to the metre)
  sight: 0.4, // head down: how much of its sight it keeps
  eat: [18, 45], // seconds at it, before it gets up and moves on
  rise: 1.1, // seconds getting up off its knees (as recorded)
  reach: 14, // its knees from the body's middle (its hands at the body)
  chest: 12, // the body's chest from where it stood
  left: 90, // seconds of feeding a body takes before it's left alone
};
export const victims = [];
// a small hash, so placing them doesn't draw on the game's own random numbers (the same place, the same dead)
const hs = (i, k) => {
  const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
// a few of the town's dead, each by a car (caught getting in, or out) or else on the pavement nearby; drawn as your
// people who fell are (lying as the recorded fall leaves them), but unarmed and in the clothes they died in
export function placeVictims(seed = 1) {
  victims.length = 0;
  const C = cars.filter(c => !c.burnt && !c.truck && !c.tanker && !c.dead),
    n = Math.min(C.length, 3 + Math.floor(hs(seed, 1) * 3));
  for (let i = 0, t = 0; victims.length < n && t < 40; t++) {
    const c = C[Math.floor(hs(seed + t, 2) * C.length)];
    if (victims.some(v => Math.hypot(v.x - c.x, v.y - c.y) < 400)) continue;
    const side = hs(seed + t, 3) < 0.5 ? 1 : -1,
      along = (hs(seed + t, 4) - 0.5) * 40,
      out = 19 + 16 + hs(seed + t, 5) * 14,
      x = c.x + Math.cos(c.a) * along - Math.sin(c.a) * out * side,
      y = c.y + Math.sin(c.a) * along + Math.cos(c.a) * out * side;
    if (blockPt(x, y) || blockPt(x + 18, y) || blockPt(x - 18, y)) continue;
    victims.push({
      x,
      y,
      vx: 0,
      vy: 0,
      r: 14 * PEOPLE,
      hp: 0,
      max: 100,
      moveA: 0,
      bodyA: hs(seed + t, 6) * TAU,
      aimA: 0,
      stride: 0,
      strideAmp: 0,
      recoil: 0,
      gun: 'pistol',
      unarmed: true,
      swap: 0,
      reload: 0,
      inv: 0,
      dashT: 0,
      hurt: 0,
      ant: {},
      look: ((HLOOK[GS.RUN?.hero] || 0) + 1 + Math.floor(hs(seed + t, 7) * 2)) % 3, // (not dressed as you are)
      tint: NPC_TINTS[1 + Math.floor(hs(seed + t, 8) * (NPC_TINTS.length - 1))],
      cd: 0,
      npc: true,
      gone: true,
      victim: true,
      id: 9700 + 2 * i++,
      _deadT: -99, // (fallen long since: lying still, as the recorded fall leaves them)
      eaten: 0,
      pooled: false,
    });
    const v = victims[victims.length - 1];
    if (blockPt(...spotAt(v, 0)) && blockPt(...spotAt(v, 1))) {
      victims.pop(); // (nowhere beside it to kneel: wedged by the car)
      i--;
    }
  }
}
// a body one of the dead can still come and kneel at
export const canKneel = b => !(b.eaten > FEED.left) && freeSlot(b) >= 0;
// the bodies there are to feed on
const bodies = () => (GS.fallen?.length ? victims.concat(GS.fallen) : victims);
// a body's two places to kneel: the one free (a feeder gone, killed or up and away, frees its place), or -1
const held = (b, k) => {
  const e = b[k ? 'slot1' : 'slot0'];
  return !!e && !e.dead && !!e.feed && e.feed.b === b;
};
// (and somewhere to kneel: not in the car it lies by)
const open = (b, k) => !held(b, k) && !blockPt(...spotAt(b, k));
const freeSlot = b => (open(b, 0) ? 0 : open(b, 1) ? 1 : -1);
// where a feeder kneels at a body: at its side, off its middle, facing it
// (its chest: the body fell back from where it stood, its head away from the way it faced)
function spotAt(b, k) {
  const ba = b.bodyA || 0,
    cx = b.x - Math.cos(ba) * FEED.chest,
    cy = b.y - Math.sin(ba) * FEED.chest,
    a = ba + (k ? Math.PI / 2 : -Math.PI / 2) + (k ? -0.25 : 0.25),
    x = cx + Math.cos(a) * FEED.reach,
    y = cy + Math.sin(a) * FEED.reach;
  return [x, y, a + Math.PI];
}
export const canFeed = e =>
  e.type === 'skitter' && !e.kind && !e.crawl && !e.half && !e.run && !e.big && !e.shield && !e.mark && e.emerge >= 1;
// once a frame for one of the dead that's unaware of you, with nothing else to go for: a body to feed on? it's
// [x, y] to walk to (going), or 'eat' (there and feeding), or null
export function feedTick(e, dt) {
  let f = e.feed;
  if (!f) {
    if (!canFeed(e) || Math.random() > dt * 2) return null; // (passing one, it soon notices)
    let best = null,
      bd = FEED.near ** 2;
    for (const b of bodies()) {
      if (!canKneel(b)) continue;
      const d = (b.x - e.x) ** 2 + (b.y - e.y) ** 2;
      if (d < bd && los(e.x, e.y, b.x, b.y)) {
        bd = d;
        best = b;
      }
    }
    if (!best) return null;
    const k = freeSlot(best);
    best[k ? 'slot1' : 'slot0'] = e;
    const [x, y, a] = spotAt(best, k);
    f = e.feed = {
      b: best,
      k,
      x,
      y,
      a,
      st: 'go',
      t: 0,
      dur: FEED.eat[0] + Math.random() * (FEED.eat[1] - FEED.eat[0]),
    };
  }
  f.t += dt;
  if (f.st === 'go') {
    const d = Math.hypot(f.x - e.x, f.y - e.y);
    if (f.t > 12) return stopFeed(e), null; // (it can't get to it)
    if (d < 4) {
      f.st = 'eat';
      f.t = 0;
    } else return [f.x, f.y];
  }
  // feeding: held at its body, its head down at it, now and then a wet tearing; the blood under it spreading
  e.feedA = f.a;
  f.b.eaten = (f.b.eaten || 0) + dt;
  if (!f.b.pooled && f.t > 2) {
    f.b.pooled = true;
    pool(f.b.x, f.b.y, 1.3, BLOOD);
  }
  if (Math.random() < dt * 0.45) sfx.feed(e.x, e.y);
  if (f.t > f.dur) return stopFeed(e, true), null;
  return 'eat';
}
// it gets up off the body: to come for you (or, fed, to amble on)
export function stopFeed(e, done = false) {
  const f = e.feed;
  if (!f) return;
  e.feed = null;
  if (f.st === 'eat') {
    e.riseT = FEED.rise;
    if (!done) sfx.growl(e.x, e.y);
  }
}
// how far it sees, kneeling at a body
export const feedSight = e => (e.feed && e.feed.st === 'eat' ? FEED.sight : 1);
export const feeding = e => !!e.feed && e.feed.st === 'eat';
// facing toward the body it's kneeling at
export const feedFace = (e, a) => (feeding(e) ? e.a + angDiff(e.a, e.feedA) : a);
