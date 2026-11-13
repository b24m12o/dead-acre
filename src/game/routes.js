/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Which way: every time you leave a place, two ways to the next one. The places, the nights and the bosses stay
// where the road puts them; the way you take decides what you pick up on it and what follows you in. Each way
// gives something when you get there and asks for it back on your first night at the new place: the dead you
// stirred up on it come after you (more of them), or, the main road, fewer, since you got there ahead of them.
import { GS } from '../core/gs.js';
import { TAU, pick, rand } from '../core/util.js';
import { LV, S, ammoMax } from './state.js';
import { AMMO_MAX } from './arsenal.js';
import { UP, offerUpgrades, renderMods } from './upgrades.js';
import { TRAITS } from '../actors/backups.js';
import { sfx } from '../audio/sfx.js';
import { FINAL_NIGHT } from './districts.js';
import { BOSS_HORDE_J, HORDE_J } from './route.js';
import { bossNight } from './waves.js';
import { jobNight, planSig } from './objectives.js';
import { giveTraps } from './traps.js';
import { stopNow } from './journey.js';
import { TILE, WH, WW, isWall } from '../world/map.js';
import { reachPt } from '../world/nav.js';
import { makeEnemy } from '../actors/enemies.js';
import { chips, dust } from '../render/effects.js';
import { showStreak } from '../ui/callouts.js';

// k: the first night's dead at the new place, times this. risk: 0 calm, 1 rough, 2 bad (the road map's colour).
// ev: what the first night brings (fog / blood: the weather; pack / brute: a pack or a knot of brutes in the
// queue; horde: a smaller horde rises mid-night; ambush: they rise round you as night falls; rescue: survivors
// to get out). mix: more of these among the ordinary dead; add: so many of these specials; trait: the elites'
// kind that night
export const VIA = {
  road: {
    name: 'Stay on the main road',
    what: 'The quickest way. Nothing on it but the road.',
    gain: 'You get there ahead of them: fewer of the dead on your first night',
    cost: 'Nothing picked up on the way',
    k: 0.85,
    risk: 0,
    why: 'you got here ahead of them: fewer tonight',
  },
  pharmacy: {
    name: 'Past the pharmacy',
    what: 'Its back door is off the hinges, but the shelves might not be bare.',
    gain: 'You and your people patched up to full',
    cost: 'The sick follow you in: spores and bloaters on your first night',
    k: 1.1,
    risk: 1,
    mix: [['flower', 1.2]],
    add: { spore: 3 },
    trait: 'bloater',
    tag: 'Spores and bloaters',
    why: 'the sick from the pharmacy followed you',
  },
  gunshop: {
    name: 'By the gun shop',
    what: 'Somebody barricaded it and never came back for what is inside.',
    gain: 'Every gun you carry topped up',
    cost: 'The shooting draws a dog pack and runners after you',
    k: 1.15,
    risk: 1,
    ev: 'pack',
    mix: [['hound', 0.9]],
    trait: 'runner',
    tag: 'A dog pack and runners',
    why: 'the shooting at the gun shop drew the fast ones',
  },
  hideout: {
    name: 'The farmhouse on the radio',
    what: 'A voice on channel 4 says they are holed up there, and armed.',
    gain: 'A survivor joins you · if your team is full, they share their supplies',
    cost: 'The crowd round the house follows: a horde comes in mid-night',
    k: 1.1,
    risk: 2,
    ev: 'horde',
    tag: 'A horde follows you',
    why: 'the crowd from the farmhouse is on its way',
  },
  checkpoint: {
    name: 'Through the army checkpoint',
    what: 'Abandoned in a hurry. Their kit is still in the tents.',
    gain: 'A free pick of gear',
    cost: 'The dead in uniform come with you: brutes and armoured riot police',
    k: 1.1,
    risk: 2,
    ev: 'brute',
    mix: [['beetle', 1.0]],
    add: { shield: 2 },
    trait: 'armored',
    tag: 'Brutes and armour',
    why: 'the dead in uniform followed you from the checkpoint',
  },
  wrecks: {
    name: 'Through the pile-up',
    what: 'Forty cars, nose to tail, doors open. Nobody took the valuables.',
    gain: '+50 scrap',
    cost: 'Some in the cars were only playing dead: lurkers and draggers come after you',
    k: 1.1,
    risk: 1,
    mix: [['mini', 1.5]],
    add: { lurker: 3, drag: 1 },
    tag: 'Lurkers and draggers',
    why: 'the dead from the pile-up crawled after you',
  },
  bridge: {
    name: 'Over the rail bridge',
    what: 'The short way, along the tracks. The line crew left their hut unlocked.',
    gain: 'A trap kit from the hut: 2 mines and a gas drum',
    cost: 'They wait below the line: an ambush the moment night falls',
    k: 1,
    risk: 2,
    ev: 'ambush',
    tag: 'Ambush at nightfall',
    why: 'they were waiting for you',
  },
  tanker: {
    name: 'Past the burning tanker',
    what: 'A fuel tanker on its side, still burning. Its pumps still work.',
    gain: 'Siphon its fuel: 2 gas drums and 30 scrap',
    cost: 'The smoke is seen for miles: a blood moon and more of them',
    k: 1,
    risk: 2,
    ev: 'blood',
    tag: 'Blood moon',
    why: 'the smoke from the tanker brought them',
  },
  bus: {
    name: 'The coach in the ditch',
    what: 'A coach on its side. Someone inside is knocking on the glass.',
    gain: 'Get the one left inside out and keep them alive: they join you',
    cost: 'The crash drew them: more of them while you do it',
    k: 1.15,
    risk: 1,
    ev: 'rescue',
    tag: 'Survivor to get out',
    why: 'the crash drew more of them',
  },
  river: {
    name: 'Along the river',
    what: 'The towpath, out of sight of the road. The mist comes off the water.',
    gain: 'The fog hides you: the dead see less of you too, and fewer follow',
    cost: 'Fog rolls in after you: you see less on your first night',
    k: 0.95,
    risk: 1,
    ev: 'fog',
    tag: 'Fog',
    why: 'the river fog came with you',
  },
};
// can this way's first night happen on night w? the last night's sky and its flood are the story's, a boss or a
// job night has its own work, and a horde night has its horde already
const fits = (id, w) => {
  const ev = VIA[id].ev,
    last = !GS.RUN.endless && w === FINAL_NIGHT;
  if (ev === 'fog' || ev === 'blood' || ev === 'ambush') return !last;
  if (ev === 'horde') return !last && !HORDE_J[w] && !BOSS_HORDE_J[w];
  if (ev === 'rescue') return !last && !bossNight(w) && !HORDE_J[w] && !jobNight(w);
  return true;
};
// the two on offer: often the main road against one detour, sometimes two detours; never the same pair twice running
export function offerVia() {
  const w = GS.wave + 1,
    det = Object.keys(VIA).filter(k => k !== 'road' && fits(k, w));
  let a, b;
  for (let n = 0; n < 6; n++) {
    a = Math.random() < 0.4 ? 'road' : pick(det);
    b = pick(det.filter(k => k !== a));
    if (!GS.RUN.viaLast || GS.RUN.viaLast !== [a, b].sort().join()) break;
  }
  GS.RUN.viaLast = [a, b].sort().join();
  return [a, b];
}
// the hideout's survivor, said up front: does anyone join, or is the team full?
export const viaGain = id =>
  id === 'hideout' && GS.buddies.length >= 3
    ? 'Your team is full: they share their ammo, a medkit and 30 scrap'
    : VIA[id].gain;
