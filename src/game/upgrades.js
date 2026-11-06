/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, rand } from '../core/util.js';
import { GUNS, GUN_DESC } from './arsenal.js';
import { sfx } from '../audio/sfx.js';
import { LV, S, addAmmo, giveGun, magSize } from './state.js';
import { KITS, kitPicks } from './kits.js';
import { hideCallouts, showStreak } from '../ui/callouts.js';
import { AB } from './abilities.js';
import { updateHint } from '../ui/settings-ui.js';
import { HLOOK } from '../render/draw-player.js';
import { NPC_TINTS, TRAITS, budSetup, makeSurvivor, rollBud } from '../actors/backups.js';
import { FAVOURS } from './objectives.js';
import { chalDone, setGearLocks, statMax } from './challenges.js';
import { PERK_ICONS, perkIcon } from '../ui/perk-icons.js';
import { icon as gunIcon, iconId } from '../ui/icons.js';
import { need } from './run.js';
const DMG_STEP = [1.25, 1.22, 1.18, 1.15, 1.12, 1.1],
  RATE_STEP = [1.18, 1.15, 1.12, 1.1, 1.08, 1.06]; // each rank of these two adds a little less than the last: strong early, no runaway late
export const UP = [
  {
    id: 'dmg',
    short: () => `+${Math.round((DMG_STEP[LV.dmg || 0] - 1) * 100)}% damage with every gun`,
    have: () =>
      `+${Math.round((DMG_STEP.slice(0, LV.dmg || 0).reduce((a, k) => a * k, 1) - 1) * 100)}% damage with every gun.`,
    cat: 'Gun mod',
    name: 'Hollow Points',
    desc: () => `+${Math.round((DMG_STEP[LV.dmg || 0] - 1) * 100)}% damage.`,
    max: 6,
    apply() {
      S.dmg *= DMG_STEP[(LV.dmg || 1) - 1];
    },
  },
  {
    id: 'rate',
    short: () => `Every gun fires ${Math.round((RATE_STEP[LV.rate || 0] - 1) * 100)}% faster`,
    have: () =>
      `Every gun fires ${Math.round((RATE_STEP.slice(0, LV.rate || 0).reduce((a, k) => a * k, 1) - 1) * 100)}% faster.`,
    cat: 'Gun mod',
    name: 'Light Trigger',
    desc: () => `+${Math.round((RATE_STEP[LV.rate || 0] - 1) * 100)}% fire rate.`,
    max: 6,
    apply() {
      S.rate *= RATE_STEP[(LV.rate || 1) - 1];
    },
  },
  {
    id: 'multi',
    short: 'Each trigger pull fires one more round',
    cat: 'Gun mod',
    name: 'Burst Fire',
    desc: 'Every trigger pull fires one more round right behind the first (40%, then 30%, then 25% damage). Shotguns load two more pellets.',
    max: 3,
    apply() {
      S.shots++;
    },
  },
  {
    id: 'pierce',
    short: 'Each round goes through one more zombie',
    cat: 'Gun mod',
    name: 'AP Rounds',
    desc: 'Shots punch through one more body.',
    max: 3,
    apply() {
      S.pierce++;
    },
  },
  {
    id: 'bounce',
    short: 'Rounds bounce off to hit another zombie',
    cat: 'Gun mod',
    name: 'Ricochet',
    desc: 'A round that stops in a zombie or hits a wall glances off toward the next zombie nearby. One more ricochet per level.',
    max: 3,
    apply() {
      S.bounce++;
    },
  },
  {
    id: 'frag',
    short: 'Hits also wound the zombies next to your target',
    cat: 'Gun mod',
    name: 'Frangible Rounds',
    desc: 'Rounds break apart on impact and wound the zombies next to your target.',
    max: 3,
    apply() {
      S.frag++;
    },
  },
  {
    id: 'crit',
    short: '+10% crit chance; crits do 2.5× damage',
    cat: 'Gun mod',
    name: 'Red Dot Sight',
    desc: '+10% critical chance. Crits hit for 2.5×.',
    max: 4,
    apply() {
      S.crit += 0.1;
    },
  },
  {
    id: 'arc',
    short: 'Your hits can set zombies on fire',
    cat: 'Gun mod',
    name: 'Incendiary Rounds',
    desc: 'Hits can set zombies on fire. Burning zombies spread it.',
    max: 3,
    apply() {
      S.arc++;
    },
  },
  {
    id: 'choke',
    short: 'Shotgun: tighter spread, reaches 25% further',
    cat: 'Gun mod',
    name: 'Tight Choke',
    desc: 'Shotgun: tighter spread and 25% more range.',
    max: 3,
    only: ['shotgun', 'auto'],
    apply() {
      S.spreadK *= 0.78;
      S.rangeK *= 1.25;
    },
  },
  {
    id: 'quiet',
    short: 'Pistol, SMG and rifle are heard half as far',
    cat: 'Gun mod',
    name: 'Suppressor',
    only: ['pistol', 'smg', 'rifle'],
    desc: 'Pistol, SMG and assault rifle shots carry less than half as far, so fewer of the dead hear you coming.',
    max: 1,
    apply() {
      S.quiet = 1;
    },
  },
  {
    id: 'ambush',
    short: "+80% damage to zombies that haven't seen you",
    cat: 'Gun mod',
    name: 'Ambush',
    desc: '+80% damage to zombies that have not noticed you yet, are dazed or are down.',
    max: 1,
    apply() {
      S.ambush = 1;
    },
  },
  {
    id: 'reload',
    short: 'Reload 30% faster',
    cat: 'Gun mod',
    name: 'Fast Hands',
    desc: 'Reload 30% faster.',
    max: 3,
    apply() {
      S.reloadK *= 1.3;
    },
  },
  {
    id: 'mags',
    short: '35% bigger magazines, 25% more ammo carried',
    cat: 'Gun mod',
    name: 'Extended Mags',
    desc: '+35% magazine size, +25% ammo carried, and a box of ammo now.',
    max: 3,
    apply() {
      S.magK *= 1.35;
      S.ammoK *= 1.25;
      addAmmo(1);
    },
  },
  {
    id: 'darts',
    short: 'Throws a pipe bomb into a crowd every 2.5 s',
    cat: 'Gear',
    name: 'Pipe Bombs',
    desc: 'Toss a homemade pipe bomb into the crowd every 2.5 s. One more per level.',
    max: 4,
    apply() {
      S.darts++;
    },
  },
  {
    id: 'pulse',
    short: 'Throws a stun grenade at the nearest crowd every 4 s',
    cat: 'Gear',
    name: 'Stun Grenades',
    desc: 'Every 4 s toss a stun grenade into the nearest crowd: it dazes the dead, knocks them back and clears their spit.',
    max: 3,
    apply() {
      S.pulse++;
    },
  },
  {
    id: 'molotov',
    short: 'Throws a firebomb at the biggest crowd every 7 s',
    cat: 'Gear',
    name: 'Molotovs',
    desc: 'Every 7 s lob a firebomb into the biggest crowd. Burning zombies spread the fire.',
    max: 3,
    apply() {
      S.molo = (S.molo || 0) + 1;
    },
  },
  {
    id: 'buddy',
    short: 'A survivor joins you and fights beside you',
    cat: 'Gear',
    name: 'Backup',
    desc: 'A survivor joins you and covers you. Each one is a medic, marksman, scavenger or ex-cop.',
    max: 3,
    apply() {
      S.buddy++;
      const r = GS.RUN.nextBud || rollBud();
      GS.RUN.nextBud = null;
      const b = Object.assign(makeSurvivor(GS.P.x - 40, GS.P.y + 30), {
        a: rand(0, TAU),
        cd: 0,
        aim: 0,
        look: [0, 1, 2].filter(l => l !== (HLOOK[GS.RUN.hero] || 0))[GS.buddies.length % 2],
        tint: NPC_TINTS[GS.buddies.length % NPC_TINTS.length],
      });
      budSetup(b, r);
      GS.buddies.push(b);
      showStreak(`${r.nm} joins you`, `${TRAITS[r.tr].name} · ${TRAITS[r.tr].desc}`);
    },
  },
  {
    id: 'hull',
    short: '+25 max health, and heals you 40 now',
    cat: 'Body',
    name: 'Plate Carrier',
    desc: '+25 max health and heal 40 now.',
    have: () => `+${25 * (LV.hull || 0)} max health.`,
    max: 5,
    apply() {
      S.maxHp += 25;
      GS.P.hp = Math.min(S.maxHp, GS.P.hp + 40);
    },
  },
  {
    id: 'regen',
    short: 'Heals you 1.5 health every second',
    cat: 'Body',
    name: 'Field Medkit',
    desc: 'Heal 1.5 health every second.',
    max: 4,
    apply() {
      S.regen += 1.5;
    },
  },
  {
    id: 'leech',
    short: 'Every kill heals you 1 health',
    cat: 'Body',
    name: 'Adrenaline',
    desc: 'Each kill heals 1 health.',
    max: 3,
    apply() {
      S.leech++;
    },
  },
  {
    id: 'speed',
    short: 'You move 10% faster',
    cat: 'Body',
    name: 'Running Shoes',
    desc: '+10% move speed.',
    max: 4,
    apply() {
      S.speed *= 1.1;
    },
  },
  {
    id: 'abcd',
    short: () => `${AB().name} is ready again 25% sooner`,
    cat: 'Skill',
    get name() {
      return AB().cdName;
    },
    desc: () => `${AB().name} recharges 25% faster.`,
    max: 2,
    apply() {
      S.abCd *= 0.75;
    },
  },
  {
    id: 'abpow',
    short: () => AB().upShort,
    cat: 'Skill',
    get name() {
      return AB().upName;
    },
    desc: () => AB().up,
    max: 2,
    apply() {
      S.abLv++;
    },
  },
  {
    id: 'dash',
    short: 'Your roll is ready again 25% sooner',
    cat: 'Body',
    name: 'Cardio',
    desc: 'Dodge roll recharges 25% faster.',
    max: 3,
    apply() {
      S.dashCd *= 0.75;
    },
  },
  {
    id: 'magnet',
    short: 'Pick up ammo and medkits from 60% further',
    cat: 'Body',
    name: 'Long Reach',
    desc: 'Grab ammo and medkits from 60% further away.',
    max: 3,
    apply() {
      S.magnet *= 1.6;
    },
  },
  // the Field Manual: gear that only turns up in runs once a challenge has taught it to you (see the Armory)
  {
    id: 'wind',
    short: 'Once a night, a hit that would nearly kill you leaves you on 30 health',
    cat: 'Body',
    name: 'Second Wind',
    lock: 'flawless3',
    desc: 'Once a night, the hit that would put you under a quarter of your health leaves you on 30 instead, untouchable for a moment.',
    max: 1,
    apply() {
      S.wind = 1;
    },
  },
  {
    id: 'scav',
    short: 'Zombies drop 30% more ammo',
    cat: 'Gear',
    name: 'Scavenger',
    lock: 'rescue5',
    desc: 'The dead drop 30% more ammo, and every box you pick up brings a few rounds for the gun in your hands.',
    max: 1,
    apply() {
      S.scav = 1;
    },
  },
];
export const EVOS = [
  {
    id: 'inferno',
    short: 'Anything you set on fire burns twice as long, 50% hotter',
    name: 'Inferno',
    lock: 'boss1',
    need: { arc: 2, molotov: 2 },
    desc: 'Whatever you set alight burns twice as long and 50% hotter.',
    apply() {
      S.evo.inferno = 1;
    },
  },
  // the guns' own combos: a gun from a case plus the gear that suits it
  {
    id: 'dtap',
    short: 'Every pistol shot fires two rounds',
    name: 'Double Tap',
    need: { crit: 2, rate: 1 },
    desc: 'Every pistol shot is two: a second round follows the first.',
    apply() {
      S.evo.dtap = 1;
    },
  },
  {
    id: 'hose',
    short: 'SMG: 30% bigger magazines, rounds bounce once more',
    name: 'Bullet Hose',
    need: { gun_smg: 1, bounce: 1 },
    desc: 'SMG magazines hold 30% more and every round ricochets once more.',
    apply() {
      S.evo.hose = 1;
      if (GS.P && GS.P.owned.includes('smg')) GS.P.mag.smg = magSize('smg');
    },
  },
  {
    id: 'marks',
    short: 'Assault rifle stays steady on the move, +15% crit chance',
    name: 'Marksman',
    need: { gun_rifle: 1, pierce: 2 },
    desc: 'The assault rifle is always braced, even on the move, and gets +15% critical chance.',
    apply() {
      S.evo.marks = 1;
    },
  },
  {
    id: 'oneshot',
    short: "Hunting rifle always crits zombies that haven't seen you",
    name: 'One Shot',
    need: { gun_hunter: 1, ambush: 1 },
    desc: "Hunting rifle rounds always crit on the dead that haven't seen you, are dazed or are down.",
    apply() {
      S.evo.oneshot = 1;
    },
  },
  {
    id: 'cowboy',
    short: 'The lever-action reloads twice as fast',
    name: 'Cowboy Reload',
    need: { gun_lever: 1, reload: 2 },
    desc: 'The lever-action loads twice as fast.',
    apply() {
      S.evo.cowboy = 1;
    },
  },
  {
    id: 'walkfire',
    short: "Machine gun: you don't slow down while firing, 15% faster",
    name: 'Walking Fire',
    need: { gun_lmg: 1, mags: 2 },
    desc: 'The machine gun no longer slows you while it fires, and fires 15% faster.',
    apply() {
      S.evo.walkfire = 1;
    },
  },
  {
    id: 'airburst',
    short: 'Grenade blasts are 40% wider',
    name: 'Airburst',
    need: { gun_launcher: 1, frag: 1 },
    desc: 'Grenades burst 40% wider.',
    apply() {
      S.evo.airburst = 1;
    },
  },
  {
    id: 'tempest',
    short: 'Every hit sets zombies on fire, and it burns twice as long',
    name: "Dragon's Breath",
    need: { arc: 2, frag: 2 },
    desc: 'Every hit sets zombies on fire, and the fire burns twice as long.',
    apply() {
      S.evo.tempest = 1;
    },
  },
  {
    id: 'overclock',
    short: '+25% fire rate and damage; rounds go through one more zombie',
    name: 'Gunsmith',
    need: { rate: 3, dmg: 3 },
    desc: '+25% fire rate and damage, and every round goes through one more zombie.',
    apply() {
      S.rate *= 1.25;
      S.dmg *= 1.25;
      S.pierce += 1;
    },
  },
  {
    id: 'nova',
    short: 'Stun grenades every 2 s; each zombie they hit heals you 2',
    name: 'Combat Medic',
    need: { pulse: 2, regen: 2 },
    desc: 'Stun grenades go out every 2 s and heal 2 health per zombie they hit.',
    apply() {
      S.pulseCd = 2;
      S.evo.nova = 1;
    },
  },
  {
    id: 'swarm',
    short: 'Pipe bombs twice as often; your backup fires twice as fast',
    name: 'Demolition Crew',
    need: { darts: 2, buddy: 2 },
    desc: 'Pipe bombs go out twice as often and your backup fires twice as fast.',
    apply() {
      S.dartCd = 1.25;
      S.buddyCd = 0.27;
    },
  },
  {
    id: 'speedload',
    short: 'Reloads take half the time and heal you 3',
    name: 'Speed Loader',
    need: { reload: 2, mags: 2 },
    desc: 'Reloads take half as long and every finished reload heals 3 health.',
    apply() {
      S.reloadK *= 2;
      S.evo.medload = 1;
    },
  },
  {
    id: 'storm',
    short: 'Shotguns do 20% more damage and knock zombies far back',
    name: 'Buck and Ball',
    need: { choke: 2, multi: 2 },
    desc: 'Shotguns hit 20% harder and knock zombies much further.',
    apply() {
      S.dmg *= 1.2;
      S.evo.kb = 1;
    },
  },
];
GS.picks = [];
export function upgradePool() {
  const w = S.weapon,
    pool = UP.filter(
      u =>
        (!u.lock || chalDone(u.lock)) &&
        (LV[u.id] || 0) < u.max &&
        !(u.not && u.not.includes(w)) &&
        !(u.only && !((GS.P && GS.P.owned) || [w]).some(g => u.only.includes(g)))
    );
  return pool;
}
function rollPicks() {
  const pool = upgradePool();
  GS.picks = [];
  const evo = EVOS.find(
    v => !LV[v.id] && (!v.lock || chalDone(v.lock)) && Object.entries(v.need).every(([k, n]) => (LV[k] || 0) >= n)
  );
  if (evo) GS.picks.push(Object.assign({ evo: true, cat: 'Combo', max: 1 }, evo));
  const wt = u => {
    let w = 1;
    const lv = LV[u.id] || 0;
    if (lv > 0) w *= 1.5; // you started down this road
    if (
      EVOS.some(
        v =>
          !LV[v.id] &&
          v.need[u.id] &&
          lv < v.need[u.id] &&
          Object.entries(v.need).some(([k, m]) => k !== u.id && (LV[k] || 0) > 0)
      )
    )
      w *= 1.7; // half a combo already in hand
    if (u.only && u.only.some(g => (g === 'pistol' ? GS.P && GS.P.gun === 'pistol' : GS.P && GS.P.owned.includes(g))))
      w *= 1.4; // made for a gun you carry
    if (u.id === 'buddy' && !GS.buddies.length && GS.wave >= 4) w *= 1.3;
    return w;
  };
  while (GS.picks.length < 3 && pool.length) {
    const tot = pool.reduce((a, u) => a + wt(u), 0);
    let r = Math.random() * tot,
      k = 0;
    for (; k < pool.length - 1; k++) {
      r -= wt(pool[k]);
      if (r <= 0) break;
    }
    GS.picks.push(pool.splice(k, 1)[0]);
  }
}
// a pick's icon, as a fresh canvas (the drawn ones are cached and shared, and a canvas can only sit in one place)
export function pickIcon(u, s) {
  const col = u.evo ? '#ffd87a' : '#f2ead8',
    g = u.gun || (u.kit && KITS[u.kit] && KITS[u.kit].gun);
  let src = null;
  if (u.id === 'abcd' || u.id === 'abpow') src = perkIcon(AB().ico, s, col, u.id === 'abcd' ? 'cd' : 'up');
  else if (PERK_ICONS.includes(u.id)) src = perkIcon(u.id, s, col);
  else if (g) src = gunIcon(iconId(g), s * 2.2, s * 0.88, col);
  if (!src) return null;
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  cv.getContext('2d').drawImage(src, 0, 0);
  cv.style.width = src.width / Math.min(2, window.devicePixelRatio || 1) + 'px';
  cv.style.height = src.height / Math.min(2, window.devicePixelRatio || 1) + 'px';
  return cv;
}
const txt = v => (typeof v === 'function' ? v() : v);
export function renderPicks() {
  const box = $('cards');
  box.innerHTML = '';
  box.classList.toggle('two', GS.picks.length <= 2); // the weapon case shows its pair centred
  GS.picks.forEach((u, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card' + (u.evo ? ' evo' : '');
    b.id = 'card' + i;
    const lv = LV[u.id] || 0;
    const ds = txt(u.short) || txt(u.desc), // the one line; the full text is on hover and in the Pause screen
      cb = EVOS.find(v => !LV[v.id] && v.need[u.id] && (LV[u.id] || 0) < v.need[u.id]); // say which combo this card builds toward
    if (u.job) {
      b.className = 'card job' + (u.job === 'low' ? ' low' : '') + (FAVOURS.includes(u.job) ? ' fav' : '');
      b.innerHTML = `<span class="k"><span>${i + 1} · ${u.cat}</span><em>${u.risk}</em></span><span class="nm">${u.name}</span><span class="ds">${u.desc}</span><span class="need pay">Pays · ${u.pay}</span>`;
    } else
      b.innerHTML = `<span class="k"><span>${i + 1} · ${u.cat}</span><em>${u.evo ? 'Ready' : lv ? `Rank ${lv + 1}/${u.max}` : 'New'}</em></span><span class="hd"><i class="ico"></i><span class="nm">${u.name}</span></span>${
        u.evo
          ? `<span class="need">${Object.keys(u.need)
              .map(k => (k.startsWith('gun_') ? GUNS[k.slice(4)] : UP.find(x => x.id === k) || { name: k }).name)
              .join(' + ')}</span>`
          : ''
      }<span class="ds">${ds}</span>${!u.evo && cb ? `<span class="need combo"><i class="ci"></i>Combo part · ${cb.name}</span>` : ''}${u.gun ? '' : `<span class="pips">${Array.from({ length: u.max }, (_, k) => `<i class="${k < lv ? 'on' : k === lv && !u.evo ? 'next' : u.evo ? 'on' : ''}"></i>`).join('')}</span>`}`;
    if (!u.job) {
      const ic = pickIcon(u, u.gun || u.kit ? 30 : 52),
        slot = b.querySelector('.ico');
      if (ic) slot.appendChild(ic);
      else slot.remove();
      const ci = b.querySelector('.ci');
      if (ci) {
        const c2 = pickIcon(Object.assign({ evo: true }, cb), 16);
        if (c2) ci.appendChild(c2);
      } // the combo it builds toward, in gold
      if (u.short) b.title = txt(u.desc);
    }
    b.addEventListener('click', () => choose(i));
    b.addEventListener('mouseenter', () => {
      markSel();
    });
    box.appendChild(b);
  });
  $('rerollBtn').textContent = `Reroll · ${GS.rerolls} left`;
  $('rerollBtn').hidden = GS.rerolls <= 0;
  $('laterBtn').hidden = GS.pickSource !== 'level';
  updateHint();
  markSel();
}
// how many level-ups are banked
export function lvBank() {
  let x = GS.xp,
    nd = GS.xpNeed,
    n = 0;
  while (x >= nd && n < 9) {
    x -= nd;
    n++;
    nd = need(GS.level + n);
  }
  return n;
}
// how far the bar is toward the level after the banked ones
export function lvRest() {
  let x = GS.xp,
    nd = GS.xpNeed,
    n = 0;
  while (x >= nd && n < 9) {
    x -= nd;
    n++;
    nd = need(GS.level + n);
  }
  return Math.min(1, x / nd);
}
// never in the chopper, at a boss's entrance or in the tutorial's scripted bits
export const lvCan = () =>
  GS.state === 'play' &&
  GS.xp >= GS.xpNeed &&
  !(GS.P && GS.P.ride) &&
  !(GS.evac && GS.evac.ride) &&
  !GS.bossDue &&
  !(GS.RUN.practice && (!GS.boss || GS.boss.dead));
