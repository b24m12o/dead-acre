/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A boss's entrance, staged: the fight holds still (nothing walks, nothing hurts you), black bars come in, the camera
// goes over to where it will come from, the place does what it does before it comes (the lights die, the bell, the
// siren), it comes out, its name, and the camera comes back to you. The first time it's the whole thing; after that
// only the moment it comes out. Any key, click or button skips it.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { cam } from './state.js';
import { radioTick } from '../audio/radio.js';
import { physTick } from '../world/physics.js';
import { updateEnemy } from '../actors/enemy-ai.js';
import { saveMeta } from '../core/settings.js';

export const CINE = { t: 0, end: 0, steps: [], boss: null, card: null, cardAt: 0, prev: 'play' };

function el() {
  let c = $('cineCard');
  if (c) return c;
  const bars = document.createElement('div');
  bars.id = 'cineBars';
  bars.innerHTML = '<i></i><i></i>';
  document.body.appendChild(bars);
  c = document.createElement('div');
  c.id = 'cineCard';
  c.innerHTML = '<b></b><span></span>';
  document.body.appendChild(c);
  return c;
}

// x, y: where the camera looks; steps: [time, fn] (a step's fn may return the boss); reveal: when it comes out;
// end: when the camera goes back; name/sub: its card; key: what marks it seen
export function cinePlay({ x, y, steps, reveal, end, name, sub, key, onTick = null, onEnd = null }) {
  const seen = !!(GS.meta.bossSeen && GS.meta.bossSeen[key]);
  CINE.steps = steps.slice().sort((a, b) => a[0] - b[0]);
  CINE.t = seen ? Math.max(0, reveal - 0.45) : 0; // seen before: straight to the moment it comes out
  CINE.end = seen ? reveal + 1.5 : end;
  CINE.cardAt = reveal + (seen ? 0.15 : 0.55);
  CINE.boss = null;
  CINE.onTick = onTick; // every frame of it (a clip that poses the boss)
  CINE.onEnd = onEnd; // when it's over, played out or skipped
  CINE.age = 0;
  CINE.card = { name, sub };
  CINE.prev = GS.state;
  CINE.key = key;
  GS.state = 'cine';
  padWas = padDown();
  cam.cine = { x, y };
  const c = el();
  c.classList.remove('show');
  c.firstChild.textContent = name;
  c.lastChild.textContent = sub || '';
  document.body.classList.add('cine');
  while (CINE.steps.length && CINE.steps[0][0] <= CINE.t) run(CINE.steps.shift()); // what had already happened
  if (CINE.onTick) CINE.onTick(CINE.t);
  GS.P.inv = Math.max(GS.P.inv, 1);
}
function run(s) {
  const r = s[1]();
  if (r && r.type === 'queen') CINE.boss = r;
}
export function cineTick(dt) {
  radioTick(dt);
  GS.time += dt; // the place breathes on (fires, lamps, the way they sway where they stand): only nobody moves
  CINE.t += dt;
  CINE.age += dt;
  while (CINE.steps.length && CINE.steps[0][0] <= CINE.t) run(CINE.steps.shift());
  physTick(dt);
  if (CINE.onTick) CINE.onTick(CINE.t);
  const e = CINE.boss;
  if (e && !e.dead) updateEnemy(e, dt, GS.P);
  if (CINE.card && CINE.t >= CINE.cardAt) {
    el().classList.add('show');
    CINE.card = null;
  }
  GS.P.inv = Math.max(GS.P.inv, 0.6);
  if (CINE.t >= CINE.end) cineEnd();
}
export function cineSkip() {
  if (GS.state !== 'cine') return;
  while (CINE.steps.length) run(CINE.steps.shift());
  cineEnd();
}
function cineEnd() {
  if (GS.state !== 'cine') return;
  if (CINE.onEnd) CINE.onEnd();
  CINE.onTick = CINE.onEnd = null;
  GS.state = CINE.prev === 'cine' ? 'play' : CINE.prev || 'play';
  cam.cine = null;
  if (CINE.boss) {
    CINE.boss.cine = null;
    CINE.boss.t0 = GS.time; // its clock (and its par) starts when the fight does
    CINE.boss.emerge = Math.max(CINE.boss.emerge, 0.6);
    CINE.boss.rev = Math.max(CINE.boss.rev ?? 1, 0.7);
  }
  GS.meta.bossSeen = GS.meta.bossSeen || {};
  if (!GS.meta.bossSeen[CINE.key]) {
    GS.meta.bossSeen[CINE.key] = 1;
    saveMeta();
  }
  document.body.classList.remove('cine');
  const c = $('cineCard');
  if (c) setTimeout(() => c.classList.remove('show'), 900); // the name stays a moment as the camera comes back
  GS.P.inv = Math.max(GS.P.inv, 0.6);
}

// any key, click or pad button skips; it doesn't reach the game (no shot fired, no pause opened)
let padWas = false;
function skipKey(ev) {
  if (GS.state !== 'cine' || ev.repeat || CINE.age < 0.3) return; // a key held from before (moving) doesn't skip it
  ev.preventDefault();
  ev.stopImmediatePropagation();
  cineSkip();
}
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', skipKey, true);
  window.addEventListener('mousedown', skipKey, true);
}
function padDown() {
  const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p) for (const b of p.buttons) if (b.pressed) return true;
  return false;
}
export function cinePad() {
  if (GS.state !== 'cine') return;
  const down = padDown();
  if (down && !padWas && CINE.age >= 0.3) cineSkip(); // a button held from before (the trigger) doesn't skip it
  padWas = down;
}
