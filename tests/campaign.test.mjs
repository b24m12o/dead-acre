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
  const aa0 = addAmmoType; addAmmoType = function(t, k) { const b = GS.P.ammo[t]; const r = aa0.apply(this, arguments); if (N) N.ammoGot[t] = (N.ammoGot[t] || 0) + (GS.P.ammo[t] - b); return r; };
  const choosePick = () => { if (GS.pickSource === 'job') { const j = Math.random() * GS.picks.length | 0; if (N) { N.picks.push(GS.picks[j].id); N.job = GS.picks[j].id; } choose(j); return; } if (GS.pickSource === 'weapon') { if (N) N.picks.push(GS.picks[0].id); choose(0); return; } let i = 0;
    if (PICK !== 'random') { const want = PICK.split(','); const j = GS.picks.findIndex(u => want.includes(u.id)); if (j >= 0) i = j; }
    if (N) N.picks.push(GS.picks[i].id); choose(i); };
  let T = 0, lastHp = GS.P.hp, curW = -1; const cap = 3600;
  const close = () => { N.t = Math.round(T - N.t0); N.kills = GS.kills - N.kills0; N.lvl = GS.level; N.ammoEnd = {}; for (const g of GS.P.owned) { const a = GUNS[g].ammo; if (a) N.ammoEnd[a] = +(GS.P.ammo[a] / ammoMax(a)).toFixed(2); } N.owned = GS.P.owned.join(' '); nights[N.w] = N; };
  const startN = () => { N = { w: GS.wave, t0: T, dmg: 0, minHp: 9, spawned: 0, hpSpawned: 0, types: {}, ammoGot: {}, picks: [], dry: 0, hpDrops: 0, ammoDrops: 0, healed: 0, kills0: GS.kills, obj: GS.obj ? (GS.obj.job || GS.obj.type) : GS.RUN.low ? 'low' : null }; };
  startN();
  while (T < cap && GS.state !== 'over' && GS.state !== 'won' && GS.wave <= FINAL_NIGHT) {
    if (GS.state === 'levelup') { GS.luOpenT = 0; choosePick(); continue; }
    if (GS.state !== 'play') break;
    if (GS.wave !== curW) { if (curW >= 0) close(); curW = GS.wave; startN(); }
    __bot2(); if (GS.evac) { let gx = GS.evac.x, gy = GS.evac.y; { /* walk the flow field backwards from the landing zone: the path to it from here */ let cx = Math.floor(GS.evac.x / TILE), cy = Math.floor(GS.evac.y / TILE); const path = []; for (let k = 0; k < 400; k++) { path.push([cx, cy]); let best = flow[cy * MW + cx], bx = cx, by = cy; for (const [ox, oy] of N8) { const nx = cx + ox, ny = cy + oy; if (isWall(nx, ny) || (ox && oy && (isWall(cx + ox, cy) || isWall(cx, cy + oy)))) continue; const v = flow[ny * MW + nx]; if (v < best) { best = v; bx = nx; by = ny; } } if (bx === cx && by === cy) break; cx = bx; cy = by; } if (path.length > 3) { const w = path[Math.max(0, path.length - 3)]; gx = (w[0] + 0.5) * TILE; gy = (w[1] + 0.5) * TILE; } }
      const dx = gx - GS.P.x, dy = gy - GS.P.y, dl = Math.hypot(dx, dy), de = Math.hypot(GS.evac.x - GS.P.x, GS.evac.y - GS.P.y); if (de > 30) { __pad.lx = dx / (dl || 1); __pad.ly = dy / (dl || 1); } else __pad.lx = __pad.ly = 0; /* pinned short of the landing zone by the crowd: roll through, as a player would */ if (de < 320 && Math.hypot(GS.P.vx, GS.P.vy) < 70 && GS.P.dashCd <= 0) tryDash(); __kmApply(); } update(1/60); tickWorld(1/60); updateCamera(1/60); T += 1/60;
    for (const k of GS.pickups) if (!seenPk.has(k)) { seenPk.add(k); if (k.k === 'hp') N.hpDrops++; else N.ammoDrops++; }
    if (GS.P.owned.some(g => g !== 'pistol' && g !== 'launcher') && GS.P.gun === 'pistol') N.dry += 1/60;
    if (GS.P.hp < lastHp) N.dmg += lastHp - GS.P.hp; else if (GS.P.hp > lastHp) N.healed += GS.P.hp - lastHp;
    N.minHp = Math.min(N.minHp, GS.P.hp / S.maxHp);
    { const ts = ammoTypes(); if (ts.length) { const av = ts.reduce((q, t) => q + ammoFill(t), 0) / ts.length; N.ammoMin = Math.min(N.ammoMin ?? 9, av); N.ammoAvgS = (N.ammoAvgS || 0) + av / 60; } }
    if (GS.nightDone && N.obj && N.obj !== 'low' && N.objOk === undefined) N.objOk = !!(GS.obj && GS.obj.done && !GS.obj.failed);
    if (GOD) GS.P.hp = S.maxHp; lastHp = GS.P.hp;
    if (GS.evac && GS.evac.down) { const inn = Math.hypot(GS.P.x - GS.evac.x, GS.P.y - GS.evac.y) < 80; N.evIn = (N.evIn || 0) + (inn ? 1 : 0); N.evOut = (N.evOut || 0) + (inn ? 0 : 1); N.holdMax = Math.max(N.holdMax || 0, GS.evac.hold || 0); N.near = Math.max(N.near || 0, GS.enemies.filter(z => !z.dead && Math.hypot(z.x - GS.P.x, z.y - GS.P.y) < 90).length); N.waiting = GS.evac.waiting || N.waiting; }
    if (GS.evac && GS.evac.t > 200) { N.evacStuck = { P: [Math.round(GS.P.x), Math.round(GS.P.y)], E: [Math.round(GS.evac.x), Math.round(GS.evac.y)], d: Math.round(Math.hypot(GS.P.x - GS.evac.x, GS.P.y - GS.evac.y)), hold: +(GS.evac.hold || 0).toFixed(2), down: !!GS.evac.down, leave: GS.evac.leave, held: !!GS.P.held, st: GS.state, inv: GS.P.inv, daze: GS.P.daze, solidP: solidPt(GS.P.x, GS.P.y), flowP: flow[Math.floor(GS.P.y / TILE) * MW + Math.floor(GS.P.x / TILE)], flowE: flow[Math.floor(GS.evac.y / TILE) * MW + Math.floor(GS.evac.x / TILE)], vx: Math.round(GS.P.vx), vy: Math.round(GS.P.vy), pad: [__pad.lx, __pad.ly], keys: [...(typeof keys !== 'undefined' ? keys : [])] }; break; }
    if (T - N.t0 > 420 && !GS.evac) { N.stuck = { en: GS.enemies.map(e => ({ t: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: Math.round(e.hp), st: e.st, dorm: !!e.dormant, em: e.emerge, d: Math.round(Math.hypot(e.x - GS.P.x, e.y - GS.P.y)), solid: solidPt(e.x, e.y), noProg: e.noProg, z: e.z, fly: !!e.fly, dying: e.dying })), q: GS.queue.length, obj: GS.obj && { type: GS.obj.type, done: GS.obj.done, grace: GS.obj.grace, hold: GS.obj.hold }, bossDue: GS.bossDue, nightDone: GS.nightDone, P: [Math.round(GS.P.x), Math.round(GS.P.y)] }; break; }
  }
  close(); N.partial = true;
  for (const k in nights) { const n = nights[k]; n.dmg = Math.round(n.dmg); n.hpSpawned = Math.round(n.hpSpawned); n.dry = Math.round(n.dry); n.minHp = +n.minHp.toFixed(2); n.healed = Math.round(n.healed); if (n.ammoMin !== undefined) { n.ammoMin = +n.ammoMin.toFixed(2); n.ammoAvg = +(n.ammoAvgS / Math.max(1, n.t)).toFixed(2); delete n.ammoAvgS; } delete n.t0; delete n.kills0; }
  return JSON.stringify({ hero: GS.RUN.hero, abUsed: window.__abUsed || 0, aboard: (GS.RUN.aboard || []).map(b => b.nm + ":" + b.tr), left: GS.buddies.map(b => b.nm), lost: GS.RUN.lost, end: GS.state, wave: GS.wave, T: Math.round(T), kills: GS.kills, level: GS.level, maxHp: S.maxHp, LV, nights });
})()`;
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await ev(
    "(() => { initAudio(); GS.meta.chal = Object.assign(GS.meta.chal || {}, { night10: true, evac1: true }); GS.meta.district = 'town'; GS.meta.hero = 'ranger'; begin(false); return 1; })()"
  );
  await ev(readFileSync(join(ROOT, 'tests/bot/bot.js'), 'utf8') + ';0');
  const r = JSON.parse(await ev(RUN.replace('%s', 'true').replace('%s', '"random"')));
  await pg.close();
  const stuck = Object.values(r.nights)
    .filter(n => n.stuck || n.evacStuck)
    .map(n => n.w);
  const detail = Object.values(r.nights)
    .filter(n => n.stuck || n.evacStuck)
    .map(n => JSON.stringify({ evIn: n.evIn, evOut: n.evOut, holdMax: n.holdMax, near: n.near, waiting: n.waiting, ...(n.evacStuck || n.stuck) }).slice(0, 700));
  check(!stuck.length, 'stalled on night(s) ' + stuck.join(', ') + ': ' + detail.join(' | '));
  check(r.end === 'won', `run ended "${r.end}" on night ${r.wave}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `won on night ${r.wave} in ${Math.round(r.T / 60)} game minutes, ${r.kills} kills`;
}
