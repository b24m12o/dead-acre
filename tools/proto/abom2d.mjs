/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// PROTOTYPE, for comparison only: films today's in-game Abomination entrance the same way as abom3d.mjs (same size,
// same crop, camera held on it), so the two can be watched side by side.
//   node tools/proto/abom2d.mjs [out.mp4] [--fps 24] [--secs 6.4]
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { browser, openGame } from '../../tests/lib/harness.mjs';
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/abom2d.mp4';
const FPS = +arg('--fps', 24),
  SECS = +arg('--secs', 6.4);
const FR = join(dirname(OUT), 'abom2d-frames');
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR, { recursive: true });
const b = await browser();
try {
  const { pg, ev } = await openGame(b, { noFrames: true });
  await pg.setViewportSize({ width: 1280, height: 720 });
  await pg.addStyleTag({ content: 'body > *:not(#gl){visibility:hidden!important} #gl{visibility:visible!important}' });
  await ev(
    `(() => { initAudio(); GS.meta.tutDone = true; GS.meta.bossSeen = {}; startPractice('abom'); GS.rsCap = GS.RS_MAX; resize(); __god(); return 1; })()`
  );
  // on to the moment it comes out, less a second
  for (let i = 0; i < 600 && (await ev('GS.state')) !== 'cine'; i++)
    await ev('update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); 1');
  while ((await ev('CINE.t')) < (await ev('CINE.cardAt - 0.55 - 1')))
    await ev('update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); 1');
  const N = Math.round(SECS * FPS);
  for (let i = 0; i < N; i++) {
    await ev(`(() => { for (let k = 0; k < ${60 / FPS}; k++) { if (GS.state === 'cine' || GS.state === 'play') update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); }
      const e = GS.boss || CINE.boss; if (e) { cam.x = e.x - viewW / 2; cam.y = e.y + 40 - viewH / 2; } render(); return 1; })()`);
    await pg.screenshot({ path: join(FR, `f${String(i).padStart(4, '0')}.png`) });
  }
  execFileSync('ffmpeg', [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(FPS),
    '-i',
    join(FR, 'f%04d.png'),
    '-vf',
    'crop=960:540:160:90',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-pix_fmt',
    'yuv420p',
    OUT,
  ]);
  console.log('wrote', OUT);
} finally {
  await b.close();
}
