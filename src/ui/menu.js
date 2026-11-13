/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, angDiff, d2, damp, rand } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { GUNS, GUN_FROM, PERKS } from '../game/arsenal.js';
import { DIFF } from '../core/profile.js';
import { viewH, viewW } from '../render/sprites.js';
import { collide, los, solidPt } from '../world/nav.js';
import { makeLegs, updateLegs } from '../actors/legs.js';
import { cam } from '../game/state.js';
import { newRun } from '../game/run.js';
import { hideCallouts } from './callouts.js';
import { makeEnemy } from '../actors/enemies.js';
import { HUMAN } from '../render/effects.js';
import { PK, cleanRun, firstCase, pvLabel } from './hangar.js';
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
  $('roadList').hidden = hm;
  $('roadList').innerHTML = STOPS.map((s, i) => {
    const from = i ? STOPS[i - 1].to + 1 : 1,
      nights = from === s.to ? `Night ${s.to}` : `Nights ${from}–${s.to}`;
    return `<li><span>${nights}</span><b>${s.name}</b><i>${s.area}</i></li>`;
  }).join(''); // the road, stop by stop
  $('survEye').textContent = hm ? 'Horde Mode' : 'Fifteen nights till the chopper';
  $('survTitle').textContent = hm ? 'Pick your ground' : 'The road out';
  $('survLede').innerHTML = hm
    ? 'Wave after wave of hordes, each bigger than the last, with a trap kit and a weapon case between them. No evac: hold as long as you can.'
    : 'Eight stops on the road from <b>Dead Acre</b> to the <b>County Hospital</b>, on foot or in the back of a convoy truck, and five bosses on the way. Heavier guns come down as the nights go on, and on the last one the Guard chopper lands for you.';
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
  $('twDesc').innerHTML =
    (on.length ? `Twists on: ${on.map(t => t.name).join(', ')} (+${Math.round(k * 100)}% scrap).<br>` : '') +
    `This run: <b>${{ relaxed: 'Relaxed', normal: 'Normal', hard: 'Hard' }[GS.meta.diff] || 'Normal'}</b> difficulty · Infection <b>${Math.min(GS.meta.inf || 0, GS.meta.infMax || 0)}</b>${on.length ? ` · <b>${on.length}</b> twist${on.length > 1 ? 's' : ''}` : ''} · scrap <b>×${runScrapK().toFixed(2)}</b>`;
}
export function renderChallenges() {
  // starting loadouts: earned from challenges, one taken into each new run
  $('hangarOutfits').innerHTML = Object.entries(LOADOUTS)
    .map(([id, o]) => {
      const open = loadoutOpen(id),
        on = (GS.meta.loadout || 'std') === id,
        ds =
          o.desc ||
          ((GUN_FROM[o.gun] || 1) > 2
            ? `Your ${GUNS[o.gun].name} rides with the convoy and comes in the weapon case before night ${firstCase(GUN_FROM[o.gun])}, in place of that case.`
            : `Start with the ${GUNS[o.gun].name} and its ammo. It takes the place of your first weapon case, which brings a supply crate and scrap instead.`);
      return `<div class="perk"><span class="nm">${o.name}</span><button type="button" class="buy" data-load="${id}" ${!open || on ? 'disabled' : ''}>${on ? 'Taking' : open ? 'Take' : 'Locked'}</button><span class="ds">${ds}${open ? '' : ' ' + lockLine(o.req)}</span></div>`;
    })
    .join('');
  for (const b of document.querySelectorAll('#hangarOutfits .buy'))
    b.addEventListener('click', () => {
      GS.meta.loadout = b.dataset.load;
      saveMeta();
      renderChallenges();
      if ($('pvName')) pvLabel();
    });
}

/* ---------- Menu attract ---------- */
let menuT = 0;
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
  };
  newRun(true);
  renderDistricts();
  const kinds = ['skitter', 'skitter', 'hopper', 'beetle', 'wasp', 'flower', 'skitter', 'hound', 'mini', 'skitter'];
  kinds.forEach((t, i) => {
    const a = (i / kinds.length) * TAU + 0.3,
      d = rand(170, 300);
    const e = makeEnemy(t, GS.P.x + Math.cos(a) * d, GS.P.y + Math.sin(a) * d);
    e.emerge = 1;
    e.wander = rand(0, TAU);
    if (e.legs) makeLegs(e, e.legSpec);
  });
  $('bossBox').hidden = true;
}
export function menuUpdate(dt) {
  menuT += dt;
  GS.time += dt;
  GS.P.aimA = -Math.PI / 2 + Math.sin(menuT * 0.5) * 1.3;
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
      if (e.goal && Math.random() < 0.55) {
        e.goal = null;
        e.mT = rand(1.5, 4.5);
      } // a rest: it stands and sways
      else {
        e.goal = null;
        for (let k = 0; k < 14; k++) {
          const a = rand(0, TAU),
            d = rand(130, 330),
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
  const tx = GS.P.x + Math.cos(menuT * 0.15) * 120 - viewW / 2,
    ty = GS.P.y + Math.sin(menuT * 0.12) * 80 - viewH / 2;
  cam.x += (tx - cam.x) * damp(1.5, dt);
  cam.y += (ty - cam.y) * damp(1.5, dt);
}

/* ---------- Loop ---------- */
