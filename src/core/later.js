/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
/* =====================================================================
   Update
   ===================================================================== */
function runLater(dt) { for (let i = later.length - 1; i >= 0; i--) { later[i].t -= dt; if (later[i].t <= 0) { const f = later[i].fn; later.splice(i, 1); f(); } } }
function rope(p, dt, ax, ay) {
  const sc = p.scarf; sc[0].x = ax; sc[0].y = ay;
  for (let i = 1; i < sc.length; i++) { const q = sc[i], vx = (q.x - q.px) * 0.86, vy = (q.y - q.py) * 0.86; q.px = q.x; q.py = q.y; q.x += vx + Math.sin(time * 3 + i) * 0.18; q.y += vy + 0.06; }
  for (let it = 0; it < 3; it++) for (let i = 1; i < sc.length; i++) { const a = sc[i - 1], b = sc[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, k = (d - 5.5) / d; b.x -= dx * k; b.y -= dy * k; }
  const an = p.ant, bx = p.x - Math.cos(p.bodyA) * 12 - Math.sin(p.bodyA) * 8, by = p.y - Math.sin(p.bodyA) * 12 + Math.cos(p.bodyA) * 8;
  const tx = bx - Math.cos(p.bodyA) * 14, ty = by - Math.sin(p.bodyA) * 14, k2 = Math.min(dt, 0.02);
  an.vx += ((tx - an.x) * 160 - an.vx * 9) * k2; an.vy += ((ty - an.y) * 160 - an.vy * 9) * k2; an.x += an.vx * k2; an.y += an.vy * k2; an.bx = bx; an.by = by;
}
