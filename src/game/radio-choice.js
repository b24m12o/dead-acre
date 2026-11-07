/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The radio asks: three times a run, at a dawn when you aren't moving on, Reyes comes on with something only you can
// decide. Each answer gives something and costs something, and the cost is mostly paid that night. The question
// stops the clock (it's a dawn: nothing is coming yet), and is answered with a click or 1 / 2.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { LV, S, ammoMax } from './state.js';
import { AMMO_MAX } from './arsenal.js';
import { UP, renderMods } from './upgrades.js';
import { giveTraps } from './traps.js';
import { lamps } from '../world/map.js';
import { radio } from '../audio/radio.js';
import { sfx } from '../audio/sfx.js';
import { showStreak } from '../ui/callouts.js';
import { saveRun } from './save.js';

// each one: what Reyes says (voiced, word for word), and the two answers: what each gives, what each costs
export const RCH = {
  supplies: {
    line: 'Nine, the convoy can kick one crate off the back on the way past. Ammo or medical? Your call.',
    a: { label: 'Ammo', gain: 'Every gun you carry topped up, and a mine', cost: 'No medical' },
    b: { label: 'Medical', gain: 'Everyone patched up to full · +10 max health', cost: 'No ammo' },
  },
  family: {
    line: 'Nine, there is a family on the laundromat roof, a few streets east. Go now and you will still be out there when it gets dark.',
    a: {
      label: 'Go and get them',
      gain: 'One of them joins you · with a full team, they pay 40 scrap',
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
  const ask = () => {
    if (!GS.nightDone || q.done) return;
    if (GS.state !== 'play') return GS.later.push({ t: 0.5, fn: ask }); // behind any cards on screen
    openAsk(q);
  };
  GS.later.push({ t: 6, fn: ask });
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
        `<button class="way" type="button" data-k="${k}"><span class="wk">${i + 1}</span><b>${C[k].label}</b><span class="wgain">${gainText(q.id, k)}</span><span class="wcost">${C[k].cost}</span></button>`
    )
    .join('');
  GS.state = 'radio';
  el.hidden = false;
  sfx.radioIn && sfx.radioIn();
  radio(C.line);
  const t0 = performance.now() + 600; // a beat first: a key held from the fight can't answer for you
  const done = k => {
    if (performance.now() < t0 || q.done) return;
    q.done = true;
    window.removeEventListener('keydown', key, true);
    el.hidden = true;
    GS.state = 'play';
    answer(q.id, k);
    saveRun(); // answered is answered: a Continue doesn't ask again
  };
  const key = e => {
    const k = e.key === '1' ? 'a' : e.key === '2' ? 'b' : null;
    if (k || e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
    }
    if (k) done(k);
  };
  window.addEventListener('keydown', key, true);
  for (const b of box.querySelectorAll('.way')) b.onclick = () => done(b.dataset.k);
  const f = box.querySelector('.way');
  if (f) f.focus({ preventScroll: true });
}
const gainText = (id, k) =>
  id === 'family' && k === 'a' && GS.buddies.length >= 3
    ? 'Your team is full: they pay 40 scrap and head for the convoy'
    : RCH[id][k].gain;
const night = (k, extra) => (GS.RUN.choiceN = Object.assign({ w: GS.wave + 1, k }, extra || {}));
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
      if (GS.buddies.length < 3) {
        if ((LV.buddy || 0) < 3) LV.buddy = (LV.buddy || 0) + 1;
        UP.find(u => u.id === 'buddy').apply();
        renderMods();
      } else {
        GS.runSeeds += 40;
        say = 'The family is safe · they pay 40 scrap and head for the convoy';
      }
      GS.interT = Math.min(GS.interT, 4);
      night(1.15);
    } else say = 'Copy. We will try for them later';
  } else if (id === 'power') {
    if (k === 'a') night(1.15, { lights: 'on' });
    else night(0.9, { lights: 'off' });
    say = k === 'a' ? 'Lights on tonight · they will hear it' : 'Staying dark tonight';
  } else if (id === 'scouts') {
    if (k === 'a') {
      GS.runSeeds = Math.max(0, GS.runSeeds - 40);
      night(0.75);
      say = 'Scouts are leading part of them off · −40 scrap';
    } else say = 'Keeping the flares';
  }
  sfx.ammo();
  if (say) showStreak('Channel 9', say);
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
