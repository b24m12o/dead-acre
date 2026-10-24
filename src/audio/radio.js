/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
import { GS } from '../core/gs.js';
import { $ } from '../core/errors.js';
import { rand } from '../core/util.js';
import { saveMeta } from '../core/settings.js';
import { AC, musDuck, noiseBuf, radBus, sfxBus, sfxDuck, thr } from './audio.js';
import { TRAIT } from '../actors/enemies.js';
export const EV_NAME = { blood: 'Blood moon', fog: 'Fog', blackout: 'Blackout', storm: 'Storm' };
const atSign = () =>
  ((GS.RUN && GS.RUN.district) || 'town') === 'town'; /* the painted HELP is only at the town crossroads */
export const RADIO = {
  // Channel 9: the convoy talking to whoever is still out there
  get n1() {
    return atSign()
      ? 'Convoy to anyone on nine. Our spotter saw HELP painted on the crossroads in town. We roll out in fifteen nights. Stay alive till then.'
      : 'Convoy to anyone on nine. We roll out in fifteen nights. Stay alive till then.';
  },
  night: [
    'Nine, convoy. Quiet on our end. Keep your head down.',
    'They are coming up out of the drains again. Watch your corners.',
    'Count your rounds before you count the dead.',
    'We can hear the shooting from here. Give them hell.',
    'Patrol saw a big group heading your way. Hold tight.',
    'Still here, nine. So are you. Keep it that way.',
  ],
  boss: 'Something big is moving through your district. Do not let it pin you.',
  get last() {
    return atSign()
      ? 'Last night, nine. Hawk has your painted sign marked on his map. Make it to sunrise and the bird comes for you.'
      : 'Last night, nine. Make it to sunrise and the bird comes for you.';
  },
  ev: {
    storm: 'Storm front rolling in. The rain covers your shots, but every flash shows you to the whole street.',
    fog: 'Fog is coming off the river. Listen before you look.',
    blackout: 'Grid is down across your sector. Trust your flashlight.',
    blood: 'Moon is red tonight. They get restless when it is like this.',
  },
  obj: {
    box: () =>
      `The truck went over somewhere ${GS.obj && GS.obj.dir ? 'to the ' + GS.obj.dir : 'out there'}. Look for the smoke. The beacon will not last long.`,
    hale: 'Hale is pinned near you, nine. She is all we have. Please.',
    relay: 'That generator is the only thing keeping this channel alive. Stay by it.',
    scouts: 'Three tagged on my board. The ones that got our scouts. They will run.',
    gen: 'There is a generator on your block. Keep it running and the lights stay on.',
    rescue: 'We have a civilian calling from near you. Bring them in.',
    fuel: 'Five cans of fuel out there. The trucks need every drop.',
    meds: 'Pharmacy got looted, but the cases are still out there. Our medic is begging for them.',
    hunt: 'We have tagged three big ones on your streets. Put them down before they lead the rest.',
  },
  ok: {
    box: 'Got the box. Now we know what hit them. Thank you, nine.',
    hale: 'Hale is safe with you? I could kiss you, nine.',
    relay: 'Relay held all night. Hawk will come in on your signal now.',
    scouts: 'All three. For the scouts. Thank you.',
    gen: 'Lights held all night. Nice work, nine.',
    rescue: 'Good. They are with you now. Look after each other.',
    fuel: 'Fuel is ours. The trucks thank you.',
    meds: 'Every case accounted for. Doc says thank you, nine.',
    hunt: 'All three tags are off our board. Good hunting.',
  },
  fail: {
    box: 'Leave the box. We will never know what hit them.',
    hale: 'We lost Hale. God.',
    relay: 'Relay is down to battery. Hawk will have to come in slow.',
    scouts: 'One got away. Let it go, nine.',
    gen: 'We lost your generator. You are in the dark.',
    rescue: 'We lost the civilian. Nothing more you could have done.',
    fuel: 'Not all the fuel. We will make do.',
    meds: 'Not all the meds. Doc will stretch what we have.',
    hunt: 'One of the tagged ones slipped away.',
  },
  okHawk: {
    relay: 'Relay held all night. I will come in on your signal now.',
    scouts: 'All three tags are off my board. Good hunting, nine.',
    box: 'Got the box. Reyes will want to hear it, if she is still out there.',
  },
  failHawk: {
    relay: 'Relay is down to battery. I will have to come in slow.',
    scouts: 'One got away. Let it go, nine.',
  },
  jobOk: 'Copy that, nine. Job is yours. Pay on delivery.',
  jobLow: 'Understood. Keep your head down tonight, nine.',
  dawn: [
    'Sun is up, nine. Breathe while you can.',
    'Dawn. Reload, patch up, check the crates.',
    'You made it through. Same time tomorrow.',
    'Another night down. We are still on the air.',
  ],
  evac: 'Bird is inbound. Pop smoke, hold the landing zone and do not stop shooting.',
  evacGun: 'Nine, the door gunner is hot. Stay close to the smoke and he will cover you.',
  evacDown: 'Coming in to land. Keep that landing zone clear!',
  loud: 'Nine, that gunfire carries for blocks. Everything out there knows where you are now.',
  alarm: 'Car alarm on your street. That racket pulls them in from blocks away. Use it.',
};
GS.radioQ = [];
GS.radioT = -1;
export const STORY = {
  // Channel 9 over fifteen nights: the convoy you are holding the relay for, and the people on it
  1: [
    'Reyes',
    'Nine, this is Corporal Reyes on the convoy radio. You made it through one. Most did not. Keep this channel open.',
  ],
  2: ['Reyes', 'Reyes. The bridge road is gone, so the trucks go round by the quarry. Slower, but we are moving.'],
  3: ['Reyes', 'Forty-one civilians on the trucks now. Every night you hold that relay, we can still hear the Guard.'],
  4: [
    'Reyes',
    'Our doctor, Hale, says the bite takes about an hour. She writes everything down. Somebody has to know how this started.',
  ],
  5: ['Reyes', 'Whatever that thing was, the dead are thinner on our side tonight. Thank you, nine.'],
  6: [
    'Reyes',
    'Hale went to the clinic in town for supplies. She has not come back. I am trying her on every channel.',
  ],
  7: [
    'Reyes',
    () =>
      haleAlive() && GS.buddies.some(b => b.nm === 'Dr. Hale')
        ? 'Hale is with you? Good. Keep her breathing, she is the only doctor for fifty miles.'
        : haleAlive()
          ? 'Hale is on the trucks with us. She went straight back to work. Thank you, nine.'
          : 'Still no word from Hale. We keep rolling.',
  ],
  8: ['Reyes', 'The Guard says the bird is real. Seven more nights. I have never wanted to believe anything more.'],
  9: ['Reyes', 'Fuel is low. If the trucks stop at the quarry, they stop for good.'],
  10: ['Reyes', 'Nine... the quarry... they came up out of the... [static]'],
  11: [
    'Hawk',
    () =>
      atSign()
        ? 'Nine, this is Hawk, the pilot. Reyes is off the air. I flew over your sign at the crossroads today, so I know you are there. Four more nights.'
        : 'Nine, this is Hawk, the pilot. Reyes is off the air. I still have your relay on my board. Four more nights.',
  ],
  12: ['Hawk', 'Nothing from the convoy. I will look for their lights on the way in. You just hold.'],
  13: ['Reyes', 'Nine? Reyes. We lost two trucks at the quarry, but we are across. Hold on. Please.'],
  14: ['Reyes', 'Last night tomorrow. Whatever walks out of that hospital, Hale said it is where this began.'],
};
const haleAlive = () => GS.RUN.haleOk && !(GS.RUN.lost || []).includes('Dr. Hale');
const haleOut = () => haleAlive() && !GS.buddies.some(b => b.nm === 'Dr. Hale'); // aboard, or safe with the convoy; not left behind
export function storyDawn(w) {
  if (GS.RUN.endless || GS.RUN.practice) return;
  const S9 = STORY[w];
  if (!S9) return;
  const t = typeof S9[1] === 'function' ? S9[1]() : S9[1];
  radio(t, S9[0], 2);
  if (w === 10) GS.RUN.voice = 'Hawk';
  if (w === 13) GS.RUN.voice = 'Reyes';
}
export function storyEnd() {
  const f = GS.RUN.favours || 0,
    crew = (GS.RUN.aboard || []).length; // the last transmission, as the bird lifts off
  if (f >= 3)
    return [
      'Reyes',
      `Nine, it is Reyes. We are over the river, every truck we had left.${haleOut() ? ' Hale and her notes made it.' : ''} Hawk says you are aboard.${crew ? ' Bring your people home.' : ''} Get some sleep.`,
    ];
  if (f >= 1)
    return [
      'Reyes',
      `We are across, most of us. Not everyone. You kept that relay alive long enough.${crew ? ' Bring your people home.' : ''} Get some sleep, nine.`,
    ];
  return ['Hawk', 'Convoy has gone quiet, nine. It is just us now. Strap in. We are going home.'];
}
// Channel 9 voices for every line: [id, the exact words on screen, seconds, mp3, speaker R/H]. Everyday lines exist in both voices, since Hawk takes the channel on nights 11 and 12; lines are matched piece by piece, longest first
// the radio voices: built into the one-file version, or loaded from assets/
GS.VOX = (window.__DA_DATA && window.__DA_DATA.vox) || [];
let radioCurve = null;
const RADIO_VOL = 0.11,
  VOX_IN = 0.75,
  voxBuf = {};
