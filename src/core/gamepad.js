/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A gamepad plays the whole game. Left stick moves, right stick aims (the crosshair rides out from you along it,
// and leans a little onto whoever stands nearest that line), the right trigger fires. Every screen that isn't the
// fight (menus, cards, the route, supplies, settings) is walked with the stick or D-pad: A takes what is in focus,
// B goes back. The pad takes over the moment it is touched and gives way the moment the mouse or keyboard is; the
// hints on screen name whichever is in use. Nothing here is a second way of doing things: the pad points the same
// cursor the mouse points and calls the same actions the keys call.
import { GS } from './gs.js';
import { angDiff, clamp } from './util.js';
import { mouse } from './input.js';
import { ZOOM } from '../render/sprites.js';
import { los } from '../world/nav.js';
import { WHEEL, cam, cycleGun, startReload, wheelCentre, wheelRelease } from '../game/state.js';
import { doReroll, openLevel, pickLater } from '../game/upgrades.js';
import { tryDash, tryShove, useAbility } from '../game/abilities.js';
import { setPause } from '../ui/screens.js';
import { cycleTrap, trapDown } from '../game/traps.js';
import { updateHint } from '../ui/settings-ui.js';

export const PAD = {
  dead: 0.22, // stick travel ignored, left
  deadAim: 0.3, // and right: a resting thumb doesn't aim
  near: 150, // px on screen from you to the crosshair with the stick barely over,
  far: 280, // and with it hard over
  assist: (9 * Math.PI) / 180, // the crosshair leans onto a zombie within this of the stick's line,
  assistR: 620, // this near, and in plain sight
  first: 0.34, // seconds a held direction waits before it repeats on a screen,
  again: 0.13, // and between repeats
};
GS.pad = { on: false, mx: 0, my: 0, aimA: 0, aimM: 0.6, idle: 0, rumble: 0 };
const B = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  BACK: 8,
  START: 9,
  UP: 12,
  DOWN: 13,
  LEFT: 14,
  RIGHT: 15,
};
let prev = [],
  navT = 0,
  navDir = null,
  lastState = '';

const pad = () => {
  const l = (typeof navigator !== 'undefined' && navigator.getGamepads && navigator.getGamepads()) || [];
  for (const g of l) if (g && g.connected && g.mapping === 'standard') return g;
  return null;
};
// a stick as a direction and how far over it is, 0 to 1 past the dead zone
function stick(x, y, dead) {
  const m = Math.hypot(x, y);
  if (m <= dead) return [0, 0, 0];
  const k = clamp((m - dead) / (1 - dead), 0, 1);
  return [x / m, y / m, k];
}
function setOn(on) {
  if (GS.pad.on === on) return;
  GS.pad.on = on;
  if (!on) {
    GS.pad.mx = GS.pad.my = 0;
    mouse.down = false;
    if (WHEEL.held === 'pad') wheelRelease();
  }
  if (typeof document !== 'undefined') document.body.classList.toggle('pad', on);
  updateHint();
}
const key = (code, k) =>
  window.dispatchEvent(new KeyboardEvent('keydown', { code, key: k, bubbles: true, cancelable: true }));

