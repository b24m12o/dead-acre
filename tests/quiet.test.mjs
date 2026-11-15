/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Quiet play. The dead see what is in front of them: one with its back to you doesn't notice you until you are
// almost on it, and a shove finishes it without a sound that carries. A shove also finishes one that is down, but
// never a brute or an armoured one. The Listener is blind: it stands until something makes a noise, runs to where
// the noise was (not to you), has you if you run past it, and goes to a clock with its back turned like the rest.
import { openGame, check } from './lib/harness.mjs';

export const name = 'quiet: backs turned, quiet kills, and the blind one that hunts by sound';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play'; GS.queue = []; GS.enemies.length = 0;
    GS.nightLive = false; GS.interT = 999; GS.wave = 6; GS.meta.tips = { ...(GS.meta.tips || {}), quiet: 1, sp_blind: 1 };
    const P = GS.P, out = {};
    const fr = (n, hold = null) => { for (let i = 0; i < n; i++) { if (hold) hold(); pin(); update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    // the last few of a night always know where you are: a crowd far off keeps these from being the last few
    const crowd = () => { for (let i = 0; i < 7; i++) { const e = makeEnemy('skitter', 60 + i * 30, 60); e.emerge = 0; e.far = true; } };
    const clear = () => { for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; P.shoveCd = 0; P.hp = S.maxHp; P.vx = P.vy = 0; crowd(); };
    const pin = () => { for (const e of GS.enemies) if (e.far) { e.emerge = 0; e.aw = 0; } };
    const shove = a => { P.shoveCd = 0; P.aimA = a; return tryShove(); };
    // open ground: nothing in the way for a long way round
    let spot = null;
    const LOOK = [[150, -40], [150, 40], [260, 0], [60, 170], [330, 0], [120, 0], [200, 0], [70, 0], [-66, 0]]; // every place the test stands something
    for (let t = 0; t < 30000 && !spot; t++) {
      const x = 500 + Math.random() * (WW - 1000), y = 500 + Math.random() * (WH - 1000);
      let ok = true;
      for (let dx = -80; dx <= 360 && ok; dx += 20) for (let dy = -60; dy <= 200 && ok; dy += 20) if (blockPt(x + dx, y + dy)) ok = false;
      for (const [dx, dy] of LOOK) if (ok && !los(x, y, x + dx, y + dy)) ok = false; // and nothing thin in the way of a look
      if (ok && !los(x + 260, y, x + 60, y + 170)) ok = false;
      if (ok) spot = [x, y];
    }
    if (!spot) return { err: 'no open ground' };
    const home = () => { P.x = spot[0]; P.y = spot[1]; P.vx = P.vy = 0; P.aimA = 0; };
    home(); crowd();
    const mk = (dx, dy, a, t = 'skitter') => { const e = makeEnemy(t, P.x + dx, P.y + dy); e.emerge = 1; e.a = a; e.hp = e.maxHp = 60; e.run = false; e.lurk = null; e.shield = null; e.trait = null; e.elite = false; return e; };
    const still = e => { const x = e.x, y = e.y, a = e.a; return () => { e.x = x; e.y = y; e.a = a; e.vx = e.vy = 0; }; };
    // 1. backs turned: at 150 px in the open, the one facing you sees you, the one facing away doesn't
    const toward = mk(150, -40, Math.PI), away = mk(150, 40, 0);
    const h1 = still(toward), h2 = still(away);
    fr(60, () => { h1(); h2(); });
    out.seenFront = toward.aw > 0; out.seenBack = away.aw > 0;
    out.dbg1 = { state: GS.state, los: toward.los, aw: toward.aw, d: Math.hypot(toward.x - P.x, toward.y - P.y), em: toward.emerge, sr: seenFrom(), lure: !!toward.lure, n: GS.enemies.length, q: GS.queue.length, time: GS.time, hp: P.hp, ride: !!P.ride, unaw: toward.unaw };
    // ...until you are right at its back
    away.x = P.x + 50; away.y = P.y; const h3 = still(away);
    fr(30, h3);
    out.seenClose = away.aw > 0;
    out.dbg = { los: away.los, aw: away.aw, d: Math.hypot(away.x - P.x, away.y - P.y), a: away.a, down: away.down, dead: away.dead, em: away.emerge, sr: seenFrom(), lure: !!away.lure, kind: away.kind, st: away.st };
    clear(); home();
    // 2. a quiet kill: behind one that hasn't noticed, one shove, and no noise goes out
    const v = mk(70, 0, 0), hv = still(v);
    fr(20, hv);
    out.unaw = v.unaw === true;
    const nt = NOISE.t;
    out.shove1 = shove(0);
    out.killed = v.dead === true || !(v.hp > 0);
    out.silent = NOISE.t === nt;
    out.count = GS.RUN.metrics.quiet || 0;
    clear(); home();
    // 3. one that has seen you is only thrown down; the next shove finishes it where it lies
    const w = mk(60, 0, Math.PI);
    fr(30);
    w.x = P.x + 60; w.y = P.y;
    out.awake = w.aw > 0;
    shove(Math.atan2(w.y - P.y, w.x - P.x));
    out.downed = w.down > 0 && w.hp > 0;
    fr(20);
    P.x = w.x - 50; P.y = w.y; // thrown back out of reach: a step up to it
    out.stillDown = w.down > 0;
    shove(0);
    out.finished = w.dead === true || !(w.hp > 0);
    clear(); home();
    // 4. not a brute, and not an armoured one, even with their backs turned
    const br = mk(70, -20, 0, 'beetle'), ar = mk(70, 20, 0); ar.trait = 'armored'; ar.elite = true; br.hp = br.maxHp = 400; ar.hp = ar.maxHp = 200;
    const hb = still(br), ha = still(ar);
    fr(20, () => { hb(); ha(); });
    shove(0);
    out.bruteLives = br.hp > 0 && !br.dead; out.armLives = ar.hp > 0 && !ar.dead;
    clear(); home();
    // 5. the Listener: you stand in plain view and it does nothing
    const L = makeSpecial('blind', P.x + 260, P.y); L.emerge = 1; L.a = Math.PI;
    const lx = L.x, ly = L.y;
    fr(180);
    out.stood = Math.hypot(L.x - lx, L.y - ly) < 6 && !(L.aw > 0) && P.hp === S.maxHp;
    // a noise off to one side: it runs there, not at you, and you (standing still) are left alone
    const nx = P.x + 60, ny = P.y + 170;
    makeNoise(nx, ny, 700, false, false);
    let t = 0; while (Math.hypot(L.x - nx, L.y - ny) > 40 && t < 300) { fr(1); t++; }
    out.reached = Math.hypot(L.x - nx, L.y - ny) <= 40; out.took = t / 60;
    out.spared = P.hp === S.maxHp;
    fr(60 * 4);
    out.lostIt = !(L.hot > 0);
    // run past it and it has you
    const hp0 = P.hp;
    L.x = P.x + 120; L.y = P.y; L.hot = 0;
    for (let i = 0; i < 150; i++) { P.vx = i < 40 ? 200 : 0; P.vy = 0; fr(1); }
    out.heardFeet = P.hp < hp0 || Math.hypot(L.x - P.x, L.y - P.y) < 60;
    clear(); home();
    // 6. a clock pulls it like the rest, back turned, and then one shove does it
    const L2 = makeSpecial('blind', P.x + 200, P.y); L2.emerge = 1;
    startFlare(P.x + 330, P.y, true);
    fr(150);
    out.lured = !!L2.lure && Math.hypot(L2.x - (P.x + 330), L2.y - P.y) < 110;
    P.x = L2.x - 66; P.y = L2.y; P.aimA = 0; P.vx = P.vy = 0;
    fr(6);
    out.lureUnaw = L2.unaw === true;
    shove(Math.atan2(L2.y - P.y, L2.x - P.x));
    out.lureKill = L2.dead === true || !(L2.hp > 0);
    // 7. the last of a night: five playing dead and one that can't see. The five don't count, so it comes for you by scent
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; home(); P.hp = S.maxHp;
    for (let i = 0; i < 5; i++) makeLurker(P.x + 60 + i * 40, P.y + 170);
    for (const f of GS.flares) f.alarm = 0; // the clock from the step before is done
    const L3 = makeSpecial('blind', P.x + 330, P.y); L3.emerge = 1; L3.hnT = NOISE.t;
    fr(300);
    out.lastBlind = P.hp < S.maxHp || Math.hypot(L3.x - P.x, L3.y - P.y) < 110;
    out.lastAt = Math.round(Math.hypot(L3.x - P.x, L3.y - P.y));
    // 8. a riot cop at the generator leans on it like the rest: the shove is kept for you
    clear(); home();
    GS.obj = { type: 'gen', x: P.x + 330, y: P.y, hp: 9000, max: 9000 };
    const cop = makeShield(makeEnemy('skitter', P.x + 250, P.y)); cop.emerge = 1; cop.a = Math.PI; cop.aw = 9;
    let bashed = 0;
    fr(900, () => { cop.aw = 9; if (cop.st === 'bashW' || cop.st === 'bash') bashed++; });
    out.copBashed = bashed; out.copGen = Math.round(9000 - GS.obj.hp); out.copAt = Math.round(Math.hypot(cop.x - GS.obj.x, cop.y - GS.obj.y));
    GS.obj = null;
    return out;
  })()`);
  await pg.close();
  check(!o.err, o.err);
  check(
    o.seenFront && !o.seenBack,
    `the one facing you should see you and the one facing away should not: ${o.seenFront} / ${o.seenBack} ${JSON.stringify(o.dbg1)}`
  );
  check(o.seenClose, 'right at its back, it should notice you: ' + JSON.stringify(o.dbg));
  check(
    o.unaw && o.shove1 === 1 && o.killed,
    `a shove should finish one that has not noticed you: unaware ${o.unaw}, caught ${o.shove1}, dead ${o.killed}`
  );
  check(
    o.silent && o.count === 1,
    `a quiet kill should make no noise and be counted: silent ${o.silent}, count ${o.count}`
  );
  check(
    o.awake && o.downed && o.finished,
    `one that saw you should go down, then be finished: awake ${o.awake}, down ${o.downed}, finished ${o.finished}`
  );
  check(
    o.bruteLives && o.armLives,
    `a brute and an armoured one should survive a shove from behind: ${o.bruteLives} / ${o.armLives}`
  );
  check(o.stood, 'the Listener should stand where it is while you stand in plain view');
  check(
    o.reached && o.spared,
    `it should run to the noise and leave you be: reached ${o.reached} in ${o.took} s, spared ${o.spared}`
  );
  check(o.lostIt, 'with nothing more to hear it should lose interest');
  check(o.heardFeet, 'running close to it should bring it onto you');
  check(
    o.lastBlind,
    `with only the ones playing dead left beside it, the Listener should come for you: ${o.lastAt} px away`
  );
  check(
    o.copBashed === 0 && o.copGen > 20,
    `a riot cop at the generator should lean on it, not shove at the air: ${o.copBashed} frames shoving, ${o.copGen} damage, ${o.copAt} px off`
  );
  check(
    o.lured && o.lureUnaw && o.lureKill,
    `a clock should pull it, back turned, for a quiet kill: lured ${o.lured}, unaware ${o.lureUnaw}, killed ${o.lureKill}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `seen from the front only; quiet kill silent; down then finished; Listener to the noise in ${o.took.toFixed(1)} s`;
}
