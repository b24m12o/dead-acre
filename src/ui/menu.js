/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, angDiff, d2, damp, rand } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { GUNS, GUN_FROM, PERKS } from '../game/arsenal.js';
import { DIFF } from '../core/profile.js';
import { viewH, viewW, zoomK } from '../render/sprites.js';
import { collide, los, solidPt } from '../world/nav.js';
import { makeLegs, updateLegs } from '../actors/legs.js';
import { cam } from '../game/state.js';
import { newRun } from '../game/run.js';
import { hideCallouts } from './callouts.js';
import { makeEnemy } from '../actors/enemies.js';
import { HUMAN, flashLight } from '../render/effects.js';
import { R } from '../render/atlas.js';
import { GK } from '../core/scale.js';
import { AC, playR } from '../audio/audio.js';
import { radioVoice } from '../audio/radio.js';
import { killEnemy } from '../game/combat.js';
import { muzzleOf } from '../actors/player-weapons.js';
import { PK, cleanRun, firstCase } from './hangar.js';
import { rope } from '../core/later.js';
import { INFECTION, TWISTS } from '../game/districts.js';
import { LOADOUTS, chalDone, loadoutOpen, lockLine, stopOpen } from '../game/challenges.js';
import { STOPS } from '../game/route.js';
// the setup screen is for the campaign, or for Horde Mode, which is fought on any place the campaign has taken
// you to: pick the ground
export let SETUP = 'camp';
// after a list is drawn afresh, focus goes back to the control that was used, if the keyboard had it
function refocus(box, sel) {
  const el = $(box) && $(box).querySelector(sel);
  if (
    el &&
    (document.activeElement === document.body || !document.activeElement || !document.activeElement.isConnected)
  )
    el.focus();
}
export const setSetup = m => (SETUP = m);
export function renderDistricts() {
  const hm = SETUP === 'hm';
  if (!STOPS.some((s, i) => s.id === GS.meta.hmPlace && stopOpen(i))) GS.meta.hmPlace = 'main';
  $('distWrap').hidden = !hm;
  $('roadMap').hidden = hm;
  if (!hm)
    // the road out, top to bottom: where you start, every stop on the way, and where the chopper lands
    $('vroad').innerHTML = STOPS.map(
      (s, i) =>
        `<li class="${i === 0 ? 'start' : i === STOPS.length - 1 ? 'goal' : ''}"><b>${s.name}</b><i>${i === STOPS.length - 1 ? 'the chopper' : s.area}</i></li>`
    ).join('');
  $('survEye').textContent = hm ? 'Horde Mode' : 'Fifteen nights till the chopper';
  $('survTitle').textContent = hm ? 'Pick your ground' : 'The road out';
  $('survLede').innerHTML = hm
    ? 'Wave after wave of hordes, each bigger than the last, with a trap kit and a weapon case between them. No evac: hold as long as you can.'
    : 'From <b>Main Street</b> to the <b>County Hospital</b>, on foot or in the back of a convoy truck. The chopper lands on the last night.';
  $('startBtn').textContent = hm ? 'Bring them on' : 'Hold the line';
  $('districts').innerHTML = STOPS.map((s, i) => {
    const open = stopOpen(i),
      on = GS.meta.hmPlace === s.id;
    return `<button type="button" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" class="place${on ? ' on' : ''}${open ? '' : ' locked'}" data-p="${s.id}" data-i="${i}" aria-describedby="placeDesc"${open ? '' : ' aria-disabled="true" title="Reach it in the campaign to fight here"'}><b>${s.name}</b><span>${open ? s.area : 'Locked · reach it first'}</span></button>`;
  }).join('');
  {
    const S = STOPS.find(s => s.id === GS.meta.hmPlace) || STOPS[0];
    $('placeDesc').innerHTML =
      `<b>${S.name}</b> · ${S.desc}${STOPS.some((s, i) => !stopOpen(i)) ? ' The locked places open as the campaign takes you there.' : ''}`;
  } // one description, for the place picked
  const pickPlace = id => {
    if (GS.meta.hmPlace !== id) {
      GS.meta.hmPlace = id;
      saveMeta();
      renderDistricts();
    }
    refocus('districts', `[data-p="${id}"]`);
  }; // the list is drawn afresh: the keyboard stays where it was
  for (const b of $('districts').children) {
    b.addEventListener('click', () => {
      if (stopOpen(+b.dataset.i)) pickPlace(b.dataset.p);
    });
    b.addEventListener('keydown', ev => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key],
        ends = ev.key === 'Home' ? 0 : ev.key === 'End' ? STOPS.length - 1 : -1;
      if (!d && ends < 0) return;
      ev.preventDefault();
      const opens = STOPS.map((q, i) => i).filter(stopOpen);
      if (!opens.length) return;
      let k = opens.indexOf(+b.dataset.i);
      k = ends === 0 ? 0 : ends > 0 ? opens.length - 1 : (k + d + opens.length) % opens.length;
      pickPlace(STOPS[opens[k]].id);
    }); // a radio group: the arrows move along the places you can pick, skipping the locked ones
  }
  const mx = GS.meta.infMax || 0;
  GS.meta.inf = Math.min(GS.meta.inf || 0, mx);
  $('infSeg').innerHTML = Array.from(
    { length: 11 },
    (_, i) =>
      `<button type="button" data-i="${i}" class="${(GS.meta.inf || 0) === i ? 'on' : ''}" aria-pressed="${(GS.meta.inf || 0) === i}" aria-label="Infection ${i}" ${i > mx ? 'disabled' : ''}>${i}</button>`
  ).join('');
  for (const b of $('infSeg').children)
    b.addEventListener('click', () => {
      if (b.disabled) return;
      GS.meta.inf = +b.dataset.i;
      saveMeta();
      renderDistricts();
      refocus('infSeg', `[data-i="${b.dataset.i}"]`);
    });
  renderTwists();
  const n = GS.meta.inf || 0;
  $('infDesc').innerHTML = n
    ? `<b>${INFECTION[n].name}</b> · ${INFECTION[n].desc}${n > 1 ? ' Plus every level below.' : ''} · +${n * 12}% scrap`
    : mx
      ? 'Clean run. Turn up the Infection for more scrap.'
      : 'Make the evac to unlock Infection levels.';
  if (cleanRun()) $('infDesc').innerHTML += ' · <b>No perks</b> · +25% scrap';
}
export const DIFF_DESC = {
  relaxed: 'Relaxed · zombies have 20% less health and hit 40% softer · you earn 30% less scrap',
  normal: 'Normal · the game as it was built to be played',
  hard: 'Hard · zombies have 30% more health and hit 40% harder · you earn 50% more scrap',
};
function runScrapK() {
  const pk = PK();
  return (
    DIFF().seeds *
    (1 + 0.12 * Math.min(GS.meta.inf || 0, GS.meta.infMax || 0)) *
    (1 + TWISTS.reduce((a, t) => a + (GS.meta.twists && GS.meta.twists[t.id] ? t.scrap : 0), 0)) *
    (cleanRun() ? 1.25 : 1) *
    (1 + 0.15 * (pk.vault || 0))
  );
}
export function affordNow() {
  const out = [];
  for (const pk of PERKS) {
    if (pk.req && !chalDone(pk.req)) continue;
    const l = GS.meta.perks[pk.id] || 0;
    if (l >= pk.max) continue;
    const c = pk.cost(l);
    if (c <= GS.meta.seeds) out.push(`${pk.name} (${c})`);
  }
  return out;
}
function renderTwists() {
  GS.meta.twists = GS.meta.twists || {};
  const box = $('twists');
  if (!box) return;
  box.innerHTML = TWISTS.map(
    t =>
      `<button type="button" class="chip${GS.meta.twists[t.id] ? ' on' : ''}" data-t="${t.id}" aria-pressed="${GS.meta.twists[t.id] ? 'true' : 'false'}" aria-describedby="twHint"><b>${t.name}</b><em>+${Math.round(t.scrap * 100)}%</em></button>`
  ).join('');
  const hint = $('twHint'),
    idle = 'Optional rules for the run. Each one pays more scrap. Point at one, or tab to it, to read it.';
  // room for the longest of the descriptions, kept whichever one shows: the panel never changes size under the
  // pointer (it's centred, so a line more or less moved every chip, and a chip moved out from under the pointer
  // hid its own text again, back and forth)
  const fit = () => {
    if (!hint.offsetWidth) return;
    hint.style.minHeight = '';
    let h = 0;
    for (const t of TWISTS) {
      hint.innerHTML = `<b>${t.name}</b> · ${t.desc} · +${Math.round(t.scrap * 100)}% scrap`;
      h = Math.max(h, hint.offsetHeight);
    }
    hint.textContent = idle;
    hint.style.minHeight = Math.max(h, hint.offsetHeight) + 'px';
  };
  hint.textContent = idle;
  fit();
  if (!renderTwists.fit) {
    renderTwists.fit = true;
    window.addEventListener('resize', () => renderTwists());
    new MutationObserver(() => !$('survSetup').hidden && fit()).observe($('survSetup'), {
      attributes: true,
      attributeFilter: ['hidden'],
    });
  }
  for (const b of box.children) {
    const t = TWISTS.find(q => q.id === b.dataset.t),
      show = () => (hint.innerHTML = `<b>${t.name}</b> · ${t.desc} · +${Math.round(t.scrap * 100)}% scrap`),
      hide = () => (hint.textContent = idle);
    b.addEventListener('mouseenter', show);
    b.addEventListener('focus', show);
    b.addEventListener('mouseleave', hide);
    b.addEventListener('blur', hide);
  } // the chip says what it is; what it does shows when you point at it or tab to it
  for (const b of box.children)
    b.addEventListener('click', () => {
      const id = b.dataset.t;
      GS.meta.twists[id] = !GS.meta.twists[id];
      if (!GS.meta.twists[id]) delete GS.meta.twists[id];
      saveMeta();
      renderTwists();
      refocus('twists', `[data-t="${id}"]`);
    });
  const on = TWISTS.filter(t => GS.meta.twists[t.id]),
    k = on.reduce((a, t) => a + t.scrap, 0);
  // what the rules come to, on their button on the setup screen
  $('rulesSum').textContent =
    `${{ relaxed: 'Relaxed', normal: 'Normal', hard: 'Hard' }[GS.meta.diff] || 'Normal'} · infection ${Math.min(GS.meta.inf || 0, GS.meta.infMax || 0)} · ${on.length ? on.map(t => t.name).join(', ') : 'no twists'} · scrap ×${runScrapK().toFixed(2)}`;
  $('twDesc').innerHTML =
    (on.length ? `Twists on: ${on.map(t => t.name).join(', ')} (+${Math.round(k * 100)}% scrap).<br>` : '') +
    `This run: <b>${{ relaxed: 'Relaxed', normal: 'Normal', hard: 'Hard' }[GS.meta.diff] || 'Normal'}</b> difficulty · Infection <b>${Math.min(GS.meta.inf || 0, GS.meta.infMax || 0)}</b>${on.length ? ` · <b>${on.length}</b> twist${on.length > 1 ? 's' : ''}` : ''} · scrap <b>×${runScrapK().toFixed(2)}</b>`;
}
// a row of chips with one line under it that says what the chosen one does, and what one does when you point at it or
// tab to it; the line keeps the height of the longest, so nothing moves under the pointer (as the twists do)
export function chipNote(box, note, say, cur) {
  const show = id => (note.innerHTML = say(id)),
    back = () => show(cur);
  if (note.offsetWidth) {
    note.style.minHeight = '';
    let h = 0;
    for (const b of box.children) {
      show(b.dataset.k);
      h = Math.max(h, note.offsetHeight);
    }
    note.style.minHeight = h + 'px';
  }
  back();
  for (const b of box.children) {
    b.addEventListener('mouseenter', () => show(b.dataset.k));
    b.addEventListener('focus', () => show(b.dataset.k));
    b.addEventListener('mouseleave', back);
    b.addEventListener('blur', back);
  }
}
export function renderChallenges() {
  // starting loadouts: earned from challenges, one taken into each new run (on the setup screen, your kit)
  const box = $('hangarOutfits'),
    cur = GS.meta.loadout && loadoutOpen(GS.meta.loadout) ? GS.meta.loadout : 'std';
  box.innerHTML = Object.entries(LOADOUTS)
    .map(([id, o]) => {
      const open = loadoutOpen(id),
        on = cur === id;
      return `<button type="button" class="chip${on ? ' on' : ''}${open ? '' : ' lockd'}" data-k="${id}" aria-pressed="${on}" ${open ? '' : 'aria-disabled="true"'}><b>${o.name}</b>${open ? '' : '<em>locked</em>'}</button>`;
    })
    .join('');
  const say = id => {
    const o = LOADOUTS[id],
      ds =
        o.desc ||
        ((GUN_FROM[o.gun] || 1) > 2
          ? `Your ${GUNS[o.gun].name} rides with the convoy and comes in the weapon case before night ${firstCase(GUN_FROM[o.gun])}.`
          : `Start with the ${GUNS[o.gun].name} and its ammo, in place of your first weapon case.`);
    return `<b>${o.name}</b> · ${ds}${loadoutOpen(id) ? '' : ' ' + lockLine(o.req)}`;
  };
  chipNote(box, $('loadDesc'), say, cur);
  for (const b of box.children)
    b.addEventListener('click', () => {
      if (!loadoutOpen(b.dataset.k)) return;
      GS.meta.loadout = b.dataset.k;
      saveMeta();
      renderChallenges();
      refocus('hangarOutfits', `[data-k="${b.dataset.k}"]`);
    });
}

