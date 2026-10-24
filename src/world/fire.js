/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
let firePools = [], molos = [], carAt = new Int16Array(1);
function hotSpots(o, n, w, h) { if (!o.hs) { o.hs = []; for (let i = 0; i < n; i++) o.hs.push([rand(0.2, 0.8), rand(0.25, 0.75), rand(0.7, 1.2)]); } return o.hs; } // where a fire actually burns: a few fixed seats, not the whole area at once
function fireBeds() { // under each fire, a bed of embers that glows and flickers; the flames stand on it
  const bed = (x, y, r, k) => { const fk = k * (0.8 + Math.sin(time * 9 + x * 0.3) * 0.12 + Math.sin(time * 23 + y) * 0.08); quad(R.glow, x, y, 0, r / 26, r / 34, 0, 0, 0, 0.7 * fk, 0.9, 0.26, 0.04, 0); quad(R.glow, x, y, 0, r / 60, r / 76, 0, 0, 0, 0.9 * fk, 1.5, 0.72, 0.2, 0); };
  for (const o of houses) if (o.burning) for (const [u, v, k] of hotSpots(o, 3)) bed((o.x + u * o.w) * TILE, (o.y + v * o.h) * TILE - 32, 30 * k, 0.9);
  for (const c of cars) if (c.fire && !c.dead) for (const [u, , k] of hotSpots(c, 2)) { const d = (u - 0.5) * 60; bed(c.x + Math.cos(c.a) * d, c.y + Math.sin(c.a) * d - 8, 15 * k, 1); }
  for (const fp of firePools) bed(fp.x, fp.y, fp.r * 0.9, Math.min(1, fp.life / 1.5));
  for (const f of fires) bed(f.x, f.y - 14, 18, 0.9);
}
function ember(x, y) { part({ k: 1, x: x + rand(-6, 6), y, vx: rand(-25, 25) + WINDX * 0.5, vy: rand(-110, -50), life: rand(0.7, 1.5), max: 1.5, size: rand(0.35, 0.6), drag: 0.7, c: [1, rand(0.4, 0.6), 0.15] }); } // a spark carried up off the fire
function flame(x, y, n = 1, spread = 6, size = 1) { if (size > 0.9 && Math.random() < 0.12 * size) ember(x, y - 10 * size); for (let i = 0; i < n; i++) part({ k: 10, x: x + rand(-spread, spread), y: y + rand(-spread, spread), vx: rand(-14, 14), vy: rand(-55, -20), life: rand(0.35, 0.7), max: 0.7, size: rand(0.22, 0.42) * size, drag: 1 }); }
function smoke(x, y, n, R0 = 60, dark = false) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(5, R0 * (dark ? 1 : 0.6)), g = dark ? rand(0.2, 0.26) : 0.24; part({ k: 2, x: x + rand(-8, 8) + Math.cos(a) * (dark ? R0 * 0.3 : 0), y: y + rand(-8, 8) + Math.sin(a) * (dark ? R0 * 0.3 : 0), vx: Math.cos(a) * s * 0.4, vy: Math.sin(a) * s * 0.4 - rand(10, 30), life: rand(1.6, 3.2) * (dark ? 1.3 : 1), max: 3.2 * (dark ? 1.3 : 1), size: rand(0.8, 1.4) * Math.max(0.6, R0 / 70) * (dark ? 1.25 : 1), grow: rand(1, 1.8), rot: rand(0, TAU), vr: rand(-0.6, 0.6), drag: 0.9, c: [g, g * 0.95, g * 0.9], wind: 0.8 }); } }
function fireball(x, y, R0) { // a rolling ball of flame: billowing puffs that cool from yellow to orange to dull red, a few licking tongues on top
  for (let i = 0; i < 18; i++) { const a = rand(0, TAU), s = rand(20, R0 * 1.5); part({ k: 13, x: x + Math.cos(a) * R0 * 0.2, y: y + Math.sin(a) * R0 * 0.2, vx: Math.cos(a) * s, vy: Math.sin(a) * s - rand(10, 40), life: rand(0.4, 0.85), max: 0.85, size: rand(0.8, 1.3) * R0 / 45, rot: rand(0, TAU), vr: rand(-2, 2), drag: 4 }); }
  for (let i = 0; i < 10; i++) { const a = rand(0, TAU), s = rand(10, R0 * 0.9); part({ k: 13, x: x + Math.cos(a) * R0 * 0.1, y: y + Math.sin(a) * R0 * 0.1, vx: Math.cos(a) * s, vy: Math.sin(a) * s - rand(30, 70), life: rand(0.55, 1.0), max: 1.0, size: rand(1.1, 1.6) * R0 / 45, rot: rand(0, TAU), vr: rand(-2, 2), drag: 3 }); } // the inner billows rise and roll, rather than flying out in a star
  later.push({ t: 0.18, fn: () => flame(x, y, 5, R0 * 0.3, R0 / 40) });
}
function ignite(e, t = 3) { if (e.dead || e.fireproof || e.type === 'queen' && t < 2) return; if (!(e.burn > 0)) e.burnT = 0.1; e.burn = Math.max(e.burn || 0, t); }
function firePool(x, y, r, life) { firePools.push({ x, y, r, life, max: life }); decal(R.scorch, x, y, r / 50, [1, 1, 1, 0.9], [0, 0, 0], 50); }
function buildCarMap() {
  carAt = new Int16Array(MW * MH).fill(-1);
  cars.forEach((c, i) => { c.hp = c.max = c.truck ? 520 : 320; c.dead = false; c.fire = 0; c.hasAlarm = !c.burnt && !c.police && Math.random() < 0.6; c.alarm = 0; c.alarmUsed = false; });
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) if (ttype[ty * MW + tx] === 6) { let best = -1, bd = 1e9; cars.forEach((c, i) => { const d = d2(c.x, c.y, (tx + 0.5) * TILE, (ty + 0.5) * TILE); if (d < bd) { bd = d; best = i; } }); carAt[ty * MW + tx] = best; }
}
function hitCar(tx, ty, dmg, x, y) { const i = carAt[ty * MW + tx]; if (i >= 0) { const c = cars[i]; if (x !== undefined && !c.dead && !c.burnt) { c.holes = c.holes || []; if (c.holes.length > 14) c.holes.shift(); const dx = x - c.x, dy = y - c.y, ca = Math.cos(-c.a), sa = Math.sin(-c.a); c.holes.push({ u: clamp(dx * ca - dy * sa, -30, 30), v: clamp(dx * sa + dy * ca, -14, 14), r: rand(0, TAU) }); } damageCar(c, dmg); } }
function damageCar(c, dmg) {
  if (!c || c.dead || state !== 'play') return; c.hp -= dmg; if (c.hasAlarm && !c.alarmUsed && !c.burnt) startAlarm(c);
  if (c.hp < c.max * 0.3 && !c.fire) { c.fire = 1; floatText(c.x, c.y - 30, 'It\'s going to blow!', '#ffb070', 15); }
  if (c.hp <= 0) blowCar(c);
}
function blowCar(c) {
  c.dead = true; c.fire = 0; bump('cars');
  explode(c.x, c.y, c.truck ? 150 : 125, 90 + wave * 12, true); firePool(c.x, c.y, c.truck ? 95 : 75, 7);
  wrecks.push({ x: c.x, y: c.y, a: c.a, s: c.truck ? 1.5 : 1 }); shake(0.6); hitstop = Math.max(hitstop, 0.05);
  for (let i = 0; i < 10; i++) chips(c.x, c.y, 1, [0.25, 0.25, 0.27], 3, 520); smoke(c.x, c.y, 14, 120);
}
let wrecks = [];
let fireG = null, fireP = null;
function fireAudio(dt) { /* fire you can hear: a low roar that swells and pans as you near it, and crackles popping off the flames */
  if (!AC || !noiseBuf || !sfxBus) return; const t0 = AC.currentTime;
  if (state !== 'play' || !P) { if (fireG) fireG.gain.setTargetAtTime(0, t0, 0.3); return; }
  let I = 0, fx = 0, fy = 0, best = 1e9; const near = (x, y, k) => { const d = Math.hypot(x - P.x, y - P.y); if (d > 560) return; I += k * clamp(1 - d / 560, 0, 1); if (d < best) { best = d; fx = x; fy = y; } };
  for (const f of fires) near(f.x, f.y, 0.5); for (const fp of firePools) near(fp.x, fp.y, 0.7 * Math.min(1, fp.life / 1.5) * Math.min(1.6, fp.r / 50)); for (let i = 0; i < grassFire.length; i += 4) near(grassFire[i].x, grassFire[i].y, 0.3); for (const c of cars) if (c.fire && !c.dead) near(c.x, c.y, 1);
  I = Math.min(1.4, I);
  if (!fireG) { const sr = AC.createBufferSource(); sr.buffer = noiseBuf; sr.loop = true; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.7; fireG = AC.createGain(); fireG.gain.value = 0; sr.connect(lp); lp.connect(fireG); let out = fireG; if (AC.createStereoPanner) { fireP = AC.createStereoPanner(); fireG.connect(fireP); out = fireP; } out.connect(sfxBus); sr.start(); }
  fireG.gain.setTargetAtTime(0.2 * I, t0, 0.25); if (fireP && I > 0) fireP.pan.setTargetAtTime(clamp((fx - P.x) / (viewW * 0.55), -0.8, 0.8), t0, 0.2);
  if (I > 0.03 && Math.random() < dt * 24 * I) { const b = spat(fx + rand(-30, 30), fy + rand(-30, 30)); noise(rand(0.004, 0.016), rand(0.15, 0.4) * Math.min(1, I + 0.2), rand(2500, 6500), rand(1200, 3000), 'bandpass', 0, b); if (Math.random() < 0.22) noise(0.05, 0.14 * Math.min(1, I), 900, 300, 'bandpass', 0.01, b); }
}
function updateFire(dt) {
  fireAudio(dt);
  for (const f of fires) if (Math.abs(f.x - cam.x - viewW / 2) < viewW && Math.abs(f.y - cam.y - viewH / 2) < viewH && Math.random() < dt * 26) { flame(f.x, f.y - 20, 1, 5, 1.15); if (Math.random() < 0.15) part({ k: 2, x: f.x + rand(-4, 4), y: f.y - 34, vx: rand(-6, 6), vy: rand(-30, -16), life: rand(2, 3.4), max: 3.4, size: rand(0.5, 0.8), grow: 1.6, drag: 0.5, rot: rand(0, TAU), vr: rand(-0.6, 0.6), c: [0.2, 0.19, 0.18], wind: 1 }); }
  for (const c of cars) {
    if (c.dead) continue;
    const near = Math.abs(c.x - cam.x - viewW / 2) < viewW && Math.abs(c.y - cam.y - viewH / 2) < viewH;
    if (c.hp < c.max * 0.6 && near && Math.random() < dt * (c.fire ? 15 : 3)) smoke(c.x + Math.cos(c.a) * 22 + rand(-8, 8), c.y + Math.sin(c.a) * 22, 1, c.fire ? 85 : 50, !!c.fire); // a burning car pours out thick black smoke
    if (c.fire) { if (near) for (const [u, , k] of hotSpots(c, 2)) if (Math.random() < dt * 36 * k) { const d = (u - 0.5) * 60 + rand(-10, 10); flame(c.x + Math.cos(c.a) * d, c.y + Math.sin(c.a) * d - 8, 1, 11 * k, rand(1.2, 1.7) * k); } /* many smaller tongues licking out of the car, not one sheet */ if (state === 'play') { c.hp -= dt * c.max * 0.12; if (c.hp <= 0) blowCar(c); } }
  }
  for (const w of wrecks) { w.sm = (w.sm ?? 30) - dt; if (w.sm > 0 && Math.abs(w.x - cam.x - viewW / 2) < viewW && Math.abs(w.y - cam.y - viewH / 2) < viewH && Math.random() < dt * 6 * (w.sm / 30)) smoke(w.x + rand(-14, 14), w.y + rand(-8, 8), 1, 75); } // wrecks smoulder for half a minute
  for (const fp of firePools) {
    fp.life -= dt; const k = Math.min(1, fp.life / 1.5);
    const area = fp.r * fp.r / 2500, onS = Math.abs(fp.x - cam.x - viewW / 2) < viewW && Math.abs(fp.y - cam.y - viewH / 2) < viewH; if (onS && Math.random() < dt * 34 * area * k) { const a = rand(0, TAU), d = Math.sqrt(Math.random()) * fp.r * 0.9; flame(fp.x + Math.cos(a) * d, fp.y + Math.sin(a) * d, 1, 4, rand(0.9, 1.5) * (1 - d / fp.r * 0.4)); } if (onS && Math.random() < dt * 2.5 * area * k) smoke(fp.x + rand(-fp.r, fp.r) * 0.5, fp.y - 20, 1, 70, true); // more tongues, taller in the middle, and the oily smoke a fuel fire throws up
    if (state !== 'play') continue;
    query(fp.x, fp.y, fp.r + 30, e => { if (!e.dead && e.z < 12 && d2(e.x, e.y, fp.x, fp.y) < (fp.r + e.r * 0.5) ** 2) ignite(e, 2.6); });
    if (P.inv <= 0 && d2(P.x, P.y, fp.x, fp.y) < (fp.r * 0.8) ** 2) { hurtPlayer(5 + wave * 0.4, undefined, undefined, 'fire'); floatText(P.x, P.y - 40, 'Burning!', '#ffb070', 14); }
  }
  firePools = firePools.filter(f => f.life > 0);
  for (const m of molos) {
    m.t += dt; const k = Math.min(1, m.t / m.dur); m.x = lerp(m.x0, m.tx, k); m.y = lerp(m.y0, m.ty, k); m.z = Math.sin(k * Math.PI) * (40 + m.dur * 120); m.spin += dt * 16;
    if (Math.random() < 0.6) flame(m.x, m.y - m.z, 1, 2, 0.5);
    if (k >= 1) { m.done = true; firePool(m.tx, m.ty, m.r, 4.5); fireball(m.tx, m.ty, 50); flashLight(m.tx, m.ty, 260, [1.6, 0.8, 0.25], 0.3); sfx.molotov(); query(m.tx, m.ty, m.r + 40, e => { if (!e.dead && d2(e.x, e.y, m.tx, m.ty) < (m.r + e.r) ** 2) { ignite(e, 4); hurtEnemy(e, 15 + wave, false, e.x - m.tx, e.y - m.ty, 0.5, 'fire'); } }); }
  }
  molos = molos.filter(m => !m.done);
}
function throwMolotov(p) {
  let best = null, bn = 0;
  query(p.x, p.y, 470, e => { if (e.dead || e.emerge < 1 || d2(e.x, e.y, p.x, p.y) < 90 * 90) return; let n = 0; query(e.x, e.y, 95, o => { if (!o.dead && d2(o.x, o.y, e.x, e.y) < 95 * 95) n++; }); if (n > bn) { bn = n; best = e; } });
  if (!best) return false;
  const d = Math.hypot(best.x - p.x, best.y - p.y);
  molos.push({ x0: p.x, y0: p.y, x: p.x, y: p.y, tx: best.x + best.vx * 0.3, ty: best.y + best.vy * 0.3, t: 0, dur: clamp(d / 520, 0.35, 0.9), z: 0, spin: 0, r: 62 + 16 * S.molo });
  sfx.swap(); return true;
}
function burnTick(e, dt) {
  if (!(e.burn > 0)) return;
  e.burn -= dt; e.burnT -= dt;
  if (Math.random() < dt * 22) flame(e.x + rand(-e.r * 0.5, e.r * 0.5), e.y - e.z + rand(-e.r * 0.5, e.r * 0.3), 1, 3, e.r / 14);
  if (e.burnT <= 0) { e.burnT = 0.3; hurtEnemy(e, (5 + wave * 0.9) * (e.type === 'queen' ? 2 : 1), false, 0, 0, 0, 'fire', e.x, e.y); if (!e.dead && Math.random() < (S.evo.tempest ? 0.35 : 0.25)) query(e.x, e.y, e.r + 30, o => { if (o !== e && !o.dead && d2(o.x, o.y, e.x, e.y) < (o.r + e.r + 6) ** 2) ignite(o, 2); }); }
}

