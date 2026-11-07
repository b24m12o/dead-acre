/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The campaign's own places (route.js). Main Street, the gas station and Hollow Hill are their districts' maps as
// they always were; these five are laid out here, on the same ground, walls, cars and props as their district so
// they belong to it, but each is its own place: St. Mary's clinic and the school behind it, the Starlite Motel and
// the burnt-out fire station, the quarry pit, Mill River and its bridge, and the County Hospital with its helipad.
// Every one keeps an east-west road across the middle (row 30) where it has a road at all, so the way in from the
// last place and the way on to the next line up, and leaves room for the open ruin a siege is fought in.
// k: the map builder's own tools (set, free, the arrays, bigRuin, lampAt), passed in by generateMap.
import { TAU, pick, rand, randi } from '../core/util.js';
import { MH, MW, ROAD, TILE, grid } from './map.js';

const at = (x, y) => y * MW + x;
// Mill River's banks, in tiles: two gentle curves, a little different each time
const RIVER = { ph: 0 };
export function riverAt(y) {
  const p = RIVER.ph;
  return [
    25 + Math.sin(y * 0.21 + p) * 1.4 + Math.sin(y * 0.53 + p * 2) * 0.45,
    34.5 + Math.sin(y * 0.17 + p + 2) * 1.3 + Math.sin(y * 0.61 + p * 3) * 0.4,
  ];
}
function paint(x0, y0, x1, y1, code) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (x > 1 && y > 1 && x < MW - 2 && y < MH - 2) ROAD[at(x, y)] = code;
}
// a street: three tiles of asphalt and a sidewalk each side, the whole width or height of the map
function streetX(rx) {
  for (let y = 2; y < MH - 2; y++)
    for (let d = -2; d <= 2; d++)
      ROAD[at(rx + d, y)] = Math.abs(d) <= 1 ? 1 : Math.max(ROAD[at(rx + d, y)] === 1 ? 1 : 0, 2);
}
function streetY(ry, x0 = 2, x1 = MW - 3) {
  for (let x = x0; x <= x1; x++)
    for (let d = -2; d <= 2; d++) ROAD[at(x, ry + d)] = Math.abs(d) <= 1 ? 1 : ROAD[at(x, ry + d)] === 1 ? 1 : 2;
}
function highway() {
  for (let x = 2; x < MW - 2; x++) for (let d = -4; d <= 4; d++) ROAD[at(x, 30 + d)] = Math.abs(d) <= 3 ? 1 : 2;
}
// a room: walls round a floor, gaps for its doors ([side 0 top, 1 right, 2 bottom, 3 left; where along it; how
// wide]). Rooms may share a wall: a door cut in it opens it for both
function room(k, x, y, w, h, o = {}) {
  const doors = o.doors || [],
    p = o.p ?? 1,
    gap = (side, i) => doors.some(([s, a, wd = 2]) => s === side && i >= a && i < a + wd),
    wall = (tx, ty, isGap) => {
      if (isGap) k.clear(tx, ty);
      else if (Math.random() < p) k.set(tx, ty, 5);
    };
  for (let i = 0; i < w; i++) {
    wall(x + i, y, gap(0, i));
    wall(x + i, y + h - 1, gap(2, i));
  }
  for (let j = 1; j < h - 1; j++) {
    wall(x, y + j, gap(3, j));
    wall(x + w - 1, y + j, gap(1, j));
  }
  k.houses.push({ x, y, w, h, style: o.style, open: !!o.open });
}
function car(k, tx, ty, o = {}) {
  const n = o.truck ? 3 : 2,
    cells = [];
  for (let i = 0; i < n; i++) cells.push(o.vert ? [tx, ty + i] : [tx + i, ty]);
  if (cells.some(([x, y]) => !k.free(x, y))) return false;
  for (const [x, y] of cells) k.set(x, y, 6);
  k.cars.push({
    tx,
    ty,
    x: (tx + (o.vert ? 0.5 : n / 2)) * TILE,
    y: (ty + (o.vert ? n / 2 : 0.5)) * TILE,
    a: (o.vert ? Math.PI / 2 : 0) + (o.flip ? Math.PI : 0) + (o.jit ?? rand(-0.08, 0.08)),
    col: o.col || pick(k.CAR_COLS),
    burnt: o.burnt ?? Math.random() < 0.2,
    truck: !!o.truck,
    tanker: !!o.tanker,
    police: !!o.police,
    amb: !!o.amb,
  });
  return true;
}
function tree(k, x, y, s = 1) {
  if (!k.free(x, y) || ROAD[at(x, y)]) return false;
  k.set(x, y, 3);
  k.trees.push({
    tx: x,
    ty: y,
    x: (x + 0.5) * TILE,
    y: (y + 0.5) * TILE,
    v: randi(0, 2),
    rot: rand(0, TAU),
    s: rand(0.85, 1.15) * s,
    fade: 1,
    sway: rand(0, TAU),
  });
  return true;
}
function fire(k, x, y) {
  if (!k.free(x, y)) return false;
  k.set(x, y, 7);
  k.fires.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, ph: rand(0, 10) });
  return true;
}
function box(k, x, y, hue = 0, hp = 45) {
  if (!k.free(x, y)) return false;
  k.set(x, y, 4);
  k.crystals.push({
    x: (x + 0.5) * TILE,
    y: (y + 0.5) * TILE,
    tx: x,
    ty: y,
    hue,
    alive: true,
    hp,
    flash: 0,
    grow: 1,
    rot: rand(-0.1, 0.1),
    s: rand(0.9, 1.05),
  });
  return true;
}
function fence(k, x, y, n, hz, gaps = []) {
  for (let i = 0; i < n; i++) {
    if (gaps.some(([a, b]) => i >= a && i <= b)) continue;
    const tx = hz ? x + i : x,
      ty = hz ? y : y + i;
    if (k.free(tx, ty) && !ROAD[at(tx, ty)]) k.set(tx, ty, 9);
  }
}
function rubble(k, x, y, n = randi(1, 3)) {
  for (let i = 0; i < n; i++) {
    if (k.free(x, y) && ROAD[at(x, y)] !== 1 && !roofed(k, x, y, 1)) k.set(x, y, 2); // never in a doorway
    x = Math.max(3, Math.min(MW - 4, x + randi(-1, 1)));
    y = Math.max(3, Math.min(MH - 4, y + randi(-1, 1)));
  }
}
// tries a placement at random spots in a box until n of them take
function scatter(n, x0, y0, x1, y1, fn, tries = 300) {
  for (let i = 0, t = 0; i < n && t < tries; t++) if (fn(randi(x0, x1), randi(y0, y1))) i++;
}
// small houses, like the town's, inside a box
function houses(k, n, x0, y0, x1, y1, p = 0.8) {
  scatter(
    n,
    x0,
    y0,
    x1,
    y1,
    (x, y) => {
      const w = randi(4, 6),
        h = randi(4, 6);
      if (x + w > x1 || y + h > y1) return false;
      for (let j = -1; j <= h; j++)
        for (let i = -1; i <= w; i++) if (ROAD[at(x + i, y + j)] || grid[at(x + i, y + j)]) return false;
      if (k.houses.some(o => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y))
        return false;
      const door = randi(0, 3),
        mid = s => (s % 2 ? Math.floor(h / 2) - 1 : Math.floor(w / 2) - 1);
      room(k, x, y, w, h, { p, doors: [[door, mid(door), 2]] });
      return true;
    },
    500
  );
}
// under a roof (or within m tiles of one, so nothing blocks a door), or on ground kept clear (a helipad)
const roofed = (k, x, y, m) =>
  k.houses.some(o => !o.open && x >= o.x - m && x <= o.x + o.w - 1 + m && y >= o.y - m && y <= o.y + o.h - 1 + m);
