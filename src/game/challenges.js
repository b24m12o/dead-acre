/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { saveMeta } from '../core/settings.js';
import { sfx } from '../audio/sfx.js';
import { showStreak } from '../ui/callouts.js';
import { DISTRICTS } from './districts.js';
// Challenges come in families: one goal, tiers I, II and III further along it. Each tier is its own entry with its own
// id (the save only stores which ids are done), so the ids things are gated on (a perk's req, a district's lock) stay
// as they were. Rewards: scrap, and for some tiers an Armory perk to buy, a district, or a starting loadout.
const ROM = ['I', 'II', 'III'];
const fmt = n => n.toLocaleString('en-US');
function fam(grp, name, stat, desc, hint, tiers) {
  return tiers.map(([id, goal, scrap, unlock], i) => ({
    id,
    grp,
    fam: name,
    stat,
    goal,
    scrap,
    unlock,
    tier: i + 1,
    of: tiers.length,
    name: tiers.length > 1 ? `${name} ${ROM[i]}` : name,
    desc: desc(goal),
    hint,
  }));
}
const pl = (n, one, many) => (n === 1 ? one : many.replace('#', fmt(n)));
export const CHAL = [
  // ---- killing ----
  ...fam('Killing', 'Exterminator', 'kills', g => `Kill ${fmt(g)} zombies`, '', [
    ['k100', 100, 50],
    ['k1000', 1000, 100, 'Laser Sight'],
    ['k10000', 10000, 250],
  ]),
  ...fam(
    'Killing',
    'Headhunter',
    'heads',
    g => `Pop ${fmt(g)} heads with critical hits`,
    'A critical hit that kills a zombie can take its head off.',
    [
      ['heads50', 50, 80],
      ['heads250', 250, 75, 'Sharpshooter loadout'],
      ['heads1000', 1000, 150],
    ]
  ),
  ...fam(
    'Killing',
    'Meat grinder',
    'bestChain',
    g => `Reach a ${fmt(g)}-kill chain`,
    'Keep killing without a 2.4 s pause; the chain shows next to your score.',
    [
      ['chain50', 50, 60],
      ['chain150', 150, 75],
      ['chain300', 300, 150],
    ]
  ),
  ...fam(
    'Killing',
    'Arsonist',
    'fire',
    g => `Burn ${fmt(g)} zombies`,
    'Molotovs, incendiary rounds, burning cars and fuel pumps all count.',
    [
      ['fire100', 100, 120, 'Molotov Start'],
      ['fire500', 500, 100],
      ['fire2000', 2000, 200],
    ]
  ),
  ...fam(
    'Killing',
    'Road rage',
    'cars',
    g => `Blow up ${fmt(g)} cars`,
    'Shoot a wrecked car until it catches fire and blows.',
    [
      ['cars10', 10, 80],
      ['cars50', 50, 100, 'Demolition loadout'],
    ]
  ),
  // ---- weapons ----
  ...fam('Weapons', 'Sidearm', 'pistol', g => `${fmt(g)} kills with the pistol or SMG`, '', [
    ['pistol300', 300, 100, 'Compensator'],
    ['pistol1500', 1500, 125],
  ]),
  ...fam('Weapons', 'Buckshot', 'shotgun', g => `${fmt(g)} kills with shotguns`, '', [
    ['shotgun300', 300, 100, ['Drum Magazines', 'Door Kicker loadout']],
    ['shotgun1500', 1500, 125],
  ]),
  ...fam(
    'Weapons',
    'Rifleman',
    'rifle',
    g => `${fmt(g)} kills with rifles`,
    'Assault Rifle, Hunting Rifle and Machine Gun all count.',
    [
      ['rifle300', 300, 100, 'Steel-Core Ammo'],
      ['rifle1500', 1500, 125, 'Patrol loadout'],
    ]
  ),
  // ---- traps ----
  ...fam(
    'Traps',
    'Minefield',
    'trapKills',
    g => `Kill ${fmt(g)} zombies in the blast of a land mine, gas drum or rigged car you set`,
    "The dawn kit brings traps; set the one you hold with F. Claymores and the fire after a blast don't count.",
    [
      ['trap50', 50, 100, 'Trapper loadout'],
      ['trap250', 250, 100],
      ['trap1000', 1000, 200],
    ]
  ),
  ...fam(
    'Traps',
    'Car bomb',
    'rigs',
    g => pl(g, 'Set off a rigged car', 'Set off # rigged cars'),
    'Use a car rig by a parked car; the next hit blows it big.',
    [
      ['rig5', 5, 100],
      ['rig25', 25, 125],
    ]
  ),
  // ---- survival ----
  ...fam('Survival', 'Long night', 'maxNight', g => `Survive night ${g}`, '', [['night10', 10, 100]]),
  ...fam(
    'Survival',
    'Untouchable',
    'flawless',
    g => `Get through ${fmt(g)} nights without a scratch`,
    'Clear a whole night without taking any damage.',
    [
      ['flawless3', 3, 120],
      ['flawless10', 10, 150],
    ]
  ),
  ...fam(
    'Survival',
    'Odd jobs',
    'objs',
    g => `Complete ${fmt(g)} Channel 9 jobs`,
    'On a few dawns Channel 9 offers a job for the night. Take one instead of lying low.',
    [
      ['obj10', 10, 120, 'Trauma Training'],
      ['obj30', 30, 150],
    ]
  ),
  ...fam('Survival', 'Good Samaritan', 'rescues', g => `Rescue ${fmt(g)} survivors`, '', [
    ['rescue5', 5, 120, 'Buddy System loadout'],
    ['rescue12', 12, 150],
  ]),
  ...fam(
    'Survival',
    'Hold the house',
    'sieges',
    g => pl(g, 'Hold the house through a siege', 'Hold the house through # sieges'),
    'When Channel 9 calls in survivors under siege, bar yourself into the big ruin with them and keep them alive till dawn.',
    [
      ['siege1', 1, 120],
      ['siege5', 5, 125],
    ]
  ),
  ...fam('Survival', 'Full house', 'siegeAll', () => 'Hold the house through a siege with every survivor alive', '', [
    ['siegeAll', 1, 100],
  ]),
  ...fam('Survival', 'Veteran', 'maxLevel', g => `Reach level ${g} in one run`, '', [
    ['lv20', 20, 150],
    ['lv30', 30, 150],
  ]),
  // ---- bosses and hordes ----
  ...fam(
    'Bosses and hordes',
    'Giant slayer',
    'bosses',
    g => pl(g, 'Kill a district boss', 'Kill # bosses'),
    'A boss comes every fifth night.',
    [
      ['boss1', 1, 100],
      ['boss5', 5, 125, 'Heavy Weapons loadout'],
      ['boss15', 15, 250],
    ]
  ),
  ...fam('Bosses and hordes', 'Breakwater', 'hordes', g => pl(g, 'Wipe out a whole horde', 'Wipe out # hordes'), '', [
    ['horde1', 1, 120],
    ['horde5', 5, 150],
    ['horde20', 20, 250],
  ]),
  ...fam('Bosses and hordes', 'Riptide', 'hordeBest', g => `Reach a ${g} chain against a horde`, '', [
    ['hchain100', 100, 100],
  ]),
  ...fam(
    'Bosses and hordes',
    'Last stand',
    'hmBest',
    g => `Clear wave ${g} in Horde Mode`,
    'Horde Mode opens on the menu once you have wiped out a horde.',
    [
      ['hm5', 5, 120],
      ['hm10', 10, 125],
      ['hm20', 20, 250],
    ]
  ),
  // ---- evac ----
  ...fam(
    'Evac',
    'Get to the chopper',
    'evacs',
    g => pl(g, 'Make the evac on night 15', 'Make the evac # times'),
    'Survive all 15 nights, then reach the chopper.',
    [
      ['evac1', 1, 300],
      ['evac5', 5, 200],
    ]
  ),
  ...fam('Evac', 'Door gunner', 'gunner', g => `${fmt(g)} kills from the helicopter's door gun`, '', [
    ['gun100', 100, 150],
    ['gun400', 400, 200],
  ]),
  ...fam(
    'Evac',
    'Nobody left behind',
    'rideAll',
    () => 'Bring every survivor on the ride out through alive',
    'Keep the door gun on the dead around each group until the chopper has passed.',
    [['rideAll', 1, 125]]
  ),
  ...fam(
    'Evac',
    'Carrier',
    'bestInf',
    g => `Make the evac on Infection ${g}`,
    'Each evac opens the next Infection level; pick Infection 5 before you set out.',
    [['inf5', 5, 150]]
  ),
  ...fam(
    'Evac',
    'Tour guide',
    'evacDistricts',
    () => 'Make the evac from all three places',
    'The campaign ends at Hollow Hill: play One location for Dead Acre and Route 9.',
    [['evac3', 3, 250]]
  ),
];
const UNLOCK_KIND = {
  'Laser Sight': ['perk', 'Laser Sight'],
  Compensator: ['perk', 'Compensator'],
  'Drum Magazines': ['perk', 'Drum Magazines'],
  'Steel-Core Ammo': ['perk', 'Steel-Core Ammo'],
  'Trauma Training': ['perk', 'Trauma Training'],
  'Molotov Start': ['perk', 'Molotov Start'],
  'Route 9': ['district', 'Route 9'],
  'Hollow Hill': ['district', 'Hollow Hill'],
  'Sharpshooter loadout': ['loadout', 'Sharpshooter'],
  'Door Kicker loadout': ['loadout', 'Door Kicker'],
  'Patrol loadout': ['loadout', 'Patrol'],
  'Heavy Weapons loadout': ['loadout', 'Heavy Weapons'],
  'Trapper loadout': ['loadout', 'Trapper'],
  'Demolition loadout': ['loadout', 'Demolition'],
  'Buddy System loadout': ['loadout', 'Buddy System'],
};
const unlocks = c => [].concat(c.unlock || []).filter(u => UNLOCK_KIND[u]);
export let gearLockedBy = () => []; // the level-up gear a challenge teaches (set up in upgrades.js, which knows the picks)
export function setGearLocks(fn) {
  gearLockedBy = fn;
}
function rewardChips(c) {
  let h = `<span class="tag t-scrap">+${c.scrap} scrap</span>`;
  for (const u of unlocks(c)) {
    const [k, n] = UNLOCK_KIND[u];
    h += `<span class="tag t-${k}">${k}: ${n}</span><span class="note">${k === 'perk' ? 'then buy it in the Armory' : k === 'loadout' ? 'take it from the Armory' : 'pick it when you choose where to fight'}</span>`;
  }
  for (const n of gearLockedBy(c.id))
    h += `<span class="tag t-perk">gear: ${n}</span><span class="note">it can turn up in level-up picks</span>`;
  return h;
}
function renderChalScreen() {
  checkChal(true);
  const done = CHAL.filter(c => chalDone(c.id)).length,
    open = CHAL.filter(c => !chalDone(c.id) && (c.tier === 1 || chalDone(CHAL[CHAL.indexOf(c) - 1].id))).sort(
      (a, b) => chalValue(b) / b.goal - chalValue(a) / a.goal
    );
  $('chalSum').innerHTML =
    `<b>${done}</b> of <b>${CHAL.length}</b> done${open.length ? ` · closest: <b>${open[0].name}</b> (${Math.floor(Math.min(1, chalValue(open[0]) / open[0].goal) * 100)}%)` : ' · all done!'}`;
  const groups = [...new Set(CHAL.map(c => c.grp))],
    fams = [...new Set(CHAL.map(c => c.fam))];
  $('chalList').innerHTML = groups
    .map(
      g =>
        `<div class="chal-grp">${g}</div><div class="chal-grid">` +
        fams
          .filter(f => CHAL.find(c => c.fam === f).grp === g)
          .map(f => {
            const T = CHAL.filter(c => c.fam === f),
              c = T.find(t => !chalDone(t.id)) || T[T.length - 1], // the tier you're working on, or the last one
              all = T.every(t => chalDone(t.id)),
              v = Math.min(c.goal, chalValue(c)),
              pips =
                T.length > 1
                  ? `<span class="tiers">${T.map(t => `<i class="${chalDone(t.id) ? 'on' : ''}">${ROM[t.tier - 1]}</i>`).join('')}</span>`
                  : '';
            return `<div class="ch${all ? ' done' : ''}"><span class="nm">${c.name}${pips}</span><span class="how">${c.desc}.${c.hint ? ' ' + c.hint : ''}</span><span class="bar"><i style="width:${(v / c.goal) * 100}%"></i></span><span class="num">${fmt(v)} / ${fmt(c.goal)}</span><span class="rw">${all ? '<span class="tag t-scrap">All tiers done</span>' : rewardChips(c)}</span></div>`;
          })
          .join('') +
        '</div>'
    )
    .join('');
}
export function openChal(from) {
  chalFrom = from;
  ['menu', 'hangar', 'over'].forEach(id => ($(id).hidden = true));
  renderChalScreen();
  $('chal').hidden = false;
  $('chalBack').focus({ preventScroll: true });
}
export let chalFrom = 'menu',
  chalAtStart = {};
