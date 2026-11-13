/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A breakable world: a round through a lamp's bulb pops it for good, one that misses doesn't, and the backup's
// rounds never do; the dead see you further in lamplight than out of it; a shot electrical box puts out the lamps
// round it until dawn. At the gas station, one blown pump sets the tanks going: a few seconds' warning, then the
// whole forecourt goes up, takes the dead on it, the canopy and the lamps round it; once a run, so a Continue
// there finds it burnt out. Standing at the pumps when it goes is as bad as it should be; well clear, it isn't.
import { openGame, check } from './lib/harness.mjs';

export const name = 'world: lamps you can shoot out, dark that hides you, the gas station going up';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    const fr = s => { for (let i = 0; i < s * 60; i++) { update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    // the bulb: a round through it pops it; one 25 px off doesn't
    const L = lamps.find(l => !l.down && !l.lantern), [bx, by] = bulbAt(L);
    out.miss = lampShot(bx - 60, by - 25, bx + 60, by - 25); out.missK = lampK(L) > 0 || L.broken;
    out.hit = lampShot(bx - 60, by + 3, bx + 60, by - 3); out.hitK = lampK(L); out.shot = !!L.shot;
    // a real round, fired by the gun at the bulb of another lamp
    const L2 = lamps.find(l => !l.down && !l.lantern && !l.shot && l !== L), [b2x, b2y] = bulbAt(L2);
    GS.P.x = b2x - 140; GS.P.y = b2y; GS.P.vx = GS.P.vy = 0;
    GS.pbullets.push({ x: GS.P.x + 20, y: b2y, sx: GS.P.x + 20, sy: b2y, mz: 0, vx: 1400, vy: 0, life: 0.5, dmg: 10, pierce: 0, crit: 0, fall: 0.85, ap: 0, gun: 'pistol', bounce: 0, hits: [], kb: 1 });
    fr(0.3); out.real = !!L2.shot;
    GS.pbullets.push({ x: GS.P.x + 20, y: b2y, vx: 1400, vy: 0, life: 0.5, dmg: 10, hits: [], small: true });
    const L3 = lamps.find(l => !l.down && !l.lantern && !l.shot && l !== L && l !== L2), [b3x, b3y] = bulbAt(L3);
    GS.pbullets.length = 0;
    GS.pbullets.push({ x: b3x - 120, y: b3y, vx: 1400, vy: 0, life: 0.5, dmg: 10, hits: [], small: true });
    fr(0.3); out.buddyPops = !!L3.shot;
    // seen from: further in a lamp's light than out of it
    const lit = lamps.find(l => !l.down && !l.lantern && !l.shot && !l.broken && !l.off);
    GS.P.x = lit.hx; GS.P.y = lit.hy; out.seenLit = seenFrom();
    let dark = null;
    for (let t = 0; t < 500 && !dark; t++) { const x = 200 + Math.random() * (WW - 400), y = 200 + Math.random() * (WH - 400); if (lampHot(x, y) === 0) dark = [x, y]; }
    GS.P.x = dark[0]; GS.P.y = dark[1]; out.seenDark = seenFrom(); out.sight = SIGHT();
    // an electrical box: the lamps round it go out, until dawn
    const box = crystals.find(c => c.alive && c.hue !== 2 && lamps.some(l => !l.down && !l.shot && !l.lantern && Math.hypot(l.bx - c.x, l.by - c.y) < 280));
    if (box) {
      const near = lamps.filter(l => !l.down && !l.shot && !l.lantern && Math.hypot(l.bx - box.x, l.by - box.y) < 280);
      GS.P.x = box.x + 600; GS.P.y = box.y;
      hitCrystal(box, 999, 1, 0); fr(3);
      out.boxOut = near.filter(l => lampK(l) === 0).length + '/' + near.length;
    } else out.boxOut = 'no box';
    return out;
  })()`);
  // the gas station
  const g = await ev(`(() => {
    const out = {};
    GS.RUN.journey = true; GS.RUN.hm = false; GS.RUN.layout = 'gas'; GS.RUN.district = 'highway'; GS.RUN.stop = STOPS.findIndex(s => s.id === 'gas');
    GS.RUN.stationGone = false; GS.wave = 6;
    newRun(); GS.state = 'play'; GS.queue = []; GS.enemies.length = 0; placeArrival(); GS.nightLive = true; GS.nightDone = false;
    GS.flowTile = -1; buildFlow(GS.P.x, GS.P.y);
    const fr = s => { for (let i = 0; i < s * 60; i++) { update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    const ps = crystals.filter(c => c.hue === 2), rf = roofs.find(r => r.reg === 'gs_roof');
    out.pumps = ps.length; out.roof = !!rf;
    const cx = rf.x, cy = rf.y;
    // you, well clear; twelve of them on the forecourt
    let spot = null;
    for (let t = 0; t < 400 && !spot; t++) { const a = Math.random() * 6.283, d = 700 + Math.random() * 120, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (x > 100 && y > 100 && x < WW - 100 && y < WH - 100 && !blockPt(x, y)) spot = [x, y]; }
    GS.P.x = spot[0]; GS.P.y = spot[1]; const hp0 = GS.P.hp = S.maxHp;
    const zs = [];
    for (let t = 0; t < 300 && zs.length < 12; t++) { const a = Math.random() * 6.283, d = Math.random() * 150, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (blockPt(x, y)) continue; const e = makeEnemy('skitter', x, y); e.emerge = 1; zs.push(e); }
    const lampsNear = lamps.filter(l => !l.down && !l.lantern && Math.hypot(l.bx - cx, l.by - cy) < 400).length;
    hitCrystal(ps[0], 999, 1, 0);
    const pin = () => { for (const e of zs) if (!e.dead) { e.x = e.x0; e.y = e.y0; } }; // held on the forecourt: the blast is what's tested, not who walks off it in the warning
    for (const e of zs) { e.x0 = e.x; e.y0 = e.y; }
    const frp = s => { for (let i = 0; i < s * 60; i++) { pin(); update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    frp(0.3); out.fuse = !!GS.station && !GS.station.done; out.left = GS.station && +GS.station.t.toFixed(1);
    frp(3.5);
    out.done = !!(GS.station && GS.station.done); out.gone = !!GS.RUN.stationGone;
    out.pumpsLeft = crystals.filter(c => c.hue === 2 && c.alive).length; out.roofLeft = !!roofs.find(r => r.reg === 'gs_roof');
    out.dead = zs.filter(e => e.dead).length + '/' + zs.length;
    out.lampsDown = lamps.filter(l => l.down && Math.hypot(l.bx - cx, l.by - cy) < 400).length + '/' + lampsNear;
    out.clearHurt = hp0 - GS.P.hp;
    // a Continue at the gas station: the shell, no fuse again
    newRun(); GS.state = 'play'; placeArrival();
    out.ruinPumps = crystals.filter(c => c.hue === 2 && c.alive).length; out.ruinRoof = !!roofs.find(r => r.reg === 'gs_roof'); out.ruinStation = GS.station;
    // and standing at the pumps when it goes
    GS.RUN.stationGone = false; newRun(); GS.state = 'play'; GS.queue = []; GS.enemies.length = 0; placeArrival(); GS.nightLive = true;
    const ps2 = crystals.filter(c => c.hue === 2), rf2 = roofs.find(r => r.reg === 'gs_roof');
    GS.P.x = rf2.x; GS.P.y = rf2.y + 30; GS.P.hp = 1e6; GS.P.inv = 0; const big = GS.P.hp;
    hitCrystal(ps2[0], 999, 1, 0);
    for (let i = 0; i < 4 * 60; i++) { update(1 / 60); tickWorld(1 / 60); GS.P.x = rf2.x; GS.P.y = rf2.y + 30; GS.P.inv = 0; if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } }
    out.atPumps = Math.round(big - GS.P.hp); out.maxHp = S.maxHp;
    return out;
  })()`);
  await pg.close();
  check(o.miss === false && o.missK, 'a round 25 px off the bulb should leave it lit');
  check(o.hit && o.shot && o.hitK === 0, `a round through the bulb should pop it for good: ${o.hit} ${o.hitK}`);
  check(o.real, 'a real round flying through a bulb should pop it');
  check(!o.buddyPops, "the backup's rounds should not pop lamps");
  check(
    o.seenLit > o.seenDark * 1.5 && o.seenDark < o.sight,
    `the dead should see you further in lamplight: lit ${Math.round(o.seenLit)}, dark ${Math.round(o.seenDark)}, base ${o.sight}`
  );
  check(
    o.boxOut === 'no box' || /^(\d+)\/\1$/.test(o.boxOut),
    `a shot electrical box should put out the lamps round it: ${o.boxOut}`
  );
  check(g.pumps === 3 && g.roof, `the gas station should have its three pumps and canopy: ${g.pumps}, ${g.roof}`);
  check(
    g.fuse && g.left > 2,
    `one blown pump should set the tanks going with a few seconds' warning: ${g.fuse}, ${g.left} s left`
  );
  check(g.done && g.gone && g.pumpsLeft === 0 && !g.roofLeft, `then the whole station should go: ${JSON.stringify(g)}`);
  check(/^(\d+)\/\1$/.test(g.dead), `the dead on the forecourt should all go with it: ${g.dead}`);
  check(/^(\d+)\/\1$/.test(g.lampsDown), `the lamps round it should be flattened: ${g.lampsDown}`);
  check(g.clearHurt === 0, `well clear, you should be untouched: lost ${g.clearHurt}`);
  check(
    g.ruinPumps === 0 && !g.ruinRoof && !g.ruinStation,
    'a Continue there should find it burnt out, with no fuse again'
  );
  check(g.atPumps >= g.maxHp, `standing at the pumps when it goes should kill you: ${g.atPumps} of ${g.maxHp}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `lamps pop, seen ${Math.round(o.seenLit)} px lit / ${Math.round(o.seenDark)} dark, box ${o.boxOut}; station: ${g.dead} dead, lamps ${g.lampsDown}, ${g.atPumps} damage at the pumps`;
}
