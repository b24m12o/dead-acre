/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// You talk: each of the three has a clip for every line they can say, a line is said and shown over your head,
// never over Channel 9, never the same kind twice in a row straight away, and not on the truck. And Channel 9 tells
// you what followed you in along the way you came.
import { openGame, check } from './lib/harness.mjs';

export const name = 'voice: your own lines, each of the three, and the radio on the way you came';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    initAudio(); GS.meta.tutDone = true;
    // every line of every hero has a clip in that hero's voice
    out.miss = [];
    let n = 0;
    for (const h of Object.keys(HERO_LINES)) for (const k of Object.keys(HERO_LINES[h])) for (const t of HERO_LINES[h][k]) { n++; if (!GS.VOX.some(r => r[4] === 'P' + h && r[1] === t)) out.miss.push(h + ': ' + t); }
    out.n = n;
    out.kinds = Object.keys(HERO_LINES).every(h => Object.keys(HERO_RULE).every(k => (HERO_LINES[h][k] || []).length >= 2));
    const start = h => {
      GS.meta.unlocked[h] = true; GS.meta.hero = h; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
      GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
      GS.radioQ = []; GS.radioT = 0;
      return GS.P;
    };
    const fr = n => { for (let i = 0; i < n; i++) { update(1 / 60); tickWorld(1 / 60); if (GS.state === 'levelup') { GS.state = 'play'; $('levelup').hidden = true; } } };
    out.said = {};
    for (const h of Object.keys(HERO_LINES)) {
      const P = start(h); fr(30); GS.radioQ = []; GS.radioT = 0;
      const ok = heroSay('boss');
      out.said[h] = ok && P.say && HERO_LINES[h].boss.includes(P.say.txt);
    }
    // the rules, as the Soldier
    let P = start('ranger'); fr(30); GS.radioQ = []; GS.radioT = 0;
    out.first = heroSay('low'); const t1 = P.say && P.say.txt;
    out.again = heroSay('low'); // the same kind, straight away: no
    GS.time += 60; out.later = heroSay('low'); out.differs = P.say.txt !== t1; // and never the same words twice running
    GS.time += 60; GS.radioT = 3; out.onAir = heroSay('boss'); GS.radioT = 0;
    GS.time += 60; P.ride = { x: 0 }; out.riding = heroSay('boss'); P.ride = null;
    GS.time += 60; P.hp = 0; out.dead = heroSay('boss'); P.hp = 50;
    // hurt badly: you say so
    GS.time += 60; P.hp = S.maxHp; P.inv = 0; P.hk = {}; let saidLow = false;
    for (let i = 0; i < 14 && !saidLow && P.hp > 1; i++) { P.inv = 0; GS.radioQ = []; GS.radioT = 0; hurtPlayer(Math.min(S.maxHp * 0.14, P.hp - 1), P.x + 50, P.y); saidLow = !!(P.say && HERO_LINES.ranger.low.includes(P.say.txt)); GS.time += 1; }
    out.lowHp = P.hp / S.maxHp;
    out.low = saidLow;
    // the radio on the way you came
    out.via = Object.keys(VIA).filter(id => !RADIO.via[id]);
    P = start('ranger'); GS.RUN.journey = true;
    GS.RUN.viaN = { w: GS.wave + 1, id: 'bridge' }; GS.radioQ = [];
    viaRadio(); for (let i = 0; i < 60 * 11 && !GS.radioQ.length && !(GS.radioT > 0); i++) { runLater(1 / 60); GS.time += 1 / 60; }
    out.viaSaid = (GS.radioQ[0] && GS.radioQ[0].t) || $('radio').textContent;
    return out;
  })()`);
  await pg.close();
  check(
    !o.miss.length && o.n >= 70,
    `every line should have a clip in its hero's voice: ${o.n} lines, missing ${o.miss.slice(0, 4).join(' | ')}`
  );
  check(o.kinds, 'each of the three should have at least two lines of every kind');
  check(
    o.said.ranger && o.said.breacher && o.said.grenadier,
    `each of the three should say their own line, shown over their head: ${JSON.stringify(o.said)}`
  );
  check(
    o.first && !o.again && o.later && o.differs,
    `a kind of line should wait its turn, and come back in other words: ${o.first} ${o.again} ${o.later} ${o.differs}`
  );
  check(
    !o.onAir && !o.riding && !o.dead,
    `nothing over Channel 9, on the truck, or from the dead: ${o.onAir} ${o.riding} ${o.dead}`
  );
  check(o.low, `hurt down to a third, you should say so (at ${Math.round(o.lowHp * 100)}%)`);
  check(!o.via.length, 'every way should have its word from Channel 9: ' + o.via.join());
  check(
    /tracks/.test(o.viaSaid || ''),
    'arriving along the railway, Channel 9 should say what followed you: ' + o.viaSaid
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `${o.n} lines in three voices; the radio on all ${10 - o.via.length} ways`;
}
