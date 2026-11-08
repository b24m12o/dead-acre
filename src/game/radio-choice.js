/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The radio asks: three times a run, at a dawn when you aren't moving on, Reyes comes on with something only you can
// decide. Each answer gives something and costs something, and the cost is mostly paid that night. The question
// stops the clock (it's a dawn: nothing is coming yet), and is answered with a click or 1 / 2.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { S, ammoMax } from './state.js';
import { rollBud } from '../actors/backups.js';
import { AMMO_MAX } from './arsenal.js';
import { giveTraps } from './traps.js';
import { lamps } from '../world/map.js';
import { radioNow } from '../audio/radio.js';
import { sfx } from '../audio/sfx.js';
import { showStreak } from '../ui/callouts.js';
import { saveRun } from './save.js';
import { bossNight } from './waves.js';
import { TW } from './districts.js';
import { BOSS_HORDE_J, HORDE_J } from './route.js';

// each one: what Reyes says (voiced, word for word), and the two answers: what each gives, what each costs
export const RCH = {
  supplies: {
    line: 'Nine, the convoy can kick one crate off the back on the way past. Ammo or medical? Your call.',
    a: { label: 'Ammo', gain: 'Every gun you carry topped up, and a mine', cost: 'No medical' },
    b: { label: 'Medical', gain: 'Everyone patched up to full · +10 max health', cost: 'No ammo' },
  },
  family: {
    line: 'Nine, someone is signalling from a roof a few streets over. Go for them tonight and the dead come early.',
    a: {
      label: 'Go and get them',
      gain: 'Tonight: reach the survivor and bring them back alive · they join you',
      cost: 'Night comes sooner, and more of the dead with it',
    },
    b: { label: 'Stay put', gain: 'The whole dawn to get ready', cost: 'They are on their own' },
  },
  power: {
    line: 'Hale says the substation is still live. She can put the streetlights on tonight, but they will hum like a dinner bell.',
    a: { label: 'Lights on', gain: 'Every streetlight burning all night', cost: 'More of the dead come to the hum' },
    b: { label: 'Stay dark', gain: 'Quieter: fewer of the dead tonight', cost: 'Half the streetlights out' },
  },
  scouts: {
    line: 'Scout team can lead part of tonight’s crowd off with flares. It burns flares the convoy was saving for you.',
    a: { label: 'Lead them off', gain: 'A quarter fewer of the dead tonight', cost: '−40 scrap' },
    b: { label: 'Keep the flares', gain: 'Your scrap stays yours', cost: 'The whole crowd tonight' },
  },
};
// which dawns ask, chosen once a run: three of the dawns you spend in one place, two nights apart at least
const ASK_AT = [3, 4, 6, 9, 11, 13];
function plan() {
  if (GS.RUN.rDawns) return GS.RUN.rDawns;
  const ids = Object.keys(RCH).sort(() => Math.random() - 0.5),
    at = [];
  for (const w of ASK_AT.slice().sort(() => Math.random() - 0.5))
    if (at.length < 3 && at.every(v => Math.abs(v - w) >= 2)) at.push(w);
  at.sort((p, q) => p - q);
  GS.RUN.rDawns = at.map((w, i) => ({ w, id: ids[i] }));
  return GS.RUN.rDawns;
}
// at dawn: is there a question this morning? (after the dawn banner and the radio's own dawn line)
export function radioDawn() {
  if (!GS.RUN.journey || GS.RUN.hm || GS.RUN.practice || GS.RUN.tut) return;
  const q = plan().find(d => d.w === GS.wave && !d.done);
  if (!q) return;
  GS.RUN.askDue = true; // Enter can't start the night over a question you haven't heard yet (input.js)
  const ask = () => {
    if (!GS.nightDone || q.done) return (GS.RUN.askDue = false);
    if (GS.state !== 'play' || GS.RUN.jobPend || (GS.radioT > 0 && (q.wait = (q.wait || 0) + 0.5) < 10))
      return GS.later.push({ t: 0.5, fn: ask }); // behind any cards on screen, and after the line already on the air
    if (!fits(q.id, GS.wave)) {
      const used = GS.RUN.rDawns.map(d => d.id),
        later = GS.RUN.rDawns.find(d => d.w > GS.wave && !d.done && fits(d.id, GS.wave) && fits(q.id, d.w, true)),
        alt = Object.keys(RCH).find(k => !used.includes(k) && fits(k, GS.wave));
      if (later) [later.id, q.id] = [q.id, later.id];
      else if (alt) q.id = alt;
      else {
        q.done = true;
        GS.RUN.askDue = false;
        return;
      }
    } // a question that can't come true tonight (a job or a boss already, a blackout coming) swaps for another
    openAsk(q);
  };
  GS.later.push({ t: 3, fn: ask });
}
// can this question come true for the night after dawn w? (ahead: judged for a later dawn, on what's known now)
function fits(id, w, ahead = false) {
  if (id === 'family')
    return (
      !bossNight(w + 1) &&
      !HORDE_J[w + 1] &&
      !BOSS_HORDE_J[w + 1] &&
      (ahead || (!GS.RUN.job && !(GS.RUN.nextSig && GS.RUN.nextSig.s === 'horde')))
    ); // a rescue is its own night: not a boss's, not a horde's
  if (id === 'power')
    return !bossNight(w + 1) && !TW('dark') && (ahead || !(GS.RUN.nextSig && GS.RUN.nextSig.s === 'blackout'));
  return true;
}
function openAsk(q) {
  const C = RCH[q.id],
    el = $('radioAsk');
  if (!el) return;
  el.querySelector('.rq').textContent = `“${C.line}”`;
  const box = el.querySelector('.ways');
  box.innerHTML = ['a', 'b']
    .map(
      (k, i) =>
        `<button class="way" type="button" data-k="${k}"><span class="wk">${i + 1}</span><b>${C[k].label}</b><span class="wgain">${gainText(q.id, k)}</span><span class="wcost">${costText(q.id, k)}</span></button>`
    )
    .join('');
  GS.state = 'radio';
  el.hidden = false;
  sfx.radioIn && sfx.radioIn();
  radioNow(C.line); // spoken as the card opens: the radio queue doesn't play while the card holds the game
  const t0 = performance.now() + 600; // a beat first: a key held from the fight can't answer for you
  const done = k => {
    if (performance.now() < t0 || q.done) return;
    q.done = true;
    GS.RUN.askDue = false;
    window.removeEventListener('keydown', key, true);
    el.hidden = true;
    GS.state = 'play';
    GS.interT = Math.max(GS.interT, 8); // the dawn doesn't run out while you were deciding
    answer(q.id, k);
    saveRun(); // answered is answered: a Continue doesn't ask again
  };
  const key = e => {
    const k = e.key === '1' ? 'a' : e.key === '2' ? 'b' : null;
    if (k || e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (k) done(k);
  };
  window.addEventListener('keydown', key, true);
  for (const b of box.querySelectorAll('.way')) b.onclick = () => done(b.dataset.k);
}
const gainText = (id, k) =>
  id === 'family' && k === 'a' && GS.buddies.length >= 3
    ? 'Tonight: reach the survivor and bring them back alive · your team is full: they head for the convoy'
    : RCH[id][k].gain;
const costText = (id, k) =>
  id === 'scouts' && k === 'a' && GS.runSeeds < 40
    ? GS.runSeeds > 0
      ? `−${GS.runSeeds} scrap: all you have`
      : 'Nothing: you have no scrap to give'
    : RCH[id][k].cost;
// why: said when the night begins, so the cost is felt where it lands
const night = (k, why, extra) => (GS.RUN.choiceN = Object.assign({ w: GS.wave + 1, k, why }, extra || {}));
function answer(id, k) {
  const P = GS.P;
  let say = '';
  if (id === 'supplies') {
    if (k === 'a') {
      for (const t of Object.keys(AMMO_MAX)) P.ammo[t] = Math.max(P.ammo[t] || 0, ammoMax(t));
      giveTraps({ mine: 1 });
      say = 'Ammo crate down · every gun topped up, and a mine';
    } else {
      S.maxHp += 10;
      P.hp = S.maxHp;
      for (const b of GS.buddies) {
        b.down = 0;
        b.hp = b.max;
      }
      say = 'Medical crate down · everyone patched up · +10 max health';
    }
  } else if (id === 'family') {
    if (k === 'a') {
      GS.RUN.job = { t: 'rescue', rw: rollBud(), fam: true }; // tonight's job: the ordinary rescue, marked when the night starts
      GS.RUN.lastJob = 'rescue';
      GS.later.push({ t: 0, fn: () => (GS.interT = Math.max(3, GS.interT * 0.4)) }); // night comes sooner
      night(1.15, 'more of them came after you on the roofs');
      say = 'They are marked when it gets dark · bring them back before dawn';
    } else say = 'Copy. We will try for them later';
  } else if (id === 'power') {
    if (k === 'a') night(1.15, 'the streetlights hum: more of them come', { lights: 'on' });
    else night(0.9, 'dark and quiet: fewer of them', { lights: 'off' });
    say = k === 'a' ? 'Lights on tonight · they will hear it' : 'Staying dark tonight';
  } else if (id === 'scouts') {
    if (k === 'a') {
      const pay = Math.min(40, GS.runSeeds);
      GS.runSeeds -= pay;
      night(0.75, 'the scouts led part of them off');
      say = `Scouts are leading part of them off${pay ? ` · −${pay} scrap` : ''}`;
    } else say = 'Keeping the flares';
  }
  sfx.ammo();
  if (say) showStreak('Channel 9', say, true); // straight away: it's the answer you just gave
}
// the night the answer was for: how many of the dead come, and what the streetlights do
export const choiceNight = w => (GS.RUN && GS.RUN.choiceN && GS.RUN.choiceN.w === w ? GS.RUN.choiceN : null);
export function choiceLights() {
  const c = choiceNight(GS.wave);
  if (!c || !c.lights) return;
  if (c.lights === 'on')
    for (const L of lamps) {
      if (L.down || L.lantern) continue;
      L.broken = L.bflick = false;
      L.off = 0;
    }
  else
    for (const L of lamps)
      if (!L.down && !L.lantern && Math.random() < 0.5) {
        L.off = GS.time - 1;
        L.on = 0;
      }
}
