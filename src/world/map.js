/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
/* =====================================================================
   Town map
   ===================================================================== */
const TILE = 40, MW = 60, MH = 60, WW = MW * TILE, WH = MH * TILE;
const grid = new Uint8Array(MW * MH), ttype = new Uint8Array(MW * MH);
const mapA = document.createElement('canvas'), mapE = document.createElement('canvas');
const MAPS = !matchMedia('(pointer: coarse)').matches && (window.devicePixelRatio || 1) >= 1 && MAXTEX >= 4096 ? 1.5 : 1; // a 3600 px ground map only where the GPU can hold it
mapA.width = mapA.height = Math.round(WW * MAPS); mapE.width = mapE.height = WW;
const NM = 1200, mapH = document.createElement('canvas'); mapH.width = mapH.height = NM;
const mapN = document.createElement('canvas'); mapN.width = mapN.height = NM;
const MAPREG = { w: WW, h: WH, u0: 0, v0: 0, u1: 1, v1: 1 };
let texAtlA, texAtlE, texAtlN, texMapA, texMapE, texMapN, trees = [], barrelSpots = [], crystals = [], grassCells = [];
const TRAD = t => t === 3 ? 14 : t === 8 ? 11 : t === 9 ? 13 : 20;
const isWall = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || grid[ty * MW + tx] === 1;
const SUN = [9, 11];

