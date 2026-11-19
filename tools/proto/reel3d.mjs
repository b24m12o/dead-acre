/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A test tool, not part of the game: a captioned reel of the 3D zombies, one thing at a time, close up on open ground,
// filmed through the test build's own renderer (deaths in slow motion). --2d films the same reel with the pictures.
// --types films each kind of the dead instead, coming on and shot down.
//   node tools/proto/reel3d.mjs [out.mp4] [--fps 12] [--2d] [--types]
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { browser, openGame } from '../../tests/lib/harness.mjs';
const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i > 0 ? process.argv[i + 1] : d;
};
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/reel3d.mp4',
  FPS = +arg('--fps', 12),
  FLAT = process.argv.includes('--2d');
const DIR = join(dirname(OUT), 'reel3d-parts');
if (!process.argv.includes('--from')) rmSync(DIR, { recursive: true, force: true });
mkdirSync(DIR, { recursive: true });
// each segment: caption, seconds, speed (1 real time, 0.5 slow), zoom, how many zombies and where (an arc this far off
// in front of you), what to do at the start, and each step (i: the frame)
let SEGS = [
  { cap: 'Walking in', secs: 4, n: 5, r: 210, zoom: 3 },
  {
    cap: 'Shot, not killed: a hit shoves it the way the round goes',
    secs: 3.5,
    n: 2,
    r: 120,
    zoom: 3.4,
    tough: true,
    fire: true,
  },
  {
    cap: 'Killed by a round: the knees go, then it falls (half speed)',
    secs: 3,
    n: 1,
    r: 130,
    zoom: 4,
    speed: 0.5,
    kill: 'slump',
  },
  { cap: 'Buckshot up close throws it (half speed)', secs: 3, n: 1, r: 130, zoom: 4, speed: 0.5, kill: 'buck' },
  { cap: 'Headshot: it drops (half speed)', secs: 3, n: 1, r: 130, zoom: 4, speed: 0.5, kill: 'head' },
  { cap: 'Tripped: down, and up again', secs: 4, n: 1, r: 110, zoom: 3.6, act: 'trip' },
  { cap: 'An arm shot off', secs: 3, n: 1, r: 120, zoom: 3.6, act: 'arm' },
  { cap: 'Legs shot off: it comes on, on its hands', secs: 4, n: 1, r: 120, zoom: 3.6, act: 'legs' },
  { cap: 'A crowd', secs: 5, n: 26, r: 260, zoom: 2.2, fire: true, spread: true },
];
const T = (cap, ty, set, more) => ({ cap, ty, set, secs: 4.5, n: 3, r: 230, zoom: 3.6, fire: true, late: 2, ...more });
if (process.argv.includes('--types'))
  SEGS = [
    T('Ordinary', 'skitter', ''),
    T('Runner', 'skitter', '', { trait: 'runner' }),
    T('Screamer', 'flower', ''),
    T('Spitter', 'wasp', ''),
    T('Armored', 'skitter', '', { trait: 'armored' }),
    T('Riot shield', 'skitter', 'e.shield = { hp: 6, max: 6 };'),
    T('Bloater elite', 'skitter', '', { trait: 'bloater' }),
    T('Spore carrier', 'skitter', '', { kind: 'spore' }),
    T('Dragger', 'skitter', '', { kind: 'drag' }),
    T('Climber', 'skitter', '', { kind: 'climb' }),
    T('Listener (blind)', 'skitter', '', { kind: 'blind' }),
    T('Brute', 'beetle', '', { n: 1, secs: 6, late: 3 }),
    T('Bloater', 'hopper', '', { n: 2, secs: 5 }),
    T('Dogs', 'hound', '', { r: 330, zoom: 2.8 }),
    T('Egg sac, hatching', 'egg', 'e.hatch = 2.2;', { n: 1, r: 110, fire: false, free: true, secs: 4 }),
  ];
