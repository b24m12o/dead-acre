/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Test helpers, run inside the game's scope (through window.__eval) once its menu is up. Only tests use these.
window.__god = () => { GS.P.inv = 1e9; };
function autoTarget(range) {
  let best = null,
    bd = range * range;
  query(GS.P.x, GS.P.y, range, e => {
    if (e.dead || e.emerge < 1 || e.lurk === 'lie') return;
    const dd = d2(GS.P.x, GS.P.y, e.x, e.y);
    if (dd < bd && los(GS.P.x, GS.P.y, e.x, e.y)) {
      bd = dd;
      best = e;
    }
  });
  return best;
}
window.__autoTarget = window.autoTarget = autoTarget;
