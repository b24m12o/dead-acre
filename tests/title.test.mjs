/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The title screen: no hero to pick, no list of keys. Behind it, the Soldier holds the crossroads and drops the dead
// as they come in, and none of it counts (no kills in your stats, nothing to pick up); Channel 9 types out what the
// convoy is saying; a few seconds in, the title theme comes up, and it goes when a run starts.
import { openGame, check } from './lib/harness.mjs';

export const name = 'title: a last stand behind the title, Channel 9 typing, its own theme';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    // before any click or key, the browser keeps the sound off: the radio asks to be tuned in
    for (let i = 0; i < 30; i++) menuUpdate(1 / 30);
    out.ask = $('ch9t').textContent;
    initAudio();
    let k = 0; while (AC.state !== 'running' && k++ < 1) AC.resume();
    GS.meta.stats = GS.meta.stats || {};
    const k0 = GS.meta.stats.kills || 0;
    out.noHero = !document.querySelector('#menu .hero, #menu [data-h], #heroes, #keysLine');
    out.gun = GS.P.gun;
    let shots = 0;
    const tops = new Set();
    for (let i = 0; i < 30 * 30; i++) {
      const n = GS.corpses.length; menuUpdate(1 / 30); tickWorld(1 / 30);
      if (i % 10 === 0) tops.add(Math.round(document.querySelector('#menu h1').getBoundingClientRect().top));
      if (GS.corpses.length > n) shots++;
      if (i === 30) out.want3 = MUS.want; // (a second after the sound came on: not yet)
    }
    out.shots = shots;
    out.live = GS.enemies.length;
    out.near = Math.min(...GS.enemies.map(e => Math.hypot(e.x - GS.P.x, e.y - GS.P.y)));
    out.kills = (GS.meta.stats.kills || 0) - k0;
    out.pickups = GS.pickups.length;
    out.want = MUS.want;
    out.ch9 = $('ch9t').textContent;
    out.ac = AC.state;
    out.recorded = CH9.every(l => GS.VOX.some(r => r[4] === 'R' && r[1] === l)); // (every title line has Reyes' recording)
    out.tops = [...tops];
    begin(); GS.RUN.tut = null; GS.state = 'play';
    update(1 / 60); tickWorld(1 / 60);
    out.wantPlay = MUS.want;
    return out;
  })()`);
  await pg.close();
  check(o.noHero, 'the title screen should have no hero to pick and no list of keys');
  check(o.gun === 'rifle', `he holds the crossroads with a rifle: ${o.gun}`);
  check(o.shots >= 6 && o.shots <= 25, `in 30 s he should drop the dead as they come, now and then: ${o.shots}`);
  check(o.live >= 5 && o.live <= 10, `and more keep coming: ${o.live} on their feet`);
  check(o.near > 40, `none of them should reach him: nearest ${Math.round(o.near)}`);
  check(o.kills === 0 && o.pickups === 0, `none of it counts: ${o.kills} kills logged, ${o.pickups} pickups`);
  check(/tune in/.test(o.ask), `before the sound is on, the radio should ask to be tuned in: "${o.ask}"`);
  check(o.ac !== 'running' || !/tune in/.test(o.ch9), `once it's on, the radio is on the air: "${o.ch9}"`);
  check(o.recorded, 'every Channel 9 line on the title should be one Reyes has recorded');
  check(o.ch9.length > 10, `Channel 9 should be typing: "${o.ch9}"`);
  check(
    o.want3 === 'none' && o.want === 'title',
    `the theme should come up a couple of seconds after the sound comes on: ${o.want3} at 1 s, ${o.want} at 30 s`
  );
  check(o.wantPlay !== 'title', `and go when a run starts: ${o.wantPlay}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${o.shots} dropped in 30 s, ${o.live} coming, nothing counted; theme ${o.want}`;
}
