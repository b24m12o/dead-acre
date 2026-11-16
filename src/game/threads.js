/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Your people's own threads. Each of the four kinds of survivor has a place on the road that is theirs: the medic
// worked at St. Mary's, the scavenger hid a stash at the gas station, the ex-cop knows the impound lot up the quarry
// road, the marksman hunted the woods along Mill River. At a dawn there, if they are with you, they ask you for one
// night: let them go and you fight that night without them, and at dawn they are back with what only they could get.
// Say no and the chance is gone. Their lines are their own, in their own voice (bark-lines.js, THREAD_LINES).
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { rand, TAU, pick } from '../core/util.js';
import { S, ammoMax } from './state.js';
import { AMMO_MAX, nextGuns } from './arsenal.js';
import { giveTrapsQuiet } from './traps.js';
import { dropCrate } from './combat.js';
import { bossNight } from './waves.js';
import { BOSS_HORDE_J, STOPS } from './route.js';
import { stopNow } from './journey.js';
import { TRAITS, budSetup, makeSurvivor } from '../actors/backups.js';
import { budSay } from '../audio/barks.js';
import { THREAD_LINES } from '../audio/bark-lines.js';
import { sfx } from '../audio/sfx.js';
import { showStreak } from '../ui/callouts.js';
import { saveRun } from './save.js';

