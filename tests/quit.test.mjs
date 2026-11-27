/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Quitting a run from the pause. The pause freezes the whole mix; quitting must not leave it frozen in place (a frozen
// mix would wait for your next click and play a second of the run, and the title would sit silent asking to be tuned
// in). So: the run's band and its held notes are stopped for good, the sound wakes, everything is quiet while the short
// tails die, then the volume comes back for the title, by itself.
import { openGame, check } from './lib/harness.mjs';

export const name = "quit: no sound from the run you left, and the title's own sound back by itself";
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
  // a pause and back: the sound slides out before it freezes (a cut mid-sound clicks, and the end of the chain would keep
  // that last scrap to pop out on waking), and slides back in after
  const frozen = async () => {
    for (let i = 0; i < 40 && (await ev(`AC.state`)) !== 'suspended'; i++) await pg.waitForTimeout(100);
  }; // the freeze comes once the slide is done, on a timer that runs late on a busy page
  await ev(`(() => { setPause(true); 1 })()`);
  await frozen();
  const p1 = await ev(`[AC.state, +master.gain.value.toFixed(3)]`);
  await ev(`(() => { setPause(false); 1 })()`);
  await pg.waitForTimeout(400);
  const p2 = await ev(`[AC.state, +master.gain.value.toFixed(3)]`);
  await ev(`(() => { setPause(true); 1 })()`);
  await frozen();
  await ev(`(() => { $('quitBtn').click(); $('quitBtn').click(); 1 })()`); // asked once, then sure
  for (let i = 0; i < 20 && (await ev(`AC.state`)) !== 'running'; i++) await pg.waitForTimeout(25); // (the wake)
  const q = await ev(
    `(() => ({ st: AC.state, t: AC.currentTime, menu: !$('menu').hidden, gs: GS.state, gate: musGate.gain.value }))()`
  );
  const t0 = Date.now(),
    trace = [];
  for (let i = 0; i < 16; i++) {
    await pg.waitForTimeout(i ? 200 : 20);
    trace.push(
      await ev(
        `(() => [+(AC.currentTime).toFixed(2), +master.gain.value.toFixed(3), +musGate.gain.value.toFixed(3), MUS.level, AC.state, $('ch9t').textContent])()`
      )
    );
  }
  const vol = await ev(`GS.muted ? 0 : GS.meta.vol.master`),
    longAt = await ev(`window.__long.at`); // 8 s long: on its own it would end some 7 s after the quit
  await pg.close();
  // from the wake (the quit), silence a moment, then a fade back up: the first sample quiet, each one no quieter than
  // the one before, the last at full volume
  const early = trace.filter(r => r[1] < vol - 0.02),
    late = trace[trace.length - 1];
  check(run0.st === 'running', `the run's sound should be running before the pause: ${JSON.stringify(run0)}`);
  check(q.menu && q.gs === 'menu', `quitting should land on the menu: ${JSON.stringify(q)}`);
  check(
    p1[0] === 'suspended' && p1[1] < 0.01 && p2[0] === 'running' && Math.abs(p2[1] - vol) < 0.02,
    `a pause should slide the sound out before freezing it, and back in after: paused ${p1}, back ${p2} (volume ${vol})`
  );
  check(
    q.st === 'running' && trace[0][1] <= 0.03 && trace.every((r, i) => !i || r[1] >= trace[i - 1][1] - 0.005),
    `the sound should wake with the quit, silent a moment, then fade up: quit at ${JSON.stringify(q)}, then ${JSON.stringify(trace.slice(0, 5))}`
  );
  check(
    Math.abs(late[1] - vol) < 0.02 && (late[3] === 'none' || late[3] === 'title'),
    `then the volume should come back, with the run's band stopped (the title's own may be coming in): ${JSON.stringify(late)} (volume ${vol})`
  );
  check(!/tune in/.test(late[5]), `and the title shouldn't be asking to be tuned in: "${late[5]}"`);
  // (its end is stopped at the quit, but reported late on a busy page: what matters is that it is over before the sound
  // comes back, 1.2 s after the quit)
  check(
    longAt !== null && longAt < q.t + 1.2,
    `a voice still talking when you quit should be stopped there, not turned down for a moment: it ended at ${longAt}, the quit at ${q.t}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${early.length} quiet samples, then volume ${late[1]}, band stopped (${Math.round((Date.now() - t0) / 100) / 10} s)`;
}
