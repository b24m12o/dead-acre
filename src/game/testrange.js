/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The Test Range (Settings › Practice): any night, any kind of night, any character and district, straight away, with
// every gun and invulnerable if you like, and nothing saved: no run checkpoint, no scrap, no records, no challenge
// progress. Your profile is put back as it was the moment you leave. In the run, K clears the night (the dead drop,
// the queue empties) so you can step on to the next one. A sound board plays every gun's shot and reload on demand.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { pick } from '../core/util.js';
import { AMMO_MAX, GUNS, GUN_ORDER, HEROES } from './arsenal.js';
import { LV, S, ammoMax, equip, magSize } from './state.js';
import { need } from './run.js';
import { EVOS, renderMods, upgradePool } from './upgrades.js';
import { hideCallouts, showStreak } from '../ui/callouts.js';
import { begin } from '../ui/hangar.js';
import { DISTRICTS, FINAL_NIGHT } from './districts.js';
import { startWave } from './surges.js';
import { startEvac } from './evac.js';
import { giveTraps } from './traps.js';
import { endHorde } from './horde.js';
import { freeSpot } from '../actors/backups.js';
import { sfx, RSTEP } from '../audio/sfx.js';
import { initAudio, playS } from '../audio/audio.js';
import { soundWait } from '../ui/loading.js';

const TYPES = [
  ['', 'Normal'],
  ['horde', 'Horde'],
  ['siege', 'Siege'],
  ['alarm', 'Car alarms'],
  ['pack', 'Dog pack'],
  ['brute', 'Brutes'],
  ['storm', 'Storm'],
  ['fog', 'Fog'],
  ['blackout', 'Blackout'],
  ['blood', 'Blood moon'],
  ['evac', 'Evac finale'],
];
const BOARD = [
  ['pistol', 'Pistol'],
  ['revolver', 'Revolver'],
  ['smg', 'SMG'],
  ['rifle', 'Assault rifle'],
  ['shotgun', 'Pump shotgun'],
  ['auto', 'Auto shotgun'],
  ['hunter', 'Hunting rifle'],
  ['lever', 'Lever-action'],
  ['lmg', 'Machine gun'],
  ['launcher', 'Grenade launcher'],
];
const T = { hero: 'ranger', district: 'town', night: 6, type: '', guns: true, god: true, traps: true };
const BOSS = { 5: 'boss night', 10: 'Fire Chief', 15: 'Patient Zero' };

