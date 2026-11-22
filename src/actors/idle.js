/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The dead, doing nothing much. Away from you and not yet onto you, now and then one of them stops ambling your way
// and stands swaying where it is, its head going this way and that; or goes to a shop's window and beats on the glass
// at something it can see, or thinks it can; or shuffles round and round in a slow loop, as if it had forgotten what it
// was doing. A while of it (IDLE.dur), and it ambles on. Anything that has it notice you ends it.
// And one pinned under a car: its legs under the car's side, it can't get up and can't get out; it claws at the street
// (harder as you come near), and if you walk right by it takes your ankle. When it's the last of the night, or the car
// goes up, it drags itself out from under and comes on its hands.
import { GS } from '../core/gs.js';
import { GK } from '../core/scale.js';
import { rand } from '../core/util.js';
import { blockPt, los } from '../world/nav.js';
import { cars } from '../world/map.js';
import { windows } from '../render/blocks.js';
import { sfx } from '../audio/sfx.js';
import { makeEnemy } from './enemies.js';
import { knockWindow } from '../world/wear.js';

export const IDLE = {
  far: 380, // only this far from you (nearer, it's coming)
  rate: 0.05, // how often, a second, one unaware and ambling starts something (once in twenty seconds, about)
  dur: [10, 25], // seconds at it
  glass: 240, // a window this near, for it to go and beat on
};
export const canIdle = e =>
  (e.type === 'skitter' || e.type === 'mini') &&
  !e.kind &&
  !e.crawl &&
  !e.half &&
  !e.big &&
  !e.mark &&
  !e.lurk &&
  !e.feed &&
  e.emerge >= 1;
function windowNear(e) {
  if (!windows) return null;
  let best = null,
    bd = IDLE.glass ** 2;
  for (const w of windows) {
    if (w.broke) continue;
    const x = w.x,
      y = w.y - 13, // (up against it: its hands on the glass, half a metre off the wall)
      d = (x - e.x) ** 2 + (y - e.y) ** 2;
    if (d < bd && !blockPt(x, y) && los(e.x, e.y, x, y)) {
      bd = d;
      best = [x + rand(-8, 8), y, w];
    }
  }
  return best;
}
// once a frame for one of the dead that's unaware of you, with nothing else to go for: null (it ambles on), [x, y] to
// walk to, or { face } to stand where it is, facing that way
export function idleTick(e, dt, P) {
  let I = e.idle;
  if (!I) {
    if (!canIdle(e) || Math.random() > dt * IDLE.rate) return null;
    if ((e.x - P.x) ** 2 + (e.y - P.y) ** 2 < IDLE.far ** 2) return null;
    const r = Math.random(),
      w = r < 0.4 ? windowNear(e) : null,
      k = w ? 'glass' : r < 0.7 ? 'sway' : 'circle';
    I = e.idle = { k, t: 0, dur: rand(IDLE.dur[0], IDLE.dur[1]), a: e.a || 0, beatT: rand(0.3, 1) };
    if (w) [I.x, I.y, I.w] = w;
    if (k === 'circle') {
      I.r = rand(16, 24);
      I.ph = (e.a || 0) - Math.PI / 2;
      I.cx = e.x - Math.cos(I.ph) * I.r;
      I.cy = e.y - Math.sin(I.ph) * I.r;
      I.dir = Math.random() < 0.5 ? 1 : -1;
    }
  }
  I.t += dt;
  if (I.t > I.dur) return (e.idle = null);
  if (I.k === 'sway')
    // standing, swaying (its stance as recorded), its head and shoulders turning slowly one way and back
    return { face: I.a + Math.sin(I.t * 0.31) * 0.35 + Math.sin(I.t * 0.11) * 0.25 }; // (the sway itself is its pose's: fig3d.js)
  if (I.k === 'circle') {
    I.ph += I.dir * dt * 0.65; // (round in ten seconds or so)
    const x = I.cx + Math.cos(I.ph) * I.r,
      y = I.cy + Math.sin(I.ph) * I.r;
    if (blockPt(x, y)) return (e.idle = null);
    return [x, y];
  }
  // at a window: there, it beats on the glass with both fists, now and then
  if (I.w && I.w.broke) return (e.idle = null); // (someone else's broke it, or yours)
  if (Math.hypot(I.x - e.x, I.y - e.y) > (I.at ? 18 : 8)) {
    // (got there, a nudge doesn't take it away: only being pushed well off)
    I.at = false;
    if (I.t > 12) return (e.idle = null); // (can't get to it)
    return [I.x, I.y];
  }
  I.at = true;
  I.beatT -= dt;
  if (I.beatT <= 0) {
    I.beatT = Math.random() < 0.3 ? rand(0.3, 0.45) : rand(1.1, 2.2); // (sometimes twice quickly)
    sfx.glassBang(I.x, I.y - 12);
    I.n = (I.n || 0) + 1;
    if (knockWindow(I.w, e.x)) return (e.idle = null); // (it went: it stands there a moment, at a loss)
  }
  return { face: -Math.PI / 2 };
}
export const idleFace = fd => (fd && !Array.isArray(fd) && fd.face !== undefined ? fd.face : undefined);

