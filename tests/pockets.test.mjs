/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// No card ever stops a fight: a level earned in the night waits for dawn (Tab still opens it), and comes up on its
// own once the night is cleared. Meanwhile the dead now and then drop a pouch, a small thing kept for the run: it
// comes to you like ammo, a night gives up at most a couple, and they're in the save.
import { openGame, check } from './lib/harness.mjs';

export const name = 'pockets: cards wait for dawn; a dead one’s pouch is yours for the run';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play'; GS.dir = null;
    const P = GS.P, out = {};
    GS.wave = 3; GS.RUN.nextSig = null; startWave(); for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.queue.length = 0;
    const fr = n => { for (let i = 0; i < n; i++) { if (GS.state !== 'play') return; update(1 / 60); tickWorld(1 / 60); P.hp = S.maxHp; P.inv = 9; } };
    // one far off keeps the night going, held where it is
    const far = makeEnemy('skitter', P.x > WW / 2 ? 4 * TILE : WW - 4 * TILE, P.y > WH / 2 ? 4 * TILE : WH - 4 * TILE); far.emerge = 1; far.hp = far.maxHp = 1e6; far.dmg = 0;
    const hold = () => { far.x = far.x; far.vx = far.vy = 0; far.noProg = 0; };
    // a level banked in the fight, all quiet round you: it waits
    GS.xp = GS.xpNeed * 1.05; GS.lvSnooze = false; GS.RUN.lvHold = 0; GS.lastKillT = -99;
    for (let i = 0; i < 60 * 6 && GS.state === 'play'; i++) { hold(); fr(1); }
    out.waited = GS.state === 'play' && GS.nightLive && !GS.nightDone; updateHud(); out.chip = $('lvReady').textContent;
    // Tab: now, because you asked
    out.tab = openLevel() && GS.state === 'levelup'; GS.luOpenT = 0; choose(0); GS.state = 'play';
    // a pouch from the dead: capped at two a night
    const p0 = POUCH.chance; POUCH.chance = 1;
    const kill = () => { const e = makeEnemy('skitter', P.x + 60, P.y); e.emerge = 1; e.v = 0; killEnemy(e, 999, 'bolt'); };
    const s0 = { dmg: S.dmg, rate: S.rate, reloadK: S.reloadK, maxHp: S.maxHp, ammoK: S.ammoK };
    kill(); kill(); kill(); out.dropped = GS.pickups.filter(k => k.k === 'pouch').length;
    for (let i = 0; i < 120; i++) { hold(); fr(1); }
    out.left = GS.pickups.filter(k => k.k === 'pouch' && !k.got).length; out.pockets = { ...(GS.RUN.pockets || {}) };
    out.changed = ['dmg', 'rate', 'reloadK', 'maxHp', 'ammoK'].filter(k => S[k] !== s0[k]).length;
    const d = runData(); out.saved = Object.values(d.RUN.pockets || {}).reduce((a, b) => a + b, 0); out.savedS = ['dmg', 'rate', 'reloadK', 'maxHp', 'ammoK'].filter(k => d.S[k] !== s0[k]).length;
    // the night cleared: the banked level comes up on its own; and no pouches at dawn
    GS.xp = GS.xpNeed * 1.05; far.dead = true; GS.obj = null; GS.queue.length = 0; if (GS.RUN.sg) GS.RUN.sg.horde = null;
    for (let i = 0; i < 60 && !GS.nightDone; i++) fr(1); if (!GS.nightDone) nightCleared(); // the night's last one down: dawn
    let t = 0; for (; t < 60 * 12 && GS.state === 'play'; t++) fr(1);
    out.dawn = GS.nightDone; out.atDawn = GS.state === 'levelup'; out.after = +(t / 60).toFixed(1);
    if (GS.state === 'levelup') { GS.luOpenT = 0; choose(0); }
    GS.state = 'play'; const n0 = GS.pickups.filter(k => k.k === 'pouch').length; GS.RUN.pouchN = {}; kill(); out.dawnDrop = GS.pickups.filter(k => k.k === 'pouch').length - n0;
    POUCH.chance = p0;
    return out;
  })()`);
  await pg.close();
  check(o.waited, 'a banked level came up in the middle of the night');
  check(/dawn/i.test(o.chip), `the chip by the level bar: "${o.chip}"`);
  check(o.tab, 'Tab did not open the cards in the night');
  check(o.dropped === 2, `${o.dropped} pouches from three kills: at most two a night`);
  check(
    o.left === 0 && Object.values(o.pockets).reduce((a, b) => a + b, 0) === 2,
    'pouches not picked up: ' + JSON.stringify(o)
  );
  check(
    o.changed >= 1 && o.saved === 2 && o.savedS === o.changed,
    `the pouches' gains: ${o.changed} stats up, ${o.saved} in the save`
  );
  check(o.dawn && o.atDawn, `at dawn the cards: night cleared ${o.dawn}, cards up ${o.atDawn} after ${o.after} s`);
  check(o.dawnDrop === 0, 'a pouch dropped at dawn');
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `cards held through the night (“${o.chip}”), up ${o.after} s into dawn; two pouches (${Object.keys(o.pockets).join(', ')}) kept in the save`;
}
