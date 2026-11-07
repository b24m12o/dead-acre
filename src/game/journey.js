/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The campaign: fifteen nights on the road from Dead Acre to the County Hospital, a night or a few at each stop
// (route.js). When it's time to move on, the dawn doesn't run out. Either the road out is marked at the edge of
// the map and you walk it, coming in on the same road at the next place; or a convoy truck pulls up, you climb
// into the back, and you ride the mounted gun across the map while the dead come at it. The dead that heard the
// night's fight drift in while you make your way out. The whole run goes with you: gear, guns, ammo, traps, your
// people and your level.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, angDiff, clamp, d2, damp, rand } from '../core/util.js';
import { MH, MW, ROAD, RY, TILE, WH, WW, fires, grid, isWall, ttype } from '../world/map.js';
import { breakTile } from '../world/physics.js';
import { GUN_HEAT } from './evac-ride.js';
import { ZOOM, addLight, viewH, viewW } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { noise, playS, thr, tone } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { showStreak } from '../ui/callouts.js';
import { chips, floatText, shake, sparks } from '../render/effects.js';
import { makeEnemy } from '../actors/enemies.js';
import { freeSpot } from '../actors/backups.js';
import { mouse } from '../core/input.js';
import { opt } from '../core/settings.js';
import { S, cam } from './state.js';
import { hurtEnemy, hurtPlayer } from './combat.js';
import { query } from '../world/nav.js';
import { STOPS, stopAt } from './route.js';

export const journeyOn = () => !!(GS.RUN && GS.RUN.journey && !GS.RUN.hm && !GS.RUN.practice);
export const stopNow = () => (GS.RUN && Number.isInteger(GS.RUN.stop) ? GS.RUN.stop : stopAt(GS.wave + 1));
// how you leave after this night, if this is the place's last one: 'foot' or 'truck'
export const leaveAfter = w => {
  if (!journeyOn()) return null;
  const s = STOPS[stopNow()];
  return s && s.to === w && s.leave ? s.leave : null;
};
export const nextStop = () => STOPS[Math.min(STOPS.length - 1, stopNow() + 1)];

const TL = 118,
  TW_ = 44; // the box truck's length and width, as the parked ones on the map
const lo = () => 5 * TILE,
  hi = () => (MW - 5) * TILE; // the map's inner edge (as functions: this module loads before the map's sizes do)
const open = (x, y) => {
  const tx = Math.floor(x / TILE),
    ty = Math.floor(y / TILE);
  return tx > 1 && ty > 1 && tx < MW - 2 && ty < MH - 2 && !isWall(tx, ty);
};
const roomy = (x, y, r = 16) => open(x, y) && open(x + r, y) && open(x - r, y) && open(x, y + r) && open(x, y - r);
// a spot near one edge of the map: on the main road if there is one, else the open ground nearest the middle
// of that edge. side 1 is east, -1 west
function edgeSpot(side) {
  const xs = [];
  for (let k = 0; k < 12; k++) xs.push(side > 0 ? hi() - k * TILE : lo() + k * TILE);
  if (RY && RY.includes(30)) for (const x of xs) if (roomy(x, 30.5 * TILE, 18)) return [x, 30.5 * TILE];
  for (const x of xs)
    for (let d = 0; d < 20; d++)
      for (const sg of [1, -1]) {
        const y = WH / 2 + sg * d * TILE;
        if (roomy(x, y, 18)) return [x, y];
      }
  return null;
}
// ---- the dead that heard the fight: a few drift in while you head out, more the longer you take ----
function stragglers(J, dt) {
  J.strT = (J.strT ?? 9) - dt;
  J.str = J.str || 0;
  if (J.strT > 0 || J.str >= 10) return;
  J.strT = Math.max(1.6, 4.2 - J.str * 0.25);
  J.str++;
  // they come from behind you, where the night's fight was, not from the road ahead: of a few spots, the one furthest
  // from the way out
  const W = wayOut();
  let best = null,
    bd = -1;
  for (let k = 0; k < (W ? 5 : 1); k++) {
    const sp = freeSpot(560, 900, true),
      d = W ? d2(sp[0], sp[1], W.x, W.y) : 0;
    if (d > bd) {
      bd = d;
      best = sp;
    }
  }
  const [x, y] = best,
    e = makeEnemy(Math.random() < 0.8 ? 'skitter' : 'hound', x, y);
  e.emerge = 1;
  e.aw = 6;
}

// ---- on foot: the road out, marked at the east edge ----
export function markRoadOut() {
  const sp = edgeSpot(1) || freeSpot(500, 800);
  GS.roadOut = { x: sp[0], y: sp[1], t: 0 };
  showStreak('The road out', `${nextStop().name} is up the road · walk east to the marker`, true);
}
export function roadOutLive() {
  return !!(GS.roadOut && !GS.roadOut.gone);
}
function tickRoadOut(dt, onLeave) {
  const O = GS.roadOut,
    P = GS.P;
  O.t += dt;
  if (P.hp > 0 && d2(P.x, P.y, O.x, O.y) < 70 * 70) {
    O.gone = true;
    onLeave('foot');
    return;
  }
  stragglers(O, dt);
}

