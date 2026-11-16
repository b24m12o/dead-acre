/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Your people's own threads (threads.js). The medic asks at St. Mary's: let them go and they are away for the night,
// back at dawn with what they went for (and a Continue in between keeps them coming back); say no and they stay, and
// don't ask again. They never ask before a boss's night. One of yours who knows a way changes it, and the card says so.
// And the morning after one of yours is lost, another says so.
import { openGame, check } from './lib/harness.mjs';

export const name = "threads: your people's own asks, their night away, the ways they know, and a loss";
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0;
    const P = GS.P, out = {};
    const add = (nm, tr) => { const s = Object.assign(makeSurvivor(P.x - 40, P.y + 30), { a: 0, cd: 0, aim: 0, look: 1, tint: NPC_TINTS[0] }); budSetup(s, { nm, tr }); GS.buddies.push(s); return s; };
    const fr = n => { for (let i = 0; i < n; i++) { update(1 / 60); tickWorld(1 / 60); } };
    const dawnAt = (stop, w) => { GS.RUN.stop = stop; GS.wave = w; GS.nightLive = false; GS.nightDone = true; GS.state = 'play'; GS.bannerT = 0; GS.radioT = 0; GS.RUN.jobPend = false; GS.RUN.job = null; GS.RUN.rDawns = []; GS.interT = 30; };
    // the medic at St. Mary's, the dawn before night 4
    const m = add('Rhonda', 'medic');
    dawnAt(1, 3); threadDawn(); fr(60 * 6);
    const el = $('radioAsk');
    out.asked = !el.hidden && /Rhonda/.test(el.querySelector('.eyebrow').textContent) && /second floor/.test(el.textContent);
    out.said = m.say && /second floor/.test(m.say.txt);
    { const t = performance.now(); while (performance.now() - t < 650); }
    el.querySelector('.way[data-k="a"]').click();
    out.away = !GS.buddies.includes(m) && GS.RUN.away && GS.RUN.away.nm === 'Rhonda' && GS.RUN.away.w === 4;
    // a Continue in the night away: she is still away, and still coming back
    saveRun(); const d = savedRun(); out.savedAway = !!(d && d.RUN.away && d.RUN.away.nm === 'Rhonda' && !(d.bud || []).some(x => x.nm === 'Rhonda'));
    // the dawn after night 4: back, with what she went for
    const hp0 = S.maxHp; GS.wave = 4; threadBack();
    const back = GS.buddies.find(x => x.nm === 'Rhonda');
    out.back = !!back && !GS.RUN.away && S.maxHp === hp0 + 20 && P.hp === S.maxHp;
    fr(60 * 3); out.backSaid = back && back.say && /upstairs/.test(back.say.txt);
    // asked once: not again
    dawnAt(1, 4); threadDawn(); fr(60 * 6); out.again = !$('radioAsk').hidden;
    // the scavenger says no: stays, and the chance is gone
    const sc = add('Wes', 'scav');
    dawnAt(2, 6); threadDawn(); fr(60 * 6);
    out.scAsked = !$('radioAsk').hidden;
    { const t = performance.now(); while (performance.now() - t < 650); }
    $('radioAsk').querySelector('.way[data-k="b"]').click();
    out.scStays = GS.buddies.includes(sc) && !GS.RUN.away && GS.RUN.threads.Wes === 'asked';
    // never before a boss's night: the marksman at the bridge the dawn before night 13 says nothing
    const mk = add('Hank', 'marksman');
    dawnAt(5, 12); threadDawn(); fr(60 * 6); out.bossQuiet = $('radioAsk').hidden && !GS.RUN.threads.Hank;
    GS.buddies.splice(GS.buddies.indexOf(mk), 1);
    // one of yours who knows a way: the ex-cop and the checkpoint
    add('Ray', 'cop');
    GS.RUN.stop = 1; GS.wave = 5; GS.nightDone = true;
    offerVia = () => ['checkpoint', 'road', 'wrecks'];
    leaveStop('foot'); travelStep();
    { const t = performance.now(); while (performance.now() - t < 650); }
    const card = [...document.querySelectorAll('#routeWays .way')].map(w => (w.querySelector('.wbud') || {}).textContent || '');
    out.cardBud = /Ray knows the drill/.test(card[0]) && !card[1];
    document.querySelector('#routeWays .way[data-i="0"]').click();
    out.noShield = !(GS.RUN.viaN.add && GS.RUN.viaN.add.shield) && VIA.checkpoint.add.shield === 2;
    // a loss: the dawn after, another of yours says so
    GS.RUN.lost = ['Wes']; GS.RUN.lostW = GS.wave; GS.nightDone = true; GS.state = 'play'; mournDawn(); fr(60 * 7);
    out.mourn = GS.buddies.some(x => x.say && /keep moving|looking for them|stayed closer/.test(x.say.txt));
    return out;
  })()`);
  await pg.close();
  const bad = [];
  const w = (ok, what) => ok || bad.push(what);
  w(o.asked && o.said, "the medic should ask at St. Mary's, on the card and in her voice");
  w(o.away && o.savedAway, 'let go, she should be away for the night, and a Continue should keep her coming back');
  w(o.back && o.backSaid, 'at dawn she should be back with +20 max health, and say so');
  w(!o.again, 'asked once, she should not ask again');
  w(o.scAsked && o.scStays, 'the scavenger told no should stay, and the chance be gone');
  w(o.bossQuiet, "no one should ask the dawn before a boss's night");
  w(
    o.cardBud && o.noShield,
    'the ex-cop should be on the checkpoint card, and the riot police not follow (the way itself unchanged)'
  );
  w(o.mourn, 'the morning after a loss, another of yours should say so');
  check(!bad.length, bad.join('\n        ') + ' ' + JSON.stringify(o));
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return 'the medic away and back, the scavenger kept, no ask before a boss, the ex-cop on the checkpoint card, a loss mourned';
}
