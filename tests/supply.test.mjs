/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Dawn supplies and boards: B at a campaign dawn opens the supply panel and the world waits; a buy takes its scrap
// and adds to your pack, up to the most you can carry. No panel at night or in Horde Mode. A board nailed across a
// one-tile doorway holds the dead for a good while, takes a beating, and gives; you walk through your own boards
// and they don't. A dawn save keeps what you bought and gives back the boards you put up.
import { openGame, check } from './lib/harness.mjs';

export const name = 'supply: dawn panel, boards that hold and give';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b);
  await pg.setViewportSize({ width: 1400, height: 860 });
  await ev(`initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    GS.wave = 4; GS.nightDone = true; GS.nightLive = false; GS.interT = 40; GS.runSeeds = 400; GS.RUN.traps = {}; 1`);
  await pg.waitForTimeout(300);
  await pg.keyboard.press('b');
  const t0 = await ev(`[GS.state, GS.interT, $('supply').hidden]`);
  await pg.waitForTimeout(1000);
  const t1 = await ev(`GS.interT`);
  const price = await ev(`SUPPLY[1].cost`);
  for (let i = 0; i < 4; i++) {
    await pg.keyboard.press('2');
    await pg.waitForTimeout(60);
  }
  const bought = await ev(
    `[GS.runSeeds, GS.RUN.traps.mine || 0, document.querySelector('#supply .sup[data-i="1"]').disabled]`
  );
  await pg.keyboard.press('Escape');
  await pg.waitForTimeout(100);
  const closed = await ev(`[GS.state, $('supply').hidden]`);
  const gate = await ev(`(() => {
    const o = {};
    GS.nightLive = true; GS.nightDone = false; o.night = openSupply(); GS.state = 'play';
    GS.nightLive = false; GS.nightDone = true; GS.RUN.hm = true; o.hm = openSupply(); GS.state = 'play'; GS.RUN.hm = false;
    for (const id of ['supply']) $(id).hidden = true;
    return o;
  })()`);
  await pg.close();
  const { pg: p2, errs: e2, ev: ev2 } = await openGame(b, { noFrames: true });
  const o = await ev2(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    GS.wave = 3; GS.nightLive = true; GS.nightDone = false; GS.interT = 0;
    const P = GS.P, W = (x, y) => x < 0 || y < 0 || x >= MW || y >= MH || !!grid[y * MW + x];
    // the long way round from one side of a gap to the other, with the gap shut
    const around = (ax, ay, bx, by, gx, gy) => {
      const seen = new Uint8Array(MW * MH), q = [[ax, ay, 0]]; seen[ay * MW + ax] = 1; seen[gy * MW + gx] = 1;
      for (let h = 0; h < q.length; h++) { const [x, y, d] = q[h]; if (x === bx && y === by) return d; if (d > 70) return 99;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nx = x + dx, ny = y + dy; if (W(nx, ny) || seen[ny * MW + nx]) continue; seen[ny * MW + nx] = 1; q.push([nx, ny, d + 1]); } }
      return 99;
    };
    let gap = null;
    for (let ty = 6; ty < MH - 6; ty++) for (let tx = 6; tx < MW - 6; tx++) {
      if (W(tx, ty)) continue;
      for (const [ax, ay] of [[1, 0], [0, 1]]) {
        const nx = ay, ny = ax; // across the gap
        if (!W(tx - ax, ty - ay) || !W(tx + ax, ty + ay)) continue;
        let clear = true; for (const k of [1, 2, 3, 4]) for (const sg of [-1, 1]) if (W(tx + nx * k * sg, ty + ny * k * sg)) clear = false;
        if (!clear) continue;
        const r = around(tx + nx * 2, ty + ny * 2, tx - nx * 2, ty - ny * 2, tx, ty);
        if (r >= 14 && (!gap || r > gap.r)) gap = { tx, ty, nx, ny, r }; // the doorway with the longest way round
      }
    }
    if (!gap) return { err: 'no doorway with a long way round on this map' };
    const gx = (gap.tx + 0.5) * TILE, gy = (gap.ty + 0.5) * TILE;
    P.x = gx + gap.nx * 45; P.y = gy + gap.ny * 45; P.vx = P.vy = 0; P.aimA = Math.atan2(-gap.ny, -gap.nx); // in the doorway's mouth to nail it up, then back out of reach to watch
    buildFlow(P.x, P.y); GS.flowTile = -1;
    GS.RUN.traps = { board: 2 }; GS.RUN.trapSel = 'board';
    const sp = boardSpot(P.x, P.y, P.aimA);
    if (!sp) return { err: 'boardSpot found nothing in front of the doorway' };
    trapDown();
    const B = GS.boards[0];
    if (!B || Math.hypot(B.x - gx, B.y - gy) > 21) return { err: 'the board went up somewhere else: ' + (B && [Math.round(B.x - gx), Math.round(B.y - gy)]) };
    P.x = gx + gap.nx * 80; P.y = gy + gap.ny * 80;
    const out = { max: B && B.max, w: sp.pts.length, left: GS.RUN.traps.board, round: gap.r };
    const zs = [0, 1, 2, 3, 4, 5].map(k => { const e = makeEnemy('skitter', gx - gap.nx * (70 + (k >> 1) * 30) + gap.ny * ((k & 1) ? 10 : -10), gy - gap.ny * (70 + (k >> 1) * 30) + gap.nx * ((k & 1) ? 10 : -10)); e.emerge = 1; e.aw = 9; e.hp = e.maxHp = 5000; return e; });
    const lat = e => Math.abs((e.x - gx) * gap.ny - (e.y - gy) * gap.nx), along = e => (e.x - gx) * gap.nx + (e.y - gy) * gap.ny;
    const mouth = e => { if (lat(e) >= 26) e.inGap = false; else if (along(e) < 0) e.inGap = true; }; // in the doorway's outer mouth, or left it sideways
    const past = () => zs.some(e => e.inGap && along(e) > 20 && lat(e) < 26); // from the outer mouth to inside: through the doorway itself, not the long way round
    for (const e of zs) mouth(e);
    let t = 0, held = 0, brokeAt = -1, passAt = -1;
    for (; t < 60 * 60; t++) {
      update(1 / 60); tickWorld(1 / 60); P.hp = S.maxHp; P.x = gx + gap.nx * 80; P.y = gy + gap.ny * 80;
      if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; }
      if (B.broken && brokeAt < 0) { brokeAt = t / 60; out.outside = zs.filter(e => !e.dead && along(e) < 0).length; } // who was still outside it when it gave
      if (past() && passAt < 0) { passAt = t / 60; break; }
      for (const e of zs) mouth(e);
    }
    out.brokeAt = brokeAt; out.passAt = passAt; out.hpLeft = B.hp; out.zs = zs.map(e => [Math.round(along(e)), Math.round(lat(e)), e.dead ? 1 : 0]);
    for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    // you walk through your own board
    B.broken = false; B.hp = B.max;
    P.x = gx + gap.nx * 50; P.y = gy + gap.ny * 50;
    const key = gap.nx > 0 ? 'a' : gap.nx < 0 ? 'd' : gap.ny > 0 ? 'w' : 's';
    for (let i = 0; i < 70; i++) { keys.add(key); update(1 / 60); tickWorld(1 / 60); }
    keys.clear();
    out.walked = (P.x - gx) * gap.nx + (P.y - gy) * gap.ny < -20;
    // the dawn save: what you carry, and the boards you put up come back to your pack
    GS.RUN.traps = { mine: 2, board: 1 };
    GS.nightLive = false; GS.nightDone = true;
    saveRun();
    const d = savedRun();
    out.saved = d && d.RUN.traps;
    return out;
  })()`);
  await p2.close();
  check(t0[0] === 'supply' && t0[2] === false, `B at dawn should open the panel: state ${t0[0]}`);
  check(Math.abs(t1 - t0[1]) < 0.05, `the dawn should wait while the panel is open: ${t0[1]} → ${t1}`);
  check(
    bought[0] === 400 - 3 * price && bought[1] === 3 && bought[2],
    `three mines at ${price}, no fourth: scrap ${bought[0]}, mines ${bought[1]}`
  );
  check(closed[0] === 'play' && closed[1], `Esc should close it: ${closed}`);
  check(gate.night === false && gate.hm === false, `no panel at night or in Horde Mode: ${JSON.stringify(gate)}`);
  check(!o.err, o.err);
  check(
    o.max === 240 && o.left === 1,
    `a night-3 board should have 240 hp and use one from the pack: ${o.max}, ${o.left} left`
  );
  check(
    o.brokeAt >= 8 || (o.brokeAt < 0 && o.passAt < 0 && o.hpLeft < o.max * 0.6), // held to the end, battered, if some went the long way round
    `the board should hold six of them at least 8 s: it broke at ${o.brokeAt} s; through at ${o.passAt} s, ${Math.round(o.hpLeft)} hp left, the six at ${JSON.stringify(o.zs)}`
  );
  check(
    o.brokeAt < 0 || !o.outside || (o.passAt > 0 && o.passAt >= o.brokeAt), // nobody left outside it: nobody to come through
    `once it gives they should come through: through at ${o.passAt} s, broke at ${o.brokeAt} s with ${o.outside} outside`
  );
  check(o.walked, 'you should walk through your own board');
  check(
    o.saved && o.saved.mine === 2 && o.saved.board === 2,
    `the save should keep the mines and give the standing board back: ${JSON.stringify(o.saved)}`
  );
  check(!errs.length && !e2.length, 'page errors: ' + errs.concat(e2).join(' | '));
  return `panel ${price} a mine, max 3; a night-3 board held ${o.brokeAt < 0 ? 'all minute' : o.brokeAt.toFixed(1) + ' s'} against six, they came through at ${o.passAt.toFixed(1)} s (way round ${o.round} tiles)`;
}