let lamps = [], cars = [], houses = [], fires = [], roofs = [];
const ROAD = new Uint8Array(MW * MH); let RX = [12, 30, 47], RY = [13, 30, 46];
const CAR_COLS = ['#8a3a32', '#3e5a7a', '#c8c4b8', '#4a6a4a', '#7a6a3a', '#5a5a60'];
function generateMap() {
  
  grid.fill(0); ttype.fill(0); ROAD.fill(0); trees = []; barrelSpots = []; crystals = []; lamps = []; cars = []; houses = []; fires = []; roofs = [];
  const D = (RUN && RUN.district) || 'town'; RX = D === 'town' ? [12, 30, 47] : []; RY = D === 'town' ? [13, 30, 46] : D === 'highway' ? [30] : [];
  const set = (x, y, t) => { if (x < 0 || y < 0 || x >= MW || y >= MH) return; grid[y * MW + x] = 1; ttype[y * MW + x] = t; };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (x < 2 || y < 2 || x >= MW - 2 || y >= MH - 2) set(x, y, 1);
  const c0 = MW / 2, clearOK = (x, y, r = 7) => Math.hypot(x - c0, y - c0) > r;
  const free = (x, y) => x > 2 && y > 2 && x < MW - 3 && y < MH - 3 && !grid[y * MW + x];
  const lampAt = (bx, by, hx, hy, lantern) => lamps.push({ bx, by, hx, hy, a: Math.atan2(hy - by, hx - bx), broken: Math.random() < 0.22, ph: rand(0, 50), lantern });
  if (D === 'town') {
  // street grid: 3-tile asphalt + 1-tile sidewalks
  for (const rx of RX) for (let y = 2; y < MH - 2; y++) for (let d = -2; d <= 2; d++) { const i = y * MW + rx + d; ROAD[i] = Math.abs(d) <= 1 ? 1 : Math.max(ROAD[i] === 1 ? 1 : 0, 2); }
  for (const ry of RY) for (let x = 2; x < MW - 2; x++) for (let d = -2; d <= 2; d++) { const i = (ry + d) * MW + x; ROAD[i] = Math.abs(d) <= 1 ? 1 : ROAD[i] === 1 ? 1 : 2; }
  // wrecked cars
  for (let i = 0, tries = 0; i < 15 && tries < 400; tries++) {
    const vert = Math.random() < 0.5, rc = pick(vert ? RX : RY), lane = pick([-1, 1, 0]), along = randi(4, MH - 6);
    const x1 = vert ? rc + lane : along, y1 = vert ? along : rc + lane, x2 = vert ? x1 : x1 + 1, y2 = vert ? y1 + 1 : y1;
    if (!free(x1, y1) || !free(x2, y2) || !clearOK(x1, y1, 6) || !clearOK(x2, y2, 6)) continue;
    if (cars.some(c => Math.hypot(c.tx - x1, c.ty - y1) < 5)) continue;
    set(x1, y1, 6); set(x2, y2, 6);
    cars.push({ tx: x1, ty: y1, x: (x1 + 0.5 + (vert ? 0 : 0.5)) * TILE, y: (y1 + 0.5 + (vert ? 0.5 : 0)) * TILE, a: (vert ? Math.PI / 2 : 0) + (Math.random() < 0.5 ? Math.PI : 0) + rand(-0.22, 0.22), col: pick(CAR_COLS), burnt: Math.random() < 0.3 }); i++;
  }
  // ruined houses: brick walls with gaps around a concrete floor
  for (let i = 0, tries = 0; i < 14 && tries < 500; tries++) {
    const w = randi(4, 6), h = randi(4, 6), x = randi(3, MW - 4 - w), y = randi(3, MH - 4 - h);
    let ok = clearOK(x + w / 2, y + h / 2, 10);
    for (let j = -1; j <= h && ok; j++) for (let k = -1; k <= w; k++) if (ROAD[(y + j) * MW + x + k] || grid[(y + j) * MW + x + k]) { ok = false; break; }
    if (!ok || houses.some(o => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y)) continue;
    houses.push({ x, y, w, h });
    const door = randi(0, 3);
    for (let k = 0; k < w; k++) for (const [yy, sd] of [[y, 0], [y + h - 1, 2]]) { const gap = sd === door && Math.abs(k - w / 2) < 1.2; if (!gap && Math.random() < 0.8) set(x + k, yy, 5); }
    for (let j = 1; j < h - 1; j++) for (const [xx, sd] of [[x, 3], [x + w - 1, 1]]) { const gap = sd === door && Math.abs(j - h / 2) < 1.2; if (!gap && Math.random() < 0.8) set(xx, y + j, 5); }
    i++;
  }
  // rubble heaps
  for (let i = 0; i < 16; i++) { let x = randi(4, MW - 5), y = randi(4, MH - 5); if (!clearOK(x, y, 8) || ROAD[y * MW + x] === 1) continue; const n = randi(1, 3); for (let k = 0; k < n; k++) { if (free(x, y) && ROAD[y * MW + x] !== 1) set(x, y, 2); x = clamp(x + randi(-1, 1), 3, MW - 4); y = clamp(y + randi(-1, 1), 3, MH - 4); } }
  // chain-link yard fences: the dead lean on them until they give
  for (let i = 0, tries = 0; i < 7 && tries < 400; tries++) {
    const hz = Math.random() < 0.5, n = randi(3, 5), x = randi(4, MW - 9), y = randi(4, MH - 9); let ok = clearOK(x, y, 8);
    for (let k = -1; k <= n && ok; k++) for (let d = -1; d <= 1; d++) { const tx = hz ? x + k : x + d, ty = hz ? y + d : y + k; if (!free(tx, ty) || ROAD[ty * MW + tx]) { ok = false; break; } }
    if (!ok) continue;
    for (let k = 0; k < n; k++) set(hz ? x + k : x, hz ? y : y + k, 9); i++;
  }
  // electrical boxes on sidewalks (shootable)
  for (let i = 0, tries = 0; i < ((10)) && tries < 400; tries++) {
    const x = randi(4, MW - 5), y = randi(4, MH - 5); if (ROAD[y * MW + x] !== 2 || !free(x, y) || !clearOK(x, y, 6)) continue;
    if (crystals.some(c => Math.hypot(c.tx - x, c.ty - y) < 6)) continue;
    set(x, y, 4); crystals.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, tx: x, ty: y, hue: Math.random() < 0.5 ? 0 : 1, alive: true, hp: 45, flash: 0, grow: 1, rot: rand(-0.1, 0.1), s: rand(0.9, 1.05) }); i++;
  }
  // dead trees in the lots
  for (let i = 0, tries = 0; i < 16 && tries < 300; tries++) {
    const x = randi(4, MW - 5), y = randi(4, MH - 5); if (!clearOK(x, y, 6) || grid[y * MW + x] || ROAD[y * MW + x]) continue;
    if (trees.some(t => Math.hypot(t.tx - x, t.ty - y) < 5)) continue;
    set(x, y, 3); trees.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, v: randi(0, 2), rot: rand(0, TAU), s: rand(0.85, 1.15), fade: 1, sway: rand(0, TAU) }); i++;
  }
  // burning barrels (light sources)
  for (let i = 0, tries = 0; i < 7 && tries < 300; tries++) {
    const x = randi(4, MW - 5), y = randi(4, MH - 5); if (!clearOK(x, y, 5) || !free(x, y) || ROAD[y * MW + x] === 1) continue;
    if (fires.some(f => Math.hypot(f.tx - x, f.ty - y) < 9)) continue;
    set(x, y, 7); fires.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, ph: rand(0, 10) }); i++;
  }
  // street lamps along every road, alternating sides; some are broken and flicker
  for (const rx of RX) for (let y = 5, s = 1; y < MH - 4; y += 7, s = -s) { if (RY.some(r => Math.abs(r - y) < 3)) continue; const bx = (rx + s * 2 + 0.5) * TILE + s * 12, by = (y + 0.5) * TILE; lampAt(bx, by, bx - s * 54, by); }
  for (const ry of RY) for (let x = 5, s = 1; x < MW - 4; x += 7, s = -s) { if (RX.some(r => Math.abs(r - x) < 3)) continue; const by = (ry + s * 2 + 0.5) * TILE + s * 12, bx = (x + 0.5) * TILE; lampAt(bx, by, bx, by - s * 54); }
  } else if (D === 'highway') {
    // Route 9: a wide highway across the middle, a gas station to the north, farm ruins to the south
    for (let x = 2; x < MW - 2; x++) for (let d = -4; d <= 4; d++) ROAD[(30 + d) * MW + x] = Math.abs(d) <= 3 ? 1 : 2;
    for (let y = 15; y <= 25; y++) for (let x = 10; x <= 36; x++) if (!ROAD[y * MW + x]) ROAD[y * MW + x] = 3;
    const st = { x: 27, y: 16, w: 8, h: 6, style: 'store' }; houses.push(st);
    for (let k = 0; k < st.w; k++) { set(st.x + k, st.y, 5); if (k < 3 || k > 4) set(st.x + k, st.y + st.h - 1, 5); }
    for (let j = 1; j < st.h - 1; j++) { set(st.x, st.y + j, 5); set(st.x + st.w - 1, st.y + j, 5); }
    for (const px of [14, 18, 22]) { set(px, 20, 4); crystals.push({ x: (px + 0.5) * TILE, y: 20.5 * TILE, tx: px, ty: 20, hue: 2, alive: true, hp: 60, flash: 0, grow: 1, rot: 0, s: 1 }); }
    roofs.push({ x: 18.5 * TILE, y: 20.5 * TILE, s: 1, fade: 1, reg: 'gs_roof' });
    for (let x = 12; x <= 25; x += 2) if (Math.random() < 0.55) { set(x, 17, 6); set(x, 18, 6); cars.push({ tx: x, ty: 17, x: (x + 0.5) * TILE, y: 18 * TILE, a: Math.PI / 2 + (Math.random() < 0.5 ? Math.PI : 0) + rand(-0.08, 0.08), col: pick(CAR_COLS), burnt: Math.random() < 0.2 }); }
    for (let i = 0, tries = 0; i < 26 && tries < 600; tries++) {
      const lane = pick([-3, -2, -1, 1, 2, 3]), x = randi(3, MW - 6), y = 30 + lane, truck = Math.random() < 0.12, n = truck ? 3 : 2;
      let ok = true; for (let k = 0; k < n; k++) if (!free(x + k, y) || Math.abs(x + k - c0) < 5 && Math.abs(lane) < 3) ok = false;
      if (!ok || cars.some(c => Math.abs(c.ty - y) < 1 && Math.abs(c.tx - x) < 5)) continue;
      const jack = Math.random() < 0.15 ? rand(0.25, 0.5) * (Math.random() < 0.5 ? -1 : 1) : rand(-0.12, 0.12);
      if (carHits((x + n / 2) * TILE, (y + 0.5) * TILE, (lane < 0 ? Math.PI : 0) + jack, truck)) continue; // a jack-knifed car can't sit across its neighbour in the next lane
      for (let k = 0; k < n; k++) set(x + k, y, 6);
      cars.push({ tx: x, ty: y, x: (x + n / 2) * TILE, y: (y + 0.5) * TILE, a: (lane < 0 ? Math.PI : 0) + jack, col: truck ? '#c8c8c0' : pick(CAR_COLS), burnt: Math.random() < 0.3, truck }); i++;
    }
    for (let i = 0; i < 6; i++) { const x = randi(4, MW - 8), y = 30 + pick([-2, 2]); let ok = Math.abs(x - c0) > 6; for (let k = 0; k < 3; k++) if (!free(x + k, y)) ok = false; if (ok) for (let k = 0; k < 3; k++) set(x + k, y, 5); }
    for (let i = 0, tries = 0; i < 4 && tries < 300; tries++) {
      const w = randi(4, 6), h = randi(4, 5), x = randi(4, MW - 5 - w), y = randi(38, MH - 5 - h); let ok = true;
      for (let j = -1; j <= h && ok; j++) for (let k = -1; k <= w; k++) if (ROAD[(y + j) * MW + x + k] || grid[(y + j) * MW + x + k]) { ok = false; break; }
      if (!ok || houses.some(o => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y)) continue;
      houses.push({ x, y, w, h }); const door = randi(0, 3);
      for (let k = 0; k < w; k++) for (const [yy, sd] of [[y, 0], [y + h - 1, 2]]) { const gap = sd === door && Math.abs(k - w / 2) < 1.2; if (!gap && Math.random() < 0.75) set(x + k, yy, 5); }
      for (let j = 1; j < h - 1; j++) for (const [xx, sd] of [[x, 3], [x + w - 1, 1]]) { const gap = sd === door && Math.abs(j - h / 2) < 1.2; if (!gap && Math.random() < 0.75) set(xx, y + j, 5); }
      i++;
    }
    for (let i = 0; i < 12; i++) { const x = randi(4, MW - 5), y = randi(4, MH - 5); if (free(x, y) && !ROAD[y * MW + x] && clearOK(x, y, 7)) set(x, y, 2); }
    for (let i = 0, tries = 0; i < 6 && tries < 200; tries++) { const x = randi(4, MW - 5), y = pick([26, 34]); if (!free(x, y) || Math.abs(x - c0) < 4 || crystals.some(c => Math.hypot(c.tx - x, c.ty - y) < 7)) continue; set(x, y, 4); crystals.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, tx: x, ty: y, hue: 0, alive: true, hp: 45, flash: 0, grow: 1, rot: 0, s: 1 }); i++; }
    for (let i = 0, tries = 0; i < 14 && tries < 300; tries++) { const x = randi(4, MW - 5), y = randi(4, MH - 5); if (!free(x, y) || ROAD[y * MW + x] || trees.some(t => Math.hypot(t.tx - x, t.ty - y) < 5)) continue; set(x, y, 3); trees.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, v: randi(0, 2), rot: rand(0, TAU), s: rand(0.85, 1.15), fade: 1, sway: rand(0, TAU) }); i++; }
    for (let i = 0, tries = 0; i < 5 && tries < 300; tries++) { const x = randi(4, MW - 5), y = randi(4, MH - 5); if (!free(x, y) || ROAD[y * MW + x] === 1 || !clearOK(x, y, 6) || fires.some(f => Math.hypot(f.tx - x, f.ty - y) < 10)) continue; set(x, y, 7); fires.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, ph: rand(0, 10) }); i++; }
    for (let x = 5, k = 0; x < MW - 4; x += 8, k++) { const top = k % 2 === 0, by = top ? 26.5 * TILE - 14 : 34.5 * TILE + 14; lampAt((x + 0.5) * TILE, by, (x + 0.5) * TILE, by + (top ? 60 : -60)); }
    lampAt(12 * TILE, 15.5 * TILE, 12 * TILE, 15.5 * TILE + 40); lampAt(25 * TILE, 15.5 * TILE, 25 * TILE, 15.5 * TILE + 40);
  } else {
    // Hollow Cemetery: gravel paths, rows of graves, crypts, iron fences, a ruined chapel
    for (let x = 2; x < MW - 2; x++) for (let d = -1; d <= 1; d++) { ROAD[(30 + d) * MW + x] = 4; ROAD[x * MW + 30 + d] = 4; }
    for (let x = 4; x < MW - 4; x++) for (const r of [14, 46]) { ROAD[r * MW + x] = 4; ROAD[x * MW + r] = 4; }
    const ch = { x: 38, y: 36, w: 8, h: 7, style: 'chapel' }; houses.push(ch);
    for (let k = 0; k < ch.w; k++) { if (Math.random() < 0.85) set(ch.x + k, ch.y, 5); if (k < 3 || k > 4) set(ch.x + k, ch.y + ch.h - 1, 5); }
    for (let j = 1; j < ch.h - 1; j++) { if (Math.random() < 0.85) set(ch.x, ch.y + j, 5); if (Math.random() < 0.85) set(ch.x + ch.w - 1, ch.y + j, 5); }
    for (let i = 0, tries = 0; i < 7 && tries < 400; tries++) {
      const w = randi(3, 4), h = 3, x = randi(4, MW - 5 - w), y = randi(4, MH - 5 - h); let ok = clearOK(x + w / 2, y + 1, 9);
      for (let j = -1; j <= h && ok; j++) for (let k = -1; k <= w; k++) if (ROAD[(y + j) * MW + x + k] || grid[(y + j) * MW + x + k]) { ok = false; break; }
      if (!ok || houses.some(o => x < o.x + o.w + 2 && x + w + 2 > o.x && y < o.y + o.h + 2 && y + h + 2 > o.y)) continue;
      houses.push({ x, y, w, h, style: 'crypt' });
      for (let k = 0; k < w; k++) { set(x + k, y, 5); if (k !== (w >> 1)) set(x + k, y + h - 1, 5); } set(x, y + 1, 5); set(x + w - 1, y + 1, 5); i++;
    }
    for (const r of [27, 33]) for (let x = 4; x < MW - 4; x++) { if (x % 8 === 2 || x % 8 === 3 || Math.abs(x - 30) < 4) continue; if (free(x, r) && !ROAD[r * MW + x]) set(x, r, 9); if (free(r, x) && !ROAD[x * MW + r]) set(r, x, 9); }
    for (let y = 4; y < MH - 4; y += 3) for (let x = 4; x < MW - 4; x += 2) {
      if (!free(x, y) || !clearOK(x, y, 6) || Math.random() > 0.6) continue;
      let near = false; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (ROAD[(y + j) * MW + x + k] || ttype[(y + j) * MW + x + k] === 5 || ttype[(y + j) * MW + x + k] === 9) near = true;
      if (!near) set(x, y, 8);
    }
    for (let i = 0, tries = 0; i < 22 && tries < 400; tries++) { const x = randi(4, MW - 5), y = randi(4, MH - 5); if (!free(x, y) || ROAD[y * MW + x] || !clearOK(x, y, 6) || trees.some(t => Math.hypot(t.tx - x, t.ty - y) < 4)) continue; set(x, y, 3); trees.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, v: randi(0, 2), rot: rand(0, TAU), s: rand(0.9, 1.25), fade: 1, sway: rand(0, TAU) }); i++; }
    for (let i = 0, tries = 0; i < 5 && tries < 300; tries++) { const x = randi(4, MW - 5), y = randi(4, MH - 5); if (!free(x, y) || ROAD[y * MW + x] || !clearOK(x, y, 5) || fires.some(f => Math.hypot(f.tx - x, f.ty - y) < 10)) continue; set(x, y, 7); fires.push({ tx: x, ty: y, x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, ph: rand(0, 10) }); i++; }
    for (let i = 0, tries = 0; i < 7 && tries < 400; tries++) { const x = randi(4, MW - 5), y = randi(4, MH - 5); let adj = false; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (ROAD[(y + oy) * MW + x + ox] === 4) adj = true; if (!adj || !free(x, y) || ROAD[y * MW + x] || !clearOK(x, y, 6) || crystals.some(c => Math.hypot(c.tx - x, c.ty - y) < 8)) continue; set(x, y, 4); crystals.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, tx: x, ty: y, hue: 0, alive: true, hp: 45, flash: 0, grow: 1, rot: 0, s: 1 }); i++; }
    for (let k = 5; k < MW - 4; k += 6) { if (Math.abs(k - 30) < 3) continue; for (const [bx, by] of [[(k + 0.5) * TILE, 28.4 * TILE], [(k + 0.5) * TILE, 31.6 * TILE], [28.4 * TILE, (k + 0.5) * TILE], [31.6 * TILE, (k + 0.5) * TILE]]) if (Math.random() < 0.7) lampAt(bx, by, bx + 1, by - 16, true); }
  }
  const seen = new Uint8Array(MW * MH), q = [c0 * MW + c0]; seen[q[0]] = 1;
  while (q.length) { const c = q.pop(), x = c % MW, y = (c / MW) | 0; for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + ox, ny = y + oy; if (isWall(nx, ny)) continue; const ni = ny * MW + nx; if (!seen[ni]) { seen[ni] = 1; q.push(ni); } } }
  for (let i = 0; i < MW * MH; i++) if (!grid[i] && !seen[i]) { grid[i] = 1; ttype[i] = 2; }
  for (let i = 0, tries = 0; i < 9 && tries < 300; tries++) {
    const x = randi(4, MW - 5), y = randi(4, MH - 5); if (!clearOK(x, y, 4)) continue;
    let ok = true; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (isWall(x + k, y + j)) ok = false;
    if (!ok || barrelSpots.some(b => Math.hypot(b.x / TILE - x, b.y / TILE - y) < 5)) continue;
    barrelSpots.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE }); i++;
  }
  genDecor(); buildCarMap(); prepBlocks(); resetWear(); setupAtmos(); bakeMap();
}
let asphaltTileCache = null;
function getAsphaltTile() {
  if (asphaltTileCache) return asphaltTileCache;
  const n = 192, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const cx = cv.getContext('2d', { willReadFrequently: true }), img = cx.createImageData(n, n);
  const grids = [new Float32Array(4*4), new Float32Array(12*12), new Float32Array(32*32), new Float32Array(96*96)];
  for (const g of grids) for (let i=0;i<g.length;i++) g[i]=Math.random()*2-1;
  const noise = (g, res, x, y) => {
    const fx=x/n*res, fy=y/n*res, ix=Math.floor(fx), iy=Math.floor(fy), tx=fx-ix, ty=fy-iy;
    const sm=t=>t*t*(3-2*t), sx=sm(tx), sy=sm(ty), at=(xx,yy)=>g[((yy%res+res)%res)*res+((xx%res+res)%res)];
    const a=at(ix,iy)*(1-sx)+at(ix+1,iy)*sx, b=at(ix,iy+1)*(1-sx)+at(ix+1,iy+1)*sx;
    return a*(1-sy)+b*sy;
  };
  for(let y=0;y<n;y++) for(let x=0;x<n;x++) {
    const i=(y*n+x)*4, broad=noise(grids[0],4,x,y), mid=noise(grids[1],12,x,y), fine=noise(grids[2],32,x,y), grain=noise(grids[3],96,x,y), speck=(Math.random()-0.5)*19;
    const v=clamp(174+broad*12+mid*12+fine*13+grain*10+speck,118,235);
    img.data[i]=v*0.99; img.data[i+1]=v*1.005; img.data[i+2]=v*1.035; img.data[i+3]=255;
  }
  cx.putImageData(img,0,0);
  // Aggregates, pale mineral flecks and embedded grit add scale without looking like a repeating dot grid.
  for(let i=0;i<1700;i++) { const x=rand(0,n),y=rand(0,n),r=rand(0.18,0.85),v=pick(['rgba(13,15,18,0.50)','rgba(166,169,163,0.19)','rgba(102,94,82,0.25)','rgba(205,204,190,0.11)']); cx.fillStyle=v; cx.beginPath(); cx.ellipse(x,y,r*1.5,r,rand(0,Math.PI),0,TAU); cx.fill(); }
  // Tile-safe hairline fractures stop short of the boundary to avoid obvious seams.
  for(let i=0;i<8;i++){ let x=rand(14,n-14),y=rand(14,n-14),ang=rand(0,TAU); cx.strokeStyle='rgba(18,19,21,0.30)'; cx.lineWidth=rand(0.3,0.65); cx.beginPath(); cx.moveTo(x,y); for(let j=0;j<randi(3,7);j++){ang+=rand(-0.65,0.65);x=clamp(x+Math.cos(ang)*rand(2,6),5,n-5);y=clamp(y+Math.sin(ang)*rand(2,6),5,n-5);cx.lineTo(x,y);}cx.stroke(); }
  // Soft oily discoloration beneath the fine grain.
  for(let i=0;i<12;i++){const x=rand(0,n),y=rand(0,n),rx=rand(8,24),ry=rand(3,12),g=cx.createRadialGradient(x,y,1,x,y,rx);g.addColorStop(0,'rgba(9,12,16,0.18)');g.addColorStop(0.7,'rgba(16,19,22,0.08)');g.addColorStop(1,'rgba(16,19,22,0)');cx.fillStyle=g;cx.beginPath();cx.ellipse(x,y,rx,ry,rand(-0.4,0.4),0,Math.PI*2);cx.fill();}
  asphaltTileCache=cv; return cv;
}

