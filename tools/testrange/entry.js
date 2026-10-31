/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The test range: a separate test build, never part of the game. tools/testrange/build.mjs bundles this file
// together with the game into build/test-range.html (the game's own build, dist/game.js, never includes it). It
// imports the game's modules like any other module: no eval, so it runs anywhere the game runs. Its page keeps
// browser storage in memory only, so nothing is saved and no profile is touched.
// Any night, kind of night, character and district straight away; every gun, invulnerable, a trap kit; K clears the
// night; and a sound board with every gun's shot and reload.
/* global document, setInterval, clearInterval, setTimeout, addEventListener */
import '../../src/index.js';
import { GS } from '../../src/core/gs.js';
import { pick } from '../../src/core/util.js';
import { AMMO_MAX, GUNS, GUN_ORDER, HEROES } from '../../src/game/arsenal.js';
import { DISTRICTS, FINAL_NIGHT } from '../../src/game/districts.js';
import { LV, S, ammoMax, equip, magSize } from '../../src/game/state.js';
import { need } from '../../src/game/run.js';
import { EVOS, renderMods, upgradePool } from '../../src/game/upgrades.js';
import { hideCallouts, showStreak } from '../../src/ui/callouts.js';
import { begin } from '../../src/ui/hangar.js';
import { startWave } from '../../src/game/surges.js';
import { startEvac } from '../../src/game/evac.js';
import { giveTraps } from '../../src/game/traps.js';
import { endHorde } from '../../src/game/horde.js';
import { freeSpot } from '../../src/actors/backups.js';
import { RSTEP, sfx } from '../../src/audio/sfx.js';
import { initAudio, playS } from '../../src/audio/audio.js';
import { soundWait } from '../../src/ui/loading.js';

