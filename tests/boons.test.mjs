/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The game changers (game/boons.js): the dead in uniform drop what they carried, it lies there a dozen seconds and
// doesn't come to you, and each does what it says for as long as it says, then wears off.
import { openGame, check } from './lib/harness.mjs';

export const name = 'boons: what the dead in uniform drop, and what each one does';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play'; GS.dir = null;
    const P = GS.P, out = {};
    GS.wave = 3; startWave(); for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.queue.length = 0;
    const fr = n => { for (let i = 0; i < n; i++) { update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } P.inv = 0; } };
    const ch0 = BOON.chance; BOON.chance = 1;
    const dead = (v, x, y) => { const e = makeEnemy('skitter', x, y); e.emerge = 1; e.v = v; e.dmg = 0; killEnemy(e, 999, 'bolt'); return e; };
    // a nurse: adrenaline on the ground where she fell; it doesn't come to you, and a second one so soon drops nothing
    const fx = P.x + 120, fy = P.y;
    dead(4, fx, fy); out.drop = (GS.boonDrops[0] || {}).id; dead(4, fx, fy + 30); out.one = GS.boonDrops.length;
    fr(60); const k = GS.boonDrops[0]; out.stays = !!k && Math.hypot(k.x - fx, k.y - fy) < 2;
    // a plain one (an ordinary person's clothes) drops nothing, gap or no gap
    GS.boonDrops.length = 0; GS.boonT = -99; dead(0, fx, fy); out.plain = GS.boonDrops.length;
    // left lying: gone after its time
    dead(4, fx, fy); fr(60 * (BOON.life + 0.5)); out.gone = GS.boonDrops.length;
    // picked up: it runs, with a bar on the gauge, and wears off
    GS.boonT = -99; dead(4, P.x, P.y); fr(2);
    out.on = boonOn('adren'); out.t = +(P.boons.adren || 0).toFixed(1); updateHud(); out.bar = !!document.querySelector('#boonRows .boon');
    // reloads twice as quick
    const rl = () => { equip('pistol', true); P.mag.pistol = 0; P.ammo.light = 200; P.swap = 0; startReload(); let n = 0; while (P.reload > 0 && n < 600) { fr(1); n++; } return n; };
    out.rlFast = rl(); P.boons.adren = 0.001; fr(1); out.rlSlow = rl();
    // duty rounds: through more of them, and harder
    const shotOf = () => { GS.pbullets.length = 0; equip('pistol', true); P.mag.pistol = 12; P.fireCd = 0; P.swap = 0; firePlayer(P.x + 300, P.y, P, null); const b = GS.pbullets[0]; return b ? [b.pierce, b.dmg] : null; };
    const s0 = shotOf(); P.boons.duty = 20; const s1 = shotOf(); P.boons.duty = 0;
    out.duty = s0 && s1 ? [s1[0] - s0[0], +(s1[1] / s0[1]).toFixed(2)] : null;
    // turnout gear: fire and blasts don't touch you, the rest hurts less
    P.boons.gear = 25; P.hp = 80; hurtPlayer(10, undefined, undefined, 'fire'); P.inv = 0; hurtPlayer(10, undefined, undefined, 'an explosion'); out.fireHp = P.hp;
    P.inv = 0; hurtPlayer(10, undefined, undefined, 'the dead'); out.hitLost = +(80 - P.hp).toFixed(2); P.boons.gear = 0; P.inv = 0; P.hp = 80; hurtPlayer(10, undefined, undefined, 'the dead'); out.hitBare = +(80 - P.hp).toFixed(2);
    // the go-bag: every gun topped up
    giveGun('shotgun'); giveGun('smg'); for (const t in P.ammo) P.ammo[t] = 0; GS.boonT = -99; BOON.chance = 1; dead(3, P.x, P.y);
    if (GS.boonDrops[0] && GS.boonDrops[0].id === 'duty') { GS.boonDrops[0].id = 'bag'; }
    fr(2); out.bag = ['light', 'shells'].every(t => P.ammo[t] === ammoMax(t));
    // the drum shotgun from an armored one: in your hands, never reloaded, gone with its last shell
    P.boons = {}; equip('pistol', true); const E = makeEnemy('skitter', P.x, P.y); E.emerge = 1; makeElite(E); E.trait = 'armored'; const el0 = BOON.elite; BOON.elite = 1; GS.boonT = -99; killEnemy(E, 1e6, 'bolt'); BOON.elite = el0; fr(2);
    out.drumGun = P.gun; out.drumMag = P.mag.auto; out.temp = P.temp; out.save = runData().P.owned.includes('auto') || runData().P.gun === 'auto';
    let n = 0; while (P.gun === 'auto' && n++ < 4000) { P.fireCd = 0; P.swap = 0; P.reload = 0; firePlayer(P.x + 300, P.y, P, null); fr(1); }
    out.after = P.gun; out.kept = P.owned.includes('auto');
    BOON.chance = ch0;
    return out;
  })()`);
  await pg.close();
  check(o.drop === 'adren' && o.one === 1, `a nurse's drop: ${o.drop}, ${o.one} on the ground after a second kill`);
  check(o.stays, 'the drop came to you or moved: it should lie where she fell');
  check(o.plain === 0, 'an ordinary one dropped something');
  check(o.gone === 0, 'a drop left lying was still there after its time');
  check(o.on && o.t > 14 && o.bar, `adrenaline taken: on ${o.on}, ${o.t} s, bar on the gauge ${o.bar}`);
  check(o.rlFast > 0 && o.rlSlow > o.rlFast * 1.7, `reload frames with adrenaline ${o.rlFast}, without ${o.rlSlow}`);
  check(o.duty && o.duty[0] === 3 && o.duty[1] === 1.5, 'duty rounds: pierce and damage ' + JSON.stringify(o.duty));
  check(o.fireHp === 80, `turnout gear: fire and a blast took ${80 - o.fireHp}`);
  check(
    o.hitLost > 0 && Math.abs(o.hitLost / o.hitBare - 0.65) < 0.02,
    `turnout gear: a hit cost ${o.hitLost}, bare ${o.hitBare}`
  );
  check(o.bag, 'the go-bag left a gun short of full');
  check(
    o.drumGun === 'auto' && o.drumMag === 24 && o.temp === 'auto',
    `the drum gun: ${o.drumGun}, ${o.drumMag} in it`
  );
  check(
    o.after !== 'auto' && !o.kept && !o.save,
    `the empty drum gun: in hand ${o.after}, kept ${o.kept}, saved ${o.save}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `adrenaline reloads in ${o.rlFast} frames (${o.rlSlow} without), duty rounds +${o.duty[0]} through ×${o.duty[1]}, gear: no fire, hits ×0.65, the drum gun gone when spent`;
}
