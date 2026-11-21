/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The figures move as bodies do. The recordings are sound: every number a number, every turn a turn, no joint
// jumping between frames, a loop's end meeting its start, its hips swaying about where the body is (not drifting
// along it and snapping back, as the run once did: the hero shook a leg's length every stride). And in the game:
// the hero runs steady every way, legs step whenever a body goes somewhere (yours, one of your people's, one of the
// dead's: none glide), and one of the dead knocked down lies still once it's down.
import { openGame, check } from './lib/harness.mjs';
import { FK } from '../src/render/motion.js';
import { FKC } from '../src/render/motion-cmu.js';

const PAR = [-1, 0, 1, 2, 3, 4, 3, 6, 7, 8, 3, 10, 11, 12, 0, 14, 15, 16, 0, 18, 19, 20];
const qmul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const inv = q => [-q[0], -q[1], -q[2], q[3]];
const ang = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])));
// how far each joint turns (against its parent) from frame A to frame B, the most of them
const step = (A, B) => {
  let m = 0;
  for (let b = 1; b < 22; b++) {
    const p = PAR[b],
      la = qmul(inv(A.slice(p * 4, p * 4 + 4)), A.slice(b * 4, b * 4 + 4)),
      lb = qmul(inv(B.slice(p * 4, p * 4 + 4)), B.slice(b * 4, b * 4 + 4));
    m = Math.max(m, ang(la, lb));
  }
  return m;
};
// the looped ones (walks, runs, stances): one-offs (a roll, a death, a get-up) need not meet their start
const ONCE = new Set(['roll', 'hit', 'death', 'push', 'scratch', 'knock', 'getup', 'throw']);

function recordings() {
  const bad = [];
  const all = [
    ...Object.entries(FK.clips).map(([k, c]) => ['FK.' + k, c]),
    ...Object.entries(FKC).map(([k, c]) => ['CMU.' + k, c]),
  ];
  for (const [k, c] of all) {
    const n = c.frames.length,
      loop = !ONCE.has(k.split('.')[1]);
    for (let i = 0; i < n; i++) {
      const f = c.frames[i];
      if (f.length !== 88 || f.some(x => typeof x !== 'number' || !Number.isFinite(x))) {
        bad.push(`${k}: frame ${i} has a blank or a non-number`);
        break;
      }
      for (let b = 0; b < 22; b++)
        if (Math.abs(Math.hypot(...f.slice(b * 4, b * 4 + 4)) - 1) > 0.02) {
          bad.push(`${k}: frame ${i}, bone ${b} is not a turn`);
          i = n;
          break;
        }
    }
    let worst = 0;
    for (let i = 0; i < n - 1; i++) worst = Math.max(worst, step(c.frames[i], c.frames[i + 1]));
    if (worst > 1.0) bad.push(`${k}: a joint turns ${worst.toFixed(2)} rad in one frame`);
    if (loop) {
      const w = step(c.frames[n - 1], c.frames[0]);
      if (w > 1.0) bad.push(`${k}: its loop jumps ${w.toFixed(2)} rad where it meets its start`);
      const xs = c.root.map(r => r[0]),
        ys = c.root.map(r => r[1]),
        sx = Math.max(...xs) - Math.min(...xs),
        sy = Math.max(...ys) - Math.min(...ys);
      if (sx > 0.7 || sy > 0.7)
        bad.push(`${k}: its hips wander ${sx.toFixed(2)} × ${sy.toFixed(2)} leg lengths about the body`);
      if (k.startsWith('CMU.') && !(c.v > 0)) bad.push(`${k}: no speed`);
    }
  }
  return bad;
}

