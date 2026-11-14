/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Boards: planks nailed across a gap. The siege night's house has its windows and doors boarded (siege.js), and a
// house's own door (doors.js) holds the dead the same way. The dead that reach a board stop at it and pound on it
// until it gives, and you nail a battered one back by standing still beside it. A board is not a wall: the dead keep
// walking their shortest way to you and pile up against it, and you, your people and your rounds go through.
// A board: { x, y, side (0 N, 1 E, 2 S, 3 W: the way its outside faces), nx, ny, hp, max, broken, hitT, pts? }
// pts: the posts it blocks at, for a board across two tiles; one post at x, y otherwise.
import { GS } from '../core/gs.js';
import { d2 } from '../core/util.js';
import { TILE } from '../world/map.js';
import { sfx } from '../audio/sfx.js';
import { chips, floatText, shake } from '../render/effects.js';

export const BAR_R = 21; // a board's reach round each post: it plugs a one-tile gap (the player's siege-night limit)
const PLANK = 12; // how far in front of the planks the dead are held, past their own size
export const postsOf = b => b.pts || [[b.x, b.y]];

// the dead at the boards: held back at each post, and the ones that may pound on it do (pound(e): may this one
// pound). heavy: a boss breaks a board it touches and a brute hits three times as hard; climbOver: a climber goes
// over it. onBreak(b): said when one gives
export function tickBoards(
  list,
  dt,
  { pound = () => true, rate = 0.5, onBreak = null, heavy = false, climbOver = false } = {}
) {
  for (const b of list) {
    b.hitT = Math.max(0, (b.hitT || 0) - dt);
    if (!b.broken) {
      const half = ((b.w || 1) * TILE) / 2, // along the board: the whole gap it spans
        ax = -b.ny,
        ay = b.nx;
      for (const e of GS.enemies) {
        if (e.dead || e.fly || !(e.emerge >= 1) || (climbOver && e.kind === 'climb')) continue;
        const dx = e.x - b.x,
          dy = e.y - b.y,
          u = dx * b.nx + dy * b.ny, // across it: + outside, - inside
          v = dx * ax + dy * ay, // along it
          th = PLANK + e.r;
        if (Math.abs(v) > half + e.r * 0.5 || Math.abs(u) >= th + 4) continue; // not at it
        if (Math.abs(u) < th) {
          const k = (u >= 0 ? th : -th) - u;
          e.x += b.nx * k;
          e.y += b.ny * k;
        } // a plank, not a post: held back on its own side all along the gap, never squeezed round an end
        if (e.dmg > 0 && pound(e)) {
          e.boardT = GS.time; // busy at the board: it stays and pounds, it doesn't look for a way round
          b.hp -= heavy && e.type === 'queen' ? b.hp + 1 : e.dmg * dt * rate * (heavy && e.type === 'beetle' ? 3 : 1);
          b.hitT = 0.25;
          if (Math.random() < dt * 5) chips(b.x + ax * v, b.y + ay * v, 2, [0.42, 0.3, 0.18], 3, 120);
          if (Math.random() < dt * 2.5) sfx.dig(b.x, b.y);
        }
      }
    }
    if (!b.broken && b.hp <= 0) {
      b.broken = true;
      b.hp = 0;
      chips(b.x, b.y, 10, [0.42, 0.3, 0.18], 4, 220);
      sfx.dig(b.x, b.y);
      shake(0.05);
      if (onBreak) onBreak(b);
    }
    if (!b.door) nailBack(b, dt); // a door (doors.js) is not nailed back: broken, it is gone
  }
}
// nailing it back: you, standing still beside it, with nothing of theirs in the way
function nailBack(b, dt) {
  const P = GS.P;
  if (P && P.hp > 0 && b.hp < b.max && d2(P.x, P.y, b.x, b.y) < 58 * 58 && Math.hypot(P.vx || 0, P.vy || 0) < 30) {
    const blocked =
      b.broken &&
      GS.enemies.some(e => !e.dead && postsOf(b).some(([px, py]) => d2(e.x, e.y, px, py) < (BAR_R + e.r) ** 2));
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
