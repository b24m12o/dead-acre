/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// What each place on the road does that no other does. The maps alone made every stop play the same; these are the
// moments that belong to one place:
//  - the quarry: the dead come up out of the pit, and the haul ramp is the only way up
//  - Mill River bridge: a horde comes along Route 9 from both ends, and the bridge is the only way over
//  - the Starlite Motel: the Fire Chief walks out of the burnt fire station across the road
//  - County Hospital: on the last night the wards empty out, and Patient Zero comes out of the front door
import { GS } from '../core/gs.js';
import { d2, rand } from '../core/util.js';
import { LAYOUT, TILE, isWall } from '../world/map.js';
import { blockPt, reachPt } from '../world/nav.js';
import { viewH, viewW } from '../render/sprites.js';
import { cam } from './state.js';
import { showStreak } from '../ui/callouts.js';
import { makeEnemy } from '../actors/enemies.js';
import { bossNight, lastNight } from './waves.js';

const inView = (x, y, m = 60) => x > cam.x - m && x < cam.x + viewW + m && y > cam.y - m && y < cam.y + viewH + m;
// where a boss comes from at a place that has a door for it (tiles)
const STAGE = { motel: { chief: [36.5, 35.4] }, hospital: { pz: [29.5, 22.8] } };
export function placeStage(bt) {
  const s = STAGE[LAYOUT] && STAGE[LAYOUT][bt];
  if (!s || !GS.P) return null;
  const x = s[0] * TILE,
    y = s[1] * TILE,
    d = Math.sqrt(d2(x, y, GS.P.x, GS.P.y));
  return d > 300 && d < 1300 && reachPt(x, y) ? [x, y] : null; // too close, or cut off: it comes the usual way
}
// the quarry at night: most of the dead come up out of the pit, from out of sight on its floor
export function pitSpot(minD) {
  if (LAYOUT !== 'quarry' || !GS.nightLive || GS.nightDone || Math.random() > 0.65) return null;
  for (let k = 0; k < 30; k++) {
    const x = rand(10.5, 50.5) * TILE,
      y = rand(39.5, 55.5) * TILE;
    if (d2(x, y, GS.P.x, GS.P.y) < minD * minD || blockPt(x, y) || !reachPt(x, y) || inView(x, y)) continue;
    return [x, y];
  }
  return null;
}
// at the start of a night: anything this place does tonight
export function placeNight() {
  if (!GS.RUN || GS.RUN.tut || GS.RUN.practice) return;
  const w = GS.wave;
  if (LAYOUT === 'quarry' && !bossNight(w))
    GS.later.push({
      t: 3.2,
      fn: () =>
        GS.state === 'play' &&
        showStreak('Out of the pit', 'They are climbing out of the quarry · the haul ramp is the only way up', true),
    });
  if (LAYOUT === 'hospital' && lastNight(w)) wardsEmpty();
}
// the last night at County Hospital: what is still inside comes out of the doors, in ones and twos and then all at once
function wardsEmpty() {
  const wings = [
      [12, 8, 13, 14],
      [24, 12, 11, 10],
      [34, 8, 13, 14],
    ],
    floor = [];
  for (const [x0, y0, w, h] of wings)
    for (let y = y0 + 1; y < y0 + h - 1; y++)
      for (let x = x0 + 1; x < x0 + w - 1; x++) {
        const px = (x + 0.5) * TILE,
          py = (y + 0.5) * TILE;
        if (!isWall(x, y) && reachPt(px, py) && d2(px, py, GS.P.x, GS.P.y) > 300 * 300) floor.push([px, py]);
      }
  if (floor.length < 6) return;
  let n = 0;
  for (let i = GS.queue.length - 1; i >= 0 && n < 14; i--)
    if (GS.queue[i] === 'skitter') {
      GS.queue.splice(i, 1);
      n++;
    } // they come out of the building instead of out of the dark: no more of them than the night had
  for (let i = 0; i < n * 2; i++)
    GS.later.push({
      t: 2 + i * (i < 6 ? 0.9 : 0.35),
      fn: () => {
        if (GS.state !== 'play' || GS.nightDone) return;
        const [x, y] = floor[(Math.random() * floor.length) | 0],
          z = makeEnemy('skitter', x + rand(-8, 8), y + rand(-8, 8));
        z.emerge = 1;
        z.aw = 6;
        if (Math.random() < 0.35) {
          z.run = true;
          z.sp *= 1.6;
        }
      },
    });
  GS.later.push({
    t: 1.2,
    fn: () =>
      GS.state === 'play' &&
      showStreak('The wards are emptying', 'Everything still inside County Hospital is coming out', true),
  });
}
