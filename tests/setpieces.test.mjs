/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Each place's own moment has to happen where and when it should: the quarry's dead come up out of the pit, the
// bridge's horde comes from both ends of Route 9, the Fire Chief walks out of the motel's fire station, and on the
// last night the hospital's wards empty and Patient Zero comes out of the front door.
import { openGame, check } from './lib/harness.mjs';

export const name = 'set pieces: each place does its own thing';
const fr = `update(1/60); tickWorld(1/60); updateCamera(1/60); if (GS.state==='levelup') { GS.state='play'; $('levelup').hidden=true; } GS.P.hp = S.maxHp;`;
const at = (id, d, stop, night, px, py) => `initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null;
  GS.RUN.journey = true; GS.RUN.layout = '${id}'; GS.RUN.district = '${d}'; GS.RUN.stop = ${stop}; newRun(); GS.state = 'play'; GS.enemies.length = 0; GS.queue = [];
  GS.P.x = ${px} * TILE; GS.P.y = ${py} * TILE; GS.wave = ${night} - 1; GS.nightDone = false; GS.interT = 99; startWave();`;
const born = test => `const seen = new Set(); let n = 0, hit = 0;
  const look = () => { for (const e of GS.enemies) if (!seen.has(e.id)) { seen.add(e.id); n++; const tx = e.x / TILE, ty = e.y / TILE; if (${test}) hit++; } };`;
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const q = await ev(`(() => { ${at('quarry', 'highway', 4, 9, 30, 30)} ${born('tx > 9 && tx < 51 && ty > 38')}
    for (let i = 0; i < 60 * 40; i++) { ${fr} look(); } return { n, hit }; })()`);
  check(q.n > 20 && q.hit / q.n > 0.4, `quarry: only ${q.hit} of ${q.n} came out of the pit`);
  const br = await ev(`(() => { ${at('bridge', 'highway', 5, 11, 30, 30)}
    for (let i = 0; i < 60 * 30 && !(GS.horde && GS.horde.ents); i++) { ${fr} }
    const H = GS.horde; return H && { bridge: !!H.bridge, ents: (H.ents || []).map(e => Math.round(e[0] / TILE)) }; })()`);
  check(
    br && br.bridge && br.ents.length === 2 && br.ents[0] < 8 && br.ents[1] > 52,
    `bridge: horde from ${JSON.stringify(br)}`
  );
  const mo = await ev(`(() => { ${at('motel', 'highway', 3, 8, 30, 22)}
    for (let i = 0; i < 60 * 12 && !GS.boss; i++) { ${fr} } const e = GS.boss; return e && { bt: e.btype, x: e.x / TILE, y: e.y / TILE }; })()`);
  check(
    mo && mo.bt === 'chief' && Math.abs(mo.x - 36.5) < 3 && Math.abs(mo.y - 35.4) < 3,
    `motel: the Chief came from ${JSON.stringify(mo)}`
  );
  const ho =
    await ev(`(() => { ${at('hospital', 'cemetery', 7, 15, 30, 33)} ${born('tx > 12 && tx < 47 && ty > 8 && ty < 22')}
    let boss = null;
    for (let i = 0; i < 60 * 14; i++) { ${fr} look(); if (GS.boss && !boss) boss = { bt: GS.boss.btype, x: GS.boss.x / TILE, y: GS.boss.y / TILE }; } return { n, hit, boss }; })()`);
  check(ho.hit >= 10, `hospital: only ${ho.hit} came out of the wards`);
  check(
    ho.boss && ho.boss.bt === 'pz' && Math.abs(ho.boss.x - 29.5) < 3 && Math.abs(ho.boss.y - 22.8) < 3,
    `hospital: Patient Zero came from ${JSON.stringify(ho.boss)}`
  );
  await pg.close();
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `pit ${q.hit}/${q.n}, bridge both ends, Chief from the station, ${ho.hit} out of the wards, PZ out the front door`;
}
