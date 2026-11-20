/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The figures move with what happens to them. A throw takes your free hand off the gun, back past the shoulder and
// through; a blow notes where it came from (the body jolts away from it) and leaves blood on you and on your people;
// a crowd of the dead comes in sizes, though the body you hit is the same.
import { openGame, check } from './lib/harness.mjs';

export const name = 'characters: the throw, the blow, blood on your people, a crowd in sizes';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; GS.meta.hero = 'ranger'; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    const P = GS.P, out = {};
    const fr = n => { for (let i = 0; i < n; i++) { update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    let spot = null;
    for (let t = 0; t < 30000 && !spot; t++) { const x = 500 + Math.random() * (WW - 1000), y = 500 + Math.random() * (WH - 1000); let ok = true;
      for (let dx = -160; dx <= 160 && ok; dx += 20) for (let dy = -160; dy <= 160 && ok; dy += 20) if (blockPt(x + dx, y + dy)) ok = false; if (ok) spot = [x, y]; }
    if (!spot) return { err: 'no open ground' };
    P.x = spot[0]; P.y = spot[1]; P.gun = 'rifle';
    // a blow from the north-east: the player notes where it came from, and bleeds
    P.inv = 0; const st0 = (P.stains || []).length;
    hurtPlayer(5, P.x + 40, P.y - 40);
    out.blowA = P.blowA; out.blowNow = GS.time - P.blowT < 0.05; out.stains = (P.stains || []).length - st0; P.hp = S.maxHp; P.inv = 0;
    // a survivor bitten keeps the blood too
    const s = Object.assign(makeSurvivor(P.x - 60, P.y + 40), { a: 0, cd: 0, aim: 0, look: 1, tint: NPC_TINTS[0] });
    budSetup(s, rollBud()); GS.buddies.push(s);
    const z = makeEnemy('skitter', s.x + 8, s.y); z.emerge = 1; z.dmg = 5; z.aw = 9; s.inv = 0;
    for (let i = 0; i < 180 && !(s.stains && s.stains.length); i++) { z.x = s.x + 8; z.y = s.y; P.inv = 1; fr(1); }
    out.sv = { stains: (s.stains || []).length, blow: GS.time - (s.blowT ?? -99) < 3 };
    z.dead = true;
    // a crowd: sizes for the people, none for a brute
    const bsz = []; for (let i = 0; i < 60; i++) bsz.push(makeEnemy('skitter', -999, -999).bs);
    out.bsMin = Math.min(...bsz); out.bsMax = Math.max(...bsz); out.bsBrute = makeEnemy('beetle', -999, -999).bs;
    for (const e of GS.enemies) if (e.x === -999) e.dead = true;
    // the free hand through a throw, aimed due east: behind the shoulder early on, out in front at the release, back on the gun after
    P.aimA = P.bodyA = P.moveA = 0; P.vx = P.vy = 0; P.strideAmp = 0; P.reload = 0; P.rackT = 0; P.recoil = 0; P.swap = 0; P.hurt = 0; P.blowT = -9;
    const along = k => { if (k < 0) P.throwT = -9; else { P.throwT = GS.time - k * 0.36; P.throwA = 0; } drawRanger(P); return P.__th[0] - P.x; };
    out.grip = along(-1); out.back = along(0.07); out.rel = along(0.3); out.after = along(0.99);
    // a roll and a badly hurt stance draw without trouble
    P.dashT = 0.1; P.dashA = 1; P.hp = S.maxHp * 0.1; drawRanger(P); out.rollOk = Number.isFinite(P.__th[0]);
    P.dashT = 0; P.hp = S.maxHp;
    return out;
  })()`);
  await pg.close();
  check(!o.err, o.err);
  check(
    Math.abs(o.blowA + Math.PI / 4) < 0.01 && o.blowNow && o.stains === 1,
    `a blow should note where it came from and leave blood: angle ${o.blowA}, now ${o.blowNow}, stains +${o.stains}`
  );
  check(o.sv.blow && o.sv.stains > 0, `a bitten survivor should flinch and keep the blood: ${JSON.stringify(o.sv)}`);
  check(
    o.bsMin >= 0.93 && o.bsMax <= 1.08 && o.bsMax - o.bsMin > 0.08 && o.bsBrute === 1,
    `the dead should come in sizes (and a brute keep its own): ${o.bsMin}–${o.bsMax}, brute ${o.bsBrute}`
  );
  check(
    o.grip > 12 && o.back < 0 && o.rel > 20 && Math.abs(o.after - o.grip) < 3 && o.rollOk,
    `the free hand should leave the gun, go back past the shoulder, come through and return: grip ${o.grip}, back ${o.back}, release ${o.rel}, after ${o.after}, roll ${o.rollOk}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `hand ${Math.round(o.grip)} → ${Math.round(o.back)} → ${Math.round(o.rel)} px along the throw; crowd ${o.bsMin.toFixed(2)}–${o.bsMax.toFixed(2)}`;
}
