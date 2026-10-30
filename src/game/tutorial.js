/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, rand } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { nextGuns } from './arsenal.js';
import { sfx } from '../audio/sfx.js';
import { magSize } from './state.js';
import { showStreak } from '../ui/callouts.js';
import { makeEnemy } from '../actors/enemies.js';
import { dust } from '../render/effects.js';
import { dropCrate } from './combat.js';
import { updateHint } from '../ui/settings-ui.js';
import { radio } from '../audio/radio.js';
import { freeAround } from './boss-flow.js';
import { AB } from './abilities.js';
const TUT = [
  { k: 'move', kbm: 'Move with W A S D' },
  { k: 'shoot', kbm: 'Aim with the mouse · hold left click to fire' },
  { k: 'roll', kbm: 'Runners · roll with Space or right-click, through them, not into a wall' },
  { k: 'reload', kbm: 'Press R to reload before you run dry' },
  { k: 'case', kbm: 'A weapon case is coming down · walk onto it and take a gun' },
  { k: 'swap', kbm: 'Swap guns with 1–9 or the mouse wheel · tap Q for the last one' },
  { k: 'ability', kbm: () => `Press E · ${AB().name} · it recharges, so use it whenever they bunch up` },
];
export function tutWanted() {
  return (
    !GS.RUN.practice &&
    !GS.RUN.endless &&
    GS.wave === 1 &&
    (GS.meta.tutForce || (!GS.meta.tutDone && ((GS.meta.stats && GS.meta.stats.maxNight) || 0) < 2))
  );
}
export function tutStart() {
  GS.RUN.tut = { i: -1, q: GS.queue, mv: 0, lx: GS.P.x, ly: GS.P.y, list: [], t: 0 };
  GS.queue = [];
} // training starts once the convoy's first call has been heard (tutTick)
function tutSpawn(n, run, d0 = 270) {
  const T = GS.RUN.tut;
  for (let k = 0; k < n; k++)
    GS.later.push({
      t: k * (run ? 0.15 : 1.1),
      fn: () => {
        if (!GS.RUN.tut || GS.state !== 'play') return;
        let x = GS.P.x,
          y = GS.P.y;
        const base = T.side ?? (T.side = rand(0, TAU));
        for (let j = 0; j < 24; j++) {
          const a = base + (run ? rand(-0.3, 0.3) : rand(-1.2, 1.2)),
            r = d0 + rand(-20, 40);
          x = GS.P.x + Math.cos(a) * r;
          y = GS.P.y + Math.sin(a) * r;
          if (freeAround(x, y, 18)) break;
        }
        const e = makeEnemy('skitter', x, y);
        e.aw = 9;
        if (run) {
          e.run = true;
          e.sp *= 2.05;
        } else e.sp *= 0.8;
        T.list.push(e);
        dust(x, y, 7, 50, 1, 1);
        sfx.dig(x, y);
      },
    });
}
function tutNext() {
  const T = GS.RUN.tut;
  if (!T) return;
  T.i++;
  T.t = 0;
  T.side = undefined;
  T.list = [];
  if (T.i >= TUT.length) return tutEnd(false);
  const st = TUT[T.i].k;
  if (st === 'shoot') tutSpawn(3, false);
  if (st === 'roll') {
    T.r0 = (GS.RUN.metrics && GS.RUN.metrics.rolls) || 0;
    tutSpawn(3, true, 320);
  }
  if (st === 'reload') {
    const g = GS.P.gun;
    T.rl = false;
    if (GS.P.mag[g] >= magSize(g)) GS.P.mag[g] = Math.max(1, Math.floor(magSize(g) / 3));
  }
  if (st === 'case') {
    const gs = nextGuns();
    if (gs.length) {
      dropCrate(gs[0], gs[1]);
      GS.RUN.tutCase = true;
    } else return tutNext();
  }
  if (st === 'swap') {
    T.g0 = GS.P.gun;
    if (GS.P.owned.length < 2) return tutNext();
  }
  if (st === 'ability') {
    T.ab0 = (GS.RUN.metrics && GS.RUN.metrics.abilities) || 0;
    T.abOk = true;
    GS.P.abT = 0;
    tutSpawn(4, false, 300);
  }
  tutHint();
}
export function tutHint() {
  const T = GS.RUN.tut;
  if (!T || T.i < 0 || T.i >= TUT.length) return;
  const h = $('hint');
  const k = TUT[T.i].kbm;
  h.innerHTML = `<b>Training ${T.i + 1}/${TUT.length}</b>${typeof k === 'function' ? k() : k} · Enter skips`;
  h.classList.add('show', 'tut');
  clearTimeout(GS.hintTO);
}
export function tutEnd(skipped) {
  const T = GS.RUN.tut;
  if (!T) return;
  GS.RUN.tut = null;
  GS.meta.tutDone = true;
  GS.meta.tutForce = false;
  saveMeta();
  GS.queue = T.q.concat(GS.queue);
  GS.spawnT = 1.4;
  $('hint').classList.remove('show', 'tut');
  updateHint();
  showStreak(skipped ? 'Training skipped' : 'Training done', 'Night 1 starts now · hold till dawn');
  radio(
    skipped
      ? 'Copy, nine. You know the drill. Hold till dawn.'
      : 'That is the drill, nine. The rest of them heard the shooting. Hold till dawn.'
  );
}
export function tutTick(dt) {
  const T = GS.RUN.tut;
  if (!T) return;
  if (T.i < 0) {
    T.t += dt;
    if ((T.t > 1.5 && !GS.radioQ.length && !(GS.radioT > 0)) || T.t > 16) tutNext();
    return;
  } // first the convoy's call: who is out there, and what they want you to do
  T.t += dt;
  if (!$('hint').classList.contains('show')) tutHint();
  const st = TUT[T.i].k,
    alive = T.list.filter(e => !e.dead).length,
    spawned = T.list.length;
  if (st === 'move') {
    T.mv += Math.hypot(GS.P.x - T.lx, GS.P.y - T.ly);
    T.lx = GS.P.x;
    T.ly = GS.P.y;
    if (T.mv > 240 || T.t > 25) tutNext();
  } else if (st === 'shoot') {
    if ((spawned >= 3 && !alive) || T.t > 45) tutNext();
  } else if (st === 'roll') {
    const rolled = ((GS.RUN.metrics && GS.RUN.metrics.rolls) || 0) > T.r0;
    if (rolled && spawned >= 3 && !alive) tutNext();
    else if (!rolled && spawned >= 3 && !alive && (T.again || 0) < 2) {
      T.again = (T.again || 0) + 1;
      T.list = [];
      tutSpawn(3, true, 320);
    } // they're down but you never rolled: more runners, so there is something to roll through
    else if (T.t > 55 || (spawned >= 3 && !alive)) tutNext();
  } else if (st === 'reload') {
    if (GS.P.reload > 0) T.rl = true;
    if ((T.rl && !(GS.P.reload > 0)) || T.t > 25) tutNext();
  } else if (st === 'case') {
    if (GS.P.owned.length > 1 || T.t > 60) tutNext();
  } else if (st === 'swap') {
    if (GS.P.gun !== T.g0 || T.t > 25) tutNext();
  } else if (st === 'ability') {
    if (((GS.RUN.metrics && GS.RUN.metrics.abilities) || 0) > T.ab0 || T.t > 30) tutNext();
  }
}
// ---- a night comes in surges: two lulls where the street goes quiet, and on some nights the last surge is a set piece