// ---- the truck ----
export function truckLive() {
  return !!(GS.truck && !GS.truck.gone);
}
// where it can pull up: along the main road from whichever end leaves it a clear run to a spot a fair walk from
// you, or, on ground with no road through it, parked out of sight in the open
export function callTruck(now = false) {
  const P = GS.P,
    row = RY && RY.includes(30) ? 30 : null;
  let t = null;
  if (row !== null) {
    const y = (row + 0.5) * TILE,
      clear = (x0, x1) => {
        const a = clamp(Math.min(x0, x1), TILE / 2, WW - TILE / 2),
          b = clamp(Math.max(x0, x1), TILE / 2, WW - TILE / 2);
        for (let x = a; x <= b; x += TILE / 2)
          for (const dy of [-14, 14]) if (isWall(Math.floor(x / TILE), Math.floor((y + dy) / TILE))) return false;
        return true;
      }; // the lane from the map's edge to the spot, inside the map
    for (const side of P.x < WW / 2 ? [1, -1] : [-1, 1]) {
      const edge = side > 0 ? (MW - 4.5) * TILE : 4.5 * TILE; // in from just inside the map's edge, well off screen
      let stop = clamp(P.x + side * rand(440, 560), lo(), hi());
      if (Math.abs(stop - P.x) < 300) continue;
      while (stop > lo() && stop < hi() && !clear(edge, stop - side * (TL / 2 + 10))) stop += side * TILE; // something on the road: pull up on the near side of it
      if (stop <= lo() || stop >= hi() || !clear(edge, stop - side * (TL / 2 + 10))) continue;
      t = { x: now ? stop : edge, y, a: side > 0 ? Math.PI : 0, stopX: stop, v: now ? 0 : 260, drive: !now };
      break;
    }
  }
  if (!t) {
    const [x, y] = freeSpot(380, 620, !now);
    t = { x, y, a: rand(0, TAU), stopX: x, v: 0, drive: false, parked: true };
  }
  GS.truck = Object.assign(t, {
    truck: true,
    hp: 1,
    max: 1,
    lights: true,
    tint: [0.72, 0.78, 0.66], // convoy olive, under the grime
    col: '#7a8466',
    t: 0,
    board: 0,
    honked: now,
  });
  if (now) GS.truck.parked = true;
  if (!t.drive) GS.truck.honked = false; // no road to come up: it is simply there, out of sight, and sounds its horn
}
function honk(k = 1) {
  tone(196, 0.42, 'sawtooth', 0.045 * k, 1, 0, 900);
  tone(247, 0.42, 'sawtooth', 0.035 * k, 1, 0, 900);
  tone(196, 0.3, 'sawtooth', 0.04 * k, 1, 0.55, 900);
  tone(247, 0.3, 'sawtooth', 0.03 * k, 1, 0.55, 900);
} // a tired two-tone horn, twice
function diesel(T, P, dt, k = 1) {
  if ((T.engT = (T.engT || 0) - dt) > 0) return;
  T.engT = 0.18;
  noise(0.22, 0.02 * k * clamp(1 - Math.hypot(T.x - P.x, T.y - P.y) / 1400, 0, 1), 140, 90, 'lowpass');
}
function tickTruck(dt) {
  const T = GS.truck,
    P = GS.P;
  T.t += dt;
  if (T.drive) {
    const left = (T.stopX - T.x) * Math.cos(T.a);
    T.v = Math.min(260, Math.sqrt(2 * 320 * Math.max(0, left)) + 6); // a steady run in, then brakes
    T.x += Math.cos(T.a) * T.v * dt;
    if (left <= 2) {
      T.x = T.stopX;
      T.drive = false;
      T.parked = true;
      T.v = 0;
    }
    diesel(T, P, dt);
  }
  if (T.parked && !T.honked) {
    T.honked = true;
    honk();
    showStreak('The truck is here', `${nextStop().name} is next · walk to it to climb aboard`, true);
  }
  // you can't walk through it
  {
    const c = Math.cos(T.a),
      s = Math.sin(T.a),
      rx = P.x - T.x,
      ry = P.y - T.y,
      u = rx * c + ry * s,
      v = -rx * s + ry * c,
      hu = TL / 2 + P.r * 0.6,
      hv = TW_ / 2 + P.r * 0.6;
    if (Math.abs(u) < hu && Math.abs(v) < hv) {
      let nu = u,
        nv = v;
      if (hu - Math.abs(u) < hv - Math.abs(v)) nu = Math.sign(u || 1) * hu;
      else nv = Math.sign(v || 1) * hv; // out by the shorter way
      P.x = T.x + nu * c - nv * s;
      P.y = T.y + nu * s + nv * c;
    }
  }
  if (T.parked) {
    const near = d2(P.x, P.y, T.x, T.y) < (TL / 2 + 46) ** 2 && P.hp > 0 && !(P.dashT > 0);
    T.board = near ? T.board + dt : Math.max(0, T.board - dt * 2);
    if (T.board >= 1.1) {
      sfx.ammo();
      floatText(P.x, P.y - 44, 'Aboard', '#8ef0b8', 16);
      startRide(T);
      return;
    }
    stragglers(T, dt);
  }
}

