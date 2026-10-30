/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { TAU, clamp, d2, pick, rand } from '../core/util.js';
import { quad, setH, viewH, viewW } from '../render/sprites.js';
import { R } from '../render/atlas.js';
import { solidPt } from '../world/nav.js';
import { spat, tone } from '../audio/audio.js';
import { sfx } from '../audio/sfx.js';
import { ammoTypes, cam } from './state.js';
import { renderPicks } from './upgrades.js';
import { hideCallouts } from '../ui/callouts.js';
import { bossNight, lastNight } from './waves.js';
import { chips, decal, dust, floatText } from '../render/effects.js';
import { makeLurker } from './combat.js';
import { updateHint } from '../ui/settings-ui.js';
import { smoke } from '../world/fire.js';
import { makeNoise } from './noise.js';
import { TW } from './districts.js';
import { cars } from '../world/map.js';
import { TRAITS, freeSpot, makeSurvivor, rollBud } from '../actors/backups.js';
import { RADIO, radio, radioKey } from '../audio/radio.js';
import { OBJ_NAME, finishObjective } from './objective-flow.js';
import { planHorde } from './horde.js';
// every ordinary night from the second on has its own signature, known at dawn: weather, a horde, car alarms, a dog
// pack, brutes. The first ones bring in one new threat each; later ones are dealt from a deck, never the same twice
// running. Job and boss nights have their own story instead
export const SIG = {
  pack: 'Dog pack',
  brute: 'Brutes',
  horde: 'A horde is moving',
  alarm: 'Car alarms',
  storm: 'Storm coming',
  fog: 'Fog coming in',
  blackout: 'Blackout',
  blood: 'Blood moon',
};
const SIG_EV = { storm: 1, fog: 1, blackout: 1, blood: 1 };
export function planSig(w) {
  if (bossNight(w) || lastNight(w) || w < 2 || GS.RUN.tut || GS.RUN.practice || jobNight(w) || TW('dark')) return null;
  const used = GS.RUN.sigUsed || [];
  if (w === 2) return 'pack';
  if (w === 3) return 'brute';
  if (w === 4) return 'horde';
  const deck = Object.keys(SIG).filter(
    s => !used.slice(-3).includes(s) && !(s === 'alarm' && !cars.some(c => c.hasAlarm && !c.alarmUsed && !c.dead))
  );
  return pick(deck.length ? deck : ['horde', 'storm']);
}
export function nightSetup() {
  GS.obj = null;
  GS.ev = null;
  GS.nightHit = false;
  GS.nightDone = false;
  const boss = bossNight(GS.wave),
    last = lastNight(GS.wave);
  if (last) GS.ev = 'blood';
  else if (boss) GS.ev = Math.random() < 0.5 ? 'storm' : null;
  const sig = GS.RUN.nextSig && GS.RUN.nextSig.w === GS.wave ? GS.RUN.nextSig.s : planSig(GS.wave);
  GS.RUN.sig = sig;
  GS.RUN.nextSig = null;
  if (sig) GS.RUN.sigUsed = (GS.RUN.sigUsed || []).concat(sig);
  if (!boss && !last && sig && SIG_EV[sig]) GS.ev = sig;
  else if (!boss && !last && !sig && GS.wave >= 4 && Math.random() < 0.32)
    GS.ev = pick(['blood', 'fog', 'blackout', 'storm']);
  if (GS.RUN.district === 'cemetery' && !GS.ev && !sig && Math.random() < 0.25) GS.ev = 'fog';
  if (GS.ev && GS.ev === GS.RUN.lastEv && !last && !sig) GS.ev = null;
  GS.RUN.lastEv = GS.ev; // never the same weather two nights running
  GS.RUN.wet = GS.ev === 'storm' ? 1 : (GS.RUN.wet || 0) * 0.5; // after a storm the puddles linger a night or two
  if (TW('dark')) GS.ev = 'blackout';
  if (GS.ev === 'blood') {
    const extra = Math.round(GS.queue.length * 0.35);
    for (let i = 0; i < extra; i++) GS.queue.push(pick(['skitter', 'skitter', 'hound', 'mini']));
  }
  if (sig === 'horde') {
    GS.queue = GS.queue.filter((_, i) => i % 10 < 3);
    planHorde();
  } // tonight is the horde's: a thin trickle of the usual dead, then the mass
  if (sig === 'pack' || sig === 'brute') {
    const t = sig === 'pack' ? 'hound' : 'beetle',
      n = sig === 'pack' ? 2 + Math.floor(GS.wave / 4) : 2 + Math.floor(GS.wave / 4), // a hound entry is a pack of three
      at = Math.round(GS.queue.length * 0.3);
    GS.queue.splice(at, 0, ...Array(n).fill(t));
  } // the pack runs together; the brutes come in a knot
  const J = GS.RUN.job;
  GS.RUN.job = null;
  GS.RUN.jobPend = false;
  GS.RUN.low = false; // tonight's work is the job you took at dawn; most nights have none
  if (J && !boss && !last) {
    if (J.t === 'low') {
      GS.RUN.low = true;
      GS.queue = GS.queue.filter((_, i) => i % 5 !== 4);
    } else {
      makeObj(J.t);
      if (GS.obj) {
        GS.obj.rw = J.rw;
        if (GS.obj.s && J.rw && J.rw.nm) GS.obj.s.bud = J.rw;
      }
    }
  }
}
function makeObj(type) {
  if (FAVOURS.includes(type)) {
    const base = { box: 'fuel', hale: 'rescue', relay: 'gen', scouts: 'hunt' }[type];
    if (type === 'box') makeBox();
    else makeObj(base);
    GS.obj.job = type;
    GS.obj.fav = true;
    GS.obj.title = JOBS[type].name;
    return;
  }
  if (type === 'gen') {
    const [x, y] = freeSpot(170, 320);
    GS.obj = { type, x, y, hp: 500 + GS.wave * 70, max: 500 + GS.wave * 70 };
  } else if (type === 'rescue') {
    const [x, y] = freeSpot(550, 900);
    GS.obj = { type, s: makeSurvivor(x, y), state: 'wait' };
  } else if (type === 'hunt') {
    GS.obj = { type, got: 0, need: 3 };
    const n = GS.queue.length;
    [0.18, 0.42, 0.66].forEach((f, k) => GS.queue.splice(Math.round(n * f) + k, 0, 'hunt'));
  } // three marked elites, spread through the night
  else {
    const meds = type === 'meds';
    GS.obj = {
      type: 'fuel',
      job: meds ? 'meds' : undefined,
      title: meds ? 'Pharmacy run' : undefined,
      name: meds ? 'Med cases' : undefined,
      need: meds ? 4 : 5,
      cans: [],
      got: 0,
    };
    for (let i = 0; i < GS.obj.need; i++) {
      const [x, y] = freeSpot(260, 1100);
      GS.obj.cans.push({
        x,
        y,
        got: false,
        t: rand(0, 5),
        reg: meds ? 'medkit' : undefined,
        label: meds ? 'MEDS' : undefined,
      });
    }
  }
}
function makeBox() {
  // the crash: a burnt-out convoy truck somewhere out there, its load strewn round it; the box is in one of the piles
  const [x, y] = freeSpot(650, 1150, true),
    a = Math.atan2(y - GS.P.y, x - GS.P.x);
  GS.obj = {
    type: 'box',
    got: 0,
    need: 1,
    name: 'Black box',
    crash: { x, y },
    batt: 1,
    piles: [],
    dir: ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'][
      Math.round((((a % TAU) + TAU) % TAU) / (TAU / 8)) % 8
    ],
  };
  GS.wrecks.push({ x, y, a: rand(0, TAU), s: 1.5, sm: 0, crash: true });
  decal(R.scorch, x, y, 2.2, [1, 1, 1, 0.9], [0, 0, 0], 600);
  for (let k = 0, tries = 0; GS.obj.piles.length < 5 && tries < 80; tries++) {
    const pa = rand(0, TAU),
      pd = rand(70, 210),
      px = x + Math.cos(pa) * pd,
      py = y + Math.sin(pa) * pd;
    if (
      solidPt(px, py) ||
      solidPt(px + 14, py) ||
      solidPt(px - 14, py) ||
      GS.obj.piles.some(q => Math.hypot(q.x - px, q.y - py) < 70)
    )
      continue;
    GS.obj.piles.push({ x: px, y: py, r: rand(0, TAU), v: k++, prog: 0, done: false });
  }
  if (!GS.obj.piles.length) GS.obj.piles.push({ x: x + 60, y, r: 0, v: 0, prog: 0, done: false });
  GS.obj.piles[(Math.random() * GS.obj.piles.length) | 0].box = true;
}
export const BOX_SEARCH = 2;
export function boxSignal() {
  const o = GS.obj;
  if (!o || o.type !== 'box') return 0;
  const b = o.piles.find(q => q.box) || o.crash;
  return o.batt * clamp(1 - Math.hypot(b.x - GS.P.x, b.y - GS.P.y) / 1500, 0, 1);
}
export function updateBox(dt) {
  // the beacon dies as the night goes on; you read its signal, find the wreck, and search the piles one by one, standing still while they come
  const o = GS.obj;
  if (GS.nightLive && !GS.nightDone) o.batt = Math.max(0, o.batt - dt / 80);
  const bx = o.piles.find(q => q.box),
    d = Math.hypot(bx.x - GS.P.x, bx.y - GS.P.y);
  if (o.batt > 0 && d < 260) {
    o.bp = (o.bp ?? 0) - dt;
    if (o.bp <= 0) {
      o.bp = clamp(d / 220, 0.25, 1.4);
      tone(2100, 0.05, 'square', 0.012 * o.batt * clamp(1.3 - d / 260, 0.3, 1), 1, 0, 4200, spat(bx.x, bx.y));
    }
  } // the beep: only once you are close, and fading with the battery
  o.trT = (o.trT || 0) - dt;
  if (o.trT <= 0) {
    o.trT = 1;
    const sg = boxSignal();
    o.trend = o.sg0 === undefined ? 0 : sg - o.sg0 > 0.012 ? 1 : sg - o.sg0 < -0.012 ? -1 : 0;
    o.sg0 = sg;
  }
  if (
    Math.random() < dt * 2.5 &&
    Math.abs(o.crash.x - cam.x - viewW / 2) < viewW * 1.1 &&
    Math.abs(o.crash.y - cam.y - viewH / 2) < viewH * 1.1
  )
    smoke(o.crash.x + rand(-20, 20), o.crash.y + rand(-10, 10), 1, 80, true); // the wreck still smoulders: a smoke column you can steer by
  let cur = null;
  for (const q of o.piles) if (!q.done && d2(q.x, q.y, GS.P.x, GS.P.y) < 40 * 40) cur = q;
  o.cur = cur;
  for (const q of o.piles) if (q !== cur && !q.done) q.prog = Math.max(0, q.prog - dt * 0.5);
  if (!cur) return;
  const still = Math.hypot(GS.P.vx, GS.P.vy) < 40 && !GS.P.held;
  o.still = still;
  if (!still) return;
  if (cur.prog === 0) {
    makeNoise(cur.x, cur.y, 650);
    sfx.crunch(cur.x, cur.y);
  }
  cur.prog += dt;
  if (Math.random() < dt * 6) chips(cur.x, cur.y, 1, [0.4, 0.38, 0.35], 4, 120);
  if (Math.floor(cur.prog) !== Math.floor(cur.prog - dt)) makeNoise(cur.x, cur.y, 650); // digging through wreckage is loud
  if (cur.prog < BOX_SEARCH) return;
  cur.done = true;
  o.cur = null;
  dust(cur.x, cur.y, 6, 50, 1, 1);
  if (cur.box) {
    o.got = 1;
    sfx.ammo();
    floatText(cur.x, cur.y - 30, 'Black box', '#ffd08a', 18);
    finishObjective(true);
    return;
  }
  const r = Math.random();
  if (r < 0.45) {
    const ts = ammoTypes();
    if (ts.length)
      GS.pickups.push({
        k: 'ammo',
        at: pick(ts),
        v: 1,
        x: cur.x,
        y: cur.y,
        vx: rand(-50, 50),
        vy: rand(-50, 50),
        t: 0,
      });
    floatText(cur.x, cur.y - 30, 'Not here · a box of rounds', '#cfd6d9', 14);
  } else if (r < 0.75) floatText(cur.x, cur.y - 30, 'Not here', '#cfd6d9', 14);
  else {
    const a = rand(0, TAU);
    makeLurker(cur.x + Math.cos(a) * 46, cur.y + Math.sin(a) * 46);
    floatText(cur.x, cur.y - 30, 'Not here', '#cfd6d9', 14);
  } // and sometimes one of the bodies in the wreckage isn't dead
}
export function drawPile(q) {
  // a heap of the truck's load: a split crate, a tyre, scattered scrap; searched, it is kicked flat
  const k = q.done ? 0.42 : 0.62,
    c = Math.cos(q.r),
    sn = Math.sin(q.r);
  setH(q.done ? 3 : 8);
  if (q.done) {
    setH(1);
    for (const s of [-1, 1])
      quad(R.pixel, q.x, q.y + 2, q.r * 0.2 + s * 0.785, 6, 0.8, 0.95, 0.42, 0.12, 0.9, 0.5, 0.2, 0.04, 0);
    setH(3); // searched: a spray-paint X on the ground, the way scavengers mark a cleared spot
  } else {
    setH(1);
    quad(R.pixel, q.x, q.y + 1, q.r, 8.5, 5.5, 0.62, 0.5, 0.3, 0.75, 0.12, 0.09, 0.05, 0);
    setH(8);
  } /* unsearched: a torn cargo tarp spread under the heap, a pale patch you can pick out from the street */
  quad(R.p_tire, q.x - c * 10, q.y - sn * 10, q.r, 0.9, 0.9, k, k, k, 1, 0, 0, 0, 0);
  quad(
    R.crate,
    q.x + c * 7,
    q.y + sn * 7 - (q.done ? 0 : 3),
    q.r + 0.6,
    q.done ? 0.62 : 0.72,
    q.done ? 0.5 : 0.72,
    k * 0.9,
    k * 0.85,
    k * 0.8,
    1,
    0,
    0,
    0,
    0
  );
  for (let i = 0; i < 4; i++) {
    const a = q.r + i * 1.7,
      rr = 13 + (i % 2) * 7;
    quad(
      R.rockchip,
      q.x + Math.cos(a) * rr,
      q.y + Math.sin(a) * rr,
      a,
      1.4,
      1.4,
      k * 0.8,
      k * 0.8,
      k * 0.82,
      1,
      0,
      0,
      0,
      0
    );
  }
  if (!q.done) {
    const sx = q.x + c * 7,
      sy = q.y + sn * 7 - 5;
    quad(R.pixel, sx, sy, q.r + 0.6, 0.5, 2.6, 1, 0.72, 0.15, 1, 0.55, 0.36, 0.06, 0);
  } /* a hazard-yellow cargo strap across the crate: convoy load, not street junk */
}
export const objKey = () => GS.obj.job || GS.obj.type,
  objName = () => GS.obj.title || OBJ_NAME[GS.obj.type];
