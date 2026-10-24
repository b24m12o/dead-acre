/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const CHAL = [
  { id: 'k100', name: 'First blood', desc: 'Kill 100 zombies', stat: 'kills', goal: 100, scrap: 50 },
  {
    id: 'k1000',
    name: 'Exterminator',
    desc: 'Kill 1,000 zombies',
    stat: 'kills',
    goal: 1000,
    scrap: 200,
    unlock: 'Laser Sight',
  },
  {
    id: 'heads50',
    name: 'Headhunter',
    desc: 'Pop 50 heads with critical hits',
    stat: 'heads',
    goal: 50,
    scrap: 80,
    unlock: 'Bloodstained outfit',
  },
  {
    id: 'pistol300',
    name: 'Sidearm',
    desc: '300 kills with the pistol or SMG',
    stat: 'pistol',
    goal: 300,
    scrap: 100,
    unlock: 'Compensator',
  },
  {
    id: 'shotgun300',
    name: 'Buckshot',
    desc: '300 kills with shotguns',
    stat: 'shotgun',
    goal: 300,
    scrap: 100,
    unlock: 'Drum Magazines',
  },
  {
    id: 'rifle300',
    name: 'Marksman',
    desc: '300 kills with rifles',
    stat: 'rifle',
    goal: 300,
    scrap: 100,
    unlock: 'Steel-Core Ammo',
  },
  { id: 'boss1', name: 'Giant slayer', desc: 'Kill a district boss', stat: 'bosses', goal: 1, scrap: 100 },
  {
    id: 'night10',
    name: 'Long night',
    desc: 'Survive to night 10',
    stat: 'maxNight',
    goal: 10,
    scrap: 100,
    unlock: 'Route 9',
  },
  {
    id: 'evac1',
    name: 'Get to the chopper',
    desc: 'Make the evac on night 15',
    stat: 'evacs',
    goal: 1,
    scrap: 300,
    unlock: 'Hollow Hill',
  },
  {
    id: 'obj10',
    name: 'Odd jobs',
    desc: 'Complete 10 Channel 9 jobs',
    stat: 'objs',
    goal: 10,
    scrap: 120,
    unlock: 'Trauma Training',
  },
  {
    id: 'rescue5',
    name: 'Good Samaritan',
    desc: 'Rescue 5 survivors',
    stat: 'rescues',
    goal: 5,
    scrap: 120,
    unlock: 'Hazmat outfit',
  },
  { id: 'cars10', name: 'Road rage', desc: 'Blow up 10 cars', stat: 'cars', goal: 10, scrap: 80 },
  {
    id: 'fire100',
    name: 'Arsonist',
    desc: 'Burn 100 zombies',
    stat: 'fire',
    goal: 100,
    scrap: 120,
    unlock: 'Molotov Start',
  },
  {
    id: 'flawless3',
    name: 'Untouchable',
    desc: 'Get through 3 nights without a scratch',
    stat: 'flawless',
    goal: 3,
    scrap: 120,
    unlock: 'Night camo outfit',
  },
  { id: 'chain150', name: 'Meat grinder', desc: 'Reach a 150-kill chain', stat: 'bestChain', goal: 150, scrap: 150 },
  { id: 'lv20', name: 'Veteran', desc: 'Reach level 20 in one run', stat: 'maxLevel', goal: 20, scrap: 150 },
  {
    id: 'inf5',
    name: 'Carrier',
    desc: 'Make the evac on Infection 5',
    stat: 'bestInf',
    goal: 5,
    scrap: 300,
    unlock: 'Gilded outfit',
  },
  {
    id: 'evac3',
    name: 'Tour guide',
    desc: 'Make the evac in all three districts',
    stat: 'evacDistricts',
    goal: 3,
    scrap: 500,
    unlock: 'Convoy outfit',
  },
  {
    id: 'boss5',
    name: 'Horde breaker',
    desc: 'Kill 5 bosses',
    stat: 'bosses',
    goal: 5,
    scrap: 250,
    unlock: 'Guardsman outfit',
  },
];
const CHAL_CAT = {
  k100: 'Killing',
  k1000: 'Killing',
  heads50: 'Killing',
  chain150: 'Killing',
  fire100: 'Killing',
  cars10: 'Killing',
  pistol300: 'Weapons',
  shotgun300: 'Weapons',
  rifle300: 'Weapons',
  boss1: 'Survival',
  night10: 'Survival',
  flawless3: 'Survival',
  lv20: 'Survival',
  obj10: 'Survival',
  rescue5: 'Survival',
  evac1: 'Evac',
  inf5: 'Evac',
  evac3: 'Evac',
  boss5: 'Survival',
};
const UNLOCK_KIND = {
  'Laser Sight': ['perk', 'Laser Sight'],
  Compensator: ['perk', 'Compensator'],
  'Drum Magazines': ['perk', 'Drum Magazines'],
  'Steel-Core Ammo': ['perk', 'Steel-Core Ammo'],
  'Trauma Training': ['perk', 'Trauma Training'],
  'Molotov Start': ['perk', 'Molotov Start'],
  'Bloodstained outfit': ['outfit', 'Bloodstained'],
  'Hazmat outfit': ['outfit', 'Hazmat'],
  'Night camo outfit': ['outfit', 'Night camo'],
  'Gilded outfit': ['outfit', 'Gilded'],
  'Route 9': ['district', 'Route 9'],
  'Hollow Hill': ['district', 'Hollow Hill'],
  'Guardsman outfit': ['outfit', 'Guardsman'],
  'Convoy outfit': ['outfit', 'Convoy'],
};
const CHAL_HINT = {
  boss5: 'A boss comes every fifth night.',
  heads50: 'A critical hit that kills a zombie can take its head off.',
  flawless3: 'Clear a whole night without taking any damage.',
  chain150: 'Keep killing without a 2.4 s pause; the chain shows next to your score.',
  obj10: 'On a few dawns Channel 9 offers a job for the night. Take one instead of lying low.',
  fire100: 'Molotovs, incendiary rounds, burning cars and fuel pumps all count.',
  cars10: 'Shoot a wrecked car until it catches fire and blows.',
  evac1: 'Survive all 15 nights, then reach the chopper.',
  inf5: 'Pick Infection 5 when you choose where to fight, before the run.',
  rifle300: 'Assault Rifle, Hunting Rifle and Machine Gun all count.',
};
function rewardChips(c) {
  let h = `<span class="tag t-scrap">+${c.scrap} scrap</span>`;
  if (c.unlock && UNLOCK_KIND[c.unlock]) {
    const [k, n] = UNLOCK_KIND[c.unlock];
    h += `<span class="tag t-${k}">${k}: ${n}</span><span class="note">${k === 'perk' ? 'then buy it in the Armory' : k === 'outfit' ? 'wear it from the Armory' : 'pick it when you choose where to fight'}</span>`;
  }
  return h;
}
function renderChalScreen() {
  checkChal(true);
  const done = CHAL.filter(c => chalDone(c.id)).length,
    open = CHAL.filter(c => !chalDone(c.id)).sort((a, b) => chalValue(b) / b.goal - chalValue(a) / a.goal);
  $('chalSum').innerHTML =
    `<b>${done}</b> of <b>${CHAL.length}</b> done${open.length ? ` · closest: <b>${open[0].name}</b> (${Math.floor(Math.min(1, chalValue(open[0]) / open[0].goal) * 100)}%)` : ' · all done!'}`;
  const groups = ['Killing', 'Weapons', 'Survival', 'Evac'];
  $('chalList').innerHTML = groups
    .map(
      g =>
        `<div class="chal-grp">${g}</div><div class="chal-grid">` +
        CHAL.filter(c => CHAL_CAT[c.id] === g)
          .map(c => {
            const v = Math.min(c.goal, chalValue(c)),
              ok = chalDone(c.id);
            return `<div class="ch${ok ? ' done' : ''}"><span class="nm">${c.name}</span><span class="how">${c.desc}.${CHAL_HINT[c.id] ? ' ' + CHAL_HINT[c.id] : ''}</span><span class="bar"><i style="width:${(v / c.goal) * 100}%"></i></span><span class="num">${v.toLocaleString()} / ${c.goal.toLocaleString()}</span><span class="rw">${rewardChips(c)}</span></div>`;
          })
          .join('') +
        '</div>'
    )
    .join('');
}
function openChal(from) {
  chalFrom = from;
  ['menu', 'hangar', 'over'].forEach(id => ($(id).hidden = true));
  renderChalScreen();
  $('chal').hidden = false;
  $('chalBack').focus({ preventScroll: true });
}
let chalFrom = 'menu',
  chalAtStart = {};
