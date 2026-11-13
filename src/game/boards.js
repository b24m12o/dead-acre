/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Boards: planks nailed across a gap. The siege night's house has its windows boarded (siege.js); at any dawn you
// can buy boards and nail them across a doorway or an alley yourself (traps.js, supply.js). Either way the dead
// that reach a board stop at it and pound on it until it gives, and you nail a battered one back by standing still
// beside it. A board is not a wall: the dead keep walking their shortest way to you and pile up against it, and
// you, your people and your rounds go through your own boards.
// A board: { x, y, side (0 N, 1 E, 2 S, 3 W: the way its outside faces), nx, ny, hp, max, broken, hitT, pts? }
// pts: the posts it blocks at, for a board across two tiles; one post at x, y otherwise.
import { GS } from '../core/gs.js';
import { d2 } from '../core/util.js';
import { MH, MW, TILE, grid } from '../world/map.js';
import { sfx } from '../audio/sfx.js';
import { chips, floatText, shake } from '../render/effects.js';

export const BAR_R = 21; // a board's reach round each post: it plugs a one-tile gap (the player's siege-night limit)
const PLANK = 12; // how far in front of the planks the dead are held, past their own size
export const BOARD_MAX = 4; // your own boards standing at once
const isWallT = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || !!grid[ty * MW + tx];
export const postsOf = b => b.pts || [[b.x, b.y]];
GS.boards = [];
export function resetBoards() {
  GS.boards = [];
}
// a board's health: the siege's are set by siege.js; yours, by the night
export const boardMax = (w = GS.wave + 1) => 180 + 20 * w;

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
    nailBack(b, dt);
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
// where a board would go: the gap just in front of you, one or two tiles wide, with something solid at both ends.
// Returns a board (not yet up) or null. a: the way you face
export function boardSpot(x, y, a) {
  const c = Math.cos(a),
    s = Math.sin(a);
  let best = null;
  for (const reach of [30, 52, 74]) {
    const tx = Math.floor((x + c * reach) / TILE),
      ty = Math.floor((y + s * reach) / TILE);
    if (isWallT(tx, ty)) continue;
    for (const along of [
      [1, 0],
      [0, 1],
    ]) {
      const [ax, ay] = along; // the board runs along this; its faces point across it
      let lo = 0,
        hi = 0;
      while (lo < 2 && !isWallT(tx - ax * (lo + 1), ty - ay * (lo + 1))) lo++;
      while (hi < 2 && !isWallT(tx + ax * (hi + 1), ty + ay * (hi + 1))) hi++;
      const w = lo + hi + 1;
      if (w > 2 || !isWallT(tx - ax * (lo + 1), ty - ay * (lo + 1)) || !isWallT(tx + ax * (hi + 1), ty + ay * (hi + 1)))
        continue; // more than two tiles, or open at an end: nothing to nail it to
      const tiles = [];
      for (let k = -lo; k <= hi; k++) tiles.push([tx + ax * k, ty + ay * k]);
      const pts = tiles.map(([i, j]) => [(i + 0.5) * TILE, (j + 0.5) * TILE]),
        bx = pts.reduce((t, p) => t + p[0], 0) / pts.length,
        by = pts.reduce((t, p) => t + p[1], 0) / pts.length,
        nx = ay, // the outside: the side away from you
        ny = ax,
        out = (bx - x) * nx + (by - y) * ny >= 0 ? 1 : -1,
        side = ax ? (out > 0 ? 2 : 0) : out > 0 ? 1 : 3,
        fit = Math.abs(c * nx + s * ny); // the better you face across it, the better
      if (!best || fit > best.fit + 0.05) best = { x: bx, y: by, side, nx: nx * out, ny: ny * out, pts, w, fit, tiles };
    }
    if (best) break;
  }
  if (!best) return null;
  if (
    GS.boards.some(
      b => !b.broken && postsOf(b).some(([px, py]) => best.pts.some(([qx, qy]) => d2(px, py, qx, qy) < 30 * 30))
    )
  )
    return null; // there's a board there already
  return best;
}
// your board, nailed up where boardSpot says
export function putBoard(spot) {
  const max = boardMax(GS.nightLive ? GS.wave : GS.wave + 1),
    b = {
      x: spot.x,
      y: spot.y,
      side: spot.side,
      nx: spot.nx,
      ny: spot.ny,
      pts: spot.pts.length > 1 ? spot.pts : null,
      w: spot.pts.length,
      hp: max,
      max,
      broken: false,
      hitT: 0,
      own: true,
    };
  GS.boards.push(b);
  while (GS.boards.length > BOARD_MAX) GS.boards.shift(); // the oldest comes down for the new one
  sfx.dig(b.x, b.y);
  chips(b.x, b.y, 6, [0.42, 0.3, 0.18], 3, 140);
  return b;
}
// your boards, every frame: a broken one lies where it fell until you nail it back or leave
export function tickOwnBoards(dt) {
  if (!GS.boards.length) return;
  tickBoards(GS.boards, dt, {
    heavy: true,
    climbOver: true,
    onBreak: b => floatText(b.x, b.y - 30, 'Board down', '#ff9a6a', 13),
  });
}