/* ---- screens: walk whatever can be pressed ---- */
const SEL = 'button, .card, .way, .fork, a[href], input, select, [tabindex]:not([tabindex="-1"])';
function pressable() {
  const out = [];
  for (const el of document.querySelectorAll(SEL)) {
    if (el.disabled || el.hidden || el.getAttribute('aria-hidden') === 'true') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const cx = clamp(r.left + r.width / 2, 1, innerWidth - 2),
      cy = clamp(r.top + r.height / 2, 1, innerHeight - 2),
      top = document.elementFromPoint(cx, cy);
    const off = r.bottom < 0 || r.top > innerHeight; // scrolled out of a long panel: still reachable, focus brings it in
    if (!off && !(top && (el.contains(top) || top.contains(el)))) continue; // under another screen (its own parent on top is a card not yet armed, or a label)
    if (off && !scrollsWith(el)) continue;
    out.push([el, r]);
  }
  return out;
}
// off screen, but inside the panel that is on top (so not a button of some screen behind it)
function scrollsWith(el) {
  const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
  for (let p = el.parentElement; p; p = p.parentElement)
    if (p.scrollHeight > p.clientHeight + 4 && top && p.contains(top)) return true;
  return false;
}
function focusFirst() {
  const l = pressable();
  if (!l.length) return null;
  const want = l.find(([el]) => el.classList.contains('primary') || el.classList.contains('sel')) || l[0];
  want[0].focus({ preventScroll: false });
  return want[0];
}
function nav(dx, dy) {
  const l = pressable(),
    cur = document.activeElement,
    here = l.find(([el]) => el === cur);
  if (!here) return focusFirst();
  if (cur.tagName === 'INPUT' && cur.type === 'range' && dx) {
    const st = +cur.step || 1;
    cur.value = clamp(+cur.value + dx * st, +cur.min || 0, +cur.max || 100);
    cur.dispatchEvent(new Event('input', { bubbles: true }));
    cur.dispatchEvent(new Event('change', { bubbles: true }));
    return cur;
  } // a slider: left and right move it
  const r0 = here[1],
    x0 = r0.left + r0.width / 2,
    y0 = r0.top + r0.height / 2;
  let best = null,
    bs = 1e9;
  for (const [el, r] of l) {
    if (el === cur) continue;
    const ex = clamp(x0, r.left, r.right) - x0 || (dx ? r.left + r.width / 2 - x0 : 0),
      ey = clamp(y0, r.top, r.bottom) - y0 || (dy ? r.top + r.height / 2 - y0 : 0),
      along = ex * dx + ey * dy,
      across = Math.abs(ex * dy) + Math.abs(ey * dx);
    if (along < 6) continue;
    const s = along + across * 2.4;
    if (s < bs) {
      bs = s;
      best = el;
    }
  }
  if (best) best.focus({ preventScroll: false });
  return best;
}
function screens(g, dn, dt) {
  const [lx, ly, lk] = stick(g.axes[0] || 0, g.axes[1] || 0, 0.5),
    b = i => !!(g.buttons[i] && g.buttons[i].pressed);
  let d = null;
  if (b(B.UP) || (lk && ly < -0.7)) d = [0, -1];
  else if (b(B.DOWN) || (lk && ly > 0.7)) d = [0, 1];
  else if (b(B.LEFT) || (lk && lx < -0.7)) d = [-1, 0];
  else if (b(B.RIGHT) || (lk && lx > 0.7)) d = [1, 0];
  if (!d) navDir = null;
  else if (!navDir || navDir[0] !== d[0] || navDir[1] !== d[1]) {
    navDir = d;
    navT = PAD.first;
    nav(d[0], d[1]);
  } else if ((navT -= dt) <= 0) {
    navT = PAD.again;
    nav(d[0], d[1]);
  }
  if (dn(B.A)) {
    const cur = document.activeElement,
      ok = cur && cur !== document.body && pressable().some(([el]) => el === cur);
    if (!ok) focusFirst();
    else if (cur.tagName === 'SELECT') {
      cur.selectedIndex = (cur.selectedIndex + 1) % cur.options.length;
      cur.dispatchEvent(new Event('change', { bubbles: true }));
    } else cur.click();
  }
  if (GS.state === 'levelup') {
    if (dn(B.X)) doReroll();
    if (dn(B.B)) pickLater();
  } else if (dn(B.B) || (dn(B.START) && GS.state === 'pause')) key('Escape', 'Escape');
  else if (dn(B.START) && (GS.state === 'over' || GS.state === 'won')) key('Enter', 'Enter');
}