function voxFor(line, who) {
  const w = who === 'Hawk' ? 'H' : 'R';
  let r = line.trim();
  const ids = [];
  while (r.length) {
    if (r.startsWith('[static]')) {
      ids.push('#');
      r = r.slice(8).trim();
      continue;
    }
    let f = null;
    for (const v of GS.VOX) if ((v[4] || 'R') === w && r.startsWith(v[1]) && (!f || v[1].length > f[1].length)) f = v;
    if (!f) return null;
    ids.push(f[0]);
    r = r.slice(f[1].length).trim();
  }
  return ids;
} /* the clips that say exactly this line in this speaker's voice (longest piece first), or null */
function voxDur(ids) {
  return ids ? ids.reduce((a, id) => a + (id === '#' ? 1.1 : GS.VOX.find(v => v[0] === id)[2] + 0.12), 0.2) : 0;
}
function voxLoad(id) {
  if (!voxBuf[id]) {
    const v = GS.VOX.find(q => q[0] === id),
      b = typeof v[3] === 'string' ? Uint8Array.from(atob(v[3]), c => c.charCodeAt(0)).buffer : v[3].slice(0);
    voxBuf[id] = AC.decodeAudioData(b).catch(() => null);
  }
  return voxBuf[id];
}
function radioChain(hawk, life, k = 1) {
  /* the channel: a cheap handset speaker's narrow band, driven a little too hard */
  if (!radioCurve) {
    radioCurve = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      const x = i / 127.5 - 1;
      radioCurve[i] = Math.tanh(x * 2.4) / Math.tanh(2.4);
    }
  }
  const inp = AC.createGain(),
    ws = AC.createWaveShaper(),
    hp = AC.createBiquadFilter(),
    lp = AC.createBiquadFilter(),
    pk = AC.createBiquadFilter(),
    out = AC.createGain();
  ws.curve = radioCurve;
  hp.type = 'highpass';
  hp.frequency.value = hawk ? 300 : 400;
  hp.Q.value = 0.9;
  lp.type = 'lowpass';
  lp.frequency.value = hawk ? 2600 : 3300;
  lp.Q.value = 0.9;
  pk.type = 'peaking';
  pk.frequency.value = 1700;
  pk.gain.value = 4;
  pk.Q.value = 1;
  inp.connect(ws);
  ws.connect(hp);
  hp.connect(lp);
  lp.connect(pk);
  pk.connect(out);
  out.gain.value = RADIO_VOL * k;
  out.connect(radBus && radBus.context === AC ? radBus : sfxBus);
  setTimeout(
    () => {
      try {
        out.disconnect();
      } catch (e) {}
    },
    (life + 1) * 1000
  );
  return inp;
}
export async function radioVoice(line, who) {
  /* Channel 9 on air: the key-up click, the words (real voices for the story, Reyes and Hawk), the carrier hiss under them, then the release. Everyday chatter is just the click and a breath of static, the text carries it. A line that ends in static really does break up */
  if (!AC || !noiseBuf || !sfxBus) return;
  const hawk = who === 'Hawk',
    ids = voxFor(line, who);
  let bufs = null;
  if (ids) {
    bufs = await Promise.all(ids.map(id => (id === '#' ? null : voxLoad(id))));
    if (bufs.some((b, k) => !b && ids[k] !== '#')) bufs = null;
  }
  const total = bufs ? voxDur(ids) : 0.32,
    t0 = AC.currentTime + 0.03,
    C = radioChain(hawk, total + 3, bufs ? 1.5 : 1);
  const hiss = (t, d, v, f = 2600, q = 0.6) => {
    const sr = AC.createBufferSource();
    sr.buffer = noiseBuf;
    sr.loop = true;
    const fl = AC.createBiquadFilter();
    fl.type = 'bandpass';
    fl.frequency.value = f;
    fl.Q.value = q;
    const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.008);
    g.gain.setValueAtTime(v, t + Math.max(0.01, d - 0.03));
    g.gain.linearRampToValueAtTime(0.0001, t + d);
    sr.connect(fl);
    fl.connect(g);
    g.connect(C);
    sr.start(t, rand(0, 1));
    sr.stop(t + d + 0.05);
    return g;
  };
  hiss(t0, 0.004, 1.2, 3500, 0.3);
  hiss(t0 + 0.005, 0.14, 0.55, 2200, 0.4); /* key up */
  let t = t0 + 0.16,
    cut = false;
  const bedEnd = t0 + 0.12 + total;
  if (bufs)
    ids.forEach((id, k) => {
      if (id === '#') {
        cut = true;
        hiss(t, 1.1, 0.9, 1900, 0.3);
        for (let i = 0; i < 14; i++) hiss(t + rand(0, 1), rand(0.01, 0.04), 1.3, rand(1500, 4000), 0.6);
        t += 1.1;
        return;
      }
      const src = AC.createBufferSource(),
        g = AC.createGain();
      src.buffer = bufs[k];
      g.gain.value = VOX_IN;
      src.connect(g);
      g.connect(C);
      src.start(t);
      t += bufs[k].duration + 0.12;
    }); /* the words, one clip after another; static tears the line apart where it says so */
  const bedD = Math.max(0.2, (cut ? t - 1.1 : t) - t0 - 0.1);
  hiss(t0 + 0.1, bedD, bufs ? (hawk ? 0.035 : 0.025) : 0.05, 2400, 0.5); /* the open carrier under the voice */
  if (hawk && bufs) {
    const g = hiss(t0 + 0.1, bedD, 0.08, 520, 1.2),
      o = AC.createOscillator(),
      lg = AC.createGain();
    o.type = 'square';
    o.frequency.value = 17;
    lg.gain.value = 0.07;
    o.connect(lg);
    lg.connect(g.gain);
    o.start(t0);
    o.stop(t0 + bedD + 0.2);
  } /* rotor wash chopping through Hawk's mic */
  const tE = Math.max(t, bedEnd - 0.1);
  if (!cut) {
    hiss(tE, 0.004, 1.1, 3500, 0.3);
    hiss(tE + 0.005, 0.16, 0.5, 2600, 0.5);
    if (hawk) {
      const o = AC.createOscillator(),
        g = AC.createGain();
      o.type = 'sine';
      o.frequency.value = 1250;
      g.gain.setValueAtTime(0.0001, tE + 0.2);
      g.gain.linearRampToValueAtTime(0.3, tE + 0.205);
      g.gain.setValueAtTime(0.3, tE + 0.27);
      g.gain.linearRampToValueAtTime(0.0001, tE + 0.28);
      o.connect(g);
      g.connect(C);
      o.start(tE + 0.2);
      o.stop(tE + 0.3);
    }
  } /* release: the closing kssh, and a pilot's roger beep */
  radioDuck(t0, tE + 0.3); /* the music and the street lean back while someone is talking */
}
export const RD_MUS = 0.42,
  RD_SFX = 0.6;
