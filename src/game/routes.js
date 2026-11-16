/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Which way: three times a run, where the road crosses into new country (Route 9, Mill River, Hollow Hill), three ways
// in, drawn from the ones that belong there. The places, the nights and the bosses stay where the road puts them; the
// way you take decides what you pick up on it and what follows you in. Each way
// gives something when you get there and asks for it back on your first night at the new place: the dead you
// stirred up on it come after you (more of them), or, the main road, fewer, since you got there ahead of them.
import { RADIO, radio } from '../audio/radio.js';
import { GS } from '../core/gs.js';
import { TAU, rand } from '../core/util.js';
import { LV, S, ammoMax } from './state.js';
import { AMMO_MAX, WEAPON_NIGHTS } from './arsenal.js';
import { UP, offerUpgrades, renderMods } from './upgrades.js';
import { TRAITS } from '../actors/backups.js';
import { sfx } from '../audio/sfx.js';
import { FINAL_NIGHT, TW } from './districts.js';
import { BOSS_HORDE_J, HORDE_J, STOPS } from './route.js';
import { bossNight } from './waves.js';
import { jobNight, planSig } from './objectives.js';
import { giveTraps, giveTrapsQuiet } from './traps.js';
import { dropCrate } from './combat.js';
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
    gain: '+80 scrap',
    cost: 'Some in the cars were only playing dead: lurkers and draggers come after you',
    k: 1.1,
    risk: 1,
    mix: [['mini', 1.5]],
    add: { lurker: 3, drag: 1 },
    tag: 'Lurkers and draggers',
    why: 'the dead from the pile-up crawled after you',
  },
  bridge: {
    name: 'Along the railway',
    what: 'The short way: along the tracks and over the river on the old rail bridge. The line crew left their hut unlocked.',
    gain: 'A trap kit from the hut: 3 mines and a gas drum',
    cost: 'Some of them follow you off the tracks: an ambush the moment night falls',
    k: 1,
    risk: 2,
    ev: 'ambush',
    tag: 'Ambush at nightfall',
    why: 'they were waiting for you',
  },
  tanker: {
    name: 'Past the burning tanker',
    what: 'A fuel tanker on its side, still burning. Its pumps still work.',
    gain: 'Siphon its fuel: 2 gas drums and 50 scrap',
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
  chapel: {
    name: 'Up past the chapel',
    what: 'The bell still rings when the wind gets up. The pastor stocked the cellar for whoever came.',
    gain: 'You and your people patched up to full, and every gun topped up',
    cost: 'The congregation never left: they follow you up in the fog, and some lie down to wait',
    k: 1.1,
    risk: 2,
    ev: 'fog',
    mix: [['mini', 1.2]],
    add: { lurker: 4, spore: 2 },
    tag: 'Fog and the congregation',
    why: 'the congregation followed you up from the chapel',
  },
  yard: {
    name: "Through the groundskeeper's yard",
    what: 'His shed is padlocked and the graves round it are open. Nobody dug them from above.',
    gain: 'His shed: 2 mines, 2 gas drums and 40 scrap',
    cost: 'What came up out of the graves follows you: brutes, and draggers in the grass',
    k: 1.15,
    risk: 2,
    ev: 'brute',
    mix: [['beetle', 1.0]],
    add: { drag: 2 },
    trait: 'armored',
    tag: 'Brutes and draggers',
    why: 'the dead from the open graves followed you',
  },
};
// What a way leaves on the rest of its country, once the first night there is over: a little help at each dawn there,
// and a little of its trouble in each night there, until the road crosses into the next country. The main road leaves
// nothing either way. (dawn: heal you so much, people: your people back to full, ammo: every gun's spare at least this
// full, scrap, traps, crate: a supply crate. k, mix, add: the night's dead, as for the first night)
export const STAY = {
  pharmacy: {
    from: 'the pharmacy',
    boon: 'Each dawn you heal 30, and your people get back to full',
    trouble: 'A spore or two among them every night',
    tag: 'Spores',
    add: { spore: 1 },
    mix: [['flower', 0.5]],
    dawn: { heal: 30, people: true },
  },
  gunshop: {
    from: 'the gun shop',
    boon: "Each dawn every gun's spare ammo is at least half full",
    trouble: 'The dogs keep hunting you every night',
    tag: 'The dogs still on you',
    mix: [['hound', 0.6]],
    dawn: { ammo: 0.5 },
  },
  hideout: {
    from: 'the farmhouse',
    boon: 'Each dawn they leave a supply crate out for you',
    trouble: 'The crowd keeps growing: more of them every night',
    tag: 'The crowd still growing',
    k: 1.1,
    dawn: { crate: true },
  },
  checkpoint: {
    from: 'the checkpoint',
    boon: 'Each dawn a land mine from the army stores',
    trouble: 'A riot cop and brutes every night',
    tag: 'Riot police',
    add: { shield: 1 },
    mix: [['beetle', 0.4]],
    dawn: { traps: { mine: 1 } },
  },
  wrecks: {
    from: 'the pile-up',
    boon: 'Each dawn +25 scrap from the cars',
    trouble: 'Lurkers under the cars every night',
    tag: 'Lurkers',
    add: { lurker: 2 },
    dawn: { scrap: 25 },
  },
  bridge: {
    from: "the line crew's store",
    boon: 'Each dawn a gas drum from the line crew',
    trouble: 'Climbers off the embankment every night',
    tag: 'Climbers',
    add: { climb: 2 },
    dawn: { traps: { drum: 1 } },
  },
  tanker: {
    from: 'the tanker',
    boon: 'Each dawn +15 scrap and a noise maker',
    trouble: 'The smoke still draws them: more flyers, and more of them',
    tag: 'Drawn by the smoke',
    mix: [['wasp', 0.8]],
    k: 1.05,
    dawn: { scrap: 15, traps: { noise: 1 } },
  },
  bus: {
    from: 'the coach',
    boon: 'Each dawn your people are patched up to full',
    trouble: 'A Listener drawn by the crash every night',
    tag: 'A Listener',
    add: { blind: 1 },
    dawn: { people: true },
  },
  river: {
    from: 'the river',
    boon: 'The fog keeps hiding you: fewer of them every night',
    trouble: 'The quiet ones follow the water: a Listener and a lurker every night',
    tag: 'The quiet ones',
    add: { blind: 1, lurker: 1 },
    k: 0.9,
  },
  chapel: {
    from: 'the chapel',
    boon: 'Each dawn you heal 20, and your people get back to full',
    trouble: 'The congregation keeps coming: lurkers and a spore every night',
    tag: 'The congregation',
    add: { lurker: 2, spore: 1 },
    dawn: { heal: 20, people: true },
  },
  yard: {
    from: "the groundskeeper's shed",
    boon: 'Each dawn a land mine from the shed',
    trouble: 'More come up out of the graves: brutes and a dragger every night',
    tag: 'Up out of the graves',
    add: { drag: 1 },
    mix: [['beetle', 0.5]],
    dawn: { traps: { mine: 1 } },
  },
};
// the last night in the country of stop S: where the road crosses out of it
const areaEnd = S => {
  let w = STOPS[S] ? STOPS[S].to : 0;
  for (let k = S + 1; k < STOPS.length && STOPS[k].area === STOPS[S].area; k++) w = STOPS[k].to;
  return w;
};
// the way's hold on night w: after its first night, to the end of its country (null when none)
export const viaStay = w => {
  const A = GS.RUN && GS.RUN.viaA;
  return A && STAY[A.id] && w > A.w0 && w <= A.w1 ? STAY[A.id] : null;
};
// at each dawn in its country: what the way keeps giving you (paid once a dawn: a Continue doesn't pay it again)
export function viaDawn() {
  const w = GS.wave + 1,
    st = viaStay(w),
    A = GS.RUN.viaA;
  if (!st || !st.dawn || (A.paid || 0) >= w) return;
  A.paid = w;
  const d = st.dawn,
    P = GS.P;
  if (d.heal) P.hp = Math.min(S.maxHp, P.hp + d.heal);
  if (d.people)
    for (const b of GS.buddies) {
      b.down = 0;
      b.hp = b.max;
    }
  if (d.ammo)
    for (const t of Object.keys(AMMO_MAX)) P.ammo[t] = Math.max(P.ammo[t] || 0, Math.round(ammoMax(t) * d.ammo));
  if (d.scrap) GS.runSeeds += d.scrap;
  if (d.traps) giveTrapsQuiet(d.traps);
  if (d.crate) GS.later.push({ t: 2, fn: () => GS.state === 'play' && dropCrate(null, null, null, `From ${st.from}`) });
  GS.later.push({ t: 5, fn: () => GS.nightDone && showStreak(`From ${st.from}`, st.boon) });
}
// the ways that belong to each country, for the choice on the way into it
export const POOLS = {
  'Route 9': ['road', 'gunshop', 'tanker', 'wrecks', 'checkpoint', 'pharmacy'],
  'Mill River': ['road', 'river', 'bridge', 'hideout', 'bus', 'checkpoint', 'wrecks'],
  'Hollow Hill': ['road', 'chapel', 'yard', 'hideout', 'bus', 'pharmacy'],
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
// the three on offer, from the ways of the country ahead that its first night can take: half the time the main road
// and two detours, otherwise three detours
export function offerVia() {
  const w = GS.wave + 1,
    S = STOPS[stopNow()],
    pool = (POOLS[S && S.area] || Object.keys(VIA)).filter(k => VIA[k] && fits(k, w)),
    det = pool.filter(k => k !== 'road');
  const ways = [];
  if (pool.includes('road') && (Math.random() < 0.5 || det.length < 3)) ways.push('road');
  while (ways.length < 3 && det.length) ways.push(det.splice(Math.floor(Math.random() * det.length), 1)[0]);
  for (let i = ways.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ways[i], ways[j]] = [ways[j], ways[i]];
  } // the main road isn't always first
  return ways;
}
// the hideout's survivor, said up front: does anyone join, or is the team full?
export const viaGain = id =>
  id === 'hideout' && GS.buddies.length >= 3
    ? 'Your team is full: they share their ammo, a medkit and 50 scrap'
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
  {
    const at = stopNow();
    GS.RUN.viaA = STAY[id] ? { id, w0: GS.wave + 1, w1: areaEnd(at), paid: GS.wave + 1 } : null; // and on through its country
  }
  GS.RUN.viaTaken = (GS.RUN.viaTaken || []).concat(id);
  GS.RUN.viaLog = (GS.RUN.viaLog || []).concat({
    s: stopNow(),
    id,
    i: Math.max(0, (ways || []).indexOf(id)),
    n: (ways || []).length || 2,
  }); // the road map draws the way you took, on its side of the fork
  laterTake(id, stopNow()); // what it leaves you for later down the road
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
  } else if (id === 'chapel') {
    P.hp = S.maxHp;
    for (const b of GS.buddies) {
      b.down = 0;
      b.hp = b.max;
    }
    topUpAmmo();
    note = "patched up and topped up from the chapel's cellar";
  } else if (id === 'yard') {
    giveTraps({ mine: 2, drum: 2 });
    GS.runSeeds += 40;
    note = "2 mines, 2 gas drums and 40 scrap from the groundskeeper's shed";
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
      GS.runSeeds += 50;
      note = 'the farmhouse shared their ammo, a medkit and 50 scrap';
    }
  } else if (id === 'checkpoint') {
    GS.RUN.viaPick = true; // saved with the arrival: a closed tab doesn't lose it (night-flow.js arrive/resumeDawn)
    note = 'kit from the army checkpoint · pick yours';
  } else if (id === 'wrecks') {
    GS.runSeeds += 80;
    note = '+80 scrap from the pile-up';
  } else if (id === 'bridge') {
    giveTraps({ mine: 3, drum: 1 });
    note = "along the railway: a trap kit from the line crew's hut";
  } else if (id === 'tanker') {
    giveTraps({ drum: 2 });
    GS.runSeeds += 50;
    note = '2 gas drums and 50 scrap from the tanker';
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
  if (v && ((v.add && v.add.spore) || v.ev === 'rescue') && s && s.w === w && s.s === 'siege') {
    GS.RUN.sigUsed = (GS.RUN.sigUsed || []).concat('siege'); // planSig deals another
    const n = planSig(w);
    GS.RUN.nextSig = n && n !== 'siege' ? { w, s: n } : null;
  } // a siege night has no spores in it, and the pharmacy's sick are coming; nor room for the coach's survivor
}
// what the way you came brings on night w, for the dawn's countdown line
export const viaTag = w => {
  const v = viaNight(w),
    st = viaStay(w),
    t = (v && VIA[v.id] && VIA[v.id].tag) || (st && st.tag);
  return t && !(v && GS.RUN.nextSig && GS.RUN.nextSig.w === w && SIGN[GS.RUN.nextSig.s] === v.ev) ? ' · ' + t : '';
};
const SIGN = { pack: 'pack', brute: 'brute', fog: 'fog', blood: 'blood' };
// Channel 9 on the way you came, a few seconds after you arrive: the warning about what followed you in
export function viaRadio() {
  const v = GS.RUN.viaN,
    at = stopNow();
  if (!v || v.w !== GS.wave + 1 || !RADIO.via[v.id] || GS.RUN.practice) return;
  GS.later.push({
    t: 9,
    fn: () => GS.state === 'play' && stopNow() === at && GS.wave + 1 === v.w && radio(RADIO.via[v.id]),
  });
}
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
    showStreak('Ambush', 'They followed you off the tracks · back to back', true);
  }
}
// ---- what some ways leave you for later ----
// Five of the ways pay off again further down the road. Each is recorded when you take the way, waits on the road
// map as a small mark at the stop where it pays, pays once (with a word from the radio), and is never promised when
// the road ahead can't deliver it.
export const LATER = {
  pharmacy: {
    text: 'Bandages · your people get back up twice as fast for 3 nights',
    from: 'the pharmacy',
    paid: 'Bandages · your people get back up twice as fast for 3 nights',
  },
  checkpoint: {
    text: 'Radio codes · the next weapon case holds three guns, not two',
    from: 'the checkpoint',
    paid: 'Radio codes · three guns in this case',
  },
  tanker: {
    text: 'A jerrycan · the next garage truck needs 2 cans of fuel, not 3',
    from: 'the tanker',
    paid: 'The jerrycan · two cans will do for this one',
  },
  bus: {
    text: 'If they live, they know a cache · an extra supply crate at the stop after next',
    from: 'the coach',
    paid: 'The cache they told you about · a supply crate',
  },
  wrecks: {
    text: 'A road crew’s van in the pile-up · a land mine and a gas drum at the stop after next',
    from: 'the pile-up',
    paid: 'From the road crew’s van · a land mine and a gas drum in your pack',
  },
};
const LAT = () => (GS.RUN.viaLater = GS.RUN.viaLater || []);
const nextTruck = S => {
  for (let k = S; k < STOPS.length; k++) if (STOPS[k].leave === 'truck') return k;
  return -1;
};
const stopOfNight = n => STOPS.findIndex(s => n <= s.to);
// where an effect taken on the way to stop S pays: a stop, or -1 when the road ahead can't deliver it
export function laterAt(id, S, w = GS.wave) {
  if (!LATER[id] || !GS.RUN || !GS.RUN.journey) return -1;
  if (id === 'pharmacy') return S;
  if (id === 'tanker') return nextTruck(S);
  if (id === 'bus' || id === 'wrecks') return S + 1 < STOPS.length ? S + 1 : -1;
  if (TW('pistol')) return -1; // checkpoint: no weapon cases at all
  const n = Object.keys(WEAPON_NIGHTS)
    .map(Number)
    .filter(k => k > w + 1)
    .sort((a, b) => a - b)[0];
  return n ? Math.max(S, stopOfNight(n - 1)) : -1;
}
// the line on a way's card, or '' when it leaves nothing for later (or can't any more)
export const laterLine = (id, S) => (LATER[id] && laterAt(id, S) >= 0 ? LATER[id].text : '');
// the effects still waiting, with the stop each pays at (for the road map)
export const laterPending = () => LAT().filter(l => !l.paid && l.cond !== false);
function laterTake(id, S) {
  if (!LATER[id] || !GS.RUN.journey) return;
  const at = laterAt(id, S);
  if (at < 0) return;
  const l = { id, at, w0: GS.wave + 1 };
  if (id === 'pharmacy') l.w1 = l.w0 + 2;
  if (id === 'bus') l.cond = null; // waiting on the rescue
  LAT().push(l);
}
const due = id => LAT().find(l => l.id === id && !l.paid && l.cond !== false);
function pay(l, show = true) {
  l.paid = true;
  if (show) showStreak(`From ${LATER[l.id].from}`, LATER[l.id].paid);
}
// the pharmacy's bandages: are they working tonight?
export const bandaged = () => LAT().some(l => l.id === 'pharmacy' && l.on && GS.wave + (GS.nightLive ? 0 : 1) <= l.w1);
// the radio codes: owed at this weapon case? (the case calls laterCase once it holds three)
export const codesDue = () => !!due('checkpoint');
export function laterCase(n) {
  const l = due('checkpoint');
  if (l && n >= 3) pay(l);
}
// the jerrycan: the garage truck here needs one can less (paid as the truck is found)
export function jerrycan() {
  const l = due('tanker');
  if (!l || stopNow() < l.at) return false;
  pay(l);
  return true;
}
// the coach's survivor: lived or not, the cache rides on it
export function laterRescue(ok) {
  const v = GS.RUN.viaN;
  if (!v || v.id !== 'bus' || v.w !== GS.wave) return;
  const l = LAT().find(x => x.id === 'bus' && !x.paid && x.cond === null);
  if (l) l.cond = !!ok;
}
// arriving at a stop: what was waiting for this one pays
export function laterArrive(S) {
  for (const l of LAT()) {
    if (l.paid || l.cond === false) continue;
    if (l.id === 'pharmacy' && l.w1 < GS.wave + 1) l.paid = true; // its nights are over
    if (l.at !== S) continue;
    if (l.id === 'wrecks') {
      giveTrapsQuiet({ mine: 1, drum: 1 });
      pay(l);
    } else if (l.id === 'bus') {
      if (l.cond) {
        dropCrate(null, null, null, LATER.bus.paid);
        l.paid = true;
      } else l.cond = false; // they didn't make it: no cache
    } else if (l.id === 'pharmacy' && !l.on) {
      l.on = true;
      showStreak(`From ${LATER.pharmacy.from}`, LATER.pharmacy.paid);
    }
  }
}
// at each night's start: the bandages run out after their third night
export function laterNight() {
  for (const l of LAT()) if (l.id === 'pharmacy' && l.on && !l.paid && GS.wave > l.w1) l.paid = true;
}