function snapChal() {
  chalAtStart = {};
  for (const c of CHAL) chalAtStart[c.id] = chalValue(c);
}
function chalRunSummary() {
  const moved = CHAL.filter(c => !(chalAtStart[c.id] >= c.goal) && chalValue(c) > (chalAtStart[c.id] || 0))
    .sort((a, b) => chalDone(b.id) - chalDone(a.id) || chalValue(b) / b.goal - chalValue(a) / a.goal)
    .slice(0, 4);
  if (!moved.length) return '';
  return (
    '<div class="sec" style="margin:0 0 4px">Challenge progress this run</div>' +
    moved
      .map(c =>
        chalDone(c.id)
          ? `<div class="ok">✓ <b>${c.name}</b> complete · +${c.scrap} scrap${c.unlock ? ' · ' + c.unlock + ' unlocked' : ''}</div>`
          : `<div><b>${c.name}</b> · ${Math.min(c.goal, chalValue(c)).toLocaleString()} / ${c.goal.toLocaleString()} (+${(chalValue(c) - (chalAtStart[c.id] || 0)).toLocaleString()} this run)</div>`
      )
      .join('')
  );
}
const OUTFITS = {
  std: { name: 'Standard issue', tint: [1, 1, 1] },
  night: { name: 'Night camo', tint: [0.5, 0.56, 0.68], req: 'flawless3' },
  blood: { name: 'Bloodstained', tint: [1.15, 0.55, 0.5], req: 'heads50' },
  hazmat: { name: 'Hazmat', tint: [1.3, 1.18, 0.4], req: 'rescue5' },
  gold: { name: 'Gilded', tint: [1.4, 1.12, 0.5], req: 'inf5' },
  guard: { name: 'Guardsman', tint: [0.78, 0.88, 0.7], req: 'boss5' },
  convoy: { name: 'Convoy', tint: [0.62, 0.62, 0.58], req: 'evac3' },
};
// Reject missing, misspelled or still-locked outfits from older/corrupt local saves.
if (!OUTFITS[meta.outfit] || (OUTFITS[meta.outfit].req && !chalDoneSafe(meta.chal, OUTFITS[meta.outfit].req)))
  meta.outfit = 'std';
