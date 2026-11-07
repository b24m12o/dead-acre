/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The truck ride, at its worst: you climb aboard hurt, with levels banked, and don't fire a shot. The dead must
// climb on and claw you, the roadblock must give way, and you must never die or get a level-up card on the truck.
// At the other end you climb down alive, mortal again, with nobody still hanging on, and the cards come then.
// Before that, the way it starts: the truck is shut in a garage on the west side with a dry tank; three cans of fuel
// brought to the door open it, it pulls out, and it drives straight east (no going round in circles), its bumper
// right up against the roadblock when it rams.
import { openGame, check } from './lib/harness.mjs';

export const name = 'ride: fuel the garage truck, then hurt, idle and levelled up on it';
const RIDE = String.raw`(() => {
  const fr = () => { update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); };
  const fr0 = () => { fr(); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } GS.P.hp = S.maxHp; }; // getting there: no cards, no harm
  initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null;
  GS.RUN.stop = 0; GS.wave = 2; leaveStop('foot'); travelStep(); document.querySelector('#route .way[data-i="0"]').click(); // walk into St. Mary's, the first place left by truck
  GS.queue = []; GS.enemies.length = 0; GS.wave = 5; GS.nightLive = true; GS.nightDone = false; nightCleared();
  for (let i = 0; i < 60 * 8 && !GS.truck; i++) fr0();
  const T = GS.truck;
  if (!T) return { err: 'no truck' };
  if (!T.dry || !T.garage || T.cans.length !== 3) return { err: 'not a dry truck in a garage with three cans to find: ' + JSON.stringify({ dry: T.dry, g: !!T.garage, n: T.cans && T.cans.length }) };
  const G = T.garage, g = { gx: G.x, shut: G.door.every(i => grid[i]) };
  for (let i = 0; i < 60 * 3; i++) fr0();
  if (!T.dry) return { err: 'it started with no fuel' };
  for (const c of T.cans) { GS.P.x = c.x; GS.P.y = c.y; for (let i = 0; i < 3; i++) fr0(); }
  if (T.fuel !== 3) return { err: 'walking onto the cans picked up ' + T.fuel };
  { const W = wayOut(); GS.P.x = W.x; GS.P.y = W.y; g.label = W.label; }
  for (let i = 0; i < 60 * 4 && T.dry; i++) { GS.enemies.length = 0; fr0(); }
  g.open = !T.dry && G.door.every(i => !grid[i]);
  for (let i = 0; i < 60 * 8 && !T.parked; i++) { GS.enemies.length = 0; fr0(); }
  if (!T.parked) return { err: 'it never pulled out', g };
  GS.P.x = T.x - Math.cos(T.a) * 90; GS.P.y = T.y - Math.sin(T.a) * 90; GS.enemies.length = 0;
  for (let i = 0; i < 120 && !GS.P.ride; i++) fr();
  if (GS.P.ride !== 'truck') return { err: 'never climbed aboard' };
  GS.P.hp = 70; GS.xp = GS.xpNeed * 3; mouse.down = false;
  const o = { minHp: GS.P.hp, maxCl: 0, cards: false, over: false, block: !!T.ride.block, t: 0, g, gap: 0 };
  { const P0 = T.ride.path.pts, P2 = [P0[0]]; for (const q of P0) if (Math.hypot(q[0] - P2[P2.length - 1][0], q[1] - P2[P2.length - 1][1]) >= 100) P2.push(q); let turn = 0; for (let k = 1; k < P2.length - 1; k++) turn += Math.abs(angDiff(Math.atan2(P2[k][1] - P2[k - 1][1], P2[k][0] - P2[k - 1][0]), Math.atan2(P2[k + 1][1] - P2[k][1], P2[k + 1][0] - P2[k][0]))); o.turn = Math.round(turn * 180 / Math.PI); let west = 0, tot = 0; for (let k = 1; k < P2.length; k++) { const dx = P2[k][0] - P2[k - 1][0]; tot += Math.hypot(dx, P2[k][1] - P2[k - 1][1]); west += Math.max(0, -dx); } o.west = Math.round((100 * west) / tot); o.len = Math.round(T.ride.path.len / TILE); o.endX = Math.round(P0[P0.length - 1][0] / TILE); } // the turning, sampled every 100 px: the corners it takes, not the wobble of the smoothing
  let hits = T.ride.block ? T.ride.block.hp : 0;
  for (let i = 0; i < 60 * 90 && GS.state === 'play'; i++) {
    fr(); o.t++;
    const B = T.ride.block;
    if (B && B.hp < hits) {
      hits = B.hp;
      const f = B.fwd - (B.hp ? 7 : 0), nx = T.x + Math.cos(T.a) * 59, ny = T.y + Math.sin(T.a) * 59;
      for (const c of B.cars) o.gap = Math.max(o.gap, Math.round((c.x + B.dx * f - nx) * B.dx + (c.y + B.dy * f - ny) * B.dy - 21));
    } // at each ram: from the bumper to the side of each wreck, as drawn
    o.minHp = Math.min(o.minHp, GS.P.hp);
    o.maxCl = Math.max(o.maxCl, GS.enemies.filter(e => e.cling && !e.dead).length);
  }
  o.cards = o.cards || GS.state === 'levelup'; o.over = GS.state === 'over'; o.stateEnd = GS.state;
  o.blockLeft = T.ride.block ? T.ride.block.hp : 0;
  if (GS.state !== 'travel') return o;
  travelStep(); document.querySelector('#route .way').click();
  o.arrived = GS.state; o.inv = GS.P.inv; o.ride = GS.P.ride; o.cling = GS.enemies.filter(e => e.cling).length;
  for (let i = 0; i < 60 * 8 && GS.state === 'play'; i++) fr();
  o.cardsAfter = GS.state === 'levelup';
  return o;
})()`;
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(RIDE);
  await pg.close();
  check(!o.err, o.err);
  check(o.g.gx < 26 && o.g.shut, `the garage should stand shut on the west side: ${JSON.stringify(o.g)}`);
  check(o.g.label === 'GARAGE' && o.g.open, `with the fuel in, the door never went up: ${JSON.stringify(o.g)}`);
  check(
    o.endX > 50 && o.west < 20 && o.turn < 720 && o.len < 120,
    `the drive out wanders: ${o.len} tiles, ${o.turn}° of turning, ${o.west}% of it back west, ends at x ${o.endX}`
  );
  check(!o.block || o.gap <= 6, `the bumper stops ${o.gap} px short of the roadblock`);
  check(o.stateEnd === 'travel', `the ride ended in state ${o.stateEnd}`);
  check(
    !o.over && o.minHp >= 30,
    `bled too far on the truck (hp ${o.minHp}): it should never take you under about a third`
  );
  check(o.minHp < 70, 'nothing on the truck ever hurt you');
  check(o.maxCl > 0, 'nothing ever climbed onto the truck');
  check(!o.block || o.blockLeft === 0, 'the roadblock never gave way');
  check(o.arrived === 'play' && !o.ride && o.inv < 5 && !o.cling, `climbed down wrong: ${JSON.stringify(o)}`);
  check(o.cardsAfter, 'the banked level-up cards never came after the ride');
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${Math.round(o.t / 60)} s ride over ${o.len} tiles (${o.turn}° of turning, ${o.west}% back west, bumper gap ${o.gap} px), down to ${Math.round(o.minHp)} hp, up to ${o.maxCl} climbing on, cards after`;
}
