/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Each of the three does something the others can't. The Soldier braces: half a second standing still and every
// shot hits harder and goes through one more, gone the moment he moves. The Deputy's shove comes back sooner and
// hits three times as hard. A roll reloads the Gunslinger's revolver and SMG (from what he carries), and no other gun.
// Each has two picks of their own on the level-up cards that build on it, offered to nobody else.
import { openGame, check } from './lib/harness.mjs';

export const name =
  'heroes: the Soldier braces, the Deputy shoves like a riot line, the Gunslinger reloads on the roll';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true;
    const start = h => {
      GS.meta.unlocked[h] = true; GS.meta.hero = h; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
      GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
      return GS.P;
    };
    const fr = n => { for (let i = 0; i < n; i++) { update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    // the Soldier
    let P = start('ranger');
    out.hero1 = GS.RUN.hero;
    P.vx = P.vy = 0; fr(45);
    out.braced = braced(); out.bDmg = heroGun('rifle').dmg; out.bPierce = heroGun('rifle').pierce; out.bSpread = heroGun('rifle').spread;
    out.bOther = heroGun('shotgun').dmg; // any gun, braced
    for (let i = 0; i < 12; i++) { P.vx = 200 * GK; fr(1); }
    out.moved = braced(); out.mDmg = heroGun('rifle').dmg; out.mPierce = heroGun('rifle').pierce;
    // his own picks: Dug In and Planted Feet
    out.poolS = upgradePool().filter(u => u.hero).map(u => u.id).sort().join();
    LV.dugin = 2; P.vx = P.vy = 0; fr(45);
    out.dugin = heroGun('rifle').dmg;
    LV.setfeet = 1; P.vx = 200 * GK; fr(2); P.vx = P.vy = 0; fr(20);
    out.setfeet = braced();
    // the Deputy
    P = start('breacher');
    out.cd = shoveCd() / SHOVE.cd;
    const e = makeEnemy('skitter', P.x + 40 * GK, P.y); e.emerge = 1; e.hp = e.maxHp = 500; e.aw = 9; e.shield = null; e.trait = null;
    P.aimA = 0; P.shoveCd = 0; tryShove();
    out.shoveDmg = 500 - e.hp; out.cdSet = P.shoveCd;
    out.noBrace = braced();
    out.poolD = upgradePool().filter(u => u.hero).map(u => u.id).sort().join();
    // Riot Line reaches one a plain shove can't; Grit gives health back for each one hit
    const far = makeEnemy('skitter', P.x + SHOVE.reach + (14 + 10) * GK, P.y); far.emerge = 1; far.hp = far.maxHp = 500; far.aw = 9; far.shield = null; far.trait = null;
    GS.enemies.length = 0; GS.enemies.push(far);
    P.aimA = 0; P.shoveCd = 0; out.reach0 = tryShove();
    LV.riotline = 1; LV.grit = 2; P.hp = 50; far.x = P.x + SHOVE.reach + (14 + 10) * GK; far.y = P.y; far.down = 0; far.stag = 0;
    P.aimA = 0; P.shoveCd = 0; P.shoveT = 0; out.reach1 = tryShove(); out.grit = P.hp;
    GS.enemies.length = 0;
    // the Gunslinger
    P = start('grenadier');
    P.mag.pistol = 0; P.dashCd = 0; tryDash();
    out.revolver = P.mag.pistol === magSize('pistol');
    fr(40);
    giveGun('smg'); switchGun('smg'); fr(40);
    P.mag.smg = 0; P.ammo.light = 10; P.dashCd = 0; P.reload = 0; tryDash();
    out.smg = [P.mag.smg, P.ammo.light];
    fr(40);
    giveGun('rifle'); switchGun('rifle'); fr(40);
    P.mag.rifle = 0; P.dashCd = 0; P.reload = 0; tryDash();
    out.rifle = P.mag.rifle;
    out.poolG = upgradePool().filter(u => u.hero).map(u => u.id).sort().join();
    // Sleight of Hand: now the rifle too. Out of the Roll: the revolver hits harder for a moment after
    fr(40); LV.sleight = 1; P.ammo.rifle = 99; P.ammo[GUNS.rifle.ammo] = 99; P.dashCd = 0; P.reload = 0; tryDash();
    out.sleight = P.mag.rifle;
    fr(60); LV.rollhot = 2; const cold = heroGun('pistol').dmg; P.dashCd = 0; tryDash();
    out.hot = heroGun('pistol').dmg / cold; out.hotRifle = heroGun('rifle').dmg;
    fr(120); out.hotAfter = heroGun('pistol').dmg / cold;
    // and nobody else's roll reloads anything
    P = start('ranger');
    P.mag.pistol = 0; P.dashCd = 0; tryDash();
    out.soldierRoll = P.mag.pistol;
    return out;
  })()`);
  await pg.close();
  check(o.hero1 === 'ranger', 'the run should start as the hero picked: ' + o.hero1);
  check(
    o.braced && Math.abs(o.bDmg - 1.44) < 0.001 && o.bPierce === 1 && o.bSpread < 1,
    `standing still, the Soldier should be braced: ${o.braced}, rifle damage ×${o.bDmg}, pierce ${o.bPierce}, spread ×${o.bSpread}`
  );
  check(Math.abs(o.bOther - 1.2) < 0.001, `braced should count for any gun: shotgun ×${o.bOther}`);
  check(
    !o.moved && Math.abs(o.mDmg - 1.2) < 0.001 && o.mPierce === 0,
    `moving should break it: ${o.moved}, ×${o.mDmg}, pierce ${o.mPierce}`
  );
  check(
    Math.abs(o.cd - 0.6) < 0.001 && o.shoveDmg === 18,
    `the Deputy's shove should come back in 0.6 of the time and hit for 18: ×${o.cd}, ${o.shoveDmg}`
  );
  check(!o.noBrace, 'only the Soldier braces');
  check(o.revolver, 'a roll should reload the Gunslinger’s revolver');
  check(o.smg[0] === 10 && o.smg[1] === 0, `and his SMG, from what he carries: ${o.smg}`);
  check(o.rifle === 0, `but not a rifle: ${o.rifle}`);
  check(o.soldierRoll === 0, `and nobody else's roll reloads: ${o.soldierRoll}`);
  check(
    o.poolS === 'dugin,setfeet' && o.poolD === 'grit,riotline' && o.poolG === 'rollhot,sleight',
    `each should be offered their own two picks and nobody else's: ${o.poolS} / ${o.poolD} / ${o.poolG}`
  );
  check(Math.abs(o.dugin - 1.2 * 1.4) < 0.001, `Dug In twice should make braced rifle shots ×1.68: ×${o.dugin}`);
  check(o.setfeet, 'Planted Feet should brace within a third of a second of stopping');
  check(
    o.reach0 === 0 && o.reach1 === 1,
    `Riot Line should reach one a plain shove can't: ${o.reach0} then ${o.reach1}`
  );
  check(o.grit === 54, `Grit twice should give back 4 for the one shoved: ${o.grit}`);
  check(o.sleight > 0, `Sleight of Hand should let a roll reload a rifle: ${o.sleight}`);
  check(
    Math.abs(o.hot - 1.5) < 0.001 && Math.abs(o.hotAfter - 1) < 0.001 && Math.abs(o.hotRifle - 1) < 0.001,
    `Out of the Roll twice: revolver ×1.5 just after a roll, back to ×1 two seconds on, a rifle never: ×${o.hot}, ×${o.hotAfter}, rifle ×${o.hotRifle}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `braced ×${o.bDmg.toFixed(2)} and through one more; Deputy's shove ×${o.cd} cooldown, ${o.shoveDmg} damage; roll loads revolver and SMG only`;
}
