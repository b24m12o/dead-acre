/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The truck ride, at its worst: you climb aboard hurt, with levels banked, and don't fire a shot. The dead must
// climb on and claw you, the roadblock must give way, and you must never die or get a level-up card on the truck.
// At the other end you climb down alive, mortal again, with nobody still hanging on, and the cards come then.
import { openGame, check } from './lib/harness.mjs';

export const name = 'ride: hurt, idle and levelled up on the truck';
const RIDE = String.raw`(() => {
  const fr = () => { update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); };
  initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.queue = []; GS.enemies.length = 0;
  GS.RUN.stop = 1; GS.wave = 5; GS.nightLive = true; GS.nightDone = false; nightCleared();
  for (let i = 0; i < 60 * 30 && !(GS.truck && GS.truck.parked); i++) fr();
  const T = GS.truck;
  if (!T) return { err: 'no truck came' };
  GS.P.x = T.x - Math.cos(T.a) * 90; GS.P.y = T.y - Math.sin(T.a) * 90; GS.enemies.length = 0;
  for (let i = 0; i < 120 && !GS.P.ride; i++) fr();
  if (GS.P.ride !== 'truck') return { err: 'never climbed aboard' };
  GS.P.hp = 30; GS.xp = GS.xpNeed * 3; mouse.down = false;
  const o = { minHp: GS.P.hp, maxCl: 0, cards: false, over: false, block: !!T.ride.block, t: 0 };
  for (let i = 0; i < 60 * 90 && GS.state === 'play'; i++) {
    fr(); o.t++;
    o.minHp = Math.min(o.minHp, GS.P.hp);
    o.maxCl = Math.max(o.maxCl, GS.enemies.filter(e => e.cling && !e.dead).length);
  }
  o.cards = o.cards || GS.state === 'levelup'; o.over = GS.state === 'over'; o.stateEnd = GS.state;
  o.blockLeft = T.ride.block ? T.ride.block.hp : 0;
  if (GS.state !== 'travel') return o;
  travelStep(); $('routeGo').click();
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
  check(o.stateEnd === 'travel', `the ride ended in state ${o.stateEnd}`);
  check(!o.over && o.minHp >= 1, `died on the truck (hp ${o.minHp})`);
  check(o.minHp < 30, 'nothing on the truck ever hurt you');
  check(o.maxCl > 0, 'nothing ever climbed onto the truck');
  check(!o.block || o.blockLeft === 0, 'the roadblock never gave way');
  check(o.arrived === 'play' && !o.ride && o.inv < 5 && !o.cling, `climbed down wrong: ${JSON.stringify(o)}`);
  check(o.cardsAfter, 'the banked level-up cards never came after the ride');
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${Math.round(o.t / 60)} s ride, down to ${Math.round(o.minHp)} hp, up to ${o.maxCl} climbing on, cards after`;
}
