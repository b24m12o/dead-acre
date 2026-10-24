/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
let nightLive = false, obj = null, ev = null, evac = null, nightHit = false, nightDone = false, rain = [], lightning = 0, lightT = 0, heliSnd = null;
// buddies can be hurt: contact with the dead hurts them (less than you), they patch up when it is quiet, and at zero they go down
// a downed buddy bleeds out in 12 s unless you stand next to them for 1.5 s; bled out, they are gone and the Backup card can be offered again
const BUD_NAMES = ['Dale', 'Rhonda', 'Marcus', 'Ellie', 'Tomas', 'Jess', 'Hank', 'Carmen', 'Wes', 'Priya', 'Ray', 'Nadia', 'Lou', 'Trish', 'Bo', 'Maria'];
const TRAITS = { // each backup brings one thing: you learn who they are by what they do
  medic: { name: 'Medic', desc: 'Patches you and the others up while close, and keeps the downed alive longer', gun: 'pistol' },
  marksman: { name: 'Marksman', desc: 'A rifle: slow, heavy shots from long range', gun: 'rifle' },
  scav: { name: 'Scavenger', desc: 'Turns up spare rounds, and a medkit when you are hurt', gun: 'pistol' },
  cop: { name: 'Ex-cop', desc: 'A shotgun that knocks them flat, and a thicker skin', gun: 'shotgun' }
};
function rollBud() { const free = Object.keys(TRAITS).filter(t => !buddies.some(b => b.tr === t)), used = ['Dr. Hale'].concat(buddies.map(b => b.nm), RUN.lost || [], (RUN.aboard || []).map(b => b.nm)); return { nm: pick(BUD_NAMES.filter(n => !used.includes(n))) || pick(BUD_NAMES), tr: pick(free.length ? free : Object.keys(TRAITS)) }; }
const budMax = b => (100 + 12 * Math.max(1, wave)) * (b.tr === 'cop' ? 1.4 : 1);
function budSetup(b, r) { b.nm = r.nm; b.tr = r.tr; b.gun = TRAITS[r.tr].gun; b.max = Math.max(b.max, budMax(b)); b.hp = b.max; }
function budPerk(s, dt, pd) { // what the trait does, every frame the survivor is on their feet
  if (s.tr === 'medic') { if (pd < 180 && P.hp > 0 && P.hp < S.maxHp) P.hp = Math.min(S.maxHp, P.hp + 2 * dt); for (const b of buddies) if (b !== s && !(b.down > 0) && b.hp < b.max && d2(b.x, b.y, s.x, s.y) < 180 * 180) b.hp = Math.min(b.max, b.hp + 3 * dt); }
  if (s.tr === 'scav' && nightLive && !nightDone && !evac) { s.scT = (s.scT ?? 22) - dt; if (s.scT <= 0) { s.scT = 28; const ts = ammoTypes().sort((a, b) => ammoFill(a) - ammoFill(b)); if (P.hp < S.maxHp * 0.6 && !TW('nomeds') && Math.random() < 0.35) { pickups.push({ k: 'hp', v: 20, x: s.x, y: s.y, vx: rand(-60, 60), vy: rand(-60, 60), t: 0 }); floatText(s.x, s.y - 40, `${s.nm} found a medkit`, '#8ef0b8', 14); } else if (ts.length && ammoFill(ts[0]) < 0.95) { pickups.push({ k: 'ammo', at: ts[0], v: 1, x: s.x, y: s.y, vx: rand(-60, 60), vy: rand(-60, 60), t: 0 }); floatText(s.x, s.y - 40, `${s.nm} found rounds`, '#ffd08a', 14); } else s.scT = 6; } }
}
function buddyShoot(s, dt, slow) { s.cd -= dt / (slow || 1); const mm = s.tr === 'marksman', cop = s.tr === 'cop', rng = mm ? 600 : cop ? 300 : 420; let tgt = null, bd = rng * rng * (mm ? 4 : 1); query(s.x, s.y, rng, e => { if (e.dead || e.emerge < 1) return; let dd = d2(s.x, s.y, e.x, e.y); if (dd > rng * rng) return; if (e.lure && e.lure.alarm > 0 && dd > 200 * 200) return; /* leave the ones pounding on a car alone: that bait is yours */ if (mm) dd /= (e.elite ? 4 : 1) * (e.maxHp > 150 ? 2 : 1); /* the marksman picks the big ones */ if (dd < bd && los(s.x, s.y, e.x, e.y)) { bd = dd; tgt = e; } });
  if (tgt && (mm || cop) && s.cd <= 0 && Math.abs(angDiff(s.aim, Math.atan2(tgt.y - s.y, tgt.x - s.x))) < 0.12) { const c = Math.cos(s.aim), sn = Math.sin(s.aim);
    if (mm) { s.cd = S.buddyCd * 2.3; pbullets.push({ x: s.x + c * 34, y: s.y + sn * 34, vx: c * 1500, vy: sn * 1500, life: 0.5, dmg: gd() * 1.6, pierce: 1, bounce: 0, hits: [], small: true }); flashes.push({ x: s.x + c * 40, y: s.y + sn * 40, rot: s.aim, life: 0.06, max: 0.06, reg: R.mf_rifle, fs: 0.8 }); playS('rifle_m', 0.2, 1.05, 0, 0.2); }
    else { s.cd = S.buddyCd * 1.7; for (let k = 0; k < 4; k++) { const a = s.aim + rand(-0.16, 0.16), v = rand(900, 1050); pbullets.push({ x: s.x + c * 32, y: s.y + sn * 32, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.3, dmg: gd() * 0.32, pierce: 0, bounce: 0, hits: [], small: true, kb: 2.4 }); } flashes.push({ x: s.x + c * 36, y: s.y + sn * 36, rot: s.aim, life: 0.06, max: 0.06, reg: R.mf_shotgun, fs: 0.8 }); playS('shotgun_m', 0.2, 1.05, 0, 0.2); }
    s.recoil = 5; if (thr('bnoise', 400)) makeNoise(s.x, s.y, 480, true); }
  if (tgt) { s.aim += angDiff(s.aim, Math.atan2(tgt.y - s.y, tgt.x - s.x)) * damp(14, dt); if (s.cd <= 0 && !mm && !cop) { s.cd = S.buddyCd; pbullets.push({ x: s.x + Math.cos(s.aim) * 30, y: s.y + Math.sin(s.aim) * 30, vx: Math.cos(s.aim) * 1000, vy: Math.sin(s.aim) * 1000, life: 0.6, dmg: gd() * 0.6, pierce: 0, bounce: 0, hits: [], small: true }); s.recoil = 4; if (thr('bnoise', 400)) makeNoise(s.x, s.y, 480, true); flashes.push({ x: s.x + Math.cos(s.aim) * 34, y: s.y + Math.sin(s.aim) * 34, rot: s.aim, life: 0.05, max: 0.05, reg: R.mf_pistol, fs: 0.8 }); playS('pistol_m', 0.22, 1.05, 0, 0.2); } } }