export function openLevel() {
  if (!lvCan()) return false;
  offerUpgrades('level');
  return true;
}
// a level is only spent when a card is taken
export function spendLevel() {
  GS.xp -= GS.xpNeed;
  GS.level++;
  GS.xpNeed = need(GS.level);
  GS.lvReady = 0;
  statMax('maxLevel', GS.level);
}
export function offerUpgrades(source = 'level') {
  const fits = u => (u.evo ? !LV[u.id] : (LV[u.id] || 0) < u.max); // a held card that's maxed out since (a Siege survivor, say) can't come back
  if (source === 'level' && GS.heldPicks && GS.heldPicks.length && GS.heldPicks.every(fits)) GS.picks = GS.heldPicks;
  else rollPicks(); // cards put off with Later come back the same: no free reroll
  if (source === 'level') GS.heldPicks = null; // a supply crate or the Go Bag leaves them where they are
  if (!GS.picks.length) {
    if (source === 'level') spendLevel();
    GS.P.hp = S.maxHp;
    S.dmg *= 1.1;
    return;
  }
  GS.pickSource = source;
  renderPicks();
  const bank = source === 'level' ? lvBank() : 0;
  $('luEye').textContent =
    source === 'crate'
      ? 'Supply crate · free gear'
      : source === 'start'
        ? 'Go bag'
        : `Level ${GS.level + 1}${bank > 1 ? ` · ${bank - 1} more after this` : ''}`;
  $('luTitle').textContent = source === 'crate' ? 'Crate unpacked' : 'Pick your gear';
  hideCallouts();
  GS.state = 'levelup';
  $('levelup').hidden = false;
  sfx.level();
  GS.luOpenT = performance.now() + 650;
  $('levelup').classList.add('arming');
  setTimeout(() => $('levelup').classList.remove('arming'), 650); // a beat before anything counts, so a key or button held in the fight can't pick for you
}
GS.luOpenT = 0;
export function offerGuns(gs) {
  // the weapon case: two guns on the pick screen, take one
  const fav = { ranger: 'rifle', breacher: 'shotgun', grenadier: 'smg' }[GS.RUN.hero];
  GS.picks = gs.map(g => ({
    id: 'gun_' + g,
    gun: g,
    cat:
      (g === fav ? 'Your speciality · ' : '') +
      (GUNS[g].ammo
        ? { shells: 'Shells', light: 'Light ammo', rifle: 'Rifle ammo', heavy: 'Heavy ammo', gren: 'Grenades' }[
            GUNS[g].ammo
          ]
        : 'Gun'),
    name: GUNS[g].name,
    desc: (GUN_DESC[g] || '').replace(/ Uses [a-z ]+\.$/, ''),
    max: 1,
    apply() {
      giveGun(g);
      GS.RUN.declined = (GS.RUN.declined || []).concat(gs.filter(x => x !== g));
    },
  }));
  GS.pickSource = 'weapon';
  renderPicks();
  $('rerollBtn').hidden = true;
  $('laterBtn').hidden = true;
  updateHint();
  $('luEye').textContent = gs.length > 1 ? 'Weapon case · the other goes back for good' : 'Weapon case';
  $('luTitle').textContent = 'Take one gun';
  hideCallouts();
  GS.state = 'levelup';
  $('levelup').hidden = false;
  sfx.pump();
  GS.luOpenT = performance.now() + 650;
  $('levelup').classList.add('arming');
  setTimeout(() => $('levelup').classList.remove('arming'), 650);
}
export function offerKits(ids) {
  // a kit case: parts and loads for two of the guns you carry, take one
  GS.picks = kitPicks(ids, g => {
    if (GS.P && GS.P.owned.includes(g)) GS.P.mag[g] = Math.max(GS.P.mag[g] || 0, magSize(g));
    sfx.pump();
  });
  GS.pickSource = 'weapon';
  renderPicks();
  $('rerollBtn').hidden = true;
  $('laterBtn').hidden = true;
  updateHint();
  $('luEye').textContent = 'Weapon case · gun kits';
  $('luTitle').textContent = 'Fit one';
  hideCallouts();
  GS.state = 'levelup';
  $('levelup').hidden = false;
  sfx.pump();
  GS.luOpenT = performance.now() + 650;
  $('levelup').classList.add('arming');
  setTimeout(() => $('levelup').classList.remove('arming'), 650);
}
export const kitName = id => (KITS[id] ? KITS[id].name : id);
// Tab or the Later button: the cards go back in the bank, as they were, and come up again when you press Tab or the
// next fight is over
export function pickLater() {
  if (GS.state !== 'levelup' || GS.pickSource !== 'level' || performance.now() < GS.luOpenT) return;
  GS.heldPicks = GS.picks.slice();
  GS.lvSnooze = true;
  $('levelup').hidden = true;
  GS.state = 'play'; // no grace time on the way out: you opened the cards yourself
}
export function doReroll() {
  if (
    GS.state !== 'levelup' ||
    GS.rerolls <= 0 ||
    performance.now() < GS.luOpenT ||
    GS.pickSource === 'weapon' ||
    GS.pickSource === 'job'
  )
    return;
  GS.rerolls--;
  rollPicks();
  renderPicks();
  sfx.ting();
}
function markSel() {
  GS.picks.forEach((_, i) => {
    const c = $('card' + i);
    if (c) c.classList.remove('sel');
  });
}
export function choose(i) {
  if (GS.state !== 'levelup' || !GS.picks[i] || performance.now() < GS.luOpenT) return;
  const u = GS.picks[i],
    lvl = GS.pickSource === 'level';
  if (lvl) spendLevel();
  if (!u.job) LV[u.id] = (LV[u.id] || 0) + 1;
  u.apply();
  $('levelup').hidden = true;
  GS.state = 'play';
  GS.P.inv = Math.max(GS.P.inv, 0.6);
  renderMods();
  if (u.evo) {
    showStreak(u.name, 'Combo ready');
    sfx.elite();
  }
  if (lvl && lvCan()) openLevel(); // more banked: the next set straight away, one stop for all of them
}
export function renderMods() {
  // the Pause screen: every pick so far, its icon, its rank and the full text of what it does
  const box = $('mods'),
    list = [...EVOS.filter(u => LV[u.id]).map(u => Object.assign({ evo: true }, u)), ...UP.filter(u => LV[u.id])];
  box.innerHTML = '';
  if (!list.length) {
    box.innerHTML = '<span class="none">Nothing picked up yet</span>';
    return;
  }
  for (const u of list) {
    const r = document.createElement('div');
    r.className = 'mod' + (u.evo ? ' evo' : '');
    r.innerHTML = `<i></i><b>${u.name}${u.evo || u.max <= 1 ? '' : ` <em>${LV[u.id]}/${u.max}</em>`}</b><span>${txt(u.have) || txt(u.desc)}</span>`; // what you have now, not the next rank
    const ic = pickIcon(u, 30);
    if (ic) r.firstChild.appendChild(ic);
    box.appendChild(r);
  }
}
setGearLocks(id => [...UP, ...EVOS].filter(u => u.lock === id).map(u => u.name)); // the challenge cards show the gear they teach
