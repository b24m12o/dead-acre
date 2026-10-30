/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { soundWait } from './loading.js';
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { pick } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { GUNS, GUN_PATH, HEROES, PERKS, WEAPON_NIGHTS, nextGuns } from '../game/arsenal.js';
import { glc } from '../render/gl.js';
import { RW, VW, ZOOM } from '../render/sprites.js';
import { initAudio } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { setMuted } from '../audio/music.js';
import { AMMO_NAME, S, armGuns, resetStats } from '../game/state.js';
import { newRun } from '../game/run.js';
import { doReroll, offerUpgrades, renderMods } from '../game/upgrades.js';
import { AB_DEF } from '../game/abilities.js';
import { updateHint } from './settings-ui.js';
import { showMenuRec } from './screens.js';
import {
  OUTFITS,
  chalDone,
  chalFrom,
  checkChal,
  districtOpen,
  lockLine,
  openChal,
  snapChal,
} from '../game/challenges.js';
import { startPractice } from '../game/practice.js';
import { menuInit, renderChallenges, renderDistricts } from './menu.js';
export function renderHeroes() {
  $('heroes').innerHTML = Object.entries(HEROES)
    .map(([id, h]) => {
      const own = GS.meta.unlocked[id];
      return `<button type="button" class="hero${GS.meta.hero === id ? ' on' : ''}${own ? '' : ' locked'}" data-h="${id}"><span class="nm"><i style="background:${h.dot}"></i>${h.name}</span><span class="wp">Best with ${h.weapon} · ${h.hp} health</span><span class="ds">${h.desc}</span><span class="wp ab">E · ${AB_DEF[id].name}</span>${own ? '' : `<span class="lk">Locked · ${h.cost} scrap in the Armory</span>`}</button>`;
    })
    .join('');
  for (const b of $('heroes').children)
    b.addEventListener('click', () => {
      const id = b.dataset.h;
      if (!GS.meta.unlocked[id]) return;
      if (GS.meta.hero === id) return;
      GS.meta.hero = id;
      saveMeta();
      GS.RUN.hero = id;
      renderHeroes();
      resetStats();
      armGuns(GS.P);
      GS.P.hp = S.maxHp;
    });
}
export function PK() {
  const o = {},
    off = GS.meta.perkOff || {};
  for (const [k, v] of Object.entries(GS.meta.perks || {})) if (!off[k]) o[k] = v;
  return o;
} // the perks switched on for the next run
export function cleanRun() {
  const own = Object.keys(GS.meta.perks || {}).filter(k => GS.meta.perks[k] > 0),
    off = GS.meta.perkOff || {};
  return own.length > 0 && own.every(k => off[k]);
} // every perk you own switched off: +25% scrap
export const HPV = { on: false, hero: null, outfit: null }; // what the Armory preview shows
export function pvLabel() {
  const h = HEROES[HPV.hero || GS.meta.hero] || HEROES.ranger,
    oid = HPV.outfit || GS.meta.outfit || 'std',
    o = OUTFITS[oid] || OUTFITS.std,
    own = GS.meta.unlocked[HPV.hero || GS.meta.hero],
    open = !o.req || chalDone(o.req);
  $('pvName').textContent = h.name;
  $('pvSub').textContent = `${o.name}${open ? '' : ' · locked'}${own ? '' : ' · not bought yet'}`;
}
export function copyPreview() {
  // the hero standing in the live menu scene, lit by its own flashlight, cut out of the frame that was just drawn
  const c = $('heroPv');
  if (!c || !GS.P) return;
  const k = RW / VW,
    sz = 88 * ZOOM * k,
    sx = (GS.P.x - GS.camX) * ZOOM * k - sz / 2,
    sy = (GS.P.y - GS.camY - 4) * ZOOM * k - sz / 2;
  const x = c.getContext('2d');
  x.fillStyle = '#0e1215';
  x.fillRect(0, 0, c.width, c.height);
  try {
    x.drawImage(glc, sx, sy, sz, sz, 0, 0, c.width, c.height);
  } catch (err) {}
  const W = c.width,
    g = x.createRadialGradient(W / 2, W / 2, W * 0.18, W / 2, W / 2, W * 0.62);
  g.addColorStop(0, 'rgba(14,18,21,0)');
  g.addColorStop(1, 'rgba(14,18,21,0.85)');
  x.fillStyle = g;
  x.fillRect(0, 0, W, W); // a vignette so the eye goes to the character, not the street
}
export function seedsLine() {
  return `Scrap <b>${GS.meta.seeds.toLocaleString()}</b>`;
}
function renderHangar() {
  checkChal(true);
  renderChallenges();
  $('hangarSeeds').innerHTML = seedsLine();
  $('hangarHeroes').innerHTML = Object.entries(HEROES)
    .filter(([id]) => id !== 'ranger')
    .map(([id, h]) => {
      const own = GS.meta.unlocked[id];
      return `<div class="perk"><span class="nm">${h.name} · best with ${h.weapon}</span><button type="button" class="buy" data-hero="${id}" ${own || GS.meta.seeds < h.cost ? 'disabled' : ''}>${own ? 'Unlocked' : h.cost + ' scrap'}</button><span class="ds">${h.desc}</span></div>`;
    })
    .join('');
  $('hangarPerks').innerHTML = PERKS.map(pk => {
    if (pk.req && !chalDone(pk.req))
      return `<div class="perk"><span class="nm">${pk.name}</span><button type="button" class="buy" disabled>Locked</button><span class="ds">${pk.desc} ${lockLine(pk.req)}</span></div>`;
    const lv = GS.meta.perks[pk.id] || 0,
      maxed = lv >= pk.max,
      cost = pk.cost(lv),
      off = !!(GS.meta.perkOff || {})[pk.id];
    return `<div class="perk${lv && off ? ' off' : ''}"><span class="nm">${pk.name}</span><span class="acts"><button type="button" class="buy" data-perk="${pk.id}" ${maxed || GS.meta.seeds < cost ? 'disabled' : ''}>${maxed ? 'Maxed' : cost + ' scrap'}</button>${lv ? `<button type="button" class="tgl${off ? '' : ' on'}" data-tog="${pk.id}" role="switch" aria-checked="${off ? 'false' : 'true'}" title="${off ? 'Switch this perk back on' : 'Switch this perk off for the next runs'}"><i></i><span>${off ? 'Off' : 'On'}</span></button>` : ''}</span><span class="ds">${pk.desc}</span><span class="pips">${Array.from({ length: pk.max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span></div>`;
  }).join('');
  {
    const own = Object.keys(GS.meta.perks || {}).some(k => GS.meta.perks[k] > 0);
    $('perkNote').textContent = !own
      ? ''
      : cleanRun()
        ? 'Every perk is switched off. Runs pay +25% scrap.'
        : 'Want it harder? Switch perks off; they stay yours. With every perk off, runs pay +25% scrap.';
  }
  for (const b of document.querySelectorAll('#hangar .tgl'))
    b.addEventListener('click', () => {
      GS.meta.perkOff = GS.meta.perkOff || {};
      GS.meta.perkOff[b.dataset.tog] = !GS.meta.perkOff[b.dataset.tog];
      saveMeta();
      initAudio();
      sfx.swap();
      renderHangar();
    });
  for (const b of document.querySelectorAll('#hangarHeroes .perk')) {
    const id = b.querySelector('.buy') && b.querySelector('.buy').dataset.hero;
    const on = () => {
        HPV.hero = id;
        pvLabel();
      },
      off = () => {
        HPV.hero = null;
        pvLabel();
      };
    b.addEventListener('mouseenter', on);
    b.addEventListener('mouseleave', off);
    b.addEventListener('focusin', on);
    b.addEventListener('focusout', off);
  }
  pvLabel();
  for (const b of document.querySelectorAll('#hangar .buy'))
    b.addEventListener('click', () => {
      if (b.dataset.hero) {
        const h = HEROES[b.dataset.hero];
        if (GS.meta.seeds >= h.cost) {
          GS.meta.seeds -= h.cost;
          GS.meta.unlocked[b.dataset.hero] = true;
          GS.meta.hero = b.dataset.hero;
          GS.RUN.hero = GS.meta.hero;
        }
      } else {
        const pk = PERKS.find(x => x.id === b.dataset.perk),
          lv = GS.meta.perks[pk.id] || 0,
          cost = pk.cost(lv);
        if (lv < pk.max && GS.meta.seeds >= cost) {
          GS.meta.seeds -= cost;
          GS.meta.perks[pk.id] = lv + 1;
        }
      }
      saveMeta();
      initAudio();
      sfx.level();
      renderHangar();
      renderHeroes();
      showMenuRec();
    });
}
export function openHangar() {
  $('menu').hidden = true;
  renderHangar();
  $('hangar').hidden = false;
}

