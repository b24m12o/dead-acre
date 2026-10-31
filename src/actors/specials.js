/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Three special infected, each asking for a different answer. They are the ordinary dead, changed:
//  · Climber: lean, pale, on all fours. Walls, fences and houses don't stop it: it goes straight over them at you.
//    Hiding behind a building is no longer safe. Fragile; shoot it the moment it drops off a wall.
//  · Spore: a swollen, yellowing walker. Kill it, or let it reach you, and it bursts into a cloud of spores: inside,
//    you can hardly see, you move slower and your aim swims. Kill it far away.
//  · Dragger: big, hunched, long in the arm. It goes for one of your people, knocks them down and drags them off into
//    the dark. Kill it before it gets away with them, or they are gone. With nobody to take, it takes you.
import { GS } from '../core/gs.js';
import { TAU, d2, rand } from '../core/util.js';
import { MW, TILE, grid } from '../world/map.js';
import { collide, steer } from '../world/nav.js';
import { sfx } from '../audio/sfx.js';
import { part, shake } from '../render/effects.js';
import { showStreak } from '../ui/callouts.js';
import { hurtPlayer, killEnemy } from '../game/combat.js';
import { saveMeta } from '../core/settings.js';
import { makeEnemy } from './enemies.js';

export const SPECIAL = {
  climb: { name: 'Climber', tip: 'Walls and houses don’t stop it · it comes straight over them' },
  spore: { name: 'Spore', tip: 'It bursts into a blinding cloud when it dies · kill it far away' },
  drag: { name: 'Dragger', tip: 'It drags your people off into the dark · kill it before it gets away' },
};
GS.spores = [];
export function resetSpecials() {
  GS.spores = [];
}
export function makeSpecial(kind, x, y) {
  const e = makeEnemy('skitter', x, y);
  e.kind = kind;
  e.shape = kind === 'climb' ? 'runner' : kind === 'spore' ? 'bloater' : 'drag';
  if (kind === 'climb') {
    e.v = 16;
    e.run = true;
    e.sp *= 1.85;
    e.hp *= 0.8;
  } else if (kind === 'spore') {
    e.v = 16; // bare, swollen, yellowing skin
    e.sp *= 0.7;
    e.hp *= 1.6;
    e.r *= 1.15;
  } else if (kind === 'drag') {
    e.hp *= 3.2;
    e.sp *= 1.25;
    e.sc = 1.28;
    e.r *= 1.25;
    e.dmg *= 1.2;
  }
  e.maxHp = e.hp;
  return e;
}
// the first time each turns up: what it is and what to do
export function specialTip(e) {
  if (!e.kind || e.tipped2 || !(e.los || e.fly) || GS.state !== 'play') return;
  const d = Math.hypot(e.x - GS.P.x, e.y - GS.P.y);
  if (d > 520) return;
  e.tipped2 = true;
  GS.meta.tips = GS.meta.tips || {};
  if (GS.meta.tips['sp_' + e.kind]) return;
  GS.meta.tips['sp_' + e.kind] = 1;
  saveMeta();
  showStreak(SPECIAL[e.kind].name, SPECIAL[e.kind].tip, true);
}
const wallAt = (x, y) => !!grid[Math.floor(y / TILE) * MW + Math.floor(x / TILE)];
// runs before the ordinary AI; returns true when it has moved the zombie itself this frame
export function specialTick(e, dt, p) {
  specialTip(e);
  if (e.kind === 'climb') {
    const dx = p.x - e.x,
      dy = p.y - e.y,
      d = Math.hypot(dx, dy) || 1,
      over = !e.los || wallAt(e.x, e.y);
    if ((e.aw > 0 || d < 700) && over && e.emerge >= 1) {
      if (!e.fly) sfx.groan(e.x, e.y);
      e.fly = true; // over the wall: drawn above the buildings, through nothing
      e.climbT = GS.time;
      const k = wallAt(e.x, e.y) ? 0.62 : 1;
      e.vx = (dx / d) * e.sp * k;
      e.vy = (dy / d) * e.sp * k;
      e.a = Math.atan2(dy, dx);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.anim = (e.anim || 0) + dt * 8;
      return true;
    }
    if (e.fly && !wallAt(e.x, e.y)) {
      e.fly = false;
      for (let i = 0; i < 4; i++)
        part({
          k: 2,
          x: e.x,
          y: e.y,
          vx: rand(-40, 40),
          vy: rand(-40, 40),
          life: 0.6,
          max: 0.6,
          size: 0.6,
          grow: 1,
          drag: 3,
          rot: rand(0, TAU),
          vr: 0,
        });
    } // down off the wall, in a puff of plaster dust
    return false;
  }
  if (e.kind === 'spore' && e.emerge >= 1 && d2(e.x, e.y, p.x, p.y) < 56 * 56) {
    killEnemy(e, 0, 'self');
    return true; // close enough: it splits open on you
  }
  if (e.kind === 'drag') return dragTick(e, dt, p);
  return false;
}
function dragTick(e, dt, p) {
  if (p.held === e) {
    dragPlayer(e, dt, p);
    return true;
  }
  // choose who to take: the nearest of your people standing, else you
  if (!e.prey || e.prey.gone || (e.prey !== p && !GS.buddies.includes(e.prey))) e.prey = null;
  if (!e.carry) {
    e.pickT = (e.pickT || 0) - dt;
    if (e.pickT <= 0) {
      e.pickT = 1;
      let best = null,
        bd = 700 * 700;
      for (const b of GS.buddies)
        if (!(b.down > 0)) {
          const dd = d2(b.x, b.y, e.x, e.y);
          if (dd < bd) {
            bd = dd;
            best = b;
          }
        }
      e.prey = best;
    }
    const b = e.prey;
    if (!b || e.emerge < 1) {
      if (
        e.emerge >= 1 &&
        !p.held &&
        !(p.dashT > 0) &&
        GS.time > (e.grabCd || 0) &&
        d2(e.x, e.y, p.x, p.y) < (e.r + p.r + 6) ** 2
      ) {
        p.held = e;
        e.grip = 1;
        e.gT = 0.3;
        e.grabCd = GS.time + 4;
        sfx.growl(e.x, e.y);
        shake(0.14);
        showStreak('Grabbed', 'It’s dragging you · roll to break free', true);
        return true;
      }
      return false; // nobody to take: it comes for you like any other
    }
    const [ux, uy, dist] = steer(e, b.x, b.y, null, true);
    e.vx = ux * e.sp;
    e.vy = uy * e.sp;
    e.a = Math.atan2(uy, ux);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    collide(e);
    if (dist < e.r + (b.r || 14) + 6) {
      b.hp = 0; // down: buddyHurt lays them out next tick
      e.carry = b;
      e.carryT = 0;
      sfx.growl(e.x, e.y);
      shake(0.1);
      showStreak('Dragged off', `${b.nm || 'One of your people'} · kill it before it gets away`, true);
    }
    return true;
  }
  // carrying: away from you, into the dark, with them behind it
  const b = e.carry;
  if (!GS.buddies.includes(b) || (e.carryT > 0.5 && !(b.down > 0))) {
    e.carry = null;
    return false;
  }
  e.carryT += dt;
  const ax = e.x - p.x,
    ay = e.y - p.y,
    al = Math.hypot(ax, ay) || 1,
    fx = e.x + (ax / al) * 400,
    fy = e.y + (ay / al) * 400,
    [ux, uy] = steer(e, fx, fy, null, true);
  e.vx = ux * e.sp * 0.72;
  e.vy = uy * e.sp * 0.72;
  e.a = Math.atan2(-uy, -ux); // walking backwards, hauling
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  collide(e);
  b.x = e.x - ux * 22;
  b.y = e.y - uy * 22;
  if (Math.random() < dt * 6)
    part({
      k: 2,
      x: b.x,
      y: b.y,
      vx: rand(-20, 20),
      vy: rand(-20, 20),
      life: 0.7,
      max: 0.7,
      size: 0.5,
      grow: 1,
      drag: 3,
      rot: rand(0, TAU),
      vr: 0,
      c: [0.35, 0.3, 0.26],
    });
  if (al > 760 || e.carryT > 13) {
    b.down = Math.min(b.down || 1, 0.02); // out of reach: they're gone
    b.gone = true;
    e.carry = null;
    showStreak('Taken', `${b.nm || 'They'} didn't come back`, true);
  }
  return true;
}
export function dropCarried(e) {
  if (e.carry) {
    e.carry = null;
    showStreak('Dropped', 'Get to them and get them up', true);
  }
}
// the dragger's grab on you: you're hauled, and hurt, until you roll free
export function dragPlayer(e, dt, p) {
  if (p.held !== e) return;
  const ax = e.x - p.x,
    ay = e.y - p.y,
    al = Math.hypot(ax, ay) || 1;
  e.x += (ax / al) * 26 * dt;
  e.y += (ay / al) * 26 * dt;
  p.x += (ax / al) * 26 * dt;
  p.y += (ay / al) * 26 * dt;
  e.gT = (e.gT || 0) - dt;
  if (e.gT <= 0) {
    e.gT = 0.6;
    hurtPlayer(4 + GS.wave * 0.4, e.x, e.y, 'a dragger');
  }
}
// a spore's death: the cloud
export function sporeBurst(e) {
  GS.spores.push({ x: e.x, y: e.y, r: 120, t: 7, max: 7 });
  sfx.groan(e.x, e.y);
  for (let i = 0; i < 26; i++) {
    const a = rand(0, TAU),
      s = rand(30, 150);
    part({
      k: 2,
      x: e.x,
      y: e.y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(2.5, 4),
      max: 4,
      size: rand(1, 1.6),
      grow: rand(1.2, 1.8),
      drag: 1.8,
      rot: rand(0, TAU),
      vr: rand(-0.5, 0.5),
      c: [0.62, 0.62, 0.36],
    });
  }
}
export function tickSpores(dt) {
  let inS = 0;
  for (const s of GS.spores) {
    s.t -= dt;
    const k = Math.min(1, s.t / 1.5);
    if (Math.random() < dt * 40 * k) {
      const a = rand(0, TAU),
        r = Math.sqrt(Math.random()) * s.r;
      part({
        k: 2,
        x: s.x + Math.cos(a) * r,
        y: s.y + Math.sin(a) * r,
        vx: rand(-12, 12),
        vy: rand(-16, 4),
        life: rand(1.8, 2.8),
        max: 2.8,
        size: rand(1.5, 2.3),
        grow: rand(1, 1.5),
        drag: 1,
        rot: rand(0, TAU),
        vr: rand(-0.4, 0.4),
        c: [0.66, 0.66, 0.32],
        em: 0.16,
        wind: 0.3,
      });
    } // the cloud keeps billowing
    if (GS.P && d2(GS.P.x, GS.P.y, s.x, s.y) < s.r * s.r) inS = Math.max(inS, k);
  }
  GS.spores = GS.spores.filter(s => s.t > 0);
  if (GS.P) GS.P.spore = inS; // read by movement, aim and the screen tint
}
