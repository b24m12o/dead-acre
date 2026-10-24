/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
function ik2(hx, hy, fx, fy, L1, L2, bend) {
  let dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy) || 0.001; const mx2 = L1 + L2 - 0.01;
  if (d > mx2) { fx = hx + dx / d * mx2; fy = hy + dy / d * mx2; dx = fx - hx; dy = fy - hy; d = mx2; }
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a)), mx = hx + dx / d * a, my = hy + dy / d * a;
  return [mx - dy / d * h * bend, my + dx / d * h * bend, fx, fy];
}
const LEGSPEC = {
  skitter: { pairs: [[5, 4, 15, 17], [-1, 5, 1, 21], [-7, 4, -14, 17]], L1: 10, L2: 12, w1: 3, w2: 2.3, step: 13, time: 0.07, col: [0.22, 0.07, 0.07] },
  beetle: { pairs: [[14, 13, 30, 33], [0, 17, 2, 40], [-14, 15, -28, 33]], L1: 23, L2: 25, w1: 6.5, w2: 4.8, step: 24, time: 0.12, col: [0.12, 0.1, 0.32] },
  queen: { pairs: [[22, 42, 56, 100], [-38, 42, -66, 98]], L1: 56, L2: 60, w1: 19, w2: 14, step: 52, time: 0.17, col: [0.76, 0.67, 0.63] }
};
function makeLegs(e, spec) {
  e.legs = []; const c = Math.cos(e.a), s = Math.sin(e.a); let i = 0;
  for (const [hx, hy, rx, ry] of spec.pairs) { for (const side of [-1, 1]) { const L = { hx, hy: hy * side, rx, ry: ry * side, side, g: (i + (side > 0 ? 1 : 0)) & 1, t: 1 }; L.fx = e.x + L.rx * c - L.ry * s; L.fy = e.y + L.rx * s + L.ry * c; e.legs.push(L); } i++; }
  e.legSpec = spec;
}
function updateLegs(e, dt) {
  const sp = e.legSpec, c = Math.cos(e.a), s = Math.sin(e.a), busy = [false, false];
  for (const L of e.legs) if (L.t < 1) busy[L.g] = true;
  for (const L of e.legs) {
    const dx = e.x + L.rx * c - L.ry * s + e.vx * 0.1, dy = e.y + L.rx * s + L.ry * c + e.vy * 0.1;
    if (L.t < 1) { L.t = Math.min(1, L.t + dt / sp.time); const k = L.t * L.t * (3 - 2 * L.t); L.fx = lerp(L.sx, L.tx, k); L.fy = lerp(L.sy, L.ty, k); }
    else { const dd = d2(L.fx, L.fy, dx, dy); if (dd > sp.step * sp.step * 9) { L.fx = dx; L.fy = dy; } else if (dd > sp.step * sp.step && !busy[1 - L.g]) { L.t = 0; L.sx = L.fx; L.sy = L.fy; L.tx = dx; L.ty = dy; busy[L.g] = true; } }
  }
}
function drawLegs(e, sc, fl, curl = 0) {
  const sp = e.legSpec, c = Math.cos(e.a), s = Math.sin(e.a), [r, g, b] = sp.col;
  for (const L of e.legs) {
    const hx = e.x + (L.hx * c - L.hy * s) * sc, hy = e.y + (L.hx * s + L.hy * c) * sc;
    let fx = lerp(e.x, L.fx, sc), fy = lerp(e.y, L.fy, sc);
    if (curl) { fx = lerp(fx, hx + (hx - e.x) * 0.3, curl); fy = lerp(fy, hy + (hy - e.y) * 0.3, curl); }
    const lift = L.t < 1 ? Math.sin(L.t * Math.PI) * 0.3 : 0;
    const [kx, ky, ex, ey] = ik2(hx, hy, fx, fy, sp.L1 * sc, sp.L2 * sc, -L.side);
    const LR = e.type === 'queen' ? R.ab_limb : null;
    setH(4 + lift * 10); lineQ(hx, hy, kx, ky, sp.w1 * sc * (1 + lift) * (LR ? 1.05 : 1), r, g, b, 1, 0, 0, 0, fl, LR);
    if (LR) quad(R.z_elbow, kx, ky, Math.atan2(ky - hy, kx - hx), sp.w1 * sc / 6.4, sp.w1 * sc / 6.4, r, g, b, 1, 0, 0, 0, fl);
    setH(2 + lift * 10); lineQ(kx, ky, ex, ey, sp.w2 * sc * (1 + lift) * (LR ? 1.05 : 1), r * 0.92, g * 0.92, b * 0.92, 1, 0, 0, 0, fl, LR);
    if (LR) { const ha = Math.atan2(ey - ky, ex - kx); quad(R.z_hand, ex + Math.cos(ha) * 4 * sc, ey + Math.sin(ha) * 4 * sc, ha, sc * 2.9 * (1 + lift * 0.3), sc * 2.9 * L.side, r * 0.66, g * 0.56, b * 0.53, 1, 0, 0, 0, fl); } // a dead, bruised hand walking on its knuckles: darker than the arm, never a pale glove
  }
}
function antenna(x, y, a, len, wob, w, col) { const x1 = x + Math.cos(a + wob * 0.5) * len * 0.55, y1 = y + Math.sin(a + wob * 0.5) * len * 0.55, x2 = x1 + Math.cos(a + wob) * len * 0.5, y2 = y1 + Math.sin(a + wob) * len * 0.5; lineQ(x, y, x1, y1, w, col[0], col[1], col[2], 1, 0, 0, 0, 0); lineQ(x1, y1, x2, y2, w * 0.75, col[0], col[1], col[2], 1, 0, 0, 0, 0); }

