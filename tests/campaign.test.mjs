/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The long one (about 30 minutes): the bot plays all fifteen nights in town, unkillable, and must make the
// evac. It catches anything that stalls a night, breaks the evac, or throws during a whole run.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { openGame, check, ROOT } from './lib/harness.mjs';

export const name = 'campaign: the bot plays all 15 nights';
export const long = true;
const RUN = String.raw`(()=>{
  const GOD = %s, PICK = %s, seenPk = new WeakSet();
  let N = null; const nights = {}; const mk0 = makeEnemy;
  makeEnemy = function(t, x, y) { const e = mk0.apply(this, arguments); if (N && e) { N.spawned++; N.hpSpawned += e.maxHp; N.types[t] = (N.types[t] || 0) + 1; } return e; };
  const aa0 = addAmmoType; addAmmoType = function(t, k) { const b = P.ammo[t]; const r = aa0.apply(this, arguments); if (N) N.ammoGot[t] = (N.ammoGot[t] || 0) + (P.ammo[t] - b); return r; };
  const choosePick = () => { if (pickSource === 'job') { const j = Math.random() * picks.length | 0; if (N) { N.picks.push(picks[j].id); N.job = picks[j].id; } choose(j); return; } if (pickSource === 'weapon') { if (N) N.picks.push(picks[0].id); choose(0); return; } let i = 0;
    if (PICK !== 'random') { const want = PICK.split(','); const j = picks.findIndex(u => want.includes(u.id)); if (j >= 0) i = j; }
    if (N) N.picks.push(picks[i].id); choose(i); };
  let T = 0, lastHp = P.hp, curW = -1; const cap = 3600;
  const close = () => { N.t = Math.round(T - N.t0); N.kills = kills - N.kills0; N.lvl = level; N.ammoEnd = {}; for (const g of P.owned) { const a = GUNS[g].ammo; if (a) N.ammoEnd[a] = +(P.ammo[a] / ammoMax(a)).toFixed(2); } N.owned = P.owned.join(' '); nights[N.w] = N; };
  const startN = () => { N = { w: wave, t0: T, dmg: 0, minHp: 9, spawned: 0, hpSpawned: 0, types: {}, ammoGot: {}, picks: [], dry: 0, hpDrops: 0, ammoDrops: 0, healed: 0, kills0: kills, obj: obj ? (obj.job || obj.type) : RUN.low ? 'low' : null }; };
  startN();
  while (T < cap && state !== 'over' && state !== 'won' && wave <= FINAL_NIGHT) {
    if (state === 'levelup') { luOpenT = 0; choosePick(); continue; }
    if (state !== 'play') break;
    if (wave !== curW) { if (curW >= 0) close(); curW = wave; startN(); }
    __bot2(); if (evac) { let gx = evac.x, gy = evac.y; { /* walk the flow field backwards from the landing zone: the path to it from here */ let cx = Math.floor(evac.x / TILE), cy = Math.floor(evac.y / TILE); const path = []; for (let k = 0; k < 400; k++) { path.push([cx, cy]); let best = flow[cy * MW + cx], bx = cx, by = cy; for (const [ox, oy] of N8) { const nx = cx + ox, ny = cy + oy; if (isWall(nx, ny) || (ox && oy && (isWall(cx + ox, cy) || isWall(cx, cy + oy)))) continue; const v = flow[ny * MW + nx]; if (v < best) { best = v; bx = nx; by = ny; } } if (bx === cx && by === cy) break; cx = bx; cy = by; } if (path.length > 3) { const w = path[Math.max(0, path.length - 3)]; gx = (w[0] + 0.5) * TILE; gy = (w[1] + 0.5) * TILE; } }
      const dx = gx - P.x, dy = gy - P.y, dl = Math.hypot(dx, dy), de = Math.hypot(evac.x - P.x, evac.y - P.y); if (de > 30) { __pad.lx = dx / (dl || 1); __pad.ly = dy / (dl || 1); } else __pad.lx = __pad.ly = 0; __kmApply(); } update(1/60); tickWorld(1/60); updateCamera(1/60); T += 1/60;
    for (const k of pickups) if (!seenPk.has(k)) { seenPk.add(k); if (k.k === 'hp') N.hpDrops++; else N.ammoDrops++; }
    if (P.owned.some(g => g !== 'pistol' && g !== 'launcher') && P.gun === 'pistol') N.dry += 1/60;
    if (P.hp < lastHp) N.dmg += lastHp - P.hp; else if (P.hp > lastHp) N.healed += P.hp - lastHp;
    N.minHp = Math.min(N.minHp, P.hp / S.maxHp);
    { const ts = ammoTypes(); if (ts.length) { const av = ts.reduce((q, t) => q + ammoFill(t), 0) / ts.length; N.ammoMin = Math.min(N.ammoMin ?? 9, av); N.ammoAvgS = (N.ammoAvgS || 0) + av / 60; } }
    if (nightDone && N.obj && N.obj !== 'low' && N.objOk === undefined) N.objOk = !!(obj && obj.done && !obj.failed);
    if (GOD) P.hp = S.maxHp; lastHp = P.hp;
    if (evac && evac.t > 200) { N.evacStuck = { P: [Math.round(P.x), Math.round(P.y)], E: [Math.round(evac.x), Math.round(evac.y)], d: Math.round(Math.hypot(P.x - evac.x, P.y - evac.y)), hold: +(evac.hold || 0).toFixed(2), down: !!evac.down, leave: evac.leave, held: !!P.held, st: state, inv: P.inv, daze: P.daze, solidP: solidPt(P.x, P.y), flowP: flow[Math.floor(P.y / TILE) * MW + Math.floor(P.x / TILE)], flowE: flow[Math.floor(evac.y / TILE) * MW + Math.floor(evac.x / TILE)], vx: Math.round(P.vx), vy: Math.round(P.vy), pad: [__pad.lx, __pad.ly], keys: [...(typeof keys !== 'undefined' ? keys : [])] }; break; }
    if (T - N.t0 > 420 && !evac) { N.stuck = { en: enemies.map(e => ({ t: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: Math.round(e.hp), st: e.st, dorm: !!e.dormant, em: e.emerge, d: Math.round(Math.hypot(e.x - P.x, e.y - P.y)), solid: solidPt(e.x, e.y), noProg: e.noProg, z: e.z, fly: !!e.fly, dying: e.dying })), q: queue.length, obj: obj && { type: obj.type, done: obj.done, grace: obj.grace, hold: obj.hold }, bossDue, nightDone, P: [Math.round(P.x), Math.round(P.y)] }; break; }
  }
  close(); N.partial = true;
  for (const k in nights) { const n = nights[k]; n.dmg = Math.round(n.dmg); n.hpSpawned = Math.round(n.hpSpawned); n.dry = Math.round(n.dry); n.minHp = +n.minHp.toFixed(2); n.healed = Math.round(n.healed); if (n.ammoMin !== undefined) { n.ammoMin = +n.ammoMin.toFixed(2); n.ammoAvg = +(n.ammoAvgS / Math.max(1, n.t)).toFixed(2); delete n.ammoAvgS; } delete n.t0; delete n.kills0; }
  return JSON.stringify({ hero: RUN.hero, abUsed: window.__abUsed || 0, aboard: (RUN.aboard || []).map(b => b.nm + ":" + b.tr), left: buddies.map(b => b.nm), lost: RUN.lost, end: state, wave, T: Math.round(T), kills, level, maxHp: S.maxHp, LV, nights });
})()`;
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await ev(
    "(() => { initAudio(); meta.chal = Object.assign(meta.chal || {}, { night10: true, evac1: true }); meta.district = 'town'; meta.hero = 'ranger'; begin(false); return 1; })()"
  );
  await ev(readFileSync(join(ROOT, 'tests/bot/bot.js'), 'utf8') + ';0');
  const r = JSON.parse(await ev(RUN.replace('%s', 'true').replace('%s', '"random"')));
  await pg.close();
  const stuck = Object.values(r.nights)
    .filter(n => n.stuck || n.evacStuck)
    .map(n => n.w);
  check(!stuck.length, 'stalled on night(s) ' + stuck.join(', '));
  check(r.end === 'won', `run ended "${r.end}" on night ${r.wave}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `won on night ${r.wave} in ${Math.round(r.T / 60)} game minutes, ${r.kills} kills`;
}