/* ---------- Menu attract ---------- */
let menuT = 0;
// the stand: the next shot's wait, who's in the sights, when the next of the dead comes in
const STAND = { cd: 2.5, tgt: null, spawn: 0 };
const STAND_KINDS = ['skitter', 'skitter', 'skitter', 'skitter', 'mini', 'wasp', 'beetle', 'skitter'];
function standSpawn(d0) {
  const P = GS.P;
  for (let k = 0; k < 20; k++) {
    const a = rand(0, TAU),
      d = d0 ?? rand(430, 520),
      x = P.x + Math.cos(a) * d,
      y = P.y + Math.sin(a) * d;
    if (solidPt(x, y)) continue;
    const e = makeEnemy(STAND_KINDS[Math.floor(Math.random() * STAND_KINDS.length)], x, y);
    e.emerge = 1;
    e.a = Math.atan2(P.y - y, P.x - x);
    e.mT = rand(0, 2);
    if (e.legs) makeLegs(e, e.legSpec);
    return e;
  }
  return null;
}
// you, holding the crossroads: the nearest of them inside the light gets turned to and dropped, one round, a pause,
// the next; the closer they get the quicker you are. Never a miss, never a bite: it's the picture on the box
function standTick(dt) {
  const P = GS.P;
  for (let i = GS.enemies.length - 1; i >= 0; i--) if (GS.enemies[i].dead) GS.enemies.splice(i, 1); // (they lie in GS.corpses now)
  const live = GS.enemies;
  let tg = STAND.tgt && !STAND.tgt.dead ? STAND.tgt : null;
  if (!tg) {
    let bd = 250 ** 2; // (about the reach of the lamp)
    for (const e of live) {
      const dd = d2(e.x, e.y, P.x, P.y);
      if (dd < bd) {
        bd = dd;
        tg = e;
      }
    }
    STAND.tgt = tg;
  }
  STAND.cd -= dt;
  if (tg) {
    const want = Math.atan2(tg.y - P.y, tg.x - P.x),
      close = Math.hypot(tg.x - P.x, tg.y - P.y) < 130;
    P.aimA += angDiff(P.aimA, want) * damp(close ? 12 : 7, dt);
    if (STAND.cd <= 0 && Math.abs(angDiff(P.aimA, want)) < 0.05) {
      const c = Math.cos(P.aimA),
        s = Math.sin(P.aimA),
        G = GUNS[P.gun] || GUNS.pistol,
        M = muzzleOf(P, G, c, s);
      GS.flashes.push({
        x: M.x + c * 2 * GK,
        y: M.y + s * 2 * GK,
        h: M.h,
        rot: P.aimA,
        life: 0.05,
        max: 0.05,
        reg: R.mf_rifle,
        fs: rand(0.9, 1.1),
      });
      flashLight(M.x, M.y, 260, [1, 0.78, 0.5], 0.07);
      P.recoil = 5;
      P.lastShotT = GS.time;
      playR('rifle', 0.12, P.x, P.y, rand(0.97, 1.03));
      const np = GS.pickups.length;
      killEnemy(tg, 60, 'bolt', c, s);
      GS.pickups.length = np; // (nothing to pick up on the title screen)
      GS.combo = GS.kills = GS.score = GS.xp = 0; // (none of it is yours)
      STAND.tgt = null;
      STAND.cd = close ? rand(0.5, 0.9) : rand(1.4, 3.2);
    }
  } else P.aimA = -Math.PI / 2 + Math.sin(menuT * 0.5) * 1.3; // nothing near: watching the dark
  if (live.length < 10 && (STAND.spawn -= dt) <= 0) {
    standSpawn();
    STAND.spawn = rand(0.8, 2.2);
  }
}
export function menuInit() {
  GS.PRACTICE = null;
  GS.HM = null;
  {
    const b = $('hmBtn'),
      open = ((GS.meta.stats && GS.meta.stats.hordes) || 0) >= 1,
      best = GS.meta.hm && GS.meta.hm.wave;
    if (b) {
      b.disabled = !open;
      b.textContent = open && best ? `Horde Mode · best ${best}` : 'Horde Mode';
      b.title = open
        ? 'Wave after wave of hordes, bigger every time, with a trap kit and a weapon case between them'
        : 'Wipe out a horde in a run to open Horde Mode';
      // (said under the buttons too: a tooltip on a button you can't focus reaches neither a keyboard nor a pad)
      $('menuLock').textContent = open ? '' : 'Horde Mode opens once you wipe out a horde in a run';
    }
  }
  hideCallouts();
  $('banner').classList.remove('show');
  GS.state = 'menu';
  GS.RUN = {
    hero: GS.meta.unlocked[GS.meta.hero] ? GS.meta.hero : 'ranger',
    district: 'town',
    inf: 0,
    endless: false,
    journey: true, // built as the road's first stop (Main Street), so Play takes this very map rather than baking another
    layout: 'main',
    stop: 0,
  };
  newRun(true);
  renderDistricts();
  // the last stand behind the title: you at the crossroads with a rifle, and the dead coming in out of the dark
  GS.RUN.attract = true;
  GS.menuAt = GS.time; // (the title theme comes in a few seconds after: world/tick.js) // (what happens here counts for nothing: challenges.js bump, statMax)
  {
    const P = GS.P;
    if (GUNS.rifle) {
      P.owned = P.owned || [];
      if (!P.owned.includes('rifle')) P.owned.push('rifle');
      P.gun = 'rifle';
    }
  }
  STAND.cd = 2.5;
  STAND.tgt = null;
  STAND.spawn = 0;
  for (let i = 0; i < 9; i++) standSpawn(rand(170, 380));
  $('bossBox').hidden = true;
}
// Channel 9 on the title screen: the convoy on the air between nights, in Reyes' own recorded voice once the sound is
// up (the click, the hiss, the words: radio.js), the line typed out as he says it; a long quiet, then the next. The
// first is always the convoy's promise, the one that starts it all
const CH9 = [
  'Convoy to anyone on nine. We roll out in fifteen nights. Stay alive till then.',
  'Nine, convoy. Quiet on our end. Keep your head down.',
  'They are coming up out of the drains again. Watch your corners.',
  'Still here, nine. So are you. Keep it that way.',
  'Count your rounds before you count the dead.',
  'Fog is coming off the river. Listen before you look.',
  'Patrol saw a big group heading your way. Hold tight.',
];
const ch9 = { i: 0, n: 0, hold: 0, cps: 34, said: false, wait: 1.2 };
const ch9Dur = line => {
  const v = GS.VOX.find(r => r[4] === 'R' && r[1] === line);
  return v ? v[2] : 0;
};
// a page can't make a sound until it's clicked or a key is pressed (the browser's rule, not the game's): until then the
// radio asks for that, and the moment the sound is on it keys up from its first line, the theme two seconds behind
const TUNE = 'Click or press a key to tune in';
function ch9Tick(dt) {
  const el = $('ch9t');
  if (!el) return;
  const box = el.parentElement;
  if (!AC || AC.state !== 'running') {
    if (el.textContent !== TUNE) el.textContent = TUNE;
    box.classList.add('tune');
    ch9.tune = true;
    return;
  }
  if (ch9.tune) {
    ch9.tune = false;
    box.classList.remove('tune');
    el.textContent = '';
    ch9.i = ch9.n = ch9.hold = 0;
    ch9.said = false;
    ch9.wait = 0.5;
    GS.menuAt = Math.min(GS.menuAt ?? GS.time, GS.time - 3); // (world/tick.js: the theme 5 s after the menu, so 2 s from now)
  }
  const L = CH9[ch9.i];
  if ((ch9.wait -= dt) > 0) return; // (the screen comes in first)
  if (!ch9.said) {
    // a line starts: on the air if the sound is up and the title is what you're looking at, typed as it's spoken
    ch9.said = true;
    const d = ch9Dur(L),
      live = AC && AC.state === 'running' && !$('menu').hidden && d > 0;
    if (live) radioVoice(L, 'Reyes');
    ch9.cps = live ? L.length / (d + 0.1) : 34;
    ch9.n = live ? -0.18 * ch9.cps : 0; // (the key-up click before the first word)
  }
  if (ch9.n < L.length) ch9.n = Math.min(L.length, ch9.n + dt * ch9.cps);
  else if ((ch9.hold += dt) > 9) {
    ch9.i = (ch9.i + 1) % CH9.length;
    ch9.n = ch9.hold = 0;
    ch9.said = false;
  }
  const t = L.slice(0, Math.max(0, Math.floor(ch9.n)));
  if (el.textContent !== t) el.textContent = t;
}
export function menuUpdate(dt) {
  menuT += dt;
  ch9Tick(dt);
  GS.time += dt;
  standTick(dt);
  GS.P.bodyA += angDiff(GS.P.bodyA, GS.P.aimA) * damp(6, dt);
  rope(GS.P, dt, GS.P.x - Math.cos(GS.P.bodyA) * 9, GS.P.y - Math.sin(GS.P.bodyA) * 9);
  for (const e of GS.enemies) {
    // the dead behind the menu shamble about like the unaware ones in a run: pick a spot, lurch over to it, stand and sway a while, move on
    if (e.type === 'flower') e.open = Math.max(0, Math.sin(GS.time * 1.2 + e.id));
    const sp =
      e.type === 'flower'
        ? 0
        : e.type === 'beetle'
          ? 30
          : e.type === 'hound'
            ? 62
            : e.type === 'wasp'
              ? 46
              : e.type === 'hopper'
                ? 26
                : 30;
    e.mT = (e.mT ?? rand(0, 3)) - dt;
    if (sp && (e.mT <= 0 || (e.goal && d2(e.x, e.y, e.goal[0], e.goal[1]) < 26 * 26))) {
      if (e.goal && Math.random() < 0.3) {
        e.goal = null;
        e.mT = rand(1.5, 4.5);
      } // a rest: it stands and sways
      else {
        e.goal = null;
        for (let k = 0; k < 14; k++) {
          // in toward the light, a stretch at a time, never straight at it
          const a0 = Math.atan2(e.y - GS.P.y, e.x - GS.P.x),
            a = a0 + rand(-0.6, 0.6),
            d = Math.max(70, Math.hypot(e.x - GS.P.x, e.y - GS.P.y) - rand(50, 150)),
            x = GS.P.x + Math.cos(a) * d,
            y = GS.P.y + Math.sin(a) * d;
          if (!solidPt(x, y) && los(e.x, e.y, x, y) && Math.hypot(x - e.x, y - e.y) > 60) {
            e.goal = [x, y];
            break;
          }
        }
        e.mT = rand(6, 11);
      }
    }
    let tvx = 0,
      tvy = 0;
    if (e.goal) {
      const dx = e.goal[0] - e.x,
        dy = e.goal[1] - e.y,
        dl = Math.hypot(dx, dy) || 1,
        w = Math.sin(GS.time * 0.5 + e.id * 1.7) * 0.35,
        c = Math.cos(w),
        sn = Math.sin(w),
        ux = (dx * c - dy * sn) / dl,
        uy = (dx * sn + dy * c) / dl,
        lurch =
          e.type === 'hound'
            ? 1
            : e.limp
              ? 0.3 + Math.pow(Math.abs(Math.sin((e.stride || 0) * Math.PI)), 2) * 1.45
              : 0.6 + Math.abs(Math.sin((e.stride || 0) * Math.PI)) * 0.6;
      tvx = ux * sp * lurch;
      tvy = uy * sp * lurch;
    }
    for (const o of GS.enemies.concat(GS.P)) {
      if (o === e) continue;
      const ex = e.x - o.x,
        ey = e.y - o.y,
        el = Math.hypot(ex, ey),
        rr = (e.cr || e.r) + (o.cr || o.r) + (o === GS.P ? 60 : 6);
      if (el < rr && el > 0.01) {
        tvx += (ex / el) * (rr - el) * 3;
        tvy += (ey / el) * (rr - el) * 3;
      }
    } // they keep out of each other instead of piling up
    e.mvx = (e.mvx || 0) + (tvx - (e.mvx || 0)) * damp(4, dt);
    e.mvy = (e.mvy || 0) + (tvy - (e.mvy || 0)) * damp(4, dt);
    const ox = e.x,
      oy = e.y;
    e.x += e.mvx * dt;
    e.y += e.mvy * dt;
    collide(e);
    e.vx = (e.x - ox) / Math.max(dt, 1e-4);
    e.vy = (e.y - oy) / Math.max(dt, 1e-4);
    const mv = Math.hypot(e.vx, e.vy); // the gait follows how far it really went, so nothing walks on the spot against a wall
    if (e.goal && mv < Math.hypot(tvx, tvy) * 0.3) {
      e.stk = (e.stk || 0) + dt;
      if (e.stk > 0.7) {
        e.stk = 0;
        e.mT = 0;
      }
    } else e.stk = 0;
    e.stride = (e.stride || 0) + (mv * dt) / (e.type === 'hound' ? 70 : 58);
    if (mv > 6) e.a += angDiff(e.a, Math.atan2(e.vy, e.vx)) * damp(3, dt);
    if (HUMAN[e.type]) {
      const tg = e.a + Math.sin(GS.time * 0.7 + e.id) * 0.7;
      e.hl = (e.hl ?? e.a) + angDiff(e.hl ?? e.a, tg) * damp(3, dt);
    }
    if (e.legs) updateLegs(e, dt);
  }
  // closer in than the game's own view, and you a little right of the middle, clear of the title: the camera
  // breathing a little, as if held
  zoomK(1.4);
  const tx = GS.P.x + Math.cos(menuT * 0.15) * 22 - viewW * 0.63,
    ty = GS.P.y + Math.sin(menuT * 0.12) * 16 - viewH * 0.5;
  cam.x += (tx - cam.x) * damp(1.5, dt);
  cam.y += (ty - cam.y) * damp(1.5, dt);
}

/* ---------- Loop ---------- */
