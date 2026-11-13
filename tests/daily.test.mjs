/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The daily run: the date alone decides the hero, the twists and the ways at every stop, the same for every run
// that day; over a month every hero and plenty of twist sets come up. Your best for the day is kept; the streak
// grows day by day and starts again after a missed one; the first daily of a day to reach night 5 pays more.
// Every date is passed in: the test never reads the clock.
import { openGame, check } from './lib/harness.mjs';

export const name = 'daily: one road a day, a best and a streak';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    const A = dailySetup('2026-11-13'), B2 = dailySetup('2026-11-13');
    out.same = JSON.stringify(A) === JSON.stringify(B2);
    const heroes = new Set(), sets = new Set();
    for (let i = 0; i < 30; i++) { const d = new Date(Date.UTC(2026, 10, 1 + i)), S = dailySetup(dayKey(d)); heroes.add(S.hero); sets.add(S.tw.slice().sort().join('+')); }
    out.heroes = heroes.size; out.allHeroes = Object.keys(HEROES).length; out.sets = sets.size;
    // two dailies on one date: the same ways at every stop
    initAudio(); GS.meta.tutDone = true; GS.meta.unlocked = { ranger: true };
    const road = () => {
      GS.HM = null; GS.DAILY = dailySetup('2026-11-13'); begin(); GS.RUN.tut = null;
      const L = [];
      for (let s = 0; s < STOPS.length - 1; s++) { GS.RUN.stop = s; GS.wave = STOPS[s].to; L.push(offerVia().join('/')); }
      return { L, hero: GS.RUN.hero, tw: Object.keys(GS.RUN.tw).sort().join('+'), daily: GS.RUN.daily && GS.RUN.daily.date };
    };
    const r1 = road(), r2 = road();
    out.road = r1.L.join(' '); out.sameRoad = r1.L.join() === r2.L.join();
    out.hero = r1.hero === A.hero; out.tw = r1.tw === A.tw.slice().sort().join('+'); out.locked = !GS.meta.unlocked[A.hero] || A.hero === 'ranger';
    out.runDate = r1.daily;
    GS.DAILY = null;
    // best and streak, day by day
    GS.meta.daily = null;
    const play = (date, wave, score) => { GS.RUN = { ...GS.RUN, daily: { date } }; GS.wave = wave; GS.score = score; dailyReached(); const bonus = dailyK(); dailyEnd(); return bonus; };
    out.bonus1 = play('2026-11-10', 6, 100);
    out.r1 = dailyRecord('2026-11-10');
    out.bonus2 = play('2026-11-10', 7, 50);
    out.r2 = dailyRecord('2026-11-10');
    play('2026-11-11', 5, 300);
    out.r3 = dailyRecord('2026-11-11');
    play('2026-11-12', 3, 900); // didn't reach night 5: no streak that day
    out.r4 = dailyRecord('2026-11-13');
    play('2026-11-13', 9, 10);
    out.r5 = dailyRecord('2026-11-13');
    out.left = dailyLeft(new Date(Date.UTC(2026, 10, 13, 22, 30)));
    return out;
  })()`);
  await pg.close();
  check(o.same, 'the same date should give the same daily');
  check(o.heroes === o.allHeroes, `over 30 days every hero should come up: ${o.heroes} of ${o.allHeroes}`);
  check(o.sets >= 4, `over 30 days at least four twist sets: ${o.sets}`);
  check(o.sameRoad, 'two dailies on one date should be offered the same ways at every stop');
  check(
    o.hero && o.tw && o.runDate === '2026-11-13',
    `the run should take the daily's hero, twists and date: ${o.hero} ${o.tw} ${o.runDate}`
  );
  check(
    o.bonus1 === 1.25 && o.bonus2 === 1,
    `the first daily of a day to reach night 5 pays more, the second doesn't: ${o.bonus1}, ${o.bonus2}`
  );
  check(
    o.r1.best === 100 && o.r2.best === 100 && o.r1.streak === 1,
    `the best for the day should stay: ${JSON.stringify([o.r1, o.r2])}`
  );
  check(o.r3.streak === 2, `the next day the streak should grow: ${o.r3.streak}`);
  check(o.r4.streak === 0 && o.r4.best === 0, `a day without night 5 breaks it: ${JSON.stringify(o.r4)}`);
  check(o.r5.streak === 1 && o.r5.best === 10, `then it starts again: ${JSON.stringify(o.r5)}`);
  check(o.left === '1:30', `the time left at 22:30 should be 1:30: ${o.left}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${o.heroes} heroes and ${o.sets} twist sets in 30 days; the same road twice: ${o.road}`;
}
