/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The dead get in the way. Bodies lying on a square of ground slow whoever wades through them, the dead more than
// you, and where three or more lie together a walker now and then goes down over them. Hold a doorway and the pile
// in it works for you; fight on your own pile and it works against you. Bodies painted into the ground (remains.js)
// still count: what you can see lying there is what slows things down.
import { GS } from '../core/gs.js';
import { HUMAN } from '../render/effects.js';
import { MH, MW, TILE } from './map.js';

export const PILE = {
  dead: [1, 0.9, 0.78, 0.66], // a walker's speed with 0, 1, 2, and 3 or more bodies underfoot
  you: [1, 0.97, 0.92, 0.86], // yours: you pick your way
  trip: 0.22, // chance a second that a walker crossing three or more goes down over them
  max: 6, // bodies counted on one square
};
const CELL = 20, // counted on a fine grid: a body covers the ground within REACH of where it lies
  REACH = 40;
let live = null,
  old = null,
  GW = 0,
  GH = 0;
const lying = e => HUMAN[e.type] && e.type !== 'mini' && !(e.z > 2) && e.dying > 0.45;
function stamp(arr, x, y) {
  const x0 = Math.max(0, Math.floor((x - REACH) / CELL)),
    x1 = Math.min(GW - 1, Math.floor((x + REACH) / CELL)),
    y0 = Math.max(0, Math.floor((y - REACH) / CELL)),
    y1 = Math.min(GH - 1, Math.floor((y + REACH) / CELL));
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++) {
      const dx = (cx + 0.5) * CELL - x,
        dy = (cy + 0.5) * CELL - y,
        i = cy * GW + cx;
      if (dx * dx + dy * dy <= REACH * REACH && arr[i] < PILE.max) arr[i]++;
    }
}
export function resetPiles() {
  GW = Math.ceil((MW * TILE) / CELL);
  GH = Math.ceil((MH * TILE) / CELL);
  live = new Uint8Array(GW * GH);
  old = new Uint8Array(GW * GH);
}
// once a step: where the bodies that are still bodies lie
export function pilesTick() {
  if (!live) resetPiles();
  live.fill(0);
  for (const e of GS.corpses) if (lying(e)) stamp(live, e.x, e.y);
}
// a body painted into the ground stays counted for as long as you are at this place
export function pileKeep(e) {
  if (old && lying(e)) stamp(old, e.x, e.y);
}
export function pileAt(x, y) {
  if (!live) return 0;
  const cx = Math.floor(x / CELL),
    cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return 0;
  return Math.min(PILE.max, live[cy * GW + cx] + old[cy * GW + cx]);
}
export const pileSlow = (x, y, you = false) => (you ? PILE.you : PILE.dead)[Math.min(3, pileAt(x, y))];
