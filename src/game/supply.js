/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The supply panel: at dawn in the campaign, B opens what the convoy can spare for scrap. Boards to nail across a
// gap, the traps, a medkit, ammo for the gun in your hands. The world waits while you choose. Scrap spent here is
// scrap you don't bank at the end of the run, so a buy is a bet on the night ahead.
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { kn } from '../core/binds.js';
import { GUNS } from './arsenal.js';
import { S, ammoMax, magSize } from './state.js';
import { TRAP_MAX, have, giveTrapsQuiet } from './traps.js';
import { sfx } from '../audio/sfx.js';
import { floatText } from '../render/effects.js';
import { saveRun } from './save.js';

// cost in scrap: about two or three of them from what a night earns from night 5 on (the campaign bot holds
// 150 to 300 more each dawn); trap: what it adds to your pack, capped at the trap's most carried
export const SUPPLY = [
  { id: 'board', name: 'Boards', desc: 'Nail them across a doorway or an alley', cost: 60, trap: 'board' },
  { id: 'mine', name: 'Land mine', desc: 'Thrown · blows when they step near it', cost: 50, trap: 'mine' },
  { id: 'drum', name: 'Gas drum', desc: 'Set down · shoot it for a pool of fire', cost: 55, trap: 'drum' },
  { id: 'noise', name: 'Noise maker', desc: 'Thrown · pulls them to it for 10 s', cost: 40, trap: 'noise' },
  { id: 'med', name: 'Medkit', desc: 'Heals you 40 now', cost: 75 },
  { id: 'ammo', name: 'Ammo', desc: 'Tops up the gun in your hands', cost: 60 },
];
const gunAmmo = () => GUNS[GS.P.gun] && GUNS[GS.P.gun].ammo;
// why an item can't be had right now ('' when it can)
export function supplyWhy(it) {
  if (GS.runSeeds < it.cost) return 'Not enough scrap';
  if (it.trap && (have()[it.trap] || 0) >= TRAP_MAX[it.trap]) return 'You carry the most you can';
  if (it.id === 'med' && GS.P.hp >= S.maxHp) return 'You are not hurt';
  if (it.id === 'ammo') {
    const t = gunAmmo();
    if (!t) return 'This gun never runs dry';
    if ((GS.P.ammo[t] || 0) >= ammoMax(t) && GS.P.mag[GS.P.gun] >= magSize(GS.P.gun)) return 'Already full';
  }
  return '';
}
// can the panel open now? A campaign dawn, on foot, with nothing else holding the screen
export const supplyOK = () =>
  GS.state === 'play' &&
  !!GS.RUN &&
  !!GS.RUN.journey &&
  !GS.RUN.hm &&
  !GS.RUN.tut &&
  !GS.RUN.practice &&
  GS.nightDone &&
  !GS.nightLive &&
  !GS.evac &&
  !!GS.P &&
  !GS.P.ride &&
  GS.P.hp > 0;
// the dawn line's hint: when the cheapest thing you could still take is within reach
export const supplyHint = () => supplyOK() && SUPPLY.some(it => !supplyWhy(it));
export function buySupply(i) {
  const it = SUPPLY[i];
  if (!it || supplyWhy(it)) return false;
  GS.runSeeds -= it.cost;
  if (it.trap) giveTrapsQuiet({ [it.trap]: 1 });
  else if (it.id === 'med') GS.P.hp = Math.min(S.maxHp, GS.P.hp + 40);
  else if (it.id === 'ammo') {
    const t = gunAmmo();
    GS.P.ammo[t] = ammoMax(t);
    GS.P.mag[GS.P.gun] = magSize(GS.P.gun);
  }
  if (GS.RUN.metrics) GS.RUN.metrics.scrapSpent = (GS.RUN.metrics.scrapSpent || 0) + it.cost;
  sfx.ammo();
  return true;
}
let open = null;
function render() {
  const el = $('supply');
  el.querySelector('.sscrap').textContent = `${GS.runSeeds.toLocaleString()} scrap`;
  el.querySelector('.ways').innerHTML = SUPPLY.map((it, i) => {
    const why = supplyWhy(it),
      n = it.trap ? `<span class="shave">${have()[it.trap] || 0} / ${TRAP_MAX[it.trap]}</span>` : '';
    return `<button class="way sup" type="button" data-i="${i}"${why ? ' disabled' : ''}><span class="wk">${i + 1}</span><b>${it.name}</b><span class="wwhat">${it.desc}</span><span class="scost">${it.cost} scrap${why ? ` · ${why.toLowerCase()}` : ''}</span>${n}</button>`;
  }).join('');
  for (const b of el.querySelectorAll('.sup')) b.onclick = () => pick(+b.dataset.i);
  el.querySelector('.shint').textContent = `1–6 to buy · ${kn('supply')}, Esc or Enter to close`;
}
function pick(i) {
  if (!open || performance.now() < open.t0) return;
  if (buySupply(i)) render();
}
export function openSupply() {
  if (!supplyOK() || open) return false;
  const el = $('supply');
  if (!el) return false;
  GS.state = 'supply';
  open = { t0: performance.now() + 600 }; // a beat first: a key held from the walk can't buy for you
  render();
  el.hidden = false;
  el.classList.add('arming');
  setTimeout(() => el.classList.remove('arming'), 600);
  const key = e => {
    const k = (e.key || '').toLowerCase();
    if (/^[1-6]$/.test(k)) pick(+k - 1);
    else if (k === 'escape' || k === 'enter' || e.code === GS.meta.keys?.supply || k === 'b') closeSupply();
    else return;
    e.preventDefault();
    e.stopPropagation();
  };
  open.key = key;
  window.addEventListener('keydown', key, true);
  return true;
}
export function closeSupply() {
  if (!open || performance.now() < open.t0 - 450) return; // the same press that opened it doesn't shut it
  window.removeEventListener('keydown', open.key, true);
  open = null;
  $('supply').hidden = true;
  if (GS.state === 'supply') GS.state = 'play';
  saveRun(); // bought is bought: a Continue keeps it
  if (GS.P) floatText(GS.P.x, GS.P.y - 44, 'Stocked up', '#e8c46a', 13);
}