function buddyHurt(s, p, dt) {
  s.inv = Math.max(0, (s.inv || 0) - dt); s.hurt = Math.max(0, (s.hurt || 0) - dt);
  if (!(s.down > 0)) {
    let near = false; if (s.inv <= 0) query(s.x, s.y, 120, e => { if (e.dead || e.emerge < 1 || !(e.dmg > 0) || (e.z || 0) > 12) return; const dd = d2(e.x, e.y, s.x, s.y); if (dd < 300 * 300) near = true; if (s.inv <= 0 && dd < (e.r + s.r) ** 2) { s.hp -= e.dmg * (e.type === 'queen' ? 0.8 : 0.35); s.inv = 0.6; s.hurt = 0.15; bleed(s.x, s.y, 16, s.x - e.x, s.y - e.y, 5, BLOOD, 200); } });
    if (!near && s.hp < s.max && thr('bq' + (s.id || (s.id = nid++)), 250)) { let q = true; query(s.x, s.y, 300, e => { if (!e.dead && e.emerge >= 1 && e.dmg > 0) q = false; }); if (q) s.hp = Math.min(s.max, s.hp + 1); } // patches up when nothing is close (about 4 a second)
    if (s.hp <= 0) { s.hp = 0; s.down = buddies.some(b => b !== s && b.tr === 'medic' && !(b.down > 0)) ? 24 : 18; s.downMax = s.down; s.rev = 0; s.strideAmp = 0; bleed(s.x, s.y, 16, 0, 0, 20, BLOOD, 300, 1.2); pool(s.x, s.y, 1.1, BLOOD); sfx.grunt && sfx.grunt(s.x, s.y); if (Math.abs(s.x - cam.x - viewW / 2) > viewW / 2 || Math.abs(s.y - cam.y - viewH / 2) > viewH / 2) sfx.radio(P.x, P.y); showStreak('Man down', `${s.nm || 'Backup'} · stand next to them to get them up`); }
    return false;
  }
  s.down -= dt; const close = d2(p.x, p.y, s.x, s.y) < 70 * 70 && p.hp > 0;
  const med = buddies.some(b => b !== s && b.tr === 'medic' && !(b.down > 0) && d2(b.x, b.y, s.x, s.y) < 200 * 200); s.rev = close ? s.rev + dt : med ? s.rev + dt * 0.5 : s.rev; // what you put in stays; a medic nearby works on them too
  if (close && thr('revtick', 400)) tone(660 + s.rev * 200, 0.05, 'sine', 0.025);
  if (!close && (s.callT = (s.callT ?? 1.2) - dt) <= 0) { const urg = s.down < (s.downMax || 18) * 0.35; s.callT = urg ? rand(2, 2.8) : rand(3.4, 4.8); playR(budKey(s, 'Help'), urg ? 0.3 : 0.24, s.x, s.y, urg ? 1.05 : 1); } /* a downed backup shouts for help from where they lie, faster as they bleed out */
  if (s.rev >= 1) { s.down = 0; s.rev = 0; s.hp = s.max * 0.5; s.inv = 1.2; floatText(s.x, s.y - 40, 'Back on their feet', '#8ef0b8', 15); sfx.ammo(); return false; }
  if (s.down <= 0) { // bled out
    const i = buddies.indexOf(s); if (i >= 0) buddies.splice(i, 1); S.buddy = Math.max(0, S.buddy - 1); if ((LV.buddy || 0) > 0) LV.buddy--;
    pool(s.x, s.y, 1.6, BLOOD); radio(pick(['We heard. Nothing you could do, nine. Keep moving.', 'Lost one of yours? Copy. Keep the rest close.', 'They did not make it. Eyes up, nine.'])); showStreak('They didn\'t make it', s.nm ? `${s.nm} the ${TRAITS[s.tr].name.toLowerCase()} is gone` : 'You lost one of your backup'); if (s.nm) (RUN.lost = RUN.lost || []).push(s.nm); renderMods(); return true;
  }
  if (Math.random() < dt * 2) bleed(s.x, s.y, 10, rand(-1, 1), rand(-1, 1), 1, BLOOD, 40);
  s.recoil = Math.max(0, (s.recoil || 0) - dt * 40); s.aimA = s.aim; s.bodyA += angDiff(s.bodyA, s.aim) * damp(6, dt); buddyShoot(s, dt, 2); return true;
}
// a buddy lost behind walls rejoins from just off screen behind you, on ground with a short walk in; failing that, close behind you
const pspdOf = p => Math.hypot(p.vx, p.vy); // standing still, a survivor steps to the nearest good spot instead of crossing round you
function buddySlot(p, s, i, taken) { // the best open spot round the player for survivor i, nearest to where the formation wants it
  const pref = p.formA + Math.PI + (i - (buddies.length - 1) / 2) * 0.95; let best = null, bs = 1e9;
  for (const R of [84, 64, 48]) for (let k = 0; k < 16; k++) { const a = pref + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (TAU / 16), x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
    if (solidPt(x, y) || solidPt(x + 13, y) || solidPt(x - 13, y) || solidPt(x, y + 13) || solidPt(x, y - 13) || !los(p.x, p.y, x, y)) continue;
    if (Math.abs(angDiff(p.aimA, a)) < 0.55 || taken.some(q => d2(q[0], q[1], x, y) < 44 * 44)) continue;
    if (s.avoid && time < s.avoid.t && d2(s.avoid.x, s.avoid.y, x, y) < 30 * 30) continue;
    const sc = Math.abs(angDiff(pref, a)) * 40 + (84 - R) * 0.6 + Math.hypot(s.x - x, s.y - y) * (pspdOf(p) > 60 ? 0.15 : 0.4) + (los(s.x, s.y, x, y) ? 0 : 60); if (sc < bs) { bs = sc; best = [x, y]; } } // a spot it can walk straight to is better than one round a corner
  return best;
}
function rescueFollower() { return obj && obj.type === 'rescue' && obj.state === 'follow' && !obj.done && obj.s && obj.s.hp > 0 ? obj.s : null; }
function budTag(s, x, y) { if (!s.nm) return; ui.font = `600 ${9 * TS()}px "JetBrains Mono", monospace`; ui.textAlign = 'center'; const t = s.nm.toUpperCase(); ui.lineWidth = 3; ui.strokeStyle = 'rgba(20,24,29,0.85)'; ui.strokeText(t, x, y); ui.fillStyle = s.down > 0 ? '#ff8a7a' : '#cfe9dc'; ui.fillText(t, x, y); } // whose bar it is
function budBoard(s, dt) { // to the side door; aboard, they are out of the fight and fly out with you
  const e = evac, gx = e.x - 34, gy = e.y + 8, dx = gx - s.x, dy = gy - s.y, dd = Math.hypot(dx, dy);
  if (dd < 26) { const i = buddies.indexOf(s); if (i >= 0) buddies.splice(i, 1); RUN.aboard.push(s); floatText(s.x, s.y - 40, `${s.nm || 'Backup'} is aboard`, '#8ef0b8', 15); sfx.ammo(); return true; }
  let ux = dx / dd, uy = dy / dd;
  if (!los(s.x, s.y, gx, gy)) { const cx = Math.floor(s.x / TILE), cy = Math.floor(s.y / TILE); let best = flow[cy * MW + cx], bx = cx, by = cy; for (const [ox2, oy2] of N8) { const nx = cx + ox2, ny = cy + oy2; if (isWall(nx, ny) || (ox2 && oy2 && (isWall(cx + ox2, cy) || isWall(cx, cy + oy2)))) continue; const v = flow[ny * MW + nx] + (ox2 && oy2 ? 0.8 : 0); if (v < best) { best = v; bx = nx; by = ny; } } if (bx !== cx || by !== cy) { const qx = (bx + 0.5) * TILE - s.x, qy = (by + 0.5) * TILE - s.y, g = Math.hypot(qx, qy) || 1; ux = qx / g; uy = qy / g; } } // round the walls by your own path: you are at the chopper
  const ox = s.x, oy = s.y, v = Math.min(280, dd * 6); s.x += ux * v * dt; s.y += uy * v * dt; collide(s);
  const spd = Math.hypot(s.x - ox, s.y - oy) / Math.max(dt, 1e-4); if (spd > 20) s.moveA += angDiff(s.moveA, Math.atan2(s.y - oy, s.x - ox)) * damp(10, dt); s.strideAmp = lerp(s.strideAmp, Math.min(1, spd / 250), damp(10, dt)); s.stride += spd * dt / 76; s.aim = s.aimA = s.moveA; s.bodyA += angDiff(s.bodyA, s.moveA) * damp(8, dt); s.recoil = Math.max(0, (s.recoil || 0) - dt * 40);
  return true;
}
function regroupSpot(p, i) {
  const back = p.formA + Math.PI, open = (x, y) => { if (solidPt(x, y) || solidPt(x + 16, y) || solidPt(x - 16, y) || solidPt(x, y + 16) || solidPt(x, y - 16)) return false; let hot = false; query(x, y, 70, e => { if (!e.dead && d2(e.x, e.y, x, y) < 70 * 70) hot = true; }); return !hot; }; // never onto the dead
  for (let k = 0; k < 24; k++) { const a = back + rand(-1.1, 1.1), c = Math.cos(a), sn = Math.sin(a), edge = Math.min(Math.abs(c) > 0.01 ? viewW / 2 / Math.abs(c) : 1e9, Math.abs(sn) > 0.01 ? viewH / 2 / Math.abs(sn) : 1e9), r = edge + rand(40, 110), x = p.x + c * r, y = p.y + sn * r;
    if (x < 2 * TILE || y < 2 * TILE || x > WW - 2 * TILE || y > WH - 2 * TILE || !open(x, y)) continue; const f = flow[Math.floor(y / TILE) * MW + Math.floor(x / TILE)]; if (f !== 65535 && f / 2 * TILE < r * 1.5) return [x, y]; }
  for (let k = 0; k < 16; k++) { const a = back + rand(-0.8, 0.8), r = rand(70, 130), x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (open(x, y) && los(p.x, p.y, x, y)) return [x, y]; }
  return null;
}
function freeSpot(minD, maxD) {
  for (let k = 0; k < 80; k++) {
    const a = rand(0, TAU), d = rand(minD, maxD), x = clamp(P.x + Math.cos(a) * d, 4 * TILE, WW - 4 * TILE), y = clamp(P.y + Math.sin(a) * d, 4 * TILE, WH - 4 * TILE);
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); let ok = true;
    for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1; i++) if (isWall(tx + i, ty + j)) { ok = false; break; }
    if (ok && flow[ty * MW + tx] < 65535) return [(tx + 0.5) * TILE, (ty + 0.5) * TILE];
  }
  return [P.x + rand(-120, 120), P.y + rand(-120, 120)];
}
const NPC_TINTS = [[1, 1, 1], [0.86, 0.92, 1.06], [1.08, 0.96, 0.8], [0.82, 0.86, 0.76]]; // faded, sun-bleached and grimy clothes so backups aren't clones
function makeSurvivor(x, y) { const mh = 100 + 12 * Math.max(1, wave); return { x, y, vx: 0, vy: 0, r: 14, hp: mh, max: mh, moveA: 0, bodyA: rand(0, TAU), aimA: 0, stride: 0, strideAmp: 0, recoil: 0, gun: 'pistol', swap: 0, reload: 0, inv: 0, dashT: 0, hurt: 0, ant: {}, look: pick([0, 1, 2].filter(l => l !== (HLOOK[RUN.hero] || 0))), tint: pick(NPC_TINTS.slice(1)), cd: 0, npc: true }; }
