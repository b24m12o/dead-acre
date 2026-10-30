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
import { chalDone } from './challenges.js';
const DMG_STEP = [1.25, 1.22, 1.18, 1.15, 1.12, 1.1],
  RATE_STEP = [1.18, 1.15, 1.12, 1.1, 1.08, 1.06]; // each rank of these two adds a little less than the last: strong early, no runaway late
export const UP = [
  {
    id: 'dmg',
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
    cat: 'Body',
    name: 'Plate Carrier',
    desc: '+25 max health and heal 40 now.',
    max: 5,
    apply() {
      S.maxHp += 25;
      GS.P.hp = Math.min(S.maxHp, GS.P.hp + 40);
    },
  },
  {
    id: 'regen',
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
    name: 'Double Tap',
    need: { crit: 2, rate: 1 },
    desc: 'Every pistol shot is two: a second round follows the first.',
    apply() {
      S.evo.dtap = 1;
    },
  },
  {
    id: 'hose',
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
    name: 'Marksman',
    need: { gun_rifle: 1, pierce: 2 },
    desc: 'The assault rifle is always braced, even on the move, and gets +15% critical chance.',
    apply() {
      S.evo.marks = 1;
    },
  },
  {
    id: 'oneshot',
    name: 'One Shot',
    need: { gun_hunter: 1, ambush: 1 },
    desc: "Hunting rifle rounds always crit on the dead that haven't seen you, are dazed or are down.",
    apply() {
      S.evo.oneshot = 1;
    },
  },
  {
    id: 'cowboy',
    name: 'Cowboy Reload',
    need: { gun_lever: 1, reload: 2 },
    desc: 'The lever-action loads twice as fast.',
    apply() {
      S.evo.cowboy = 1;
    },
  },
  {
    id: 'walkfire',
    name: 'Walking Fire',
    need: { gun_lmg: 1, mags: 2 },
    desc: 'The machine gun no longer slows you while it fires, and fires 15% faster.',
    apply() {
      S.evo.walkfire = 1;
    },
  },
  {
    id: 'airburst',
    name: 'Airburst',
    need: { gun_launcher: 1, frag: 1 },
    desc: 'Grenades burst 40% wider.',
    apply() {
      S.evo.airburst = 1;
    },
  },
  {
    id: 'tempest',
    name: "Dragon's Breath",
    need: { arc: 2, frag: 2 },
    desc: 'Every hit sets zombies on fire, and the fire burns twice as long.',
    apply() {
      S.evo.tempest = 1;
    },
  },
  {
    id: 'overclock',
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
    const ds = typeof u.desc === 'function' ? u.desc() : u.desc,
      cb = EVOS.find(v => !LV[v.id] && v.need[u.id] && (LV[u.id] || 0) < v.need[u.id]); // say which combo this card builds toward
    if (u.job) {
      b.className = 'card job' + (u.job === 'low' ? ' low' : '') + (FAVOURS.includes(u.job) ? ' fav' : '');
      b.innerHTML = `<span class="k"><span>${i + 1} · ${u.cat}</span><em>${u.risk}</em></span><span class="nm">${u.name}</span><span class="ds">${u.desc}</span><span class="need pay">Pays · ${u.pay}</span>`;
    } else
      b.innerHTML = `<span class="k"><span>${i + 1} · ${u.cat}</span><em>${u.evo ? 'Ready' : lv ? `Rank ${lv + 1}/${u.max}` : 'New'}</em></span><span class="nm">${u.name}</span>${
        u.evo
          ? `<span class="need">${Object.keys(u.need)
              .map(k => (k.startsWith('gun_') ? GUNS[k.slice(4)] : UP.find(x => x.id === k) || { name: k }).name)
              .join(' + ')}</span>`
          : ''
      }<span class="ds">${ds}</span>${!u.evo && cb ? `<span class="need combo">Combo part · ${cb.name}</span>` : ''}${u.gun ? '' : `<span class="pips">${Array.from({ length: u.max }, (_, k) => `<i class="${k < lv ? 'on' : k === lv && !u.evo ? 'next' : u.evo ? 'on' : ''}"></i>`).join('')}</span>`}`;
    b.addEventListener('click', () => choose(i));
    b.addEventListener('mouseenter', () => {
      markSel();
    });
    box.appendChild(b);
  });
  $('rerollBtn').textContent = `Reroll · ${GS.rerolls} left`;
  $('rerollBtn').hidden = GS.rerolls <= 0;
  updateHint();
  markSel();
}
export function offerUpgrades(source = 'level') {
  rollPicks();
  if (!GS.picks.length) {
    GS.P.hp = S.maxHp;
    S.dmg *= 1.1;
    return;
  }
  GS.pickSource = source;
  renderPicks();
  $('luEye').textContent =
    source === 'crate' ? 'Supply crate · free gear' : source === 'start' ? 'Go bag' : `Level ${GS.level}`;
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
  const u = GS.picks[i];
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
}
export function renderMods() {
  $('mods').innerHTML =
    EVOS.filter(u => LV[u.id])
      .map(u => `<span style="background:rgba(255,207,58,.22);color:#ffe7a0">${u.name}</span>`)
      .join('') +
      UP.filter(u => LV[u.id])
        .map(u => `<span>${u.name} ${LV[u.id]}</span>`)
        .join('') || '<span class="none">Nothing picked up yet</span>';
}
