/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Each boss on its night: it must arrive, move into its later phases as it is hurt, and die cleanly,
// with no errors. The game is stepped by hand at 60 steps a second of game time.
import { openGame, check } from './lib/harness.mjs';

export const name = 'bosses: arrive, change phase, die';
const CASES = [
  ['town', 5, 'abom'],
  ['highway', 5, 'roadkill'],
  ['cemetery', 5, 'grave'],
  ['town', 10, 'chief'],
  ['town', 15, 'pz'],
];
const FIGHT = (district, night) => `(() => {
  begin(); RUN.district = '${district}'; newRun(); state = 'play'; __god();
  const step = n => { for (let i = 0; i < n; i++) { if (state === 'levelup') { luOpenT = 0; choose(0); } update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); } };
  wave = ${night} - 1; queue = []; for (const e of enemies) e.dead = true; enemies.length = 0; interT = 99; startWave();
  for (let i = 0; i < 600 && !boss; i++) step(1);
  if (!boss) return { spawned: false };
  const q = boss, out = { spawned: true, bt: q.btype, ph0: q.ph };
  q.hp = q.maxHp * 0.6; step(240); out.ph1 = q.ph;
  q.hp = q.maxHp * 0.3; step(240); out.ph2 = q.ph;
  q.hp = 0; killEnemy(q, 999, 'bolt'); step(300);
  out.dead = !!q.dead; out.state = state;
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
    check(r.ph2 > r.ph0, `${bt}: stayed in phase ${r.ph0} down to 30% health`);
    check(r.dead, `${bt}: did not die`);
    check(['play', 'levelup', 'won'].includes(r.state), `${bt}: game in state ${r.state} after the kill`);
    check(!errs.length, `${bt}: page errors: ` + errs.join(' | '));
    done.push(bt);
  }
  return done.join(', ');
}
