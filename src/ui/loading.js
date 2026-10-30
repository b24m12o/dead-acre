/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The loading screen, and the wait for the sounds at the menu. The 3D art has to be in before the menu shows, so the
// screen fills a bar as it downloads, then while the town is painted. The gun sounds, the radio voices and the band
// keep coming in behind the menu, and the Start buttons wait for them: a night never starts on the stand-in sounds
// and swaps them mid-fight. Twenty seconds after the menu comes up they stop waiting, and whatever has not arrived
// fills in when it does.
import { $ } from '../core/errors.js';
import { soundProgress } from '../core/assets.js';
import { keysIn } from '../core/binds.js';

const TIPS = [
  'Gunfire carries. Every shot tells the dead where you are.',
  'A car alarm draws them too. Set one off and let it do the shouting.',
  'Riot shields stop rounds from the front. Get round it, blow it up, or flash it.',
  'Every fifth night something bigger comes for the relay.',
  'The convoy airdrops heavier guns as the nights go on.',
  'Hold {wheel} for the gun wheel. Tap {wheel} for your last gun.',
  'Hit a runner hard in full stride and it can go down on its face.',
  'Roll through a gap with {roll}, Shift or right-click. Never into a corner.',
  'Barrels go up when you shoot them. Wait for a crowd.',
];
const WAIT_MAX = 20000; // ms at the menu before Start stops waiting for the sounds
const BTNS = ['startBtn', 'againBtn'];
let tipI = 0,
  tipTimer = 0,
  shownT = 0,
  given = false;
const mb = b => (b / 1048576).toFixed(1);

// the loading screen's line and bar (frac 0..1)
export function loadStep(text, frac) {
  const s = $('ldStat'),
    f = $('ldFill');
  if (s) s.textContent = text;
  if (f && frac != null) f.style.transform = `scaleX(${Math.max(0, Math.min(1, frac)).toFixed(3)})`;
}
// gives the browser a moment to draw the screen before a long piece of work
export const breathe = () => new Promise(r => setTimeout(r, 30));

// true while a run should not start yet; it also nudges the line that says why
export function soundWait() {
  if (given || !soundProgress().pend) return false;
  for (const id of ['loadSnd', 'loadSnd2', 'loadSnd3']) {
    const l = $(id);
    if (!l) continue;
    l.classList.remove('nudge');
    void l.offsetWidth;
    l.classList.add('nudge');
  }
  return true;
}
// once the menu is up: keep the Start buttons and the menu's line up to date until the sounds are in
export function watchSounds() {
  clearInterval(tipTimer);
  if (!soundProgress().pend) return;
  shownT = performance.now();
  const tick = () => {
    const p = soundProgress();
    if (performance.now() - shownT > WAIT_MAX) given = true;
    const wait = p.pend && !given,
      pct = p.size ? Math.floor((p.got / p.size) * 100) : 0,
      txt = `Sound still coming in · ${pct}% · ${mb(p.got)} of ${mb(p.size)} MB. Start waits for it, so the guns, radio and music don’t change mid-fight.`;
    for (const id of ['loadSnd', 'loadSnd2', 'loadSnd3']) {
      const l = $(id);
      if (!l) continue;
      l.hidden = !wait;
      l.textContent = txt;
    } // on the main menu, and under the Start button
    for (const id of BTNS) {
      const b = $(id);
      if (!b) continue;
      if (wait) {
        if (b.dataset.lbl == null) b.dataset.lbl = b.textContent;
        b.disabled = true;
        b.classList.add('waiting');
        b.textContent = `Loading sound ${pct}%`;
      } else if (b.dataset.lbl != null) {
        b.textContent = b.dataset.lbl;
        delete b.dataset.lbl;
        b.disabled = false;
        b.classList.remove('waiting');
      }
    }
    if (wait) setTimeout(tick, 200);
  };
  tick();
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  tipI = Math.floor(Math.random() * TIPS.length);
  const show = () => {
    const t = $('ldTip');
    if (!t) return;
    t.classList.remove('in');
    void t.offsetWidth;
    t.textContent = keysIn(TIPS[tipI++ % TIPS.length]);
    t.classList.add('in');
  };
  show();
  tipTimer = setInterval(show, 4500);
}