function chalDoneSafe(chal, id) {
  return !!(chal && chal[id] === true);
}
function stat(k) {
  meta.stats = meta.stats || {};
  return meta.stats[k] || 0;
}
function bump(k, v = 1) {
  if (RUN && RUN.practice) return;
  meta.stats = meta.stats || {};
  meta.stats[k] = (meta.stats[k] || 0) + v;
}
function statMax(k, v) {
  if (RUN && RUN.practice) return;
  meta.stats = meta.stats || {};
  meta.stats[k] = Math.max(meta.stats[k] || 0, v);
}
function chalValue(c) {
  return c.stat === 'evacDistricts' ? Object.keys(meta.evacDist || {}).length : stat(c.stat);
}
const chalDone = id => !!(meta.chal && meta.chal[id]);
function checkChal(quiet) {
  if (RUN && RUN.practice) return;
  meta.chal = meta.chal || {};
  let any = false;
  for (const c of CHAL)
    if (!meta.chal[c.id] && chalValue(c) >= c.goal) {
      meta.chal[c.id] = true;
      meta.seeds += c.scrap;
      any = true;
      if (!quiet) {
        const u = c.unlock && UNLOCK_KIND[c.unlock];
        showStreak('Challenge complete', `${c.name} · +${c.scrap} scrap${u ? ' · new ' + u[0] + ': ' + u[1] : ''}`);
        sfx.elite();
      }
    }
  if (any) saveMeta();
}
const districtOpen = d => !DISTRICTS[d].lock || chalDone(DISTRICTS[d].lock);

/* ---------- per-night state ---------- */
