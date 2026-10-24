/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const TUT = [
  { k: 'move', kbm: 'Move with W A S D' },
  { k: 'shoot', kbm: 'Aim with the mouse · hold left click to fire' },
  { k: 'roll', kbm: 'Runners · roll with Space or right-click, through them, not into a wall' },
  { k: 'reload', kbm: 'Press R to reload before you run dry' },
  { k: 'case', kbm: 'A weapon case is coming down · walk onto it and take a gun' },
  { k: 'swap', kbm: 'Swap guns with 1–9 or the mouse wheel · tap Q for the last one' },
];
function tutWanted() {
  return (
    !RUN.practice &&
    !RUN.endless &&
    wave === 1 &&
    (meta.tutForce || (!meta.tutDone && ((meta.stats && meta.stats.maxNight) || 0) < 2))
  );
}
function tutStart() {
  RUN.tut = { i: -1, q: queue, mv: 0, lx: P.x, ly: P.y, list: [] };
  queue = [];
  tutNext();
}
function tutSpawn(n, run, d0 = 270) {
  const T = RUN.tut;
  for (let k = 0; k < n; k++)
    later.push({
      t: k * (run ? 0.15 : 1.1),
      fn: () => {
        if (!RUN.tut || state !== 'play') return;
        let x = P.x,
          y = P.y;
        const base = T.side ?? (T.side = rand(0, TAU));
        for (let j = 0; j < 24; j++) {
          const a = base + (run ? rand(-0.3, 0.3) : rand(-1.2, 1.2)),
            r = d0 + rand(-20, 40);
          x = P.x + Math.cos(a) * r;
          y = P.y + Math.sin(a) * r;
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
  const T = RUN.tut;
  if (!T) return;
  T.i++;
  T.t = 0;
  T.side = undefined;
  T.list = [];
  if (T.i >= TUT.length) return tutEnd(false);
  const st = TUT[T.i].k;
  if (st === 'shoot') tutSpawn(3, false);
  if (st === 'roll') {
    T.r0 = (RUN.metrics && RUN.metrics.rolls) || 0;
    tutSpawn(3, true, 320);
  }
  if (st === 'reload') {
    const g = P.gun;
    T.rl = false;
    if (P.mag[g] >= magSize(g)) P.mag[g] = Math.max(1, Math.floor(magSize(g) / 3));
  }
  if (st === 'case') {
    const gs = nextGuns();
    if (gs.length) {
      dropCrate(gs[0], gs[1]);
      RUN.tutCase = true;
    } else return tutNext();
  }
  if (st === 'swap') {
    T.g0 = P.gun;
    if (P.owned.length < 2) return tutNext();
  }
  tutHint();
}
function tutHint() {
  const T = RUN.tut;
  if (!T || T.i < 0 || T.i >= TUT.length) return;
  const h = $('hint');
  h.innerHTML = `<b>Training ${T.i + 1}/${TUT.length}</b>${TUT[T.i].kbm} · Enter skips`;
  h.classList.add('show', 'tut');
  clearTimeout(hintTO);
}
function tutEnd(skipped) {
  const T = RUN.tut;
  if (!T) return;
  RUN.tut = null;
  meta.tutDone = true;
  meta.tutForce = false;
  saveMeta();
  queue = T.q.concat(queue);
  spawnT = 1.4;
  $('hint').classList.remove('show', 'tut');
  updateHint();
  showStreak(skipped ? 'Training skipped' : 'Training done', 'Night 1 starts now · hold till dawn');
  radio(
    skipped
      ? 'Copy, nine. You know the drill. Hold till dawn.'
      : 'That is the drill, nine. The rest of them heard the shooting. Hold till dawn.'
  );
}
function tutTick(dt) {
  const T = RUN.tut;
  if (!T || T.i < 0) return;
  T.t += dt;
  if (!$('hint').classList.contains('show')) tutHint();
  const st = TUT[T.i].k,
    alive = T.list.filter(e => !e.dead).length,
    spawned = T.list.length;
  if (st === 'move') {
    T.mv += Math.hypot(P.x - T.lx, P.y - T.ly);
    T.lx = P.x;
    T.ly = P.y;
    if (T.mv > 240 || T.t > 25) tutNext();
  } else if (st === 'shoot') {
    if ((spawned >= 3 && !alive) || T.t > 45) tutNext();
  } else if (st === 'roll') {
    const rolled = ((RUN.metrics && RUN.metrics.rolls) || 0) > T.r0;
    if ((rolled && spawned >= 3 && !alive) || T.t > 40) {
      if (!rolled && T.t <= 40) return;
      tutNext();
    }
  } else if (st === 'reload') {
    if (P.reload > 0) T.rl = true;
    if ((T.rl && !(P.reload > 0)) || T.t > 25) tutNext();
  } else if (st === 'case') {
    if (P.owned.length > 1 || T.t > 60) tutNext();
  } else if (st === 'swap') {
    if (P.gun !== T.g0 || T.t > 25) tutNext();
  }
}
// ---- a night comes in surges: two lulls where the street goes quiet, and on some nights the last surge is a set piece
