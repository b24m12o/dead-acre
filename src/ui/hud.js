/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { SIG } from '../game/objectives.js';
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { clamp } from '../core/util.js';
import { GUNS } from '../game/arsenal.js';
import { ui } from '../render/gl.js';
import { VH, VW, ZOOM } from '../render/sprites.js';
import { S, hasAmmo, magSize } from '../game/state.js';
import { placeStreak } from './callouts.js';
import { underBoss } from '../game/waves.js';
import { AB, abCd } from '../game/abilities.js';
import { bossHint } from '../actors/bosses.js';
import { FINAL_NIGHT } from '../game/districts.js';
import { TRAITS } from '../actors/backups.js';
import { EV_NAME } from '../audio/radio.js';
import { objText } from '../game/objective-flow.js';
import { kn } from '../core/binds.js';
const hc = {};
export const setT = (id, v) => {
  if (hc[id] !== v) {
    hc[id] = v;
    $(id).textContent = v;
  }
};
export const setB = (id, f) => {
  const v = clamp(f, 0, 1).toFixed(3);
  if (hc[id] !== v) {
    hc[id] = v;
    $(id).style.transform = `scaleX(${v})`;
  }
};
/* HUD layout: panel rects (refreshed a few times a second) drive the fade-when-covered, the radar spot and where edge arrows may sit */
export const HUDF = {
  t: 0,
  rects: [],
  els: null,
  a: {},
  radarA: 0.62,
  last: 0,
  gun: null,
  own: 0,
  ownSet: [],
  prev: null,
  got: {},
  newGun: null,
  swapT: 0,
};
export function radarBox() {
  const S0 = VW < 900 || VH < 640 ? 100 : VH < 820 ? 112 : 128,
    sp = HUDF.score;
  return { S0, x0: VW - S0 - 14, y0: Math.max(40, sp ? Math.round(sp.b + 10) : 44) };
}
export function hudRects() {
  const now = performance.now();
  if (now - HUDF.t < 200 && HUDF.rects.length) return HUDF.rects;
  HUDF.t = now;
  if (!HUDF.els) HUDF.els = ['gauge', 'wavePlate', 'scorePlate', 'bossBox', 'radio', 'lv', 'hint'].map(id => $(id)); // the level label and the controls line at the bottom count too
  const out = [];
  for (const el of HUDF.els) {
    if (el.hidden || ((el.id === 'radio' || el.id === 'hint') && !el.classList.contains('show'))) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2) continue;
    const o = { id: el.id, l: r.left, t: r.top, r: r.right, b: r.bottom };
    out.push(o);
    if (el.id === 'scorePlate') HUDF.score = o;
  }
  const rb = radarBox();
  out.push({ id: 'radar', l: rb.x0 - 6, t: rb.y0 - 6, r: rb.x0 + rb.S0 + 6, b: rb.y0 + rb.S0 + 6 });
  HUDF.rects = out;
  return out;
}
export function safeLabel(txt, x, y) {
  // a label above something in the world: kept inside the screen and nudged off the HUD panels, never cut off or hidden under them
  const w = ui.measureText(txt).width,
    m = 8;
  x = clamp(x, w / 2 + m, VW - w / 2 - m);
  y = clamp(y, 14, VH - 10);
  for (let it = 0; it < 3; it++) {
    let mv = false;
    for (const q of hudRects()) {
      if (x + w / 2 > q.l - 6 && x - w / 2 < q.r + 6 && y > q.t - 10 && y < q.b + 12) {
        y = q.b + 16;
        mv = true;
      }
    }
    if (!mv) break;
  }
  return [x, y];
}
export const inRect = (x, y, q, pad) => x > q.l - pad && x < q.r + pad && y > q.t - pad && y < q.b + pad;
function hudFade() {
  const now = performance.now() / 1000,
    dt = Math.min(0.1, now - (HUDF.last || now));
  HUDF.last = now;
  const rects = hudRects(),
    op = (GS.meta.hud && GS.meta.hud.op) || 1,
    pts = [[(GS.P.x - GS.camX) * ZOOM, (GS.P.y - GS.camY) * ZOOM]];
  for (const e of GS.enemies)
    if (!e.dead && e.emerge >= 1 && !e.dormant && (e.los || e.big)) {
      // only what you could see from where you stand: a panel never gives away a zombie behind a wall
      const x = (e.x - GS.camX) * ZOOM,
        y = (e.y - (e.z || 0) - GS.camY) * ZOOM;
      if (x > -20 && y > -20 && x < VW + 20 && y < VH + 20) pts.push([x, y]);
    }
  for (const c of GS.crates) if (c.landed) pts.push([(c.x - GS.camX) * ZOOM, (c.y - GS.camY) * ZOOM]);
  for (const q of rects) {
    const hid = pts.some(([x, y]) => inRect(x, y, q, 22)),
      tgt = hid ? (q.id === 'gauge' ? 0.72 : 0.5) : 1, // your guns and health stay readable
      cur = HUDF.a[q.id] ?? 1,
      v = cur + (tgt - cur) * Math.min(1, dt * (hid ? 9 : 4));
    HUDF.a[q.id] = v;
    if (q.id === 'radar') continue;
    const el = $(q.id),
      fv = (v * op).toFixed(2);
    if (el.dataset.hf !== fv) {
      el.dataset.hf = fv;
      el.style.setProperty('--hf', fv);
    }
  }
  const important =
    (!GS.queue.length && GS.enemies.length > 0 && GS.enemies.length <= 5) ||
    GS.crates.some(c => c.landed) ||
    (GS.boss && !GS.boss.dead) ||
    !!GS.evac;
  const rt = important ? 1 : 0.62;
  HUDF.radarA += (rt - HUDF.radarA) * Math.min(1, dt * 3);
}
function gunPanel() {
  // Compact never expands on its own: pickups and swaps show inside the compact panel
  const full = GS.meta.hud && GS.meta.hud.size === 'full',
    now = performance.now() / 1000;
  const g = $('gauge');
  if (g.classList.contains('open') !== full) {
    g.classList.toggle('open', full);
    HUDF.t = 0;
  }
  const fresh = new Set();
  if (HUDF.own && GS.P.owned.length > HUDF.own) {
    for (const q of GS.P.owned)
      if (!HUDF.ownSet.includes(q)) {
        HUDF.newGun = { g: q, until: now + 2.4 };
        if (GUNS[q].ammo) fresh.add(GUNS[q].ammo);
      }
  }
  HUDF.own = GS.P.owned.length;
  HUDF.ownSet = GS.P.owned.slice();
  const prev = HUDF.prev || {},
    got = HUDF.got || (HUDF.got = {});
  for (const t in GS.P.ammo) {
    if (prev[t] !== undefined && GS.P.ammo[t] > prev[t] && !fresh.has(t)) {
      got[t] = { n: GS.P.ammo[t] - prev[t] + (got[t] && now < got[t].until ? got[t].n : 0), until: now + 1.4 };
    }
    prev[t] = GS.P.ammo[t];
  }
  HUDF.prev = prev;
  if (HUDF.gun !== GS.P.gun) {
    if (HUDF.gun !== null) HUDF.swapT = now + 0.5;
    HUDF.gun = GS.P.gun;
  }
  const G = GUNS[GS.P.gun],
    mag = GS.P.mag[GS.P.gun],
    res = G.ammo ? GS.P.ammo[G.ammo] : null,
    rl = GS.P.reload > 0,
    pl = G.ammo && got[G.ammo] && now < got[G.ammo].until ? got[G.ammo].n : 0;
  setT(
    'gunName',
    rl
      ? 'Reloading…'
      : G.name +
          (GS.P.gun === 'rifle' && Math.hypot(GS.P.vx, GS.P.vy) < 40 && GS.time - (GS.P.lastShotT || -9) < 1.2
            ? ' · braced'
            : GS.P.gun === 'lmg' && GS.time - (GS.P.lastShotT || -9) < 0.22
              ? ' · slowed'
              : '')
  );
  $('gunName').classList.toggle('rl', rl);
  $('gunCur').classList.toggle('sw', now < (HUDF.swapT || 0));
  const ak = rl + '|' + mag + '|' + res + '|' + pl;
  if (hc.gunAmmo !== ak) {
    hc.gunAmmo = ak;
    const ga = $('gunAmmo');
    ga.className =
      'ga' + (rl ? ' rl' : !mag && !res ? ' out' : mag <= Math.ceil(magSize(GS.P.gun) * 0.2) ? ' low' : '');
    ga.innerHTML =
      `<b>${mag}</b> / ${res === null ? '∞' : res === 0 && mag > 0 ? '<s class="lastmag">0 · last mag</s>' : res}` +
      (pl ? `<i class="plus">+${pl}</i>` : '');
  }
  const fl = q => {
      const t = GUNS[q].ammo;
      return t && got[t] && now < got[t].until;
    },
    nw = q => HUDF.newGun && HUDF.newGun.g === q && now < HUDF.newGun.until;
  const ck = GS.P.owned.map(q => q + (hasAmmo(q) ? 1 : 0) + (fl(q) ? 'g' : '') + (nw(q) ? 'n' : '')).join() + GS.P.gun;
  if (hc.chips !== ck) {
    hc.chips = ck;
    $('gunChips').innerHTML = GS.P.owned
      .map(
        (q, i) =>
          `<span class="${GS.P.gun === q ? 'on' : ''}${hasAmmo(q) ? '' : ' empty'}${fl(q) ? ' got' : ''}${nw(q) ? ' new' : ''}" title="${GUNS[q].name}">${i + 1}</span>`
      )
      .join('');
  }
}
export function updateHud() {
  if (GS.streakT > 0 && GS.streakCur) placeStreak();
  hudFade();
  gunPanel();
  {
    const bb = $('bossBox');
    if (!bb.hidden) {
      const wb = hudRects().find(q => q.id === 'wavePlate');
      if (wb) {
        const t = Math.round(wb.b + 6) + 'px';
        if (bb.style.top !== t) {
          bb.style.top = t;
          HUDF.t = 0;
        }
      }
    }
  }
  const r = Math.max(0, GS.P.hp) / S.maxHp;
  setB('hpFill', r);
  $('hpBar').classList.toggle('low', r < 0.3);
  setT('hpTxt', `${Math.ceil(Math.max(0, GS.P.hp))} / ${Math.round(S.maxHp)}`);
  setT(
    'waveTxt',
    GS.RUN.hm
      ? `Horde ${Math.max(1, GS.wave)}`
      : GS.RUN.endless
        ? `Night ${Math.max(1, GS.wave)} · endless`
        : `Night ${Math.max(1, GS.wave)} / ${FINAL_NIGHT}`
  );
  setT('objTxt', objText());
  const left = GS.queue.length + GS.enemies.length,
    sg = GS.RUN.sg,
    quiet = sg && sg.lull > 0 && GS.enemies.filter(e => !e.dead && !e.dormant).length <= 3;
  setT(
    'waveSub',
    !GS.wave
      ? 'Get ready'
      : GS.evac && !GS.evac.leave
        ? 'Get to the chopper'
        : GS.RUN.jobPend && GS.nightDone
          ? 'Convoy calling…'
          : GS.nightDone && !left && GS.interT > 0
            ? GS.crates.some(c => c.dawn && !c.open) && GS.interT <= 4.05 && (GS.RUN.dawnX || 0) < 14
              ? 'Drop waiting · Enter to skip'
              : `Next night in ${Math.ceil(GS.interT)}${GS.RUN.nextSig ? ' · ' + SIG[GS.RUN.nextSig.s] : ''} · Enter to start`
            : quiet
              ? sg.i >= sg.cuts.length
                ? 'Quiet · last surge next'
                : 'Quiet · more coming'
              : GS.RUN.tut
                ? 'Training'
                : left
                  ? sg && GS.nightLive && !GS.nightDone
                    ? `Surge ${Math.min(sg.i + 1, 3)} of 3 · ${left} still walking`
                    : `Survive till dawn · ${left} still walking`
                  : GS.obj && !GS.obj.done
                    ? 'Finish the job'
                    : 'Hold on'
  );
  {
    const w = GS.ev && !GS.nightDone && !GS.evac ? GS.ev : null;
    if (hc.wx !== w) {
      hc.wx = w;
      const t = $('wxTag');
      t.hidden = !w;
      if (w) {
        t.textContent = EV_NAME[w];
        t.className = 'wx ' + w;
      }
      HUDF.t = 0;
    }
  } // the weather, as a small tag
  setT('scoreTxt', GS.score.toLocaleString());
  const mult = 1 + Math.min(4, Math.floor(GS.combo / 10) * 0.5);
  setT(
    'chain',
    GS.combo >= 10
      ? `Chain ${GS.combo} · ×${mult.toFixed(1)} score`
      : GS.combo >= 5
        ? `Chain ${GS.combo} · ×1.5 at 10`
        : ''
  );
  {
    const gk = GS.P.owned.map(g => g + GS.P.mag[g]).join() + JSON.stringify(GS.P.ammo) + GS.P.gun + (GS.P.reload > 0);
    if (hc.guns !== gk) {
      hc.guns = gk;
      $('gunRow').innerHTML = GS.P.owned
        .map((g, i) => {
          const G = GUNS[g];
          return `<span class="${GS.P.gun === g ? 'on' : ''}${hasAmmo(g) ? '' : ' empty'}"><b>${i + 1}</b>${G.name}<em class="${GS.P.reload > 0 && GS.P.gun === g ? 'rl' : ''}">${GS.P.mag[g] + ' / ' + (G.ammo ? GS.P.ammo[G.ammo] : '∞')}</em></span>`;
        })
        .join('');
    }
  }
  {
    const k = GS.buddies
      .map(b => b.nm + b.tr + (b.down > 0 ? 'd' + Math.ceil(b.down) : Math.round((b.hp / b.max) * 20)))
      .join();
    if (hc.squad !== k) {
      hc.squad = k;
      $('squad').innerHTML = GS.buddies
        .map(b => {
          const f = b.down > 0 ? b.down / (b.downMax || 12) : b.hp / b.max;
          return `<div class="sq${b.down > 0 ? ' dn' : f < 0.5 ? ' hurt' : ''}"><span><b>${b.nm || 'Backup'}</b> · ${b.down > 0 ? `down ${Math.ceil(b.down)} s` : TRAITS[b.tr] ? TRAITS[b.tr].name : ''}</span><div class="thin"><i style="transform:scaleX(${clamp(f, 0, 1).toFixed(2)})"></i></div></div>`;
        })
        .join('');
      HUDF.t = 0;
    }
  } // your people, by name
  setT('lv', `Level ${GS.level}`);
  setB('xpFill', GS.xp / GS.xpNeed);
  setB('dashFill', 1 - GS.P.dashCd / S.dashCd);
  setB('abFill', 1 - (GS.P.abT || 0) / abCd());
  {
    const rd = !(GS.P.abT > 0),
      lt = rd ? AB().name + ' · ' + kn('ability') : `${AB().name} · ${Math.ceil(GS.P.abT)} s`;
    if (hc.abL !== lt) {
      hc.abL = lt;
      $('abLbl').textContent = lt;
    }
    if (hc.abRd !== rd) {
      hc.abRd = rd;
      const r = $('abRow');
      r.classList.toggle('ready', rd);
      r.classList.remove('pulse');
      if (rd) {
        void r.offsetWidth;
        r.classList.add('pulse');
      }
    }
  }
  if (GS.boss && !GS.boss.dead) {
    setB('bossFill', GS.boss.hp / GS.boss.maxHp);
    setB('bossStg', (GS.boss.stg || 0) / (GS.boss.maxHp * 0.05));
    const ct = GS.boss.btype === 'chief' && !GS.boss.tankGone;
    if (hc.tankOn !== ct) {
      hc.tankOn = ct;
      $('tankWrap').hidden = $('tankLbl').hidden = !ct;
    }
    if (ct) setB('bossTank', GS.boss.tank / (GS.boss.maxHp * 0.1));
    const ht = bossHint(GS.boss);
    if ($('banner').classList.contains('show')) underBoss($('banner'));
    if (hc.bhint !== ht) {
      hc.bhint = ht;
      $('bossHint').textContent = ht;
    }
  }
}