function seg(key, items) {
  return items
    .map(
      ([v, nm]) =>
        `<button type="button"${String(T[key]) === String(v) ? ' class="on"' : ''} data-k="${key}" data-v="${v}">${nm}</button>`
    )
    .join('');
}
function render() {
  const nights = Array.from({ length: FINAL_NIGHT }, (_, i) => [i + 1, String(i + 1)]),
    bn = BOSS[T.night] && T.type !== 'evac' ? ` · night ${T.night} is a ${BOSS[T.night]}` : '';
  $('trBody').innerHTML = `
    <label>Character</label><div class="seg">${seg(
      'hero',
      Object.entries(HEROES).map(([k, h]) => [k, h.name])
    )}</div>
    <label>District</label><div class="seg">${seg(
      'district',
      Object.entries(DISTRICTS).map(([k, d]) => [k, d.name])
    )}</div>
    <label>Night</label><div class="seg trNights">${seg('night', nights)}</div>
    <label>Kind of night</label><div class="seg">${seg('type', TYPES)}</div>
    <span></span><p class="segnote">${T.type === 'evac' ? 'Straight to the chopper on night 15, and the finale horde' : 'Your character and the guns and level a run would have by then' + bn}</p>
    <label>Options</label><div class="seg">
      <button type="button" class="tog${T.guns ? ' on' : ''}" data-t="guns">Every gun, full ammo</button>
      <button type="button" class="tog${T.god ? ' on' : ''}" data-t="god">Invulnerable</button>
      <button type="button" class="tog${T.traps ? ' on' : ''}" data-t="traps">Full trap kit</button>
    </div>`;
  for (const b of $('trBody').querySelectorAll('[data-k]'))
    b.addEventListener('click', () => {
      const k = b.dataset.k;
      T[k] = k === 'night' ? +b.dataset.v : b.dataset.v;
      if (k === 'type' && T.type === 'evac') T.night = FINAL_NIGHT;
      render();
    });
  for (const b of $('trBody').querySelectorAll('[data-t]'))
    b.addEventListener('click', () => {
      T[b.dataset.t] = !T[b.dataset.t];
      render();
    });
}
function renderBoard() {
  $('trSounds').innerHTML = BOARD.map(
    ([id, nm]) =>
      `<div class="perk trSnd"><span class="nm">${nm}</span><span class="seg"><button type="button" data-shot="${id}">Shot</button><button type="button" data-rld="${id}">Reload</button></span></div>`
  ).join('');
  for (const b of $('trSounds').querySelectorAll('[data-shot]'))
    b.addEventListener('click', () => boardShot(b.dataset.shot));
  for (const b of $('trSounds').querySelectorAll('[data-rld]'))
    b.addEventListener('click', () => boardReload(b.dataset.rld));
}
export function openTestRange() {
  for (const id of ['menu', 'settings']) $(id).hidden = true;
  if (GS.meta.unlocked && GS.meta.unlocked[GS.meta.hero]) T.hero = GS.meta.hero;
  render();
  renderBoard();
  $('testRange').hidden = false;
}
// ---- the sound board
function boardShot(id) {
  initAudio();
  if (id === 'revolver') playS('revolver', 0.78, 1, 0, 0.32);
  else if (id === 'pistol') playS('pistol', 0.68, 1, 0, 0.3);
  else sfx[GUNS[id].snd]();
}
function boardReload(id) {
  initAudio();
  const G = GUNS[id === 'revolver' ? 'pistol' : id];
  if (G && G.perShell) {
    const dt = G.reload * 1000;
    for (let i = 0; i < 4; i++) setTimeout(() => playS(id === 'lever' ? 'shellL' : 'shell', 0.5, 1, 0, 0.03), i * dt);
    setTimeout(() => (id === 'lever' ? playS('leverAct', 0.6, 1, 0, 0.08) : playS('pump', 0.6, 1, 0, 0.08)), 4 * dt);
    return;
  } // a round at a time, then the action worked
  const steps = RSTEP[id === 'revolver' ? 'rev' : id],
    dur = id === 'revolver' ? 1.45 : G.reload;
  for (const [k, key, , vol = 0.62, rate = 1] of steps)
    setTimeout(() => playS(key, vol, rate, 0, 0.06), k * dur * 1000); // as from an empty gun: every step
}
// ---- the run
export function startTest() {
  if (soundWait()) return;
  GS.TESTING = { ...T };
  GS.TEST_META = JSON.parse(JSON.stringify(GS.meta)); // put back, untouched, when you leave
  $('testRange').hidden = true;
  begin.inTest = true;
  begin();
  begin.inTest = false;
  GS.later.length = 0;
  GS.RUN.test = true;
  GS.RUN.god = T.god;
  if (GS.RUN.tut) GS.RUN.tut = null;
  const N = T.night,
    guns = T.guns
      ? GUN_ORDER.slice()
      : N >= 12
        ? ['shotgun', 'smg', 'rifle', 'auto', 'hunter', 'lever', 'lmg', 'launcher']
        : N >= 9
          ? ['shotgun', 'smg', 'rifle', 'auto', 'hunter']
          : N >= 4
            ? ['shotgun', 'rifle']
            : N >= 2
              ? ['shotgun']
              : [];
  for (const g of guns) if (!GS.P.owned.includes(g)) GS.P.owned.push(g);
  GS.P.owned.sort((a, b) => GUN_ORDER.indexOf(a) - GUN_ORDER.indexOf(b));
  const n = Math.round(Math.max(0, N - 1) * 1.4);
  for (let i = 0; i < n; i++) {
    const evo = EVOS.find(v => !LV[v.id] && Object.entries(v.need).every(([k, m]) => (LV[k] || 0) >= m)),
      pool = upgradePool(),
      u = evo || (pool.length ? pick(pool) : null);
    if (!u) break;
    LV[u.id] = (LV[u.id] || 0) + 1;
    u.apply();
  } // the level a run would be at by then
  for (const g of GS.P.owned) GS.P.mag[g] = magSize(g);
  for (const t of Object.keys(AMMO_MAX)) GS.P.ammo[t] = ammoMax(t);
  GS.level = n + 1;
  GS.xp = 0;
  GS.xpNeed = need(GS.level);
  GS.P.hp = S.maxHp;
  if (T.traps) giveTraps({ mine: 3, drum: 3, noise: 3, rig: 2 });
  GS.texts.length = 0;
  GS.streakQ = [];
  hideCallouts();
  const spec = (HEROES[GS.RUN.hero] || HEROES.ranger).spec;
  equip(GS.P.owned.includes(spec) ? spec : GS.P.owned[GS.P.owned.length - 1], true);
  renderMods();
  for (const e of GS.enemies) e.dead = true;
  GS.queue = [];
  if (T.type === 'evac') {
    GS.wave = FINAL_NIGHT;
    GS.RUN.lz = freeSpot(260, 520);
    GS.nightLive = false;
    GS.nightDone = true;
    GS.interT = 99;
    startEvac();
  } else {
    GS.wave = N - 1;
    GS.RUN.nextSig = T.type ? { w: N, s: T.type } : null;
    GS.interT = 0;
    startWave();
  }
  GS.later.push({
    t: 1,
    fn: () =>
      showStreak(
        'Test range',
        `Nothing is saved${T.god ? ' · invulnerable' : ''} · K clears the night · the next night follows as in a run`,
        true
      ),
  });
}
// K, in a test run: the night's dead drop where they stand (no scrap, no XP) and nothing more comes
export function testClear() {
  if (!GS.RUN || !GS.RUN.test || GS.state !== 'play') return;
  GS.queue = [];
  for (const e of GS.enemies) if (!e.big && e.type !== 'queen') e.dead = true;
  if (GS.horde) endHorde();
  showStreak('Night cleared', 'Test range · dawn comes as soon as any boss is down', true);
}
// leaving: your profile as it was before the test
export function testRestore() {
  if (!GS.TESTING || begin.inTest) return;
  const m = GS.TEST_META;
  GS.TESTING = null;
  GS.TEST_META = null;
  if (!m) return;
  for (const k of Object.keys(GS.meta)) delete GS.meta[k];
  Object.assign(GS.meta, m);
}
export function initTestRange() {
  $('testBtn').addEventListener('click', openTestRange);
  $('trStart').addEventListener('click', startTest);
  $('trBack').addEventListener('click', () => {
    $('testRange').hidden = true;
    $('settings').hidden = false;
  });
}