// the things every place has a few of: rubble, fire barrels, electrical boxes on the sidewalks, dead trees
function dressing(k, o = {}) {
  const kept = (x, y, m) =>
    roofed(k, x, y, m) || (o.keep || []).some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  scatter(
    o.rubble ?? 10,
    4,
    4,
    MW - 5,
    MH - 5,
    (x, y) => k.clearOK(x, y, 7) && !ROAD[at(x, y)] && k.free(x, y) && !kept(x, y, 1) && (rubble(k, x, y), true)
  );
  scatter(
    o.fires ?? 5,
    4,
    4,
    MW - 5,
    MH - 5,
    (x, y) =>
      ROAD[at(x, y)] !== 1 &&
      k.clearOK(x, y, 5) &&
      !kept(x, y, 1) &&
      !k.fires.some(f => Math.hypot(f.tx - x, f.ty - y) < 9) &&
      fire(k, x, y)
  );
  scatter(
    o.boxes ?? 6,
    4,
    4,
    MW - 5,
    MH - 5,
    (x, y) =>
      ROAD[at(x, y)] === 2 &&
      k.clearOK(x, y, 6) &&
      !kept(x, y, 1) &&
      !k.crystals.some(c => Math.hypot(c.tx - x, c.ty - y) < 6) &&
      box(k, x, y, Math.random() < 0.5 ? 0 : 1)
  );
  scatter(
    o.trees ?? 12,
    4,
    4,
    MW - 5,
    MH - 5,
    (x, y) =>
      k.clearOK(x, y, 6) && !kept(x, y, 1) && !k.trees.some(t => Math.hypot(t.tx - x, t.ty - y) < 4) && tree(k, x, y)
  );
}
// lamps along the streets, alternating sides, as in town
function streetLamps(k, RX, RY) {
  for (const rx of RX)
    for (let y = 5, s = 1; y < MH - 4; y += 7, s = -s) {
      if (RY.some(r => Math.abs(r - y) < 3)) continue;
      const bx = (rx + s * 2 + 0.5) * TILE + s * 12,
        by = (y + 0.5) * TILE;
      k.lampAt(bx, by, bx - s * 54, by);
    }
  for (const ry of RY)
    for (let x = 5, s = 1; x < MW - 4; x += 7, s = -s) {
      if (RX.some(r => Math.abs(r - x) < 3)) continue;
      const by = (ry + s * 2 + 0.5) * TILE + s * 12,
        bx = (x + 0.5) * TILE;
      k.lampAt(bx, by, bx, by - s * 54);
    }
}
function highwayLamps(k) {
  for (let x = 5, i = 0; x < MW - 4; x += 8, i++) {
    const top = i % 2 === 0,
      by = top ? 26.5 * TILE - 14 : 34.5 * TILE + 14;
    k.lampAt((x + 0.5) * TILE, by, (x + 0.5) * TILE, by + (top ? 60 : -60));
  }
}
// wrecks along a highway's lanes, and the odd concrete barrier
function highwayWrecks(k, n, skip = () => false) {
  scatter(
    n,
    3,
    0,
    MW - 6,
    0,
    x => {
      const lane = pick([-3, -2, -1, 1, 2, 3]),
        y = 30 + lane,
        truck = Math.random() < 0.12;
      if (skip(x) || (Math.abs(x - k.c0) < 5 && Math.abs(lane) < 3)) return false;
      if (k.cars.some(c => Math.abs(c.ty - y) < 1 && Math.abs(c.tx - x) < 5)) return false;
      return car(k, x, y, {
        truck,
        flip: lane < 0,
        col: truck ? '#c8c8c0' : undefined,
        burnt: Math.random() < 0.3,
        jit: Math.random() < 0.15 ? rand(0.25, 0.5) * (Math.random() < 0.5 ? -1 : 1) : rand(-0.12, 0.12),
      });
    },
    600
  );
}
function roadWrecks(k, RX, RY, n) {
  scatter(
    n,
    0,
    0,
    0,
    0,
    () => {
      const vert = RX.length && (Math.random() < 0.5 || !RY.length),
        rc = pick(vert ? RX : RY),
        lane = pick([-1, 1, 0]),
        along = randi(4, MH - 6),
        x = vert ? rc + lane : along,
        y = vert ? along : rc + lane;
      if (!k.clearOK(x, y, 6) || k.cars.some(c => Math.hypot(c.tx - x, c.ty - y) < 5)) return false;
      return car(k, x, y, { vert, flip: Math.random() < 0.5, jit: rand(-0.22, 0.22), burnt: Math.random() < 0.3 });
    },
    400
  );
}

