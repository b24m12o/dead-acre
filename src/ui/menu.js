/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, angDiff, d2, damp, rand } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { PERKS } from '../game/arsenal.js';
import { DIFF } from '../core/profile.js';
import { viewH, viewW } from '../render/sprites.js';
import { collide, los, solidPt } from '../world/nav.js';
import { makeLegs, updateLegs } from '../actors/legs.js';
import { cam } from '../game/state.js';
import { newRun } from '../game/run.js';
import { hideCallouts } from './callouts.js';
import { makeEnemy } from '../actors/enemies.js';
import { HUMAN } from '../render/effects.js';
import { HPV, PK, cleanRun, pvLabel } from './hangar.js';
import { rope } from '../core/later.js';
import { DISTRICTS, INFECTION, TWISTS } from '../game/districts.js';
import { CHAL, OUTFITS, chalDone, districtOpen } from '../game/challenges.js';
export function renderDistricts() {
  if (!GS.meta.district || !districtOpen(GS.meta.district)) GS.meta.district = 'town';
  $('districts').innerHTML = Object.entries(DISTRICTS)
    .map(([id, d]) => {
      const open = districtOpen(id),
        won = GS.meta.evacDist && GS.meta.evacDist[id];
      return `<button type="button" class="hero${GS.meta.district === id ? ' on' : ''}${open ? '' : ' locked'}" data-d="${id}">${won ? '<i class="won" title="Evac made from here" aria-label="Evac made from here"><svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true"><path d="M2.2 6.4l2.4 2.3 5.2-5.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></i>' : ''}<span class="nm">${d.name}</span><span class="ds">${d.desc}</span>${open ? `<span class="wp">Boss: ${d.boss}</span>` : `<span class="lk">Locked · ${CHAL.find(c => c.id === d.lock).desc}</span>`}</button>`;
    })
    .join('');
  for (const b of $('districts').children)
    b.addEventListener('click', () => {
      const id = b.dataset.d;
      if (!districtOpen(id) || GS.meta.district === id) return;
      GS.meta.district = id;
      saveMeta();
      renderDistricts();
      menuInit();
    });
  const mx = GS.meta.infMax || 0;
  GS.meta.inf = Math.min(GS.meta.inf || 0, mx);
  $('infSeg').innerHTML = Array.from(
    { length: 11 },
    (_, i) =>
      `<button type="button" data-i="${i}" class="${(GS.meta.inf || 0) === i ? 'on' : ''}" ${i > mx ? 'disabled' : ''}>${i}</button>`
  ).join('');
  for (const b of $('infSeg').children)
    b.addEventListener('click', () => {
      if (b.disabled) return;
      GS.meta.inf = +b.dataset.i;
      saveMeta();
      renderDistricts();
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
      `<button type="button" class="tw${GS.meta.twists[t.id] ? ' on' : ''}" data-t="${t.id}" aria-pressed="${GS.meta.twists[t.id] ? 'true' : 'false'}"><b>${t.name}</b><span>${t.desc}</span><em>+${Math.round(t.scrap * 100)}% scrap</em></button>`
  ).join('');
  for (const b of box.children)
    b.addEventListener('click', () => {
      const id = b.dataset.t;
      GS.meta.twists[id] = !GS.meta.twists[id];
      if (!GS.meta.twists[id]) delete GS.meta.twists[id];
      saveMeta();
      renderTwists();
    });
  const on = TWISTS.filter(t => GS.meta.twists[t.id]),
    k = on.reduce((a, t) => a + t.scrap, 0);
  $('twDesc').innerHTML =
    (on.length
      ? `${on.map(t => t.name).join(' · ')} · +${Math.round(k * 100)}% scrap`
      : 'Optional rules for the run. Each one pays more scrap.') +
    `<br>This run: <b>${{ relaxed: 'Relaxed', normal: 'Normal', hard: 'Hard' }[GS.meta.diff] || 'Normal'}</b> difficulty · Infection <b>${Math.min(GS.meta.inf || 0, GS.meta.infMax || 0)}</b>${on.length ? ` · <b>${on.length}</b> twist${on.length > 1 ? 's' : ''}` : ''} · scrap <b>×${runScrapK().toFixed(2)}</b>`;
}
export function renderChallenges() {
  $('hangarOutfits').innerHTML = Object.entries(OUTFITS)
    .map(([id, o]) => {
      const open = !o.req || chalDone(o.req),
        on = (GS.meta.outfit || 'std') === id;
      return `<div class="perk"><span class="nm"><i class="swatch" style="background:rgb(${o.tint.map(v => Math.round(Math.min(255, v * 140))).join(',')})"></i>${o.name}</span><button type="button" class="buy" data-outfit="${id}" ${!open || on ? 'disabled' : ''}>${on ? 'Wearing' : open ? 'Wear' : 'Locked'}</button><span class="ds">${open ? "Tints every survivor's clothes." : 'Unlock: complete ' + CHAL.find(c => c.id === o.req).name}</span></div>`;
    })
    .join('');
  for (const b of document.querySelectorAll('#hangarOutfits .buy'))
    b.addEventListener('click', () => {
      GS.meta.outfit = b.dataset.outfit;
      saveMeta();
      renderChallenges();
      if ($('pvName')) pvLabel();
    });
  for (const r of document.querySelectorAll('#hangarOutfits .perk')) {
    const id = r.querySelector('.buy').dataset.outfit,
      on = () => {
        HPV.outfit = id;
        if ($('pvName')) pvLabel();
      },
      off = () => {
        HPV.outfit = null;
        if ($('pvName')) pvLabel();
      };
    r.addEventListener('mouseenter', on);
    r.addEventListener('mouseleave', off);
    r.addEventListener('focusin', on);
    r.addEventListener('focusout', off);
  } // hover any outfit, locked ones too, to see it on your character
}

/* ---------- Menu attract ---------- */
let menuT = 0;
export function menuInit() {
  GS.PRACTICE = null;
  hideCallouts();
  $('banner').classList.remove('show');
  GS.state = 'menu';
  GS.RUN = {
    hero: GS.meta.unlocked[GS.meta.hero] ? GS.meta.hero : 'ranger',
    district: districtOpen(GS.meta.district || 'town') ? GS.meta.district || 'town' : 'town',
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
