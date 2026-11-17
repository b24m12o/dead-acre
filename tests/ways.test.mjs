/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Every way to the next place does what its card says: what it gives you when you get there, and on the first
// night there its own trouble (fog, a blood moon, a dog pack, brutes, a horde mid-night, an ambush at nightfall,
// a survivor to get out) and its own dead among the usual ones. The road map draws the way you took, and the
// dawn's countdown says what is coming. Then a minute of each first night runs without a page error. And the choice
// itself: three ways, only where the road crosses into new country (three times a run), from the ways that belong there.
import { openGame, check } from './lib/harness.mjs';

export const name = 'ways: every way to the next place brings its own first night';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const ids = await ev('Object.keys(VIA)');
  // where the choices are, and what each border offers
  const C = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = [];
    const out = { borders: STOPS.map((s, i) => (borderAt(i) ? i : -1)).filter(i => i >= 0), offers: {} };
    for (const [S, w] of [[2, 5], [5, 10], [6, 12]]) {
      const seen = new Set(); let three = true, area = true;
      for (let n = 0; n < 60; n++) {
        GS.RUN.stop = S; GS.wave = w; const o = offerVia();
        if (o.length !== 3 || new Set(o).size !== 3) three = false;
        for (const id of o) { seen.add(id); if (!POOLS[STOPS[S].area].includes(id)) area = false; }
      }
      out.offers[STOPS[S].area] = { three, area, seen: [...seen].sort().join() };
    }
    // inside one country: the card has no ways, only the way on
    GS.RUN.stop = 0; GS.wave = 2; leaveStop('foot'); travelStep();
    { const t = performance.now(); while (performance.now() - t < 650); }
    out.inside = document.querySelectorAll('#routeWays .way').length;
    $('routeGo').click(); out.insideOn = GS.state === 'play' && stopNow() === 1 && !GS.RUN.viaN;
    // what a way leaves on the rest of its country: how long it holds, from each border
    out.hold = [[2, 5], [5, 10], [6, 12]].map(([S, w]) => { GS.RUN.stop = S; GS.wave = w; applyVia('wrecks', ['wrecks', 'road']); const A = GS.RUN.viaA; return [A.w0, A.w1]; }).join(' ');
    GS.RUN.stop = 2; GS.wave = 5; applyVia('checkpoint', ['checkpoint', 'road']);
    out.on = [6, 7, 9, 10, 11].map(w => !!viaStay(w)).join();
    // a night in it: its trouble among the dead (the checkpoint: a riot cop more), and none after the main road
    const shields = () => buildWave(7).filter(t => t === 'shield').length;
    const withIt = shields(); GS.RUN.viaA = null; const without = shields();
    out.trouble = withIt - without;
    GS.RUN.stop = 2; GS.wave = 5; applyVia('road', ['road', 'wrecks']); out.roadNone = !GS.RUN.viaA;
    // each dawn in it: what it keeps giving, once a dawn, and not past its country
    GS.RUN.stop = 2; GS.wave = 5; applyVia('wrecks', ['wrecks', 'road']);
    const s0 = GS.runSeeds; GS.wave = 5; viaDawn(); const sArr = GS.runSeeds - s0; // the arrival dawn: the way's own gain was it
    GS.wave = 6; viaDawn(); viaDawn(); const sDawn = GS.runSeeds - s0; // the dawn before night 7, twice (a Continue)
    GS.wave = 10; viaDawn(); const sOut = GS.runSeeds - s0; // the dawn before night 11: Mill River, past it
    out.dawn = [sArr, sDawn, sOut].join();
    GS.RUN.stop = 2; GS.wave = 5; applyVia('gunshop', ['gunshop', 'road']);
    for (const t of Object.keys(GS.P.ammo)) GS.P.ammo[t] = 0; GS.wave = 7; viaDawn();
    out.ammo = Object.keys(GS.P.ammo).every(t => GS.P.ammo[t] >= Math.round(ammoMax(t) * 0.5));
    out.tag = viaTag(8);
    GS.RUN.viaA = null;
    return out;
  })()`);
  const out = {};
  for (const id of ids) {
    out[id] = await ev(`(() => {
      const ID = ${JSON.stringify(id)};
      initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = [];
      GS.RUN.stop = 1; GS.wave = 5; GS.P.hp = 20; for (const t of Object.keys(GS.P.ammo)) GS.P.ammo[t] = 0;
      GS.RUN.traps = {}; const seeds = GS.runSeeds;
      offerVia = () => [ID, ID === 'road' ? 'pharmacy' : 'road'];
      leaveStop('foot'); travelStep();
      { const t = performance.now(); while (performance.now() - t < 650); }
      const forks = document.querySelectorAll('#route .rmap .rleg.fork').length;
      document.querySelector('#routeWays .way[data-i="0"]').click();
      const o = { forks, state: GS.state, via: GS.RUN.viaN && GS.RUN.viaN.id, log: JSON.stringify(GS.RUN.viaLog),
        tag: viaTag(GS.wave + 1) || (GS.RUN.nextSig && GS.RUN.nextSig.w === GS.wave + 1 ? SIG[GS.RUN.nextSig.s] : ''), hp: GS.P.hp, max: S.maxHp, ammo: Object.values(GS.P.ammo).some(a => a > 0),
        traps: JSON.stringify(GS.RUN.traps), seeds: GS.runSeeds - seeds };
      const P = GS.P;
      startWave();
      o.w = GS.wave; o.ev = GS.ev; o.viaEv = GS.RUN.viaN.ev; o.horde = !!GS.horde; o.obj = GS.obj && GS.obj.type;
      o.near = GS.enemies.filter(e => Math.hypot(e.x - P.x, e.y - P.y) < 420).length;
      const c = {}; for (const t of GS.queue) c[t] = (c[t] || 0) + 1; o.q = c;
      for (let i = 0; i < 60 * 60; i++) { update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } GS.P.hp = S.maxHp; }
      o.ran = GS.state;
      return o;
    })()`);
  }
  // what some ways leave for later: each pays once, where its card says, and is never promised when it can't
  const L = await ev(`(() => {
    const out = {}, said = [], ss = showStreak;
    showStreak = (a, b, ...r) => { said.push(a + ' / ' + b); return ss(a, b, ...r); };
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.RUN.traps = {};
    GS.RUN.stop = 1; GS.wave = 5;
    offerVia = () => ['tanker', 'wrecks', 'road'];
    leaveStop('foot'); travelStep();
    { const t = performance.now(); while (performance.now() - t < 650); }
    out.lines = [...document.querySelectorAll('#routeWays .way')].map(w => (w.querySelector('.wlater') || {}).textContent || '');
    out.forks3 = document.querySelectorAll('#route .rmap .rleg.fork').length;
    out.stayLines = [...document.querySelectorAll('#routeWays .way .wstay')].map(w => w.textContent);
    out.wide = $('routeWays').classList.contains('n3') && $('route').querySelector('.panel').classList.contains('wide');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true })); // too soon: a beat first
    { const t = performance.now(); while (performance.now() - t < 650); }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
    out.key3 = GS.RUN.viaN && GS.RUN.viaN.id;
    out.log3 = JSON.stringify(GS.RUN.viaLog);
    const div = document.createElement('div');
    out.pend = 'tanker@' + laterAt('tanker', 2); // had it been the tanker into Route 9
    // the tanker's jerrycan where a garage truck waits: St. Mary's, with the tanker taken on the way in
    begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.RUN.traps = {};
    GS.RUN.stop = 0; GS.wave = 2; leaveStop('foot'); travelStep();
    { const t = performance.now(); while (performance.now() - t < 650); }
    $('routeGo').click();
    applyVia('tanker', ['tanker', 'road']);
    out.pendT = laterPending().map(l => l.id + '@' + l.at).join();
    drawRoad(div, stopNow() + 1, null); out.pips = div.querySelectorAll('.rpip').length;
    callTruck(); out.cans = GS.truck && GS.truck.cans.length; out.jerryAgain = jerrycan();
    drawRoad(div, stopNow() + 1, null); out.pipsAfter = div.querySelectorAll('.rpip').length;
    out.saidTanker = said.filter(x => /^From the tanker/.test(x)).length;
    // the pile-up: a land mine and a gas drum at the stop after next, once
    GS.RUN.viaLater = []; GS.RUN.stop = 2; GS.RUN.traps = {};
    applyVia('wrecks', ['wrecks', 'road']);
    laterArrive(2); const b0 = (GS.RUN.traps.mine || 0) + (GS.RUN.traps.drum || 0);
    laterArrive(3); const b1 = (GS.RUN.traps.mine || 0) + (GS.RUN.traps.drum || 0);
    laterArrive(3); const b2 = (GS.RUN.traps.mine || 0) + (GS.RUN.traps.drum || 0);
    out.wrecks = [b0, b1, b2].join();
    // the coach: a crate at the stop after next if they lived; nothing if they didn't
    const crates = () => GS.crates.filter(c => !c.gun && !c.open).length;
    GS.RUN.viaLater = []; applyVia('bus', ['bus', 'road']); GS.wave = GS.RUN.viaN.w; laterRescue(true);
    let c0 = crates(); laterArrive(3); laterArrive(3); out.busLived = crates() - c0;
    GS.RUN.viaLater = []; applyVia('bus', ['bus', 'road']); GS.wave = GS.RUN.viaN.w; laterRescue(false);
    c0 = crates(); laterArrive(3); out.busDied = crates() - c0; out.busPend = laterPending().length;
    // the pharmacy: three nights of bandages from the night you get there
    GS.RUN.viaLater = []; GS.wave = 4; GS.nightLive = false; applyVia('pharmacy', ['pharmacy', 'road']);
    out.bandBefore = bandaged(); laterArrive(2); out.bandAt = bandaged();
    GS.wave = 7; GS.nightLive = true; out.bandLast = bandaged();
    GS.wave = 8; laterNight(); out.bandAfter = bandaged(); out.bandPend = laterPending().length;
    // the checkpoint: the next weapon case holds three guns, once
    GS.RUN.viaLater = []; GS.wave = 4; GS.P.owned = ['pistol']; GS.RUN.declined = [];
    applyVia('checkpoint', ['checkpoint', 'road']);
    out.codes = codesDue();
    const gs = nextGuns(codesDue() ? 3 : 2), c = dropCrate(gs[0], gs[1], null, undefined, gs[2]); laterCase(gs.length);
    out.case = gs.length; out.alt2 = !!(c && c.alt2); out.codesAfter = codesDue();
    out.saidCodes = said.filter(x => /^From the checkpoint/.test(x)).length;
    // never promised when the road ahead can't deliver
    GS.RUN.tw = { pistol: true }; out.noCodes = laterLine('checkpoint', 2) === ''; GS.RUN.tw = {};
    out.noTimber = laterLine('wrecks', STOPS.length - 1) === '';
    out.noJerry = laterLine('tanker', STOPS.length - 1) === '';
    // a Continue keeps what's waiting
    GS.RUN.viaLater = []; GS.RUN.stop = 2; applyVia('wrecks', ['wrecks', 'road']); GS.nightLive = false; GS.nightDone = true;
    saveRun(); const d = savedRun(); out.saved = d && (d.RUN.viaLater || []).map(l => l.id + '@' + l.at).join();
    showStreak = ss;
    return out;
  })()`);
  // an arrival with nothing to choose goes on by itself: no click, no key, and a few seconds later you're in the place
  await pg.waitForTimeout(2000); // the last card's van and fade done with
  await ev(
    `(() => { GS.state = 'play'; $('route').hidden = true; GS.RUN.stop = 0; GS.wave = 2; leaveStop('foot'); travelStep(); return 1; })()`
  );
  await pg.waitForTimeout(300);
  const upFirst = await ev(`!$('route').hidden && document.querySelectorAll('#routeWays .way').length === 0`);
  await pg.waitForTimeout((await ev('ROUTE_AUTO')) * 1000 + 1500);
  const auto = await ev(
    `JSON.stringify({ hidden: $('route').hidden || $('route').classList.contains('leaving'), state: GS.state, stop: stopNow() })`
  );
  await pg.close();
  check(upFirst, 'the arrival card did not come up');
  check(
    /"hidden":true/.test(auto) && /"state":"play"/.test(auto),
    'an arrival with nothing to choose waited for a click: ' + auto
  );
  const bad = [];
  const want = (id, ok, what) => ok || bad.push(`${id}: ${what} ${JSON.stringify(out[id])}`);
  for (const id of ids) {
    const o = out[id];
    want(id, o.state === 'play' && o.via === id, 'did not arrive by it');
    want(id, o.forks === 2, 'the map should fork in two (two on offer here)');
    want(
      id,
      JSON.parse(o.log || '[]').some(l => l.s === 2 && l.id === id),
      'the map log should have it'
    );
    want(id, o.w === 6, 'the first night should be night 6');
    want(id, id === 'road' || o.tag, 'the dawn countdown should say what is coming');
    want(id, o.ran === 'play', 'the night should run on');
  }
  want('road', !out.road.viaEv, 'the main road brings nothing of its own');
  want('pharmacy', out.pharmacy.hp === out.pharmacy.max && out.pharmacy.q.spore >= 3, 'patched up, and spores');
  want('gunshop', out.gunshop.ammo && (out.gunshop.q.hound || 0) >= 4, 'ammo, and a dog pack');
  want('hideout', out.hideout.horde, 'a horde mid-night');
  want(
    'checkpoint',
    (out.checkpoint.q.beetle || 0) >= 3 && (out.checkpoint.q.shield || 0) >= 2,
    'brutes and riot police'
  );
  want('wrecks', out.wrecks.seeds >= 80 && out.wrecks.q.lurker >= 3, 'scrap, and lurkers');
  want('bridge', /"mine":3/.test(out.bridge.traps) && out.bridge.near >= 5, 'a trap kit, and an ambush round you');
  want(
    'chapel',
    out.chapel.hp === out.chapel.max && out.chapel.ammo && out.chapel.ev === 'fog' && out.chapel.q.lurker >= 4,
    'patched up and topped up, then fog and lurkers'
  );
  want(
    'yard',
    /"mine":2/.test(out.yard.traps) &&
      /"drum":2/.test(out.yard.traps) &&
      out.yard.seeds >= 40 &&
      (out.yard.q.beetle || 0) >= 3,
    'a trap kit and scrap, then brutes'
  );
  want('tanker', /"drum":2/.test(out.tanker.traps) && out.tanker.ev === 'blood', 'gas drums, and a blood moon');
  want('bus', out.bus.obj === 'rescue', 'a survivor to get out');
  want('river', out.river.ev === 'fog', 'fog');
  const lw = (ok, what) => ok || bad.push(`later: ${what} ${JSON.stringify(L)}`);
  lw(/jerrycan/i.test(L.lines[0]) && /road crew/i.test(L.lines[1]), 'both cards should carry their Later line');
  lw(
    L.stayLines.length === 3 &&
      /rest of Route 9.*jerrycan|rest of Route 9/i.test(L.stayLines[0]) &&
      /Nothing either way/.test(L.stayLines[2]),
    'each way card should say what it leaves on the rest of Route 9 (the main road: nothing)'
  );
  lw(
    L.forks3 === 3 && L.wide && L.key3 === 'road' && /"n":3/.test(L.log3),
    'three ways: three forks, the card three across, and the 3 key takes the third'
  );
  lw(L.pend === 'tanker@4', 'the tanker taken into Route 9 should wait for the quarry, the next truck');
  lw(L.pendT === 'tanker@1' && L.pips === 1, "the tanker should wait at St. Mary's, marked on the map");
  lw(
    L.cans === 2 && !L.jerryAgain && L.pipsAfter === 0 && L.saidTanker === 1,
    'the garage truck should want two cans, once, and the mark go'
  );
  lw(L.wrecks === '0,2,2', 'the pile-up should give a mine and a gas drum at the stop after next, once');
  lw(L.busLived === 1 && L.busDied === 0 && L.busPend === 0, 'the coach cache only if they lived');
  lw(
    !L.bandBefore && L.bandAt && L.bandLast && !L.bandAfter && L.bandPend === 0,
    'bandages for three nights from arrival'
  );
  lw(
    L.codes && L.case === 3 && L.alt2 && !L.codesAfter && L.saidCodes === 1,
    'the next case should hold three guns, once'
  );
  lw(L.noCodes && L.noTimber && L.noJerry, 'no Later line when the road ahead cannot deliver');
  lw(L.saved === 'wrecks@3', 'a Continue should keep what is waiting');
  const cw = (ok, what) => ok || bad.push(`choice: ${what} ${JSON.stringify(C)}`);
  cw(
    C.borders.join() === '2,5,6',
    'the choices should come where the road crosses into Route 9, Mill River and Hollow Hill'
  );
  for (const [a, o] of Object.entries(C.offers)) cw(o.three && o.area, `${a}: three different ways, all from its own`);
  cw(
    /chapel/.test(C.offers['Hollow Hill'].seen) && /yard/.test(C.offers['Hollow Hill'].seen),
    'Hollow Hill has its own ways'
  );
  cw(C.inside === 0 && C.insideOn, 'inside one country there is no choice: on to the next place');
  cw(
    C.hold === '6,10 11,12 13,15',
    'a way should hold to the end of its country: Route 9 to night 10, Mill River 12, Hollow Hill 15'
  );
  cw(C.on === 'false,true,true,true,false', 'its hold: the nights after its first, not past its country');
  cw(
    C.trouble === 1 && C.roadNone,
    'a night in it carries its trouble (the checkpoint: a riot cop more); the main road leaves nothing'
  );
  cw(C.dawn === '0,25,25', 'each dawn in it pays once (not on arrival, not twice on a Continue, not past its country)');
  cw(
    C.ammo && /dogs/i.test(C.tag),
    "the gun shop's dawns fill the spare ammo halfway, and the dawn line says the dogs are still on you"
  );
  check(!bad.length, bad.join('\n        '));
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${ids.length} ways: ambush ${out.bridge.near} round you, horde, rescue, fog, blood moon, packs and brutes`;
}