function bakeMap() {
  const a = mapA.getContext('2d', { willReadFrequently: true }), e = mapE.getContext('2d'), h = mapH.getContext('2d', { willReadFrequently: true });
  a.setTransform(MAPS, 0, 0, MAPS, 0, 0); e.setTransform(1, 0, 0, 1, 0, 0); e.clearRect(0, 0, WW, WH);
  h.setTransform(1, 0, 0, 1, 0, 0); h.fillStyle = '#000'; h.fillRect(0, 0, NM, NM); h.setTransform(NM / WW, 0, 0, NM / WW, 0, 0);
  const D = (RUN && RUN.district) || 'town', DT = DLOOK[D];
  a.fillStyle = DT.ground; a.fillRect(0, 0, WW, WH);
  const tones = DT.tones;
  for (let i = 0; i < 200; i++) { const x = rand(0, WW), y = rand(0, WH), r = rand(70, 220); a.fillStyle = rgrad(a, x, y, r, [[0, pick(tones)], [1, 'rgba(0,0,0,0)']]); a.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < 2200; i++) { const x = rand(0, WW), y = rand(0, WH), l = rand(4, 9), g = rand(-0.6, 0.6) - Math.PI / 2; a.strokeStyle = Math.random() < 0.5 ? DT.weeds[0] : DT.weeds[1]; a.lineWidth = 1.4; a.beginPath(); a.moveTo(x, y); a.lineTo(x + Math.cos(g) * l, y + Math.sin(g) * l); a.stroke(); }
  // house floors
  for (const o of houses) {
    const x = o.x * TILE, y = o.y * TILE, w = o.w * TILE, hh = o.h * TILE;
    a.fillStyle = o.style === 'crypt' ? '#5a5652' : o.style === 'chapel' ? '#7a746a' : o.style === 'store' ? '#b8b4aa' : '#8e897c'; a.fillRect(x, y, w, hh);
    a.strokeStyle = 'rgba(60,56,50,0.45)'; a.lineWidth = 1.2; for (let k = x; k <= x + w; k += 20) { a.beginPath(); a.moveTo(k, y); a.lineTo(k, y + hh); a.stroke(); } for (let k = y; k <= y + hh; k += 20) { a.beginPath(); a.moveTo(x, k); a.lineTo(x + w, k); a.stroke(); }
    for (let k = 0; k < 4; k++) { const px = x + rand(0, w), py = y + rand(0, hh), r = rand(30, 70); a.fillStyle = rgrad(a, px, py, r, [[0, 'rgba(30,26,22,0.7)'], [1, 'rgba(30,26,22,0)']]); a.fillRect(px - r, py - r, r * 2, r * 2); }
    for (let k = 0; k < 40; k++) { a.fillStyle = pick(['#6a645a', '#a49e90', '#5a4030', '#3a3430']); a.save(); a.translate(x + rand(8, w - 8), y + rand(8, hh - 8)); a.rotate(rand(0, 3)); a.fillRect(-rand(2, 7), -rand(1, 3), rand(4, 14), rand(2, 5)); a.restore(); }
  }
  // sidewalks and asphalt
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const r = ROAD[ty * MW + tx], x = tx * TILE, y = ty * TILE; if (!r) continue;
    if (r === 2) { // old concrete slabs: each pour a slightly different grey, weathered, stained, a few cracked, the joints worn dark
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) { const px = x + sx * TILE / 2, py = y + sy * TILE / 2, S = TILE / 2, v = rand(-9, 9), b = 128 + v; a.fillStyle = `rgb(${b},${b - 4},${b - 11})`; a.fillRect(px, py, S, S);
        for (let k = 0; k < 7; k++) { a.fillStyle = `rgba(${Math.random() < 0.6 ? '40,36,30' : '170,164,150'},${rand(0.05, 0.14)})`; ell(a, px + rand(2, S - 2), py + rand(2, S - 2), rand(1.5, 6), rand(1, 4), rand(0, 3)); a.fill(); }
        if (Math.random() < 0.18) { a.fillStyle = `rgba(30,26,20,${rand(0.12, 0.28)})`; ell(a, px + rand(5, S - 5), py + rand(5, S - 5), rand(3, 7), rand(2, 5), rand(0, 3)); a.fill(); } // an old stain
        if (Math.random() < 0.12) { a.strokeStyle = 'rgba(40,36,30,0.55)'; a.lineWidth = 0.7; a.beginPath(); let cx = px + rand(0, S), cy = py; a.moveTo(cx, cy); for (let k = 0; k < 4; k++) { cx += rand(-4, 4); cy += S / 4; a.lineTo(cx, cy); } a.stroke(); } // a crack
        for (let k = 0; k < 30; k++) { a.fillStyle = Math.random() < 0.5 ? 'rgba(60,56,50,0.25)' : 'rgba(190,184,170,0.2)'; a.fillRect(px + rand(0, S), py + rand(0, S), 0.8, 0.8); } }
      a.strokeStyle = 'rgba(52,48,42,0.5)'; a.lineWidth = 1.1; a.strokeRect(x + 0.5, y + 0.5, TILE / 2, TILE / 2); a.strokeRect(x + TILE / 2, y + TILE / 2, TILE / 2, TILE / 2); h.fillStyle = 'rgb(40,25,0)'; h.fillRect(x, y, TILE, TILE); }
    else if (r === 3) { a.fillStyle = '#4c4d50'; a.fillRect(x, y, TILE, TILE); a.fillStyle = 'rgba(220,216,200,0.55)'; if (ty >= 17 && ty <= 19) a.fillRect(x, y, 2, TILE); }
    else if (r === 4) { a.fillStyle = '#7a7364'; a.fillRect(x, y, TILE, TILE); for (let k = 0; k < 150; k++) { const v = randi(70, 150); a.fillStyle = `rgba(${v},${v - 6},${v - 16},${rand(0.4, 0.8)})`; ell(a, x + rand(0, TILE), y + rand(0, TILE), rand(0.5, 1.4), rand(0.4, 1.1), rand(0, 3)); a.fill(); } for (let k = 0; k < 3; k++) { a.fillStyle = 'rgba(40,36,28,0.18)'; ell(a, x + rand(0, TILE), y + rand(0, TILE), rand(4, 10), rand(3, 7), rand(0, 3)); a.fill(); } } // packed gravel: many small stones of mixed grey and tan, trodden darker in patches
    else { a.fillStyle = '#56575a'; a.fillRect(x, y, TILE, TILE); }
  }
  for (let i = 0; i < 9000; i++) { const tx = randi(0, MW - 1), ty = randi(0, MH - 1); if (ROAD[ty * MW + tx] !== 1) continue; a.fillStyle = Math.random() < 0.5 ? 'rgba(30,30,32,0.5)' : 'rgba(120,120,118,0.4)'; a.fillRect(tx * TILE + rand(0, TILE), ty * TILE + rand(0, TILE), rand(1, 2.4), rand(1, 2.4)); }
  // High-frequency asphalt aggregate is clipped only to roadway tiles. Curbs, lane paint, tire skids, puddles and decals remain on top.
  {
    const pat = a.createPattern(getAsphaltTile(), 'repeat');
    if (pat) {
      a.save(); a.beginPath();
      for (let ty=0;ty<MH;ty++) for (let tx=0;tx<MW;tx++) { const rr0=ROAD[ty*MW+tx]; if(rr0===1 || rr0===3) a.rect(tx*TILE,ty*TILE,TILE,TILE); }
      a.clip(); a.globalAlpha=0.58; a.globalCompositeOperation='multiply'; a.fillStyle=pat; a.fillRect(0,0,WW,WH); a.globalCompositeOperation='source-over'; a.globalAlpha=1; a.restore();
    }
  }
  // curbs
  a.strokeStyle = '#c8c4b8'; a.lineWidth = 2.4;
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) { if (ROAD[ty * MW + tx] !== 2) continue; const x = tx * TILE, y = ty * TILE; for (const [ox, oy, x0, y0, x1, y1] of [[1, 0, TILE, 0, TILE, TILE], [-1, 0, 0, 0, 0, TILE], [0, 1, 0, TILE, TILE, TILE], [0, -1, 0, 0, TILE, 0]]) if (ROAD[(ty + oy) * MW + tx + ox] === 1) { a.beginPath(); a.moveTo(x + x0, y + y0); a.lineTo(x + x1, y + y1); a.stroke(); } }
  // lane markings
  const inter = (v, list) => list.some(r => Math.abs(r - v) <= 2);
  a.lineWidth = 3; a.setLineDash([26, 22]); a.strokeStyle = 'rgba(214,176,70,0.75)';
  for (const rx of RX) { let y0 = null; for (let y = 2; y <= MH - 2; y++) { const blocked = y === MH - 2 || inter(y, RY); if (!blocked && y0 === null) y0 = y; if (blocked && y0 !== null) { a.beginPath(); a.moveTo((rx + 0.5) * TILE, y0 * TILE); a.lineTo((rx + 0.5) * TILE, y * TILE); a.stroke(); y0 = null; } } }
  for (const ry of RY) { let x0 = null; for (let x = 2; x <= MW - 2; x++) { const blocked = x === MW - 2 || inter(x, RX); if (!blocked && x0 === null) x0 = x; if (blocked && x0 !== null) { a.beginPath(); a.moveTo(x0 * TILE, (ry + 0.5) * TILE); a.lineTo(x * TILE, (ry + 0.5) * TILE); a.stroke(); x0 = null; } } }
  a.setLineDash([]);
  if (D === 'highway') {
    a.lineWidth = 3; a.strokeStyle = 'rgba(230,226,214,0.7)'; a.setLineDash([30, 26]);
    for (const off of [-1.5, 1.5, -2.5, 2.5]) { if (Math.abs(off) > 2) continue; a.beginPath(); a.moveTo(2 * TILE, (30.5 + off) * TILE); a.lineTo(WW - 2 * TILE, (30.5 + off) * TILE); a.stroke(); }
    a.setLineDash([]); a.strokeStyle = 'rgba(230,226,214,0.75)'; a.lineWidth = 2.5; for (const yy of [26.98, 34.02]) { a.beginPath(); a.moveTo(2 * TILE, yy * TILE); a.lineTo(WW - 2 * TILE, yy * TILE); a.stroke(); }
    a.strokeStyle = 'rgba(214,176,70,0.85)'; a.lineWidth = 2.5; for (const yy of [30.4, 30.6]) { a.beginPath(); a.moveTo(2 * TILE, yy * TILE); a.lineTo(WW - 2 * TILE, yy * TILE); a.stroke(); }
    for (let i = 0; i < 40; i++) { const x = rand(3 * TILE, WW - 3 * TILE), y = rand(27 * TILE, 34 * TILE); a.strokeStyle = 'rgba(20,20,22,0.45)'; a.lineWidth = rand(6, 9); a.beginPath(); a.moveTo(x, y); a.lineTo(x + rand(60, 160), y + rand(-10, 10)); a.stroke(); }
    a.save(); a.translate(18.5 * TILE, 24.3 * TILE); a.font = '900 30px Kanit, sans-serif'; a.textAlign = 'center'; a.fillStyle = 'rgba(232,228,214,0.5)'; a.fillText('NO FUEL', 0, 0); a.restore();
  }
  if (D === 'cemetery') {
    for (let i = 0; i < MW * MH; i++) { if (ttype[i] !== 8) continue; const tx = i % MW, ty = (i / MW) | 0, x = (tx + 0.5) * TILE + (hsh(tx * 5, ty) - 0.5) * 8, y = (ty + 0.5) * TILE + 4, kind = hsh(tx * 13, ty * 7); // the plot in front of each stone: settled earth, a stone kerb on some, sunken on others
      a.fillStyle = kind < 0.3 ? 'rgba(52,44,32,0.75)' : 'rgba(64,62,44,0.55)'; rr(a, x - 14, y, 28, 40, 4); a.fill();
      if (kind > 0.6) { a.strokeStyle = 'rgba(150,146,136,0.7)'; a.lineWidth = 2.4; rr(a, x - 15, y - 1, 30, 42, 2); a.stroke(); a.strokeStyle = 'rgba(30,28,26,0.5)'; a.lineWidth = 0.8; rr(a, x - 16, y - 2, 32, 44, 2); a.stroke(); }
      else if (kind < 0.3) { a.fillStyle = 'rgba(20,16,10,0.35)'; ell(a, x, y + 21, 9, 14, 0); a.fill(); }
      for (let g = 0; g < 10; g++) { a.strokeStyle = `rgba(${randi(70, 100)},${randi(96, 120)},${randi(52, 66)},0.6)`; a.lineWidth = 0.8; const gx = x + rand(-12, 12), gy = y + rand(0, 32); a.beginPath(); a.moveTo(gx, gy); a.lineTo(gx + rand(-2, 2), gy - rand(2, 5)); a.stroke(); }
    }
    for (let i = 0; i < 26; i++) { const tx = randi(4, MW - 5), ty = randi(4, MH - 5); if (grid[ty * MW + tx] || ROAD[ty * MW + tx]) continue; const x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE; a.fillStyle = '#1e1810'; rr(a, x - 9, y - 16, 18, 32, 3); a.fill(); a.fillStyle = 'rgba(110,84,56,0.85)'; for (let k = 0; k < 7; k++) { circ(a, x + rand(12, 20) * (Math.random() < 0.5 ? -1 : 1), y + rand(-14, 14), rand(3, 6)); a.fill(); } h.fillStyle = 'rgb(0,0,0)'; rr(h, x - 9, y - 16, 18, 32, 3); h.fill(); }
  }
  // crosswalks
  a.fillStyle = 'rgba(220,216,204,0.7)';
  for (const rx of RX) for (const ry of RY) for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const cx = (rx + 0.5) * TILE + dx * 2.9 * TILE, cy = (ry + 0.5) * TILE + dy * 2.9 * TILE;
    for (let k = -2; k <= 2; k++) { if (Math.random() < 0.15) continue; if (dx) a.fillRect(cx - 14, cy + k * 22 - 6, 28, 12); else a.fillRect(cx + k * 22 - 6, cy - 14, 12, 28); }
  }
  // cracks, potholes, oil, manholes
  for (let i = 0; i < 220; i++) { const tx = randi(2, MW - 3), ty = randi(2, MH - 3); if (!ROAD[ty * MW + tx]) continue; let x = (tx + Math.random()) * TILE, y = (ty + Math.random()) * TILE; const crack = (x, y, g, n, w) => { a.strokeStyle = `rgba(22,22,24,${(0.32 + w * 0.12).toFixed(2)})`; for (let k = 0; k < n; k++) { const L = rand(5, 8), nx = x + Math.cos(g) * L, ny = y + Math.sin(g) * L; a.lineWidth = Math.max(0.5, w * (1 - k / n)); a.beginPath(); a.moveTo(x, y); a.lineTo(nx, ny); a.stroke(); x = nx; y = ny; g += rand(-0.35, 0.35); if (k > 3 && Math.random() < 0.1) crack(x, y, g + (Math.random() < 0.5 ? 1 : -1) * rand(0.6, 1.1), Math.floor(n * 0.4), w * 0.6); } }; crack(x, y, rand(0, TAU), randi(10, 22), rand(0.9, 1.6)); } // cracks run on and taper, now and then splitting: asphalt doesn't zig-zag
  for (let i = 0; i < 40; i++) { const tx = randi(2, MW - 3), ty = randi(2, MH - 3); if (ROAD[ty * MW + tx] !== 1) continue; const x = (tx + Math.random()) * TILE, y = (ty + Math.random()) * TILE, rx = rand(7, 16), ry = rand(5, 11), g = rand(0, 3); const pth = c => { c.beginPath(); for (let j = 0; j <= 10; j++) { const t = j / 10 * TAU, r = 1 + 0.22 * Math.sin(t * 3 + g * 2) + rand(-0.12, 0.12), qx = x + Math.cos(t + g) * rx * r, qy = y + Math.sin(t + g) * ry * r; j ? c.lineTo(qx, qy) : c.moveTo(qx, qy); } c.closePath(); }; pth(a); a.fillStyle = rgrad(a, x, y, Math.max(rx, ry) * 1.2, [[0, 'rgba(30,30,32,0.95)'], [0.7, 'rgba(24,24,26,0.9)'], [1, 'rgba(14,14,16,0.6)']]); a.fill(); for (let j = 0; j < 6; j++) { a.fillStyle = `rgba(${randi(70, 110)},${randi(68, 104)},${randi(62, 96)},0.7)`; ell(a, x + rand(-rx, rx), y + rand(-ry, ry), rand(0.8, 2), rand(0.6, 1.4), rand(0, 3)); a.fill(); } h.fillStyle = 'rgb(0,60,0)'; pth(h); h.fill(); } // potholes: a ragged hole with loose chippings, no outline
  for (let i = 0; i < 50; i++) { const x = rand(0, WW), y = rand(0, WH), r = rand(14, 36); a.fillStyle = rgrad(a, x, y, r, [[0, 'rgba(18,18,22,0.6)'], [1, 'rgba(18,18,22,0)']]); a.fillRect(x - r, y - r, r * 2, r * 2); }
  for (const rx of RX) for (let y = 8; y < MH - 6; y += 17) { const x = (rx + 0.5) * TILE + 30, yy = (y + 0.5) * TILE; a.fillStyle = '#3e3e40'; circ(a, x, yy, 12); a.fill(); a.strokeStyle = '#7a7a78'; a.lineWidth = 1.4; a.stroke(); for (let k = -8; k <= 8; k += 4) { a.beginPath(); a.moveTo(x - 9, yy + k); a.lineTo(x + 9, yy + k); a.stroke(); } }
  // old blood: smears, drag marks, handprints
  { // dried stains: ragged, thin at the edges, darker where it pooled, brown where it dried; the odd spray of drops thrown one way
    const rag = (x, y, r, n = 22) => { a.beginPath(); let ph = rand(0, TAU); for (let k = 0; k <= n; k++) { const g = k / n * TAU, rr = r * (0.62 + 0.28 * Math.sin(g * 3 + ph) + rand(0, 0.32)); k ? a.lineTo(x + Math.cos(g) * rr, y + Math.sin(g) * rr * 0.8) : a.moveTo(x + rr, y); } a.closePath(); };
    for (let i = 0; i < 46; i++) { const x = rand(3 * TILE, WW - 3 * TILE), y = rand(3 * TILE, WH - 3 * TILE), r = rand(8, 26), br = randi(46, 74);
      a.fillStyle = `rgba(${br},${randi(10, 16)},${randi(8, 12)},${rand(0.32, 0.5)})`; rag(x, y, r); a.fill();
      a.fillStyle = `rgba(${br - 18},6,6,${rand(0.25, 0.4)})`; rag(x + rand(-r, r) * 0.2, y + rand(-r, r) * 0.2, r * rand(0.35, 0.55), 14); a.fill();
      const d = rand(0, TAU); for (let k = 0; k < randi(4, 12); k++) { const t = d + rand(-0.5, 0.5), dd = r + rand(2, 26), rr = rand(0.8, 2.6) * (1 - dd / 70); a.fillStyle = `rgba(${br},10,8,${rand(0.3, 0.55)})`; rag(x + Math.cos(t) * dd, y + Math.sin(t) * dd, Math.max(0.7, rr), 8); a.fill(); } }
  }
  for (let i = 0; i < 16; i++) { let x = rand(4 * TILE, WW - 4 * TILE), y = rand(4 * TILE, WH - 4 * TILE), g = rand(0, TAU), w = rand(7, 12); a.lineCap = 'round'; for (let k = 0; k < 14; k++) { const nx = x + Math.cos(g) * 12, ny = y + Math.sin(g) * 12, f = 1 - k / 14; a.strokeStyle = `rgba(62,10,8,${(0.15 + 0.35 * f) * rand(0.7, 1)})`; a.lineWidth = w * (0.45 + 0.55 * f) * rand(0.8, 1.1); a.beginPath(); a.moveTo(x, y); a.lineTo(nx, ny); a.stroke(); for (const s2 of [-1, 1]) { a.strokeStyle = `rgba(40,6,6,${0.25 * f})`; a.lineWidth = 0.9; a.beginPath(); a.moveTo(x - Math.sin(g) * s2 * w * 0.3, y + Math.cos(g) * s2 * w * 0.3); a.lineTo(nx - Math.sin(g) * s2 * w * 0.3, ny + Math.cos(g) * s2 * w * 0.3); a.stroke(); } x = nx; y = ny; g += rand(-0.22, 0.22); } } // drag marks: heavy where the body started, fading out, streaked by fingers or clothes
  for (let i = 0; i < 260; i++) { a.fillStyle = pick(['rgba(220,214,196,0.7)', 'rgba(140,40,30,0.6)', 'rgba(60,90,120,0.6)', 'rgba(200,170,60,0.6)']); a.save(); a.translate(rand(0, WW), rand(0, WH)); a.rotate(rand(0, 3)); a.fillRect(-3, -2, rand(4, 8), rand(3, 5)); a.restore(); }
  
  // the plea painted at the crossroads
  const cx = WW / 2, cy = WH / 2;
  if (D === 'town') { a.save(); a.translate(cx + 12, cy + 4); a.rotate(-0.05); a.scale(0.76, 0.76); /* the plea, rollered on by hand with house paint: letters that wander and shrink as the painter ran out of road, one redone, a tipped can and the roller left where they dropped them */
    const LET = { H: [[[0, 0], [0, 1]], [[0.62, 0], [0.62, 1]], [[0, 0.52], [0.62, 0.48]]], E: [[[0, 0], [0, 1]], [[0, 0], [0.56, 0.02]], [[0, 0.5], [0.44, 0.5]], [[0, 1], [0.58, 0.98]]], L: [[[0, 0], [0, 1]], [[0, 1], [0.5, 1]]], P: [[[0, 1], [0, 0]], [[0, 0], [0.38, 0], [0.56, 0.1], [0.58, 0.3], [0.42, 0.46], [0, 0.48]]] };
    const roll = (pts, w, al) => { /* one roller pass: a soft base coat, then dry streaks along it where the sleeve ran thin */ a.lineCap = 'round'; a.lineJoin = 'round'; const jp = pts.map(([x, y]) => [x + rand(-1.5, 1.5), y + rand(-1.5, 1.5)]), path = (ox, oy) => { a.beginPath(); a.moveTo(jp[0][0] + ox, jp[0][1] + oy); for (let k = 1; k < jp.length; k++) a.lineTo(jp[k][0] + ox, jp[k][1] + oy); };
      a.strokeStyle = `rgba(216,210,190,${al * 0.7})`; a.lineWidth = w; path(0, 0); a.stroke();
      for (let k = 0; k < 6; k++) { const o = rand(-w * 0.38, w * 0.38); a.strokeStyle = `rgba(232,226,206,${al * rand(0.3, 0.75)})`; a.lineWidth = rand(1.2, 3.4); a.setLineDash([rand(10, 40), rand(2, 9)]); path(o * 0.7, o); a.stroke(); } a.setLineDash([]);
      const [sx, sy] = jp[0]; a.fillStyle = `rgba(226,220,200,${al * 0.8})`; a.beginPath(); a.ellipse(sx, sy, w * 0.62, w * 0.5, rand(0, 3), 0, TAU); a.fill(); /* the heavy blob where the loaded roller first touched down */
      for (let k = 0; k < 5; k++) { a.fillStyle = `rgba(226,220,200,${al * rand(0.3, 0.7)})`; a.beginPath(); a.arc(sx + rand(-w * 1.4, w * 1.4), sy + rand(-w * 1.4, w * 1.4), rand(0.7, 2), 0, TAU); a.fill(); } };
    const word = [['H', 74, 0.012], ['E', 70, -0.04], ['L', 64, 0.05], ['P', 58, -0.02]]; let x = -112;
    for (const [ch, ht, tilt] of word) { const sc = ht, y0 = -ht / 2 + (ch === 'P' ? -4 : ch === 'L' ? 3 : 0); a.save(); a.translate(x, y0); a.rotate(tilt);
      if (ch === 'E') { a.globalAlpha = 0.5; for (const st of LET.E) roll(st.map(([u, v]) => [u * 40 - 8, v * 44 + 4]), 7, 0.16); a.globalAlpha = 1; a.strokeStyle = 'rgba(30,30,32,0.5)'; a.lineCap = 'round'; for (let k = 0; k < 4; k++) { a.lineWidth = rand(11, 15); a.beginPath(); a.moveTo(-12 + rand(-3, 3), 2 + k * 14); a.lineTo(34 + rand(-4, 4), 4 + k * 14 + rand(-3, 3)); a.stroke(); } } /* a first, too-small E, scrubbed over with dark paint and done again bigger */
      for (const st of LET[ch]) roll(st.map(([u, v]) => [u * sc, v * sc]), ht * 0.18, 0.21); a.restore(); x += ht * 0.62 + (ch === 'L' ? 10 : 18); }
    a.save(); a.translate(x + 10, 26); /* the tipped can, its spill, and the roller dropped beside it */ a.fillStyle = 'rgba(222,216,196,0.42)'; a.beginPath(); a.ellipse(-8, 4, 15, 8, 0.4, 0, TAU); a.fill(); a.fillStyle = 'rgba(222,216,196,0.25)'; a.beginPath(); a.ellipse(-16, 9, 9, 5, 0.2, 0, TAU); a.fill();
    a.rotate(0.5); a.fillStyle = 'rgba(120,124,128,0.95)'; a.fillRect(-1, -7, 15, 14); a.fillStyle = 'rgba(70,72,76,0.95)'; a.fillRect(12, -7, 3, 14); a.fillStyle = 'rgba(214,208,186,0.95)'; a.beginPath(); a.ellipse(-1, 0, 2.6, 7, 0, 0, TAU); a.fill(); a.fillStyle = 'rgba(176,64,46,0.85)'; a.fillRect(3, -7, 5, 14); a.restore();
    a.save(); a.translate(x - 6, -30); a.rotate(-0.9); a.strokeStyle = 'rgba(40,40,44,0.9)'; a.lineWidth = 2; a.beginPath(); a.moveTo(9, 0); a.lineTo(24, 0); a.stroke(); a.fillStyle = 'rgba(224,218,198,0.95)'; a.fillRect(-9, -4, 18, 8); a.fillStyle = 'rgba(30,30,32,0.5)'; a.fillRect(-9, 2.5, 18, 1.5); a.restore();
    a.strokeStyle = 'rgba(28,28,30,0.3)'; a.lineCap = 'round'; for (let i = 0; i < 2; i++) { const yy = rand(-22, 22); a.lineWidth = rand(8, 12); a.beginPath(); a.moveTo(-150, yy); a.quadraticCurveTo(0, yy + rand(-14, 14), 150, yy + rand(-10, 10)); a.stroke(); } /* tyre marks across it from whoever drove through since */
    a.lineCap = 'butt'; a.lineJoin = 'miter'; a.restore(); }
  // boundary: concrete barricade
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    if (ttype[ty * MW + tx] !== 1) continue;
    const x = tx * TILE, y = ty * TILE;
    a.fillStyle = DT.edge; a.fillRect(x, y, TILE, TILE); h.fillStyle = 'rgb(200,30,0)'; h.fillRect(x, y, TILE, TILE);
    for (let k = 0; k < 3; k++) { const ex = x + rand(5, 35), ey = y + rand(5, 35), rx = rand(8, 16), ry = rand(6, 12), g = rand(0, 3); a.fillStyle = pick(['#5d5650', '#3e3a36', '#6a625a']); ell(a, ex, ey, rx, ry, g); a.fill(); h.fillStyle = `rgb(${randi(170, 255)},30,0)`; ell(h, ex, ey, rx, ry, g); h.fill(); }
  }
  a.strokeStyle = 'rgba(30,26,22,0.9)'; a.lineWidth = 3; a.strokeRect(2 * TILE, 2 * TILE, WW - 4 * TILE, WH - 4 * TILE);
  // baked contact shadows
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const t = ttype[ty * MW + tx]; if (!t || t === 1 || t === 4) continue;
    const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2, r = t === 3 ? 22 : t === 8 ? 18 : t === 9 ? 14 : 32;
    a.fillStyle = rgrad(a, x + SUN[0] * 1.4, y + SUN[1] * 1.4, r, [[0, 'rgba(14,16,22,0.5)'], [0.6, 'rgba(14,16,22,0.3)'], [1, 'rgba(14,16,22,0)']]); circ(a, x + SUN[0] * 1.4, y + SUN[1] * 1.4, r); a.fill();
  }
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const t = ttype[ty * MW + tx]; if (!t || t === 1 || t === 4 || t === 6) continue;
    const x = tx * TILE + TILE / 2, y = ty * TILE + TILE / 2;
    if (t === 2) {
      for (let k = 0; k < 6; k++) {
        const px = x + rand(-12, 12), py = y + rand(-12, 12), pts = []; for (let j = 0; j < 5; j++) { const g = j / 5 * TAU + rand(-0.3, 0.3), r2 = rand(7, 14); pts.push([px + Math.cos(g) * r2, py + Math.sin(g) * r2]); }
        const path = c => { c.beginPath(); pts.forEach(([qx, qy], j) => j ? c.lineTo(qx, qy) : c.moveTo(qx, qy)); c.closePath(); };
        path(a); a.fillStyle = grad(a, px - 12, py - 12, px + 12, py + 12, [[0, pick(['#88827a', '#7e796f', '#7a6e62'])], [1, '#48443e']]); a.fill(); a.strokeStyle = '#2a2724'; a.lineWidth = 1.6; a.stroke();
        path(h); h.fillStyle = `rgb(${randi(120, 190)},40,0)`; h.fill(); /* dusty broken concrete: duller, and lower edges so it doesn't shine */
      }
      a.strokeStyle = '#7a4a2a'; a.lineWidth = 1.6; for (let k = 0; k < 3; k++) { const g = rand(0, TAU); a.beginPath(); a.moveTo(x + rand(-8, 8), y + rand(-8, 8)); a.lineTo(x + Math.cos(g) * 22, y + Math.sin(g) * 22); a.stroke(); }
    } else if (t === 5 && D !== 'town') {
      const stone = D === 'cemetery';
      a.fillStyle = stone ? '#6e6a64' : '#9a9890'; a.fillRect(x - 20, y - 20, 40, 40);
      a.strokeStyle = stone ? 'rgba(30,28,26,0.6)' : 'rgba(60,58,54,0.5)'; a.lineWidth = 1.4;
      if (stone) { for (let k = 0; k < 3; k++) { const yy = y - 20 + k * 13.3; a.beginPath(); a.moveTo(x - 20, yy); a.lineTo(x + 20, yy); a.stroke(); for (let j = (k & 1) * 10; j < 40; j += 20) { a.beginPath(); a.moveTo(x - 20 + j, yy); a.lineTo(x - 20 + j, yy + 13.3); a.stroke(); } } a.fillStyle = 'rgba(80,110,60,0.45)'; for (let k = 0; k < 5; k++) { circ(a, x + rand(-18, 18), y + rand(-18, 18), rand(2, 5)); a.fill(); } }
      else { a.beginPath(); a.moveTo(x - 20, y); a.lineTo(x + 20, y); a.stroke(); a.fillStyle = 'rgba(240,200,60,0.5)'; a.fillRect(x - 20, y - 3, 40, 2); }
      a.strokeStyle = '#1e1c1a'; a.lineWidth = 2.2; a.strokeRect(x - 20, y - 20, 40, 40);
      h.fillStyle = 'rgb(150,30,0)'; h.fillRect(x - 20, y - 20, 40, 40); h.fillStyle = 'rgb(235,30,0)'; h.fillRect(x - 16, y - 16, 32, 32);
    } else if (t === 8) {
      const kind = randi(0, 3);
      a.fillStyle = 'rgba(90,70,48,0.8)'; rr(a, x - 9, y - 2, 18, 22, 4); a.fill();
      if (kind === 1) { a.fillStyle = '#8c8a84'; a.fillRect(x - 3, y - 14, 6, 20); a.fillRect(x - 9, y - 9, 18, 6); a.strokeStyle = '#2a2826'; a.lineWidth = 1.6; a.strokeRect(x - 3, y - 14, 6, 20); a.strokeRect(x - 9, y - 9, 18, 6); }
      else { const w = kind === 2 ? 22 : 18, hh = kind === 2 ? 12 : 9, rot = kind === 3 ? rand(-0.5, 0.5) : rand(-0.08, 0.08); a.save(); a.translate(x, y - 8); a.rotate(rot); a.fillStyle = kind === 2 ? '#7a7670' : '#9a968e'; rr(a, -w / 2, -hh / 2, w, hh, kind === 0 ? 5 : 2); a.fill(); a.strokeStyle = '#2a2826'; a.lineWidth = 1.6; a.stroke(); a.fillStyle = 'rgba(70,100,56,0.55)'; circ(a, rand(-6, 6), rand(-2, 2), 2.5); a.fill(); a.restore(); }
      h.fillStyle = 'rgb(220,30,0)'; rr(h, x - 10, y - 14, 20, 12, 3); h.fill();
    } else if (t === 9) {
      const horiz = ttype[ty * MW + tx - 1] === 9 || ttype[ty * MW + tx + 1] === 9;
      a.strokeStyle = '#141414'; a.lineWidth = 2.4; a.beginPath(); if (horiz) { a.moveTo(x - 20, y); a.lineTo(x + 20, y); } else { a.moveTo(x, y - 20); a.lineTo(x, y + 20); } a.stroke();
      a.fillStyle = '#1a1a1a'; for (let k = -16; k <= 16; k += 8) { const px = horiz ? x + k : x, py = horiz ? y : y + k; circ(a, px, py, 2); a.fill(); }
      a.fillStyle = '#2a2a2a'; a.fillRect(x - 3, y - 3, 6, 6);
      h.fillStyle = 'rgb(160,80,0)'; if (horiz) h.fillRect(x - 20, y - 2, 40, 4); else h.fillRect(x - 2, y - 20, 4, 40);
    } else if (t === 5) {
      a.fillStyle = '#8a5a46'; a.fillRect(x - 20, y - 20, 40, 40);
      a.strokeStyle = 'rgba(200,190,170,0.55)'; a.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) { const yy = y - 20 + k * 10; a.beginPath(); a.moveTo(x - 20, yy); a.lineTo(x + 20, yy); a.stroke(); for (let j = (k & 1) * 10; j < 40; j += 20) { a.beginPath(); a.moveTo(x - 20 + j, yy); a.lineTo(x - 20 + j, yy + 10); a.stroke(); } }
      a.fillStyle = 'rgba(40,24,18,0.35)'; for (let k = 0; k < 4; k++) { circ(a, x + rand(-18, 18), y + rand(-18, 18), rand(2, 5)); a.fill(); }
      a.strokeStyle = '#2e1e18'; a.lineWidth = 2.2; a.strokeRect(x - 20, y - 20, 40, 40);
      h.fillStyle = 'rgb(150,30,0)'; h.fillRect(x - 20, y - 20, 40, 40); h.fillStyle = 'rgb(235,30,0)'; h.fillRect(x - 16, y - 16, 32, 32);
    } else if (t === 3) {
      circ(a, x, y, 13); a.fillStyle = grad(a, x - 13, y - 13, x + 13, y + 13, [[0, '#6a5a48'], [1, '#3a3028']]); a.fill(); a.strokeStyle = '#1e1812'; a.lineWidth = 2.5; a.stroke();
      a.strokeStyle = 'rgba(30,24,18,0.6)'; a.lineWidth = 1.2; circ(a, x, y, 7); a.stroke();
      for (let k = 0; k < 5; k++) { const g = rand(0, TAU); a.strokeStyle = '#4a3c30'; a.lineWidth = 5; a.beginPath(); a.moveTo(x + Math.cos(g) * 10, y + Math.sin(g) * 10); a.lineTo(x + Math.cos(g) * 22, y + Math.sin(g) * 22); a.stroke(); h.strokeStyle = 'rgb(120,20,0)'; h.lineWidth = 5; h.beginPath(); h.moveTo(x + Math.cos(g) * 10, y + Math.sin(g) * 10); h.lineTo(x + Math.cos(g) * 22, y + Math.sin(g) * 22); h.stroke(); }
      h.fillStyle = rgrad(h, x, y, 15, [[0, 'rgb(255,40,0)'], [1, 'rgb(140,20,0)']]); circ(h, x, y, 13); h.fill();
    } else if (t === 7) {
      circ(a, x, y, 15); a.fillStyle = grad(a, x - 15, y - 15, x + 15, y + 15, [[0, '#7a4a30'], [1, '#3a2418']]); a.fill(); a.strokeStyle = '#1a100a'; a.lineWidth = 2.6; a.stroke();
      circ(a, x, y, 11); a.fillStyle = '#1a120c'; a.fill(); for (let k = 0; k < 7; k++) { a.fillStyle = pick(['#ff9a30', '#ffcf60', '#c84a10']); circ(a, x + rand(-7, 7), y + rand(-7, 7), rand(2, 4)); a.fill(); }
      e.fillStyle = rgrad(e, x, y, 12, [[0, 'rgba(255,170,60,1)'], [1, 'rgba(255,90,20,0.4)']]); circ(e, x, y, 11); e.fill();
      a.fillStyle = 'rgba(30,24,20,0.5)'; for (let k = 0; k < 10; k++) { circ(a, x + rand(-30, 30), y + rand(-30, 30), rand(2, 5)); a.fill(); }
      h.fillStyle = 'rgb(200,40,0)'; circ(h, x, y, 15); h.fill(); h.fillStyle = 'rgb(120,40,0)'; circ(h, x, y, 11); h.fill();
    }
  }
  // wrecked cars (top view)
  for (const c of cars) {
    const L = c.truck ? 118 : 78, W = c.truck ? 44 : 38;
    for (const [cv, pass] of [[a, 0], [h, 1]]) {
      cv.save(); cv.translate(c.x, c.y); cv.rotate(c.a);
      if (pass) { cv.fillStyle = 'rgb(150,40,0)'; rr(cv, -L / 2, -W / 2, L, W, 9); cv.fill(); cv.fillStyle = 'rgb(255,40,0)'; rr(cv, -14, -W / 2 + 5, 30, W - 10, 5); cv.fill(); cv.restore(); continue; }
      cv.fillStyle = 'rgba(0,0,0,0.6)'; for (const [wx, wy] of [[-24, -21], [-24, 21], [24, -21], [24, 21]]) { rr(cv, wx - 8, wy - 4, 16, 8, 3); cv.fill(); }
      const body = c.burnt ? '#3a3430' : c.col;
      cv.fillStyle = body; rr(cv, -L / 2, -W / 2, L, W, 9); cv.fill(); cv.strokeStyle = '#141210'; cv.lineWidth = 2.4; cv.stroke();
      cv.fillStyle = 'rgba(255,255,255,0.12)'; rr(cv, -L / 2 + 4, -W / 2 + 3, L - 8, 5, 3); cv.fill();
      cv.fillStyle = 'rgba(0,0,0,0.25)'; rr(cv, -L / 2 + 4, W / 2 - 8, L - 8, 5, 3); cv.fill();
      cv.fillStyle = c.burnt ? '#1e1a18' : '#24303a'; rr(cv, 6, -W / 2 + 5, 14, W - 10, 4); cv.fill(); rr(cv, -26, -W / 2 + 6, 10, W - 12, 3); cv.fill();
      cv.fillStyle = c.burnt ? '#2a2420' : 'rgba(0,0,0,0.18)'; rr(cv, -16, -W / 2 + 5, 22, W - 10, 4); cv.fill();
      cv.fillStyle = 'rgba(200,220,230,0.5)'; for (let k = 0; k < 14; k++) { circ(cv, rand(-L / 2 - 8, L / 2 + 8), rand(-W / 2 - 8, W / 2 + 8), rand(0.5, 1.4)); cv.fill(); }
      cv.fillStyle = 'rgba(120,60,30,0.5)'; for (let k = 0; k < 6; k++) { circ(cv, rand(-L / 2 + 4, L / 2 - 4), rand(-W / 2 + 3, W / 2 - 3), rand(2, 5)); cv.fill(); }
      cv.fillStyle = '#f0e6c0'; cv.fillRect(L / 2 - 3, -W / 2 + 4, 3, 6); cv.fillRect(L / 2 - 3, W / 2 - 10, 3, 6); cv.fillStyle = '#a02020'; cv.fillRect(-L / 2, -W / 2 + 4, 3, 6); cv.fillRect(-L / 2, W / 2 - 10, 3, 6);
      if (Math.random() < 0.4) { cv.fillStyle = 'rgba(90,10,8,0.7)'; ell(cv, rand(-10, 10), rand(-6, 6), rand(4, 9), rand(3, 6), rand(0, 3)); cv.fill(); }
      cv.restore();
    }
  }
  // tire marks: skids and swerves left by the panic
  for (let i = 0; i < (D === 'cemetery' ? 4 : 26); i++) {
    const tx = randi(3, MW - 4), ty = randi(3, MH - 4), rd = ROAD[ty * MW + tx]; if (rd !== 1 && rd !== 3) continue;
    let x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE, g = (ROAD[ty * MW + tx + 1] && ROAD[ty * MW + tx - 1] ? 0 : Math.PI / 2) + (Math.random() < 0.5 ? Math.PI : 0) + rand(-0.25, 0.25), bend = rand(-0.03, 0.03);
    const n = randi(10, 26), al = rand(0.25, 0.5);
    for (const off of [-9, 9]) {
      let px = x - Math.sin(g) * off, py = y + Math.cos(g) * off, gg = g; a.strokeStyle = `rgba(12,12,14,${al})`; a.lineWidth = rand(4, 6); a.lineCap = 'round'; a.beginPath(); a.moveTo(px, py);
      for (let k = 0; k < n; k++) { gg += bend; px += Math.cos(gg) * 8; py += Math.sin(gg) * 8; a.lineTo(px, py); } a.stroke();
    }
  }
  // damp gutters: the rain ran to the kerbs and is still there, a darker band that catches the lamps
  for (let ty = 1; ty < MH - 1; ty++) for (let tx = 1; tx < MW - 1; tx++) { const i = ty * MW + tx; if (ROAD[i] !== 1) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (ROAD[i + dy * MW + dx] !== 2) continue; const ex = (tx + 0.5 + dx * 0.5) * TILE, ey = (ty + 0.5 + dy * 0.5) * TILE;
      for (let k = 0; k < 6; k++) { const along = ((k + Math.random()) / 6 - 0.5) * TILE, w = rand(4, 12), cx = ex + (dy ? along : -dx * w * 0.45), cy = ey + (dx ? along : -dy * w * 0.45), rx2 = dy ? rand(6, 10) : w * 0.55, ry2 = dx ? rand(6, 10) : w * 0.55;
        a.fillStyle = 'rgba(6,8,12,0.14)'; a.beginPath(); a.ellipse(cx, cy, rx2, ry2, 0, 0, TAU); a.fill(); h.fillStyle = 'rgba(0,120,0,0.55)'; h.beginPath(); h.ellipse(cx, cy, rx2, ry2, 0, 0, TAU); h.fill(); } } }
  // rain puddles: dark, glassy, and they catch every light
  const LP = lamps.filter(L => !L.broken && Math.random() < 0.7);
  for (let i = 0; i < (D === 'cemetery' ? 45 : 75) + LP.length; i++) {
    const nl = i < LP.length ? LP[i] : null, px0 = nl ? nl.hx + rand(-30, 30) : 0, py0 = nl ? nl.hy + rand(20, 70) : 0;
    const tx = nl ? Math.floor(px0 / TILE) : randi(3, MW - 4), ty = nl ? Math.floor(py0 / TILE) : randi(3, MH - 4), rd = ROAD[ty * MW + tx]; if (!rd || grid[ty * MW + tx]) continue;
    const x = nl ? px0 : (tx + Math.random()) * TILE, y = nl ? py0 : (ty + Math.random()) * TILE, base = rand(8, rd === 2 ? 16 : 30), pts = [];
    for (let j = 0; j < 9; j++) { const g = j / 9 * TAU, r2 = base * rand(0.6, 1.25); pts.push([x + Math.cos(g) * r2 * 1.35, y + Math.sin(g) * r2 * 0.85]); }
    const path = c => { c.beginPath(); pts.forEach(([qx, qy], j) => { const [nx, ny] = pts[(j + 1) % pts.length]; if (!j) c.moveTo((qx + nx) / 2, (qy + ny) / 2); else c.quadraticCurveTo(qx, qy, (qx + nx) / 2, (qy + ny) / 2); }); const [qx, qy] = pts[0], [nx, ny] = pts[1]; c.quadraticCurveTo(qx, qy, (qx + nx) / 2, (qy + ny) / 2); c.closePath(); };
    const ring = c => { c.save(); c.translate(x, y); c.scale(1.32, 1.32); c.translate(-x, -y); path(c); c.restore(); }; // the wet edge spreading round it
    ring(a); a.fillStyle = 'rgba(8,10,16,0.12)'; a.fill(); ring(h); h.fillStyle = 'rgba(0,110,0,0.5)'; h.fill();
    path(a); a.fillStyle = 'rgba(8,10,16,0.3)'; a.fill(); // the water darkens the road a little; the reflections do the rest
    path(h); h.fillStyle = 'rgb(0,180,0)'; h.fill();
  }
  // dry weeds on the lots
  grassCells = Array.from({ length: MW * MH }, () => []);
  for (let gy = 0; gy < WH; gy += 38) for (let gx = 0; gx < WW; gx += 38) {
    const x = gx + rand(0, 46), y = gy + rand(0, 46), tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (isWall(tx, ty) || ROAD[ty * MW + tx] || Math.random() < 0.12 + 0.7 * (0.5 + 0.5 * Math.sin(x * 0.0061 + Math.sin(y * 0.0043) * 2.1) * Math.cos(y * 0.0057 - x * 0.0021)) || houses.some(o => tx >= o.x && tx < o.x + o.w && ty >= o.y && ty < o.y + o.h)) continue; let near = false;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const t = ttype[(ty + j) * MW + tx + i]; if (t && t !== 1 && Math.hypot((tx + i + 0.5) * TILE - x, (ty + j + 0.5) * TILE - y) < 34) near = true; }
    if (near) continue;
    grassCells[ty * MW + tx].push({ x, y, v: randi(0, 3), s: rand(0.7, 1.05), r: rand(0, TAU), ph: rand(0, TAU), bend: 0 });
  }
  // map normals from height field + painted detail
  const hd = h.getImageData(0, 0, NM, NM).data, tmp = document.createElement('canvas'); tmp.width = tmp.height = NM;
  const tc = tmp.getContext('2d', { willReadFrequently: true }); tc.drawImage(mapA, 0, 0, NM, NM); const ad = tc.getImageData(0, 0, NM, NM).data;
  const Hh = new Float32Array(NM * NM), Sp = new Uint8Array(NM * NM);
  for (let i = 0; i < NM * NM; i++) { Hh[i] = hd[i * 4] / 255 + (ad[i * 4] * 0.3 + ad[i * 4 + 1] * 0.59 + ad[i * 4 + 2] * 0.11) / 255 * 0.12; Sp[i] = hd[i * 4 + 1]; }
  const Hb = boxBlur(boxBlur(Hh, NM, NM, 2), NM, NM, 1);
  const nimg = new ImageData(NM, NM); heightToNormals(Hb, NM, NM, 7, nimg.data, NM, 0, 0, Sp, null);
  mapN.getContext('2d').putImageData(nimg, 0, 0);
  texMapA && gl.deleteTexture(texMapA); texMapE && gl.deleteTexture(texMapE); texMapN && gl.deleteTexture(texMapN);
  texMapA = texFromCanvas(mapA, true); texMapE = texFromCanvas(mapE, true); texMapN = texFromCanvas(mapN, false, false);
  bakeRadar();
}
