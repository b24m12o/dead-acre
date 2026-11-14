/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The band and the world's own sound. Every song is made of riffs that exist, 64 steps long, with drum patterns
// and leads the band knows. Each kind of ground has its own fight song at its own pace; a night with a signature
// plays it its own way (fog held back, a blackout on a heartbeat, a blood moon faster and a step up, a siege as a
// march), and every one of them plays through without an error. Each place has its own sound under the wind, and
// far-off sounds come while you are on foot, never with a boss up.
import { openGame, check } from './lib/harness.mjs';

export const name = 'music: a song for each ground, a way of playing for each kind of night, and the world far off';
export async function run(b) {
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  await ev('initAudio(); 1');
  const o = await ev(`(() => {
    const out = { bad: [] }, bad = out.bad;
    GS.meta.tutDone = true; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play'; GS.queue = []; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    const { RIFFS, SONGS } = GS.musDbg;
    const DR = ['std', 'gallop', 'thrash', 'open', 'half', 'boss', 'blast', 'doom', 'heart', 'march', 'rock', 'drive', 'stop', 'calm', 'none'];
    const LD = [undefined, 'rock', 'hook', 'build', 'boss', 'solo', 'bells', 'arp', 'siren'];
    for (const [n, r] of Object.entries(RIFFS)) {
      if (r.length !== 64) bad.push(n + ': ' + r.length + ' steps');
      for (const t of r) if (t && !/^[po]\\d+$/.test(t)) bad.push(n + ': token ' + t);
    }
    for (const [n, song] of Object.entries(SONGS))
      for (const [riff, dr, key, ld] of song) {
        if (!RIFFS[riff]) bad.push(n + ': no riff ' + riff);
        if (!DR.includes(dr)) bad.push(n + ': drums ' + dr);
        if (!LD.includes(ld)) bad.push(n + ': lead ' + ld);
        if (typeof key !== 'number') bad.push(n + ': key ' + key);
      }
    out.songs = Object.keys(SONGS).filter(k => k.startsWith('fight'));
    // each ground, each kind of night: the whole song in order, and two parts of it actually played
    out.tempo = {}; out.drums = {}; out.keys = {};
    MUS.ride = false; MUS.heat = 0.9;
    for (const dist of ['town', 'highway', 'cemetery'])
      for (const sig of [null, 'fog', 'blackout', 'blood', 'siege', 'horde']) {
        MUS.level = MUS.want = 'fight'; MUS.dist = dist; MUS.sig = sig; MUS.pos = { fight: 0, boss: 0, calm: 0, ride: 0 }; MUS.sec = null;
        const id = dist + '/' + (sig || 'plain'), song = SONGS['fight_' + dist] || SONGS.fight, seen = new Set(), keys = [];
        out.tempo[id] = Math.round(tempoOf('fight'));
        for (let i = 0; i < song.length * 2; i++) {
          nextSection('fight');
          if (!MUS.sec || !MUS.sec.riff || MUS.sec.riff.length !== 64) bad.push(id + ': part ' + i + ' has no riff');
          else { seen.add(MUS.sec.drums); if (i < song.length * 2) keys.push(MUS.sec.key - song[i >> 1][2]); if (!DR.includes(MUS.sec.drums)) bad.push(id + ': drums ' + MUS.sec.drums); }
        }
        out.drums[id] = [...seen].sort(); out.keys[id] = Math.min(...keys);
        MUS.pos = { fight: 0, boss: 0, calm: 0, ride: 0 }; MUS.sec = null;
        try { for (let st = 0; st < 128; st++) playStep(st & 63, AC.currentTime + 0.3 + st * 0.02); } catch (e) { bad.push(id + ': ' + e.message); }
      }
    // the place's own sound
    const nightAt = id => { for (let w = 1; w <= 15; w++) if (STOPS[stopAt(w)].id === id) return w; return 0; };
    out.beds = {};
    for (const id of ['main', 'bridge', 'quarry', 'motel', 'hospital']) { GS.wave = nightAt(id); tickAmbience(0.1); out.beds[id] = GS.amb.bed; }
    // far-off sounds: on foot yes, with a boss up no
    GS.wave = nightAt('main'); GS.RUN.district = 'town'; GS.boss = null;
    out.far = [];
    for (let i = 0; i < 6; i++) { GS.amb.nextT = GS.time - 0.5; tickAmbience(0.1); out.far.push(GS.amb.last); GS.time += 1; }
    out.farN = GS.amb.n;
    GS.boss = { dead: false }; GS.amb.nextT = GS.time - 0.5; tickAmbience(0.1); out.withBoss = GS.amb.n - out.farN; GS.boss = null;
    GS.state = 'menu'; tickAmbience(0.1); out.menuBed = GS.amb.bed;
    return out;
  })()`);
  await pg.waitForTimeout(600);
  await pg.close();
  check(!o.bad.length, 'the songs should be sound: ' + o.bad.slice(0, 6).join('; '));
  check(
    o.songs.includes('fight_highway') && o.songs.includes('fight_cemetery'),
    `the highway and the cemetery should have their own fight songs: ${o.songs}`
  );
  const T = o.tempo;
  check(
    T['highway/plain'] > T['town/plain'] && T['cemetery/plain'] < T['town/plain'],
    `the highway should play faster than the town and the cemetery slower: ${T['town/plain']} / ${T['highway/plain']} / ${T['cemetery/plain']}`
  );
  check(
    T['town/fog'] < T['town/plain'] && T['town/blood'] > T['town/plain'],
    `fog should slow the band and a blood moon speed it up: ${T['town/fog']} / ${T['town/plain']} / ${T['town/blood']}`
  );
  check(
    !o.drums['town/fog'].some(d => d === 'rock' || d === 'drive' || d === 'thrash'),
    `in fog the band should hold back: ${o.drums['town/fog']}`
  );
  check(
    o.drums['town/blackout'].every(d => d === 'heart' || d === 'stop' || d === 'none'),
    `a blackout should play on a heartbeat: ${o.drums['town/blackout']}`
  );
  check(o.drums['town/siege'].includes('march'), `a siege should march: ${o.drums['town/siege']}`);
  check(
    o.keys['town/blood'] === o.keys['town/plain'] + 1,
    `a blood moon should play a step up: ${o.keys['town/blood']} against ${o.keys['town/plain']}`
  );
  check(
    o.beds.main === null &&
      o.beds.bridge === 'bridge' &&
      o.beds.quarry === 'quarry' &&
      o.beds.motel === 'motel' &&
      o.beds.hospital === 'hospital',
    `each place should have its own sound: ${JSON.stringify(o.beds)}`
  );
  check(o.farN === 6 && new Set(o.far).size >= 2, `far-off sounds should come, and vary: ${o.far}`);
  check(
    o.far.every((f, i) => !i || f !== o.far[i - 1]),
    `the same far-off sound should never come twice running: ${o.far}`
  );
  check(o.withBoss === 0, 'nothing far off should sound with a boss up');
  check(o.menuBed === null, 'the place’s sound should stop at the menu');
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  return `fight songs at ${T['town/plain']} / ${T['highway/plain']} / ${T['cemetery/plain']} bpm; fog ${T['town/fog']}, blood moon ${T['town/blood']}; beds ${Object.values(o.beds).filter(Boolean).join(', ')}; far off: ${[...new Set(o.far)].join(', ')}`;
}
