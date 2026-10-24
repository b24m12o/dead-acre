/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
function render() {
  const [sx, sy] = shakeOff(); camX = cam.x + sx; camY = cam.y + sy;
  // shadow pass: real silhouettes projected along the sun direction
  gl.bindFramebuffer(gl.FRAMEBUFFER, rtShadow.fb); gl.viewport(0, 0, rtShadow.w, rtShadow.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND); gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE);
  curProg = P_SHADOW; gl.useProgram(P_SHADOW.p); gl.uniform4f(P_SHADOW.u.uCam, camX, camY, viewW, viewH); gl.uniform1i(P_SHADOW.u.uAlb, 0);
  bTexA = bTexE = bTexN = null; qn = 0; bset(texAtlA, texAtlE, texAtlN, false);
  SHMODE = true; SHS = 0.2; setH(0); // cloud shadows: a soft drift over the moonlight, not dirty smudges
  if (ev !== 'fog' && ev !== 'storm') for (const c of clouds) quad(R.cloud, c.x, c.y, c.r, c.s, c.s * 0.7, 1, 1, 1, 1, 0, 0, 0, 0); // fog and storm cloud cast no hard shadows
  SHS = 0.5; for (const L of lamps) { if (L.down) continue; const lh = L.lantern ? 30 : 66; setH(lh); lineQ(L.bx, L.by, L.hx, L.hy, L.lantern ? 3 : 4, 1, 1, 1, 1, 0, 0, 0, 0, R.pixel); quad(L.lantern ? R.lantern : R.lamp, L.hx, L.hy, L.a, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0); }
  SHS = 0.7; roofShadows();
  for (const r of roofs) { setH(95); quad(R[r.reg], r.x, r.y, 0, r.s, r.s, 1, 1, 1, 1, 0, 0, 0, 0); }
  SHS = 0.62; for (const t of trees) { setH(70); quad(R['canopy' + t.v], t.x, t.y, t.rot + Math.sin(time * 0.8 + t.sway) * 0.03, t.s, t.s, 1, 1, 1, 1, 0, 0, 0, 0); }
  SHS = 0.7; drawCasters(); flush(); SHMODE = false; setH(0);
  // flashlight shadow pass
  gl.bindFramebuffer(gl.FRAMEBUFFER, rtFlash.fb); gl.viewport(0, 0, rtFlash.w, rtFlash.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  if (P && state !== 'over' && state !== 'menu') {
    FLX = P.x + Math.cos(P.aimA) * 8; FLY = P.y + Math.sin(P.aimA) * 8; SHMODE = 2; NOHERO = true; SHS = 0.85;
    for (const t of trees) { setH(55); quad(R['canopy' + t.v], t.x, t.y, t.rot, t.s, t.s, 1, 1, 1, 0.8, 0, 0, 0, 0); }
    drawCasters(); flush(); SHMODE = false; NOHERO = false; setH(0);
  }
  gl.blendEquation(gl.FUNC_ADD);
  // scene pass: albedo + emissive + normals
  gl.bindFramebuffer(gl.FRAMEBUFFER, rtScene.fb); gl.viewport(0, 0, RW, RH); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  curProg = P_SPRITE; gl.useProgram(P_SPRITE.p); gl.uniform4f(P_SPRITE.u.uCam, camX, camY, viewW, viewH); gl.uniform1i(P_SPRITE.u.uAlb, 0); gl.uniform1i(P_SPRITE.u.uEmi, 1); gl.uniform1i(P_SPRITE.u.uNrm, 2);
  bTexA = bTexE = bTexN = null; qn = 0;
  bset(texMapA, texMapE, texMapN, false); quad(MAPREG, WW / 2, WH / 2, 0, 1, 1, 1, 1, 1, 1, 1.2, 1.2, 1.2, 0); flush();
  bset(texAtlA, texAtlE, texAtlN, false);
  for (const d of decals) { const f = Math.min(1, d.life / 5), g = d.life / d.max; quad(d.reg, d.x, d.y, d.rot, d.s, d.s, d.tint[0], d.tint[1], d.tint[2], d.tint[3] * f, d.emit[0] * g, d.emit[1] * g, d.emit[2] * g, 0); }
  { // contact shadows: soft occlusion where bodies meet the ground
    const ao = (x, y, r, al, a = 0, ex = 1) => quad(R.blob, x, y, a, r * ex / 15, r / 15, 0, 0, 0, al, 0, 0, 0, 0);
    if (P && state !== 'menu') ao(P.x - 1, P.y + 2, 19, 0.42, P.bodyA, 1.15);
    for (const b of buddies) ao(b.x - 1, b.y + 2, 18, 0.4, b.bodyA, 1.15);
    for (const e of enemies) if (!e.dead && !e.fly && (e.z || 0) < 10) ao(e.x - 1, e.y + 2, e.r * (e.type === 'beetle' ? 1.1 : 1.3), 0.38 * Math.min(1, e.emerge) * (0.3 + 0.7 * (e.sv ?? 1)), e.a + Math.PI / 2, 0.85);
    for (const c of crates) if (!c.landed) { const k = clamp(c.z / 640, 0, 1), g = chuteGeom(c); ao(c.x + (c.sx || 0), c.y, 16 + k * 26, 0.55 - k * 0.35); if ((c.dep || 0) > 0.3) ao(g.cx, c.y + 6, (c.gun ? 62 : 52) * (1 + k * 0.4), 0.2 - k * 0.1); }
    for (const e of corpses) if (HUMAN[e.type] && !(e.z > 2)) { const al = 0.26 * clamp(((e.keep || 0.55) - e.dying) / 1.5, 0, 1); if (LYB[e.type]) { const K = e.type === 'beetle' ? 1.9 : 1, g = lyState(e).g; ao(e.x - Math.cos(e.fallA ?? 0) * 3 * K, e.y - Math.sin(e.fallA ?? 0) * 3 * K, 18 * K, al * 1.15, e.fallA ?? 0, 1 + 2 * g); } else ao(e.x, e.y, e.r * 1.7, al, e.fallA ?? 0, 1.5); } // a long soft shadow under the whole body
  }
  for (const pl of pools) { const f = Math.min(1, pl.life / 0.8, (pl.max - pl.life) / 0.25 + 0.2), pu = 0.8 + Math.sin(time * 5 + pl.x) * 0.2; quad(R['splat' + pl.v], pl.x, pl.y, pl.rot, pl.r / 30 * f, pl.r / 30 * f, BILE[0] * 0.8, BILE[1] * 0.75, BILE[2] * 0.6, 0.85 * f, 0.03 * pu, 0.04 * pu, 0.01 * pu, 0); }
  const tx0 = Math.max(0, Math.floor(camX / TILE) - 1), tx1 = Math.min(MW - 1, Math.floor((camX + viewW) / TILE) + 1), ty0 = Math.max(0, Math.floor(camY / TILE) - 1), ty1 = Math.min(MH - 1, Math.floor((camY + viewH) / TILE) + 1);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) for (const g of grassCells[ty * MW + tx]) {
    const dx = g.x - P.x, dy = g.y - P.y, dd = dx * dx + dy * dy; let push = 0, pa = 0;
    if (dd < 46 * 46) { push = (1 - Math.sqrt(dd) / 46) * 0.9; pa = Math.atan2(dy, dx); }
    g.bend += (push - g.bend) * 0.2;
    const wind = Math.sin(time * 1.7 + g.x * 0.012 + g.y * 0.008) * 0.14 + Math.sin(time * 3.1 + g.ph) * 0.04;
    if (g.burn > 0) { const fk = 0.7 + Math.sin(time * 19 + g.ph * 7) * 0.3; quad(R['grass' + g.v], g.x, g.y, g.r + wind * 3, g.s * 0.9, g.s * 0.9, 0.25, 0.12, 0.06, 1, 1.8 * fk, 0.7 * fk, 0.15 * fk, 0); }
    else if (g.burnt) quad(R['grass' + g.v], g.x, g.y, g.r, g.s * 0.7, g.s * 0.55, 0.12, 0.11, 0.1, 0.9, 0, 0, 0, 0);
    else quad(R['grass' + g.v], g.x + Math.cos(pa) * g.bend * 4, g.y + Math.sin(pa) * g.bend * 4, g.r + wind, g.s * (1 - g.bend * 0.25), g.s, 1, 1, 1, 1, 0, 0, 0, 0);
  }
  for (const k of pickups) { const bob = Math.sin(k.t * 5 + k.x) * 2.5, hot = lampHot(k.x, k.y), dm = 1 / (1 + 3.2 * hot); /* right under a lamp the light pool is several times brighter than the street: dim the paint there so the kit keeps its colour */ if (k.k === 'ammo') quad(R['ammo_' + k.at] || R.ammo, k.x, k.y - 8 + bob, Math.sin(k.t * 2) * 0.2, k.at ? 1.25 : 1, k.at ? 1.25 : 1, dm, dm, dm, 1, 0.55, 0.55, 0.55, 0); else quad(R.medkit, k.x, k.y - 8 + bob, 0, 1.2, 1.2, dm, dm, dm, 1, 0.5, 0.45, 0.45, 0); /* a modest self-glow: under a streetlamp they no longer burn out to a white square */ }
  for (const q of parts) if (q.k >= 3 && q.k !== 10 && q.k !== 11 && q.k !== 13) { const f = Math.min(1, q.life * 2), c = q.k === 3 || q.k === 8 ? q.c : q.tc || [1, 1, 1], tint = q.k === 3 ? 0.85 : 1; if (q.k === 8) { const sp = Math.hypot(q.vx, q.vy); quad(R.drop, q.x, q.y - q.z, Math.atan2(q.vy - q.vz * 0.5, q.vx), q.size * (1 + Math.min(1.6, sp / 260)), q.size, c[0], c[1], c[2], f, 0, 0, 0, 0); continue; } quad(q.reg || PARTREG[q.k], q.x, q.y - q.z, q.rot, q.size, q.size, c[0] * tint, c[1] * tint, c[2] * tint, f, 0, 0, 0, 0); }
  lampShadows();
  drawCasters();
  for (const q of parts) if (q.k === 2) { const t = 1 - q.life / q.max, a = Math.min(1, q.life / q.max * 2) * 0.7, sc = q.size * (0.6 + t * q.grow * 1.5); const tc = q.c || [1, 1, 1]; quad(R.dust, q.x, q.y, q.rot, sc, sc, tc[0], tc[1], tc[2], q.c ? a * 0.9 : a, 0, 0, 0, 0); }
  if (boss && !boss.dead && boss.signAt) { const sa = boss.signAt, hk = 0.5 + 0.4 * clamp((sa.hp ?? 1) / (sa.max || 1), 0, 1); setH(3); quad(R.rk_sign, sa.x, sa.y, sa.a, 1.05, 1.05, hk, hk, hk, 1, 0.2, 0.2, 0.2, 0); } // the STOP sign stuck in the road, waiting for it to come back
  for (const b of ebullets) { const pu = 1 + Math.sin(time * 18 + b.x) * 0.08; if (b.k === 'tire') { if (!(b.flat > 0)) { setH(14); const a = Math.atan2(b.vy, b.vx); quad(R['tire_up' + (Math.floor(b.spin * 1.3) & 1)], b.x, b.y - 13, a, 1.05, 1.05 * (1 + Math.abs(b.lean) * 2.2), 1.1, 1.1, 1.1, 1, 0.12, 0.12, 0.12, 0); } else { const k = Math.min(1, b.flat / 0.35), w = Math.sin(b.flat * 34) * 0.35 * (1 - k); setH(14 * (1 - k) + 2); if (k < 1) quad(R['tire_up0'], b.x, b.y - 13 * (1 - k), b.fa + w, 1.05, 1.05 * (1 + k * 1.9), 1.1, 1.1, 1.1, 1 - k, 0.12, 0.12, 0.12, 0); quad(R.p_tire, b.x, b.y, b.fa + w, 1.9, 1.9 * (0.35 + 0.65 * k), 1.1, 1.1, 1.1, k, 0.1, 0.1, 0.1, 0); } continue; } /* upright and rolling; then it tips, wobbling down like a dropped coin, and lies flat */ if (b.k === 'sign') { setH(20); quad(R.rk_sign, b.x, b.y - 14, b.spin, 1.05, 1.05, 1, 1, 1, 1, 0.3, 0.3, 0.3, 0); continue; } if (b.k === 'sonic') quad(R.sonic, b.x, b.y, time * 4, (0.55 + (4 - b.life) * 0.12) * pu, (0.55 + (4 - b.life) * 0.12) * pu, 1, 1, 1, 1, 2, 2, 2, 0); else if (b.k === 'acid' && b.hose) quad(R.acid, b.x, b.y, Math.atan2(b.vy, b.vx), 1.5, 0.75, 1, 1, 1, 1, 1.9, 1.9, 1.6, 0); else if (b.k === 'acid') quad(R.acid, b.x, b.y, time * 5, b.r / 7.5 * pu, b.r / 7.5 * pu, 1, 1, 1, 1, 1.6, 1.6, 1.6, 0); else if (b.k === 'rock') quad(R.rockchip, b.x, b.y, time * 9 + b.x * 0.1, b.r / 3.6, b.r / 3.6, b.c[0] * 1.3, b.c[1] * 1.3, b.c[2] * 1.3, 1, 0, 0, 0, 0); else quad(R.spore, b.x, b.y, time * 3, b.r / 7.5 * pu, b.r / 7.5 * pu, 1, 1, 1, 1, 2, 2, 2, 0); }
  for (const t of trees) { const cx = t.x, cy = t.y - 40 * t.s, R1 = 100 * t.s; let near = P && d2(cx, cy, P.x, P.y) < R1 * R1; if (!near && P && d2(cx, cy, P.x, P.y) < 700 * 700) { const R2 = 80 * t.s; near = buddies.some(b => d2(cx, cy, b.x, b.y) < R2 * R2) || enemies.some(e => !e.dead && e.emerge >= 1 && d2(cx, cy, e.x, e.y) < R2 * R2); } /* the whole canopy, and anything hiding under it near you, not just its trunk */ t.fade += ((near ? 0.3 : 0.98) - t.fade) * 0.15; quad(R['canopy' + t.v], t.x, t.y - 40 * t.s, t.rot + Math.sin(time * 0.8 + t.sway) * 0.03, t.s, t.s, 1, 1, 1, t.fade, 0, 0, 0, 0); }
  drawHouseRoofs();
  for (const L of lamps) { if (L.down) continue; const k = lampK(L), lh = LAMPV(L); lineQ(L.bx, L.by - lh, L.hx, L.hy - lh, L.lantern ? 3 : 4, 0.18, 0.18, 0.2, 1, 0, 0, 0, 0, R.pixel); quad(L.lantern ? R.lantern : R.lamp, L.hx, L.hy - lh, L.a, 1, 1, 1, 1, 1, 1, 2.4 * k, 2.2 * k, 1.8 * k, 0); }
  if (evac && evac.z >= 20) { const e = evac; setH(e.z + 60); { const hk = e.t >= e.land ? 0.8 : 1.4; quad(R.heli, e.hx, e.hy - e.z * 0.35, e.ha ?? 2.4, 1 + e.z / 900, 1 + e.z / 900, 1, 1, 1, 1, hk, hk, hk, 0); } heliRotor(e); } // airborne: above the roofs and the tree crowns
  drawAsh(); drawFog();
  for (const r of roofs) { const under = P && Math.abs(P.x - r.x) < R[r.reg].w * 0.5 * r.s + 10 && Math.abs(P.y - r.y + 40) < R[r.reg].h * 0.5 * r.s + 30; r.fade += ((under ? 0.3 : 1) - r.fade) * 0.12; quad(R[r.reg], r.x, r.y - 56, 0, r.s, r.s, 1, 1, 1, r.fade, 1.6 * r.fade, 1.6 * r.fade, 1.6 * r.fade, 0); }
  drawChutes(); // canopies are the highest thing in the sky: above lamps and roofs
  flush();
  // additive glow pass
  bset(texAtlA, texAtlE, texAtlN, true);
  drawObjectiveGlow(); shaftGlow(); drawAshGlow();
  for (const L of lamps) { const k = lampK(L); if (k > 0.05) quad(R.glow, L.hx, L.hy - LAMPV(L), 0, L.lantern ? 0.7 : 1.2, L.lantern ? 0.7 : 1.2, 0, 0, 0, 1, 0.55 * k, 0.38 * k, 0.18 * k, 0); }
  for (const f of fires) { const fk = 0.75 + Math.sin(time * 17 + f.ph) * 0.15 + Math.sin(time * 7.3 + f.ph) * 0.1; quad(R.glow, f.x, f.y - 26, 0, 0.7 * fk, 0.9 * fk, 0, 0, 0, 1, 0.55 * fk, 0.25 * fk, 0.07, 0); }
  for (const w of warns) { // a steady outline that fills in as the moment nears, and brightens only in the last instant
    const t = clamp(w.t / w.dur, 0, 1), late = w.dur - w.t < 0.15 ? 1.6 : 1, C = WCOL[w.k] || WCOL.slam, x = w.follow ? w.follow.x : w.x, y = w.follow ? w.follow.y : w.y;
    if (w.lane) { const c = Math.cos(w.a), s2 = Math.sin(w.a), hw = w.w / 2, L = w.len * Math.min(1, 0.3 + t * 1.2), ed = clamp((t - 0.55) / 0.45, 0, 1) * 0.45; // a faint line runs out along the ground; the edges show only near the end
      lineQ(x, y, x + c * L, y + s2 * L, 2.4, 0, 0, 0, 0.45, C[0] * 0.45 * late, C[1] * 0.45 * late, C[2] * 0.45 * late, 0, R.pixel);
      if (ed > 0) for (const sd of [-1, 1]) lineQ(x - s2 * hw * sd, y + c * hw * sd, x + c * L - s2 * hw * sd, y + s2 * L + c * hw * sd, 1.6, 0, 0, 0, ed, C[0] * 0.5 * late, C[1] * 0.5 * late, C[2] * 0.5 * late, 0, R.pixel); continue; }
    quad(R.ring, x, y, 0, w.r / 58, w.r / 58, 0, 0, 0, 0.6, C[0] * 0.6 * late, C[1] * 0.6 * late, C[2] * 0.6 * late, 0); if (w.k !== 'friend') quad(R.glow, x, y, 0, w.r / 32 * t, w.r / 32 * t, 0, 0, 0, 0.35 + 0.25 * t, C[0] * 0.4 * late, C[1] * 0.4 * late, C[2] * 0.4 * late, 0);
  }
  for (const m of mortars) if (m.flare) quad(R.glow, m.x, m.y - m.z, 0, 0.5, 0.5, 0, 0, 0, 1, 0.9, 0.18, 0.1, 0); else if (!m.rock) quad(R.glow, m.x, m.y - m.z, 0, 0.6, 0.6, 0, 0, 0, 1, 0.35, 0.7, 0.08, 0);
  for (const b of pbullets) { if (b.shell) { if (b.t >= 0) quad(R.glow, b.x, b.y - b.z, 0, 0.3, 0.3, 0, 0, 0, 1, 1.2, 0.6, 0.2, 0); continue; } if (b.mz && d2(b.x, b.y, b.sx, b.sy) < b.mz * b.mz) continue; /* the round is only seen once it has left the barrel */ const a = Math.atan2(b.vy, b.vx), sc = b.small ? 0.65 : b.pellet ? 0.55 : b.heavy ? 1.6 : 1, gc = S.evo.gold && !b.small ? [2.8, 2.2, 0.8] : b.pellet ? [2.4, 1.6, 0.7] : [2.8, 1.7, 0.6]; if (b.tr === undefined) b.tr = S.evo.gold || Math.random() < (b.pellet ? 0.12 : b.small ? 0.2 : 0.3); const tk = b.tr ? 1 : 0.32; if (b.tr) quad(R.glow, b.x, b.y, 0, 0.16 * sc, 0.16 * sc, 0, 0, 0, 1, gc[0] * 0.18, gc[1] * 0.18, gc[2] * 0.18, 0); quad(R.bolt, b.x - Math.cos(a) * 12 * sc, b.y - Math.sin(a) * 12 * sc, a, 1.25 * sc, 0.28 * (b.pellet ? 0.8 : 1), 0, 0, 0, 1, gc[0] * 0.75 * tk, gc[1] * 0.7 * tk, gc[2] * 0.6 * tk, 0); }
  // Eyes are authored into head atlas textures so face details share the sprite
  // transform, scale, shadows and shading. Keep only the restrained elite marker here.
  for (const e of enemies) if (!e.dead && !e.dormant && e.elite && (e.sv ?? 1) >= 0.55 && !(e.down > 0) && e.__ht === time) { const v = e.sv ?? 1, a = e.__ha ?? e.a, hx = e.__hx, hy = e.__hy, k = (e.sc || 1) * 1.2 * (e.__hk || 1), bl = Math.sin(time * 0.9 + e.id * 1.7) > 0.96 ? 0.15 : 1; /* no ring on the ground: its eyes catch the light like an animal's, two hard amber points you can pick out in the dark, and they blink now and then */
    for (const sd of [-1, 1]) { const ex = hx + (Math.cos(a) * 5.2 - Math.sin(a) * sd * 2.3) * k, ey = hy + (Math.sin(a) * 5.2 + Math.cos(a) * sd * 2.3) * k; quad(R.glow, ex, ey, 0, 0.16 * k, 0.16 * k, 0, 0, 0, 1, 0.5 * v * bl, 0.2 * v * bl, 0.03 * v * bl, 0); quad(R.pixel, ex, ey, 0, 0.36 * k, 0.36 * k, 0, 0, 0, 1, 3.2 * v * bl, 1.7 * v * bl, 0.4 * v * bl, 0); } }
  for (const c of crates) if (c.landed) { const pu = 0.6 + Math.sin(time * 4) * 0.25; quad(R.glow, c.x, c.y, 0, 1.2 * pu, 1.2 * pu, 0, 0, 0, 1, c.gun ? 0.5 : 0.32, c.gun ? 0.36 : 0.22, 0.08, 0); if (c.flare > 0) { const fk = Math.min(1, c.flare / 1.5) * (0.75 + Math.random() * 0.25); quad(R.glow, c.x + 20, c.y + 12, 0, 0.16, 0.16, 0, 0, 0, 1, 3 * fk, 1.1 * fk, 0.8 * fk, 0); quad(R.glow, c.x + 20, c.y + 12, 0, 0.6, 0.6, 0, 0, 0, 1, 0.7 * fk, 0.12 * fk, 0.08 * fk, 0); } }
  for (const b of ebullets) if (b.k !== 'tire' && b.k !== 'sign' && b.k !== 'rock') quad(R.glow, b.x, b.y, 0, 0.32, 0.32, 0, 0, 0, 1, b.c[0] * 0.18, b.c[1] * 0.18, b.c[2] * 0.18, 0);
  for (const g of bangs) if (g.t >= g.dur && Math.sin(time * 50) > 0) quad(R.glow, g.x, g.y, 0, 0.25, 0.25, 0, 0, 0, 1, 2.4, 2.2, 1.6, 0);
  for (const m of darts) if (m.t >= m.dur && Math.sin(time * 40) > 0) quad(R.glow, m.x, m.y, 0, 0.3, 0.3, 0, 0, 0, 1, 2.6, 0.3, 0.2, 0);
  for (const q of parts) if (q.k === 11) quad(R.glow, q.x, q.y - q.z, 0, q.size, q.size, 0, 0, 0, Math.min(1, q.life * 2), 0.45, 0.55, 0.65, 0);
  for (const q of parts) if (q.k === 13) { const f = q.life / q.max, sc = q.size * (0.55 + (1 - f) * 1.2), col = f > 0.72 ? [0.75, 0.5, 0.22] : f > 0.4 ? [0.7, 0.28, 0.06] : [0.32, 0.08, 0.02], al = Math.min(1, f * 2.2) * Math.min(1, 0.1 + (1 - f) * 5) * 0.8; quad(R.glow, q.x, q.y, q.rot, sc * 0.55, sc * 0.5, 0, 0, 0, al, col[0], col[1], col[2], 0); }
  fireBeds();
  for (const q of parts) if (q.k === 10) { const f = q.life / q.max, sc = q.size * (0.7 + (1 - f) * 0.7), lean = Math.atan2(q.vy, q.vx + WINDX * 0.6) + Math.PI / 2, fl = 1 + Math.sin(time * 23 + q.x) * 0.12, al = Math.min(1, f * 2.2) * Math.min(1, (1 - f) * 8 + 0.2);
    const wob = Math.sin(time * 13 + q.x * 0.7) * 0.14, sw = 1 + Math.sin(time * 17 + q.y) * 0.1; // each tongue sways and breathes on its own
    quad(R.ftongue, q.x, q.y - sc * 7, lean + wob, sc * 1.6 * sw, sc * 1.8 * fl, 0, 0, 0, al * 0.5, 0.95 * f + 0.22, 0.24 * f + 0.04, 0.03, 0); // the outer flame: broad and dull red, cooling to smoke-red as it rises
    quad(R.ftongue, q.x, q.y - sc * 6, lean + wob * 0.6, sc * 1.05, sc * 1.35 * fl, 0, 0, 0, al * 0.7, 1.35, 0.55 + 0.25 * f, 0.1, 0); // the body: orange
    if (f > 0.3) quad(R.ftongue, q.x, q.y - sc * 4.5, lean + wob * 0.3, sc * 0.55, sc * 0.8 * fl, 0, 0, 0, al * 0.9, 1.7, 1.25 + 0.2 * f, 0.55, 0); } // the hot core: small, yellow-white, low down
  for (const g of grassFire) { if (g.fs === undefined) { g.fs = rand(0.6, 1.35); g.fl = rand(-0.35, 0.35); } const fk = 0.75 + Math.sin(time * 19 + g.ph * 5) * 0.25, h = Math.min(1, g.burn / 1.2), sc = g.fs * h; // each tuft burns at its own size and lean
    if (g.fs > 1.05) quad(R.glow, g.x, g.y - 2, 0, 0.5 * sc, 0.35 * sc, 0, 0, 0, 0.6, 0.5 * fk, 0.2 * fk, 0.04, 0);
    quad(R.ftongue, g.x + Math.sin(time * 7 + g.ph) * 1.5, g.y - 7 * sc, Math.sin(time * (4 + g.fs * 2) + g.ph) * 0.22 + g.fl + WINDX * 0.012, 0.38 * sc, 0.5 * sc * fk, 0, 0, 0, 1, 1.4, 0.55 + g.fs * 0.08, 0.12, 0); }
  for (const q of parts) { if (q.k === 0) { const f = q.life / q.max; quad(R.glow, q.x, q.y, 0, q.size * (0.4 + f * 0.6), q.size * (0.4 + f * 0.6), 0, 0, 0, f, q.c[0] * 2, q.c[1] * 2, q.c[2] * 2, 0); } else if (q.k === 1) { const f = q.life / q.max, sp = Math.hypot(q.vx, q.vy); quad(R.spark, q.x, q.y, Math.atan2(q.vy, q.vx), Math.min(2, sp / 180) * q.size, q.size, 0, 0, 0, Math.min(1, f * 2), q.c[0] * 2.6, q.c[1] * 2.6, q.c[2] * 2.6, 0); } }
  for (const f of flashes) { if (f.reg) quad(f.reg, f.x, f.y, f.rot, f.fs, f.fs, 0, 0, 0, f.life / f.max, 3.6, 2.3, 0.9, 0); else quad(R.muzzle, f.x, f.y, f.rot, f.big ? 1.7 : 1.1, f.big ? 1.5 : 1.1, 0, 0, 0, f.life / f.max, 3.4, 2.1, 0.8, 0); }
  for (const r of rings) { const t = 1 - r.life / r.max, k = 1 - (1 - t) * (1 - t), sc = lerp(r.r0, r.r1, k) / 58; quad(R.ring, r.x, r.y, 0, sc, sc, 0, 0, 0, (r.life / r.max) * r.w, r.c[0], r.c[1], r.c[2], 0); }
  for (const a of arcs) { const n = 7, f = a.life / 0.14; let px = a.x0, py = a.y0; const dx = a.x1 - a.x0, dy = a.y1 - a.y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L; for (let i = 1; i <= n; i++) { const t = i / n, j = i === n ? 0 : Math.sin(a.seed + i * 12.9 + time * 60) * 11, x = a.x0 + dx * t + nx * j, y = a.y0 + dy * t + ny * j; lineQ(px, py, x, y, 3, 0, 0, 0, f, 1.4, 2.6, 3.4, 0, R.pixel); lineQ(px, py, x, y, 10, 0, 0, 0, f * 0.5, 0.3, 0.7, 1, 0, R.glow); px = x; py = y; } }
  for (const c of crystals) { if (!c.alive || Math.sin(time * 5 + c.x) < 0.3) continue; quad(R.glow, c.x + 14, c.y - 18, 0, 0.25, 0.25, 0, 0, 0, 1, 0.3, 0.7, 0.9, 0); }
  for (const p of pollen) { const tw = 0.5 + Math.sin(time * 2 + p.ph) * 0.5; quad(R.glow, p.x, p.y, 0, p.s * 0.8, p.s * 0.8, 0, 0, 0, tw, 1.1, 0.5, 0.15, 0); }
  flush();
  // point lights (accents)
  ln = 0;
  for (const l of dlights) { const f = l.life / l.max; addLight(l.x, l.y, l.r * (0.6 + 0.4 * f), l.col[0] * f, l.col[1] * f, l.col[2] * f); }
  for (const L of lamps) { const k = lampK(L); if (k > 0.05) { if (L.lantern) addLight(L.hx, L.hy, 210, 1.0 * k, 0.66 * k, 0.32 * k); else addLight(L.hx, L.hy, 330, 1.05 * k, 0.8 * k, 0.5 * k); } }
  for (const r of roofs) if (ev !== 'blackout') addLight(r.x, r.y, 380, 0.9, 0.92, 0.95);
  objectiveLights(); decorLights(); atmosLights();
  for (const f of fires) { const fk = 0.8 + Math.sin(time * 17 + f.ph) * 0.12 + Math.sin(time * 7.3 + f.ph) * 0.08; addLight(f.x, f.y, 300 * fk, 1.25 * fk, 0.6 * fk, 0.2 * fk); }
  if (P && state !== 'over') { FLX = P.x + Math.cos(P.aimA) * 8; FLY = P.y + Math.sin(P.aimA) * 8; addLight(FLX, FLY, 620, 1.05, 1.0, 0.84, P.aimA, 0.86); addLight(P.x, P.y, 260, ev === 'fog' || ev === 'blackout' ? 0.46 : 0.32, ev === 'fog' || ev === 'blackout' ? 0.45 : 0.31, ev === 'fog' || ev === 'blackout' ? 0.43 : 0.3); }
  for (const e of enemies) if (e.type === 'queen') { if (e.giant && e.cueT > 0 && e.dying === undefined) { const G = GIANT[e.btype] || GIANT.roadkill, k = Math.sin(clamp(1 - e.cueT / e.cueMax, 0, 1) * Math.PI); addLight(e.x + Math.cos(e.a) * G.hx, e.y + Math.sin(e.a) * G.hx - 30, 120, 0.5 * k, 0.44 * k, 0.34 * k); } if (!e.giant) { const k = e.cueT > 0 && e.dying === undefined ? clamp(1 - e.cueT / e.cueMax, 0, 1) : 0, kk = Math.min(1, k * 1.4) * (0.85 + 0.15 * Math.sin(time * 40)); addLight(e.x, e.y, 300, 0.45 * (1 - kk), 0.08 * (1 - kk), 0.05 * (1 - kk)); if (kk > 0) addLight(e.x, e.y, 190 + 70 * k, 0.24 * kk, 0.7 * kk, 0.09 * kk); } /* the Abomination's tell: its sacs light up bile-green from inside as a move winds up */ else if (e.btype === 'grave' && e.dying === undefined && e.lant) { const fk = 0.85 + Math.sin(time * 9 + e.id) * 0.1, a = e.a; addLight(e.x + Math.sin(a) * 39, e.y - Math.cos(a) * 39, 210, 0.62 * fk, 0.34 * fk, 0.1 * fk); }
    else if (e.btype === 'chief' && e.dying === undefined) { addLight(e.x + Math.cos(e.a) * 110, e.y + Math.sin(e.a) * 110, 170, 0.5, 0.46, 0.36); if (e.ph >= 1) { const fk = 0.75 + Math.sin(time * 11 + e.id) * 0.15 + Math.sin(time * 4.3) * 0.1; addLight(e.x, e.y, 150 + 60 * e.ph, 0.45 * fk, 0.2 * fk, 0.05 * fk); } } // the helmet lamp throws a beam ahead of it; hurt, its coat smoulders
    else if (e.btype === 'pz' && e.dying === undefined) { const k = 0.65 + 0.35 * (e.hbP || 0); addLight(e.x, e.y, 250, 0.13 * k, 0.32 * k, 0.17 * k); } } // a sick green glow that pulses with the monitor
  for (const fp of firePools) { const k = Math.min(1, fp.life / 1.5) * (0.85 + Math.sin(time * 19 + fp.x) * 0.15); addLight(fp.x, fp.y, fp.r * 3, 0.85 * k, 0.38 * k, 0.1 * k); }
  { let nb = 0; for (const e of enemies) if (e.burn > 0 && nb < 12 && (e.sv ?? 1) > 0.3) { nb++; addLight(e.x, e.y, 140, 0.55, 0.24, 0.06); } }
  for (const c of cars) if (c.fire && !c.dead) addLight(c.x, c.y - 20, 280, 1.05, 0.46, 0.12);
  for (const c of crates) if (c.flare > 0) { const fk = Math.min(1, c.flare / 1.5) * (0.8 + Math.sin(time * 23 + c.x) * 0.12 + Math.sin(time * 9.1) * 0.08); addLight(c.x + 20, c.y + 12, 230, 1.15 * fk, 0.26 * fk, 0.16 * fk); }
  gl.bindFramebuffer(gl.FRAMEBUFFER, rtLight.fb); gl.viewport(0, 0, rtLight.w, rtLight.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.blendFunc(gl.ONE, gl.ONE); gl.useProgram(P_LIGHT.p); gl.uniform4f(P_LIGHT.u.uCam, camX, camY, viewW, viewH); gl.uniform1i(P_LIGHT.u.uNrm, 0); gl.uniform2f(P_LIGHT.u.uRes, rtLight.w, rtLight.h); WETV += ((ev === 'storm' ? 1 : 0.42) - WETV) * 0.02; gl.uniform1f(P_LIGHT.u.uWet, WETV);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rtScene.texs[2]);
  gl.uniform1i(P_LIGHT.u.uFsh, 1); gl.uniform2f(P_LIGHT.u.uFL, FLX, FLY); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, rtFlash.texs[0]); gl.activeTexture(gl.TEXTURE0);
  gl.bindVertexArray(lVAO); gl.bindBuffer(gl.ARRAY_BUFFER, lVBO); gl.bufferSubData(gl.ARRAY_BUFFER, 0, ldata, 0, ln * 8); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ln); gl.bindVertexArray(emptyVAO); gl.disable(gl.BLEND);
  // composite: sun + sky + shadows + specular
  gl.bindFramebuffer(gl.FRAMEBUFFER, rtComp.fb); gl.viewport(0, 0, RW, RH); gl.useProgram(P_COMP.p);
  ['uAlb', 'uEmi', 'uLight', 'uNrm', 'uShadow'].forEach((n, i) => gl.uniform1i(P_COMP.u[n], i));
  gl.uniform3f(P_COMP.u.uSun, NIGHT.sun[0], NIGHT.sun[1], NIGHT.sun[2]); gl.uniform3f(P_COMP.u.uSky, NIGHT.sky[0], NIGHT.sky[1], NIGHT.sky[2]);
  const Lv = [-0.48, -0.56, 0.68], ll = Math.hypot(...Lv); gl.uniform3f(P_COMP.u.uL, Lv[0] / ll, Lv[1] / ll, Lv[2] / ll); gl.uniform1f(P_COMP.u.uCav, gfxPreset().cav);
  [rtScene.texs[0], rtScene.texs[1], rtLight.texs[0], rtScene.texs[2], rtShadow.texs[0]].forEach((t, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t); });
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  // bloom
  gl.useProgram(P_DOWN.p); gl.uniform1i(P_DOWN.u.uSrc, 0); gl.activeTexture(gl.TEXTURE0);
  let src = rtComp, sw = RW, sh = RH;
  bloomRTs.forEach((rt, i) => { gl.bindFramebuffer(gl.FRAMEBUFFER, rt.fb); gl.viewport(0, 0, rt.w, rt.h); gl.bindTexture(gl.TEXTURE_2D, src.texs[0]); gl.uniform2f(P_DOWN.u.uTexel, 1 / sw, 1 / sh); gl.uniform1f(P_DOWN.u.uThresh, i === 0 ? (hasCBF ? 1.08 : 0.85) : -1); gl.drawArrays(gl.TRIANGLES, 0, 3); src = rt; sw = rt.w; sh = rt.h; });
  gl.useProgram(P_UP.p); gl.uniform1i(P_UP.u.uSrc, 0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  for (let i = bloomRTs.length - 1; i > 0; i--) { const from = bloomRTs[i], to = bloomRTs[i - 1]; gl.bindFramebuffer(gl.FRAMEBUFFER, to.fb); gl.viewport(0, 0, to.w, to.h); gl.bindTexture(gl.TEXTURE_2D, from.texs[0]); gl.uniform2f(P_UP.u.uTexel, 1 / from.w, 1 / from.h); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  gl.disable(gl.BLEND);
  // final
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, RW, RH); gl.useProgram(P_FINAL.p);
  gl.uniform1i(P_FINAL.u.uScene, 0); gl.uniform1i(P_FINAL.u.uBloom, 1);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rtComp.texs[0]); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, bloomRTs.length ? bloomRTs[0].texs[0] : rtComp.texs[0]);
  const wv = new Float32Array(32); let wn = 0;
  for (const w of dwaves) { if (wn >= 8) break; const t = w.t / w.life; wv[wn * 4] = (w.x - camX) / viewW; wv[wn * 4 + 1] = 1 - (w.y - camY) / viewH; wv[wn * 4 + 2] = t * w.sp * (viewW / 1400); wv[wn * 4 + 3] = w.s * (1 - t) * (opt.shake ? 1 : 0.4); wn++; }
  gl.uniform4fv(P_FINAL.u.uWaves, wv); gl.uniform1i(P_FINAL.u.uWaveN, wn); hazeCollect(); const hv = new Float32Array(24); hazeSrc.forEach((h, i) => { hv[i * 4] = (h[0] - camX) / viewW; hv[i * 4 + 1] = 1 - (h[1] - camY) / viewH; hv[i * 4 + 2] = h[2] / viewH; hv[i * 4 + 3] = h[3]; }); gl.uniform4fv(P_FINAL.u.uHaze, hv); gl.uniform1i(P_FINAL.u.uHazeN, hazeSrc.length); gl.uniform1f(P_FINAL.u.uAspect, VW / VH); gl.uniform1f(P_FINAL.u.uChroma, chroma);
  const hpR = state === 'play' ? P.hp / S.maxHp : 1;
  { const want = (state === 'play' || state === 'pause' || state === 'levelup') && opt.los && P ? 1 : 0, rdt = Math.min(0.1, (performance.now() - (render.lt || performance.now())) / 1000); render.lt = performance.now(); visOn += (want - visOn) * Math.min(1, (want ? 2.5 : 6) * rdt); gl.activeTexture(gl.TEXTURE2); if (visOn > 0.01) buildVis(); else visOn = want ? visOn : 0;
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texVis || rtComp.texs[0]); gl.uniform1i(P_FINAL.u.uVis, 2); gl.uniform1f(P_FINAL.u.uVisOn, texVis && visOn > 0.01 ? visOn : 0); gl.useProgram(P_FINAL.p); }
  gl.uniform1f(P_FINAL.u.uHurt, clamp((0.3 - hpR) * 1.2, 0, 0.3) + P.hurt * 1.2); gl.uniform1f(P_FINAL.u.uBloomK, gfxPreset().bloom); gl.uniform1f(P_FINAL.u.uTime, time); gl.uniform1f(P_FINAL.u.uGrain, opt.grain ? 0.045 : 0); gl.uniform2f(P_FINAL.u.uTexel, 1 / RW, 1 / RH); gl.uniform1f(P_FINAL.u.uSharpen, gfxPreset().sharpen); gl.uniform4f(P_FINAL.u.uWx, WXV[0], WXV[1], WXV[2], WXV[3]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  drawUI();
}

