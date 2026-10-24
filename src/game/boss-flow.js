/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
let FOGB = 0, FOGBT = 0, bossDue = false;
const BOSS_PRE = { abom: 'The streetlights are going out', roadkill: 'A car alarm is screaming somewhere', grave: 'The bell on the hill is ringing', chief: 'Sirens on Main Street', pz: 'Something walked out of the hospital' };
const BOSS_RADIO = {
  abom: { pre: 'Nine, streetlights are dying on your block one by one. Something is down in the wiring.', p1: 'Those sacs on the ground are moving. Shoot them before they open.', p2: 'Half the grid just flickered on our board. Whatever it is, it is angry now.', kill: 'Lights are coming back on our board. Did you just kill that thing, nine?', dawn: 'Sun is up. Whatever lived under that street is not getting up again.' },
  roadkill: { pre: 'Truckers on nine call it Roadkill. It goes for anything that makes noise. Car alarms drive it crazy.', p1: 'It tore a road sign out of the ground. Watch the throw.', p2: 'Every wreck it hits sets the next one off. Make the alarms work for you.', kill: 'Route 9 just went quiet. First time in weeks.', dawn: 'Dawn on Route 9. Nothing out there chasing alarms anymore.' },
  grave: { pre: 'There was a keeper on Hollow Hill. Blind, but it hears everything. The quieter you are, the longer you live.', p1: 'It is pulling up headstones. Do not stand where it can reach.', p2: 'Fog has swallowed the hill. The lantern on its hip is the only light left.', kill: 'The bell has stopped. The hill is yours, nine.', dawn: 'Fog is lifting off Hollow Hill. First quiet morning up there in a long time.' },
  chief: { pre: 'Engine 4 went into the fire on Main and never came back out. Something in turnout gear just walked out of the smoke.', p1: 'It is calling Engine 4 on the fire channel. Its crew is still answering.', p2: 'Main Street is burning end to end. Keep moving, nine.', kill: 'Engine 4, stand down. Rest easy, Chief.', dawn: 'Smoke is still going up from Main Street. Five nights to go, nine.' },
  pz: { pre: ['Nine, the doors of the county hospital just opened.', 'Whatever started all this walked out of the isolation ward. It is heading your way.', 'When it breathes in, get behind something. Do not let it scream at you in the open.'], p1: 'It is bleeding infection into the street. Do not stand in it.', p2: 'The whole town heard that. Hang on, nine. The bird is spinning up.', kill: 'Patient Zero is down! The bird is in the air. Get to the landing zone.' }
};
function bossType() { return !RUN.endless && wave === FINAL_NIGHT ? 'pz' : !RUN.endless && wave === 10 ? 'chief' : RUN.district === 'highway' ? 'roadkill' : RUN.district === 'cemetery' ? 'grave' : 'abom'; }
function bossSubText() { const t = lastNight(wave) ? 'Shoot it as it breathes in, then get out of its sight' : !RUN.endless && wave === 10 ? 'Fireproof. Shoot the air tank on its back' : DISTRICTS[RUN.district || 'town'].bossSub; return RUN.practice ? 'Boss practice · ' + t : t; }
function fmtT(s) { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function freeAround(x, y, r = 22) { return x > 4 * TILE && y > 4 * TILE && x < WW - 4 * TILE && y < WH - 4 * TILE && !solidPt(x, y) && !solidPt(x + r, y) && !solidPt(x - r, y) && !solidPt(x, y + r) && !solidPt(x, y - r); }
function stageSpot(d0, d1) { for (let k = 0; k < 80; k++) { const a = rand(0, TAU), r = rand(d0, d1); if (k < 50 && Math.abs(Math.sin(a)) > 0.55) continue; /* the screen is wider than tall: arrive from the side where it can be seen */ const x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!freeAround(x, y, 30)) continue; const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); if (flow && !(flow[ty * MW + tx] < 65535)) continue; return [x, y]; } return spawnPoint(d0, false); } // close enough to watch it arrive, on ground it can walk from
function lampOff(L, quiet) { if (L.down || L.off) return; L.off = time; L.on = 0; if (!quiet) { sparks(L.hx, L.hy - LAMPV(L), [1, 0.9, 0.6], 8, 220); sfx.lampPop(L.hx, L.hy); } }
function lampsOff(list, gap, t0 = 0, who) { list.forEach((L, i) => later.push({ t: t0 + i * gap, fn: () => { if (state === 'play' && !(who && who.dead)) lampOff(L); } })); return list.length; }
function lampsNear(x, y, r, max, far, keep = 0) { const d = L => d2(L.bx, L.by, x, y), l = lamps.filter(L => !L.down && !L.off && d(L) < r * r && d2(L.bx, L.by, P.x, P.y) > keep * keep).sort((a, b) => d(a) - d(b)).slice(0, max); return far ? l.reverse() : l; } // the nearest ones; 'far' plays them from the outside in
function lampsBack() { let i = 0; for (const L of lamps) if (L.bflick) L.broken = L.bflick = false; for (const L of lamps) if (L.off) { const l = L; later.push({ t: (i++) * 0.07, fn: () => { l.off = 0; l.on = time; } }); } FOGBT = 0; } // the power comes back: every dead light stutters on again
function ringFires(cx, cy, n, r0, r1, life, t0 = 0) { for (let i = 0, k = 0; i < n * 3 && k < n; i++) { const a = rand(0, TAU), r = rand(r0, r1), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (!freeAround(x, y, 12)) continue; const kk = k++; later.push({ t: t0 + kk * 0.15, fn: () => { if (state !== 'play') return; firePool(x, y, rand(34, 50), life); flashLight(x, y, 180, [1.4, 0.7, 0.3], 0.2); for (let j = 0; j < 4; j++) part({ k: 10, x: x + rand(-14, 14), y: y + rand(-14, 14), z: 4, vz: rand(30, 70), vx: rand(-15, 15), vy: rand(-15, 15), life: 0.7, max: 0.7, size: rand(0.5, 0.9), rot: rand(0, TAU), vr: rand(-2, 2), drag: 1 }); } }); } }
function whenPlay(fn) { const g = () => { if (state === 'play') return fn(); if (state === 'levelup' || state === 'pause') later.push({ t: 0.1, fn: g }); else bossDue = false; }; return g; } // a card or the pause menu on the same tick must not cancel a boss
function bossEntrance(bt, quick) { // nothing just digs up any more: each boss announces itself its own way, and the camera leans toward it
  bossDue = true; const L = BOSS_RADIO[bt]; if (L) for (const l of [].concat(L.pre)) radio(l);
  later.push({ t: quick ? 0.6 : 2.2, fn: whenPlay(() => (ENTRANCE[bt] || ENTRANCE.walk)()) });
}
function gzSecond() { if (!RUN.gzDue) return; if (state === 'levelup' || state === 'pause') { later.push({ t: 0.2, fn: gzSecond }); return; } if (state !== 'play' || evac) return; RUN.gzDue = false; showStreak('Another one', 'A second Patient Zero is coming'); const [x, y] = stageSpot(520, 680); bossArrive(x, y, true); }
function bossArrive_tip() { later.push({ t: 9, fn: () => { if (state === 'play' && boss && !boss.dead) tip('boss'); } }); }
function bossArrive(x, y, walk) {
  bossDue = false; if (state !== 'play') return null; bossArrive_tip();
  const e = makeEnemy('queen', x, y); nightLive = true; if (RUN.practice) RUN.t0 = time; /* the practice clock starts when it shows up */ e.a = Math.atan2(P.y - y, P.x - x);
  if (walk) { e.emerge = 1; e.st = 'roar'; e.stT = 1.3; e.busyT = 1.3; } // it walks in and announces itself
  else { dust(x, y, 7, 50, 1, 1); chips(x, y, 6, null, 4, 140); sfx.dig(x, y); ring(x, y, 6, 40, 0.4, [0.6, 0.5, 0.4], 0.5); decal(R.hole, x, y, 3, [1, 1, 1, 0.9], [0, 0, 0], 14); }
  { const bb = $('bossBox').firstElementChild; if (bb) bb.textContent = bossName(); }
  banner(bossName(), bossSubText(), true); sfx.roar(x, y, e.btype); shake(0.3); if (!enemies.some(o => o !== e && o.type === 'queen' && !o.dead)) { MUS.bt = e.btype; MUS.pos.boss = 0; MUS.bph = 0; MUS.phJump = null; MUS.sec = null; } /* its own music, from the top */ cam.peek = { x, y, t: 1.6 };
  if (lastNight(wave) && INF(10) && !RUN.practice && !RUN.gzDone) { RUN.gzDone = true; RUN.gzDue = true; later.push({ t: 20, fn: gzSecond }); } // Ground Zero: a second one always follows
  return e;
}
const ENTRANCE = {
  walk() { const [x, y] = stageSpot(520, 680); cam.peek = { x, y, t: 2.2 }; later.push({ t: 0.6, fn: () => bossArrive(x, y, true) }); },
  abom() { // the lights around where it will surface die one after another, it clicks, then it bursts out of the street
    const [x, y] = stageSpot(500, 640), n = lampsOff(lampsNear(x, y, 430, 6), 0.3); cam.peek = { x, y, t: 2.6 + n * 0.3 };
    later.push({ t: 0.5 + n * 0.3, fn: () => { if (state === 'play') sfx.chitter(x, y, 0.9); } }); later.push({ t: 1.3 + n * 0.3, fn: () => bossArrive(x, y, false) });
  },
  roadkill() { // an alarm starts screaming down the road, then the car comes apart and it climbs out of the wreck
    const dd = c => Math.hypot(c.x - P.x, c.y - P.y), car = cars.filter(c => !c.dead && !c.burnt && dd(c) > 380 && dd(c) < 820).sort((a, b) => Math.abs(dd(a) - 560) - Math.abs(dd(b) - 560))[0];
    if (!car) return ENTRANCE.walk();
    startAlarm(car); cam.peek = { x: car.x, y: car.y, t: 3.4 };
    later.push({ t: 1.9, fn: whenPlay(() => {
      const a = Math.atan2(P.y - car.y, P.x - car.x); let x = car.x, y = car.y; for (let k = 40; k < 220; k += 8) { x = car.x + Math.cos(a) * k; y = car.y + Math.sin(a) * k; if (freeAround(x, y, 26)) break; }
      car.alarm = 0; car.hasAlarm = false; damageCar(car, car.max * 0.55); car.jvx = (car.jvx || 0) - Math.cos(a) * 140; car.jvy = (car.jvy || 0) - Math.sin(a) * 140; car.jva = (car.jva || 0) + rand(-0.5, 0.5);
      sparks(x, y, [1, 0.9, 0.6], 22, 380); for (let i = 0; i < 16; i++) part({ k: 3, x, y, z: 14, vz: rand(40, 160), vx: Math.cos(a) * rand(80, 260) + rand(-90, 90), vy: Math.sin(a) * rand(80, 260) + rand(-90, 90), life: 1.6, max: 1.6, size: rand(0.25, 0.5), rot: rand(0, TAU), vr: rand(-14, 14), drag: 2.5, c: [0.75, 0.85, 0.9] });
      sfx.shatter(); sfx.crunch(x, y); shake(0.4); const e = bossArrive(x, y, true); if (e) { e.lx = Math.cos(a); e.ly = Math.sin(a); } }) });
  },
  grave() { // fog rolls up the hill, the bell tolls three times, a crypt door drags open and it walks out
    let best = null, bs = 1e9;
    for (const o of houses) if (o.style === 'crypt') { const cx = (o.x + o.w / 2) * TILE, cy = (o.y + o.h / 2) * TILE; for (const [x, y] of [[cx, (o.y + o.h) * TILE + 34], [cx, o.y * TILE - 34], [o.x * TILE - 34, cy], [(o.x + o.w) * TILE + 34, cy]]) { if (!freeAround(x, y, 22)) continue; const d = Math.hypot(x - P.x, y - P.y); if (d < 420 || d > 950) continue; const sc = Math.abs(d - 600) + Math.abs(y - P.y) * 0.6; if (sc < bs) { bs = sc; best = [x, y]; } } }
    const [x, y] = best || stageSpot(520, 680); FOGBT = Math.max(FOGBT, 0.75); cam.peek = { x, y, t: 3.8 };
    for (let i = 0; i < 3; i++) later.push({ t: i * 0.85, fn: () => { if (state === 'play') sfx.bell(x, y); } });
    later.push({ t: 2.2, fn: () => { if (state === 'play') sfx.creak(x, y); } });
    later.push({ t: 2.9, fn: whenPlay(() => { dust(x, y, 10, 70, 1.2, 1); bossArrive(x, y, true); }) });
  },
  chief() { // a siren winds up, the street catches fire in a ring, its radio crackles and it steps out of the flames
    const [x, y] = stageSpot(520, 660); sfx.siren(x, y, 2); cam.peek = { x, y, t: 3.4 }; ringFires(x, y, 7, 60, 100, 18, 0.5);
    later.push({ t: 1.5, fn: () => { if (state === 'play') sfx.radio(x, y); } });
    later.push({ t: 2.3, fn: whenPlay(() => { sfx.breath(x, y, true); bossArrive(x, y, true); }) });
  },
  pz() { // the lights go out one by one, from the far end of town toward you, and then you hear it breathing
    const [x, y] = stageSpot(560, 720), n = lampsOff(lampsNear(P.x, P.y, 1100, 8, true, 200), 0.32, 0.8), tA = 1.4 + n * 0.32;
    later.push({ t: tA - 0.6, fn: () => { if (state === 'play') sfx.breath(x, y, true); } });
    later.push({ t: tA, fn: () => bossArrive(x, y, true) });
  }
};
function arenaPhase(e, ph, skip) { if (!skip && !RUN.practice) for (let i = 0; i < 2; i++) dropAmmo(e.x, e.y, 1.5, 120); // each boss changes the place it fights in when it gets hurt (a burst through two phases plays both)
  const bt = e.btype, L = BOSS_RADIO[bt]; if (L && !skip) radio(ph === 1 ? L.p1 : L.p2);
  if (bt === 'abom') { if (ph === 1) lampsOff(lampsNear(e.x, e.y, 650, 6), 0.18, 0, e); else { for (const l of lamps) if (!l.down && !l.off && !l.lantern && !l.broken && Math.random() < 0.6) l.broken = l.bflick = true; sfx.lampPop(P.x, P.y); } } // it feeds on the grid: first the block goes dark, then the lights all over town start to stutter
  else if (bt === 'roadkill') { const dd = c => d2(c.x, c.y, P.x, P.y), pool2 = cars.filter(c => !c.dead && !c.fire && !c.burnt && dd(c) > 260 * 260 && dd(c) < 900 * 900); for (let i = 0; i < (ph === 1 ? 1 : 3) && pool2.length; i++) { const c = pool2.splice(randi(0, pool2.length - 1), 1)[0]; later.push({ t: 0.4 + i * 0.6, fn: () => { if (state === 'play' && !c.dead) { c.fire = 1; flashLight(c.x, c.y, 260, [1.5, 0.7, 0.3], 0.3); dust(c.x, c.y, 6, 60, 1, 1); noise(0.7, 0.08, 900, 200, 'lowpass', 0, spat(c.x, c.y)); } } }); } } // Route 9 starts burning: the wrecks catch, one, then three more
  else if (bt === 'grave') { if (ph === 1) { FOGBT = 1; sfx.bell(e.x, e.y); } else lampsOff(lampsNear(P.x, P.y, 1400, 16, true, 240), 0.08, 0, e); } // the fog thickens, then every light on the hill goes out but its lantern
  else if (bt === 'chief') { ringFires(P.x, P.y, ph === 1 ? 5 : 8, 300, 480, 25); if (ph === 2) sfx.siren(e.x, e.y, 1); } // the fire spreads down the block
  else if (bt === 'pz') { if (ph === 1) lampsOff(lampsNear(e.x, e.y, 800, 8), 0.2, 0, e); else { sfx.siren(P.x - 900, P.y, 3, true); for (let i = 0; i < 20; i++) noise(0.08, 0.035, 220, 80, 'lowpass', 1.5 + i * 0.12); } } // the dark follows it; then the town siren, and far off, rotors
}
function recordBoss(bt, secs) { const pr = RUN.practice; meta.trophies = meta.trophies || {}; const t = meta.trophies[bt] = meta.trophies[bt] || {}, k = pr ? 'pbest' : 'best', nb = !(t[k] <= secs); if (nb) t[k] = secs; if (!pr) { t.n = (t.n || 0) + 1; (RUN.bossLog = RUN.bossLog || []).push({ bt, secs, nb, first: t.n === 1 }); } saveMeta(); return { nb, first: !pr && t.n === 1 }; }
function bossLogHtml() { const l = RUN.bossLog || []; if (!l.length) return ''; return '<div class="blog">' + l.map(b => `${(PRACTICE_SET.find(o => o.bt === b.bt) || { name: '' }).name} down in <b>${fmtT(b.secs)}</b>${b.first ? ' · first kill' : b.nb ? ' · best time' : ''}`).join('<br>') + '</div>'; }
function bossDown(e, alone) { // the kill is a checkpoint: the horde breaks, the lights come back, the convoy drops a crate
  if (alone && RUN.gzDue) { alone = false; bossDue = true; later.push({ t: 2.5, fn: gzSecond }); } // Ground Zero: killed the first one early, so the second comes now
  const bt = e.btype, secs = time - (e.t0 || time), tr = recordBoss(bt, Math.round(secs)), nm = bossName(); bossDeathSfx(e); if (alone) MUS.cutT = time + (RUN.practice ? 99 : lastNight(wave) && !RUN.endless ? 4.8 : 1.6) /* on the last night the silence holds until the evac fight starts */; // the band stops dead with it
  if (!RUN.practice) { const sc = wave <= 5 ? 40 : wave <= 10 ? 80 : 150; runSeeds += sc; RUN.lvHold = time + 1.1; /* the cards wait until the kill has landed */ banner(`${nm} is dead`, `+${sc} scrap · ${fmtT(secs)}${tr.first ? ' · first kill' : tr.nb ? ' · best time' : ''}`, false); RUN.bossDawn = (BOSS_RADIO[bt] || {}).dawn; }
  else RUN.pBest = tr.nb;
  if (!alone) return; // Ground Zero: the other one is still up
  bossDue = false; later.push({ t: 0.9, fn: () => { if (state === 'play') lampsBack(); } });
  { const L = BOSS_RADIO[bt]; if (L) later.push({ t: 1.4, fn: () => radio(L.kill) }); }
  if (RUN.practice) return;
  queue.length = 0; let n = 0; for (const z of enemies) if (z.type === 'egg' && !z.dead) { z.dead = true; bleed(z.x, z.y, 10, 0, 0, 10, BILE, 160); pool(z.x, z.y, 0.6, BILE, 30); } for (const z of enemies) if (!z.dead && z !== e && z.type !== 'queen' && z.type !== 'flower' && z.type !== 'egg') { z.rout = rand(4.5, 6.5); z.lure = null; n++; }
  if (n) later.push({ t: 2.3, fn: () => showStreak('They scatter', 'The horde breaks without it') });
  later.push({ t: 2.6, fn: () => { if (state === 'play') dropCrate(); } });
  { const rw = TW('pistol') ? null : wave >= 10 && !P.owned.includes('launcher') ? 'launcher' : !P.owned.includes('auto') ? 'auto' : null; if (rw) later.push({ t: 3.4, fn: () => { if (state === 'play') dropCrate(rw); } }); } // the auto shotgun for your first boss, the grenade launcher for the Fire Chief
  if (lastNight(wave) && !RUN.endless) later.push({ t: 3, fn: () => { if (state === 'play' && !evac) { nightCleared(); startEvac(); } } }); // the last one down: the bird comes now, not after the stragglers
}
function bossName() { return lastNight(wave) ? 'Patient Zero' : !RUN.endless && wave === 10 ? 'Fire Chief' : DISTRICTS[RUN.district || 'town'].boss; }
/* ---------- first-run training: night 1 opens with a short drill, one control at a time ---------- */
