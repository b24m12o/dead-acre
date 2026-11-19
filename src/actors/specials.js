/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Three special infected, each asking for a different answer. They are the ordinary dead, changed:
//  · Climber: lean, pale, on all fours. Walls, fences and houses don't stop it: it goes straight over them at you.
//    Hiding behind a building is no longer safe. Fragile; shoot it the moment it drops off a wall.
//  · Spore: a swollen, yellowing walker. Kill it, or let it reach you, and it bursts into a cloud of spores: inside,
//    you can hardly see, you move slower and your aim swims. Kill it far away.
//  · Dragger: big, hunched, long in the arm. It goes for one of your people, knocks them down and drags them off into
//    the dark. Kill it before it gets away with them, or they are gone. With nobody to take, it takes you.
//  · Listener: ashen, upright, blind. It stands with its head turning until something makes a noise: a shot, a blast,
//    running feet close by, a clock. Then it runs at the noise, faster than you, and hits hard. It goes where the
//    sound was, not where you are: stand still and it passes you; fire again and it has you. Quiet answers it.
import { heroSay } from '../audio/barks.js';
import { GK } from '../core/scale.js';
import { GS } from '../core/gs.js';
import { TAU, d2, rand } from '../core/util.js';
import { MH, MW, TILE, grid } from '../world/map.js';
import { collide, dijk, flow, los, steer } from '../world/nav.js';
import { NOISE } from '../game/noise.js';
import { sfx } from '../audio/sfx.js';
import { part, shake } from '../render/effects.js';
import { showStreak } from '../ui/callouts.js';
import { hurtPlayer, killEnemy, releaseGrab } from '../game/combat.js';
import { saveMeta } from '../core/settings.js';
import { makeEnemy } from './enemies.js';

