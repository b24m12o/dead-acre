/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Test hooks, put into a copy of the game (build/test.html) just before it starts. Only tests use these.
window.__eval = c => eval(c);
window.__god = () => { P.inv = 1e9; };
function autoTarget(range) {
  let best = null,
    bd = range * range;
  query(P.x, P.y, range, e => {
    if (e.dead || e.emerge < 1 || e.lurk === 'lie') return;
    const dd = d2(P.x, P.y, e.x, e.y);
    if (dd < bd && los(P.x, P.y, e.x, e.y)) {
      bd = dd;
      best = e;
    }
  });
  return best;
}
window.__autoTarget = autoTarget;