// ---- Channel 9 jobs: on a few dawns (never before a boss) the convoy offers work for the coming night. Take one for its pay, or lie low
const JOB_RW = { crate: 'Supply drop', scrap: '+50 scrap', reroll: '+2 rerolls' };
const JOBS = {
  gen: {
    name: 'Defend the generator',
    desc: 'Hold one spot all night. If it blows, the lamps go dark.',
    risk: 'Hold ground',
  },
  rescue: { name: 'Rescue the survivor', desc: 'Reach them, then keep them alive till dawn.', risk: 'Escort' },
  fuel: {
    name: 'Collect 5 fuel cans',
    desc: 'Five cans spread over the district. You will have to roam.',
    risk: 'On the move',
  },
  meds: { name: 'Pharmacy run', desc: 'Four med cases from a looted pharmacy, scattered wide.', risk: 'On the move' },
  box: {
    name: 'Find the black box',
    desc: "A convoy truck went over out there. Follow the beacon's signal before its battery dies, then search the wreckage for the box.",
    risk: 'Search',
  },
  hale: {
    name: 'Bring in Dr. Hale',
    desc: 'The convoy doctor is cut off near you. Reach her and keep her alive till dawn.',
    risk: 'Escort',
  },
  relay: {
    name: 'Keep the relay powered',
    desc: 'The relay runs off one generator. If it dies the pilot flies in blind.',
    risk: 'Hold ground',
  },
  scouts: {
    name: 'Hunt the marked',
    desc: 'Three of them took the convoy scouts. They run from you. Do not let one get away.',
    risk: 'Chase',
  },
  hunt: {
    name: 'Hunt the marked',
    desc: 'Three marked elites run from you. Chase each one down before it goes back underground.',
    risk: 'Chase',
  },
  low: { name: 'Lie low', desc: 'No job tonight. A fifth fewer dead come out.', risk: 'Quiet' },
};
export const FAVOURS = ['box', 'hale', 'relay', 'scouts'];
export const jobNight = w =>
  !GS.RUN.practice &&
  !GS.RUN.tut &&
  !bossNight(w) &&
  !lastNight(w) &&
  (GS.RUN.endless ? w % 5 === 2 : (GS.RUN.jobN || []).includes(w));
