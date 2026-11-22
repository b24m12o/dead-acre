/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Windows give way. Fists on a shop's window crack its glass, craze it, and in the end break it; a broken window
// sometimes sets its shop's alarm bell ringing, and the bell draws the dead near it, for twenty seconds or so.
import { openGame, check } from './lib/harness.mjs';

export const name = 'glass: a beaten window cracks, crazes and breaks; a shop bell draws the dead';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    const hold = () => { GS.queue.length = 0; GS.queue.push('skitter'); GS.spawnT = 1e9; };
    const P = GS.P;
    const W = windows.filter(w => !w.broke && !blockPt(w.x, w.y + 20) && !blockPt(w.x + 180, w.y + 40));
    out.windows = W.length;
    if (!W.length) return out;
    const w = W[0];
    // blow by blow: when it cracks, crazes, breaks
    const stages = [];
    for (let k = 1; k <= 20 && !w.broke; k++) { const went = knockWindow(w, w.x); stages.push(went ? 'X' : String(w.crack || 0)); }
    out.stages = stages.join('');
    out.broke = !!w.broke;
    out.face = WVN[WSTN[WST[w.i]]][WVAR[w.i]];
    // another, broken with the bell sure to ring, and one of the dead near it that hasn't noticed you
    GLASS.bell = 1;
    const w2 = W.find(q => q !== w && Math.hypot(q.x - w.x, q.y - w.y) > 300) || W[1];
    out.w2 = !!w2;
    if (!w2) return out;
    P.x = w2.x + 1400; P.y = w2.y + 300;
    const z = makeEnemy('skitter', w2.x + 180, w2.y + 40); z.emerge = 1; z.aw = 0; if (z.run) { z.run = false; z.sp /= 2.5; }
    const flares0 = GS.flares.length;
    breakWindow(w2.i);
    const f = GS.flares.find(q => q.bell);
    out.bell = !!f && GS.flares.length === flares0 + 1;
    for (let i = 0; i < 90; i++) { hold(); P.hp = S.maxHp; update(1 / 60); tickWorld(1 / 60); GS.enemies = GS.enemies.filter(q => q === z); }
    out.lured = !!(z.lure && z.lure.bell);
    let secs = 1.5;
    while (GS.flares.includes(f) && secs < 40) { for (let i = 0; i < 30; i++) { hold(); update(1 / 60); tickWorld(1 / 60); GS.enemies = GS.enemies.filter(q => q === z); } secs += 0.5; }
    out.rang = secs;
    out.came = Math.round(Math.hypot(z.x - w2.x, z.y - w2.y));
    return out;
  })()`);
  await pg.close();
  check(o.windows > 0, `there should be a window to test: ${JSON.stringify(o)}`);
  check(
    o.stages &&
      o.stages.startsWith('01') &&
      o.stages.includes('2') &&
      o.stages.includes('3') &&
      o.stages.endsWith('X') &&
      o.broke &&
      o.face === 'brk',
    `blow by blow, the glass should crack, craze and break: ${JSON.stringify(o)}`
  );
  check(
    !o.w2 || (o.bell && o.lured && o.rang > 15 && o.rang < 25),
    `a shop's bell should ring for twenty seconds or so and draw the dead near it: ${JSON.stringify(o)}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `blows: ${o.stages}; the bell rang ${o.rang} s, one of the dead came to within ${o.came}`;
}
