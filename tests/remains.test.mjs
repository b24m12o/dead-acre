/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The dead stay: bodies that have lain their time, and the blood round them, are painted into the ground picture
// instead of fading out, and the ground away from them is left exactly as it was. Bodies in a heap slow a walker
// wading through them, and still do once they are part of the ground.
import { openGame, check } from './lib/harness.mjs';

export const name = 'remains: the dead painted into the ground, and piles that slow the living';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999; GS.wave = 4;
    REMAINS.every = 0;
    const P = GS.P;
    const fr = (s, draw = true) => { for (let i = 0; i < s * 60; i++) { update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); if (draw && i % 6 === 0) bakeRemains(); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    // open ground with room to the east
    let spot = null;
    for (let t = 0; t < 4000 && !spot; t++) {
      const x = 400 + Math.random() * (WW - 1000), y = 400 + Math.random() * (WH - 800);
      let ok = true;
      for (let dx = -80; dx <= 480 && ok; dx += 40) for (let dy = -120; dy <= 120 && ok; dy += 40) if (grid[Math.floor((y + dy) / TILE) * MW + Math.floor((x + dx) / TILE)]) ok = false;
      if (ok) spot = [x, y];
    }
    P.x = spot[0]; P.y = spot[1]; P.vx = P.vy = 0; fr(0.2);
    const X = (Math.floor((P.x + 220) / TILE) + 0.5) * TILE, Y = (Math.floor(P.y / TILE) + 0.5) * TILE;
    const shot = (x, y) => {
      const fb = gl.createFramebuffer(), s = mapA.width / WW, px = new Uint8Array(48 * 48 * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texMapA, 0);
      gl.readPixels(Math.floor(x * s) - 24, Math.floor(y * s) - 24, 48, 48, gl.RGBA, gl.UNSIGNED_BYTE, px);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
      return px;
    };
    const diff = (a, c) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - c[i]) + Math.abs(a[i + 1] - c[i + 1]) + Math.abs(a[i + 2] - c[i + 2]) > 6) n++; return n; };
    const here0 = shot(X, Y), far0 = shot(X + 60, Y - 100);
    // nine of them die in a row of heaps, in a pool of blood
    decal(R.splat0, X + 10, Y, 0.8, [0.5, 0.02, 0.02, 0.9], [0, 0, 0], 45);
    const dead = [];
    const at = i => [X - 4 + (i % 3) * 4, Y + (Math.floor(i / 3) - 1) * 45 + (i % 3) * 3]; // three heaps of three, in a row across the walker's way
    for (let i = 0; i < 9; i++) {
      const e = makeEnemy('skitter', ...at(i)); e.emerge = 1; e.hp = 1;
      GS.HITB = { gun: 'pistol' };
      try { killEnemy(e, 5, 'bolt', 0, 0, false); } finally { GS.HITB = null; }
      e.rvx = e.rvy = 0; dead.push(e);
    }
    fr(2);
    out.slid = dead.map(e => Math.round(Math.hypot(e.x - X, e.y - Y)));
    dead.forEach((e, i) => { [e.x, e.y] = at(i); e.rvx = e.rvy = 0; }); // thrown back by the round: gathered into their heaps again
    fr(1);
    out.lying = dead.filter(e => GS.corpses.includes(e)).length;
    out.pile = pileAt(X, Y);
    // a walker wades through: slower on the pile than off it
    GS.nightLive = true;
    const w = makeEnemy('skitter', X + 170, Y); w.emerge = 1; w.aw = 9; w.hp = w.maxHp = 9999; w.run = false; w.sp = 84; GS.enemies.push(w);
    let on = 0, onN = 0, off = 0, offN = 0, trips = 0;
    PILE.trip = 0;
    for (let i = 0; i < 60 * 5 && w.x > P.x + 60; i++) {
      update(1 / 60); tickWorld(1 / 60);
      P.hp = S.maxHp;
      const v = Math.hypot(w.vx, w.vy);
      if (pileAt(w.x, w.y) >= 3 && Math.abs(w.x - X) < 22) { on += v; onN++; } else if (i > 30 && Math.abs(w.x - X) > 70) { off += v; offN++; }
      if (w.down > 0) trips++;
    }
    out.on = onN ? on / onN : -1; out.off = offN ? off / offN : -1; out.onN = onN; out.trips = trips;
    w.dead = true; GS.enemies.length = 0; GS.nightLive = false;
    // their time is up: into the ground they go
    const marks0 = GS.decals.length;
    for (const e of GS.corpses) e.dying = e.keep - 2;
    for (const d of GS.decals) d.life = Math.min(d.life, 6);
    fr(4);
    out.left = dead.filter(e => GS.corpses.includes(e)).length;
    out.baked = { ...GS.baked }; out.marks0 = marks0; out.marksLeft = GS.decals.filter(d => d.bake).length;
    out.pileAfter = pileAt(X, Y);
    out.here = diff(here0, shot(X, Y)); out.far = diff(far0, shot(X + 60, Y - 100));
    // painted again and again, ground with nothing on it does not drift
    const far1 = shot(X + 60, Y - 100);
    for (let k = 0; k < 12; k++) { decal(R.shell, X, Y + 20, 1, [1, 1, 1, 1], [0, 0, 0], 30).life = 5; fr(0.2); }
    out.drift = diff(far1, shot(X + 60, Y - 100)); out.bakedMore = GS.baked.marks;
    // with no frame being drawn, they run out the old way
    GS.corpses = []; GS.time += 5;
    const e2 = makeEnemy('skitter', X, Y + 200); e2.emerge = 1; killEnemy(e2, 5, 'bolt', 0, 0, false);
    fr(50, false);
    out.oldWay = !GS.corpses.includes(e2) && !e2.bake;
    return out;
  })()`);
  await pg.close();
  check(
    o.lying === 9 && o.pile >= 3,
    `nine bodies should lie in their heaps and count as a pile: ${o.lying} lying, pile ${o.pile}`
  );
  check(
    o.onN > 5 && o.on < o.off * 0.9,
    `a walker should wade slower through the pile: ${o.on.toFixed(0)} on it, ${o.off.toFixed(0)} off (${o.onN} steps)`
  );
  check(
    o.left === 0 && o.baked.bodies >= 9,
    `the nine should have gone into the ground: ${o.left} left, ${o.baked.bodies} painted`
  );
  check(
    o.baked.marks > 0 && o.marksLeft === 0,
    `their blood should have gone in with them: ${o.baked.marks} marks, ${o.marksLeft} waiting`
  );
  check(o.pileAfter >= 3, `painted bodies should still count as a pile: ${o.pileAfter}`);
  check(o.here > 150, `the ground where they lay should show them: ${o.here} of 2304 px changed`);
  check(o.drift === 0, `ground with nothing on it must not change when its patch is repainted: ${o.drift} px drifted`);
  check(o.oldWay, 'with no frame drawn, a body should run out as it always did');
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${o.baked.bodies} bodies and ${o.baked.marks} marks painted in, ${o.here} px changed, 0 drift; a walker ${o.on.toFixed(0)} px/s on the pile, ${o.off.toFixed(0)} off`;
}
