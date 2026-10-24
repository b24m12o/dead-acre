/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
function surgePlan(w) {
  if (bossNight(w) || w < 2 || RUN.tut || RUN.practice) return null; const n = queue.length;
  { let cut = Math.round(n * 0.08); for (let i = queue.length - 1; i >= 0 && cut > 0; i--) if (queue[i] === 'skitter') { queue.splice(i, 1); cut--; } } // the dead come bunched up now, so a few less of them
  const m = queue.length, sg = { m, i: 0, n: 0, cuts: [Math.round(m * 0.34), Math.round(m * 0.68)], lull: 0, quiet: 0, horde: null, piece: null };
  if (w >= 4 && Math.random() < 0.45) sg.piece = Math.random() < 0.6 || !cars.some(c => c.hasAlarm && !c.alarmUsed && !c.dead) ? 'horde' : 'alarm';
  return sg;
}
function surgeLull(SG, dt) {
  SG.lull -= dt; let alive = 0; for (const e of enemies) if (!e.dead && !e.dormant) alive++;
  if (alive <= 3 || SG.lull <= 0) { SG.quiet = (SG.quiet || 0) + dt; if (SG.quiet >= 3.5 || SG.lull <= -6) surgeGo(SG); }
}
function surgeGo(SG) {
  SG.lull = 0; SG.quiet = 0; spawnT = 0.4; const last = SG.i >= SG.cuts.length; MUS.sting = true; MUS.floor = last && SG.piece === 'horde' ? 0.85 : last ? 0.65 : 0.5; MUS.floorT = time + (last ? 16 : 10);
  if (last && SG.piece === 'horde') { const a = rand(0, TAU), dir = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][Math.round(((a % TAU) + TAU) % TAU / (TAU / 8)) % 8]; SG.horde = { a, x: P.x + Math.cos(a) * 640, y: P.y + Math.sin(a) * 640, t: time + 8 }; showStreak('Horde', `They are coming up out of the ground to the ${dir}`, true); radio('Nine, big group breaking through on your ' + dir + ' side. Find a choke point.'); sfx.rumble(P.x + Math.cos(a) * 400, P.y + Math.sin(a) * 400); shake(0.12); return; }
  if (last && SG.piece === 'alarm') { const c = cars.filter(c => c.hasAlarm && !c.alarmUsed && !c.dead && d2(c.x, c.y, P.x, P.y) > 220 * 220 && d2(c.x, c.y, P.x, P.y) < 700 * 700).sort(() => Math.random() - 0.5)[0]; if (c) { startAlarm(c); showStreak('Car alarm', 'Something set one off · it pulls them in, use it'); return; } }
  showStreak(last ? 'Last surge' : 'Here they come', last ? 'Hold out and it is dawn' : 'The street is filling up again'); sfx.growl && sfx.growl(P.x + rand(-300, 300), P.y + rand(-300, 300));
}
function hordeSpot(H) { // up out of the ground in one stretch of the map, the way the horde came
  for (let k = 0; k < 30; k++) { const a = H.a + rand(-0.45, 0.45), d = rand(560, 760), x = clamp(P.x + Math.cos(a) * d, 4 * TILE, WW - 4 * TILE), y = clamp(P.y + Math.sin(a) * d, 4 * TILE, WH - 4 * TILE), tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); let ok = flow[ty * MW + tx] < 65535; for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1; i++) if (isWall(tx + i, ty + j)) { ok = false; break; } if (ok) return [x, y]; }
  return spawnPoint(460, false);
}
function startWave() {
  for (const c of crates) if (c.dawn) c.dawn = false; // last dawn's drop is just a crate now
  nightLive = true; wave++; queue = buildWave(wave); spawnT = 0.3;
  const qb = bossNight(wave), last = lastNight(wave);
  nightSetup(); RUN.sg = surgePlan(wave);
  const evTxt = ev ? EV_NAME[ev] + ' · ' : '';
  if (qb) { const bt = bossType(); banner(last ? `Night ${wave} · the last night` : `Night ${wave}`, BOSS_PRE[bt], true); bossEntrance(bt); }
  else banner(`Night ${wave}`, wave === 1 && true && !RUN.endless ? `Survive till dawn · ${FINAL_NIGHT} nights to the evac` : obj ? evTxt + objName() : evTxt + (RUN.low ? `Lying low · ${queue.length} dead walking` : `${queue.length} dead walking`), ev === 'blood');
  if (obj && true) { meta.tips = meta.tips || {}; const o = objKey(); if (!meta.tips[o]) { meta.tips[o] = 1; saveMeta(); const nm = objName(); const full = (o === 'hale' || o === 'rescue') && buddies.length >= 3, tx = full ? (o === 'hale' ? 'Reach Dr. Hale and keep her alive till dawn. Your team is full: she rides with the convoy' : 'Reach them and keep them alive till dawn. Your team is full: they head for the convoy') : OBJ_TIP[o]; later.push({ t: 0.5, fn: () => showStreak(nm, tx) }); } }
  { radio(wave === 1 && !RUN.endless ? RADIO.n1 : last ? RADIO.last : qb ? null : ev ? RADIO.ev[ev] : !obj && Math.random() < 0.55 ? pick(RADIO.night) : null, null, wave === 1 || last ? 2 : 1); if (obj) { const ro = RADIO.obj[objKey()]; radio(typeof ro === 'function' ? ro() : ro); } }
  if (qb) { const bb = $('bossBox').firstElementChild; if (bb) bb.textContent = bossName(); }
  for (const b of barrels) if (b.dead && Math.random() < 0.5) { b.dead = false; b.hp = 20; }
  if (wave === 1 && WEAPON_NIGHTS[1] && nextGuns().length) { const gs = nextGuns(); dropCrate(gs[0], gs[1]); } /* the convoy's drops now come at dawn, for the night ahead (see dawnDrops) */
  for (const c of crystals) if (!c.alive && Math.random() < 0.45 && d2(c.x, c.y, P.x, P.y) > 90 * 90 && !enemies.some(e => d2(c.x, c.y, e.x, e.y) < (e.r + 30) ** 2)) { c.alive = true; c.hp = 40 + wave * 8; c.grow = 1; sparks(c.x, c.y - 8, [1, 0.85, 0.5], 8, 200); const i = c.ty * MW + c.tx; grid[i] = 1; ttype[i] = 4; flowTile = -1; }
  if (tutWanted()) tutStart();
  if (!RUN.tut && !RUN.practice && wave <= 2) later.push({ t: 6, fn: () => tip('ability') });
  statMax('maxNight', wave - 1);
}
/* ---------- objectives in play ---------- */
