/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A bot that plays the game for the campaign test: moves, aims, dodges boss attacks, uses the ability.
var pad = window.__pad = { lx: 0, ly: 0, rx: 0, ry: 0, fire: false }; // the bots think in stick terms; __kmApply turns that into keys and the mouse (the game itself is keyboard and mouse only)
var __kmApply = window.__kmApply = () => { keys.clear(); if (pad.lx > 0.38) keys.add('d'); if (pad.lx < -0.38) keys.add('a'); if (pad.ly > 0.38) keys.add('s'); if (pad.ly < -0.38) keys.add('w'); mouse.seen = true; if (pad.fire && (pad.rx || pad.ry)) { mouse.x = (GS.P.x + pad.rx * 220 - cam.x) * ZOOM; mouse.y = (GS.P.y + pad.ry * 220 - cam.y) * ZOOM; mouse.down = true; } else mouse.down = false; };
window.__bot = () => { window.__bot0(); __kmApply(); };
window.__bot0 = () => {
  const p = GS.P;
  let near = 1e9, nearE = null; for (const e of GS.enemies) { if (e.dead || e.emerge < 1) continue; const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < near) { near = d; nearE = e; } }
  const t = autoTarget(650);
  if (t) { const a = Math.atan2(t.y - p.y, t.x - p.x); pad.rx = Math.cos(a); pad.ry = Math.sin(a); pad.fire = true; } else { pad.rx = pad.ry = 0; pad.fire = false; }
  let mx = 0, my = 0;
  for (const e of GS.enemies) { if (e.dead || e.emerge < 1) continue; const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1; if (d < 260) { const w = (260 - d) / 260 * (e.big ? 2 : 1); mx += dx / d * w; my += dy / d * w; } }
  if (Math.hypot(mx, my) < 0.15) { // nothing close: go for loot
    let best = null, bd = 600; for (const c of GS.crates) if (c.landed !== false) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
    if (!best) for (const k of GS.pickups) { if (k.got) continue; const d = Math.hypot(k.x - p.x, k.y - p.y); if (d < Math.min(bd, 420)) { bd = d; best = k; } }
    if (best) { mx = (best.x - p.x) / bd; my = (best.y - p.y) / bd; }
    else { const cx = WW / 2 - p.x, cy = WH / 2 - p.y, cl = Math.hypot(cx, cy) || 1; if (cl > 300) { mx = cx / cl * 0.6; my = cy / cl * 0.6; } }
  }
  const ml = Math.hypot(mx, my);
  if (ml > 0.05) { let ax = mx / ml, ay = my / ml; for (const r of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.5, -2.5]) { const c = Math.cos(r), s = Math.sin(r), bx = ax * c - ay * s, by = ax * s + ay * c; if (!solidPt(p.x + bx * 36, p.y + by * 36) && !solidPt(p.x + bx * 18, p.y + by * 18)) { ax = bx; ay = by; break; } } pad.lx = ax; pad.ly = ay; } else pad.lx = pad.ly = 0;
  if (near < 46 && p.dashCd <= 0) tryDash();
  if (!(GS.time % 2 < 1 / 60) || true) { const bg = bestGun(); if (bg !== p.gun && hasAmmo(bg) && !(p.reload > 0)) equip(bg, true); }
};
window.__bot2 = () => {
  window.__bot(); const p = GS.P, q = GS.boss; if (!q || q.dead) return;
  let mx = pad.lx, my = pad.ly, danger = false, urgent = false;
  const dq = Math.hypot(p.x - q.x, p.y - q.y), uq = [(p.x - q.x) / (dq || 1), (p.y - q.y) / (dq || 1)];
  // kite: keep ~270 from the boss, circle it
  { const want = 270, k = clamp((want - dq) / 120, -1, 1); mx = uq[0] * k - uq[1] * 0.7; my = uq[1] * k + uq[0] * 0.7; }
  for (const w of GS.warns) { if (w.k === 'friend') continue; const x = w.follow ? w.follow.x : w.x, y = w.follow ? w.follow.y : w.y, left = w.dur - w.t;
    if (w.lane) { const c = Math.cos(w.a), s = Math.sin(w.a), px = p.x - x, py = p.y - y, al = px * c + py * s, sd = -px * s + py * c; if (al > -20 && al < w.len + 30 && Math.abs(sd) < w.w / 2 + 26) { danger = true; const g = sd >= 0 ? 1 : -1; mx = -s * g; my = c * g; if (left < 0.22) urgent = true; } }
    else { const d = Math.hypot(p.x - x, p.y - y); if (d < w.r + 26) { danger = true; mx = (p.x - x) / (d || 1); my = (p.y - y) / (d || 1); if (left < 0.22) urgent = true; } } }
  if ((q.st === 'rear' || q.st === 'charge') && q.lx !== undefined) { const px = p.x - q.x, py = p.y - q.y, al = px * q.lx + py * q.ly, sd = -px * q.ly + py * q.lx; if (al > 0 && Math.abs(sd) < 90) { danger = true; const g = sd >= 0 ? 1 : -1; mx = -q.ly * g; my = q.lx * g; if (q.st === 'charge' && al < 260) urgent = true; } }
  if (q.st === 'sprint' && dq < 170) { mx = -Math.sin(q.sa); my = Math.cos(q.sa); urgent = true; }
  if (q.st === 'act' && q.act === 'stomp' && dq < 230) { mx = uq[0]; my = uq[1]; danger = true; }
  if (q.clawT > 0 && dq < 220) { mx = uq[0]; my = uq[1]; if (q.clawT < 0.4) urgent = true; }
  for (const b of GS.ebullets) { if (b.k === 'signstuck') continue; const rx = p.x - b.x, ry = p.y - b.y, vv = b.vx * b.vx + b.vy * b.vy || 1, t = clamp((rx * b.vx + ry * b.vy) / vv, 0, 0.25), cx = b.x + b.vx * t - p.x, cy = b.y + b.vy * t - p.y; if (Math.hypot(cx, cy) < b.r + p.r * 0.5 + 4) { urgent = true; const l = Math.sqrt(vv); mx = -b.vy / l; my = b.vx / l; } }
  for (const m of GS.mortars) { const d = Math.hypot(p.x - m.tx, p.y - m.ty); if (d < 80) { danger = true; mx = (p.x - m.tx) / (d || 1); my = (p.y - m.ty) / (d || 1); } }
  for (const o of GS.pools) { const d = Math.hypot(p.x - o.x, p.y - o.y); if (d < o.r + 12 && !danger) { mx += (p.x - o.x) / (d || 1); my += (p.y - o.y) / (d || 1); } }
  const l = Math.hypot(mx, my) || 1; pad.lx = mx / l; pad.ly = my / l;
  for (const r of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) { const c = Math.cos(r), s = Math.sin(r), bx = pad.lx * c - pad.ly * s, by = pad.lx * s + pad.ly * c; if (!solidPt(p.x + bx * 36, p.y + by * 36)) { pad.lx = bx; pad.ly = by; break; } }
  if (urgent && p.dashCd <= 0) tryDash();
};

{ const b2 = window.__bot2; window.__bot2 = () => { b2(); __kmApply(); }; }

{ const b2 = window.__bot2; window.__bot2 = () => { b2(); if (window.__noAb || typeof useAbility !== 'function' || !GS.P || GS.P.abT > 0 || GS.state !== 'play') return; let n = 0, cx = 0, cy = 0; for (const e of GS.enemies) if (!e.dead && e.emerge >= 1 && d2(e.x, e.y, GS.P.x, GS.P.y) < 330 * 330) { n++; cx += e.x; cy += e.y; } const bn = GS.boss && !GS.boss.dead && d2(GS.boss.x, GS.boss.y, GS.P.x, GS.P.y) < 450 * 450; if (n >= 5 || bn) { const ub = bn && n < 5, tx = ub ? GS.boss.x : cx / n, ty = ub ? GS.boss.y : cy / n, sx = mouse.x, sy = mouse.y; mouse.x = (tx - cam.x) * ZOOM; mouse.y = (ty - cam.y) * ZOOM; useAbility(); mouse.x = sx; mouse.y = sy; window.__abUsed = (window.__abUsed || 0) + 1; } }; }
