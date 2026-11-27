/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// How often a frame is drawn: in play, the cap set in Settings (60 by default, or 30, or the screen's own); the menu
// behind its panel at 30; a still screen (paused) at 20. A capped frame rate never pulls the resolution down.
import { openGame, check } from './lib/harness.mjs';

export const name = 'pacing: frames drawn at the cap, fewer on the menu and still screens';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b);
  await pg.bringToFront();
  await ev('window.__nr = 1'); // (frames without the drawing: a software GPU takes a second over each, and pacing is the point)
  const rate = async () => {
    await ev(
      `(() => { window.__fr = 0; const r = render; if (!window.__wrapped) { window.__wrapped = 1; window.__r0 = r; } 1 })()`
    );
    const n0 = await ev('GS.frameN || 0');
    const t0 = Date.now();
    await pg.waitForTimeout(2000);
    const n1 = await ev('GS.frameN || 0');
    return Math.round(((n1 - n0) * 1000) / (Date.now() - t0));
  };
  await ev(`(() => { GS.meta.hud.cap = 60; 1 })()`);
  const menu = await rate();
  const vMenu = await ev('viewW');
  await ev(
    `(() => { initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; __god(); GS.interT = 999; 1 })()`
  );
  await pg.waitForTimeout(500);
  const play60 = await rate();
  const vPlay = await ev('viewW');
  await ev(`(() => { GS.meta.hud.cap = 30; 1 })()`);
  const play30 = await rate();
  const rs30 = await ev('GS.rsCap === GS.RS_MAX');
  await ev(`(() => { GS.meta.hud.cap = 60; GS.state = 'pause'; 1 })()`);
  const pause = await rate();
  await ev(`(() => { GS.state = 'play'; 1 })()`);
  await pg.close();
  check(menu >= 25 && menu <= 35, `the menu should draw about 30 a second: ${menu}`);
  check(play60 >= 50 && play60 <= 63, `play at the default cap should draw about 60: ${play60}`);
  check(play30 >= 25 && play30 <= 33, `play capped at 30 should draw about 30: ${play30}`);
  check(rs30, 'a 30 cap should not pull the resolution down');
  check(pause >= 15 && pause <= 23, `paused should draw about 20: ${pause}`);
  check(vPlay > vMenu * 1.3, `the title's camera is closer in, and a run's back out: ${vMenu} then ${vPlay}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `menu ${menu}, play ${play60} (cap 60) / ${play30} (cap 30), paused ${pause} frames a second`;
}
