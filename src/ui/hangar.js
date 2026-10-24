/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
function renderHeroes() {
  $('heroes').innerHTML = Object.entries(HEROES)
    .map(([id, h]) => {
      const own = meta.unlocked[id];
      return `<button type="button" class="hero${meta.hero === id ? ' on' : ''}${own ? '' : ' locked'}" data-h="${id}"><span class="nm"><i style="background:${h.dot}"></i>${h.name}</span><span class="wp">${h.weapon} · ${h.hp} health</span><span class="ds">${h.desc}</span><span class="wp ab">E · ${AB_DEF[id].name}</span>${own ? '' : `<span class="lk">Locked · ${h.cost} scrap in the Armory</span>`}</button>`;
    })
    .join('');
  for (const b of $('heroes').children)
    b.addEventListener('click', () => {
      const id = b.dataset.h;
      if (!meta.unlocked[id]) return;
      if (meta.hero === id) return;
      meta.hero = id;
      saveMeta();
      RUN.hero = id;
      renderHeroes();
      resetStats();
      armGuns(P);
      P.hp = S.maxHp;
    });
}
function PK() {
  const o = {},
    off = meta.perkOff || {};
  for (const [k, v] of Object.entries(meta.perks || {})) if (!off[k]) o[k] = v;
  return o;
} // the perks switched on for the next run
function cleanRun() {
  const own = Object.keys(meta.perks || {}).filter(k => meta.perks[k] > 0),
    off = meta.perkOff || {};
  return own.length > 0 && own.every(k => off[k]);
} // every perk you own switched off: +25% scrap
const HPV = { on: false, hero: null, outfit: null }; // what the Armory preview shows
function pvLabel() {
  const h = HEROES[HPV.hero || meta.hero] || HEROES.ranger,
    oid = HPV.outfit || meta.outfit || 'std',
    o = OUTFITS[oid] || OUTFITS.std,
    own = meta.unlocked[HPV.hero || meta.hero],
    open = !o.req || chalDone(o.req);
  $('pvName').textContent = h.name;
  $('pvSub').textContent = `${o.name}${open ? '' : ' · locked'}${own ? '' : ' · not bought yet'}`;
}
function copyPreview() {
  // the hero standing in the live menu scene, lit by its own flashlight, cut out of the frame that was just drawn
  const c = $('heroPv');
  if (!c || !P) return;
  const k = RW / VW,
    sz = 88 * ZOOM * k,
    sx = (P.x - camX) * ZOOM * k - sz / 2,
    sy = (P.y - camY - 4) * ZOOM * k - sz / 2;
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
function seedsLine() {
  return `Scrap <b>${meta.seeds.toLocaleString()}</b>`;
}
function renderHangar() {
  checkChal(true);
  renderChallenges();
  $('hangarSeeds').innerHTML = seedsLine();
  $('hangarHeroes').innerHTML = Object.entries(HEROES)
    .filter(([id]) => id !== 'ranger')
    .map(([id, h]) => {
      const own = meta.unlocked[id];
      return `<div class="perk"><span class="nm">${h.name} · ${h.weapon}</span><button type="button" class="buy" data-hero="${id}" ${own || meta.seeds < h.cost ? 'disabled' : ''}>${own ? 'Unlocked' : h.cost + ' scrap'}</button><span class="ds">${h.desc}</span></div>`;
    })
    .join('');
  $('hangarPerks').innerHTML = PERKS.map(pk => {
    if (pk.req && !chalDone(pk.req))
      return `<div class="perk"><span class="nm">${pk.name}</span><button type="button" class="buy" disabled>Locked</button><span class="ds">${pk.desc} Unlock: complete ${CHAL.find(c => c.id === pk.req).name}</span></div>`;
    const lv = meta.perks[pk.id] || 0,
      maxed = lv >= pk.max,
      cost = pk.cost(lv),
      off = !!(meta.perkOff || {})[pk.id];
    return `<div class="perk${lv && off ? ' off' : ''}"><span class="nm">${pk.name}</span><span class="acts"><button type="button" class="buy" data-perk="${pk.id}" ${maxed || meta.seeds < cost ? 'disabled' : ''}>${maxed ? 'Maxed' : cost + ' scrap'}</button>${lv ? `<button type="button" class="tgl${off ? '' : ' on'}" data-tog="${pk.id}" role="switch" aria-checked="${off ? 'false' : 'true'}" title="${off ? 'Switch this perk back on' : 'Switch this perk off for the next runs'}"><i></i><span>${off ? 'Off' : 'On'}</span></button>` : ''}</span><span class="ds">${pk.desc}</span><span class="pips">${Array.from({ length: pk.max }, (_, k) => `<i class="${k < lv ? 'on' : ''}"></i>`).join('')}</span></div>`;
  }).join('');
  {
    const own = Object.keys(meta.perks || {}).some(k => meta.perks[k] > 0);
    $('perkNote').textContent = !own
      ? ''
      : cleanRun()
        ? 'Every perk is switched off. Runs pay +25% scrap.'
        : 'Want it harder? Switch perks off; they stay yours. With every perk off, runs pay +25% scrap.';
  }
  for (const b of document.querySelectorAll('#hangar .tgl'))
    b.addEventListener('click', () => {
      meta.perkOff = meta.perkOff || {};
      meta.perkOff[b.dataset.tog] = !meta.perkOff[b.dataset.tog];
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
        if (meta.seeds >= h.cost) {
          meta.seeds -= h.cost;
          meta.unlocked[b.dataset.hero] = true;
          meta.hero = b.dataset.hero;
          RUN.hero = meta.hero;
        }
      } else {
        const pk = PERKS.find(x => x.id === b.dataset.perk),
          lv = meta.perks[pk.id] || 0,
          cost = pk.cost(lv);
        if (lv < pk.max && meta.seeds >= cost) {
          meta.seeds -= cost;
          meta.perks[pk.id] = lv + 1;
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
function openHangar() {
  $('menu').hidden = true;
  renderHangar();
  $('hangar').hidden = false;
}
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

/* ---------- Flow ---------- */
let PRACTICE = null;
function begin() {
  if (PRACTICE && state === 'over' && !begin.inPractice) {
    startPractice(PRACTICE.bt);
    return;
  } // 'Try again' after a practice fight goes straight back to that boss
  ['survSetup'].forEach(id => {
    const el = $(id);
    if (el) el.hidden = true;
  });
  snapChal();
  initAudio();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  RUN = {
    hero: meta.unlocked[meta.hero] ? meta.hero : 'ranger',
    district: PRACTICE ? PRACTICE.d : districtOpen(meta.district || 'town') ? meta.district || 'town' : 'town',
    inf: PRACTICE ? 0 : Math.min(meta.inf || 0, meta.infMax || 0),
    endless: false,
    clean: cleanRun(),
    practice: !!PRACTICE,
    tw: PRACTICE ? {} : Object.assign({}, meta.twists || {}),
  };
  RUN.jobN = [3, 7, 12, pick([9, 13])];
  {
    const sh = a => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    RUN.gunPath = sh(GUN_PATH.slice(0, 3)).concat(sh(GUN_PATH.slice(3)));
  }
  /* the cases come in a different order each run, light guns before heavy */ RUN.aboard = [];
  RUN.lost = [];
  RUN.nextBud = null;
  RUN.voice = 'Reyes';
  RUN.favours = 0;
  RUN.metrics = {
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
  clearTimeout(hintTO);
  hintTO = setTimeout(() => $('hint').classList.remove('show'), 9000);
  $('hud').hidden = false;
  $('bossBox').hidden = true;
  renderMods();
  state = 'play';
  updateHint();
  setMuted(muted);
  if (PK().start && !RUN.practice)
    later.push({
      t: 0.4,
      fn: () => {
        if (state === 'play') offerUpgrades('start');
      },
    });
}
function renderPauseGuns() {
  // every gun you carry, the key that draws it, and what it eats
  const el = $('pGuns');
  if (!el || !P) return;
  const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  let h = P.owned
    .map((g, i) => {
      const G = GUNS[g],
        am = G.ammo
          ? `${Math.floor(P.mag[g] ?? 0)} · ${Math.floor(P.ammo[G.ammo] || 0)} ${AMMO_NAME[G.ammo] || ''}`
          : `${Math.floor(P.mag[g] ?? 0)} · unlimited`;
      return `<div class="g${g === P.gun ? ' on' : ''}"><kbd>${i < 9 ? i + 1 : '·'}</kbd><span class="n"><b>${esc(G.name)}</b><i>${esc(am)}</i></span></div>`;
    })
    .join('');
  if (!RUN.endless) {
    const nx = Object.keys(WEAPON_NIGHTS)
      .map(Number)
      .filter(n => n > wave)
      .sort((a, b) => a - b)[0];
    const left = nextGuns().length;
    h += `<div class="next">${nx && left ? (nightDone && nx === wave + 1 ? 'A weapon case comes down this dawn' : `Next weapon case: at dawn after night ${nx - 1}`) : 'No more weapon cases this run'} · tap Q for your last gun, hold Q for the wheel</div>`;
  }
  el.innerHTML = h;
}
