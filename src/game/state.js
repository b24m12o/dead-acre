/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
/* =====================================================================
   State
   ===================================================================== */
let state = 'boot', S = {}, LV = {}, P = null;
let pools = [], gasClouds = [], mortars = [], warns = [], screenBlood = [], bangs = [], whiteFlash = 0, freshGraves = [];
let enemies = [], corpses = [], pbullets = [], ebullets = [], darts = [], buddies = [], pickups = [], parts = [], decals = [], barrels = [], arcs = [], flashes = [], dwaves = [], texts = [], ghosts = [], later = [], dlights = [], rings = [], butterflies = [], pollen = [], clouds = [];
let crates = [], hitDirs = [], slowmo = 0, runSeeds = 0, queenKills = 0, rerolls = 0, streakT = 0, pickSource = 'level';
let wave = 0, queue = [], spawnT = 0, interT = 0, score = 0, kills = 0, level = 1, xp = 0, xpNeed = 1, combo = 0, comboT = 0, trauma = 0, hitstop = 0, chroma = 0, time = 0, nid = 1, boss = null, bannerT = -1;
const cam = { x: 0, y: 0, vx: 0, vy: 0, lx: 0, ly: 0 };
let rec = { score: +(store.get('rr_best') || 0), wave: +(store.get('rr_wave') || 0) };
function resetStats() {
  const h = HEROES[RUN.hero] || HEROES.ranger, pk = PK();
  S = { dmg: 1, rate: 1, shots: 1, pierce: 0, bounce: 0, crit: 0.05, maxHp: h.hp, regen: 0, magnet: 120, speed: h.speed, dashCd: 1.3, darts: 0, pulse: 0, buddy: 0, arc: 0, frag: 0, leech: 0, weapon: h.spec || 'rifle', gun: GUNS[h.spec || 'rifle'].reg, muzzle: GUNS[h.spec || 'rifle'].muzzle, dartCd: 2.5, pulseCd: 4, buddyCd: 0.55, evo: {}, spreadK: 1, rangeK: 1, reloadK: 1, magK: 1, abCd: 1, abLv: 0, ammoK: 1 + 0.15 * (pk.magnet || 0) };
  S.maxHp += 10 * (pk.hp || 0); S.dmg *= 1 + 0.06 * (pk.dmg || 0); S.magnet *= 1 + 0.15 * (pk.magnet || 0);
  if (pk.molo) S.molo = 1;
  if (pk.laser) S.crit += 0.06; if (pk.drum) S.magK *= 1.25; if (pk.ap) S.pierce += 1; S.spreadMul = pk.comp ? 0.7 : 1;
  
  if (TW('glass')) { S.maxHp = Math.round(S.maxHp * 0.5); S.dmg *= 1.5; }
  rerolls = pk.reroll || 0; LV = {};
}
const gd = () => S.dmg * 10;
const magSize = g => Math.round(GUNS[g].mag * S.magK);
const ammoMax = t => Math.floor(AMMO_MAX[t] * S.ammoK);
function heroGun(g) {
  const sp = (HEROES[RUN.hero] || HEROES.ranger).spec, f = GUNS[g].fam;
  if (sp !== f) return { dmg: 1, rate: 1, pellets: 0, pierce: 0 };
  return f === 'rifle' ? { dmg: 1.2, rate: 1, pellets: 0, pierce: 0 } : f === 'shotgun' ? { dmg: 1.2, rate: 1, pellets: 1, pierce: 0 } : { dmg: 1.25, rate: g === 'pistol' ? 1.4 : 1.15, pellets: 0, pierce: 1 };
}
function armGuns(p) {
  p.owned = ['pistol']; p.reload = 0; p.reloadMax = 1; p.swap = 0;
  p.mag = { pistol: magSize('pistol') }; p.ammo = { light: 0, shells: 0, rifle: 0, heavy: 0, gren: 0 };
  equip('pistol', true);
}
function hasAmmo(g) { const G = GUNS[g]; return !G.ammo || P.mag[g] > 0 || P.ammo[G.ammo] > 0; }
function equip(g, silent) { const p = P; if (p.gun && p.gun !== g) p.lastGun = p.gun; p.gun = g; p.reload = 0; p.pumpT = p.rackT = 0; S.weapon = g; S.gun = GUNS[g].reg; S.muzzle = GUNS[g].muzzle; if (!silent) { p.swap = 0.3; sfx.swap(); } }
function switchGun(g) { if (!P || state !== 'play' || !g || P.gun === g || !P.owned.includes(g)) return; if (!hasAmmo(g)) { floatText(P.x, P.y - 40, `No ammo for the ${GUNS[g].name.toLowerCase()}`, '#ffb08a', 15); sfx.dry(); return; } P.forced = false; equip(g); }
const WHEEL = { open: false, held: null, downT: 0, sel: -1 };
function quickSwap() { const g = P.lastGun; if (g && g !== P.gun && P.owned.includes(g) && hasAmmo(g)) switchGun(g); else cycleGun(1); } // a tap: back to the gun you had before
function wheelGeom() { const n = P.owned.length, k = TS(); ui.font = `700 ${12 * k}px "JetBrains Mono", monospace`; const need = Math.max(...P.owned.map(g => ui.measureText(GUNS[g].name).width)) + 48 * k, ch = 2 * Math.sin(Math.PI / Math.max(n, 3)) * 0.92, R0 = Math.min(Math.max(clamp(n * 26, 110, 215) * k, need / ch), VH * 0.42), sw = Math.max(Math.min(136 * k, R0 * ch), Math.min(need, R0 * ch)), sh = 44 * k; /* every slot wide enough for the full name; the ring grows to make room */ const px = (P.x - camX) * ZOOM, py = (P.y - camY) * ZOOM; return { n, R0, sw, sh, cx: clamp(px, R0 + sw / 2 + 12, VW - R0 - sw / 2 - 12), cy: clamp(py, R0 + sh / 2 + 64 * k, VH - R0 - sh / 2 - 66 * k) }; /* clear of the night plate on top and the level bar below */ }
function wheelTick() { // opens after a short hold; while open the stick or the mouse picks the slot it points at
  if (WHEEL.held && state !== 'play') { WHEEL.held = null; WHEEL.open = false; }
  if (WHEEL.held && !WHEEL.open && performance.now() - WHEEL.downT > 170 && P && P.owned.length > 1) { WHEEL.open = true; WHEEL.sel = -1; sfx.swap(); }
  if (!WHEEL.open) return; const W = wheelGeom(); let dx, dy;
  dx = mouse.x - W.cx; dy = mouse.y - W.cy; if (Math.hypot(dx, dy) < 34 * TS()) { WHEEL.sel = -1; return; }
  const a = Math.atan2(dy, dx); let best = -1, bd = 9; for (let i = 0; i < W.n; i++) { const d = Math.abs(angDiff(a, -Math.PI / 2 + i * TAU / W.n)); if (d < bd) { bd = d; best = i; } } if (best !== WHEEL.sel) { WHEEL.sel = best; if (thr('wtick', 40)) tone(1400, 0.03, 'sine', 0.03); }
}
function wheelRelease() { const was = WHEEL.open, sel = WHEEL.sel; WHEEL.held = null; WHEEL.open = false; if (state !== 'play' || !P) return; if (!was) { quickSwap(); return; } if (sel >= 0 && P.owned[sel] && P.owned[sel] !== P.gun) switchGun(P.owned[sel]); }
function drawWheel() { // the guns in a ring around you: number key, name, rounds; empty ones are greyed and can't be picked
  if (!WHEEL.open || !P) return; const W = wheelGeom(), k = TS();
  ui.fillStyle = 'rgba(8,10,14,0.42)'; ui.fillRect(0, 0, VW, VH);
  const rr = (x, y, w, h, r) => { ui.beginPath(); ui.moveTo(x + r, y); ui.arcTo(x + w, y, x + w, y + h, r); ui.arcTo(x + w, y + h, x, y + h, r); ui.arcTo(x, y + h, x, y, r); ui.arcTo(x, y, x + w, y, r); ui.closePath(); };
  ui.textBaseline = 'middle';
  for (let i = 0; i < W.n; i++) { const g = P.owned[i], G = GUNS[g], a = -Math.PI / 2 + i * TAU / W.n, x = W.cx + Math.cos(a) * W.R0 - W.sw / 2, y = W.cy + Math.sin(a) * W.R0 - W.sh / 2, ok = hasAmmo(g), on = i === WHEEL.sel, cur = g === P.gun;
    rr(x, y, W.sw, W.sh, 7 * k); ui.fillStyle = on && ok ? 'rgba(255,150,60,0.9)' : on ? 'rgba(90,90,96,0.92)' : 'rgba(22,26,32,0.9)'; ui.fill(); ui.lineWidth = 1.5; ui.strokeStyle = cur ? 'rgba(255,190,110,0.95)' : 'rgba(255,255,255,0.12)'; ui.stroke();
    ui.globalAlpha = ok ? 1 : 0.45; const bx = x + 8 * k, by = y + W.sh / 2; rr(bx, by - 9 * k, 18 * k, 18 * k, 4 * k); ui.fillStyle = on && ok ? 'rgba(30,18,8,0.35)' : 'rgba(255,255,255,0.13)'; ui.fill();
    ui.textAlign = 'center'; ui.font = `600 ${11 * k}px "JetBrains Mono", monospace`; ui.fillStyle = on && ok ? '#24140a' : '#f2ead8'; ui.fillText(i < 9 ? String(i + 1) : '·', bx + 9 * k, by + 0.5);
    ui.textAlign = 'left'; const tx = bx + 24 * k, tw = x + W.sw - 8 * k - tx; let nm = G.name; ui.font = `700 ${12 * k}px "JetBrains Mono", monospace`; while (nm.length > 3 && ui.measureText(nm).width > tw) nm = nm.slice(0, -2) + '…'; ui.fillText(nm, tx, by - 8 * k);
    ui.font = `500 ${10.5 * k}px "JetBrains Mono", monospace`; ui.fillStyle = on && ok ? 'rgba(36,20,10,0.85)' : 'rgba(242,234,216,0.62)'; const am = !ok ? 'No ammo' : G.ammo ? `${Math.floor(P.mag[g] ?? 0)} · ${Math.floor(P.ammo[G.ammo] || 0)}` : `${Math.floor(P.mag[g] ?? 0)} · ∞`; ui.fillText(am, tx, by + 8 * k); ui.globalAlpha = 1; }
  ui.textAlign = 'center'; ui.font = `600 ${11 * k}px "JetBrains Mono", monospace`; ui.fillStyle = 'rgba(242,234,216,0.75)'; const sg = WHEEL.sel >= 0 ? P.owned[WHEEL.sel] : null; const key = 'Q', cn = GUNS[P.gun].name, lb = sg ? (sg === P.gun ? `${cn} · already in your hands` : hasAmmo(sg) ? `Release ${key} · draw the ${GUNS[sg].name}` : `${GUNS[sg].name} · no ammo`) : `Holding the ${cn} · ${WHEEL.held === 'pad' ? 'point the right stick' : 'point at a gun'}`, /* the caption always names the gun it means */ lw = ui.measureText(lb).width + 16 * k, ly = W.cy + W.R0 + W.sh / 2 + 18 * k; rr(W.cx - lw / 2, ly - 11 * k, lw, 22 * k, 11 * k); ui.fillStyle = 'rgba(14,16,20,0.85)'; ui.fill(); ui.fillStyle = 'rgba(242,234,216,0.85)'; ui.fillText(lb, W.cx, ly); ui.textAlign = 'left'; /* below the ring: never over a slot or over you */
}
function cycleGun(d = 1) { if (!P || state !== 'play') return; const o = P.owned; let i = o.indexOf(P.gun); for (let k = 0; k < o.length; k++) { i = (i + d + o.length) % o.length; if (hasAmmo(o[i])) { P.forced = false; if (o[i] !== P.gun) equip(o[i]); return; } } }
function bestGun() { let best = null, bi = -1; for (const g of P.owned) if (g !== 'launcher' && g !== 'pistol' && hasAmmo(g) && GUN_ORDER.indexOf(g) > bi) { bi = GUN_ORDER.indexOf(g); best = g; } return best || (hasAmmo('launcher') && P.owned.includes('launcher') ? 'launcher' : 'pistol'); } // never the grenade launcher when anything else has rounds
function startReload() {
  const p = P, g = p.gun, G = GUNS[g], n = magSize(g);
  if (p.reload > 0 || p.swap > 0 || p.mag[g] >= n) return;
  if (G.ammo && p.ammo[G.ammo] <= 0) { if (p.mag[g] <= 0) { tip('dry'); floatText(p.x, p.y - 40, 'Out of ammo', '#ffb08a', 16); sfx.dry(); later.push({ t: 0.25, fn: () => { if (P && P.gun === g && P.mag[g] <= 0) { equip(bestGun()); P.forced = true; } } }); } return; }
  p.reload = p.reloadMax = G.reload; p.trigFresh = false; if (RUN && RUN.metrics) RUN.metrics.reloads++; if (!G.perShell) { sfx.magOut(); const cc = Math.cos(p.aimA), ss = Math.sin(p.aimA), big = g === 'lmg' ? 1.5 : g === 'pistol' ? 0.8 : 1.1; part({ k: 12, reg: R.mag, x: p.x + cc * 10, y: p.y + ss * 10, z: 14, vz: rand(10, 40), vx: cc * rand(10, 30) + rand(-15, 15), vy: ss * rand(10, 30) + rand(-15, 15), life: 1.2, max: 1.2, size: big, rot: p.aimA + rand(-0.5, 0.5), vr: rand(-6, 6), drag: 4, c: [1, 1, 1] }); }
}
function ammoRoomK() { const ts = new Set(P.owned.map(g => GUNS[g].ammo).filter(Boolean)); if (!ts.size) return 9; let best = 0; for (const t of ts) best = Math.max(best, (ammoMax(t) - P.ammo[t]) / Math.max(1, AMMO_BOX[t])); return best; } // in boxes: how much the emptiest type could take
function ammoFull() { const ts = new Set(P.owned.map(g => GUNS[g].ammo).filter(Boolean)); if (!ts.size) return false; for (const t of ts) if (P.ammo[t] < ammoMax(t)) return false; return true; }
// ammo boxes carry one calibre. Which one is decided when it drops: mostly what you are short of, with a lean toward the gun in your hands.
// Drops also thin out while you are well stocked. Supply crates and objectives still refill everything (addAmmo).
const AMMO_NAME = { light: '9mm', shells: '12-gauge', rifle: '5.56', heavy: 'heavy rifle', gren: '40mm' };
function ammoTypes() { return P ? [...new Set(P.owned.map(g => GUNS[g].ammo).filter(Boolean))] : []; }
function ammoFill(t) { return P.ammo[t] / Math.max(1, ammoMax(t)); }
function ammoNeed() { const ts = ammoTypes(); if (!ts.length) return 1; const avg = ts.reduce((a, t) => a + ammoFill(t), 0) / ts.length, held = GUNS[P.gun].ammo, hf = held ? ammoFill(held) : avg; return clamp(1.35 - (avg + hf) / 2, 0.3, 1); } // 1 = running low, 0.3 = well stocked
function pickAmmoKind() { const ts = ammoTypes(); if (!ts.length) return null; const held = GUNS[P.gun].ammo; let tw = 0; const w = ts.map(t => { const v = (0.08 + Math.pow(1 - ammoFill(t), 1.5) + (t === held ? 0.5 : 0)) * (t === 'gren' ? 0.45 : 1); tw += v; return v; /* grenades turn up less often */ }); let r = Math.random() * tw; for (let i = 0; i < ts.length; i++) { r -= w[i]; if (r <= 0) return ts[i]; } return ts[ts.length - 1]; }
function dropAmmo(x, y, v, spd = 80) { pickups.push({ k: 'ammo', at: pickAmmoKind(), v, x, y, vx: rand(-spd, spd), vy: rand(-spd, spd), t: 0 }); }
function ammoRoomFor(k) { return k.at ? (ammoMax(k.at) - P.ammo[k.at]) / Math.max(1, AMMO_BOX[k.at] * 1.5) : ammoRoomK(); } // in boxes
function addAmmoType(t, k) { tip('ammo'); const p = P, n = Math.max(0, Math.min(ammoMax(t) - p.ammo[t], Math.round(AMMO_BOX[t] * k * 1.5))); p.ammo[t] = Math.floor(p.ammo[t] + n); const cur = GUNS[p.gun] && GUNS[p.gun].ammo === t, og = cur ? null : p.owned.find(g => GUNS[g].ammo === t); floatText(p.x, p.y - 40, `+${n} ${AMMO_NAME[t] || 'ammo'}` + (og && n > 0 ? ` · ${GUNS[og].name} on ${p.owned.indexOf(og) + 1}` : ''), '#ffd08a', 17); p.forced = false; sfx.ammo(); } /* never swaps your gun for you: it says which gun the rounds are for, and tapping Q gets you back to it */
function addAmmo(k) {
  const p = P, types = new Set(p.owned.map(g => GUNS[g].ammo).filter(Boolean));
  for (const t of types) p.ammo[t] = Math.floor(Math.min(ammoMax(t), p.ammo[t] + Math.round(AMMO_BOX[t] * k)));
  floatText(p.x, p.y - 40, types.size ? '+ammo' : '+scrap', '#ffd08a', 17); p.forced = false; if (!types.size) runSeeds += 1; sfx.ammo();
}
function giveGun(g) {
  const p = P, G = GUNS[g];
  if (!p.owned.includes(g)) { p.owned.push(g); if (p.owned.length === 3) later.push({ t: 2.5, fn: () => tip('wheel') }); /* new guns join the end of the row, so the number keys you know never move */ p.mag[g] = magSize(g); }
  if (G.ammo) p.ammo[G.ammo] = Math.floor(Math.min(ammoMax(G.ammo), p.ammo[G.ammo] + G.give));
  equip(g); showStreak(G.name, `New weapon · key ${p.owned.indexOf(g) + 1}`); sfx.elite(); sfx.pump();
}