function boot() {
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
  const BOSS = { 5: 'a boss night', 10: 'the Fire Chief', 15: 'Patient Zero' };
  const T = { hero: 'ranger', district: 'town', night: 6, type: '', guns: true, god: true, traps: true };
  // a profile with everything open, in memory only
  GS.meta.tutDone = true;
  GS.meta.tips = Object.assign(GS.meta.tips || {}, { t_traps: 1 });
  for (const h of Object.keys(HEROES)) GS.meta.unlocked[h] = true;
  GS.meta.chal = Object.assign(
    GS.meta.chal || {},
    ...Object.values(DISTRICTS).map(d => (d.lock ? { [d.lock]: 1 } : {}))
  ); // every district open

  const css = document.createElement('style');
  css.textContent = `#trOpen{position:fixed;right:18px;bottom:18px;z-index:60;font:600 13px var(--font-mono,monospace);background:#ff8a3a;color:#1b0f06;border:0;border-radius:10px;padding:10px 16px;cursor:pointer;box-shadow:0 4px 0 #b44a12}
#trOpen[hidden]{display:none}
#trPanel .set{grid-template-columns:130px 1fr}
#trPanel .set>label{grid-column:1}
#trPanel .segnote{margin:0}
#trPanel .nights button{min-width:34px;padding:7px 8px}
#trBoard{grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
#trBoard .perk{padding:8px 12px}
#trBoard .nm{font-size:16px}
#trBoard .seg button{background:#323c46;padding:6px 12px}
#trTag{position:fixed;left:50%;bottom:6px;transform:translateX(-50%);z-index:60;font:600 11px var(--font-mono,monospace);color:#ffd08a;background:rgba(20,24,29,.8);padding:4px 10px;border-radius:8px;pointer-events:none}`;
  document.head.appendChild(css);
  const open = document.createElement('button');
  open.id = 'trOpen';
  open.textContent = 'Test range';
  document.body.appendChild(open);
  const tag = document.createElement('div');
  tag.id = 'trTag';
  tag.textContent = 'TEST RANGE BUILD · nothing is saved · K clears the night';
  document.body.appendChild(tag);
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.id = 'trPanel';
  ov.hidden = true;
  ov.innerHTML = `<div class="panel wide">
    <div class="eyebrow">Test range · a separate test build, not the game · nothing is saved</div>
    <h2>Test range</h2>
    <div class="set" id="trBody"></div>
    <div class="sec">Sound board</div>
    <div class="perks" id="trBoard"></div>
    <div class="btns"><button class="btn" id="trStart" type="button">Start</button
      ><button class="btn ghost" id="trBack" type="button">Back</button></div></div>`;
  document.body.appendChild(ov);
  const q = id => document.getElementById(id);

  const seg = (key, items) =>
    items
      .map(
        ([v, nm]) =>
          `<button type="button"${String(T[key]) === String(v) ? ' class="on"' : ''} data-k="${key}" data-v="${v}">${nm}</button>`
      )
      .join('');
  function render() {
    const bn = BOSS[T.night] && T.type !== 'evac' ? ` · night ${T.night} is ${BOSS[T.night]}` : '';
    q('trBody').innerHTML = `
      <label>Character</label><div class="seg">${seg(
        'hero',
        Object.entries(HEROES).map(([k, h]) => [k, h.name])
      )}</div>
      <label>District</label><div class="seg">${seg(
        'district',
        Object.entries(DISTRICTS).map(([k, d]) => [k, d.name])
      )}</div>
      <label>Night</label><div class="seg nights">${seg(
        'night',
        Array.from({ length: FINAL_NIGHT }, (_, i) => [i + 1, String(i + 1)])
      )}</div>
      <label>Kind of night</label><div class="seg">${seg('type', TYPES)}</div>
      <span></span><p class="segnote">${T.type === 'evac' ? 'Straight to the chopper on night 15, and the finale horde' : 'The guns and level a run would have by then' + bn}</p>
      <label>Options</label><div class="seg">
        <button type="button" class="tog${T.guns ? ' on' : ''}" data-t="guns">Every gun, full ammo</button>
        <button type="button" class="tog${T.god ? ' on' : ''}" data-t="god">Invulnerable</button>
        <button type="button" class="tog${T.traps ? ' on' : ''}" data-t="traps">Full trap kit</button>
      </div>`;
    for (const b of q('trBody').querySelectorAll('[data-k]'))
      b.onclick = () => {
        const k = b.dataset.k;
        T[k] = k === 'night' ? +b.dataset.v : b.dataset.v;
        if (k === 'type' && T.type === 'evac') T.night = FINAL_NIGHT;
        render();
      };
    for (const b of q('trBody').querySelectorAll('[data-t]'))
      b.onclick = () => {
        T[b.dataset.t] = !T[b.dataset.t];
        render();
      };
  }
  q('trBoard').innerHTML = BOARD.map(
    ([id, nm]) =>
      `<div class="perk"><span class="nm">${nm}</span><span class="seg"><button type="button" data-shot="${id}">Shot</button><button type="button" data-rld="${id}">Reload</button></span></div>`
  ).join('');
  for (const b of q('trBoard').querySelectorAll('[data-shot]')) b.onclick = () => shot(b.dataset.shot);
  for (const b of q('trBoard').querySelectorAll('[data-rld]')) b.onclick = () => reload(b.dataset.rld);
  function shot(id) {
    initAudio();
    if (id === 'revolver') playS('revolver', 0.78, 1, 0, 0.32);
    else if (id === 'pistol') playS('pistol', 0.68, 1, 0, 0.3);
    else sfx[GUNS[id].snd]();
  }
  function reload(id) {
    initAudio();
    const G = GUNS[id === 'revolver' ? 'pistol' : id];
    if (G && G.perShell) {
      const dt = G.reload * 1000;
      for (let i = 0; i < 4; i++) setTimeout(() => playS(id === 'lever' ? 'shellL' : 'shell', 0.5, 1, 0, 0.03), i * dt);
      setTimeout(() => playS(id === 'lever' ? 'leverAct' : 'pump', 0.6, 1, 0, 0.08), 4 * dt);
      return;
    } // a round at a time, then the action worked
    const dur = id === 'revolver' ? 1.45 : G.reload;
    for (const [k, key, , vol = 0.62, rate = 1] of RSTEP[id === 'revolver' ? 'rev' : id])
      setTimeout(() => playS(key, vol, rate, 0, 0.06), k * dur * 1000); // as from an empty gun: every step
  }

  function start() {
    if (soundWait()) return;
    ov.hidden = true;
    GS.meta.hero = T.hero;
    GS.meta.district = T.district;
    begin();
    GS.later.length = 0;
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
    if (T.god) S.maxHp = 1e6; // invulnerable, from out here: more health than anything can take
    for (const g of GS.P.owned) GS.P.mag[g] = magSize(g);
    for (const t of Object.keys(AMMO_MAX)) GS.P.ammo[t] = ammoMax(t);
    GS.level = n + 1;
    GS.xp = 0;
    GS.xpNeed = need(GS.level);
    GS.P.hp = S.maxHp;
    if (T.traps) giveTraps({ mine: 3, drum: 3, noise: 3, rig: 2 });
    GS.texts.length = 0;
    GS.streakQ = [];
    GS.later.length = 0; // no 'joins you' and perk call-outs from the level handed out above
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
  }
  // K: the night's dead drop where they stand (no scrap, no XP) and nothing more comes
  addEventListener('keydown', e => {
    if ((e.key || '').toLowerCase() !== 'k' || GS.state !== 'play' || e.repeat) return;
    GS.queue = [];
    for (const z of GS.enemies) if (!z.big && z.type !== 'queen') z.dead = true;
    if (GS.horde) endHorde();
    showStreak('Night cleared', 'Test range · dawn comes as soon as any boss is down', true);
  });
  setInterval(() => {
    open.hidden = GS.state !== 'menu' || !ov.hidden;
    if (T.god && GS.P && GS.state === 'play' && S.maxHp >= 1e6) GS.P.hp = S.maxHp;
  }, 250); // the button only on the menu; an invulnerable run kept topped up
  open.onclick = () => {
    render();
    ov.hidden = false;
    open.hidden = true;
    q('menu').hidden = true;
  };
  q('trBack').onclick = () => {
    ov.hidden = true;
    q('menu').hidden = false;
  };
  q('trStart').onclick = start;
}
// start once the game's menu is up
const t = setInterval(() => {
  const mn = document.getElementById('menu');
  if (mn && !mn.hidden && GS.meta) {
    clearInterval(t);
    boot();
  }
}, 200);