export const LAYOUTS = {
  // St. Mary's: an avenue with one cross street; the clinic and its car park north of it, the school and its
  // fenced yard south, a few houses west, a gym the size of a barn
  clinic(k) {
    const RX = [16],
      RY = [30];
    k.roads(RX, RY);
    streetX(16);
    streetY(30);
    paint(21, 22, 46, 27, 3); // the clinic car park
    paint(21, 33, 53, 34, 2); // the school's front walk
    room(k, 22, 8, 12, 8, { style: 'store', doors: [[2, 5, 2]] }); // offices
    room(k, 22, 15, 12, 7, {
      style: 'store',
      doors: [
        [2, 5, 3],
        [0, 5, 2],
        [1, 3, 2],
      ],
    }); // the lobby
    room(k, 33, 8, 10, 14, {
      style: 'store',
      doors: [
        [3, 10, 2],
        [2, 4, 2],
      ],
    }); // the ward
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) k.set(36 + j * 3, 11 + i * 4, 2); // beds and cabinets knocked about the ward
    for (const x of [24, 27, 30, 37, 40])
      if (Math.random() < 0.65) car(k, x, 23, { vert: true, flip: Math.random() < 0.5 });
    car(k, 43, 23, { vert: true, truck: true, amb: true, col: '#e6e4dc', burnt: false }); // the ambulance, still where it was left
    for (const x of [22, 28, 34]) {
      const doors = [[2, 2, 2]];
      if (x === 28) doors.push([0, 3, 2]); // the front door, off the walk
      if (x === 34) doors.push([1, 2, 2]); // through to the gym
      room(k, x, 36, 7, 7, { style: 'store', doors });
    } // classrooms
    room(k, 40, 35, 12, 11, {
      style: 'store',
      doors: [
        [3, 3, 2],
        [2, 5, 2],
        [0, 5, 2],
      ],
    }); // the gym
    fence(k, 20, 47, 35, true, [
      [4, 6],
      [11, 12],
      [25, 26],
    ]);
    fence(k, 20, 48, 8, false);
    fence(k, 54, 48, 8, false);
    fence(k, 20, 55, 35, true, [[16, 18]]);
    paint(28, 49, 40, 53, 3); // the basketball court
    k.bigRuin();
    houses(k, 4, 3, 3, 13, 56);
    houses(k, 2, 45, 3, 56, 20);
    roadWrecks(k, RX, RY, 9);
    dressing(k, { trees: 14 });
    streetLamps(k, RX, RY);
    k.lampAt(34 * TILE, 24.5 * TILE, 34 * TILE, 24.5 * TILE + 40); // between the bays
    k.lampAt(48.5 * TILE, 47.5 * TILE, 48.5 * TILE, 47.5 * TILE + 40); // beside the school gate, not in it
  },
  // the Starlite Motel: a row of rooms with the office at the end and their car park, on Route 9; across the
  // highway the fire station, burnt out, its engines still inside
  motel(k) {
    k.roads([], [30]);
    highway();
    paint(7, 15, 39, 24, 3);
    paint(40, 17, 47, 24, 3); // the car park, up to the rooms' doors and round the office
    for (let i = 0; i < 8; i++) room(k, 8 + i * 4, 9, 5, 6, { doors: [[2, 2, 1]] });
    room(k, 40, 9, 7, 8, {
      style: 'store',
      doors: [
        [2, 3, 2],
        [3, 3, 1],
      ],
    }); // the office
    for (let i = 0; i < 8; i++) if (Math.random() < 0.65) car(k, 9 + i * 4, 16, { vert: true, flip: true });
    for (let i = 0; i < 6; i++) if (Math.random() < 0.45) car(k, 10 + i * 6, 21, { vert: true });
    paint(29, 35, 43, 36, 3); // the fire station apron
    room(k, 30, 37, 13, 9, { style: 'store', p: 0.82, open: true, doors: [[0, 3, 7]] }); // burnt out: its roof fell in on the engines
    car(k, 33, 39, { vert: true, truck: true, col: '#9a2a22', burnt: true });
    car(k, 38, 39, { vert: true, truck: true, col: '#a8322a', burnt: false });
    fire(k, 35, 43);
    fire(k, 40, 44);
    k.bigRuin();
    houses(k, 3, 3, 38, 27, 56, 0.75);
    for (let i = 0; i < 5; i++) {
      const x = randi(4, MW - 8),
        y = 30 + pick([-2, 2]);
      let ok = Math.abs(x - k.c0) > 6;
      for (let j = 0; j < 3; j++) if (!k.free(x + j, y)) ok = false;
      if (ok) for (let j = 0; j < 3; j++) k.set(x + j, y, 5);
    }
    highwayWrecks(k, 18);
    dressing(k, { boxes: 0, trees: 12 });
    highwayLamps(k);
    for (const x of [14, 26, 38]) k.lampAt(x * TILE, 19.5 * TILE, x * TILE, 19.5 * TILE + 40);
  },
  // the quarry: a gravel haul road, the yard with its office, shed and machines, and south of it the pit, its
  // rocky rim broken by the ramp the trucks went down. The convoy's trucks are still in it
  quarry(k) {
    k.roads([], [30]);
    paint(2, 29, MW - 3, 31, 4);
    paint(8, 18, 50, 27, 4);
    paint(28, 32, 32, 36, 4);
    paint(9, 37, 51, 56, 4);
    room(k, 10, 10, 8, 7, { style: 'store', doors: [[2, 3, 2]] }); // the office
    room(k, 34, 10, 12, 8, { style: 'store', p: 0.9, doors: [[2, 2, 8]] }); // the equipment shed, open at the front
    for (let x = 8; x <= 52; x++)
      if (x < 28 || x > 32) {
        k.set(x, 36, 2);
        if (Math.random() < 0.55) k.set(x, 37, 2);
      }
    for (let y = 37; y <= 56; y++)
      for (const x of [8, 52]) {
        k.set(x, y, 2);
        if (Math.random() < 0.5) k.set(x + (x === 8 ? 1 : -1), y, 2);
      }
    const trucks = [
      [14, 42],
      [21, 46, true],
      [33, 44],
      [40, 49, true],
      [16, 51],
      [44, 40],
    ];
    for (const [x, y, tk] of trucks)
      car(k, x, y, {
        truck: true,
        tanker: !!tk,
        col: tk ? undefined : pick(['#c8c8c0', '#8a8f6a', '#b0a890']),
        burnt: Math.random() < 0.25,
        flip: Math.random() < 0.5,
      });
    scatter(
      9,
      11,
      39,
      49,
      54,
      (x, y) => k.free(x, y) && Math.hypot(x - 30, y - 38) > 4 && (rubble(k, x, y, randi(2, 4)), true)
    ); // rock piles on the pit floor
    scatter(5, 10, 19, 48, 26, (x, y) => k.free(x, y) && (rubble(k, x, y, randi(2, 5)), true)); // gravel heaps in the yard
    car(k, 22, 21, { truck: true, col: '#c9a23a', burnt: false });
    car(k, 27, 24, { col: '#c9a23a', burnt: false });
    for (const [x, y] of [
      [20, 40],
      [38, 53],
      [46, 45],
    ])
      fire(k, x, y);
    k.bigRuin();
    dressing(k, { rubble: 4, fires: 2, boxes: 0, trees: 10 });
    for (const [x, y] of [
      [12, 27.6],
      [30, 27.6],
      [46, 27.6],
      [26, 37.6],
      [34, 37.6],
    ])
      k.lampAt(x * TILE, y * TILE, x * TILE, y * TILE + 50, true);
  },
  // Mill River: Route 9 crosses it on a bridge. The water can't be waded (you can shoot over it), so the
  // bridge is the only way over: everything coming from the far bank comes across it
  bridge(k) {
    k.roads([], [30]);
    highway();
    RIVER.ph = rand(0, TAU);
    for (let y = 2; y < MH - 2; y++) {
      if (y >= 26 && y <= 34) continue;
      const [l, r] = riverAt(y + 0.5);
      for (let x = 2; x < MW - 2; x++) if (x + 0.5 > l && x + 0.5 < r) k.set(x, y, 11); // water (11: 10 is a dumpster)
    } // a tile is water where its middle is in the river: the banks are drawn on the same curves
    car(k, 28, 29, { truck: true, col: '#c8c8c0', jit: 0.42, burnt: false }); // jack-knifed across the bridge
    car(k, 32, 32, { flip: true, burnt: true });
    room(k, 41, 18, 7, 6, { style: 'store', doors: [[2, 2, 2]] }); // the bait shop
    houses(k, 3, 3, 3, 22, 24);
    houses(k, 3, 3, 37, 22, 56);
    houses(k, 3, 38, 37, 56, 56);
    k.bigRuin();
    for (let y = 4; y < MH - 4; y++) {
      if (y >= 25 && y <= 35) continue;
      const [l, r] = riverAt(y + 0.5);
      for (const x of [Math.floor(l) - 1, Math.ceil(r)])
        if (!ROAD[at(x, y)] && Math.random() < 0.18) Math.random() < 0.6 ? tree(k, x, y, 1.1) : rubble(k, x, y, 1);
    } // trees and rocks along the banks
    highwayWrecks(k, 14, x => x >= 24 && x <= 36);
    dressing(k, { boxes: 3, trees: 10 });
    highwayLamps(k);
  },
  // County Hospital: the main building (two wings and the lobby between), its car park on the road, the annex
  // across it, and the helipad on the lawn east of the building, where the evac comes down
  hospital(k) {
    const RX = [],
      RY = [30];
    k.roads(RX, RY);
    streetY(30);
    paint(10, 22, 46, 27, 3);
    room(k, 12, 8, 13, 14, {
      style: 'store',
      doors: [
        [1, 8, 2],
        [2, 5, 2],
      ],
    }); // west wing
    for (let y = 9; y <= 20; y++) if (y < 14 || y > 15) k.set(18, y, 5); // wards along the west wing
    room(k, 24, 12, 11, 10, {
      style: 'store',
      doors: [
        [3, 4, 2],
        [1, 4, 2],
        [2, 4, 3],
      ],
    }); // the lobby
    room(k, 34, 8, 13, 14, {
      style: 'store',
      doors: [
        [3, 8, 2],
        [1, 3, 2],
        [2, 6, 2],
      ],
    }); // east wing
    for (let y = 9; y <= 20; y++) if (y < 14 || y > 15) k.set(40, y, 5);
    paint(48, 9, 56, 17, 2); // the helipad: a concrete pad
    paint(47, 18, 48, 27, 2); // the path to it from the car park
    k.helipad([52.5 * TILE, 13.5 * TILE]);
    for (const x of [13, 16, 19, 36, 39, 42])
      if (Math.random() < 0.6) car(k, x, 23, { vert: true, flip: Math.random() < 0.5 });
    car(k, 27, 23, { vert: true, truck: true, amb: true, col: '#e6e4dc', burnt: false });
    car(k, 31, 23, { vert: true, truck: true, amb: true, col: '#e6e4dc', burnt: Math.random() < 0.5 }); // the ambulance bay
    room(k, 34, 37, 12, 8, { style: 'store', doors: [[0, 4, 2]] }); // the annex
    paint(10, 36, 30, 37, 4);
    paint(19, 38, 20, 52, 4); // the garden paths
    fence(k, 8, 34, 24, true, [[9, 13]]);
    k.bigRuin();
    houses(k, 2, 3, 40, 30, 56, 0.85);
    roadWrecks(k, RX, RY, 6);
    dressing(k, { rubble: 6, trees: 18, keep: [[46, 8, 57, 28]] });
    streetLamps(k, RX, RY);
    for (const [x, y] of [
      [49, 9],
      [56, 9],
      [49, 17],
      [56, 17],
    ])
      k.lampAt(x * TILE, y * TILE, x * TILE + 1, y * TILE - 16, true);
  },
};