export function snapChal() {
  chalAtStart = {};
  for (const c of CHAL) chalAtStart[c.id] = chalValue(c);
}
export function chalRunSummary() {
  const live = c => c.tier === 1 || chalDone(CHAL[CHAL.indexOf(c) - 1].id) || chalDone(c.id), // a tier counts once the one before it is done
    moved = CHAL.filter(
      c =>
        live(c) &&
        !(chalAtStart[c.id] >= c.goal) &&
        chalValue(c) > (chalAtStart[c.id] || 0) &&
        (chalDone(c.id) || !CHAL.some(o => o !== c && o.fam === c.fam && o.tier < c.tier && !chalDone(o.id)))
    )
      .filter((c, i, A) => !A.some(o => o.fam === c.fam && o.tier > c.tier)) // one line per family: the furthest tier that moved
      .sort((a, b) => chalDone(b.id) - chalDone(a.id) || chalValue(b) / b.goal - chalValue(a) / a.goal)
      .slice(0, 4);
  if (!moved.length) return '';
  return (
    '<div class="sec" style="margin:0 0 4px">Challenge progress this run</div>' +
    moved
      .map(c =>
        chalDone(c.id)
          ? `<div class="ok">✓ <b>${c.name}</b> complete · +${c.scrap} scrap${unlocks(c).length ? ' · ' + unlocks(c).join(', ') + ' unlocked' : ''}</div>`
          : `<div><b>${c.name}</b> · ${Math.min(c.goal, chalValue(c)).toLocaleString()} / ${c.goal.toLocaleString()} (+${(chalValue(c) - (chalAtStart[c.id] || 0)).toLocaleString()} this run)</div>`
      )
      .join('')
  );
}
// starting loadouts, earned from challenges: what you carry into night 1 besides the pistol. One at a time
export const LOADOUTS = {
  std: { name: 'Standard Issue', desc: 'The pistol, and whatever the nights give you.' },
  sharp: { name: 'Sharpshooter', gun: 'hunter', req: 'heads250' },
  kicker: { name: 'Door Kicker', gun: 'shotgun', req: 'shotgun300' },
  patrol: { name: 'Patrol', gun: 'rifle', req: 'rifle1500' },
  heavy: { name: 'Heavy Weapons', gun: 'lmg', req: 'boss5' },
  trapper: {
    name: 'Trapper',
    traps: { mine: 2, noise: 1 },
    desc: 'Start with 2 mines and a noise maker.',
    req: 'trap50',
  },
  demo: {
    name: 'Demolition',
    traps: { drum: 2, rig: 1 },
    desc: 'Start with 2 gas drums and a car rig.',
    req: 'cars50',
  },
  buddy: { name: 'Buddy System', buddy: true, desc: 'Start with one survivor in your backup.', req: 'rescue5' },
};
export const loadoutOpen = id => Object.hasOwn(LOADOUTS, id) && (!LOADOUTS[id].req || chalDone(LOADOUTS[id].req));
function chalDoneSafe(chal, id) {
  return !!(chal && chal[id] === true);
}
export function stat(k) {
  GS.meta.stats = GS.meta.stats || {};
  return GS.meta.stats[k] || 0;
}
export function bump(k, v = 1) {
  if (GS.RUN && GS.RUN.practice) return;
  GS.meta.stats = GS.meta.stats || {};
  GS.meta.stats[k] = (GS.meta.stats[k] || 0) + v;
}
export function statMax(k, v) {
  if (GS.RUN && GS.RUN.practice) return;
  GS.meta.stats = GS.meta.stats || {};
  GS.meta.stats[k] = Math.max(GS.meta.stats[k] || 0, v);
}
function chalValue(c) {
  return c.stat === 'evacDistricts' ? Object.keys(GS.meta.evacDist || {}).length : stat(c.stat);
}
export let chalDone;
export function checkChal(quiet) {
  if (GS.RUN && GS.RUN.practice) return;
  GS.meta.chal = GS.meta.chal || {};
  let any = false;
  for (const c of CHAL)
    if (!GS.meta.chal[c.id] && chalValue(c) >= c.goal) {
      GS.meta.chal[c.id] = true;
      GS.meta.seeds += c.scrap;
      any = true;
      if (!quiet) {
        const u = unlocks(c).map(x => UNLOCK_KIND[x]);
        showStreak(
          'Challenge complete',
          `${c.name} · +${c.scrap} scrap${u.map(([k, n]) => ' · new ' + k + ': ' + n).join('')}`
        );
        sfx.elite();
      }
    }
  if (any) saveMeta();
}
export let districtOpen;