/* ---- the fight ---- */
function fight(g, dn, up, dt) {
  const P = GS.P,
    Pd = GS.pad,
    b = i => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.45));
  const [lx, ly, lk] = stick(g.axes[0] || 0, g.axes[1] || 0, PAD.dead),
    [rx, ry, rk] = stick(g.axes[2] || 0, g.axes[3] || 0, PAD.deadAim);
  Pd.mx = lx * lk;
  Pd.my = ly * lk;
  if (rk > 0) {
    Pd.aimA = Math.atan2(ry, rx);
    Pd.aimM = rk;
    Pd.idle = 0;
  } else if ((Pd.idle += dt) > 0.7 && lk > 0.3 && !b(B.RT)) {
    Pd.aimA += angDiff(Pd.aimA, Math.atan2(ly, lx)) * Math.min(1, dt * 8); // thumb off the stick and not shooting: you look where you walk
    Pd.aimM = 0.5;
  }
  if (WHEEL.open) {
    const c = wheelCentre(); // the wheel is open: the stick points at a slot
    mouse.x = c[0] + (rk > 0 ? rx : 0) * 120 * c[2];
    mouse.y = c[1] + (rk > 0 ? ry : 0) * 120 * c[2];
  } else {
    // the crosshair: out along the stick from you, onto the nearest of them close to that line
    let wx = P.x + (Math.cos(Pd.aimA) * (PAD.near + (PAD.far - PAD.near) * Pd.aimM)) / ZOOM,
      wy = P.y + (Math.sin(Pd.aimA) * (PAD.near + (PAD.far - PAD.near) * Pd.aimM)) / ZOOM;
    if (!P.ride) {
      let best = null,
        ba = PAD.assist;
      for (const e of GS.enemies) {
        if (e.dead || !(e.emerge >= 1)) continue;
        const dx = e.x - P.x,
          dy = e.y - P.y,
          d = Math.hypot(dx, dy);
        if (d > PAD.assistR || d < 20) continue;
        const a = Math.abs(angDiff(Pd.aimA, Math.atan2(dy, dx))) + d / 9000; // of two on the line, the nearer
        if (a < ba) {
          ba = a;
          best = e;
        }
      }
      if (best && los(P.x, P.y, best.x, best.y)) {
        wx = best.x;
        wy = best.y;
      }
    }
    mouse.x = (wx - cam.x) * ZOOM;
    mouse.y = (wy - cam.y) * ZOOM;
  }
  mouse.seen = true;
  mouse.down = b(B.RT) && !WHEEL.open;
  if (dn(B.START)) setPause(true);
  if (P.ride) return; // on the truck, in the chopper's door: the gun is all you have
  if (dn(B.A)) tryDash();
  if (dn(B.B)) tryShove();
  if (dn(B.X)) startReload();
  if (dn(B.Y)) useAbility();
  if (dn(B.RB)) cycleGun(1);
  if (dn(B.LB)) {
    WHEEL.downT = performance.now();
    WHEEL.held = 'pad';
  }
  if (up(B.LB) && WHEEL.held === 'pad') wheelRelease(); // a tap: the last gun. Held: the wheel, the right stick picks
  if (dn(B.LT)) trapDown();
  if (dn(B.RIGHT) || dn(B.LEFT)) cycleTrap();
  if (dn(B.UP)) openLevel();
  if (dn(B.BACK)) key('Enter', 'Enter'); // start the night now, call the horde, skip the lesson
}

// once a frame, before the world moves
export function padTick(dt) {
  const g = pad();
  if (!g) {
    if (GS.pad.on) setOn(false);
    prev = [];
    return;
  }
  const now = g.buttons.map(b => !!(b && (b.pressed || b.value > 0.45))),
    dn = i => now[i] && !prev[i],
    up = i => !now[i] && prev[i];
  if (GS.pad.kick) {
    GS.pad.kick = false;
    setOn(false);
  } // the mouse or the keyboard was used: the pad lets go, until it is touched again
  const touched =
    now.some((v, i) => v && !prev[i]) ||
    Math.hypot(g.axes[0] || 0, g.axes[1] || 0) > 0.5 ||
    Math.hypot(g.axes[2] || 0, g.axes[3] || 0) > 0.5;
  if (touched && !GS.pad.on) setOn(true);
  if (GS.pad.on) {
    if (GS.state === 'play' && GS.P) fight(g, dn, up, dt);
    else {
      GS.pad.mx = GS.pad.my = 0;
      mouse.down = false;
      if (lastState !== GS.state) navDir = null;
      screens(g, dn, dt);
    }
    if (GS.pad.rumble > 0) {
      const v = clamp(GS.pad.rumble * 2.4, 0, 1);
      GS.pad.rumble = 0;
      try {
        if (g.vibrationActuator && g.vibrationActuator.playEffect)
          g.vibrationActuator
            .playEffect('dual-rumble', { duration: 90 + 160 * v, strongMagnitude: v, weakMagnitude: v * 0.6 })
            .catch(() => {});
      } catch (e) {
        /* a pad with no motors */
      }
    }
  }
  lastState = GS.state;
  prev = now;
}
