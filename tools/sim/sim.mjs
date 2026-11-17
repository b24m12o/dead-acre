/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Balance simulation, apart from the game: the test bot plays whole campaigns with random cards, random heroes and
// random ways, and each run is written as one line of JSON. When the bot is eaten it gets back up at full health and
// plays on, so every night of every run is measured; the death is written down (which night, what got it).
//   node tools/sim/sim.mjs --runs 40 --out /tmp/sim/base.jsonl [--hero ranger] [--setup "GS.meta..."]
// then: node tools/sim/report.mjs /tmp/sim/base.jsonl
import { appendFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { browser, openGame, ROOT } from '../../tests/lib/harness.mjs';
import { RUN } from '../../tests/campaign.test.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : d;
};
const RUNS = +arg('runs', 10),
  PAR = +arg('par', 1), // two at once is slower than one after the other here: they fight over the software GPU
  OUT = arg('out', '/tmp/sim/runs.jsonl'),
  HERO = arg('hero', ''),
  SETUP = arg('setup', ''),
  VERBOSE = process.argv.includes('--verbose'),
  UNTIL = +arg('until', 99); // stop after this night
mkdirSync(dirname(OUT), { recursive: true });

// the campaign's run, made mortal: no topping up every step, and a death is written down before the bot gets up
const swap = (s, a, b) => {
  if (!s.includes(a)) throw new Error('the campaign run changed; update tools/sim: ' + a);
  return s.replace(a, b);
};
let PLAY = RUN.replace('%s', 'true').replace('%s', JSON.stringify(arg('prefer', 'random'))); // --prefer molotov,hull: take those cards whenever offered
PLAY = swap(PLAY, 'if (GOD) GS.P.hp = S.maxHp;', '');
PLAY = swap(PLAY, 'window.__saved = (window.__saved || 0) + 1;', 'window.__death();');
// a stalled dawn: where the way on is, and whether it can be reached
PLAY = swap(PLAY, 'nightDone: GS.nightDone,', 'nightDone: GS.nightDone, dawn: window.__dawn(),');
// what hurt the bot, night by night, and each death
const WATCH = `(() => {
  const H = (window.__hurt = {}), F = (window.__how = {}), D = (window.__died = []);
  // which bit of the game dealt it: the first function on the stack past this wrapper and hurtPlayer (and for a blast, a fire or
  // something put off till later, what set it off)
  const how = () => { const ls = (new Error().stack || '').split('\\n'), f = i => { const m = /at (?:Object\\.)?([\\w$.]+)/.exec(ls[i] || ''); return m ? m[1] : '?'; }; const a = f(3); return a === 'explode' || a === 'updateFire' || a === 'fn' ? a + '<' + f(4) : a; };
  window.__death = () => { D.push({ w: GS.wave, by: String(GS.P.lastBy || '?'), lvl: GS.level }); GS.P.inv = 1.5; };
  // when each night starts and is cleared (game seconds): how long the fight took, and how long the dawn after it
  const CL = (window.__clock = {}), sw0 = startWave, nc0 = nightCleared;
  startWave = function () { const r = sw0.apply(this, arguments); (CL[GS.wave] = CL[GS.wave] || {}).start = GS.time; return r; };
  nightCleared = function () { const w = GS.wave, had = GS.nightDone, r = nc0.apply(this, arguments); if (!had && GS.nightDone) (CL[w] = CL[w] || {}).clear = GS.time; return r; };
  // where the bot has been, every 2 s of the last 40: standing still, or going round in circles
  const TR = (window.__trail = []), tw0 = tickWorld;
  tickWorld = function () { const r = tw0.apply(this, arguments); if (GS.P && (TR.t ?? -9) <= GS.time - 2) { TR.t = GS.time; TR.push([Math.round(GS.P.x), Math.round(GS.P.y)]); if (TR.length > 20) TR.shift(); } return r; };
  window.__dawn = () => {
    const T = GS.truck, O = GS.roadOut, w = wayOut(), R = v => Math.round(v);
    const reach = (x, y) => (typeof flow !== 'undefined' && flow ? flow[Math.floor(y / TILE) * MW + Math.floor(x / TILE)] : -1);
    return { since: CL[GS.wave] && CL[GS.wave].clear ? Math.round(GS.time - CL[GS.wave].clear) : -1, mo: GS.RUN.moveOut, interT: +GS.interT.toFixed(1), state: GS.state, layout: typeof LAYOUT !== 'undefined' ? LAYOUT : '?',
      truck: T && { x: R(T.x), y: R(T.y), gone: !!T.gone, ride: !!T.ride, parked: !!T.parked, dry: !!T.dry, drive: !!T.drive, board: +(T.board || 0).toFixed(2),
        fuel: T.fuel, garage: T.garage && { open: !!T.garage.open }, cans: T.cans && T.cans.map(c => [R(c.x), R(c.y), c.got ? 1 : 0, reach(c.x, c.y)]) },
      trail: TR.slice(), fires: (GS.firePools || []).filter(f => Math.hypot(f.x - GS.P.x, f.y - GS.P.y) < 300).length,
      burning: (typeof cars !== 'undefined' ? cars : []).filter(c => c.fire && !c.dead && Math.hypot(c.x - GS.P.x, c.y - GS.P.y) < 400).length,
      road: O && { x: R(O.x), y: R(O.y), gone: !!O.gone, reach: reach(O.x, O.y) }, way: w && { x: R(w.x), y: R(w.y), label: w.label, reach: reach(w.x, w.y) } };
  };
  const B = (window.__boons = { drop: {}, took: {} }), bd0 = boonDrop, bt0 = tickBoons; // game changers: dropped, and picked up
  boonDrop = function () { const n = (GS.boonDrops || []).length, r = bd0.apply(this, arguments); if ((GS.boonDrops || []).length > n) { const k = GS.boonDrops[GS.boonDrops.length - 1]; (B.drop[GS.wave] = B.drop[GS.wave] || []).push(k.id); } return r; };
  tickBoons = function () { const n = (GS.boonDrops || []).length, ids = (GS.boonDrops || []).map(k => k.id), r = bt0.apply(this, arguments); if ((GS.boonDrops || []).length < n && GS.P) for (const id of ids) if (!GS.boonDrops.some(k => k.id === id) && ((GS.P.boons || {})[id] > 0 || id === 'bag' || id === 'drum')) (B.took[GS.wave] = B.took[GS.wave] || []).push(id); return r; };
  const fp0 = firePool; // each patch of burning ground remembers what lit it
  firePool = function () {
    const r = fp0.apply(this, arguments), f = GS.firePools[GS.firePools.length - 1];
    if (f) { const ls = (new Error().stack || '').split('\\n'), m = /at (?:Object\\.)?([\\w$.]+)/.exec(ls[2] || ''); f.src = m ? m[1] : '?'; }
    return r;
  };
  const under = () => { for (const f of GS.firePools) if (Math.hypot(f.x - GS.P.x, f.y - GS.P.y) < f.r) return f.src || '?'; return ''; };
  const hp0 = hurtPlayer;
  hurtPlayer = function () {
    const h = GS.P.hp, r = hp0.apply(this, arguments), d = h - GS.P.hp;
    if (d > 0) {
      const w = (H[GS.wave] = H[GS.wave] || {}), k = String(GS.P.lastBy || '?'); w[k] = Math.round((w[k] || 0) + d);
      const f = (F[GS.wave] = F[GS.wave] || {}), h = k + ' / ' + how() + (k === 'fire' ? ' <' + under() : '') + (GS.boss && !GS.boss.dead && k === bossOf(GS.boss) ? ' / ' + GS.boss.st : ''); f[h] = Math.round((f[h] || 0) + d);
    }
    return r;
  };
  return 1;
})()`;
// what a player sees and steps around that the test bot walks into: burning ground, burning grass, a car about to blow
const CLEAR = `(() => {
  const k0 = __kmApply, CARS = typeof cars !== 'undefined' ? cars : [];
  const away = (x, y, r, w) => { const dx = GS.P.x - x, dy = GS.P.y - y, d = Math.hypot(dx, dy) || 1; if (d < r) { const f = w * (1 - d / r) + 0.6; push.x += dx / d * f; push.y += dy / d * f; } };
  const push = { x: 0, y: 0 };
  __kmApply = window.__kmApply = () => {
    push.x = push.y = 0;
    if (GS.P && GS.state === 'play') {
      for (const f of GS.firePools || []) away(f.x, f.y, f.r + 45, 1);
      for (const g of GS.grassFire || []) away(g.x, g.y, 60, 1);
      for (const c of CARS) if (c.fire && !c.dead) away(c.x, c.y, carBlastR(c) + 50, 2);
    }
    if (push.x || push.y) { const l = Math.hypot(push.x, push.y); __pad.lx = __pad.lx * 0.25 + push.x / l; __pad.ly = __pad.ly * 0.25 + push.y / l; }
    k0();
  };
  return 1;
})()`;
const HEROES = ['ranger', 'breacher', 'grenadier'];

