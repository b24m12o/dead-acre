/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The crowd's moan follows how many of the dead are up and near you: none for a handful, nearly full for eighty,
// never more than seven groans at once, gone a few seconds after they are. Each special infected has its own tell
// within earshot and none from far off. Mute silences it all.
import { openGame, check } from './lib/harness.mjs';

export const name = 'crowd: the moan of the many, and the specials’ tells';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await ev('initAudio(); 1');
  for (let i = 0; i < 40 && !(await ev('!!(SBV && SBV.zgroan && SBV.zgroan.length && sfxBus)')); i++)
    await pg.waitForTimeout(250); // the recorded groans decode in their own time
  const o = await ev(`(() => {
    GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    GS.wave = 6; startWave(); GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    const P = GS.P, out = {};
    const fr = s => { for (let i = 0; i < s * 60; i++) { update(1 / 60); tickWorld(1 / 60); P.hp = S.maxHp; P.held = null; if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } out.most = Math.max(out.most || 0, GS.crowd.n); } };
    const ring = (n, lo = 300, hi = 850, f = (x, y) => makeEnemy('skitter', x, y)) => {
      let m = 0;
      for (let t = 0; m < n && t < n * 40; t++) { const a = Math.random() * 6.283, d = lo + Math.random() * (hi - lo), x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d; if (blockPt(x, y)) continue; const e = f(x, y); e.emerge = 1; e.aw = 9; e.hp = e.maxHp = 5000; m++; }
      return m;
    };
    const clear = () => { for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; };
    ring(5); fr(2); out.five = GS.crowd.level;
    clear(); ring(80, 450, 850); fr(2.5); out.eighty = GS.crowd.level; out.takes = GS.crowd.takes;
    clear(); fr(3); out.after = GS.crowd.level;
    // the tells: a climber and a dragger near, a spore held still far off
    GS.tells = { climb: 0, spore: 0, drag: 0 };
    ring(1, 350, 450, (x, y) => makeSpecial('climb', x, y));
    ring(1, 350, 450, (x, y) => makeSpecial('drag', x, y));
    ring(1, 980, 1040, (x, y) => { const e = makeSpecial('spore', x, y); e.sp = 0; e.dormant = false; return e; });
    for (let i = 0; i < 300; i++) { for (const e of GS.enemies) if (e.kind === 'spore') { e.vx = e.vy = 0; const a = Math.atan2(e.y - P.y, e.x - P.x); if (Math.hypot(e.x - P.x, e.y - P.y) < 950) { e.x = P.x + Math.cos(a) * 1000; e.y = P.y + Math.sin(a) * 1000; } } fr(1 / 60); }
    out.near = { ...GS.tells };
    clear(); GS.tells = { climb: 0, spore: 0, drag: 0 };
    ring(1, 350, 450, (x, y) => makeSpecial('spore', x, y)); fr(5);
    out.spore = GS.tells.spore;
    return out;
  })()`);
  await ev('setMuted(true); 1');
  await pg.waitForTimeout(500); // mute ramps the master down over a few hundredths of a second
  o.muted = await ev('master ? +master.gain.value.toFixed(4) : -1');
  await ev('setMuted(false); 1');
  await pg.close();
  check(o.five === 0, `five of the dead nearby should make no crowd: ${o.five}`);
  check(o.eighty >= 0.9, `eighty should make nearly the full crowd: ${o.eighty.toFixed(2)}`);
  check(o.most <= 7, `never more than seven groans at once: ${o.most}`);
  check(o.takes > 0, 'the crowd should play groans');
  check(o.after === 0, `three seconds after they are gone the crowd should be quiet: ${o.after}`);
  check(
    o.near.climb >= 1 && o.near.drag >= 1,
    `the climber and dragger should each be heard within 5 s: ${JSON.stringify(o.near)}`
  );
  check(o.near.spore === 0, `a spore past 900 px should not be heard: ${o.near.spore}`);
  check(o.spore >= 1, `a spore nearby should be heard within 5 s: ${o.spore}`);
  check(o.muted === 0, `mute should silence everything: master gain ${o.muted}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `5 → ${o.five}, 80 → ${o.eighty.toFixed(2)}, at most ${o.most} groans at once, quiet 3 s after; tells ${JSON.stringify(o.near)}`;
}
