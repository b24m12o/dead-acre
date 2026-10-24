/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const VISC = document.createElement('canvas'),
  visX = VISC.getContext('2d');
let texVis = null,
  visOn = 0,
  visW = 0,
  visH = 0;
const VIS_BLUR = (() => {
  try {
    visX.filter = 'blur(2px)';
    const ok = visX.filter === 'blur(2px)';
    visX.filter = 'none';
    return ok;
  } catch (e) {
    return false;
  }
})(); // Safari has no canvas filter: a smaller mask, smoothed by texture filtering, stands in
const VIS_N = 540,
  opaqueT = i => grid[i] === 1 && (ttype[i] === 1 || ttype[i] === 5); // chain-link, cars, trees and posts don't block the view
function rayDist(x0, y0, dx, dy, maxD) {
  // walk the tiles along a ray until an opaque one
  let tx = Math.floor(x0 / TILE),
    ty = Math.floor(y0 / TILE);
  const sx = dx > 0 ? 1 : -1,
    sy = dy > 0 ? 1 : -1;
  const tdx = dx ? Math.abs(TILE / dx) : 1e9,
    tdy = dy ? Math.abs(TILE / dy) : 1e9;
  let tmx = dx ? (dx > 0 ? (tx + 1) * TILE - x0 : x0 - tx * TILE) / Math.abs(dx) : 1e9,
    tmy = dy ? (dy > 0 ? (ty + 1) * TILE - y0 : y0 - ty * TILE) / Math.abs(dy) : 1e9;
  for (let k = 0; k < MW + MH; k++) {
    let t;
    if (tmx < tmy) {
      t = tmx;
      tmx += tdx;
      tx += sx;
    } else {
      t = tmy;
      tmy += tdy;
      ty += sy;
    }
    if (t > maxD) return maxD;
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return t;
    if (opaqueT(ty * MW + tx)) return t;
  }
  return maxD;
}
function sightClear(x0, y0, x1, y1) {
  const dx = x1 - x0,
    dy = y1 - y0,
    L = Math.hypot(dx, dy);
  return L < 1 || rayDist(x0, y0, dx / L, dy / L, L) >= L - 6;
}
function buildVis() {
  const dv = VIS_BLUR ? 4 : 10,
    W = Math.max(2, Math.ceil(VW / dv)),
    H = Math.max(2, Math.ceil(VH / dv));
  if (VISC.width !== W || VISC.height !== H) {
    VISC.width = W;
    VISC.height = H;
  }
  const ox = P.x,
    oy = P.y,
    maxD = Math.hypot(viewW, viewH) + 200,
    k = ZOOM / dv;
  visX.setTransform(1, 0, 0, 1, 0, 0);
  visX.filter = 'none';
  visX.fillStyle = '#000';
  visX.fillRect(0, 0, W, H);
  if (VIS_BLUR) visX.filter = 'blur(7px)';
  visX.fillStyle = '#fff';
  visX.beginPath();
  for (let i = 0; i < VIS_N; i++) {
    const a = (i / VIS_N) * TAU,
      dx = Math.cos(a),
      dy = Math.sin(a);
    let d = rayDist(ox, oy, dx, dy, maxD);
    if (d < maxD) d += 20 + (dy < 0 ? -dy * 34 : 0); // the wall itself stays in view, including its raised face
    const x = (ox + dx * d - camX) * k,
      y = (oy + dy * d - camY) * k;
    if (i) visX.lineTo(x, y);
    else visX.moveTo(x, y);
  }
  visX.closePath();
  visX.fill();
  visX.filter = 'none';
  {
    const cx = (ox - camX) * k,
      cy = (oy - camY) * k,
      g = visX.createRadialGradient(cx, cy, 340 * k, cx, cy, 900 * k);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.5)');
    visX.globalCompositeOperation = 'lighter';
    visX.fillStyle = g;
    visX.fillRect(0, 0, W, H);
    visX.globalCompositeOperation = 'source-over';
  }
  if (!texVis) {
    texVis = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texVis);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  gl.bindTexture(gl.TEXTURE_2D, texVis);
  if (visW !== W || visH !== H) {
    visW = W;
    visH = H;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, VISC);
  } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, VISC);
}
function sightTick(dt) {
  // fade each zombie in or out as it comes into or leaves your line of sight
  const on = opt.los && P && state !== 'menu',
    k = Math.min(1, dt * 9);
  const upd = e => {
    if (!on || e.big || e.type === 'queen') {
      e.sv = 1;
      return;
    }
    e.svT = (e.svT || 0) - dt;
    if (e.svT <= 0) {
      e.svT = 0.1;
      e.svW = sightClear(P.x, P.y, e.x, e.y - (e.z || 0) * 0.5) ? 1 : 0;
    }
    e.sv = (e.sv ?? 1) + ((e.svW ?? 1) - (e.sv ?? 1)) * k;
  };
  for (const e of enemies) upd(e);
  for (const e of corpses) upd(e);
}
/* ---------- HUD + world ticking ---------- */
