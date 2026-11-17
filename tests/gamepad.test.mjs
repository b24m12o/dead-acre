/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// A gamepad plays the game: the left stick moves, the right stick aims (and the crosshair leans onto a zombie near
// its line), the trigger fires, the face buttons roll, shove, reload; Start pauses and resumes; the level-up cards
// are walked with the D-pad and taken with A; the hints name the pad's buttons while it is in use, and a real key
// hands the game back to the keyboard.
import { openGame, check } from './lib/harness.mjs';

export const name = 'gamepad: move, aim, fire, the buttons, the cards, and giving way to the keyboard';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  const o = await ev(`(() => {
    const out = {};
    const g = { connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    Object.defineProperty(navigator, 'getGamepads', { value: () => [g], configurable: true });
    window.__g = g;
    const BT = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
    const hold = (n, on = true) => { g.buttons[BT[n]] = { pressed: on, value: on ? 1 : 0 }; };
    const fr = n => { for (let i = 0; i < n; i++) { padTick(1 / 60); if (GS.state === 'play') { update(1 / 60); tickWorld(1 / 60); updateCamera(1 / 60); } } };
    const tap = n => { hold(n); fr(1); hold(n, false); fr(1); };
    initAudio(); GS.meta.tutDone = true; GS.meta.hero = 'ranger'; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    const P = GS.P;
    // open ground
    let spot = null;
    for (let t = 0; t < 20000 && !spot; t++) {
      const x = 500 + Math.random() * (WW - 1000), y = 500 + Math.random() * (WH - 1000);
      let ok = true;
      for (let dx = -160; dx <= 400 && ok; dx += 40) for (let dy = -160; dy <= 160 && ok; dy += 40) if (grid[Math.floor((y + dy) / TILE) * MW + Math.floor((x + dx) / TILE)]) ok = false;
      // and a clear look at where the test stands its zombies (a fence or a wreck is not in the grid, and hides one from the crosshair)
      for (const [ang, far] of [[0.1, 300], [0.5, 300], [0, 200]]) if (ok && (!los(x, y, x + Math.cos(ang) * far, y + Math.sin(ang) * far) || !los(x + 160, y, x + 160 + Math.cos(ang) * far, y + Math.sin(ang) * far))) ok = false;
      if (ok) spot = [x, y];
    }
    if (spot) { P.x = spot[0]; P.y = spot[1]; }
    fr(5);
    out.offAtFirst = GS.pad.on;
    // the left stick moves
    const x0 = P.x; g.axes[0] = 1; fr(40); g.axes[0] = 0;
    out.moved = P.x - x0; out.on = GS.pad.on; out.cls = document.body.classList.contains('pad');
    out.hint = $('hint').textContent;
    fr(30);
    // the right stick aims
    g.axes[3] = -1; fr(20); out.aimUp = angDiff(0, P.aimA); g.axes[3] = 0; g.axes[2] = 1; fr(20); out.aimRight = angDiff(0, P.aimA); // an angle, however many turns round
    // the crosshair leans onto one near the line
    const e = makeEnemy('skitter', P.x + Math.cos(0.1) * 300, P.y + Math.sin(0.1) * 300); e.emerge = 1; e.hp = e.maxHp = 9999; e.aw = 0; e.sp = 0; GS.enemies.push(e);
    fr(3); padTick(1 / 60); // read against the camera as it stands now (a shake can move it after the stick has aimed)
    out.lean = Math.hypot(cam.x + mouse.x / ZOOM - e.x, cam.y + mouse.y / ZOOM - e.y);
    e.x = P.x + Math.cos(0.5) * 300; e.y = P.y + Math.sin(0.5) * 300; fr(3); padTick(1 / 60);
    out.noLean = Math.hypot(cam.x + mouse.x / ZOOM - e.x, cam.y + mouse.y / ZOOM - e.y);
    e.dead = true; GS.enemies.length = 0;
    // the trigger fires, X reloads, A rolls, B shoves
    const m0 = P.mag[P.gun]; hold('RT'); fr(30); hold('RT', false); fr(2);
    out.fired = m0 - P.mag[P.gun]; out.heldFire = mouse.down;
    tap('X'); out.reload = P.reload > 0;
    g.axes[2] = 0; fr(30);
    tap('A'); out.roll = P.dashT > 0 || P.dashCd > 0;
    fr(60);
    tap('B'); out.shove = (P.shoveCd || 0) > 0;
    // Start pauses, and resumes
    tap('START'); out.paused = GS.state; out.pauseHint = $('pauseHint').textContent;
    tap('START'); out.resumed = GS.state;
    // the cards: the D-pad walks them, A takes one
    offerUpgrades('level'); out.cardsState = GS.state;
    const lv0 = JSON.stringify(LV);
    tap('RIGHT'); out.focus1 = document.activeElement && document.activeElement.className;
    tap('RIGHT'); const second = document.activeElement;
    out.focus2 = [...document.querySelectorAll('#cards .card')].indexOf(second);
    out.luKeys = $('luKeys').textContent;
    { const t = performance.now(); while (performance.now() - t < 700); } // the cards arm a moment after they open
    tap('A'); out.took = JSON.stringify(LV) !== lv0 || GS.state !== 'levelup';
    return out;
  })()`);
  // a real key hands the game back
  await pg.keyboard.press('KeyR');
  const k = await ev(
    `(() => { padTick(1 / 60); const a = GS.pad.on, h = $('hint').textContent; window.__g.axes[0] = 1; padTick(1 / 60); return { off: !a, hint: h, backOn: GS.pad.on }; })()`
  );
  await pg.close();
  check(!o.offAtFirst, 'a pad nobody has touched should not take over');
  check(
    o.moved > 60 && o.on && o.cls,
    `the left stick should walk you right and switch the game to the pad: ${Math.round(o.moved)} px, on ${o.on}`
  );
  check(/Left stick move/.test(o.hint) && /RT fire/.test(o.hint), 'the hint line should name the pad: ' + o.hint);
  check(
    Math.abs(o.aimUp + Math.PI / 2) < 0.2 && Math.abs(o.aimRight) < 0.2,
    `the right stick should aim: up ${o.aimUp.toFixed(2)}, right ${o.aimRight.toFixed(2)}`
  );
  check(
    o.lean < 6 && o.noLean > 80,
    `the crosshair should lean onto one near the line and not one far off it: ${o.lean.toFixed(0)} px / ${o.noLean.toFixed(0)} px`
  );
  check(o.fired > 0 && !o.heldFire, `the trigger should fire, and stop when let go: ${o.fired} rounds`);
  check(o.reload && o.roll && o.shove, `X reloads, A rolls, B shoves: ${o.reload} ${o.roll} ${o.shove}`);
  check(
    o.paused === 'pause' && o.resumed === 'play' && /Start resume/.test(o.pauseHint),
    `Start should pause and resume: ${o.paused}, ${o.resumed}`
  );
  check(
    o.cardsState === 'levelup' && /card/.test(o.focus1 || '') && o.focus2 >= 1,
    `the D-pad should walk the cards: ${o.focus1}, card ${o.focus2}`
  );
  check(/A picks/.test(o.luKeys) && o.took, `A should take the card in focus: "${o.luKeys}", took ${o.took}`);
  check(
    k.off && !/Left stick/.test(k.hint) && k.backOn,
    `a real key should hand the game back to the keyboard, and the pad take it again when touched: ${JSON.stringify(k)}`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `walked ${Math.round(o.moved)} px, crosshair ${o.lean.toFixed(0)} px off its target, ${o.fired} rounds on the trigger`;
}
