/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU } from '../core/util.js';
import { TS, TSH, TSU, opt, saveMeta, store } from '../core/settings.js';
import {
  ACTIONS,
  FIXED_ROWS,
  bindOf,
  bindable,
  codeName,
  keysIn,
  moveKeys,
  resetBinds,
  setBind,
} from '../core/binds.js';
import { DEVICE_RENDER_CAP, gfxPreset, resize } from '../render/sprites.js';
import { initAudio, playS } from '../audio/audio.js';
import { applyVol, setMusic, setMuted } from '../audio/music.js';
import { CH_COLS, paintCH } from './crosshair.js';
import { PRACTICE_FROM, openPractice } from '../game/practice.js';
import { tutHint } from '../game/tutorial.js';
import { DIFF_DESC, renderDistricts } from './menu.js';
GS.hintTO = 0;
export function updateHint() {
  const ht = keysIn(
    `${moveKeys()} move · hold click to fire · {reload} reload · {roll} roll · {ability} ability · 1–9 swap · hold {wheel} wheel`
  );
  if (typeof GS.RUN !== 'undefined' && GS.RUN && GS.RUN.tut && GS.RUN.tut.i >= 0) tutHint();
  else {
    $('hint').textContent = ht;
    $('hint').classList.remove('tut');
  }
  $('pauseHint').textContent = ht + ' · Esc resume';
  keyCard($('keyCard'), false);
  {
    const lk = $('luKeys');
    if (lk) {
      const rr = GS.rerolls > 0 && GS.pickSource !== 'weapon' && GS.pickSource !== 'job',
        nk = `Keys 1–${Math.max(1, GS.picks.length || 3)} pick`;
      lk.textContent = rr ? nk + ' · R rerolls' : nk;
    }
  }
}
/* ---------- Controls: one card, read-only in Pause, editable in Settings ---------- */
let waiting = null; // the action whose new key we are waiting for
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function keyCard(el, edit) {
  if (!el) return;
  let h = '';
  for (const a of ACTIONS) {
    const k = waiting === a.id ? 'Press a key…' : codeName(bindOf(a.id));
    h += `<span class="kl">${esc(a.label)}</span>${
      edit
        ? `<button type="button" class="kc${waiting === a.id ? ' wait' : ''}" data-a="${a.id}" aria-label="${esc(a.label)}: ${esc(k)}. Click to change">${esc(k)}</button>`
        : `<kbd class="kc">${esc(k)}</kbd>`
    }`;
  }
  for (const [l, k] of FIXED_ROWS) h += `<span class="kl">${esc(l)}</span><kbd class="kc fixed">${esc(k)}</kbd>`;
  el.innerHTML = h;
}
function keyNote(t, warn) {
  const n = $('keyNote');
  n.textContent = t || 'Click a key, then press the new one · Esc cancels';
  n.classList.toggle('warn', !!warn);
}
function stopWaiting() {
  waiting = null;
  GS.rebinding = false;
  removeEventListener('keydown', grabKey, true);
  keyCard($('keyEdit'), true);
  updateHint();
}
function grabKey(e) {
  e.preventDefault();
  e.stopPropagation();
  if (e.code === 'Escape') {
    keyNote();
    return stopWaiting();
  }
  if (!bindable(e.code)) {
    keyNote(
      `${codeName(e.code)} is kept for ${/^(Digit|Numpad)/.test(e.code) ? 'swapping guns' : 'the menus'} · pick another key`,
      true
    );
    return;
  }
  const id = waiting,
    took = ACTIONS.find(a => a.id !== id && bindOf(a.id) === e.code);
  setBind(id, e.code);
  saveMeta();
  keyNote(
    took
      ? `${codeName(e.code)} was ${took.label.toLowerCase()}: that moved to ${codeName(bindOf(took.id))}`
      : `${ACTIONS.find(a => a.id === id).label} is now ${codeName(e.code)}`
  );
  stopWaiting();
}
/* ---------- Tabs ---------- */
let tab = 'audio';
function showTab(t) {
  tab = t;
  try {
    localStorage.setItem('rr_settab', t);
  } catch (e) {}
  for (const b of $('setTabs').children) {
    const on = b.dataset.tab === t;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
  }
  for (const el of document.querySelectorAll('#settings [data-sec]')) el.hidden = el.dataset.sec !== t;
  if (waiting) stopWaiting();
  if (t === 'controls') keyCard($('keyEdit'), true);
  if (t === 'display' && !chPrevRaf) chPrevRaf = requestAnimationFrame(chPreview);
}
export function syncOpts() {
  const mark = (el, on) => {
    el.classList.toggle('on', !!on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  };
  for (const [id, on] of [
    ['leanBtn', opt.lean],
    ['shakeBtn', opt.shake],
    ['dmgBtn', opt.dmgNums],
    ['flashBtn', opt.flash],
    ['goreBtn', opt.gore],
    ['grainBtn', opt.grain],
    ['losBtn', opt.los],
    ['chLine', GS.meta.ch.line],
  ])
    mark($(id), on);
  mark($('musicBtn'), opt.music);
  mark($('muteBtn'), !GS.muted);
  mark($('musicBtn2'), opt.music);
  mark($('muteBtn2'), !GS.muted);
  mark($('tutBtn'), !!(GS.meta && GS.meta.tutForce));
  $('volMaster').value = Math.round(GS.meta.vol.master * 100);
  $('volMusic').value = Math.round((GS.meta.vol.music / 0.6) * 100);
  $('volSfx').value = Math.round((GS.meta.vol.sfx / 0.8) * 100);
  for (const seg of document.querySelectorAll('.diffSeg'))
    for (const b of seg.children) mark(b, b.dataset.d === GS.meta.diff);
  for (const dd of document.querySelectorAll('.diffDesc')) dd.textContent = DIFF_DESC[GS.meta.diff] || DIFF_DESC.normal;
  for (const b of $('gfxSeg').children) if (b.dataset.g) mark(b, b.dataset.g === GS.meta.hud.gfx);
  mark($('fpsBtn'), GS.meta.hud.fps);
  for (const b of $('chCol').children) mark(b, b.dataset.c === GS.meta.ch.col);
  for (const b of $('chSize').children) if (b.dataset.s) mark(b, +b.dataset.s === GS.meta.ch.size);
  for (const b of $('hudSize').children) mark(b, b.dataset.h === GS.meta.hud.size);
  for (const b of $('hudOp').children) mark(b, +b.dataset.o === GS.meta.hud.op);
  for (const b of $('hudTs').children) mark(b, +b.dataset.t === TSU());
  document.documentElement.style.setProperty('--ts', TS());
  document.documentElement.style.setProperty('--tsh', TSH());
}
/* live crosshair preview in Settings: a patch of night street, a shambler drifting under the reticle, a shot every so often */
let chPrevRaf;
function chPreview() {
  const cv = $('chPrev');
  if (!cv || $('settings').hidden || !cv.offsetWidth) {
    chPrevRaf = 0;
    return;
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1),
    W = cv.offsetWidth,
    H = cv.offsetHeight;
  if (cv.width !== Math.round(W * dpr)) {
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
  }
  const c = cv.getContext('2d'),
    t = performance.now() / 1000;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  // asphalt, a lane mark and a puddle of lamp light
  c.fillStyle = '#1b1f24';
  c.fillRect(0, 0, W, H);
  const g = c.createRadialGradient(W * 0.72, H * 0.2, 4, W * 0.72, H * 0.2, W * 0.7);
  g.addColorStop(0, 'rgba(255,190,110,0.16)');
  g.addColorStop(1, 'rgba(255,190,110,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(214,170,60,0.35)';
  for (let x = -10; x < W; x += 30) c.fillRect(x, H * 0.62, 16, 3);
  for (let i = 0; i < 40; i++) {
    const x = (i * 73.13) % W,
      y = (i * 41.7) % H;
    c.fillStyle = i % 3 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.25)';
    c.fillRect(x, y, 2, 2);
  }
  // a zombie shuffling across; the reticle turns hot when it is over him
  const zx = W * 0.5 + Math.sin(t * 0.55) * W * 0.36,
    zy = H * 0.5 + Math.sin(t * 1.1) * 4,
    mx = W * 0.5,
    my = H * 0.5;
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.ellipse(zx + 3, zy + 5, 11, 7, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#4c5446';
  c.beginPath();
  c.ellipse(zx, zy, 8, 10.5, 0, 0, TAU);
  c.fill();
  c.strokeStyle = '#6f7a62';
  c.lineWidth = 4;
  c.lineCap = 'round';
  for (const sd of [-1, 1]) {
    c.beginPath();
    c.moveTo(zx + sd * 6, zy - 3);
    c.lineTo(zx + sd * 5 - 9, zy + sd * 1 - 4);
    c.stroke();
  }
  c.fillStyle = '#8a8f74';
  c.beginPath();
  c.arc(zx + 3, zy, 5, 0, TAU);
  c.fill();
  const hot = Math.abs(zx - mx) < 14 ? 1 : 0;
  chPrevSt.hot = (chPrevSt.hot || 0) + (hot - (chPrevSt.hot || 0)) * 0.3;
  const ch = GS.meta.ch,
    col = CH_COLS[ch.col] || CH_COLS.lime,
    k = ch.size * 0.72,
    kick = Math.max(0, 1 - (t % 1.4) / 0.18);
  if (ch.line) {
    const px = 10,
      py = H - 8,
      L = Math.hypot(mx - px, my - py);
    c.save();
    c.setLineDash([3, 9]);
    c.lineDashOffset = -t * 40;
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(20,24,29,0.45)';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(mx - ((mx - px) / L) * 22 * k, my - ((my - py) / L) * 22 * k);
    c.stroke();
    c.strokeStyle = col;
    c.globalAlpha = 0.55;
    c.lineWidth = 1.6;
    c.stroke();
    c.restore();
  }
  paintCH(
    c,
    mx,
    my,
    k,
    chPrevSt.hot > 0.5 ? '#ffffff' : col,
    (11 + kick * 7) * k - chPrevSt.hot * 3 * k,
    chPrevSt.hot,
    false
  );
  chPrevRaf = requestAnimationFrame(chPreview);
}
let chPrevSt;
let settingsFrom;
function openSettings(from) {
  settingsFrom = from;
  for (const el of document.querySelectorAll('.pracRow')) el.hidden = from !== 'menu';
  $(from).hidden = true;
  syncOpts();
  $('settings').hidden = false;
  {
    let t = 'audio';
    try {
      t = localStorage.getItem('rr_settab') || t;
    } catch (e) {}
    showTab(document.querySelector(`#setTabs [data-tab="${t}"]`) ? t : 'audio');
  }
  $('motionNote').hidden = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  $('setTabs').querySelector('.on').focus({ preventScroll: true });
}

/* ---------- Profile export/import ---------- */

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  $('leanBtn').addEventListener('click', () => {
    opt.lean = !opt.lean;
    store.set('rr_lean', opt.lean ? '1' : '0');
    syncOpts();
  });
  $('grainBtn').addEventListener('click', () => {
    opt.grain = !opt.grain;
    store.set('rr_grain', opt.grain ? '1' : '0');
    syncOpts();
  });
  $('losBtn').addEventListener('click', () => {
    opt.los = !opt.los;
    store.set('rr_los', opt.los ? '1' : '0');
    syncOpts();
  });
  $('goreBtn').addEventListener('click', () => {
    opt.gore = !opt.gore;
    store.set('rr_gore', opt.gore ? '1' : '0');
    syncOpts();
  });
  $('dmgBtn').addEventListener('click', () => {
    opt.dmgNums = !opt.dmgNums;
    store.set('rr_dmgnums', opt.dmgNums ? '1' : '0');
    syncOpts();
  });
  $('shakeBtn').addEventListener('click', () => {
    opt.shake = !opt.shake;
    store.set('rr_shake', opt.shake ? '1' : '0');
    if (!opt.shake) GS.trauma = 0;
    syncOpts();
  });
  for (const id of ['musicBtn', 'musicBtn2'])
    $(id).addEventListener('click', () => {
      initAudio();
      setMusic(!opt.music);
    });
  $('muteBtn2').addEventListener('click', () => {
    initAudio();
    setMuted(!GS.muted);
  });
  for (const b of $('setTabs').children) b.addEventListener('click', () => showTab(b.dataset.tab));
  $('setTabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const bs = [...$('setTabs').children],
      i = bs.findIndex(b => b.dataset.tab === tab),
      n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length];
    showTab(n.dataset.tab);
    n.focus();
  });
  $('keyEdit').addEventListener('click', e => {
    const b = e.target.closest('button[data-a]');
    if (!b) return;
    if (waiting === b.dataset.a) {
      keyNote();
      return stopWaiting();
    }
    if (waiting) removeEventListener('keydown', grabKey, true);
    waiting = b.dataset.a;
    GS.rebinding = true;
    addEventListener('keydown', grabKey, true);
    keyNote(`Press the new key for ${ACTIONS.find(a => a.id === waiting).label.toLowerCase()} · Esc cancels`);
    keyCard($('keyEdit'), true);
    $('keyEdit').querySelector('.wait').focus();
  });
  $('keyReset').addEventListener('click', () => {
    resetBinds();
    saveMeta();
    keyNote('Back to the default keys');
    stopWaiting();
  });
  $('practiceBtn').addEventListener('click', () => openPractice('settings'));
  $('practiceBack').addEventListener('click', () => {
    $('practice').hidden = true;
    $(PRACTICE_FROM === 'settings' ? 'settings' : 'menu').hidden = false;
  });
  $('flashBtn').addEventListener('click', () => {
    opt.flash = !opt.flash;
    store.set('rr_flash', opt.flash ? '1' : '0');
    syncOpts();
  });
  $('volMaster').addEventListener('input', e => {
    GS.meta.vol.master = e.target.value / 100;
    applyVol();
    saveMeta();
  });
  $('volMusic').addEventListener('input', e => {
    GS.meta.vol.music = (e.target.value / 100) * 0.6;
    applyVol();
    saveMeta();
  });
  $('volSfx').addEventListener('input', e => {
    initAudio();
    GS.meta.vol.sfx = (e.target.value / 100) * 0.8;
    applyVol();
    saveMeta();
    playS('dry', 0.4, 1.6, 0, 0);
  });
  for (const b of $('chCol').children)
    b.addEventListener('click', () => {
      GS.meta.ch.col = b.dataset.c;
      saveMeta();
      syncOpts();
    });
  for (const b of $('chSize').children)
    if (b.dataset.s)
      b.addEventListener('click', () => {
        GS.meta.ch.size = +b.dataset.s;
        saveMeta();
        syncOpts();
      });
  $('chLine').addEventListener('click', () => {
    GS.meta.ch.line = !GS.meta.ch.line;
    saveMeta();
    syncOpts();
  });
  for (const b of $('hudSize').children)
    b.addEventListener('click', () => {
      GS.meta.hud.size = b.dataset.h;
      saveMeta();
      syncOpts();
    });
  for (const b of $('hudTs').children)
    b.addEventListener('click', () => {
      GS.meta.hud.ts = +b.dataset.t;
      saveMeta();
      syncOpts();
      for (const id of ['gauge', 'wavePlate', 'scorePlate', 'bossBox', 'radio']) $(id).dataset.hf = '';
    });
  for (const b of $('hudOp').children)
    b.addEventListener('click', () => {
      GS.meta.hud.op = +b.dataset.o;
      saveMeta();
      syncOpts();
      for (const id of ['gauge', 'wavePlate', 'scorePlate', 'bossBox', 'radio']) $(id).dataset.hf = '';
    });
  for (const seg of document.querySelectorAll('.diffSeg'))
    for (const b of seg.children)
      b.addEventListener('click', () => {
        GS.meta.diff = b.dataset.d;
        saveMeta();
        syncOpts();
        if (seg.id === 'diffSeg2') renderDistricts();
      });
  for (const b of $('gfxSeg').children)
    if (b.dataset.g)
      b.addEventListener('click', () => {
        if (GS.meta.hud.gfx === b.dataset.g) return;
        GS.meta.hud.gfx = b.dataset.g;
        saveMeta();
        syncOpts();
        GS.RS_MAX = Math.min(DEVICE_RENDER_CAP, gfxPreset().dpr);
        GS.rsCap = GS.RS_MAX;
        GS.rsDropT = 0;
        resize();
      });
  $('fpsBtn').addEventListener('click', () => {
    GS.meta.hud.fps = !GS.meta.hud.fps;
    saveMeta();
    syncOpts();
  });
  chPrevRaf = 0;
  chPrevSt = { hot: 0 };
  settingsFrom = 'menu';
  $('settingsBtn').addEventListener('click', () => openSettings('menu'));
  $('settingsBtn2').addEventListener('click', () => openSettings('pause'));
  $('settingsBack').addEventListener('click', () => {
    if (waiting) stopWaiting();
    $('settings').hidden = true;
    if (GS.state === 'pause' || GS.state === 'menu') $(settingsFrom).hidden = false;
    const returnId = settingsFrom === 'pause' ? 'settingsBtn2' : 'settingsBtn';
    const returnTarget = $(returnId);
    if (returnTarget && !returnTarget.hidden) returnTarget.focus({ preventScroll: true });
  });
}