export const name = 'anim: sound recordings; the hero runs steady; legs step wherever bodies go; the downed lie still';
export async function run(b) {
  const bad = recordings();
  check(!bad.length, 'the recordings: ' + bad.slice(0, 6).join('; '));
  const { pg, errs, ev } = await openGame(b, { noFrames: true });
  for (let i = 0; i < 120 && !(await ev('fig3dOn() && !!FIG.models && !!FIG.models.hero')); i++)
    await pg.waitForTimeout(500);
  const o = await ev(`(() => {
    initAudio(); GS.meta.tutDone = true; GS.meta.hero = 'ranger'; begin(); GS.RUN.tut = null; GS.RUN.jobN = []; GS.state = 'play';
    GS.queue = []; for (const e of GS.enemies) e.dead = true; GS.enemies.length = 0; GS.nightLive = false; GS.interT = 999;
    const P = GS.P, out = {}, MM = FIG.models.hero, r = MM.rest, TWn = NB * 3 + 8;
    if (!(r.length > 14)) return { err: 'the hero is not on the fuller skeleton' };
    let spot = null;
    for (let t = 0; t < 40000 && !spot; t++) { const x = 600 + Math.random() * (WW - 1200), y = 600 + Math.random() * (WH - 1200); let ok = true;
      for (let dx = -340; dx <= 340 && ok; dx += 20) for (let dy = -30; dy <= 30 && ok; dy += 15) if (blockPt(x + dx, y + dy)) ok = false; for (let dy = -40; dy <= 200 && ok; dy += 20) if (blockPt(x, y + dy)) ok = false; if (ok) spot = [x, y]; }
    if (!spot) return { err: 'no open ground' };
    // a figure's joint b this frame (where its row puts rest[b]), from its row in the bone texture
    const J = (e, b, rest) => { const q = e._r3 * TWn * 4 + b * 12, v = rest[b], D = DATA;
      return [D[q]*v[0]+D[q+1]*v[1]+D[q+2]*v[2]+D[q+3], D[q+4]*v[0]+D[q+5]*v[1]+D[q+6]*v[2]+D[q+7], D[q+8]*v[0]+D[q+9]*v[1]+D[q+10]*v[2]+D[q+11]]; };
    const frame = (drawn) => { P.hp = S.maxHp; P.inv = 9; update(1 / 60); tickWorld(1 / 60); fig3dFrame(); for (const e of drawn) e === P || e.npc ? drawRanger(e) : drawFig3D(e); };
    const Hl = r[14][2] * MM.scale * FIGK;
    // the hero running each way, aimed east: his hips, head and gun against his body, frame to frame
    out.run = {};
    for (const [nm, ks] of [['forward', 'd'], ['sideways', 'w'], ['backing off', 'a']]) {
      P.x = spot[0] - (nm === 'forward' ? 300 : nm === 'backing off' ? -300 : 0); P.y = spot[1] + (nm === 'sideways' ? 160 : 0); P.vx = P.vy = 0;
      const rec = [];
      for (let f = 0; f < 110; f++) {
        keys.clear(); for (const k of ks) keys.add(k);
        cam.x = P.x - viewW / 2; cam.y = P.y - viewH / 2; mouse.x = viewW * ZOOM / 2 + 300; mouse.y = viewH * ZOOM / 2;
        frame([P]);
        if (f < 50) continue;
        const c = Math.cos(P.moveA), s = Math.sin(P.moveA), loc = q => [(q[0] - P.x) * c + (q[1] - P.y) * s, -(q[0] - P.x) * s + (q[1] - P.y) * c, q[2]];
        rec.push([loc(J(P, 0, r)), loc(J(P, 5, r)), P._mz ? loc(P._mz) : [0, 0, 0], loc(J(P, 16, r))]);
      }
      let jump = 0, sway = 0, nan = false, foot = [1e9, -1e9];
      for (let i = 0; i < rec.length; i++) for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) { if (!Number.isFinite(rec[i][k][j])) nan = true; if (i) jump = Math.max(jump, Math.abs(rec[i][k][j] - rec[i - 1][k][j])); }
      for (let k = 0; k < 3; k++) for (const j of [0, 1]) { const v = rec.map(q => q[k][j]); sway = Math.max(sway, Math.max(...v) - Math.min(...v)); }
      for (const q of rec) { foot[0] = Math.min(foot[0], q[3][0]); foot[1] = Math.max(foot[1], q[3][0]); }
      out.run[nm] = { jump: +jump.toFixed(2), sway: +sway.toFixed(2), stride: +((foot[1] - foot[0]) / Hl).toFixed(2), nan };
    }
    keys.clear();
    // one of your people following you, and one of the dead walking at you: their feet go back and forth under them
    const legsOf = (e, MMe, n, move) => { const re = MMe.rest; let lo = 1e9, hi = -1e9, dist = 0, x0 = e.x, y0 = e.y; const H = re[14][2] * MMe.scale * FIGK * (e.sc || 1);
      for (let f = 0; f < n; f++) { move(f); frame([P, e]); if (f < 30) { x0 = e.x; y0 = e.y; continue; }
        const a = Math.atan2(e.y - y0, e.x - x0), ft = J(e, 16, re), d = (ft[0] - e.x) * Math.cos(a) + (ft[1] - e.y) * Math.sin(a);
        lo = Math.min(lo, d); hi = Math.max(hi, d); }
      dist = Math.hypot(e.x - x0, e.y - y0);
      // and whether its legs know it's going: walking (its walk's weight), at the pace it goes
      const on = e.npc ? e._wm ?? 0 : Math.hypot(e._mvx || 0, e._mvy || 0) / Math.max(1, dist / ((n - 30) / 60));
      return { went: +(dist / H).toFixed(1), stride: +((hi - lo) / H).toFixed(2), on: +on.toFixed(2) }; };
    P.x = spot[0] - 300; P.y = spot[1]; P.vx = P.vy = 0;
    const s = Object.assign(makeSurvivor(P.x - 40, P.y + 30), { a: 0, cd: 0, aim: 0, look: 1, tint: NPC_TINTS[0] });
    budSetup(s, rollBud()); GS.buddies.push(s);
    out.survivor = legsOf(s, FIG.models.hero, 100, f => { keys.clear(); keys.add('d'); });
    keys.clear(); GS.buddies.length = 0;
    const z = makeEnemy('skitter', spot[0] + 300, spot[1]); z.emerge = 1; z.aw = 9; z.dmg = 0; z.hp = z.maxHp = 1e6; z.run = false; z.trait = null;
    P.x = spot[0] - 320; P.y = spot[1]; P.vx = P.vy = 0;
    out.zombie = legsOf(z, FIG.models[modelOf(z)] || FIG.models.zombie, 110, () => { P.x = spot[0] - 320; P.y = spot[1]; });
    // the same one knocked onto its back: once it's down, its legs lie still
    z.dT = DOWN_T; z.down = z.dT; z.sup = true; z.fallA = (z.a || 0) + Math.PI; z.lyG = 0; z.vx = z.vy = 0;
    let lieJump = 0, prev = null; const MZ = FIG.models[modelOf(z)] || FIG.models.zombie;
    for (let f = 0; f < 52; f++) { frame([P, z]); if (f < 36) continue; // (down, before it starts to get up at 0.87 s)
      const kn = [J(z, 15, MZ.rest), J(z, 16, MZ.rest), J(z, 19, MZ.rest), J(z, 20, MZ.rest)].map(q => [q[0] - z.x, q[1] - z.y, q[2]]);
      if (prev) for (let i = 0; i < 4; i++) lieJump = Math.max(lieJump, Math.hypot(kn[i][0] - prev[i][0], kn[i][1] - prev[i][1], kn[i][2] - prev[i][2])); prev = kn; }
    out.lying = { legMove: +lieJump.toFixed(2), down: z.down > 0 };
    z.dead = true;
    return out;
  })()`);
  await pg.close();
  check(!o.err, o.err);
  for (const [nm, v] of Object.entries(o.run)) {
    check(!v.nan, `the hero running ${nm}: his pose has a blank in it`);
    check(
      v.jump < 2.5,
      `the hero running ${nm} should be steady frame to frame: hips, head or gun jump ${v.jump} in one`
    );
    check(
      v.sway < 8,
      `the hero running ${nm} should sway, not shake: hips, head or gun swing ${v.sway} about his body`
    );
    check(v.stride > 0.4, `the hero running ${nm} should step: his foot goes ${v.stride} leg lengths back and forth`);
  }
  check(
    o.survivor.went > 2 && o.survivor.stride > 0.3 && o.survivor.on > 0.6,
    `one of your people following you should walk, not glide: went ${o.survivor.went} legs, feet ${o.survivor.stride} back and forth, walking ${o.survivor.on}`
  );
  check(
    o.zombie.went > 2 && o.zombie.stride > 0.3 && o.zombie.on > 0.6,
    `one of the dead coming at you should walk, not glide: went ${o.zombie.went} legs, feet ${o.zombie.stride} back and forth, its legs at ${o.zombie.on} of its pace`
  );
  check(
    o.lying.down && o.lying.legMove < 3,
    `one of the dead knocked down should lie still: its legs move ${o.lying.legMove} a frame`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  const R = o.run;
  return `run: jumps ≤ ${Math.max(...Object.values(R).map(v => v.jump))}, sway ≤ ${Math.max(...Object.values(R).map(v => v.sway))}; strides ${o.survivor.stride} (yours) ${o.zombie.stride} (the dead); down, legs move ${o.lying.legMove}`;
}