export const SPECIAL = {
  climb: { name: 'Climber', tip: 'Walls and houses don’t stop it · it comes straight over them' },
  spore: { name: 'Spore', tip: 'It bursts into a blinding cloud when it dies · kill it far away' },
  drag: { name: 'Dragger', tip: 'It drags your people off into the dark · kill it before it gets away' },
  blind: { name: 'Listener', tip: 'Blind · it runs at whatever makes a noise: a shot, running feet, a clock' },
};
export const BLIND = {
  feet: 170 * GK, // it hears you moving within this many px
  roll: 300 * GK, // and a roll from further
  still: 55 * GK, // moving slower than this (px/s) is silent
  hot: 6, // seconds it stays on a noise
  listen: 1.6, // seconds it stands at the spot, head up, before it loses interest
  touch: 64 * GK, // within this of you it has you, noise or no noise
  run: 2.35, // its run, in walker speeds
  walk: 0.3,
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
  } else if (kind === 'blind') {
    e.shape = null;
    e.v = 16; // bare to the waist
    e.hv = 1;
    e.tc = [0.6, 0.62, 0.68]; // ashen
    e.run = false;
    e.hp *= 2.6;
    e.dmg *= 2;
    e.sc = 1.1;
    e.r *= 1.05;
    e.sp0 = e.sp;
    e.hot = 0;
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
  if (d > 520 * GK) return;
  e.tipped2 = true;
  GS.meta.tips = GS.meta.tips || {};
  if (GS.meta.tips['sp_' + e.kind]) return;
  GS.meta.tips['sp_' + e.kind] = 1;
  saveMeta();
  showStreak(SPECIAL[e.kind].name, SPECIAL[e.kind].tip, true);
}
const wallAt = (x, y) => !!grid[Math.floor(y / TILE) * MW + Math.floor(x / TILE)];
// a wall within a step of it: only then does it go up and over (on open street it runs like any other)
const nearWall = e => {
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) if (wallAt(e.x + i * 30 * GK, e.y + j * 30 * GK)) return true;
  return false;
};
// away from you along the streets: the neighbouring tile furthest from you by the path, not a straight line into a wall
function fleeDir(e, p) {
  const cx = Math.floor(e.x / TILE),
    cy = Math.floor(e.y / TILE);
  let best = -1,
    bx = 0,
    by = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const tx = cx + i,
        ty = cy + j;
      if ((!i && !j) || tx < 0 || ty < 0 || tx >= MW || ty >= MH || grid[ty * MW + tx]) continue;
      const v = flow[ty * MW + tx];
      if (v < 65535 && v > best) {
        best = v;
        bx = (tx + 0.5) * TILE - e.x;
        by = (ty + 0.5) * TILE - e.y;
      }
    }
  if (best < 0) {
    bx = e.x - p.x;
    by = e.y - p.y;
  }
  const l = Math.hypot(bx, by) || 1;
  return [bx / l, by / l];
}
// knocked flat, staggered or dazed: the ordinary AI handles that, as for any zombie
const stunned = e => e.down > 0 || e.stag > 0 || (e.dazedT || 0) > GS.time;
// what the ordinary AI would do to it each frame, for the frames a special moves itself: a slow wears off and slows it,
// a shove from a blast or a shotgun carries it and dies away; returns the speed factor
function kin(e, dt) {
  let k = 1;
  if (e.slowT > 0) {
    e.slowT -= dt;
    k = 0.45;
  }
  const kl = Math.hypot(e.kx || 0, e.ky || 0);
  if (kl > 900 * GK) {
    e.kx *= (900 * GK) / kl;
    e.ky *= (900 * GK) / kl;
  }
  e.x += (e.kx || 0) * dt;
  e.y += (e.ky || 0) * dt;
  const kd = Math.pow(0.015, dt);
  e.kx = (e.kx || 0) * kd;
  e.ky = (e.ky || 0) * kd;
  return k;
}
// runs before the ordinary AI; returns true when it has moved the zombie itself this frame
// its tell, every few seconds while it is up and within earshot: you hear what it is before you see it
const TELL = {
  climb: ['scrabble', 2.2, 3.5],
  spore: ['wheeze', 3, 4],
  drag: ['scrape', 3, 4.5],
  blind: ['rattle', 2.6, 4.2],
};
GS.tells = { climb: 0, spore: 0, drag: 0, blind: 0 };
function tell(e, p) {
  const T = TELL[e.kind];
  if (!T || !(e.emerge >= 1) || e.dead) return;
  if (e.tellT === undefined) e.tellT = GS.time + rand(0.2, 1.2);
  if (GS.time < e.tellT) return;
  e.tellT = GS.time + rand(T[1], T[2]);
  if (d2(e.x, e.y, p.x, p.y) > (700 * GK) ** 2 || (e.kind === 'climb' && e.st !== 'move')) return;
  sfx[T[0]](e.x, e.y);
  GS.tells[e.kind]++;
}
export function specialTick(e, dt, p) {
  specialTip(e);
  tell(e, p);
  if (stunned(e)) return false;
  if (e.kind === 'climb') {
    if (!(GS.time < (e.clT || 0))) {
      e.clT = GS.time + 0.25;
      e.clLos = los(e.x, e.y, p.x, p.y);
    } // its own look at you: while it is up on a wall the AI counts it as seeing you, which would drop it off every other beat
    const dx = p.x - e.x,
      dy = p.y - e.y,
      d = Math.hypot(dx, dy) || 1,
      over = (!e.clLos && nearWall(e)) || wallAt(e.x, e.y);
    if ((e.aw > 0 || d < 700 * GK) && over && e.emerge >= 1) {
      if (!e.fly) sfx.groan(e.x, e.y);
      e.fly = true; // over the wall: drawn above the buildings, through nothing
      e.climbT = GS.time;
      const k = (wallAt(e.x, e.y) ? 0.62 : 1) * kin(e, dt);
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
  if (e.kind === 'spore' && e.emerge >= 1 && d2(e.x, e.y, p.x, p.y) < (56 * GK) ** 2) {
    killEnemy(e, 0, 'self');
    return true; // close enough: it splits open on you
  }
  if (e.kind === 'drag') return dragTick(e, dt, p);
  if (e.kind === 'blind') return blindTick(e, dt, p);
  return false;
}
// the way to the last noise, shared by every listener that heard it
let spotFlow = null,
  spotT = -9;
function flowTo(x, y, t) {
  if (!spotFlow || spotFlow.length !== MW * MH) spotFlow = new Uint16Array(MW * MH);
  if (spotT === t) return spotFlow;
  spotT = t;
  const seeds = [],
    cx = Math.floor(x / TILE),
    cy = Math.floor(y / TILE);
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const tx = cx + i,
        ty = cy + j;
      if (tx >= 0 && ty >= 0 && tx < MW && ty < MH && !grid[ty * MW + tx]) seeds.push(ty * MW + tx);
    }
  dijk(spotFlow, seeds, false);
  return spotFlow;
}
// the night is down to its last few: they find you by scent, so a night always ends. The ones playing dead don't count:
// they lie until the rest are gone, and five of them must not keep a sixth that can't see standing out in the dark for good
let fewT = -1,
  fewV = false;
export function lastFew() {
  if (fewT !== GS.time) {
    fewT = GS.time;
    let n = 0;
    if (!GS.queue.length) for (const o of GS.enemies) if (!o.dead && !o.lurk) n++;
    fewV = !GS.queue.length && n <= 5;
  }
  return fewV;
}
function blindTick(e, dt, p) {
  if (!(e.emerge >= 1)) return false;
  const d = Math.hypot(p.x - e.x, p.y - e.y),
    play = GS.state === 'play' && !p.ride,
    last = !!GS.evac || lastFew();
  e.hot = Math.max(0, (e.hot || 0) - dt);
  // what it hears: the last loud noise, if it was in earshot
  if (NOISE.t > (e.hnT ?? -9)) {
    e.hnT = NOISE.t;
    if (d2(e.x, e.y, NOISE.x, NOISE.y) < (NOISE.r || 0) ** 2) {
      if (!(e.hot > 0)) sfx.growl(e.x, e.y);
      e.hx = NOISE.x;
      e.hy = NOISE.y;
      e.hT = NOISE.t;
      e.hot = BLIND.hot;
    }
  }
  // your feet, close by (not while it is already running at something: its own feet drown yours)
  const pv = Math.hypot(p.vx || 0, p.vy || 0),
    ear = p.dashT > 0 ? BLIND.roll : BLIND.feet;
  if (play && pv > BLIND.still && d < ear && (!(e.hot > 0) || e.own) && !e.lure) {
    if (!(e.hot > 0)) sfx.growl(e.x, e.y);
    e.hx = p.x;
    e.hy = p.y;
    e.hT = GS.time;
    e.own = true; // it is following your steps: each one it hears moves the spot
    e.hot = Math.max(e.hot, 2.5);
  } else if (!(e.hot > 0)) e.own = false;
  if (e.hp < (e.hpL ?? e.hp) && play) {
    e.hx = p.x;
    e.hy = p.y;
    e.hT = GS.time;
    e.hot = BLIND.hot;
  } // hurt: it knows where from
  e.hpL = e.hp;
  e.aw = 0;
  e.sp = e.sp0 * BLIND.run;
  if (e.lure) return false; // a clock, an alarm, a flare: it goes to it like the rest (and has its back to you)
  if (
    last ||
    (play && d < BLIND.touch) ||
    (e.hot > 0 && play && d < 150 * GK && d2(e.hx, e.hy, p.x, p.y) < (70 * GK) ** 2)
  ) {
    e.aw = 1.5;
    return false; // it has you: the ordinary fight
  }
  const ks = kin(e, dt);
  if (e.hot > 0 && e.hx !== undefined) {
    const direct = !(GS.time < (e.bLosT || 0))
        ? ((e.bLosT = GS.time + 0.3), (e.bLos = los(e.x, e.y, e.hx, e.hy)))
        : e.bLos,
      [ux, uy, dist] = direct ? steer(e, e.hx, e.hy, null, true) : steer(e, e.hx, e.hy, flowTo(e.hx, e.hy, e.hT));
    if (dist > 26 * GK) {
      e.vx = ux * e.sp * ks;
      e.vy = uy * e.sp * ks;
      e.a = Math.atan2(uy, ux);
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      e.anim = (e.anim || 0) + dt * 9;
      collide(e);
      return true;
    }
    e.hot = Math.min(e.hot, BLIND.listen); // there, and nothing: it stands and listens a moment longer
  }
  // nothing to hear: it stands, head turning slowly from side to side
  e.vx = e.vy = 0;
  e.a += Math.sin(GS.time * 0.55 + e.id * 2.1) * 0.9 * dt;
  collide(e);
  return true;
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
        bd = (700 * GK) ** 2;
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
        !p.ride &&
        !(p.dashT > 0) &&
        GS.time > (e.grabCd || 0) &&
        d2(e.x, e.y, p.x, p.y) < (e.r + p.r + 6) ** 2
      ) {
        p.held = e;
        heroSay('grab', 0.2);
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
    if (!(GS.time < (e.bLosT || 0))) {
      e.bLosT = GS.time + 0.3;
      e.bLos = los(e.x, e.y, b.x, b.y);
      const mv = Math.hypot(e.x - (e.sx0 ?? e.x), e.y - (e.sy0 ?? e.y));
      e.stuckN = mv < 6 ? (e.stuckN || 0) + 1 : 0;
      e.sx0 = e.x;
      e.sy0 = e.y;
      if (e.stuckN > 10) {
        e.stuckN = 0;
        e.prey = null;
        e.pickT = 5;
        return false;
      } // three seconds without getting anywhere: it gives that one up for now
    }
    const [ux, uy, dist] = e.bLos ? steer(e, b.x, b.y, null, true) : steer(e, b.x, b.y, flow),
      ks = kin(e, dt);
    e.vx = ux * e.sp * ks;
    e.vy = uy * e.sp * ks;
    e.a = Math.atan2(uy, ux);
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    collide(e);
    if (dist < e.r + (b.r || 14 * GK) + 6 * GK) {
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
  const al = Math.hypot(e.x - p.x, e.y - p.y),
    [ux, uy] = fleeDir(e, p),
    ks = kin(e, dt);
  e.vx = ux * e.sp * 0.72 * ks;
  e.vy = uy * e.sp * 0.72 * ks;
  e.a = Math.atan2(-uy, -ux); // walking backwards, hauling
  e.x += e.vx * dt;
  e.y += e.vy * dt;
  collide(e);
  b.x = e.x - ux * 22 * GK;
  b.y = e.y - uy * 22 * GK;
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
  if (al > 760 * GK || e.carryT > 13) {
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
  if (GS.state !== 'play' || al > e.r + p.r + 20 * GK) {
    releaseGrab(0.3);
    return;
  } // a wall between you, or a blast that threw it off: the grip is gone
  e.x += (ax / al) * 26 * GK * dt;
  e.y += (ay / al) * 26 * GK * dt;
  collide(e);
  p.x += (ax / al) * 26 * GK * dt;
  p.y += (ay / al) * 26 * GK * dt;
  e.gT = (e.gT || 0) - dt;
  if (e.gT <= 0) {
    e.gT = 0.6;
    hurtPlayer(4 + GS.wave * 0.4, e.x, e.y, 'a dragger');
  }
}
// a spore's death: the cloud
export function sporeBurst(e) {
  GS.spores.push({ x: e.x, y: e.y, r: 120 * GK, t: 7, max: 7 });
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
