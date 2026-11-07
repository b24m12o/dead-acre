/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// Which way: every time you leave a place, two ways to the next one. The places, the nights and the bosses stay
// where the road puts them; the way you take decides what you pick up on it and what follows you in. Each way
// gives something when you get there and asks for it back on your first night at the new place: the dead you
// stirred up on it come after you (more of them), or, the main road, fewer, since you got there ahead of them.
import { GS } from '../core/gs.js';
import { pick } from '../core/util.js';
import { LV, S, ammoMax } from './state.js';
import { AMMO_MAX } from './arsenal.js';
import { UP, offerUpgrades, renderMods } from './upgrades.js';
import { TRAITS } from '../actors/backups.js';
import { sfx } from '../audio/sfx.js';

// k: the first night's dead at the new place, times this; brutes: more of the big ones among them
export const VIA = {
  road: {
    name: 'Stay on the main road',
    what: 'The quickest way. Nothing on it but the road.',
    gain: 'You get there ahead of them: fewer of the dead on your first night',
    cost: 'Nothing picked up on the way',
    k: 0.85,
  },
  pharmacy: {
    name: 'Past the pharmacy',
    what: 'Its back door is off the hinges, but the shelves might not be bare.',
    gain: 'You and your people patched up to full',
    cost: 'More of the dead follow you in',
    k: 1.15,
  },
  gunshop: {
    name: 'By the gun shop',
    what: 'Somebody barricaded it and never came back for what is inside.',
    gain: 'Every gun you carry topped up',
    cost: 'The shooting draws a crowd after you',
    k: 1.2,
  },
  hideout: {
    name: 'The farmhouse on the radio',
    what: 'A voice on channel 4 says they are holed up there, and armed.',
    gain: 'A survivor joins you · if your team is full, they share their supplies',
    cost: 'A crowd was round the house: it follows you',
    k: 1.25,
  },
  checkpoint: {
    name: 'Through the army checkpoint',
    what: 'Abandoned in a hurry. Their kit is still in the tents.',
    gain: 'A free pick of gear',
    cost: 'The dead in uniform come with you: more brutes',
    k: 1.15,
    brutes: true,
  },
  wrecks: {
    name: 'Through the pile-up',
    what: 'Forty cars, nose to tail, doors open. Nobody took the valuables.',
    gain: '+50 scrap',
    cost: 'Slow going: more of them catch up',
    k: 1.15,
  },
};
// the two on offer: often the main road against one detour, sometimes two detours; never the same pair twice running
export function offerVia() {
  const det = Object.keys(VIA).filter(k => k !== 'road');
  let a, b;
  for (let n = 0; n < 6; n++) {
    a = Math.random() < 0.55 ? 'road' : pick(det);
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
export function applyVia(id) {
  const V = VIA[id];
  if (!V) return '';
  GS.RUN.via = id;
  GS.RUN.viaN = { w: GS.wave + 1, k: V.k, brutes: !!V.brutes };
  GS.RUN.viaTaken = (GS.RUN.viaTaken || []).concat(id);
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
    const go = () => {
      if (GS.state === 'play') offerUpgrades('route');
      else GS.later.push({ t: 0.3, fn: go });
    };
    GS.later.push({ t: 1.2, fn: go });
    note = 'kit from the army checkpoint';
  } else if (id === 'wrecks') {
    GS.runSeeds += 50;
    note = '+50 scrap from the pile-up';
  }
  if (id !== 'road') sfx.ammo();
  return note;
}
// the first night at the new place: how many of the dead, and how many brutes among them
export const viaNight = w => (GS.RUN && GS.RUN.viaN && GS.RUN.viaN.w === w ? GS.RUN.viaN : null);
