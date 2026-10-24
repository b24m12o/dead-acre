/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const hc = {};
const setT = (id, v) => { if (hc[id] !== v) { hc[id] = v; $(id).textContent = v; } };
const setB = (id, f) => { const v = clamp(f, 0, 1).toFixed(3); if (hc[id] !== v) { hc[id] = v; $(id).style.transform = `scaleX(${v})`; } };
/* HUD layout: panel rects (refreshed a few times a second) drive the fade-when-covered, the radar spot and where edge arrows may sit */
const HUDF = { t: 0, rects: [], els: null, a: {}, radarA: 0.62, last: 0, gun: null, own: 0, ownSet: [], prev: null, got: {}, newGun: null, swapT: 0 };
function radarBox() { const S0 = VW < 900 || VH < 640 ? 100 : VH < 820 ? 112 : 128, sp = HUDF.score; return { S0, x0: VW - S0 - 14, y0: Math.max(40, sp ? Math.round(sp.b + 10) : 44) }; }
function hudRects() {
  const now = performance.now(); if (now - HUDF.t < 200 && HUDF.rects.length) return HUDF.rects; HUDF.t = now;
  if (!HUDF.els) HUDF.els = ['gauge', 'wavePlate', 'scorePlate', 'bossBox', 'radio', 'lv', 'hint'].map(id => $(id)); // the level label and the controls line at the bottom count too
  const out = [];
  for (const el of HUDF.els) { if (el.hidden || ((el.id === 'radio' || el.id === 'hint') && !el.classList.contains('show'))) continue; const r = el.getBoundingClientRect(); if (r.width < 2) continue; const o = { id: el.id, l: r.left, t: r.top, r: r.right, b: r.bottom }; out.push(o); if (el.id === 'scorePlate') HUDF.score = o; }
  const rb = radarBox(); out.push({ id: 'radar', l: rb.x0 - 6, t: rb.y0 - 6, r: rb.x0 + rb.S0 + 6, b: rb.y0 + rb.S0 + 6 });
  HUDF.rects = out; return out;
}
function safeLabel(txt, x, y) { // a label above something in the world: kept inside the screen and nudged off the HUD panels, never cut off or hidden under them
  const w = ui.measureText(txt).width, m = 8; x = clamp(x, w / 2 + m, VW - w / 2 - m); y = clamp(y, 14, VH - 10);
  for (let it = 0; it < 3; it++) { let mv = false; for (const q of hudRects()) { if (x + w / 2 > q.l - 6 && x - w / 2 < q.r + 6 && y > q.t - 10 && y < q.b + 12) { y = q.b + 16; mv = true; } } if (!mv) break; }
  return [x, y];
}
const inRect = (x, y, q, pad) => x > q.l - pad && x < q.r + pad && y > q.t - pad && y < q.b + pad;
function hudFade() {
  const now = performance.now() / 1000, dt = Math.min(0.1, now - (HUDF.last || now)); HUDF.last = now;
  const rects = hudRects(), op = (meta.hud && meta.hud.op) || 1, pts = [[(P.x - camX) * ZOOM, (P.y - camY) * ZOOM]];
  for (const e of enemies) if (!e.dead) { const x = (e.x - camX) * ZOOM, y = (e.y - (e.z || 0) - camY) * ZOOM; if (x > -20 && y > -20 && x < VW + 20 && y < VH + 20) pts.push([x, y]); }
  for (const c of crates) pts.push([(c.x - camX) * ZOOM, (c.y - camY) * ZOOM]);
  for (const q of rects) {
    const hid = pts.some(([x, y]) => inRect(x, y, q, 22)), tgt = hid ? 0.5 : 1, cur = HUDF.a[q.id] ?? 1, v = cur + (tgt - cur) * Math.min(1, dt * (hid ? 9 : 4));
    HUDF.a[q.id] = v; if (q.id === 'radar') continue;
    const el = $(q.id), fv = (v * op).toFixed(2); if (el.dataset.hf !== fv) { el.dataset.hf = fv; el.style.setProperty('--hf', fv); }
  }
  const important = (!queue.length && enemies.length > 0 && enemies.length <= 5) || crates.some(c => c.landed) || (boss && !boss.dead) || !!evac;
  const rt = important ? 1 : 0.62; HUDF.radarA += (rt - HUDF.radarA) * Math.min(1, dt * 3);
}
function gunPanel() { // Compact never expands on its own: pickups and swaps show inside the compact panel
  const full = meta.hud && meta.hud.size === 'full', now = performance.now() / 1000;
  const g = $('gauge'); if (g.classList.contains('open') !== full) { g.classList.toggle('open', full); HUDF.t = 0; }
  const fresh = new Set(); if (HUDF.own && P.owned.length > HUDF.own) { for (const q of P.owned) if (!HUDF.ownSet.includes(q)) { HUDF.newGun = { g: q, until: now + 2.4 }; if (GUNS[q].ammo) fresh.add(GUNS[q].ammo); } }
  HUDF.own = P.owned.length; HUDF.ownSet = P.owned.slice();
  const prev = HUDF.prev || {}, got = HUDF.got || (HUDF.got = {});
  for (const t in P.ammo) { if (prev[t] !== undefined && P.ammo[t] > prev[t] && !fresh.has(t)) { got[t] = { n: P.ammo[t] - prev[t] + (got[t] && now < got[t].until ? got[t].n : 0), until: now + 1.4 }; } prev[t] = P.ammo[t]; }
  HUDF.prev = prev;
  if (HUDF.gun !== P.gun) { if (HUDF.gun !== null) HUDF.swapT = now + 0.5; HUDF.gun = P.gun; }
  const G = GUNS[P.gun], mag = P.mag[P.gun], res = G.ammo ? P.ammo[G.ammo] : null, rl = P.reload > 0, pl = G.ammo && got[G.ammo] && now < got[G.ammo].until ? got[G.ammo].n : 0;
  setT('gunName', rl ? 'Reloading…' : G.name + (P.gun === 'rifle' && Math.hypot(P.vx, P.vy) < 40 && time - (P.lastShotT || -9) < 1.2 ? ' · braced' : P.gun === 'lmg' && time - (P.lastShotT || -9) < 0.22 ? ' · slowed' : '')); $('gunName').classList.toggle('rl', rl); $('gunCur').classList.toggle('sw', now < (HUDF.swapT || 0));
  const ak = rl + '|' + mag + '|' + res + '|' + pl; if (hc.gunAmmo !== ak) { hc.gunAmmo = ak; const ga = $('gunAmmo'); ga.className = 'ga' + (rl ? ' rl' : !mag && !res ? ' out' : mag <= Math.ceil(magSize(P.gun) * 0.2) ? ' low' : ''); ga.innerHTML = `<b>${mag}</b> / ${res === null ? '∞' : res === 0 && mag > 0 ? '<s class="lastmag">0 · last mag</s>' : res}` + (pl ? `<i class="plus">+${pl}</i>` : ''); }
  const fl = q => { const t = GUNS[q].ammo; return t && got[t] && now < got[t].until; }, nw = q => HUDF.newGun && HUDF.newGun.g === q && now < HUDF.newGun.until;
  const ck = P.owned.map(q => q + (hasAmmo(q) ? 1 : 0) + (fl(q) ? 'g' : '') + (nw(q) ? 'n' : '')).join() + P.gun; if (hc.chips !== ck) { hc.chips = ck; $('gunChips').innerHTML = P.owned.map((q, i) => `<span class="${P.gun === q ? 'on' : ''}${hasAmmo(q) ? '' : ' empty'}${fl(q) ? ' got' : ''}${nw(q) ? ' new' : ''}" title="${GUNS[q].name}">${i + 1}</span>`).join(''); }
}
function updateHud() {
  if (streakT > 0 && streakCur) placeStreak();
  hudFade(); gunPanel();
  { const bb = $('bossBox'); if (!bb.hidden) { const wb = hudRects().find(q => q.id === 'wavePlate'); if (wb) { const t = Math.round(wb.b + 6) + 'px'; if (bb.style.top !== t) { bb.style.top = t; HUDF.t = 0; } } } }
  const r = Math.max(0, P.hp) / S.maxHp; setB('hpFill', r); $('hpBar').classList.toggle('low', r < 0.3);
  setT('hpTxt', `${Math.ceil(Math.max(0, P.hp))} / ${Math.round(S.maxHp)}`); setT('waveTxt', (RUN.endless ? `Night ${Math.max(1, wave)} · endless` : `Night ${Math.max(1, wave)} / ${FINAL_NIGHT}`)); setT('objTxt', objText());
  const left = queue.length + enemies.length, sg = RUN.sg, quiet = sg && sg.lull > 0 && enemies.filter(e => !e.dead && !e.dormant).length <= 3; setT('waveSub', (!wave ? 'Get ready' : evac && !evac.leave ? 'Get to the chopper' : RUN.jobPend && nightDone ? 'Convoy calling…' : nightDone && !left && interT > 0 ? (crates.some(c => c.dawn && !c.open) && interT <= 4.05 && (RUN.dawnX || 0) < 14 ? 'Drop waiting · Enter to skip' : `Next night in ${Math.ceil(interT)} · Enter to start`) : quiet ? (sg.i >= sg.cuts.length ? 'Quiet · last surge next' : 'Quiet · more coming') : left ? (sg && nightLive && !nightDone ? `Surge ${Math.min(sg.i + 1, 3)} of 3 · ${left} still walking` : `${left} still walking`) : obj && !obj.done ? 'Finish the job' : 'Hold on'));
  { const w = ev && !nightDone && !evac ? ev : null; if (hc.wx !== w) { hc.wx = w; const t = $('wxTag'); t.hidden = !w; if (w) { t.textContent = EV_NAME[w]; t.className = 'wx ' + w; } HUDF.t = 0; } } /* the weather, as a small tag */ setT('scoreTxt', score.toLocaleString());
  const mult = 1 + Math.min(4, Math.floor(combo / 10) * 0.5); setT('chain', combo >= 10 ? `Chain ${combo} · ×${mult.toFixed(1)} score` : combo >= 5 ? `Chain ${combo} · ×1.5 at 10` : '');
  { const gk = P.owned.map(g => g + P.mag[g]).join() + JSON.stringify(P.ammo) + P.gun + (P.reload > 0); if (hc.guns !== gk) { hc.guns = gk; $('gunRow').innerHTML = P.owned.map((g, i) => { const G = GUNS[g]; return `<span class="${P.gun === g ? 'on' : ''}${hasAmmo(g) ? '' : ' empty'}"><b>${i + 1}</b>${G.name}<em class="${P.reload > 0 && P.gun === g ? 'rl' : ''}">${P.mag[g] + ' / ' + (G.ammo ? P.ammo[G.ammo] : '∞')}</em></span>`; }).join(''); } }
  { const k = buddies.map(b => b.nm + b.tr + (b.down > 0 ? 'd' + Math.ceil(b.down) : Math.round(b.hp / b.max * 20))).join(); if (hc.squad !== k) { hc.squad = k; $('squad').innerHTML = buddies.map(b => { const f = b.down > 0 ? b.down / (b.downMax || 12) : b.hp / b.max; return `<div class="sq${b.down > 0 ? ' dn' : f < 0.5 ? ' hurt' : ''}"><span><b>${b.nm || 'Backup'}</b> · ${b.down > 0 ? `down ${Math.ceil(b.down)} s` : TRAITS[b.tr] ? TRAITS[b.tr].name : ''}</span><div class="thin"><i style="transform:scaleX(${clamp(f, 0, 1).toFixed(2)})"></i></div></div>`; }).join(''); HUDF.t = 0; } } // your people, by name
  setT('lv', `Level ${level}`); setB('xpFill', xp / xpNeed); setB('dashFill', 1 - P.dashCd / S.dashCd); setB('abFill', 1 - (P.abT || 0) / abCd()); { const rd = !(P.abT > 0), lt = rd ? AB().name + ' · E' : `${AB().name} · ${Math.ceil(P.abT)} s`; if (hc.abL !== lt) { hc.abL = lt; $('abLbl').textContent = lt; } if (hc.abRd !== rd) { hc.abRd = rd; const r = $('abRow'); r.classList.toggle('ready', rd); r.classList.remove('pulse'); if (rd) { void r.offsetWidth; r.classList.add('pulse'); } } }
  if (boss && !boss.dead) { setB('bossFill', boss.hp / boss.maxHp); setB('bossStg', (boss.stg || 0) / (boss.maxHp * 0.05)); const ct = boss.btype === 'chief' && !boss.tankGone; if (hc.tankOn !== ct) { hc.tankOn = ct; $('tankWrap').hidden = $('tankLbl').hidden = !ct; } if (ct) setB('bossTank', boss.tank / (boss.maxHp * 0.1)); const ht = bossHint(boss); if ($('banner').classList.contains('show')) underBoss($('banner')); if (hc.bhint !== ht) { hc.bhint = ht; $('bossHint').textContent = ht; } }
}
