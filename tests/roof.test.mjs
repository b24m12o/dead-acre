/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A roof stops a throw. From inside a roofed house a mine, a grenade or a molotov only leaves by the doorway: aimed
// at the wall it drops at the wall's foot inside. Over a house it merely passes, and over the walls of a roofless
// ruin, it still flies. The molotovs and pipe bombs you throw by yourself are not thrown at what a roof hides.
import { openGame, check } from './lib/harness.mjs';

export const name = 'roof: nothing is thrown through one';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    const wallAt = (x, y) => { const t = ttype[Math.floor(y / TILE) * MW + Math.floor(x / TILE)]; return t === 1 || t === 5; };
    // a roofed house with a door in it, and its inside
    let H = null, D = null;
    for (let go = 0; go < 6 && !H; go++) {
      if (go) { newRun(); GS.state = 'play'; GS.queue = []; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999; } // a town with no such house: lay out another
      for (const d of GS.doors) {
        const h = houses.find(h => h.roof && !h.open && d.x > h.x * TILE - 1 && d.x < (h.x + h.w) * TILE + 1 && d.y > h.y * TILE - 1 && d.y < (h.y + h.h) * TILE + 1);
        if (h && h.w >= 4 && h.h >= 4 && !wallAt(d.x - d.nx * 60, d.y - d.ny * 60)) { H = h; D = d; break; }
      }
    }
    out.found = !!H;
    const P = GS.P;
    if (!H) { out.roofed = houses.filter(h => h.roof).length; out.doors = GS.doors.length; return out; }
    const inH = (x, y) => x > H.x * TILE && x < (H.x + H.w) * TILE && y > H.y * TILE && y < (H.y + H.h) * TILE;
    // you, just inside the door
    const px = D.x - D.nx * 60, py = D.y - D.ny * 60;
    P.x = px; P.y = py;
    // through the doorway: clear. Through the wall beside you: stopped, inside
    out.door = roofStop(px, py, D.x + D.nx * 200, D.y + D.ny * 200);
    const ax = -D.ny, ay = D.nx; // along the wall
    let side = null;
    for (const s of [1, -1]) { const tx = px + ax * s * 1500, ty = py + ay * s * 1500; const st = roofStop(px, py, tx, ty); if (st) { side = st; break; } }
    out.side = !!side && inH(side[0], side[1]) && !wallAt(side[0], side[1]);
    out.sideAt = side && side.map(Math.round); out.me = [Math.round(px), Math.round(py)]; out.house = [H.x, H.y, H.w, H.h, H.style || ''];
    // into it from outside, through the wall: stopped outside
    const ox = D.x + D.nx * 80 + ax * 90, oy = D.y + D.ny * 80 + ay * 90;
    const into = roofStop(ox, oy, px + ax * 30, py + ay * 30);
    out.into = !!into && !inH(into[0], into[1]);
    // over it, from one side to the other: it flies
    out.over = roofStop(H.x * TILE - 60, (H.y + H.h / 2) * TILE, (H.x + H.w) * TILE + 60, (H.y + H.h / 2) * TILE);
    // a mine thrown at the wall from inside lands inside
    GS.RUN.traps = { mine: 2 }; GS.RUN.trapSel = 'mine';
    mouse.x = (px + ax * 300 - cam.x) * ZOOM; mouse.y = (py + ay * 300 - cam.y) * ZOOM;
    if (roofStop(px, py, px + ax * 300, py + ay * 300) === null && roofStop(px, py, px - ax * 300, py - ay * 300)) { mouse.x = (px - ax * 300 - cam.x) * ZOOM; mouse.y = (py - ay * 300 - cam.y) * ZOOM; }
    const n0 = GS.tthrows.length; trapDown();
    const t = GS.tthrows[GS.tthrows.length - 1];
    out.mine = GS.tthrows.length === n0 + 1 && inH(t.tx, t.ty);
    // molotovs and pipe bombs of your own: not at one the roof hides, yes at one in the doorway's line
    S.molo = 1; GS.molos = [];
    const z = makeEnemy('skitter', px + ax * 240, py + ay * 240); z.emerge = 1; z.hp = z.maxHp = 9999; z.sp = 0; z.aw = 0; GS.enemies.push(z);
    if (roofStop(px, py, z.x, z.y) === null) { z.x = px - ax * 240; z.y = py - ay * 240; }
    rebuildHash();
    out.moloHidden = throwMolotov(P);
    z.x = D.x + D.nx * 170; z.y = D.y + D.ny * 170; rebuildHash();
    out.moloDoor = throwMolotov(P);
    // a ruin with no roof: over the wall it goes
    const ruin = houses.find(h => !h.roof && !h.open && h.w >= 4);
    out.ruin = ruin ? roofStop((ruin.x + ruin.w / 2) * TILE, (ruin.y + ruin.h / 2) * TILE, (ruin.x + ruin.w) * TILE + 120, (ruin.y + ruin.h / 2) * TILE) : null;
    out.hasRuin = !!ruin;
    return out;
  })()`);
  await pg.close();
  check(o.found, `the town should have a roofed house with a door: ${JSON.stringify(o)}`);
  check(o.door === null, 'a throw out through the doorway should fly: ' + JSON.stringify(o.door));
  check(
    o.side,
    `a throw at the wall from inside should drop inside, at the wall: ${JSON.stringify([o.sideAt, o.me, o.house])}`
  );
  check(o.into, 'a throw into the house through its wall should drop outside');
  check(o.over === null, 'a throw clean over the house should fly: ' + JSON.stringify(o.over));
  check(o.mine, 'a mine thrown at the wall from inside should land inside');
  check(
    o.moloHidden === false && o.moloDoor === true,
    `your molotov should wait for one it can reach: hidden ${o.moloHidden}, in the doorway's line ${o.moloDoor}`
  );
  check(o.ruin === null, 'over the wall of a roofless ruin it should still fly: ' + JSON.stringify(o.ruin));
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return 'the doorway yes, the wall no; over a house and out of a ruin yes';
}
