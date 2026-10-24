/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from './gs.js';
import { $ } from './errors.js';
import { opt } from './settings.js';
import { glc } from '../render/gl.js';
import { AC, initAudio } from '../audio/audio.js';
import { setMusic, setMuted } from '../audio/music.js';
import { WHEEL, cycleGun, startReload, switchGun, wheelRelease } from '../game/state.js';
import { choose, doReroll } from '../game/upgrades.js';
import { tryDash, useAbility } from '../game/abilities.js';
import { begin } from '../ui/hangar.js';
import { setPause } from '../ui/screens.js';
import { openPractice } from '../game/practice.js';
import { tutEnd } from '../game/tutorial.js';
/* =====================================================================
   Input
   ===================================================================== */
export const keys = new Set(),
  mouse = { x: 0, y: 0, down: false, seen: false };
// physical key positions, so WASD works on any keyboard layout (Russian, AZERTY, etc.)
const CODEMAP = {
  KeyW: 'w',
  KeyA: 'a',
  KeyS: 's',
  KeyD: 'd',
  KeyP: 'p',
  KeyM: 'm',
  KeyN: 'n',
  KeyR: 'r',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9',
  KeyQ: 'q',
  Numpad1: '1',
  Numpad2: '2',
  Numpad3: '3',
  Numpad4: '4',
  Numpad5: '5',
  Numpad6: '6',
  Numpad7: '7',
  Numpad8: '8',
  Numpad9: '9',
  Space: ' ',
  ShiftLeft: 'shift',
  ShiftRight: 'shift',
  Escape: 'escape',
  Enter: 'enter',
  NumpadEnter: 'enter',
  ArrowUp: 'arrowup',
  ArrowDown: 'arrowdown',
  ArrowLeft: 'arrowleft',
  ArrowRight: 'arrowright',
};
const keyOf = e => CODEMAP[e.code] || (e.key || '').toLowerCase();
export function moveInput() {
  let x = 0,
    y = 0;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  const l = Math.hypot(x, y);
  if (l > 1) {
    x /= l;
    y /= l;
  }
  return [x, y];
}
// ---- E: each character's own ability, on a long cooldown

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  addEventListener('keydown', e => {
    const target = e.target;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName || ''))) return;
    const k = keyOf(e);
    initAudio();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k) && GS.state !== 'menu') e.preventDefault();
    if (GS.state === 'play' && document.activeElement && document.activeElement !== document.body)
      document.activeElement.blur();
    keys.add(k);
    if (GS.state === 'play') {
      if (k === ' ' || k === 'shift') tryDash();
      if (k === 'escape' || k === 'p') setPause(true);
      if (/^[1-9]$/.test(k)) switchGun(GS.P.owned[+k - 1]);
      if (k === 'enter' && !e.repeat && GS.RUN.tut) tutEnd(true);
      if (
        k === 'enter' &&
        !e.repeat &&
        GS.nightDone &&
        !GS.RUN.jobPend &&
        !GS.evac &&
        !GS.queue.length &&
        !GS.enemies.length &&
        GS.interT > 0.6
      ) {
        GS.interT = 0.6;
        GS.RUN.dawnX = 99;
      }
      /* the number is the gun's place in your row, as the HUD shows it */ if (k === 'q' && !e.repeat) {
        WHEEL.downT = performance.now();
        WHEEL.held = 'kbm';
      }
      if (k === 'r') startReload();
      if (k === 'e' && !e.repeat) useAbility();
    } else if (GS.state === 'pause' && k === 'escape' && !$('settings').hidden) $('settingsBack').click();
    else if (GS.state === 'pause' && (k === 'escape' || k === 'p')) setPause(false);
    else if (GS.state === 'levelup' && !e.repeat && ['1', '2', '3'].includes(k)) choose(+k - 1);
    else if (GS.state === 'levelup' && !e.repeat && k === 'r') doReroll();
    else if (k === 'enter' && GS.state === 'over' && !$('over').hidden) {
      e.preventDefault();
      begin(false);
    } else if (
      (GS.state === 'over' || GS.state === 'won') &&
      !e.repeat &&
      (k === 'enter' || k === 'escape') &&
      !$(GS.state).hidden &&
      !(document.activeElement && document.activeElement.tagName === 'BUTTON' && k === 'enter')
    ) {
      $(GS.state === 'over' ? (k === 'enter' ? 'againBtn' : 'toMenuBtn') : 'wonMenuBtn').click();
    } else if (k === 'escape' && GS.state === 'menu') {
      for (const [id, b] of [
        ['practice', 'practiceBack'],
        ['hangar', 'hangarBack'],
        ['settings', 'settingsBack'],
        ['chal', 'chalBack'],
        ['survSetup', 'survBack'],
      ])
        if ($(id) && !$(id).hidden) {
          $(b).click();
          break;
        }
    } else if (k === 'b' && GS.state === 'menu' && !$('menu').hidden && !e.repeat) openPractice('menu'); // tester shortcut: boss practice
    if (k === 'm') setMuted(!GS.muted);
    if (k === 'n') setMusic(!opt.music);
  });
  addEventListener('keyup', e => {
    keys.delete(keyOf(e));
    keys.delete((e.key || '').toLowerCase());
    if (keyOf(e) === 'q' && WHEEL.held === 'kbm') wheelRelease();
  });
  glc.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.seen = true;
  });
  glc.addEventListener('mousedown', e => {
    initAudio();
    if (e.button === 0) mouse.down = true;
    if (e.button === 2) tryDash();
  });
  addEventListener('mouseup', e => {
    if (e.button === 0) mouse.down = false;
  });
  glc.addEventListener('contextmenu', e => e.preventDefault());
  glc.addEventListener(
    'wheel',
    e => {
      if (GS.state === 'play') {
        e.preventDefault();
        if (!GS.P.wheelT || performance.now() - GS.P.wheelT > 160) {
          GS.P.wheelT = performance.now();
          cycleGun(e.deltaY > 0 ? 1 : -1);
        }
      }
    },
    { passive: false }
  );
  addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
    if (GS.state === 'play') setPause(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (GS.state === 'play') setPause(true);
      if (AC && AC.state === 'running') AC.suspend();
    } else if (AC && AC.state === 'suspended' && GS.state !== 'pause') AC.resume();
  });
}
