/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { clamp, d2 } from '../core/util.js';
import { gl } from '../render/gl.js';
import { MH, MW, TILE, TRAD, WH, WW, grid, isWall, ttype } from './map.js';
export function texFromCanvas(c, mip, premul = true) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premul);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  if (mip) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}

/* ---------- Collision / pathing ---------- */
function unstick(o) {
  const tx = Math.floor(o.x / TILE),
    ty = Math.floor(o.y / TILE);
  let best = null,
    bd = 1e18;
  for (let R = 1; R <= 8 && !best; R++)
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== R) continue;
        const x = tx + dx,
          y = ty + dy;
        if (x < 3 || y < 3 || x >= MW - 3 || y >= MH - 3 || isWall(x, y)) continue;
        const cx = (x + 0.5) * TILE,
          cy = (y + 0.5) * TILE,
          d = (cx - o.x) ** 2 + (cy - o.y) ** 2;
        if (d < bd) {
          bd = d;
          best = [cx, cy];
        }
      }
  if (!best) {
    best = [clamp(o.x, 3.5 * TILE, WW - 3.5 * TILE), clamp(o.y, 3.5 * TILE, WH - 3.5 * TILE)];
  }
  o.x = best[0];
  o.y = best[1];
  o.vx = o.vy = 0;
  if (o.kx !== undefined) o.kx = o.ky = 0;
  return true;
}
// pushes o out of walls. r: its radius against walls (default its crowd radius); only: which tile kinds stop it
export function collide(o, r = o.cr || o.r, only = null) {
  let hit = false;
  {
    const cx = Math.floor(o.x / TILE),
      cy = Math.floor(o.y / TILE);
    if (isWall(cx, cy) && (cx < 0 || cy < 0 || cx >= MW || cy >= MH || ttype[cy * MW + cx] === 1)) return unstick(o);
  } // the centre is inside solid wall (or off the map): back to open ground, not on through the wall
  const tx0 = Math.floor((o.x - r) / TILE),
    tx1 = Math.floor((o.x + r) / TILE),
    ty0 = Math.floor((o.y - r) / TILE),
    ty1 = Math.floor((o.y + r) / TILE);
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!isWall(tx, ty)) continue;
      const inside = tx >= 0 && ty >= 0 && tx < MW && ty < MH,
        t = inside ? ttype[ty * MW + tx] : 1;
      if (only && !only(t)) continue;
      if (t !== 1) {
        const cx = (tx + 0.5) * TILE,
          cy = (ty + 0.5) * TILE,
          dx = o.x - cx,
          dy = o.y - cy,
          rad = TRAD(t) + r,
          dd = Math.hypot(dx, dy);
        if (dd >= rad) continue;
        const d = dd || 0.001,
          pen = rad - d,
          ux = dx / d,
          uy = dy / d;
        o.x += ux * pen;
        o.y += uy * pen;
        const vn = o.vx * ux + o.vy * uy;
        if (vn < 0) {
          o.vx -= vn * ux;
          o.vy -= vn * uy;
        }
        hit = true;
        continue;
      }
      const nx = clamp(o.x, tx * TILE, tx * TILE + TILE),
        ny = clamp(o.y, ty * TILE, ty * TILE + TILE);
      let dx = o.x - nx,
        dy = o.y - ny;
      const dd = dx * dx + dy * dy;
      if (dd < r * r) {
        let d = Math.sqrt(dd);
        if (d < 0.001) {
          dx = 0;
          dy = -1;
          d = 1;
        }
        const pen = r - d,
          ux = dx / d,
          uy = dy / d;
        o.x += ux * pen;
        o.y += uy * pen;
        const vn = o.vx * ux + o.vy * uy;
        if (vn < 0) {
          o.vx -= vn * ux;
          o.vy -= vn * uy;
        }
        hit = true;
      }
    }
  return hit;
}
export function solidPt(x, y) {
  const tx = Math.floor(x / TILE),
    ty = Math.floor(y / TILE);
  if (!isWall(tx, ty)) return false;
  if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return true;
  const t = ttype[ty * MW + tx];
  if (t === 1) return true;
  return Math.hypot(x - (tx + 0.5) * TILE, y - (ty + 0.5) * TILE) < TRAD(t) + 1;
}
export function los(x0, y0, x1, y1) {
  const dx = x1 - x0,
    dy = y1 - y0,
    L = Math.hypot(dx, dy),
    n = Math.ceil(L / 14);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (solidPt(x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}
export let flow;
let flowAt;
let dens, heap;
// crowd-aware flow field: Dijkstra from the target where a tile costs more the more zombies already stand in it,
// so a crowd spills into side streets and alleys and comes at you from several sides instead of in one queue
export function dijk(out, seeds, crowd, blk = grid) {
  out.fill(65535);
  let n = 0;
  const push = k => {
    let i = n++;
    heap[i] = k;
    while (i > 0) {
      const pi = (i - 1) >> 1;
      if (heap[pi] <= heap[i]) break;
      const t = heap[pi];
      heap[pi] = heap[i];
      heap[i] = t;
      i = pi;
    }
  };
  const pop = () => {
    const top = heap[0],
      last = heap[--n];
    if (n > 0) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1,
          r = l + 1;
        let m = i;
        if (l < n && heap[l] < heap[m]) m = l;
        if (r < n && heap[r] < heap[m]) m = r;
        if (m === i) break;
        const t = heap[m];
        heap[m] = heap[i];
        heap[i] = t;
        i = m;
      }
    }
    return top;
  };
  for (const st of seeds) {
    out[st] = 0;
    push(st);
  }
  while (n) {
    const k = pop(),
      c = k & 4095,
      dc = k >> 12;
    if (dc > out[c]) continue;
    const cx = c % MW,
      cy = (c / MW) | 0;
    for (let q = 0; q < 4; q++) {
      const nb =
        q === 0
          ? cx > 0
            ? c - 1
            : -1
          : q === 1
            ? cx < MW - 1
              ? c + 1
              : -1
            : q === 2
              ? cy > 0
                ? c - MW
                : -1
              : cy < MH - 1
                ? c + MW
                : -1;
      if (nb < 0 || blk[nb]) continue;
      const nd = dc + 2 + (crowd ? Math.min(6, dens[nb] * 2) : 0);
      if (nd < out[nb]) {
        out[nb] = nd;
        if (n < heap.length) push((nd << 12) | nb);
      }
    }
  }
}
export function buildFlow(px, py) {
  const st = Math.floor(py / TILE) * MW + Math.floor(px / TILE);
  if (st === GS.flowTile && GS.time - flowAt < 0.35 && GS.time >= flowAt) return;
  GS.flowTile = st;
  flowAt = GS.time;
  dens.fill(0);
  for (const e of GS.enemies)
    if (!e.dead && !e.fly && !e.big) {
      const t = Math.floor(e.y / TILE) * MW + Math.floor(e.x / TILE);
      if (t >= 0 && t < MW * MH && dens[t] < 250) dens[t]++;
    }
  dijk(flow, [st], true);
  if (GS.enemies.some(e => e.big && !e.dead)) {
    // the giants' own map: they wade through fences, graves and hedges but go round buildings, and need a street's width to do it
    gblk.fill(0);
    for (let y = 0; y < MH; y++)
      for (let x = 0; x < MW; x++) {
        const i = y * MW + x;
        if (!grid[i] || !GIANT_STOP(ttype[i])) continue;
        for (let j = -1; j <= 1; j++)
          for (let k = -1; k <= 1; k++) {
            const xx = x + k,
              yy = y + j;
            if (xx >= 0 && yy >= 0 && xx < MW && yy < MH) gblk[yy * MW + xx] = 1;
          }
      }
    gblk[st] = 0;
    dijk(flowBig, [st], false, gblk);
  }
}
// the walls that stop a giant: buildings and the edge of the map
export const GIANT_STOP = t => t === 1 || t === 5;
export let flowBig, gblk;
export let N8;
export function steer(e, tx, ty, fld, inView) {
  const dx = tx - e.x,
    dy = ty - e.y,
    d = Math.hypot(dx, dy) || 1;
  if (e.fly || inView) return [dx / d, dy / d, d];
  if (e.big) {
    if (!(GS.time < (e.gLosT || 0))) {
      e.gLosT = GS.time + 0.25;
      e.gLos = los(e.x, e.y, tx, ty);
    }
    if (e.gLos || fld) return [dx / d, dy / d, d];
    const cx = Math.floor(e.x / TILE),
      cy = Math.floor(e.y / TILE);
    let best = flowBig[cy * MW + cx],
      bx = cx,
      by = cy;
    for (const [ox, oy] of N8) {
      const nx = cx + ox,
        ny = cy + oy;
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || gblk[ny * MW + nx]) continue;
      const v = flowBig[ny * MW + nx] + (ox && oy ? 0.8 : 0);
      if (v < best) {
        best = v;
        bx = nx;
        by = ny;
      }
    }
    if (bx === cx && by === cy) return [dx / d, dy / d, d];
    const gx = (bx + 0.5) * TILE - e.x,
      gy = (by + 0.5) * TILE - e.y,
      g = Math.hypot(gx, gy) || 1;
    return [gx / g, gy / g, d];
  } // a giant walks straight at you when it can see you, and round the block when it can't
  if ((fld ? d < 150 : e.los && d < 520) && !(GS.time < (e.flowT || 0)))
    return d < e.r * 2 + 24 ? [dx / d, dy / d, d] : crowdDir(e, dx, dy, d, tx, ty);
  const F = fld || flow,
    cx = Math.floor(e.x / TILE),
    cy = Math.floor(e.y / TILE);
  let best = F[cy * MW + cx],
    bx = cx,
    by = cy;
  for (const [ox, oy] of N8) {
    const nx = cx + ox,
      ny = cy + oy;
    if (isWall(nx, ny)) continue;
    if (ox && oy && (isWall(cx + ox, cy) || isWall(cx, cy + oy))) continue;
    const v = F[ny * MW + nx] + (ox && oy ? 0.8 : 0);
    if (v < best) {
      best = v;
      bx = nx;
      by = ny;
    }
  }
  if (bx === cx && by === cy) return [dx / d, dy / d, d];
  const gx = (bx + 0.5) * TILE - e.x,
    gy = (by + 0.5) * TILE - e.y,
    g = Math.hypot(gx, gy) || 1;
  return [gx / g, gy / g, d];
}
function crowdDir(e, dx, dy, d, tx, ty) {
  // in the open: fan out into an arc, and walk round whoever is already in the way
  let ux = dx / d,
    uy = dy / d;
  const sd = e.fl || (e.fl = e.id & 1 ? 1 : -1);
  if (d > 120) {
    const off = Math.min(110, (d - 120) * 0.35) * (0.5 + ((e.id * 37) % 10) / 20),
      gx = dx - uy * off * sd,
      gy = dy + ux * off * sd,
      gl = Math.hypot(gx, gy) || 1;
    if (!solidPt(e.x + (gx / gl) * (e.r + 20), e.y + (gy / gl) * (e.r + 20))) {
      ux = gx / gl;
      uy = gy / gl;
    }
  }
  if (!(GS.time - (e.blkAt ?? -9) < 0.12) || GS.time < e.blkAt) {
    e.blkAt = GS.time;
    const ax = e.x + ux * (e.r + 12),
      ay = e.y + uy * (e.r + 12);
    e.blk = false;
    query(ax, ay, 26, o => {
      if (o !== e && !o.dead && !o.fly && d2(o.x, o.y, ax, ay) < (o.r + 8) ** 2 && d2(o.x, o.y, tx, ty) < d * d) {
        e.blk = true;
        return true;
      }
    });
  }
  if (e.blk) {
    const c = Math.cos(0.9 * sd),
      sn = Math.sin(0.9 * sd),
      nx = ux * c - uy * sn,
      ny = ux * sn + uy * c;
    ux = nx;
    uy = ny;
  }
  return [ux, uy, d];
}
let HC, HW, cells;
export function rebuildHash() {
  for (const c of cells) c.length = 0;
  for (const e of GS.enemies) {
    if (e.dead) continue;
    cells[clamp(Math.floor(e.y / HC), 0, HW - 1) * HW + clamp(Math.floor(e.x / HC), 0, HW - 1)].push(e);
  }
}
export function query(x, y, r, cb) {
  const x0 = clamp(Math.floor((x - r) / HC), 0, HW - 1),
    x1 = clamp(Math.floor((x + r) / HC), 0, HW - 1),
    y0 = clamp(Math.floor((y - r) / HC), 0, HW - 1),
    y1 = clamp(Math.floor((y + r) / HC), 0, HW - 1);
  for (let cy = y0; cy <= y1; cy++)
    for (let cx = x0; cx <= x1; cx++) {
      const c = cells[cy * HW + cx];
      for (let i = 0; i < c.length; i++) if (cb(c[i]) === true) return;
    }
}

/* ---------- IK legs ---------- */

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  flow = new Uint16Array(MW * MH);
  flowBig = new Uint16Array(MW * MH);
  gblk = new Uint8Array(MW * MH);
  GS.flowTile = -1;
  flowAt = -9;
  dens = new Uint8Array(MW * MH);
  heap = new Int32Array(MW * MH * 5);
  N8 = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  HC = 80;
  HW = Math.ceil(WW / HC);
  cells = Array.from({ length: HW * HW }, () => []);
}