// ---- the ride: the truck drives on across the map and out, and you're on the gun in the back ----
const SMASH = new Set([2, 8, 9]); // rubble, headstones, fences: what the truck goes through
const RIDE_V = 175; // a working truck's pace through wrecked streets: quicker than you can run, slow enough to be caught on the corners
// the way out over open ground, keeping to the road where there is one: cheapest path from the truck to the far
// edge, then rounded off so the truck takes the corners in curves
// the drive out: not straight for the nearest edge but the long way round, through the streets, by a couple of
// waypoints out on through-roads (the truck has to go round what's blocking the short way), then off the far side.
// Each leg is a cheapest-path search over the tiles; roads it has already driven cost more, so it loops round blocks
// instead of doubling back.
function ridePath(T) {
  const side = T.x > WW / 2 ? -1 : 1,
    N = MW * MH,
    used = new Uint8Array(N),
    shut = new Uint8Array(N), // the road just driven, behind the truck: no turning round on it
    s0 = Math.floor(T.y / TILE) * MW + Math.floor(T.x / TILE),
    edge = i => (side > 0 ? i % MW >= MW - 6 : i % MW <= 5),
    base = new Float32Array(N);
  // each tile's own cost, once: down the middle of the road, clear of the wrecks (the truck is wider than a tile)
  for (let ty = 0; ty < MH; ty++)
    for (let tx = 0; tx < MW; tx++) {
      const i = ty * MW + tx;
      if (isWall(tx, ty)) {
        base[i] = 1e9;
        continue;
      }
      let near = 0,
        far = 0;
      for (let j = -2; j <= 2; j++)
        for (let k = -2; k <= 2; k++)
          if (isWall(tx + k, ty + j)) {
            if (Math.abs(j) <= 1 && Math.abs(k) <= 1) near++;
            else far++;
          }
      base[i] = 1 + near * 6 + far * 0.6 + (ROAD && ROAD[i] ? 0 : 1.2);
    }
  const step = i => (shut[i] ? 1e9 : base[i] + used[i] * 8),
    cost = new Float32Array(N),
    from = new Int32Array(N),
    done = new Uint8Array(N);
  const leg = (from0, goal) => {
    cost.fill(1e9);
    from.fill(-1);
    done.fill(0);
    cost[from0] = 0;
    let end = -1;
    // a binary heap on cost (stale entries are skipped when they come up)
    const heap = [from0],
      hpush = v => {
        heap.push(v);
        for (let c = heap.length - 1; c > 0; ) {
          const pa = (c - 1) >> 1;
          if (cost[heap[pa]] <= cost[heap[c]]) break;
          [heap[pa], heap[c]] = [heap[c], heap[pa]];
          c = pa;
        }
      },
      hpop = () => {
        const top = heap[0],
          last = heap.pop();
        if (heap.length) {
          heap[0] = last;
          for (let c = 0; ; ) {
            const l = 2 * c + 1,
              r = l + 1;
            let m = c;
            if (l < heap.length && cost[heap[l]] < cost[heap[m]]) m = l;
            if (r < heap.length && cost[heap[r]] < cost[heap[m]]) m = r;
            if (m === c) break;
            [heap[m], heap[c]] = [heap[c], heap[m]];
            c = m;
          }
        }
        return top;
      };
    while (heap.length) {
      const i = hpop();
      if (done[i]) continue;
      done[i] = 1;
      if (goal(i) && i !== from0) {
        end = i;
        break;
      }
      const tx = i % MW,
        ty = (i / MW) | 0;
      for (const [ox, oy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = tx + ox,
          ny = ty + oy;
        if (nx < 2 || ny < 2 || nx >= MW - 2 || ny >= MH - 2) continue;
        const j = ny * MW + nx,
          c = cost[i] + step(j);
        if (c < cost[j]) {
          cost[j] = c;
          from[j] = i;
          hpush(j);
        }
      }
    }
    const out = [];
    for (let i = end; i >= 0 && i !== from0; i = from[i]) out.push(i);
    return end >= 0 ? out.reverse() : null;
  };
  // the waypoints: through-road tiles (road on both sides along it), well apart
  let loose = false; // when the map has too few streets for that: any paved ground will do
  const through = i => {
      const tx = i % MW,
        ty = (i / MW) | 0,
        rd = (x, y) => ROAD && (loose ? ROAD[y * MW + x] : ROAD[y * MW + x] === 1) && !isWall(x, y);
      return (
        tx > 6 &&
        ty > 6 &&
        tx < MW - 7 &&
        ty < MH - 7 &&
        rd(tx, ty) &&
        ((rd(tx - 1, ty) && rd(tx + 1, ty)) || (rd(tx, ty - 1) && rd(tx, ty + 1)))
      );
    },
    tpos = i => [((i % MW) + 0.5) * TILE, (((i / MW) | 0) + 0.5) * TILE],
    pickWp = (fromI, minD, goalSide) => {
      const [fx, fy] = tpos(fromI);
      for (let k = 0; k < 300; k++) {
        const i = ((Math.random() * N) | 0) % N;
        if (!through(i)) continue;
        const [x, y] = tpos(i);
        if (Math.hypot(x - fx, y - fy) < minD) continue;
        if (goalSide && (x - WW / 2) * side < WW * 0.05) continue;
        if (!goalSide && (x - WW / 2) * side > WW * 0.15) continue;
        return i;
      }
      return -1;
    };
  let w1 = pickWp(s0, 700, false),
    w2 = w1 >= 0 ? pickWp(w1, 700, true) : -1;
  if (w1 < 0 || w2 < 0) {
    loose = true;
    if (w1 < 0) w1 = pickWp(s0, 700, false);
    if (w1 >= 0) w2 = pickWp(w1, 700, true);
  }
  // the whole drive through the given waypoints and off the far edge
  let idx, at, badRun;
  const drive = wps => {
    badRun = false;
    idx = [s0];
    at = s0;
    used.fill(0);
    const behind = () => {
      shut.fill(0);
      const ax = at % MW,
        ay = (at / MW) | 0,
        b0 = idx[Math.max(0, idx.length - 5)];
      let dx = ax - (b0 % MW),
        dy = ay - ((b0 / MW) | 0);
      if (idx.length < 3) {
        dx = Math.cos(T.a);
        dy = Math.sin(T.a);
      } // at the start, behind is where the truck's tailgate points
      for (let k = Math.max(0, idx.length - 9); k < idx.length; k++)
        for (let j = -3; j <= 3; j++)
          for (let q = -3; q <= 3; q++) {
            const tx = (idx[k] % MW) + q,
              ty = ((idx[k] / MW) | 0) + j;
            if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) continue;
            if ((tx - ax) * dx + (ty - ay) * dy < 0) shut[ty * MW + tx] = 1;
          }
    }; // the road behind it, its whole width, is shut for the next leg: it drives on, round the block, not back
    for (const w of wps) {
      if (w < 0) continue;
      behind();
      const near = i => i === w; // the waypoint itself (a through-road tile, open), not a tile beside it: no jog
      let L1 = leg(at, near);
      if (!L1 && idx.length < 3) {
        shut.fill(0);
        L1 = leg(at, near);
      } // parked facing a dead end: it turns round first
      if (!L1) continue;
      for (const i of L1) used[i] = 1;
      idx = idx.concat(L1);
      at = idx[idx.length - 1];
    }
    behind();
    let L2 = leg(at, edge);
    if (!L2) {
      shut.fill(0);
      L2 = leg(at, edge);
      badRun = true;
    } // a dead end after all: turning round is better than stopping
    if (L2) idx = idx.concat(L2);
    else if (idx.length < 4) idx = [];
    return idx;
  };
  const tries = [];
  for (const wps of [[w1, w2], [w1], []]) {
    const r = drive(wps);
    tries.push({ idx: r.slice(), bad: badRun });
  }
  const fit = t => (t.bad ? 1e6 : 0) + Math.abs(t.idx.length - 95);
  tries.sort((p, q) => fit(p) - fit(q));
  idx = tries[0].idx; // of the ways round, the one nearest half a minute's drive (about 95 tiles) that never doubles back
  let pts = idx.map(i => [(i % MW) * TILE + TILE / 2, ((i / MW) | 0) * TILE + TILE / 2]);
  if (pts.length < 4)
    pts = [
      [T.x, T.y],
      [T.x + Math.cos(T.a) * 600, T.y + Math.sin(T.a) * 600],
    ]; // nowhere to go: straight on
  pts[0] = [T.x, T.y];
  for (let it = 0; it < 3; it++) {
    const q = [pts[0]];
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, ay] = pts[k],
        [bx, by] = pts[k + 1];
      q.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    q.push(pts[pts.length - 1]);
    pts = q;
  } // corner-cutting smooths the tile path into curves
  const L = [0];
  for (let k = 1; k < pts.length; k++)
    L.push(L[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  return { pts, L, len: L[L.length - 1] };
}
function along(Rp, s) {
  s = clamp(s, 0, Rp.len);
  let k = 1;
  while (k < Rp.L.length - 1 && Rp.L[k] < s) k++;
  const [ax, ay] = Rp.pts[k - 1],
    [bx, by] = Rp.pts[k],
    f = (s - Rp.L[k - 1]) / Math.max(1e-6, Rp.L[k] - Rp.L[k - 1]);
  return [ax + (bx - ax) * f, ay + (by - ay) * f, Math.atan2(by - ay, bx - ax)];
}
// out of the truck's box, by the shorter way: nothing stands inside it
function outOfBox(T, o, pad) {
  const c = Math.cos(T.a),
    s = Math.sin(T.a),
    rx = o.x - T.x,
    ry = o.y - T.y,
    u = rx * c + ry * s,
    v = -rx * s + ry * c,
    hu = TL / 2 + pad,
    hv = TW_ / 2 + pad;
  if (Math.abs(u) >= hu || Math.abs(v) >= hv) return false;
  let nu = u,
    nv = v;
  if (hu - Math.abs(u) < hv - Math.abs(v)) nu = Math.sign(u || 1) * hu;
  else nv = Math.sign(v || 1) * hv;
  o.x = T.x + nu * c - nv * s;
  o.y = T.y + nu * s + nv * c;
  return true;
}
const offView = (x, y, m = 70) => x < cam.x - m || x > cam.x + viewW + m || y < cam.y - m || y > cam.y + viewH + m;
// a spot to the side of the road some way ahead, out of sight: a yard, an alley, a gap between houses
function sideSpot(r, a0, a1, o0, o1) {
  for (let k = 0; k < 40; k++) {
    const [ax, ay, aa] = along(r.path, r.s + rand(a0, a1)),
      off = rand(o0, o1) * (Math.random() < 0.5 ? 1 : -1),
      x = ax - Math.sin(aa) * off,
      y = ay + Math.cos(aa) * off;
    if (roomy(x, y, 12) && offView(x, y)) return [x, y];
  }
  return null;
}
function startRide(T) {
  const P = GS.P;
  T.ride = { t: 0, s: 0, path: ridePath(T), heat: 0, over: 0, cd: 0, spawnT: 1.5, kills0: GS.kills };
  T.parked = false;
  T.bud = GS.buddies; // your people are in the cab
  GS.buddies = [];
  P.ride = 'truck';
  P.inv = 1e9;
  P.vx = P.vy = 0;
  honk(0.6);
  GS.streakQ.length = 0;
  GS.streakT = 0; // "the truck is here" is done with
  showStreak(
    'On the gun',
    'Hold click to fire where you aim · the ring round your sights is its heat: fire in bursts',
    true
  );
  // the dead already shambling about on the road ahead, out of sight: there when the truck comes round the corner
  const r = T.ride;
  if (r.path.len > 1100) {
    // halfway or so, where both wrecks stand on open road (not on a burning barrel or a wall)
    const clearAt = s0 => {
        const [x, y, a] = along(r.path, s0);
        return [-1, 1].every(k => {
          const cx = x - Math.sin(a) * k * 34,
            cy = y + Math.cos(a) * k * 34;
          return (
            !isWall(Math.floor(cx / TILE), Math.floor(cy / TILE)) && !fires.some(f => d2(f.x, f.y, cx, cy) < 70 * 70)
          );
        });
      },
      bs =
        [0.52, 0.46, 0.58, 0.4, 0.64].map(f => clamp(r.path.len * f, 560, r.path.len - 420)).find(clearAt) ??
        clamp(r.path.len * 0.52, 560, r.path.len - 420),
      [bx, by, ba] = along(r.path, bs),
      px = -Math.sin(ba),
      py = Math.cos(ba);
    r.block = {
      s: bs,
      hp: 5,
      t: 0,
      on: false,
      push: 0,
      cars: [-1, 1].map(k => ({
        x: bx + px * k * 34,
        y: by + py * k * 34,
        a: ba + Math.PI / 2 + rand(-0.35, 0.35),
        k,
        px,
        py,
      })),
    };
  } // halfway, a roadblock: two burnt-out wrecks across the road, and the driver has to ram his way through
  for (let s0 = 520; s0 < r.path.len - 320; s0 += rand(380, 560)) {
    const [ax, ay] = along(r.path, s0);
    if (!offView(ax, ay, 120)) continue;
    const n = 3 + ((Math.random() * 4) | 0);
    for (let i = 0; i < n; i++) {
      const x = ax + rand(-70, 70),
        y = ay + rand(-70, 70);
      if (!roomy(x, y, 10)) continue;
      const z = makeEnemy('skitter', x, y);
      z.emerge = 1;
      z.cvy = true; // one of the dead that came at the convoy
    }
  }
}
export const riding = () => !!(GS.truck && GS.truck.ride && !GS.truck.gone);
function tickRide(dt, onLeave) {
  const T = GS.truck,
    r = T.ride,
    P = GS.P;
  r.t += dt;
  const B = r.block && r.block.hp > 0 ? r.block : null,
    blockAt = B ? B.s - TL / 2 - 34 : 1e9;
  // it brakes for the corners and the end of the road, and picks up speed again after
  const [, , ca] = along(r.path, r.s + 30),
    [, , cb] = along(r.path, r.s + 150),
    turn = Math.abs(angDiff(ca, cb)),
    vw = RIDE_V * clamp(1.15 - turn * 0.85, 0.42, 1) * (r.s > r.path.len - 200 ? 0.6 : 1);
  r.v = r.v ?? 0;
  r.v += (vw - r.v) * damp(vw < r.v ? 3 : 0.9, dt);
  let v = r.v;
  if (B && r.s > blockAt - 220) v = r.v = Math.min(v, 30 + (blockAt - r.s) * 0.6); // he brakes for it
  r.s = Math.min(r.s + Math.max(0, v) * dt, blockAt);
  let back = 0;
  if (B && r.s >= blockAt - 0.5) {
    v = r.v = 0;
    if (!B.on) {
      B.on = true;
      honk(1);
      showStreak('Roadblock', 'Hold them off while he rams through', true);
      r.rush = 16 + 2 * Math.min(6, GS.wave >> 1); // they heard the horn
    }
    B.t += dt;
    const ph = B.t % 1.7;
    back = ph < 0.9 ? 26 * Math.sin((ph / 0.9) * (Math.PI / 2)) : 26 * (1 - (ph - 0.9) / 0.22);
    back = Math.max(0, back); // reverses a little, then floors it
    if (B.t > 0.6 && ph >= 1.12 && !B.hit) {
      B.hit = true;
      B.hp--;
      shake(0.55);
      sfx.crunch(B.cars[0].x, B.cars[0].y);
      sfx.signClang(B.cars[1].x, B.cars[1].y);
      sfx.thump(B.cars[0].x, B.cars[0].y);
      sfx.tink(B.cars[1].x, B.cars[1].y); // steel on steel, and the glass going
      for (const c of B.cars) {
        chips(c.x, c.y, 10, null, 4, 220);
        sparks(c.x, c.y, [1, 0.7, 0.35], 8, 260);
        c.a += rand(-0.18, 0.18);
      }
      B.push += B.hp ? 6 : 0;
      const [fx, fy] = along(r.path, r.s + TL / 2);
      query(fx, fy, 70, z => {
        if (!z.dead && z.dying === undefined && z.type !== 'queen')
          hurtEnemy(z, 400, false, Math.cos(T.a), Math.sin(T.a), 3, 'truck');
      }); // whatever stood between the bumper and the wrecks
      if (!B.hp) {
        floatText(B.cars[0].x, B.cars[0].y - 40, 'Through', '#ffd08a', 18);
        honk(0.8);
      }
    }
    if (ph < 1.12) B.hit = false;
  }
  if (r.block && r.block.hp <= 0) r.block.push = Math.min(70, r.block.push + dt * 160); // shoved aside as he goes through
  const [x, y, a] = along(r.path, r.s - back);
  T.x = x;
  T.y = y;
  T.a += angDiff(T.a, a) * damp(2.4, dt);
  diesel(T, P, dt, 1.6);
  // whatever stands in the road ahead goes under the bumper or is thrown aside
  if (v > 30) {
    const fx = T.x + Math.cos(T.a) * (TL / 2 - 6),
      fy = T.y + Math.sin(T.a) * (TL / 2 - 6);
    query(fx, fy, 46, z => {
      if (z.dead || z.dying !== undefined || z.type === 'queen' || (z.ramT || 0) > GS.time) return;
      if (d2(z.x, z.y, fx, fy) > 46 * 46) return;
      z.ramT = GS.time + 0.5;
      hurtEnemy(z, 160 + 10 * GS.wave, false, Math.cos(T.a), Math.sin(T.a), 3.2, 'truck');
      if (thr('ram', 90)) sfx.crate(z.x, z.y); // the thump of it
    });
  }
  // fences, rubble and headstones it clips go down under it
  {
    const c = Math.cos(T.a),
      sn = Math.sin(T.a);
    for (const u of [TL / 2 - 4, TL / 4, 0, -TL / 4])
      for (const w of [-TW_ / 2 + 4, TW_ / 2 - 4]) {
        const tx = Math.floor((T.x + u * c - w * sn) / TILE),
          ty = Math.floor((T.y + u * sn + w * c) / TILE),
          i = ty * MW + tx;
        if (tx > 0 && ty > 0 && tx < MW && ty < MH && grid[i] && SMASH.has(ttype[i])) {
          breakTile(i);
          shake(0.12);
        }
      }
  }
  // you ride in the bed, behind the cab
  P.x = T.x - Math.cos(T.a) * 30;
  P.y = T.y - Math.sin(T.a) * 30;
  P.vx = Math.cos(T.a) * v;
  P.vy = Math.sin(T.a) * v;
  P.inv = 1e9;
  P.hp = Math.max(P.hp, 1);
  P.aimA = Math.atan2(cam.y + mouse.y / ZOOM - P.y, cam.x + mouse.x / ZOOM - P.x);
  P.bodyA += angDiff(P.bodyA, P.aimA) * damp(10, dt);
  mountedGun(r, P, dt);
  if (GS.xp >= GS.xpNeed && !r.lvTold) {
    r.lvTold = true;
    floatText(P.x, P.y - 70, 'Level up · pick when you climb down', '#8ef0b8', 15);
  } // the cards wait for solid ground
  // the dead come out of the side streets ahead of the truck, running at the engine: they start out of sight
  // and you see them come in from the edges, never out of thin air
  r.spawnT -= dt;
  if (r.spawnT <= 0 && GS.enemies.length < 120 && r.s < r.path.len - 300) {
    const rush = r.rush > 0;
    r.spawnT = rush ? 0.3 : 0.42;
    if (rush) r.rush -= 2;
    const sp = rush ? sideSpot(r, -380, 380, 300, 520) : sideSpot(r, 480, 900, 150, 460);
    if (sp) {
      const n = 2 + ((Math.random() * 2) | 0);
      for (let i = 0; i < n; i++) {
        const z = makeEnemy(Math.random() < 0.1 ? 'hound' : 'skitter', sp[0] + rand(-14, 14), sp[1] + rand(-14, 14));
        z.emerge = 1;
        z.aw = 9;
        z.cvy = true; // one of the dead that came at the convoy
        if (Math.random() < 0.55) {
          z.run = true;
          z.sp *= 1.8;
        }
      }
    }
  }
  // they can climb at it, not into it: the ones that reach it grab on and claw at you until you shoot them off,
  // or the truck picks up speed and shakes them loose
  let cl = 0;
  for (const z of GS.enemies) if (z.cling && !z.dead) cl++;
  query(T.x, T.y, TL / 2 + 40, z => {
    if (z.dead || z.type === 'queen' || z.fly || z.cling) return;
    if (outOfBox(T, z, z.r * 0.7) && !z.crawl && cl < 4 && Math.random() < (v < 60 ? 0.05 : 0.012)) {
      const c = Math.cos(T.a),
        sn = Math.sin(T.a),
        rx = z.x - T.x,
        ry = z.y - T.y;
      z.cling = { u: clamp(rx * c + ry * sn, -TL / 2, TL / 2), w: -rx * sn + ry * c, t: 0, hitT: 0.9 };
      sfx.growl(z.x, z.y); // one has a hold of the side
      cl++;
    }
  });
  for (const z of GS.enemies) {
    const g = z.cling;
    if (!g) continue;
    if (z.dead || z.dying !== undefined) {
      z.cling = null;
      continue;
    }
    g.t += dt;
    const c = Math.cos(T.a),
      sn = Math.sin(T.a),
      u = g.u - back;
    const wob = Math.sin(GS.time * 9 + z.id) * 1.6; // hauling at the side, not buzzing
    z.x = T.x + u * c - g.w * sn + wob * c;
    z.y = T.y + u * sn + g.w * c + wob * sn;
    z.vx = P.vx;
    z.vy = P.vy;
    z.a = Math.atan2(P.y - z.y, P.x - z.x);
    if ((g.hitT -= dt) <= 0) {
      g.hitT = rand(0.9, 1.3);
      const dmg = 5 + GS.wave * 0.6;
      if (P.hp - dmg * 1.6 > S.maxHp * 0.35) {
        P.inv = 0;
        hurtPlayer(dmg, z.x, z.y, 'a climber');
        P.inv = 1e9;
      } else {
        shake(0.3);
        sfx.wet(z.x, z.y);
        floatText(P.x, P.y - 40, 'Hold on', '#ff8a5a', 14);
      } // it can bleed you, but a ride never ends you: you get there on whatever you have left
    }
    if (v > 70 && g.t > 2.2 && Math.random() < dt * 0.9) {
      z.cling = null;
      hurtEnemy(z, 30, false, -Math.sin(T.a) * Math.sign(g.w || 1), Math.cos(T.a) * Math.sign(g.w || 1), 2.5, 'truck');
    } // shaken loose at speed
  }
  if (r.s >= r.path.len - 1) {
    for (const z of GS.enemies) z.cling = null;
    T.gone = true;
    P.ride = false;
    P.inv = 1;
    P.vx = P.vy = 0;
    GS.buddies = T.bud || [];
    const k = GS.kills - r.kills0;
    if (k) floatText(P.x, P.y - 50, `${k} from the back of the truck`, '#ffd08a', 15);
    onLeave('truck');
  }
}
// the gun in the truck bed: where you aim, while you hold it, until it overheats
function mountedGun(r, P, dt) {
  r.cd -= dt;
  if (r.over > 0) {
    r.over -= dt;
    r.heat = Math.max(GUN_HEAT.after, r.heat - dt * 0.4);
    if (r.over <= 0) {
      r.heat = GUN_HEAT.after;
      sfx.pump(); // cooled enough: the gunner racks it, ready again
    }
  } else if (!mouse.down) r.heat = Math.max(0, r.heat - dt * GUN_HEAT.cool);
  if (!mouse.down || r.over > 0 || r.cd > 0 || r.t < 1.2) return;
  r.cd = 0.08;
  r.heat += 0.0115; // the same budget as the door gun: about seven seconds from cold (evac-ride.js GUN_HEAT)
  shake(0.025);
  const c = Math.cos(P.aimA),
    s = Math.sin(P.aimA),
    sp = 0.03 + r.heat * 0.09,
    a = P.aimA + rand(-sp, sp);
  GS.pbullets.push({
    x: P.x + c * 12,
    y: P.y + s * 12,
    vx: Math.cos(a) * 1500,
    vy: Math.sin(a) * 1500,
    life: 0.6,
    dmg: 40 + 2.5 * GS.wave,
    pierce: 1,
    bounce: 0,
    hits: [],
  });
  GS.flashes.push({ x: P.x + c * 36, y: P.y + s * 36, rot: P.aimA, life: 0.05, max: 0.05, reg: R.mf_rifle, fs: 1 });
  P.recoil = 4;
  if (!playS('lmg', 0.36, 0.92, 0, 0.4)) noise(0.06, 0.12, 2200, 500, 'bandpass');
  if (r.heat >= 1) {
    r.over = GUN_HEAT.lock;
    noise(0.6, 0.08, 6000, 3000, 'highpass');
    floatText(P.x, P.y - 60, 'Overheated', '#ff8a5a', 15);
  } // the barrel glows and the gun locks up a moment
}
export function rideHeat() {
  return riding() ? GS.truck.ride.heat : 0;
}

// one frame of whatever the journey has going: the truck coming, the ride, or the road out
export function tickJourney(dt, onLeave) {
  if (!GS.P || !GS.RUN || !GS.RUN.journey) return;
  if (riding()) tickRide(dt, onLeave);
  else if (truckLive()) tickTruck(dt);
  else if (roadOutLive()) tickRoadOut(dt, onLeave);
}
// where your way on is, for the markers, the radar and the boarding ring
export function wayOut() {
  const T = GS.truck;
  if (T && !T.gone && !T.ride && T.parked) return { x: T.x, y: T.y, label: 'TRUCK', board: T.board / 1.1 };
  if (roadOutLive()) return { x: GS.roadOut.x, y: GS.roadOut.y, label: 'ROAD OUT', board: 0 };
  return null;
}
export function journeyLights() {
  const T = GS.truck;
  if (T && !T.gone) {
    const c = Math.cos(T.a),
      s = Math.sin(T.a),
      fx = T.x + c * (TL / 2 + 8),
      fy = T.y + s * (TL / 2 + 8);
    addLight(fx, fy, 520, 1.0, 0.95, 0.8, T.a, 0.55); // headlights down the road
    const bx = T.x - c * (TL / 2 + 2),
      by = T.y - s * (TL / 2 + 2),
      k = T.parked ? (opt.flash ? 0.8 : 0.55 + 0.45 * (Math.sin(GS.time * 5) > 0 ? 1 : 0)) : 0.8;
    addLight(bx, by, 150, 1.1 * k, 0.55 * k, 0.12 * k); // the hazards blinking at the back, where you climb in
  }
  if (roadOutLive()) {
    const O = GS.roadOut,
      f = opt.flash ? 0.85 : 0.8 + Math.sin(GS.time * 13) * 0.1 + Math.sin(GS.time * 5.1) * 0.1; // steady with flashes reduced
    addLight(O.x, O.y, 240 * f, 1.3 * f, 0.35 * f, 0.18 * f); // a road flare where the road leaves
  }
}
export function clearJourney() {
  GS.truck = null;
  GS.roadOut = null;
}
// where you come in at a new place: at its west edge, on the road if there is one, your people with you
export function placeArrival() {
  const P = GS.P,
    sp = edgeSpot(-1);
  if (!sp) return;
  P.x = sp[0];
  P.y = sp[1];
  P.moveA = P.bodyA = P.aimA = 0;
  P.ant.x = P.x;
  P.ant.y = P.y;
  for (const q of P.scarf) {
    q.x = q.px = P.x;
    q.y = q.py = P.y;
  }
  GS.buddies.forEach((b, i) => {
    b.x = P.x - 40 - i * 22;
    b.y = P.y + (i % 2 ? -28 : 28);
    b.slot = null;
  });
  cam.x = P.x - viewW / 2;
  cam.y = P.y - viewH / 2;
  cam.vx = cam.vy = 0;
}

// the travel card: the road so far, the stop ahead, what comes with you
export function showRoute(onGo) {
  const el = $('route'),
    to = stopNow(),
    S = STOPS[to];
  if (!el) return () => onGo();
  el.querySelector('.eyebrow').textContent = `Night ${GS.wave} survived · on the road`;
  el.querySelector('h2').textContent = S.name;
  el.querySelector('.rdesc').textContent = S.desc;
  const road = el.querySelector('.road');
  road.innerHTML =
    STOPS.map(
      (s, i) =>
        `<span class="stop${i < to ? ' done' : ''}${i === to ? ' next' : ''}${i % 2 ? ' lo' : ''}" style="left: ${(i / (STOPS.length - 1)) * 100}%"><i></i>${s.short}</span>`
    ).join('') + '<b class="van"></b>';
  el.querySelector('.rcarry').textContent = [
    `${GS.P.owned.length} ${GS.P.owned.length === 1 ? 'gun' : 'guns'}`,
    GS.buddies.length ? `${GS.buddies.length} with you` : 'on your own',
    `level ${GS.level}`,
  ].join(' · '); // what comes with you
  el.style.setProperty('--from', (to - 1) / (STOPS.length - 1));
  el.style.setProperty('--to', to / (STOPS.length - 1));
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
  el.hidden = false;
  const btn = $('routeGo');
  btn.disabled = true;
  btn.textContent = 'On the road…';
  let ready = false,
    done = false;
  const go = () => {
    if (!ready || done) return;
    done = true;
    window.removeEventListener('keydown', key, true);
    el.hidden = true;
    onGo();
  };
  const key = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      go();
    }
  };
  window.addEventListener('keydown', key, true);
  btn.onclick = go;
  return () => {
    ready = true;
    btn.disabled = false;
    btn.textContent = 'Climb out · Enter';
    btn.focus({ preventScroll: true });
  }; // the caller says when the new place is laid out
}
// a quick fade to black and back, for the walk from one place into the next
export function fade(on) {
  const f = $('fade');
  if (f) f.classList.toggle('on', on);
}
