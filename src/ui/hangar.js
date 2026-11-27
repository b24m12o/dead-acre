/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { clearSave, restoreRun, savedRun } from '../game/save.js';
import { resumeDawn } from '../game/night-flow.js';
import { TW } from '../game/districts.js';
import { KITS, kitOffer } from '../game/kits.js';
import { soundWait } from './loading.js';
import { GS } from '../core/gs.js';
import { offAir } from '../audio/radio.js';
import { zoomK } from '../render/sprites.js';
import { $ } from '../core/errors.js';
import { pick } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { GUNS, GUN_PATH, PERKS, WEAPON_NIGHTS, nextGuns } from '../game/arsenal.js';
import { initAudio } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { setMuted } from '../audio/music.js';
import { AMMO_NAME } from '../game/state.js';
import { newRun } from '../game/run.js';
import { doReroll, offerUpgrades, pickLater, renderMods } from '../game/upgrades.js';
import { AB, ABILITIES, AB_IDS, abDef, abOpen, abPicked } from '../game/abilities.js';
import { updateHint } from './settings-ui.js';
import { showMenuRec } from './screens.js';
import { chalDone, chalFrom, checkChal, stopOpen, lockLine, openChal, snapChal } from '../game/challenges.js';
import { startPractice } from '../game/practice.js';
import { chipNote, menuInit, renderDistricts } from './menu.js';
import { keysIn } from '../core/binds.js';
import { JOBS_J, STOPS } from '../game/route.js';
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
export function seedsLine() {
  return `Scrap <b>${GS.meta.seeds.toLocaleString()}</b>`;
}
// what your kit comes to, on its button on the setup screen: the ability, how many perks are on
export function kitSum() {
  const el = $('kitSum');
  if (!el) return;
  const on = PERKS.filter(pk => (GS.meta.perks[pk.id] || 0) > 0 && !(GS.meta.perkOff || {})[pk.id]).length;
  el.textContent = `${AB().name} · ${on ? on + ' perk' + (on > 1 ? 's' : '') + ' on' : 'no perks'}`;
}
// your kit, on the setup screen (there was an Armory for it): the loadout you take, the E ability, the perks your
// scrap buys, and the scrap
export function renderKit() {
  checkChal(true);
  $('hangarSeeds').innerHTML = seedsLine();
  kitSum();
  {
    // the E ability: six to pick from, the flashbang yours from the start, the rest opened by challenges (the mortar
    // strike last: five bosses down). The line under them says what the picked one does, or how one's opened
    const cur = abPicked(),
      box = $('hangarAbs');
    box.innerHTML = AB_IDS.map(id => {
      const open = abOpen(id),
        on = id === cur;
      return `<button type="button" class="chip${on ? ' on' : ''}${open ? '' : ' lockd'}" data-k="${id}" aria-pressed="${on}" ${open ? '' : 'aria-disabled="true"'}><b>${abDef(id).name}</b>${open ? '' : '<em>locked</em>'}</button>`;
    }).join('');
    chipNote(
      box,
      $('abDesc'),
      id => `<b>${abDef(id).name}</b> · ${abDef(id).desc}${abOpen(id) ? '' : ' ' + lockLine(ABILITIES[id].req)}`,
      cur
    );
    for (const b of box.children)
      b.addEventListener('click', () => {
        if (!abOpen(b.dataset.k)) return;
        sfx.swap();
        GS.meta.ab = b.dataset.k;
        if (GS.RUN) GS.RUN.ab = b.dataset.k;
        saveMeta();
        renderKit();
        const f = $('hangarAbs').querySelector(`[data-k="${b.dataset.k}"]`);
        if (f) f.focus({ preventScroll: true });
      });
  }
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
  for (const b of document.querySelectorAll('#kitCol .tgl'))
    b.addEventListener('click', () => {
      GS.meta.perkOff = GS.meta.perkOff || {};
      GS.meta.perkOff[b.dataset.tog] = !GS.meta.perkOff[b.dataset.tog];
      saveMeta();
      initAudio();
      sfx.swap();
      renderKit();
    });
  for (const b of document.querySelectorAll('#kitCol .buy'))
    b.addEventListener('click', () => {
      {
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
      renderKit();
      showMenuRec();
    });
}

/* ---------- Flow ---------- */
export function begin() {
  offAir(); // (Channel 9 from the title doesn't carry on into the run)
  zoomK(1); // (nor the title's close camera: the run's camera is placed for its own view)
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
  const camp = !GS.PRACTICE && !GS.HM, // the campaign: the road from Dead Acre to the County Hospital
    hmAt = GS.HM && !GS.PRACTICE ? STOPS.find((s, i) => s.id === GS.meta.hmPlace && stopOpen(i)) || STOPS[0] : null; // Horde Mode's ground
  GS.RUN = {
    hero: GS.meta.unlocked[GS.meta.hero] ? GS.meta.hero : 'ranger',
    journey: camp,
    district: GS.PRACTICE ? GS.PRACTICE.d : hmAt ? hmAt.map : 'town',
    layout: hmAt ? hmAt.id : camp ? 'main' : undefined,
    inf: GS.PRACTICE ? 0 : Math.min(GS.meta.inf || 0, GS.meta.infMax || 0),
    endless: false,
    clean: cleanRun(),
    practice: !!GS.PRACTICE,
    tw: GS.PRACTICE ? {} : Object.assign({}, GS.meta.twists || {}),
    diff: GS.meta.diff, // (set for the run: changed from the pause menu it would pay out at the new rate)
  };
  if (GS.HM && !GS.PRACTICE) {
    GS.RUN.hm = true;
    GS.RUN.endless = true;
  } // Horde Mode: wave after wave of hordes, no evac
  GS.RUN.ab = abPicked(); // (your E ability, picked in your kit)
  if (!GS.RUN.practice) clearSave(); // a new run replaces whatever was saved
  GS.RUN.jobN = camp ? JOBS_J.map(w => (w === 7 ? pick([6, 7]) : w)) : [3, 7, 12, pick([9, 13])]; // Hale can be found either night at the gas station
  if (camp) GS.RUN.stop = 0; // Main Street, Dead Acre
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
  ['menu', 'over', 'pause', 'levelup', 'settings'].forEach(id => ($(id).hidden = true));
  $('hint').classList.add('show');
  clearTimeout(GS.hintTO);
  GS.hintTO = setTimeout(() => $('hint').classList.remove('show'), 9000);
  $('hud').hidden = false;
  $('bossBox').hidden = true;
  renderMods();
  GS.state = 'play';
  updateHint();
  setMuted(GS.muted);
  // (no starting loadouts any more: every run starts with the pistol, and the weapon cases bring the rest)
  if (PK().start && !GS.RUN.practice && !GS.RUN.resumed)
    GS.later.push({
      t: 0.4,
      fn: () => {
        if (GS.state === 'play') offerUpgrades('start');
      },
    });
}
// the first weapon-case night at or after night w
export const firstCase = w =>
  Object.keys(WEAPON_NIGHTS)
    .map(Number)
    .sort((a, b) => a - b)
    .find(n => n >= w) || w;
// Continue: the run saved at its last dawn, picked up at that dawn
export function continueRun() {
  offAir();
  zoomK(1);
  const d = savedRun();
  if (!d || soundWait()) return;
  $('survSetup').hidden = true;
  snapChal();
  initAudio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  GS.PRACTICE = null;
  GS.HM = d.RUN.hm ? true : null; // so "Try again" after a continued Horde Mode run is Horde Mode again
  GS.RUN = { ...d.RUN, resumed: true };
  try {
    newRun();
    restoreRun(d);
    $('hud').classList.remove('camp');
    ['menu', 'over', 'pause', 'levelup', 'settings'].forEach(id => ($(id).hidden = true));
    $('hud').hidden = false;
    $('bossBox').hidden = true;
    renderMods();
    GS.state = 'play';
    updateHint();
    setMuted(GS.muted);
    resumeDawn();
  } catch (e) {
    console.warn('Dead Acre: the saved run could not be picked up', e);
    clearSave();
    location.reload();
  } // a save from an older version that no longer fits: start clean rather than half-restored
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
      const kt = (GS.RUN.kits || []).filter(k => KITS[k] && KITS[k].gun === g).map(k => KITS[k].name);
      return `<div class="g${g === GS.P.gun ? ' on' : ''}"><kbd>${i < 9 ? i + 1 : '·'}</kbd><span class="n"><b>${esc(G.name)}</b><i>${esc(am)}${kt.length ? ' · ' + esc(kt.join(', ')) : ''}</i></span></div>`;
    })
    .join('');
  if (!GS.RUN.endless) {
    const nx = Object.keys(WEAPON_NIGHTS)
      .map(Number)
      .filter(n => n > GS.wave)
      .sort((a, b) => a - b)[GS.RUN.lcase && nextGuns().length ? 1 : 0]; // the first case went to the loadout gun
    const left = nextGuns().length || (!TW('pistol') && kitOffer().length);
    h += `<div class="next">${nx && left ? (GS.nightDone && nx === GS.wave + 1 ? 'A weapon case comes down this dawn' : `Next weapon case: at dawn after night ${nx - 1}`) : 'No more weapon cases this run'} · ${keysIn('tap {wheel} for your last gun, hold {wheel} for the wheel')}</div>`;
  }
  el.innerHTML = h;
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  $('chalBtn').addEventListener('click', () => openChal('menu'));
  $('chalBack').addEventListener('click', () => {
    $('chal').hidden = true;
    if (chalFrom === 'over') $('over').hidden = false;
    else {
      renderDistricts();
      showMenuRec();
      $('menu').hidden = false;
    }
  });
  $('rerollBtn').addEventListener('click', doReroll);
  $('laterBtn').addEventListener('click', pickLater);
  $('toMenuBtn').addEventListener('click', () => {
    $('over').hidden = true;
    $('hud').hidden = true;
    showMenuRec();
    $('menu').hidden = false;
    menuInit();
  });
  GS.PRACTICE = null;
}
