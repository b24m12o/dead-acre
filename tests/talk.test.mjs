/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A fight speaks for itself: in the middle of the screen only real danger; other news a short line at the bottom
// edge; the commentary not at all; the radio quiet once the night is under way (but for the story and the bosses);
// surges that can't be counted ahead; and the chain big beside the score. At dawn the game talks as it always did.
import { openGame, check } from './lib/harness.mjs';

export const name =
  'talk: in a fight only danger in the middle, a quiet radio, surges you can’t count, the chain up front';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play'; GS.dir = null;
    const out = {}, big = () => $('streak').classList.contains('show'), low = () => $('ticker').classList.contains('show');
    const say = (t) => { hideCallouts(); $('ticker').classList.remove('show'); GS.streakT = 0; GS.bannerT = -1; GS.streakQ && (GS.streakQ.length = 0); showStreak(t, 'something'); return [big(), low()]; };
    GS.wave = 2; GS.RUN.nextSig = null; GS.horde = null; startWave(); GS.bannerT = -1;
    out.fight = inFight();
    out.chatter = say('Elite down'); out.news = say('Doors'); out.danger = say('Grabbed');
    GS.time += 20; const q0 = GS.radioQ.length; radio('A line.'); out.radioQuiet = GS.radioQ.length === q0; radio('The story.', null, 2); out.radioStory = GS.radioQ.length === q0 + 1;
    updateHud(); out.top = $('waveSub').textContent;
    GS.combo = 12; GS.comboT = 2; updateHud(); out.chain = $('chain').classList.contains('on') ? $('chain').textContent : '';
    const counts = {}; for (let i = 0; i < 80; i++) { const n = surgeCuts(200).length; counts[n] = (counts[n] || 0) + 1; } out.cuts = counts;
    GS.nightDone = true; out.dawn = say('Doors');
    return out;
  })()`);
  await pg.close();
  check(o.fight, 'not in a fight after the night started');
  check(!o.chatter[0] && !o.chatter[1], 'the commentary (Elite down) still said in a fight: ' + o.chatter);
  check(!o.news[0] && o.news[1], 'news in a fight should be a line at the bottom edge, not the middle: ' + o.news);
  check(o.danger[0], 'danger (Grabbed) should still be in the middle');
  check(
    o.radioQuiet && o.radioStory,
    `the radio in the fight: chatter dropped ${o.radioQuiet}, the story kept ${o.radioStory}`
  );
  check(!/surge/i.test(o.top) && /still walking/i.test(o.top), `the top line counts the surges: "${o.top}"`);
  check(/12/.test(o.chain) && /×1\.5/.test(o.chain), `the chain beside the score: "${o.chain}"`);
  check(
    Object.keys(o.cuts).length >= 2,
    'every night breaks into the same number of surges: ' + JSON.stringify(o.cuts)
  );
  check(o.dawn[0], 'at dawn the news should be in the middle as before');
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `danger in the middle, news at the edge, chatter gone; radio quiet; top line "${o.top}"; chain "${o.chain}"; breathers per night ${JSON.stringify(o.cuts)}`;
}