function radioDuck(t0, t1) {
  if (!musDuck || !sfxDuck || musDuck.context !== AC) return;
  GS.radDuckEnd = Math.max(GS.radDuckEnd, t1);
  for (const [n, lv] of [
    [musDuck, RD_MUS],
    [sfxDuck, RD_SFX],
  ]) {
    n.gain.cancelScheduledValues(t0);
    n.gain.setTargetAtTime(lv, t0, 0.12);
    n.gain.setTargetAtTime(1, GS.radDuckEnd, 0.45);
  }
} /* music down to about 40%, gunfire and the dead to about 60%, until the voice is done */
export function radioKey() {
  if (!AC || !noiseBuf || !sfxBus || !thr('rkey', 300)) return;
  const C = radioChain(false, 1),
    t = AC.currentTime + 0.01,
    sr = AC.createBufferSource(),
    fl = AC.createBiquadFilter(),
    g = AC.createGain();
  sr.buffer = noiseBuf;
  fl.type = 'bandpass';
  fl.frequency.value = 2300;
  fl.Q.value = 0.4;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.6, t + 0.006);
  g.gain.linearRampToValueAtTime(0.0001, t + 0.16);
  sr.connect(fl);
  fl.connect(g);
  g.connect(C);
  sr.start(t, rand(0, 1));
  sr.stop(t + 0.2);
} /* just the click and burst of a handset keying up */
export function radio(line, who, pri = 1) {
  if (!line) return;
  GS.radioQ.push({ t: line, who: who || (GS.RUN && GS.RUN.voice) || 'Reyes', pri, at: GS.time });
  while (GS.radioQ.length > 4) {
    let k = 0;
    for (let i = 1; i < GS.radioQ.length; i++) if ((GS.radioQ[i].pri ?? 1) < (GS.radioQ[k].pri ?? 1)) k = i;
    GS.radioQ.splice(k, 1);
  }
} // a full queue drops its least important line, never the story // every line has a voice: Corporal Reyes on the convoy radio, or Hawk the pilot while she is off the air
let TIPS;
export function tip(id) {
  const T = TIPS[id];
  if (!T || GS.RUN.practice || !GS.meta || GS.state !== 'play') return;
  /* never spent on the menu's background scene */ GS.meta.tips = GS.meta.tips || {};
  if (GS.meta.tips['t_' + id]) return;
  GS.meta.tips['t_' + id] = true;
  saveMeta();
  if (T[1] && ((GS.meta.stats && GS.meta.stats.maxNight) || 0) >= 4) return;
  radio(T[0], null, 0);
}
export function radioTick(dt) {
  const el = $('radio');
  if (!el) return;
  if (GS.radioT > 0) {
    GS.radioT -= dt;
    if (GS.radioT <= 0) el.classList.remove('show');
    return;
  }
  if (!GS.radioQ.length || GS.state !== 'play' || $('hint').classList.contains('show')) return;
  if (GS.radioT > -0.7) {
    GS.radioT -= dt;
    return;
  }
  while (GS.radioQ.length && GS.radioQ[0].pri === 0 && GS.time - GS.radioQ[0].at > 20) GS.radioQ.shift();
  if (!GS.radioQ.length) return; // a tip that waited too long is no longer about anything
  const q = GS.radioQ.shift(),
    l = typeof q === 'string' ? q : q.t,
    who = typeof q === 'string' ? '' : q.who;
  el.innerHTML = `<b>CH 9${who ? ' · ' + who.toUpperCase() : ''}</b>“${l}”`;
  el.classList.add('show');
  GS.radioT = Math.max(3.4 + l.length * 0.035, voxDur(voxFor(l, who)) + 1.2);
  radioVoice(l, who);
}