function topUpAmmo() {
  for (const t of Object.keys(AMMO_MAX)) GS.P.ammo[t] = Math.max(GS.P.ammo[t] || 0, ammoMax(t));
}
// you've arrived the way you chose: what it gave you, now; what it costs, on the first night here
// returns the line the arrival banner carries, so what the way gave you shows as you walk in, not seconds later
export function applyVia(id, ways) {
  const V = VIA[id];
  if (!V) return '';
  GS.RUN.via = id;
  GS.RUN.viaN = {
    w: GS.wave + 1,
    id,
    k: V.k,
    ev: V.ev || null,
    mix: V.mix || null,
    add: V.add || null,
    trait: V.trait || null,
    why: V.why,
  };
  GS.RUN.viaTaken = (GS.RUN.viaTaken || []).concat(id);
  GS.RUN.viaLog = (GS.RUN.viaLog || []).concat({ s: stopNow(), id, i: Math.max(0, (ways || []).indexOf(id)) }); // the road map draws the way you took
  const P = GS.P;
  let note = '';
  if (id === 'road') note = 'the main road: you are ahead of them tonight';
  else if (id === 'pharmacy') {
    P.hp = S.maxHp;
    for (const b of GS.buddies) {
      b.down = 0;
      b.hp = b.max;
    }
    note = 'patched up at the pharmacy';
  } else if (id === 'gunshop') {
    topUpAmmo();
    note = 'every gun topped up at the gun shop';
  } else if (id === 'hideout') {
    if (GS.buddies.length < 3) {
      if ((LV.buddy || 0) < 3) LV.buddy = (LV.buddy || 0) + 1;
      UP.find(u => u.id === 'buddy').apply();
      renderMods();
      const b = GS.buddies[GS.buddies.length - 1];
      GS.streakQ = GS.streakQ.filter(q => !/joins you$/.test(q[0])); // the banner says it
      note = `${b.nm} came with you from the farmhouse · ${TRAITS[b.tr].name.toLowerCase()}`;
    } else {
      topUpAmmo();
      P.hp = Math.min(S.maxHp, P.hp + 40);
      GS.runSeeds += 30;
      note = 'the farmhouse shared their ammo, a medkit and 30 scrap';
    }
  } else if (id === 'checkpoint') {
    GS.RUN.viaPick = true; // saved with the arrival: a closed tab doesn't lose it (night-flow.js arrive/resumeDawn)
    note = 'kit from the army checkpoint · pick yours';
  } else if (id === 'wrecks') {
    GS.runSeeds += 50;
    note = '+50 scrap from the pile-up';
  } else if (id === 'bridge') {
    giveTraps({ mine: 2, drum: 1 });
    note = "a trap kit from the line crew's hut";
  } else if (id === 'tanker') {
    giveTraps({ drum: 2 });
    GS.runSeeds += 30;
    note = '2 gas drums and 30 scrap from the tanker';
  } else if (id === 'bus') note = 'someone is still in the coach: they are out there tonight';
  else if (id === 'river') note = 'the river fog follows you in tonight';
  if (id !== 'road' && id !== 'bus' && id !== 'river') sfx.ammo();
  return note;
}
// the checkpoint's free pick: once the arrival banner is gone and nothing else is on screen
export function viaPickSoon() {
  const go = () => {
    if (!GS.RUN.viaPick) return;
    if (GS.state !== 'play' || GS.bannerT > 0) return GS.later.push({ t: 0.3, fn: go });
    GS.RUN.viaPick = false;
    offerUpgrades('route');
  };
  GS.later.push({ t: 0.5, fn: go });
}
// the first night at the new place: how many of the dead, and how many brutes among them
// the weather the way you came brings takes the place of any weather the night had coming (said at dawn as it is)
export function viaSig() {
  const w = GS.wave + 1,
    v = viaNight(w),
    s = GS.RUN.nextSig;
  if (
    v &&
    SIGN[v.ev] &&
    (v.ev === 'fog' || v.ev === 'blood') &&
    s &&
    s.w === w &&
    ['storm', 'fog', 'blackout', 'blood'].includes(s.s)
  )
    s.s = v.ev;
  if (v && v.add && v.add.spore && s && s.w === w && s.s === 'siege') {
    GS.RUN.sigUsed = (GS.RUN.sigUsed || []).concat('siege'); // planSig deals another
    const n = planSig(w);
    GS.RUN.nextSig = n && n !== 'siege' ? { w, s: n } : null;
  } // a siege night has no spores in it, and the pharmacy's sick are coming
}
// what the way you came brings on night w, for the dawn's countdown line
export const viaTag = w => {
  const v = viaNight(w),
    t = v && VIA[v.id] && VIA[v.id].tag;
  return t && !(GS.RUN.nextSig && GS.RUN.nextSig.w === w && SIGN[GS.RUN.nextSig.s] === v.ev) ? ' · ' + t : '';
};
const SIGN = { pack: 'pack', brute: 'brute', fog: 'fog', blood: 'blood' };
export const viaNight = w => (GS.RUN && GS.RUN.viaN && GS.RUN.viaN.w === w ? GS.RUN.viaN : null);
// the bridge's ambush: as night falls they come up out of the ground round you, taken from the night's own dead
export function viaAmbush() {
  const v = viaNight(GS.wave);
  if (!v || v.ev !== 'ambush' || !GS.P) return;
  const P = GS.P,
    n = Math.min(14, 6 + Math.floor(GS.wave / 2)),
    a0 = rand(0, TAU);
  let made = 0;
  for (let k = 0; k < n; k++)
    for (let t = 0; t < 20; t++) {
      const a = t < 8 ? a0 + (k / n) * TAU + rand(-0.25, 0.25) : rand(0, TAU), // its place in the ring, else anywhere round you (a wall or the map's edge on that side)
        d = rand(230, 360),
        x = P.x + Math.cos(a) * d,
        y = P.y + Math.sin(a) * d,
        tx = Math.floor(x / TILE),
        ty = Math.floor(y / TILE);
      if (x < 3 * TILE || y < 3 * TILE || x > WW - 3 * TILE || y > WH - 3 * TILE) continue;
      if (isWall(tx, ty) || isWall(tx + 1, ty) || isWall(tx - 1, ty) || isWall(tx, ty + 1) || isWall(tx, ty - 1))
        continue;
      if (!reachPt(x, y)) continue;
      makeEnemy(GS.wave >= 4 && k % 5 === 4 ? 'hound' : 'skitter', x, y);
      dust(x, y, 7, 50, 1, 1);
      chips(x, y, 6, null, 4, 140);
      made++;
      const i = GS.queue.indexOf('skitter');
      if (i >= 0) GS.queue.splice(i, 1); // they were tonight's dead all along
      break;
    }
  if (made) {
    sfx.groan(P.x, P.y);
    sfx.dig(P.x, P.y);
    showStreak('Ambush', 'They were waiting under the line · back to back', true);
  }
}
