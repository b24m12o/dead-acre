/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A test tool, not part of the game: films a boss fight from the test build, frame by frame through the game's own
// renderer, into an MP4 (or stills): its entrance, a stretch of the fight (you stand your ground, unhurt, firing at
// it now and then), and its death. The camera frames you and the boss together.
//   node tools/proto/film-boss.mjs [abom] [out.mp4] [--fps 12] [--fight 9] [--stills 30,80,140]
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { browser, openGame } from '../../tests/lib/harness.mjs';
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const pos = process.argv.slice(2).filter((a, i, A) => !a.startsWith('--') && !(i && A[i - 1].startsWith('--')));
const BT = pos[0] || 'abom',
  OUT = pos[1] || `/tmp/film-${BT}.mp4`,
  FPS = +arg('--fps', 12),
  FIGHT = +arg('--fight', 9),
  STILLS = arg('--stills', null);
const FR = join(dirname(OUT), `film-${BT}-frames`);
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR, { recursive: true });
const want = STILLS ? new Set(STILLS.split(',').map(Number)) : null;
const b = await browser();
try {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await pg.setViewportSize({ width: 1280, height: 720 });
  await pg.addStyleTag({ content: 'body > *:not(#gl){visibility:hidden!important} #gl{visibility:visible!important}' });
  await ev(`(() => { initAudio(); GS.meta.tutDone = true; GS.meta.bossSeen = {}; startPractice('${BT}'); GS.rsCap = GS.RS_MAX; resize(); __god();
    window.__frame = (n, aim) => { for (let i = 0; i < n; i++) { if (GS.state === 'levelup') { GS.luOpenT = 0; choose(0); }
      if (aim && GS.boss && !GS.boss.dead) { GS.P.aimA = Math.atan2(GS.boss.y - GS.P.y, GS.boss.x - GS.P.x); }
      update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); }
      const e = GS.boss || CINE.boss;
      if (e && GS.state !== 'cine') { cam.x = (e.x + GS.P.x) / 2 - viewW / 2; cam.y = (e.y + GS.P.y) / 2 + 20 - viewH / 2; } };
    return 1; })()`);
  let k = 0;
  const shot = async () => {
    if (!want || want.has(k)) {
      await ev('render(); 1');
      await pg.screenshot({ path: join(FR, `f${String(k).padStart(4, '0')}.png`) });
    }
    k++;
  };
  const step = 60 / FPS;
  // the entrance, from the start of its scene to the end
  for (let i = 0; i < 400 && (await ev('GS.state')) !== 'cine'; i++) await ev('__frame(1); 1');
  while ((await ev('GS.state')) === 'cine') {
    await ev(`__frame(${step}); 1`);
    await shot();
  }
  // the fight: you hold your ground and fire at it in bursts
  for (let i = 0; i < FIGHT * FPS; i++) {
    await ev(`(() => { mouse.down = (${i} % ${FPS * 2}) < ${FPS}; __frame(${step}, true); return 1; })()`);
    await shot();
  }
  // its death
  await ev(
    `(() => { mouse.down = false; const e = GS.boss; if (e && !e.dead) { e.hp = 1; hurtEnemy(e, 50, false, Math.cos(GS.P.aimA), Math.sin(GS.P.aimA), 1, 'bolt', e.x, e.y); } return 1; })()`
  );
  for (let i = 0; i < 3 * FPS; i++) {
    await ev(`__frame(${step}); 1`);
    await shot();
  }
  if (errs.length) console.log('page errors:', errs.join(' | ').slice(0, 1500));
  if (!want) {
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-framerate',
      String(FPS),
      '-i',
      join(FR, 'f%04d.png'),
      '-vf',
      'crop=1040:584:120:68',
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
    console.log('wrote', OUT, k, 'frames');
  } else console.log('stills', [...want].join(','), 'of', k);
} finally {
  await b.close();
}