/* ---------- Flow ---------- */
export function begin() {
  if (soundWait()) return false; // the sounds are still coming in (see ui/loading.js)
  if (GS.PRACTICE && GS.state === 'over' && !begin.inPractice) {
    startPractice(GS.PRACTICE.bt);
    return;
  } // 'Try again' after a practice fight goes straight back to that boss
  ['survSetup'].forEach(id => {
    const el = $(id);
    if (el) el.hidden = true;
  });
  snapChal();
  initAudio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  GS.RUN = {
    hero: GS.meta.unlocked[GS.meta.hero] ? GS.meta.hero : 'ranger',
    district: GS.PRACTICE
      ? GS.PRACTICE.d
      : districtOpen(GS.meta.district || 'town')
        ? GS.meta.district || 'town'
        : 'town',
    inf: GS.PRACTICE ? 0 : Math.min(GS.meta.inf || 0, GS.meta.infMax || 0),
    endless: false,
    clean: cleanRun(),
    practice: !!GS.PRACTICE,
    tw: GS.PRACTICE ? {} : Object.assign({}, GS.meta.twists || {}),
  };
  GS.RUN.jobN = [3, 7, 12, pick([9, 13])];
  {
    const sh = a => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    GS.RUN.gunPath = sh(GUN_PATH.slice(0, 3)).concat(sh(GUN_PATH.slice(3)));
  } // the cases come in a different order each run, light guns before heavy
  GS.RUN.aboard = [];
  GS.RUN.lost = [];
  GS.RUN.nextBud = null;
  GS.RUN.voice = 'Reyes';
  GS.RUN.favours = 0;
  GS.RUN.metrics = {
    elapsed: 0,
    triggers: 0,
    damageDealt: 0,
    damageTaken: 0,
    rolls: 0,
    reloads: 0,
    objectives: 0,
    objectivesFailed: 0,
    peakCombo: 0,
  };
  newRun();
  $('hud').classList.remove('camp');
  ['menu', 'over', 'pause', 'levelup', 'hangar', 'settings'].forEach(id => ($(id).hidden = true));
  $('hint').classList.add('show');
  clearTimeout(GS.hintTO);
  GS.hintTO = setTimeout(() => $('hint').classList.remove('show'), 9000);
  $('hud').hidden = false;
  $('bossBox').hidden = true;
  renderMods();
  GS.state = 'play';
  updateHint();
  setMuted(GS.muted);
  if (PK().start && !GS.RUN.practice)
    GS.later.push({
      t: 0.4,
      fn: () => {
        if (GS.state === 'play') offerUpgrades('start');
      },
    });
}
export function renderPauseGuns() {
  // every gun you carry, the key that draws it, and what it eats
  const el = $('pGuns');
  if (!el || !GS.P) return;
  const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  let h = GS.P.owned
    .map((g, i) => {
      const G = GUNS[g],
        am = G.ammo
          ? `${Math.floor(GS.P.mag[g] ?? 0)} · ${Math.floor(GS.P.ammo[G.ammo] || 0)} ${AMMO_NAME[G.ammo] || ''}`
          : `${Math.floor(GS.P.mag[g] ?? 0)} · unlimited`;
      return `<div class="g${g === GS.P.gun ? ' on' : ''}"><kbd>${i < 9 ? i + 1 : '·'}</kbd><span class="n"><b>${esc(G.name)}</b><i>${esc(am)}</i></span></div>`;
    })
    .join('');
  if (!GS.RUN.endless) {
    const nx = Object.keys(WEAPON_NIGHTS)
      .map(Number)
      .filter(n => n > GS.wave)
      .sort((a, b) => a - b)[0];
    const left = nextGuns().length;
    h += `<div class="next">${nx && left ? (GS.nightDone && nx === GS.wave + 1 ? 'A weapon case comes down this dawn' : `Next weapon case: at dawn after night ${nx - 1}`) : 'No more weapon cases this run'} · tap Q for your last gun, hold Q for the wheel</div>`;
  }
  el.innerHTML = h;
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  $('hangarBtn').addEventListener('click', openHangar);
  $('chalBtn').addEventListener('click', () => openChal('menu'));
  $('chalBtn2').addEventListener('click', () => openChal('hangar'));
  $('chalBack').addEventListener('click', () => {
    $('chal').hidden = true;
    if (chalFrom === 'hangar') {
      renderHangar();
      $('hangar').hidden = false;
    } else if (chalFrom === 'over') $('over').hidden = false;
    else {
      renderDistricts();
      renderHeroes();
      showMenuRec();
      $('menu').hidden = false;
    }
  });
  $('hangarBack').addEventListener('click', () => {
    $('hangar').hidden = true;
    $('menu').hidden = false;
    menuInit();
  });
  $('rerollBtn').addEventListener('click', doReroll);
  $('toMenuBtn').addEventListener('click', () => {
    $('over').hidden = true;
    $('hud').hidden = true;
    showMenuRec();
    renderHeroes();
    $('menu').hidden = false;
    menuInit();
  });
  GS.PRACTICE = null;
}
