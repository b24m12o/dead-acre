/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Every way to the next place does what its card says: what it gives you when you get there, and on the first
// night there its own trouble (fog, a blood moon, a dog pack, brutes, a horde mid-night, an ambush at nightfall,
// a survivor to get out) and its own dead among the usual ones. The road map draws the way you took, and the
// dawn's countdown says what is coming. Then a minute of each first night runs without a page error.
import { openGame, check } from './lib/harness.mjs';

export const name = 'ways: every way to the next place brings its own first night';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const ids = await ev('Object.keys(VIA)');
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
    GS.RUN.stop = 0; GS.wave = 2;
    offerVia = () => ['tanker', 'wrecks'];
    leaveStop('foot'); travelStep();
    { const t = performance.now(); while (performance.now() - t < 650); }
    out.lines = [...document.querySelectorAll('#routeWays .way')].map(w => (w.querySelector('.wlater') || {}).textContent || '');
    document.querySelector('#routeWays .way[data-i="0"]').click(); // the tanker, into St. Mary's: left by truck
    const div = document.createElement('div');
    out.pend = laterPending().map(l => l.id + '@' + l.at).join();
    drawRoad(div, stopNow() + 1, null); out.pips = div.querySelectorAll('.rpip').length;
    callTruck(); out.cans = GS.truck && GS.truck.cans.length; out.jerryAgain = jerrycan();
    drawRoad(div, stopNow() + 1, null); out.pipsAfter = div.querySelectorAll('.rpip').length;
    out.saidTanker = said.filter(x => /^From the tanker/.test(x)).length;
    // the pile-up: two boards at the stop after next, once
    GS.RUN.viaLater = []; GS.RUN.stop = 2; GS.RUN.traps = {};
    applyVia('wrecks', ['wrecks', 'road']);
    laterArrive(2); const b0 = GS.RUN.traps.board || 0;
    laterArrive(3); const b1 = GS.RUN.traps.board || 0;
    laterArrive(3); const b2 = GS.RUN.traps.board || 0;
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
  await pg.close();
  const bad = [];
  const want = (id, ok, what) => ok || bad.push(`${id}: ${what} ${JSON.stringify(out[id])}`);
  for (const id of ids) {
    const o = out[id];
    want(id, o.state === 'play' && o.via === id, 'did not arrive by it');
    want(id, o.forks === 2, 'the map should fork in two');
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
  want('wrecks', out.wrecks.seeds >= 50 && out.wrecks.q.lurker >= 3, 'scrap, and lurkers');
  want('bridge', /"mine":2/.test(out.bridge.traps) && out.bridge.near >= 5, 'a trap kit, and an ambush round you');
  want('tanker', /"drum":2/.test(out.tanker.traps) && out.tanker.ev === 'blood', 'gas drums, and a blood moon');
  want('bus', out.bus.obj === 'rescue', 'a survivor to get out');
  want('river', out.river.ev === 'fog', 'fog');
  const lw = (ok, what) => ok || bad.push(`later: ${what} ${JSON.stringify(L)}`);
  lw(/jerrycan/i.test(L.lines[0]) && /timber/i.test(L.lines[1]), 'both cards should carry their Later line');
  lw(L.pend === 'tanker@1' && L.pips === 1, "the tanker should wait at St. Mary's, marked on the map");
  lw(
    L.cans === 2 && !L.jerryAgain && L.pipsAfter === 0 && L.saidTanker === 1,
    'the garage truck should want two cans, once, and the mark go'
  );
  lw(L.wrecks === '0,2,2', 'the pile-up should give two boards at the stop after next, once');
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
  check(!bad.length, bad.join('\n        '));
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${ids.length} ways: ambush ${out.bridge.near} round you, horde, rescue, fog, blood moon, packs and brutes`;
}