function jobPay(t, rw) {
  return (t === 'low' ? '' : `+${t === 'gen' || t === 'relay' ? 25 : 30} scrap, ammo · `) + jobPay0(t, rw);
}
function jobPay0(t, rw) {
  if (FAVOURS.includes(t))
    return (
      (t === 'hale'
        ? GS.buddies.length < 3
          ? 'She joins as your medic'
          : 'Team full: she rides with the convoy · +15 max health'
        : JOB_RW[rw]) + ` · ${GS.RUN.voice || 'Reyes'} owes you`
    );
  if (t === 'rescue')
    return GS.buddies.length < 3
      ? `${rw ? rw.nm + ', ' + TRAITS[rw.tr].name.toLowerCase() + ',' : 'They'} joins your backup · +15 max health`.replace(
          'They joins',
          'They join'
        )
      : 'Team full: they head for the convoy · +15 max health, +15 scrap';
  if (t === 'meds') return '+20 max health, fully patched up';
  if (t === 'low') return 'Full heal at dawn · +1 reroll';
  return JOB_RW[rw];
}
export function openJobs() {
  if (!GS.RUN.jobPend) return;
  if (GS.state !== 'play') {
    if (GS.state === 'levelup' || GS.state === 'pause') GS.later.push({ t: 0.4, fn: openJobs });
    return;
  }
  const fi0 = GS.RUN.endless ? -1 : (GS.RUN.jobN || []).indexOf(GS.wave + 1),
    fb = { box: 'fuel', hale: 'rescue', relay: 'gen', scouts: 'hunt' }[FAVOURS[fi0]]; // never her favour and the same kind of job side by side
  const pool = ['gen', 'rescue', 'fuel', 'meds']
      .concat(GS.wave + 1 >= 6 ? ['hunt'] : [])
      .filter(t => t !== GS.RUN.lastJob && t !== fb),
    rws = ['crate', 'scrap', 'reroll'];
  for (let i = rws.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [rws[i], rws[j]] = [rws[j], rws[i]];
  }
  const mk = (t, rw) => ({
    id: 'job_' + t,
    job: t,
    rw,
    cat: t === 'low' ? 'No job' : FAVOURS.includes(t) ? `${GS.RUN.voice || 'Reyes'} asks` : 'Job',
    risk: JOBS[t].risk,
    name: JOBS[t].name,
    desc: JOBS[t].desc,
    pay: jobPay(t, rw),
    max: 1,
    apply() {
      GS.RUN.job = { t, rw };
      GS.RUN.jobPend = false;
      if (t !== 'low') GS.RUN.lastJob = t;
      radio(t === 'low' ? RADIO.jobLow : RADIO.jobOk);
    },
  });
  GS.picks = [];
  while (GS.picks.length < 2 && pool.length) {
    const t = pool.splice((Math.random() * pool.length) | 0, 1)[0];
    GS.picks.push(mk(t, t === 'rescue' ? rollBud() : t === 'meds' ? null : rws.pop()));
  }
  {
    const fi = GS.RUN.endless ? -1 : (GS.RUN.jobN || []).indexOf(GS.wave + 1),
      ft = FAVOURS[fi];
    if (ft && GS.picks.length)
      GS.picks[0] = mk(ft, ft === 'hale' ? { nm: 'Dr. Hale', tr: 'medic' } : rws.pop() || 'scrap');
  } // her favour takes one of the two job slots
  GS.picks.push(mk('low', null));
  GS.pickSource = 'job';
  renderPicks();
  $('rerollBtn').hidden = true;
  updateHint();
  $('luEye').textContent = `Channel 9 · night ${GS.wave + 1}`;
  $('luTitle').textContent = 'The convoy has work';
  hideCallouts();
  GS.state = 'levelup';
  $('levelup').hidden = false;
  radioKey();
  GS.luOpenT = performance.now() + 650;
  $('levelup').classList.add('arming');
  setTimeout(() => $('levelup').classList.remove('arming'), 650);
}