if (process.argv.includes('--from')) SEGS = SEGS.slice(+arg('--from', 0));
const b = await browser();
try {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await pg.setViewportSize({ width: 1280, height: 720 });
  await pg.addStyleTag({ content: 'body > *:not(#gl){visibility:hidden!important} #gl{visibility:visible!important}' });
  for (let i = 0; i < 40 && !(await ev('fig3dOn()')); i++) await pg.waitForTimeout(250);
  await ev(`(() => { opt.b3d = ${!FLAT}; initAudio(); GS.meta.tutDone = true; begin(); GS.rsCap = GS.RS_MAX; __god();
    for (let i = 0; i < 30; i++) { update(1 / 60); tickWorld(1 / 60); }
    let spot = null; for (let t = 0; t < 60000 && !spot; t++) { const x = 500 + Math.random() * (WW - 1000), y = 500 + Math.random() * (WH - 1000); let ok = true;
      for (let dx = -240; dx <= 240 && ok; dx += 30) for (let dy = -300; dy <= 120 && ok; dy += 30) if (blockPt(x + dx, y + dy)) ok = false; if (ok && lamps.every(L => Math.hypot(L.hx - x, L.hy - y + 100) > 330)) spot = [x, y]; }
    window.__spot = spot || [GS.P.x, GS.P.y]; return 1; })()`);
  let si = +arg('--from', 0);
  for (const S of SEGS) {
    const fr = join(DIR, String(si));
    mkdirSync(fr, { recursive: true });
    await ev(`(() => { const S = ${JSON.stringify(S)}; window.__Z = S.zoom; resize();
      for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.queue.length = 0; GS.corpses.length = 0; GS.decals.length = 0; GS.parts.length = 0; GS.clouds.length = 0; resetSpecials();
      const P = GS.P; P.x = __spot[0]; P.y = __spot[1]; P.vx = P.vy = 0; P.aimA = -Math.PI / 2; mouse.down = false;
      window.__mine = [];
      for (let i = 0; i < S.n; i++) {
        const a = S.spread ? -Math.PI / 2 + (Math.random() - 0.5) * 2.2 : -Math.PI / 2 + (i - (S.n - 1) / 2) * 0.45, r = S.r + (S.spread ? Math.random() * 120 : (i % 2) * 25);
        const e = S.kind ? makeSpecial(S.kind, P.x + Math.cos(a) * r, P.y + Math.sin(a) * r) : makeEnemy(S.ty || 'skitter', P.x + Math.cos(a) * r, P.y + Math.sin(a) * r); e.emerge = 1; if (!S.kind) { e.trait = null; e.elite = false; e.shield = null; e.kind = null; } e.aw = 9;
        if (S.trait) { makeElite(e); setTrait(e, S.trait); } // the game's own ways of making them, so they are whole
        if (S.set) new Function('e', S.set)(e);
        e.a = Math.atan2(P.y - e.y, P.x - e.x); if (S.tough) e.hp = e.maxHp = 99999; __mine.push(e); // (makeEnemy has put it in the game)
      }
      window.__seg = S; window.__t = 0; window.__did = false; window.__cx = null; return 1; })()`);
    const frames = Math.round(S.secs * FPS);
    for (let k = 0; k < frames; k++) {
      await ev(`(() => { const S = __seg, P = GS.P, dt = 1 / 60, n = Math.round(60 / ${FPS} * (S.speed || 1));
        for (let j = 0; j < n; j++) {
          if (!S.free) GS.enemies = GS.enemies.filter(e => __mine.includes(e)); else for (const o of GS.enemies) if (!__mine.includes(o)) __mine.push(o); GS.queue.length = 0; P.hp = 999; P.x = __spot[0]; P.y = __spot[1]; P.vx = P.vy = 0;
          const e = __mine[0];
          if (!__did && e && (S.kill || S.act) && __t > (S.kill ? 0.35 : 0.8)) { __did = true;
            if (S.kill === 'slump' || S.kill === 'head') { killEnemy(e, 5, 'bolt', 0, 1, false); const u = Math.atan2(e.y - P.y, e.x - P.x); e.rvx = Math.cos(u) * 190; e.rvy = Math.sin(u) * 190; if (S.kill === 'head') { e.headless = true; gib(e.x, e.y - 4, R.g_head, [1, 1, 1], [0.4, 0.03, 0.02], 240, 0, -1); } }
            if (S.kill === 'buck') { killEnemy(e, 5, 'bolt', 0, 1, false); const u = Math.atan2(e.y - P.y, e.x - P.x); e.rvx = Math.cos(u) * 460; e.rvy = Math.sin(u) * 460; }
            if (S.act === 'trip') tripOver(e, e.a);
            if (S.act === 'arm') { e.lost[1] = true; bleed(e.x, e.y, 18, 1, 0, 8, [0.4, 0.03, 0.02], 260); }
            if (S.act === 'legs') { e.crawl = true; e.sup = false; e.down = 0; e.fallA = e.a; e.lyG = 0; e.cfall = 0.32; }
          }
          if (S.fire) { const near = GS.enemies.filter(o => !o.dead && o.dying === undefined).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
            if (near) P.aimA = Math.atan2(near.y - P.y, near.x - P.x); mouse.down = !!near && __t > (S.late || 0) && Math.hypot(near.x - P.x, near.y - P.y) < 170 && (Math.floor(__t * 8) % 3) === 0; }
          if (S.act === 'trip' || S.act === 'arm' || S.act === 'legs' || S.kill) for (const o of __mine) if (o.dying === undefined && Math.hypot(o.x - P.x, o.y - P.y) < 70) { o.x -= o.vx * dt; o.y -= o.vy * dt; } // kept off you, so you see it
          update(dt); tickWorld(dt); __t += dt;
          if (GS.state === 'levelup') { GS.luOpenT = 0; choose(0); }
        }
        const L = __mine.length > 3 ? [P] : __mine.slice(0, 2); let x = 0, y = 0; for (const o of L) { x += o.x; y += o.y; } x /= L.length; y /= L.length;
        if (__cx === null) { __cx = x; __cy = y; } __cx += (x - __cx) * 0.25; __cy += (y - __cy) * 0.25;
        cam.x = __cx - viewW / 2; cam.y = __cy - (__mine.length > 3 ? viewH * 0.12 : 0) - viewH / 2; const px = P.x; if (S.n < 3 || S.ty) P.x += 9000; render(); P.x = px; return 1; })()`);
      await pg.screenshot({ path: join(fr, `f${String(k).padStart(4, '0')}.png`) });
    }
    const txt = join(DIR, `cap${si}.txt`);
    writeFileSync(txt, S.cap + (FLAT ? '  (pictures)' : ''));
    execFileSync('ffmpeg', [
      '-y',
      '-loglevel',
      'error',
      '-framerate',
      String(FPS),
      '-i',
      join(fr, 'f%04d.png'),
      '-vf',
      `crop=1040:584:120:68,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:textfile=${txt}:x=24:y=h-52:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=10`,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(FPS),
      join(DIR, `s${si}.mp4`),
    ]);
    si++;
  }
  const list = join(DIR, 'list.txt');
  writeFileSync(list, Array.from({ length: si }, (_, i) => `file '${join(DIR, `s${i}.mp4`)}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', OUT]);
  await ev('GS.NOHERO = false; 1');
  if (errs.length) console.log('page errors:', errs.join(' | ').slice(0, 1500));
  console.log('wrote', OUT);
} finally {
  await b.close();
}
