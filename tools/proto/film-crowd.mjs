/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A test tool, not part of the game: films the street's zombies from the test build, frame by frame through the game's
// own renderer, into an MP4: a night under way, the camera on the nearest of them as they come for you (you stand
// unhurt and fire in bursts at the nearest), at a zoom of your choice. --2d films the pictures instead, to compare.
//   node tools/proto/film-crowd.mjs [out.mp4] [--zoom 2.4] [--fps 12] [--secs 8] [--2d]
import { mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { browser, openGame } from '../../tests/lib/harness.mjs';
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/film-crowd.mp4',
  FPS = +arg('--fps', 12),
  SECS = +arg('--secs', 8),
  ZOOM = +arg('--zoom', 2.4),
  FLAT = process.argv.includes('--2d'),
  STAGE = +arg('--stage', 0);
const FR = join(dirname(OUT), 'film-crowd-frames');
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR, { recursive: true });
const b = await browser();
try {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await pg.setViewportSize({ width: 1280, height: 720 });
  await pg.addStyleTag({ content: 'body > *:not(#gl){visibility:hidden!important} #gl{visibility:visible!important}' });
  for (let i = 0; i < 40 && !(await ev('fig3dOn()')); i++) await pg.waitForTimeout(250);
  await ev(`(() => { window.__Z = ${ZOOM}; opt.b3d = ${!FLAT}; initAudio(); GS.meta.tutDone = true; begin(); GS.rsCap = GS.RS_MAX; resize(); __god();
    for (let i = 0; i < 60 * 10; i++) { if (GS.state === 'levelup') { GS.luOpenT = 0; choose(0); } if (GS.state === 'cine') cineSkip(); update(1 / 60); tickWorld(1 / 60); }
    if (${STAGE}) { // a staged scene: open ground, a few of them walking in from a distance
      let spot = null; for (let t = 0; t < 40000 && !spot; t++) { const x = 500 + Math.random() * (WW - 1000), y = 500 + Math.random() * (WH - 1000); let ok = true;
        for (let dx = -260; dx <= 260 && ok; dx += 20) for (let dy = -260; dy <= 260 && ok; dy += 20) if (blockPt(x + dx, y + dy)) ok = false; if (ok) spot = [x, y]; }
      if (spot) { GS.P.x = spot[0]; GS.P.y = spot[1]; }
      for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.queue.length = 0; GS.corpses.length = 0;
      for (let i = 0; i < ${STAGE}; i++) { const a = -Math.PI / 2 + (i - (${STAGE} - 1) / 2) * 0.42, r = 230 + (i % 3) * 45;
        const e = makeEnemy('skitter', GS.P.x + Math.cos(a) * r, GS.P.y + Math.sin(a) * r); e.emerge = 1; e.trait = null; e.elite = false; e.shield = null; e.kind = null; GS.enemies.push(e); }
      GS.queue.push(...Array(40).fill('skitter')); GS.P.aimA = -Math.PI / 2; }
    window.__cx = GS.P.x; window.__cy = GS.P.y - 120;
    window.__frame = (n, i) => { for (let j = 0; j < n; j++) { if (GS.state === 'levelup') { GS.luOpenT = 0; choose(0); } if (GS.state === 'cine') cineSkip();
        const near = GS.enemies.filter(e => !e.dead && e.dying === undefined).sort((a, b) => Math.hypot(a.x - GS.P.x, a.y - GS.P.y) - Math.hypot(b.x - GS.P.x, b.y - GS.P.y))[0];
        if (near) GS.P.aimA = Math.atan2(near.y - GS.P.y, near.x - GS.P.x);
        mouse.down = near && Math.hypot(near.x - GS.P.x, near.y - GS.P.y) < 150 && (i % 16) < 5;
        update(1 / 60); tickWorld(1 / 60); }
      // the camera eases toward you and the nearest few
      const L = GS.enemies.filter(e => !e.dead).sort((a, b) => Math.hypot(a.x - GS.P.x, a.y - GS.P.y) - Math.hypot(b.x - GS.P.x, b.y - GS.P.y)).slice(0, 3);
      let x = GS.P.x, y = GS.P.y; for (const e of L) { x += e.x; y += e.y; } x /= L.length + 1; y /= L.length + 1;
      __cx += (x - __cx) * 0.15; __cy += (y - __cy) * 0.15;
      cam.x = __cx - viewW / 2; cam.y = __cy - viewH / 2; render(); return 1; };
    return 1; })()`);
  const step = Math.round(60 / FPS);
  for (let k = 0; k < SECS * FPS; k++) {
    await ev(`__frame(${step}, ${k})`);
    await pg.screenshot({ path: join(FR, `f${String(k).padStart(4, '0')}.png`) });
  }
  if (errs.length) console.log('page errors:', errs.join(' | ').slice(0, 1500));
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
  console.log('wrote', OUT, SECS * FPS, 'frames');
} finally {
  await b.close();
}