// what's painted on the ground of these places: water and its banks, the helipad, a court, stall lines
export function paintLayout(a, h, L) {
  if (!L) return;
  a.save();
  if (L === 'bridge') {
    // the river is painted along the same two curves its water tiles were cut from (riverAt), above and below the
    // bridge, so the banks are smooth and the edge you can't walk past is where it looks to be
    const stretch = (ya, yb) => {
      const L0 = [],
        R0 = [];
      for (let y = ya; y <= yb + 1e-6; y += 0.25) {
        const [l, r] = riverAt(y);
        L0.push([l * TILE, y * TILE]);
        R0.push([r * TILE, y * TILE]);
      }
      const line = pts => {
          a.moveTo(pts[0][0], pts[0][1]);
          for (const [x, y] of pts) a.lineTo(x, y);
        },
        shape = () => {
          a.beginPath();
          line(L0);
          for (let k = R0.length - 1; k >= 0; k--) a.lineTo(R0[k][0], R0[k][1]);
          a.closePath();
        },
        banks = () => {
          a.beginPath();
          line(L0);
          line(R0);
        };
      a.lineCap = a.lineJoin = 'round';
      a.strokeStyle = 'rgba(46,40,30,0.5)';
      a.lineWidth = 36;
      banks();
      a.stroke();
      a.strokeStyle = 'rgba(64,54,38,0.9)';
      a.lineWidth = 20;
      banks();
      a.stroke(); // a muddy bank either side
      shape();
      const mid = riverAt((ya + yb) / 2),
        g = a.createLinearGradient((mid[0] - 1) * TILE, 0, (mid[1] + 1) * TILE, 0);
      g.addColorStop(0, '#202d2d');
      g.addColorStop(0.5, '#152122');
      g.addColorStop(1, '#202d2d');
      a.fillStyle = g;
      a.fill(); // deeper in the middle
      a.save();
      shape();
      a.clip();
      for (let i = 0; i < (yb - ya) * 9; i++) {
        const y = rand(ya, yb),
          [l, r] = riverAt(y),
          xx = rand(l + 0.4, r - 0.8) * TILE,
          yy = y * TILE;
        a.strokeStyle = `rgba(150,180,180,${rand(0.04, 0.12)})`;
        a.lineWidth = rand(0.8, 1.6);
        a.beginPath();
        a.moveTo(xx, yy);
        a.quadraticCurveTo(xx + 3, yy + 6, xx + rand(-2, 2), yy + rand(10, 22));
        a.stroke();
      } // the current, running down the river
      a.strokeStyle = 'rgba(140,160,150,0.22)';
      a.lineWidth = 3;
      banks();
      a.stroke(); // the scum line along the water's edge
      a.restore();
    };
    stretch(0, 26);
    stretch(35, MH);
    for (const [yy, sg] of [
      [26, -1],
      [35, 1],
    ]) {
      const [l, r] = riverAt(yy),
        x0 = (Math.floor(l) - 1) * TILE,
        x1 = (Math.ceil(r) + 1) * TILE,
        y = yy * TILE;
      const g = a.createLinearGradient(0, y, 0, y + sg * 26);
      g.addColorStop(0, 'rgba(0,0,0,0.6)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      a.fillStyle = g;
      a.fillRect(x0 + TILE, sg < 0 ? y - 26 : y, x1 - x0 - 2 * TILE, 26); // the deck's shadow on the water
      a.fillStyle = 'rgba(118,116,108,0.95)';
      a.fillRect(x0, y - 7, x1 - x0, 14); // the concrete parapet
      a.fillStyle = 'rgba(165,162,150,0.7)';
      a.fillRect(x0, y - 7, x1 - x0, 3);
      a.fillStyle = 'rgba(30,30,30,0.55)';
      a.fillRect(x0, y + 5, x1 - x0, 2);
      a.fillStyle = 'rgba(80,78,72,1)';
      for (const xa of [x0, x1 - 16]) a.fillRect(xa, y - 11, 16, 22); // the abutments at each bank
      a.fillStyle = 'rgba(60,58,54,0.6)';
      for (let x = x0 + 30; x < x1 - 24; x += 34) a.fillRect(x, y - 7, 2, 14); // the joints
    } // the bridge's parapets, bank to bank
  }
  if (L === 'hospital') {
    const cx = 52.5 * TILE,
      cy = 13.5 * TILE;
    a.strokeStyle = 'rgba(232,226,200,0.8)';
    a.lineWidth = 7;
    a.beginPath();
    a.arc(cx, cy, 3.4 * TILE, 0, TAU);
    a.stroke();
    a.font = '900 120px Kanit, sans-serif';
    a.textAlign = 'center';
    a.textBaseline = 'middle';
    a.fillStyle = 'rgba(232,226,200,0.82)';
    a.fillText('H', cx, cy + 6);
    a.font = '900 34px Kanit, sans-serif';
    a.fillStyle = 'rgba(214,72,58,0.75)';
    a.fillText('EMERGENCY', 29.5 * TILE, 27.3 * TILE); // in front of the bay, not under the ambulances
  }
  if (L === 'clinic') {
    a.strokeStyle = 'rgba(232,228,214,0.55)';
    a.lineWidth = 3;
    a.strokeRect(28.2 * TILE, 49.2 * TILE, 12.6 * TILE, 4.6 * TILE);
    a.beginPath();
    a.moveTo(34.5 * TILE, 49.2 * TILE);
    a.lineTo(34.5 * TILE, 53.8 * TILE);
    a.stroke();
    for (const x of [28.2, 40.8]) {
      a.beginPath();
      a.arc(
        x * TILE,
        51.5 * TILE,
        1.6 * TILE,
        x < 30 ? -Math.PI / 2 : Math.PI / 2,
        x < 30 ? Math.PI / 2 : (3 * Math.PI) / 2
      );
      a.stroke();
    } // the court's keys
    a.beginPath();
    a.arc(34.5 * TILE, 51.5 * TILE, 1.3 * TILE, 0, TAU);
    a.stroke(); // the centre circle
    a.fillStyle = 'rgba(30,30,32,0.85)';
    for (const x of [28.6, 40.4]) {
      a.fillRect(x * TILE - 2, 50.7 * TILE, 4, 1.6 * TILE); // the backboards
      a.strokeStyle = 'rgba(214,96,52,0.8)';
      a.lineWidth = 2;
      a.beginPath();
      a.arc(x * TILE + (x < 30 ? 9 : -9), 51.5 * TILE, 7, 0, TAU);
      a.stroke(); // and their rims
    }
    a.font = '900 30px Kanit, sans-serif';
    a.textAlign = 'center';
    a.font = '900 24px Kanit, sans-serif';
    a.fillStyle = 'rgba(232,228,214,0.18)';
    a.fillText('AMBULANCE ONLY', 43.5 * TILE, 26.6 * TILE); // worn into the asphalt
  }
  if (L === 'clinic' || L === 'motel' || L === 'hospital') {
    const lots = { clinic: [21, 22, 46, 22], motel: [7, 15, 47, 15], hospital: [10, 22, 46, 22] }[L];
    a.strokeStyle = 'rgba(232,228,214,0.4)';
    a.lineWidth = 2;
    for (let x = lots[0] + 1; x <= lots[2]; x += 1.5) {
      const tx = Math.floor(x),
        ty = Math.floor(lots[1] + 1);
      if (ROAD[at(tx, ty)] !== 3 || grid[at(tx, ty)] || ROAD[at(tx - 1, ty)] !== 3) continue; // only on the lot itself
      a.beginPath();
      a.moveTo(x * TILE, (lots[1] + 0.1) * TILE);
      a.lineTo(x * TILE, (lots[1] + 2.4) * TILE);
      a.stroke();
    }
  } // stall lines
  a.restore();
  void h;
}
