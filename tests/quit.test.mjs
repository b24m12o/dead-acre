/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Quitting a run from the pause. The pause freezes the whole mix; quitting must not leave it frozen in place, or your next
// click in the menu (picking another hero, say) wakes it up and a second of the run plays out. So: the run's band and its
// held notes are stopped for good, everything is quiet while the short tails die, then the volume comes back for the menu.
import { openGame, check } from './lib/harness.mjs';

export const name = 'quit: no sound from the run you left on your next click in the menu';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b);
  await ev(
    `(() => { initAudio(); GS.meta.tutDone = true; GS.meta.hero = 'ranger'; begin(); GS.RUN.tut = null; GS.state = 'play'; GS.P.inv = 99; 1 })()`
  );
  // a few seconds of the run, with a long pad ringing to be sure there is something held
  await pg.waitForTimeout(2500);
  // a long pad ringing and a long voice clip going, as the radio's would be mid-sentence when you pause
  const run0 = await ev(`(() => {
    mPad([40, 47, 52], AC.currentTime + 0.05, 20, 0.05);
    const b = AC.createBuffer(1, AC.sampleRate * 8, AC.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.sin(i * 0.05) * 0.2;
    const src = AC.createBufferSource(); src.buffer = b; src.connect(radBus); src.start();
    window.__long = { at: null }; src.addEventListener('ended', () => (window.__long.at = AC.currentTime));
    return { st: AC.state, t: AC.currentTime, lv: MUS.level };
  })()`);
  await pg.waitForTimeout(300);
  await ev(`(() => { setPause(true); 1 })()`);
  await pg.waitForTimeout(200);
  await ev(`(() => { $('quitBtn').click(); $('quitBtn').click(); 1 })()`); // asked once, then sure
  await pg.waitForTimeout(100);
  const q = await ev(
    `(() => ({ st: AC.state, t: AC.currentTime, menu: !$('menu').hidden, gs: GS.state, gate: musGate.gain.value }))()`
  );
  // the click in the menu that wakes the sound: another hero's card
  await ev(`(() => {
    const h = [...$('heroes').children].find(c => c.dataset.h !== GS.meta.hero) || $('heroes').children[0];
    $('menu').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    h.click();
    return 1;
  })()`);
  const t0 = Date.now(),
    trace = [];
  for (let i = 0; i < 16; i++) {
    await pg.waitForTimeout(i ? 200 : 20);
    trace.push(
      await ev(
        `(() => [+(AC.currentTime).toFixed(2), +master.gain.value.toFixed(3), +musGate.gain.value.toFixed(3), MUS.level, AC.state])()`
      )
    );
  }
  const vol = await ev(`GS.muted ? 0 : GS.meta.vol.master`),
    longAt = await ev(`window.__long.at`); // 8 s long: on its own it would end some 7 s after the quit
  await pg.close();
  // the clock stood still from the pause until that click: from then, silence for 1.2 s and a 0.8 s fade back up. A sample
  // may land late on a busy machine, so each one is held to where the fade should be by then, not to a fixed window
  const fade = t => vol * Math.min(1, Math.max(0, (t - q.t - 1.2) / 0.8)),
    early = trace.filter(r => r[0] < q.t + 1.95),
    late = trace[trace.length - 1];
  check(run0.st === 'running', `the run's sound should be running before the pause: ${JSON.stringify(run0)}`);
  check(q.menu && q.gs === 'menu', `quitting should land on the menu: ${JSON.stringify(q)}`);
  check(
    q.st === 'suspended' && early.length > 0 && early.every(r => r[1] <= fade(r[0]) + 0.03),
    `the first second after the click in the menu should be silent, then fade up: quit at ${JSON.stringify(q)}, then ${JSON.stringify(trace.slice(0, 5))}`
  );
  check(
    Math.abs(late[1] - vol) < 0.02 && late[2] < 0.01 && late[3] === 'none',
    `then the volume should come back, with the run's band still stopped: ${JSON.stringify(late)} (volume ${vol})`
  );
  check(
    longAt !== null && longAt < q.t + 1,
    `a voice still talking when you quit should be stopped there, not turned down for a moment: it ended at ${longAt}, the quit at ${q.t}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${early.length} quiet samples, then volume ${late[1]}, band stopped (${Math.round((Date.now() - t0) / 100) / 10} s)`;
}