/* ---------- per-night state ---------- */

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  // Reject missing, misspelled or still-locked outfits from older/corrupt local saves.
  if (
    !Object.hasOwn(LOADOUTS, GS.meta.loadout) ||
    (LOADOUTS[GS.meta.loadout].req && !chalDoneSafe(GS.meta.chal, LOADOUTS[GS.meta.loadout].req))
  )
    GS.meta.loadout = 'std';
  delete GS.meta.outfit; // outfits are gone: loadouts took their place
  if (GS.meta.hm && GS.meta.hm.wave > stat('hmBest')) {
    GS.meta.stats = GS.meta.stats || {};
    GS.meta.stats.hmBest = GS.meta.hm.wave;
  } // Horde Mode records from before Last stand existed count for it
  chalDone = id => !!(GS.meta.chal && GS.meta.chal[id]);
  districtOpen = d => !DISTRICTS[d].lock || stat('reached') >= DISTRICTS[d].camp || chalDone(DISTRICTS[d].lock); // reached in the campaign (or opened the old way, by a challenge, before there was one)
}

// what a locked thing asks of you: the challenge's name and what it takes
export function lockLine(id) {
  const c = CHAL.find(c => c.id === id);
  return c ? `Locked · earn it with ${c.name} (${c.desc.charAt(0).toLowerCase() + c.desc.slice(1)})` : '';
}