// at: the stop that is theirs. ask/back: what they say (THREAD_LINES). gain: what they bring back at dawn
export const THREAD = {
  medic: {
    at: 'clinic',
    gain: 'At dawn: +20 max health for you and your people, everyone patched up',
  },
  scav: {
    at: 'gas',
    gain: 'At dawn: +80 scrap, 2 mines and a gas drum',
  },
  cop: {
    at: 'quarry',
    gain: 'At dawn: a weapon case from the impound lot, your pick of two guns',
  },
  marksman: {
    at: 'bridge',
    gain: 'At dawn: every gun topped up, and their rifle hits half again as hard for the rest of the run',
  },
};
const T = () => (GS.RUN.threads = GS.RUN.threads || {}); // by survivor name: 'asked' once asked (yes or no)
// can they ask at this dawn, for the night after it? Not before a boss's night, nor a job's. Before a horde's, yes:
// that is the choice, and the card says what you give up
const nightFits = w => !bossNight(w) && !BOSS_HORDE_J[w] && !GS.RUN.job;
// at a dawn: is one of your people at their own place, and is this the morning they ask?
export function threadDawn() {
  if (!GS.RUN.journey || GS.RUN.hm || GS.RUN.practice || GS.RUN.tut || GS.RUN.away) return;
  const S0 = STOPS[stopNow()],
    s = S0 && GS.buddies.find(b => THREAD[b.tr] && THREAD[b.tr].at === S0.id && !T()[b.nm] && !(b.down > 0));
  if (!s) return;
  const w = GS.wave;
  GS.RUN.askDue = true; // Enter can't start the night over a question you haven't heard yet (input.js)
  let waits = 0;
  const ask = () => {
    if (!GS.nightDone || GS.wave !== w || T()[s.nm] || !GS.buddies.includes(s)) return (GS.RUN.askDue = false);
    if (GS.state !== 'play' || GS.RUN.jobPend || GS.bannerT > 0 || (GS.radioT > 0 && ++waits < 30))
      return GS.later.push({ t: 0.5, fn: ask }); // behind any card on screen, and after what is on the air
    if ((GS.RUN.rDawns || []).some(d => d.w === w) || !nightFits(w + 1)) return (GS.RUN.askDue = false); // the radio had this morning, or tonight is no night to go: another dawn here
    openThread(s);
  };
  GS.later.push({ t: 4.5, fn: ask });
}
function openThread(s) {
  const C = THREAD[s.tr],
    L = THREAD_LINES[s.tr],
    el = $('radioAsk');
  if (!el) return;
  el.querySelector('.eyebrow').textContent = `${s.nm} · ${TRAITS[s.tr].name.toLowerCase()} · asking you`;
  el.querySelector('.rq').textContent = `“${L.ask}”`;
  const opts = {
    a: { label: 'Let them go', gain: C.gain, cost: `Tonight without ${s.nm}` },
    b: { label: 'Stay with us', gain: `${s.nm} fights beside you tonight`, cost: 'The chance is gone' },
  };
  const box = el.querySelector('.ways');
  box.innerHTML = ['a', 'b']
    .map(
      (k, i) =>
        `<button class="way" type="button" data-k="${k}"><span class="wk">${i + 1}</span><b>${opts[k].label}</b><span class="wgain">${opts[k].gain}</span><span class="wcost">${opts[k].cost}</span></button>`
    )
    .join('');
  GS.state = 'radio';
  el.hidden = false;
  budSay(s, L.ask);
  const t0 = performance.now() + 600; // a beat first: a key held from the fight can't answer for you
  const done = k => {
    if (performance.now() < t0 || T()[s.nm]) return;
    T()[s.nm] = 'asked';
    GS.RUN.askDue = false;
    window.removeEventListener('keydown', key, true);
    el.hidden = true;
    GS.state = 'play';
    GS.interT = Math.max(GS.interT, 8); // the dawn doesn't run out while you were deciding
    if (k === 'a') goAway(s);
    else {
      budSay(s, pick(THREAD_LINES.stay), 0.2);
      showStreak(s.nm, 'Stays with you');
    }
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
// off for the night: out of the team (kept as a save keeps them), back at the next dawn
function goAway(s) {
  const i = GS.buddies.indexOf(s);
  if (i < 0) return;
  GS.buddies.splice(i, 1);
  GS.RUN.away = {
    w: GS.wave + 1,
    nm: s.nm,
    tr: s.tr,
    look: s.look,
    tint: s.tint,
    hp: s.hp,
    max: s.max,
    vo: s.vo,
    dk: s.dk || 1,
  };
  showStreak(`${s.nm} heads out`, 'Back at dawn · tonight without them');
  sfx.ammo && sfx.ammo();
}
// the dawn after their night away: back, with what they went for
export function threadBack() {
  const A = GS.RUN.away;
  if (!A || GS.wave < A.w) return;
  GS.RUN.away = null;
  const P = GS.P,
    a = rand(0, TAU),
    b = Object.assign(makeSurvivor(P.x + Math.cos(a) * 60, P.y + Math.sin(a) * 60), {
      a: rand(0, TAU),
      cd: 0,
      aim: 0,
      look: A.look,
      tint: A.tint,
    });
  budSetup(b, { nm: A.nm, tr: A.tr });
  b.max = Math.max(b.max, A.max || 0);
  b.hp = b.max;
  if (typeof A.vo === 'string') b.vo = A.vo;
  b.dk = A.dk || 1;
  GS.buddies.push(b);
  let say = '';
  if (A.tr === 'medic') {
    S.maxHp += 20;
    P.hp = S.maxHp;
    for (const o of GS.buddies) {
      o.max += 20;
      o.hp = o.max;
      o.down = 0;
    }
    say = '+20 max health for you and your people · everyone patched up';
  } else if (A.tr === 'scav') {
    GS.runSeeds += 80;
    giveTrapsQuiet({ mine: 2, drum: 1 });
    say = '+80 scrap, 2 mines and a gas drum';
  } else if (A.tr === 'cop') {
    const gs = nextGuns(2);
    if (gs.length) {
      GS.later.push({
        t: 1.2,
        fn: () => GS.state === 'play' && dropCrate(gs[0], gs[1], null, `From the impound lot, with ${A.nm}`),
      });
      say = 'A weapon case from the impound lot';
    } else {
      for (const t of Object.keys(AMMO_MAX)) P.ammo[t] = Math.max(P.ammo[t] || 0, ammoMax(t));
      GS.runSeeds += 60;
      say = 'You have every gun there was: ammo and 60 scrap from the lot';
    }
  } else if (A.tr === 'marksman') {
    for (const t of Object.keys(AMMO_MAX)) P.ammo[t] = Math.max(P.ammo[t] || 0, ammoMax(t));
    b.dk = 1.5;
    say = `Every gun topped up · ${A.nm}'s rifle hits half again as hard`;
  }
  GS.later.push({ t: 2.2, fn: () => GS.nightDone && budSay(b, THREAD_LINES[A.tr].back) });
  GS.later.push({ t: 2.6, fn: () => GS.nightDone && showStreak(`${A.nm} is back`, say) });
}
// with you on the way: what a way gives when one of yours knows it (the card says so, with their name)
export const WAY_BUD = {
  checkpoint: { tr: 'cop', text: n => `${n} knows the drill: the riot police don't follow you` },
  pharmacy: { tr: 'medic', text: n => `${n} knows the shelves: +15 max health for you too` },
  gunshop: { tr: 'marksman', text: n => `${n} picks off the lead dogs: no dog pack on your first night` },
  wrecks: { tr: 'scav', text: n => `${n} knows where to look: +40 scrap more` },
};
export const wayBud = id => {
  const W = WAY_BUD[id],
    b = W && GS.buddies.find(o => o.tr === W.tr && !(o.down > 0));
  return b ? { b, text: W.text(b.nm) } : null;
};
// and what it does, applied with the way (routes.js applyVia)
export function wayBudApply(id, V) {
  const wb = wayBud(id);
  if (!wb) return '';
  if (id === 'checkpoint' && V.add) {
    V.add = { ...V.add };
    delete V.add.shield;
  } else if (id === 'pharmacy') {
    S.maxHp += 15;
    GS.P.hp = S.maxHp;
  } else if (id === 'gunshop') {
    V.ev = null;
    V.mix = (V.mix || []).filter(m => m[0] !== 'hound');
  } else if (id === 'wrecks') GS.runSeeds += 40;
  return wb.text;
}
// the dawn after one of yours is lost: someone says so
export function mournDawn() {
  const lost = GS.RUN.lostW === GS.wave && (GS.RUN.lost || []).length;
  if (!lost) return;
  const s = GS.buddies.find(b => !(b.down > 0));
  if (s) GS.later.push({ t: 5.5, fn: () => GS.nightDone && budSay(s, pick(THREAD_LINES.mourn)) });
}