// runs once, in order with every other part's init, when the game starts (see src/index.js)
export function init() {
  TIPS = {
    // the convoy talks you through each thing the first time it happens, once per profile; basics are skipped for players who already reached night 4
    ammo: ['Ammo boxes are marked by round. Shells will not feed a rifle. Read the label.', 1],
    wcase: [
      'Weapon case on the ground. Walk over it and take one gun. The other goes back on the truck for good, so choose.',
      0,
    ],
    supply: ['Supply crate down. Ammo and gear inside, no gun. Grab it while it is quiet.', 1],
    elite: [
      'The big one with the yellow cast is an elite. Hits harder, takes more, drops more. Keep your distance.',
      1,
    ],
    dry: ['That gun is dry. Rounds come off the dead. Tap Q to get back to it once you have some.', 1],
    hurt: ['You are bleeding, nine. The red kits off the dead patch you up. Back off and find one.', 1],
    dawn: ['Sun is up. Use the quiet: open the drop, reload, patch up. Press Enter when you are ready.', 0],
    wheel: ['Three guns now. Hold Q for the gun wheel, tap Q for the last one you used.', 0],
    barrel: ['Barrels go up big. Let them bunch up around one, then shoot it.', 1],
    el_runner: [TRAIT.runner.tip, 0],
    el_bloater: [TRAIT.bloater.tip, 0],
    el_screamer: [TRAIT.screamer.tip, 0],
    el_armored: [TRAIT.armored.tip, 0],
    ability: [
      'Nine, you have a trick of your own. Press E, then wait for it to come back. The bar under your roll shows when.',
      0,
    ],
    boss: ['Every one of those big ones has a weak spot and an opening after it swings. Watch, then punish.', 0],
  };
}
