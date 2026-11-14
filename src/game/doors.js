/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Doors. Every house whose walls still stand has a door in each doorway. It opens for you and your people as you
// come up to it and swings shut behind you; the dead can't open one and have to break it down, which takes one of
// them a few seconds and a crowd no time at all. A door can't shut on something standing in it: get through and
// clear before they reach it, or it stays open and they come in after you. A broken door is gone for as long as
// you stay at the place. Like boards (boards.js) a door is not a wall: the dead walk their shortest way to you and
// pile up at it, and your rounds go through. Ruins with gaps in their walls have no doors; nor do garages and
// crypts, or a doorway already boarded for a siege night.
// A door is a board with door: true and open: 0 shut .. 1 wide open, so the same code holds the dead at it.
import { GS } from '../core/gs.js';
import { d2 } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { MH, MW, TILE, grid, houses } from '../world/map.js';
import { sfx } from '../audio/sfx.js';
import { chips, floatText } from '../render/effects.js';
import { showStreak } from '../ui/callouts.js';
import { tickBoards } from './boards.js';

export const DOOR = {
  hp: 45, // one walker is through in about four seconds, three in under two
  rate: 1,
  reach: 54, // you or one of yours this near: it opens
  swing: 6, // how fast it opens and shuts, per second
  shut: 0.3, // under this far open it holds them
  wide: 3, // the widest doorway that gets a door, in tiles
  most: 4, // doorways a house may have and still count as standing
};
GS.doors = [];
const wallT = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || !!grid[ty * MW + tx];

// after the map is built: a door for each doorway of each house that is still whole
export function buildDoors() {
  GS.doors = [];
  const seen = new Set();
  for (const h of houses) {
    if (h.open || h.garage || h.big || h.style === 'crypt' || h.w < 3 || h.h < 3) continue;
    const runs = [];
    let whole = true;
    // the four walls, corner to corner: [first tile, step along it, the way out]
    const sides = [
      [h.x, h.y, 1, 0, 0, -1, h.w, 0],
      [h.x + h.w - 1, h.y, 0, 1, 1, 0, h.h, 1],
      [h.x, h.y + h.h - 1, 1, 0, 0, 1, h.w, 2],
      [h.x, h.y, 0, 1, -1, 0, h.h, 3],
    ];
    for (const [x0, y0, ax, ay, nx, ny, n, side] of sides) {
      let run = null;
      for (let i = 0; i <= n; i++) {
        const tx = x0 + ax * i,
          ty = y0 + ay * i,
          gap = i < n && !wallT(tx, ty);
        if (gap) {
          if (i === 0 || i === n - 1) whole = false; // a missing corner: a ruin
          (run = run || []).push([tx, ty]);
        } else if (run) {
          const [mx, my] = run[0];
          if (run.length > DOOR.wide || wallT(mx + nx, my + ny) || wallT(mx - nx, my - ny)) whole = false;
          else runs.push({ tiles: run, nx, ny, side });
          run = null;
        }
      }
    }
    if (!whole || !runs.length || runs.length > DOOR.most) continue;
    for (const r of runs) {
      const key = r.tiles.map(t => t.join()).join('|');
      if (seen.has(key)) continue; // a door in a wall two rooms share: one door
      seen.add(key);
      const pts = r.tiles.map(([i, j]) => [(i + 0.5) * TILE, (j + 0.5) * TILE]);
      GS.doors.push({
        x: pts.reduce((t, p) => t + p[0], 0) / pts.length,
        y: pts.reduce((t, p) => t + p[1], 0) / pts.length,
        side: r.side,
        nx: r.nx,
        ny: r.ny,
        pts: pts.length > 1 ? pts : null,
        w: pts.length,
        hp: DOOR.hp,
        max: DOOR.hp,
        broken: false,
        hitT: 0,
        door: true,
        open: 0,
      });
    }
  }
}
// boarded for the siege: the boards are the door tonight
const boarded = b =>
  GS.obj && GS.obj.type === 'siege' && !GS.obj.done && GS.obj.bars.some(o => d2(o.x, o.y, b.x, b.y) < 50 * 50);
const near = (o, b, r) => o && !(o.down > 0) && d2(o.x, o.y, b.x, b.y) < r * r;
// something of theirs standing in the doorway: it can't shut
function inWay(b) {
  const half = (b.w * TILE) / 2,
    ax = -b.ny,
    ay = b.nx;
  for (const e of GS.enemies) {
    if (e.dead || e.fly) continue;
    const dx = e.x - b.x,
      dy = e.y - b.y;
    if (Math.abs(dx * b.nx + dy * b.ny) < 12 + e.r * 0.5 && Math.abs(dx * ax + dy * ay) < half + e.r * 0.5) return true;
  }
  return false;
}
export function tickDoors(dt) {
  if (!GS.doors.length) return;
  const P = GS.P,
    shut = [];
  for (const b of GS.doors) {
    b.off = boarded(b);
    if (b.broken || b.off) continue;
    const want = (P && P.hp > 0 && !P.ride && near(P, b, DOOR.reach)) || GS.buddies.some(s => near(s, b, DOOR.reach));
    if (want) {
      if (b.open < 0.05 && P && d2(P.x, P.y, b.x, b.y) < 400 * 400) sfx.doorOpen(b.x, b.y);
      b.open = Math.min(1, b.open + dt * DOOR.swing);
    } else if (b.open > 0 && !inWay(b)) {
      b.open = Math.max(0, b.open - dt * DOOR.swing);
      if (b.open === 0 && P && d2(P.x, P.y, b.x, b.y) < 400 * 400) sfx.doorShut(b.x, b.y);
    }
    if (b.open < DOOR.shut) shut.push(b);
    else b.hitT = Math.max(0, (b.hitT || 0) - dt);
  }
  if (!shut.length) return;
  tickBoards(shut, dt, {
    heavy: true,
    rate: DOOR.rate,
    onBreak: b => {
      chips(b.x, b.y, 14, [0.36, 0.25, 0.15], 4, 240);
      sfx.doorBreak(b.x, b.y);
      if (P && d2(P.x, P.y, b.x, b.y) < 320 * 320) floatText(b.x, b.y - 30, 'Door down', '#ff9a6a', 13);
    },
  });
  for (const b of shut)
    if (b.hitT > 0.2 && !b.told && P && d2(P.x, P.y, b.x, b.y) < 260 * 260) {
      b.told = true;
      if (!(GS.meta.tips && GS.meta.tips.doors) && GS.state === 'play') {
        GS.meta.tips = GS.meta.tips || {};
        GS.meta.tips.doors = 1;
        saveMeta();
        showStreak('Doors', 'They shut behind you · the dead have to break them down', true);
      }
    } // the first time one holds for you: what doors do
}
