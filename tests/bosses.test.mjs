/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Each boss on its night: it must arrive, move into its later phases as it is hurt, and die cleanly,
// with no errors. The game is stepped by hand at 60 steps a second of game time.
import { openGame, check } from './lib/harness.mjs';

export const name = 'bosses: arrive, change phase, die';
// the campaign's bosses, each on its night and on its stretch of the road (route.js BOSS_J)
const CASES = [
  ['town', 5, 'abom'],
  ['highway', 8, 'chief'],
  ['highway', 10, 'roadkill'],
  ['cemetery', 13, 'grave'],
  ['cemetery', 15, 'pz'],
];
const NAMES = {
  abom: 'Abomination',
  chief: 'Fire Chief',
  roadkill: 'Roadkill',
  grave: 'Gravekeeper',
  pz: 'Patient Zero',
};
const FIGHT = (district, night) => `(() => {
  begin(); GS.RUN.district = '${district}'; newRun(); GS.state = 'play'; __god();
  const step = n => { for (let i = 0; i < n; i++) { if (GS.state === 'levelup') { GS.luOpenT = 0; choose(0); } if (GS.state === 'cine') cineSkip(); update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); } };
  GS.wave = ${night} - 1; GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.interT = 99; startWave();
  for (let i = 0; i < 600 && !GS.boss; i++) step(1);
  if (!GS.boss) return { spawned: false };
  const q = GS.boss, out = { spawned: true, bt: q.btype, ph0: q.ph, name: bossName(), want: bossType() };
  if (q.btype === 'chief') { // its charge shows its line on the ground first, then goes down that line
    for (let i = 0; i < 600 && (q.emerge < 1 || q.busyT > 0 || q.st !== 'move'); i++) step(1);
    q.x = GS.P.x + 300 * GK; q.y = GS.P.y; q.rushT = 0; q.mortT = q.extT = q.tailT = q.summonT = 99; q.los = true;
    const w0 = GS.warns.length; step(1);
    out.brace = q.st; out.lane = GS.warns.slice(w0).some(w => w.lane && Math.abs(w.a - q.ra) < 1e-6);
    const a = q.ra; for (let i = 0; i < 90 && q.st === 'brace'; i++) step(1);
    out.onLine = q.st === 'rush' && Math.abs(Math.cos(a) - q.lx) < 1e-6 && Math.abs(Math.sin(a) - q.ly) < 1e-6;
  }
  q.hp = q.maxHp * 0.6; step(240); out.ph1 = q.ph;
  q.hp = q.maxHp * 0.3; step(240); out.ph2 = q.ph;
  q.hp = 0; killEnemy(q, 999, 'bolt'); step(300);
  out.dead = !!q.dead; out.state = GS.state;
  return out;
})()`;
export async function run(b) {
  const done = [];
  for (const [district, night, bt] of CASES) {
    const { pg, errs, ev } = await openGame(b);
    await ev('window.__nr = true; 1');
    const r = await ev(FIGHT(district, night));
    await pg.close();
    check(r.spawned, `${bt}: never arrived on night ${night}`);
    check(r.bt === bt, `${bt}: got ${r.bt} instead`);
    check(r.want === bt, `${bt}: the night was announced for ${r.want}`);
    check(r.name === NAMES[bt], `${bt}: the boss bar says ${r.name}`);
    check(r.ph2 > r.ph0, `${bt}: stayed in phase ${r.ph0} down to 30% health`);
    if (bt === 'chief')
      check(
        r.brace === 'brace' && r.lane && r.onLine,
        `chief: the charge's warning: ${r.brace}, lane ${r.lane}, on its line ${r.onLine}`
      );
    check(r.dead, `${bt}: did not die`);
    check(['play', 'levelup', 'won'].includes(r.state), `${bt}: game in state ${r.state} after the kill`);
    check(!errs.length, `${bt}: page errors: ` + errs.join(' | '));
    done.push(bt);
  }
  return done.join(', ');
}