async function one(b, i) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const hero = HERO || HEROES[i % HEROES.length];
  try {
    await ev(
      `(() => { initAudio(); GS.meta.chal = Object.assign(GS.meta.chal || {}, { night10: true, evac1: true }); GS.meta.district = 'town'; GS.meta.hero = ${JSON.stringify(hero)}; ${SETUP}; begin(false); return 1; })()`
    );
    await ev(readFileSync(join(ROOT, 'tests/bot/bot.js'), 'utf8') + ';0');
    await ev('window.__skills = true; 1');
    await ev(CLEAR);
    await ev(WATCH);
    if (UNTIL < 99) await ev(`window.__hook = N => (GS.wave > ${UNTIL} ? 'stop' : 0); 1`);
    if (VERBOSE) {
      pg.on('console', m => m.text().startsWith('sim ') && console.log(`  [${i}] ${m.text()}`));
      await ev(
        `window.__hook = N => { if (N.w !== window.__lw) { window.__lw = N.w; console.log('sim night ' + N.w + ' t ' + Math.round(GS.time) + ' died ' + window.__died.length); } }; 1`
      );
    }
    const t0 = Date.now();
    const r = JSON.parse(await ev(PLAY));
    const died = JSON.parse(await ev('JSON.stringify(window.__died)')),
      hurt = JSON.parse(await ev('JSON.stringify(window.__hurt)')),
      how = JSON.parse(await ev('JSON.stringify(window.__how)')),
      clock = JSON.parse(await ev('JSON.stringify(window.__clock)')),
      maxHp = await ev('Math.round(S.maxHp)'),
      brk = await ev('window.__brk || null'),
      boons = JSON.parse(await ev('JSON.stringify(window.__boons || null)'));
    const nights = {};
    for (const [w, n] of Object.entries(r.nights))
      if (+w > 0)
        nights[w] = {
          t: n.t,
          dmg: n.dmg,
          healed: n.healed,
          minHp: n.minHp,
          spawned: n.spawned,
          hp: n.hpSpawned,
          kills: n.kills,
          lvl: n.lvl,
          picks: n.picks,
          dry: n.dry,
          ammoMin: n.ammoMin,
          obj: n.obj,
          objOk: n.objOk,
          stuck: !!(n.stuck || n.evacStuck),
          ...(n.stuck || n.evacStuck ? { why: JSON.stringify(n.stuck || n.evacStuck).slice(0, 5000) } : {}),
          by: hurt[w] || {},
          how: how[w] || {},
          fight: clock[w] && clock[w].clear ? Math.round(clock[w].clear - clock[w].start) : -1, // seconds to clear the night
          dawn: clock[w] && clock[w].clear && clock[+w + 1] ? Math.round(clock[+w + 1].start - clock[w].clear) : -1, // and the dawn after it
        };
    const line = {
      i,
      hero,
      end: r.end,
      wave: r.wave,
      place: r.district,
      maxHp,
      died,
      nights,
      via: r.via,
      brk,
      boons, // the game changers dropped, night by night, and which the bot happened to pick up
      errs: errs.slice(0, 3),
      wall: Math.round((Date.now() - t0) / 1000),
    };
    appendFileSync(OUT, JSON.stringify(line) + '\n');
    return line;
  } finally {
    await pg.close();
  }
}

let next = 0,
  done = 0;
const t0 = Date.now();
await Promise.all(
  Array.from({ length: PAR }, async () => {
    const b = await browser(); // a browser each: pages in one browser share its one (software) GPU process and stall each other
    while (next < RUNS) {
      const i = next++;
      try {
        const l = await one(b, i);
        done++;
        const first = l.died.length ? l.died[0].w : '-';
        console.log(
          `${done}/${RUNS} ${l.hero} ${l.end} n${l.wave} deaths ${l.died.length} first ${first} ${l.wall}s${l.brk ? ' brk ' + l.brk : ''}${l.errs.length ? ' ERR' : ''}`
        );
      } catch (e) {
        console.log(`run ${i} failed: ${String(e).slice(0, 300)}`);
      }
    }
    await b.close();
  })
);
console.log(`${done} runs in ${Math.round((Date.now() - t0) / 60000)} min -> ${OUT}`);
