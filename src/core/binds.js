/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Key bindings. Each action sits on a physical key (its code, so it works on any keyboard layout); the player can move
// any of them in Settings › Controls. Input turns a bound key into the action's own letter, so the rest of the game
// never needs to know what was rebound. The keys in FIXED (Esc, P, Enter, M, N, 1–9, arrows) can't be taken.
import { GS } from './gs.js';

export const ACTIONS = [
  { id: 'up', label: 'Move up', def: 'KeyW', key: 'w' },
  { id: 'left', label: 'Move left', def: 'KeyA', key: 'a' },
  { id: 'down', label: 'Move down', def: 'KeyS', key: 's' },
  { id: 'right', label: 'Move right', def: 'KeyD', key: 'd' },
  { id: 'roll', label: 'Roll', def: 'Space', key: ' ' },
  { id: 'reload', label: 'Reload', def: 'KeyR', key: 'r' },
  { id: 'ability', label: 'Ability', def: 'KeyE', key: 'e' },
  { id: 'wheel', label: 'Gun wheel (hold) · last gun (tap)', def: 'KeyQ', key: 'q' },
];
// what can't be moved, shown under the bindable rows
export const FIXED_ROWS = [
  ['Fire', 'Left mouse'],
  ['Roll (also)', 'Right mouse · Shift'],
  ['Swap gun', '1–9 · mouse wheel'],
  ['Move (also)', 'Arrow keys'],
  ['Pause', 'Esc · P'],
  ['Mute · music', 'M · N'],
];
const FIXED = new Set(['Escape', 'KeyP', 'KeyM', 'KeyN', 'Enter', 'NumpadEnter', 'Tab', 'MetaLeft', 'MetaRight']);
for (let i = 1; i <= 9; i++) FIXED.add('Digit' + i).add('Numpad' + i);
for (const a of ['Up', 'Down', 'Left', 'Right']) FIXED.add('Arrow' + a);
const BY_ID = Object.fromEntries(ACTIONS.map(a => [a.id, a]));

export const bindOf = id => (GS.meta && GS.meta.keys && GS.meta.keys[id]) || BY_ID[id].def;
export const bindable = code => !!code && !FIXED.has(code);
// the action letter a pressed key stands for: '' when the key isn't bound to anything, null when bindings don't touch it
export function boundKey(code) {
  let free = false;
  for (const a of ACTIONS) {
    const c = bindOf(a.id);
    if (c === code) return a.key;
    if (a.def === code) free = true; // its default action moved elsewhere: the key does nothing now
  }
  return free ? '' : null;
}
// bind id to code; whatever held that key takes this action's old key, so nothing is left without one
export function setBind(id, code) {
  const keys = { ...((GS.meta && GS.meta.keys) || {}) },
    old = bindOf(id);
  for (const a of ACTIONS) if (a.id !== id && bindOf(a.id) === code) keys[a.id] = old;
  keys[id] = code;
  for (const a of ACTIONS) if (keys[a.id] === a.def) delete keys[a.id];
  GS.meta.keys = keys;
}
export function resetBinds() {
  GS.meta.keys = {};
}
export const bindsChanged = () => Object.keys((GS.meta && GS.meta.keys) || {}).length > 0;

// the name on the keycap: the layout's own letter where the browser tells us, else the US one
let LAYOUT = null;
try {
  if (navigator.keyboard && navigator.keyboard.getLayoutMap)
    navigator.keyboard
      .getLayoutMap()
      .then(m => (LAYOUT = m))
      .catch(() => {});
} catch (e) {}
const NAMES = {
  Space: 'Space',
  ShiftLeft: 'Left Shift',
  ShiftRight: 'Right Shift',
  ControlLeft: 'Left Ctrl',
  ControlRight: 'Right Ctrl',
  AltLeft: 'Left Alt',
  AltRight: 'Right Alt',
  CapsLock: 'Caps Lock',
  Backquote: '`',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backspace: 'Backspace',
};
export function codeName(code) {
  if (!code) return '—';
  if (NAMES[code]) return NAMES[code];
  if (LAYOUT && LAYOUT.get(code)) return LAYOUT.get(code).toUpperCase();
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^Numpad/.test(code)) return 'Num ' + code.slice(6);
  return code.replace(/([a-z])([A-Z])/g, '$1 $2');
}
export const kn = id => codeName(bindOf(id));
// text with {action} in it, the bound key's name put in: 'Press {reload} to reload'
export const keysIn = s => s.replace(/\{(\w+)\}/g, (m, id) => (BY_ID[id] ? kn(id) : m));
export const moveKeys = () => {
  const k = ['up', 'left', 'down', 'right'].map(kn);
  return k.every(n => n.length === 1) ? k.join('') : k.join(' ');
};
