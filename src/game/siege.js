/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Siege: a night signature. Survivors are holed up in one of the ruined houses, every gap in its walls boarded over,
// and tonight the dead come for them. Most of the night's zombies go for the house, not for you: they pound on the
// boards until one gives, then climb through, and each one that gets inside takes a survivor. Keep them off the boards;
// stand still beside a battered or broken one to nail it back up. You can shoot over the boards and climb through them
// yourself; the dead can't. Anyone left inside at dawn is in your debt, and one of them joins your backup.
import { GS } from '../core/gs.js';
import { d2, pick, rand } from '../core/util.js';
import { MH, MW, TILE, grid, houses } from '../world/map.js';
import { dijk, flow } from '../world/nav.js';
import { sfx } from '../audio/sfx.js';
import { chips, floatText, shake } from '../render/effects.js';
import { showStreak } from '../ui/callouts.js';
import { makeSurvivor } from '../actors/backups.js';
import { finishObjective } from './objective-flow.js';

const BAR_R = 21; // a board's reach: it plugs a one-tile gap
const isWallT = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || !!grid[ty * MW + tx];
// the gaps in a ruined house's walls, and the floor inside
function houseShape(h) {
  const gaps = [],
    floor = [];
  for (let k = 0; k < h.w; k++)
    for (const [ty, side] of [
      [h.y, 0],
      [h.y + h.h - 1, 2],
    ])
      if (!isWallT(h.x + k, ty)) gaps.push([h.x + k, ty, side]);
  for (let j = 1; j < h.h - 1; j++)
    for (const [tx, side] of [
      [h.x, 3],
      [h.x + h.w - 1, 1],
    ])
      if (!isWallT(tx, h.y + j)) gaps.push([tx, h.y + j, side]);
  for (let j = 1; j < h.h - 1; j++)
    for (let k = 1; k < h.w - 1; k++) if (!isWallT(h.x + k, h.y + j)) floor.push([h.x + k, h.y + j]);
  return { gaps, floor };
}
// a house fit to hold: an open ruin (no roof, not burning, not the gas station), with a few gaps to board, room inside, and a street to it
export function siegeHouse() {
  if (!houses || !GS.P) return null;
  let best = null;
  for (const h of houses) {
    if (h.style || h.roof || h.burning) continue; // a roofless ruin: you can see in, and fight over the walls
    const { gaps, floor } = houseShape(h);
    if (gaps.length < 3 || gaps.length > 9 || floor.length < 4) continue;
    if (!gaps.some(([tx, ty]) => flow[ty * MW + tx] < 65535)) continue;
    const cx = (h.x + h.w / 2) * TILE,
      cy = (h.y + h.h / 2) * TILE,
      d = Math.hypot(cx - GS.P.x, cy - GS.P.y),
      score = Math.abs(d - 650); // not on top of you, not across the map
    if (!best || score < best.score) best = { h, gaps, floor, cx, cy, score };
  }
  return best;
}
export function planSiege() {
  const S0 = siegeHouse();
  if (!S0) return false;
  const { h, gaps, floor, cx, cy } = S0,
    max = 300 + 25 * GS.wave,
    N = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ];
  const bars = gaps.map(([tx, ty, side]) => ({
    x: (tx + 0.5) * TILE,
    y: (ty + 0.5) * TILE,
    side,
    nx: N[side][0],
    ny: N[side][1],
    hp: max,
    max,
    broken: false,
    hitT: 0,
  }));
  const spots = floor.slice().sort(() => Math.random() - 0.5),
    civ = [];
  for (let i = 0; i < Math.min(4, spots.length); i++) {
    const [tx, ty] = spots[i],
      s = makeSurvivor((tx + 0.5) * TILE + rand(-8, 8), (ty + 0.5) * TILE + rand(-8, 8));
    s.gun = null;
    s.hp = s.max = 70 + 6 * GS.wave;
    civ.push(s);
  }
  const fl = new Uint16Array(MW * MH);
  dijk(
    fl,
    floor.map(([tx, ty]) => ty * MW + tx),
    false
  ); // the way in, from anywhere: through whichever gap is nearest, boarded or not
  GS.obj = {
    type: 'siege',
    h,
    cx,
    cy,
    bars,
    civ,
    n0: civ.length,
    inside: civ.length,
    core: { x: cx, y: cy, flow: fl },
    x0: (h.x + 1) * TILE,
    y0: (h.y + 1) * TILE,
    x1: (h.x + h.w - 1) * TILE,
    y1: (h.y + h.h - 1) * TILE,
  };
  GS.queue.push(...Array(Math.round(GS.queue.length * 0.2)).fill('skitter')); // a few more of them tonight: they have a house to get into
  GS.later.push({
    t: 2.5,
    fn: () =>
      GS.obj &&
      GS.obj.type === 'siege' &&
      showStreak(
        'Siege',
        `${civ.length} survivors boarded up in a ruin · keep the dead off the boards · stand still by a broken one to nail it back`,
        true
      ),
  });
  return true;
}
const inHouse = (o, x, y) => x > o.x0 && x < o.x1 && y > o.y0 && y < o.y1;
// who goes for the house: most of the night's dead, unless you are right in front of them
export function siegeTarget(e) {
  const o = GS.obj;
  if (e.fly || e.horde) return null;
  if (e.sg === undefined) e.sg = Math.random() < 0.5;
  if (!e.sg) return null;
  const P = GS.P;
  if (P && e.los && d2(e.x, e.y, P.x, P.y) < 150 * 150) return null; // you, close and in sight, come first
  if (d2(e.x, e.y, o.cx, o.cy) > 1400 * 1400) return null;
  if (e.sgIn && inHouse(o, e.x, e.y) && o.civ.length) {
    let best = o.civ[0],
      bd = 1e12;
    for (const s of o.civ) {
      const dd = d2(e.x, e.y, s.x, s.y);
      if (dd < bd) {
        bd = dd;
        best = s;
      }
    }
    return best;
  } // through the gap: straight for the nearest of them
  return o.core;
}
export function tickSiege(dt) {
  const o = GS.obj;
  if (!o || o.type !== 'siege' || o.done) return;
  const P = GS.P;
  // the boards: the dead pound on them, and you nail them back
  for (const b of o.bars) {
    b.hitT = Math.max(0, b.hitT - dt);
    if (!b.broken)
      for (const e of GS.enemies) {
        if (e.dead || e.fly || !(e.emerge >= 1)) continue;
        const rr = BAR_R + e.r,
          dd = d2(e.x, e.y, b.x, b.y);
        if (dd >= rr * rr || dd < 0.01) continue;
        const d = Math.sqrt(dd);
        e.x += ((e.x - b.x) / d) * (rr - d);
        e.y += ((e.y - b.y) / d) * (rr - d);
        if (e.dmg > 0 && e.sg) {
          b.hp -= e.dmg * dt * 0.5;
          b.hitT = 0.25;
          if (Math.random() < dt * 5) chips(b.x, b.y, 2, [0.42, 0.3, 0.18], 3, 120);
          if (Math.random() < dt * 2.5) sfx.dig(b.x, b.y);
        }
      }
    if (!b.broken && b.hp <= 0) {
      b.broken = true;
      b.hp = 0;
      chips(b.x, b.y, 10, [0.42, 0.3, 0.18], 4, 220);
      sfx.dig(b.x, b.y);
      shake(0.05);
      if (!o.brokeSaid) {
        o.brokeSaid = true;
        showStreak('A board gave way', 'Stand still beside it to nail it back up · or shoot what climbs through', true);
      } else floatText(b.x, b.y - 30, 'Board down', '#ff9a6a', 13);
    }
    // nailing it back: you, standing still beside it
    if (P && P.hp > 0 && b.hp < b.max && d2(P.x, P.y, b.x, b.y) < 58 * 58 && Math.hypot(P.vx || 0, P.vy || 0) < 30) {
      const blocked = b.broken && GS.enemies.some(e => !e.dead && d2(e.x, e.y, b.x, b.y) < (BAR_R + e.r) ** 2);
      if (!blocked) {
        b.hp = Math.min(b.max, b.hp + b.max * 0.42 * dt);
        b.fix = 0.25;
        if (Math.random() < dt * 5) sfx.dig(b.x, b.y);
        if (b.broken && b.hp >= b.max * 0.35) {
          b.broken = false;
          floatText(b.x, b.y - 30, 'Boarded', '#c8e6a0', 13);
        }
      }
    } else b.fix = Math.max(0, (b.fix || 0) - dt);
  }
  // inside: the ones that get onto the floor go for the survivors, and it takes them a few seconds each
  for (const e of GS.enemies) {
    if (e.dead || e.fly || !inHouse(o, e.x, e.y)) continue;
    if (!(e.emerge >= 1) && !e.sgIn) {
      const b = pick(o.bars);
      e.x = b.x + b.nx * 120;
      e.y = b.y + b.ny * 120;
      continue;
    } // it came up out of the floor of the house itself: it surfaces outside instead
    if (!e.sgIn) {
      e.sgIn = true;
      if (!o.inSaid) {
        o.inSaid = true;
        showStreak('They’re inside', 'Get in there and kill it before it reaches them', true);
      }
    }
    for (const s of o.civ) {
      if (d2(e.x, e.y, s.x, s.y) > (e.r + s.r + 8) ** 2 || !(e.dmg > 0)) continue;
      s.hp -= e.dmg * dt * 1.1;
      s.hurt = 0.2;
      if (Math.random() < dt * 4) chips(s.x, s.y, 2, [0.5, 0.05, 0.04], 3, 120);
      break;
    }
  }
  for (const s of o.civ.slice())
    if (s.hp <= 0) {
      o.civ.splice(o.civ.indexOf(s), 1);
      o.inside = o.civ.length;
      chips(s.x, s.y, 14, [0.5, 0.05, 0.04], 4, 200);
      sfx.growl(s.x, s.y);
      shake(0.08);
      floatText(
        s.x,
        s.y - 34,
        o.inside ? `They got one · ${o.inside} left inside` : 'They got the last one',
        '#ff6a5a',
        16
      );
      if (!o.inside) {
        o.lost = true;
        finishObjective(false, 'They got inside. Nobody left');
        return;
      }
    }
  // the ones inside look to the nearest board under attack
  for (const s of o.civ) {
    let best = null,
      bd = 1e12;
    for (const b of o.bars)
      if (b.hitT > 0 || b.broken) {
        const dd = d2(s.x, s.y, b.x, b.y);
        if (dd < bd) {
          bd = dd;
          best = b;
        }
      }
    const ta = best ? Math.atan2(best.y - s.y, best.x - s.x) : s.bodyA;
    s.bodyA += Math.atan2(Math.sin(ta - s.bodyA), Math.cos(ta - s.bodyA)) * Math.min(1, dt * 3);
    s.aimA = s.moveA = s.bodyA;
  }
}
// the prompt, by a board that needs you
export function siegePrompt() {
  const o = GS.obj,
    P = GS.P;
  if (!o || o.type !== 'siege' || o.done || !P) return null;
  for (const b of o.bars)
    if (b.hp < b.max * 0.9 && d2(P.x, P.y, b.x, b.y) < 58 * 58)
      return { b, label: b.fix > 0 ? 'Nailing it back up' : 'Stand still to board it up' };
  return null;
}
export const siegeText = o =>
  `Hold the house · ${o.inside} inside · ${o.bars.filter(b => !b.broken).length} / ${o.bars.length} boarded`;
