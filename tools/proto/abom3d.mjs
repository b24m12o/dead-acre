/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// PROTOTYPE, not part of the game: films the Abomination climbing out of a hole, drawn live in 3D (abom3d-page.js,
// abom3d-clip.js), in a real street of the test build, frame by frame through the game's own renderer, into an MP4.
//   node tools/proto/abom3d.mjs [out.mp4] [--fps 24] [--secs 6.4] [--only N] (N: just frame N, to check a still)
// Needs npm run build first (build/test.html), CHROME_PATH, and ffmpeg.
import { readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { browser, openGame } from '../../tests/lib/harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/abom3d.mp4';
const FPS = +arg('--fps', 24),
  SECS = +arg('--secs', 6.4),
  ONLY = arg('--only', null);
const FR = join(dirname(OUT), 'abom3d-frames');
rmSync(FR, { recursive: true, force: true });
mkdirSync(FR, { recursive: true });

const b = await browser();
try {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await pg.setViewportSize({ width: 1280, height: 720 });
  await pg.addStyleTag({
    content: 'body > *:not(#gl){visibility:hidden!important} #gl{visibility:visible!important}',
  });
  const where = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.state = 'play'; __god();
    GS.wave = 5; GS.queue.length = 0; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.interT = 99;
    GS.rsCap = GS.RS_MAX; resize();
    // an open stretch of street with a lamp by it
    let best = null;
    for (let k = 0; k < 20000 && !best; k++) {
      const x = 500 + Math.random() * (WW - 1000), y = 500 + Math.random() * (WH - 1000);
      if (!freeAround(x, y, 120) || !freeAround(x, y + 150, 100) || !freeAround(x, y + 260, 30)) continue;
      const L = lamps.find(L => !L.down && Math.hypot(L.bx - x, L.by - y) < 260 && Math.hypot(L.bx - x, L.by - y) > 120);
      if (L) best = [x, y];
    }
    const [x, y] = best;
    GS.P.x = x + 40; GS.P.y = y + 330; GS.P.aimA = -Math.PI / 2; GS.P.vx = GS.P.vy = 0;
    for (let i = 0; i < 60; i++) updateCamera(1 / 30);
    return JSON.stringify([x, y]);
  })()`);
  const [hx, hy] = JSON.parse(where);
  console.log('hole at', hx | 0, hy | 0);
  console.log('rig', await ev(readFileSync(join(HERE, 'abom3d-page.js'), 'utf8')));
  console.log('clip', await ev(readFileSync(join(HERE, 'abom3d-clip.js'), 'utf8')));
  await ev(`(() => {
    const C = ABOM3D.C; C.setup(${hx}, ${hy}, Math.PI / 2);
    // the boss itself: a stand-in the renderer sorts and lights like any other, drawn by the 3D pass
    const e = { type: 'queen', btype: 'abom', x: ${hx}, y: ${hy}, a: Math.PI / 2, r: 0.01, cr: 60, emerge: 1, sv: 0, hp: 1e9, maxHp: 1e9,
      dead: false, __3d: true, vx: 0, vy: 0, z: 0, sc: 1, flash: 0, squash: 0, wob: 0, id: 4242, ph: 0, legs: null };
    GS.enemies.push(e); ABOM3D.e = e; ABOM3D.lampOK = true;
    const H = [${hx}, ${hy}];
    ABOM3D.fx = {
      crack: k => { decal(R.hole, H[0] + rand(-6, 6), H[1] + rand(-6, 6), 0.8 + 2.6 * k, [1, 1, 1, 0.35 + 0.45 * k], [0, 0, 0], 120);
        dust(H[0] + rand(-40, 40), H[1] + rand(-40, 40), 2 + (k * 4 | 0), 40 + 40 * k, 1, 1, [0.28, 0.27, 0.25]); chips(H[0], H[1], 2 + (k * 6 | 0), null, 4, 80 + 120 * k); shake(0.04 + 0.2 * k); },
      burst: () => { decal(R.hole, H[0], H[1], 3.6, [1, 1, 1, 0.95], [0, 0, 0], 200);
        for (let i = 0; i < 18; i++) { const a = rand(0, TAU), s = rand(90, 280); part({ k: 3, x: H[0] + Math.cos(a) * 30, y: H[1] + Math.sin(a) * 30, z: 6, vz: rand(140, 300), vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1.8, max: 1.8, size: rand(0.7, 1.4), rot: rand(0, TAU), vr: rand(-6, 6), drag: 1.6, c: [0.2, 0.2, 0.22] }); }
        chips(H[0], H[1], 18, null, 4, 300); dust(H[0], H[1], 16, 110, 1.6, 1.6, [0.24, 0.23, 0.21]); shake(0.5); },
      stab: p => { chips(p[0], p[1], 10, null, 4, 200); sparks(p[0], p[1], [1, 0.85, 0.5], 8, 220); decal(R.hole, p[0], p[1], 0.7, [1, 1, 1, 0.8], [0, 0, 0], 120); dust(p[0], p[1], 4, 50, 1, 1, [0.3, 0.28, 0.26]); shake(0.3); },
      grip: p => { chips(p[0], p[1], 7, null, 4, 150); dust(p[0], p[1], 3, 40, 0.9, 0.9, [0.3, 0.28, 0.26]); decal(R.hole, p[0], p[1], 0.5, [1, 1, 1, 0.6], [0, 0, 0], 120); shake(0.14); },
      step: p => { dust(p[0], p[1], 3, 40, 0.9, 0.8, [0.3, 0.28, 0.26]); shake(0.07); },
      haul: () => { dust(H[0], H[1], 10, 90, 1.4, 1.3, [0.26, 0.25, 0.23]); chips(H[0], H[1], 8, null, 4, 160); shake(0.2); },
      roar: () => { shake(0.45); ring(ABOM3D.pose.headP[0], ABOM3D.pose.headP[1], 20, 160, 0.6, [0.6, 0.55, 0.5], 0.4); },
    };
    return 1;
  })()`);
  const N = Math.round(SECS * FPS);
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const t = i / FPS,
      dt = 1 / FPS;
    const keep = ONLY === null || +ONLY === i;
    await ev(`(() => { const C = ABOM3D.C; C.events(${t - dt}, ${t}, ABOM3D.fx); C.clip(${t});
      const e = ABOM3D.e, P = ABOM3D.pose.bodyP; e.x = P[0]; e.y = P[1];
      GS.time += ${dt}; tickWorld(${dt}); updateCamera(${dt});
      cam.x = ${hx} - viewW / 2; cam.y = ${hy} + 40 - viewH / 2; // the camera held on it
      ${keep ? 'render();' : ''} return 1; })()`);
    if (keep) await pg.screenshot({ path: join(FR, `f${String(i).padStart(4, '0')}.png`) });
    if (i % 12 === 0) console.log(`frame ${i}/${N}, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  if (errs.length) console.log('page errors:', errs.join(' | ').slice(0, 2000));
  if (ONLY === null) {
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
    console.log('wrote', OUT, existsSync(OUT));
  }
} finally {
  await b.close();
}