// ---- pinned under a car ----
// how far from the car's middle its side is (a car is the street's size, 20 to the metre), and how far out from it
// the pinned one's middle lies (its legs back under the car)
const SIDE = 14,
  OUT = 6; // (its hips under the sill, so the car's side hides them; its chest and arms out in the street)
// in place of a lurker (the night's queue sends one): one pinned under a car out of your sight, if there's a car for it
export function makePinned(P) {
  const C = cars.filter(c => {
    if (c.dead || c.truck || c.tanker) return false;
    const d = Math.hypot(c.x - P.x, c.y - P.y);
    return d > 300 * GK && d < 900 * GK && !GS.enemies.some(e => e.pin && e.pin.c === c);
  });
  for (let t = 0; t < 10 && C.length; t++) {
    const c = C[Math.floor(Math.random() * C.length)],
      side = Math.random() < 0.5 ? 1 : -1,
      along = rand(-14, 10),
      ca = Math.cos(c.a),
      sa = Math.sin(c.a),
      out = SIDE + OUT,
      x = c.x + ca * along - sa * out * side,
      y = c.y + sa * along + ca * out * side,
      a = c.a + (side * Math.PI) / 2;
    // (room for its chest, its head and its reach, out from the car: where it lies itself is half under it)
    if ([12, 26, 40].some(r => blockPt(x + Math.cos(a) * r, y + Math.sin(a) * r))) continue;
    const e = makeEnemy('skitter', x, y);
    e.emerge = 1;
    e.run = false;
    e.crawl = true;
    e.sup = false;
    e.down = 0;
    e.fallA = a;
    e.lyG = 0;
    e.a = a;
    e.aw = 0;
    e.lurk = 'pin';
    e.pin = { c, x, y, a };
    e.hp *= 1.2;
    e.maxHp = e.hp;
    return e;
  }
  return null;
}
// once a frame: it stays where it's pinned, clawing; you right by, it takes your ankle (the lurker's grab: see
// enemy-ai.js); the last of the night, or its car gone up, and it drags itself free. True while it's still pinned
export function pinTick(e, dt, P) {
  const N = e.pin;
  if (!N) return false;
  const last = !GS.queue.length && !GS.enemies.some(o => o !== e && !o.dead && !o.lurk);
  if (N.c.dead || last) {
    e.pin = null;
    e.lurk = null;
    e.claw = 0;
    e.aw = 9;
    sfx.groan(e.x, e.y);
    return false;
  }
  if (e.lurk !== 'grab' && e.lurk !== 'pin') {
    e.lurk = 'pin'; // you tore free (or it let go): it's still pinned, and you have a moment to get clear
    e.regrab = 1.5;
  }
  e.x = N.x;
  e.y = N.y;
  e.vx = e.vy = e.kx = e.ky = 0;
  const d = Math.hypot(P.x - e.x, P.y - e.y);
  e.a = N.a; // (pinned at the hips, it can't turn: its arms reach out straight from under)
  e.claw = d < 120 * GK ? 1.3 : d < 300 * GK ? 0.7 : 0.15; // (scrabbling at the street, harder as you come)
  e.unaw = d > 300 * GK;
  if (d < 260 * GK && Math.random() < dt * 0.4) sfx.growl(e.x, e.y);
  return true;
}
export const pinned = e => !!e.pin;
