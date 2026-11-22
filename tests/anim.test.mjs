/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
// The figures move as bodies do. The recordings are sound: every number a number, every turn a turn, no joint
// jumping between frames, a loop's end meeting its start, its hips swaying about where the body is (not drifting
// along it and snapping back, as the run once did: the hero shook a leg's length every stride). And in the game:
// the hero runs steady every way, legs step whenever a body goes somewhere (yours, one of your people's, one of the
// dead's: none glide), no leg snaps as the hero or the dead set off, stop, reverse or turn, and one of the dead
// knocked down lies still once it's down; one of the dead hit reels away from the shot.
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
const ONCE = new Set(['broll', 'roll', 'hit', 'hithead', 'death', 'push', 'scratch', 'knock', 'getup', 'throw']);

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
    // the most any thigh or shin of a figure turns in a frame (its row's turn against last frame's, by the trace)
    const RB = (e, b) => { const q = e._r3 * TWn * 4 + b * 12, D = DATA, c = [0, 1, 2].map(j => { const v = [D[q + j], D[q + 4 + j], D[q + 8 + j]], n = Math.hypot(...v) || 1; return v.map(x => x / n); }); return c; };
    const LEGS = [14, 15, 18, 19], legTurn = (A, B) => { let m = 0; for (let i = 0; i < 4; i++) { let tr = 0; for (let j = 0; j < 3; j++) for (let l = 0; l < 3; l++) tr += A[i][j][l] * B[i][j][l]; m = Math.max(m, Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2)))); } return m; };
    let open = null;
    for (let t = 0; t < 40000 && !open; t++) { const x = 600 + Math.random() * (WW - 1200), y = 600 + Math.random() * (WH - 1200); let ok = true;
      for (let dx = -160; dx <= 160 && ok; dx += 20) for (let dy = -120; dy <= 120 && ok; dy += 20) if (blockPt(x + dx, y + dy)) ok = false; if (ok) open = [x, y]; }
    if (!open) return { err: 'no open ground to turn about on' };
    // the hero setting off, pulling up, reversing, turning, strafing one way and back (aimed east): no leg snaps
    {
      P.x = open[0]; P.y = open[1]; P.vx = P.vy = 0; let prev = null, worst = 0, at = '';
      for (const [ks, n] of [['', 20], ['d', 40], ['', 30], ['a', 40], ['d', 25], ['s', 35], ['w', 35], ['', 30]])
        for (let f = 0; f < n; f++) { keys.clear(); for (const k of ks) keys.add(k); cam.x = P.x - viewW / 2; cam.y = P.y - viewH / 2; mouse.x = viewW * ZOOM / 2 + 300; mouse.y = viewH * ZOOM / 2;
          frame([P]); const cur = LEGS.map(b => RB(P, b)); if (prev) { const a = legTurn(prev, cur); if (a > worst) { worst = a; at = ks || 'stopping'; } } prev = cur; }
      out.turns = { worst: +worst.toFixed(2), at };
    }
    keys.clear();
    // a pack of the dead after him as he goes round a square: they set off, turn, close in; no leg snaps either (as
    // they walk: a pounce, or a swipe, is its own quick move)
    {
      P.x = open[0]; P.y = open[1]; P.vx = P.vy = 0;
      const pack = [{}, { trait: 'runner' }, { kind: 'drag' }, { limp: true }].map((sp, i) => { const a = i * 1.57 + 0.4, e = makeEnemy('skitter', P.x + 200 * Math.cos(a), P.y + 200 * Math.sin(a)); Object.assign(e, sp); e.emerge = 1; e.aw = 9; e.dmg = 0; e.hp = e.maxHp = 1e6; return e; });
      const prev = new Map(); let worst = 0, who = '';
      for (let f = 0; f < 240; f++) { keys.clear(); keys.add('dsaw'[Math.floor(f / 40) % 4]); cam.x = P.x - viewW / 2; cam.y = P.y - viewH / 2; mouse.x = viewW * ZOOM / 2 + 300; mouse.y = viewH * ZOOM / 2;
        frame([P, ...pack]);
        for (const e of pack) { const cur = LEGS.map(b => RB(e, b)), walking = e.st === 'move' && !(e.lunge > 0) && !(e.stag > 0); if (prev.has(e) && f > 5 && walking && e._walk) { const a = legTurn(prev.get(e), cur); if (a > worst) { worst = a; who = (e.trait || e.kind || (e.limp ? 'limp' : 'walker')) + ' at frame ' + f + ' (going ' + Math.round(Math.hypot(e._mvx || 0, e._mvy || 0)) + ', carriage ' + (e._zk || 0).toFixed(2) + ', feet ' + (e._flk || []).map(L => (L.on ? 'down ' : 'up ') + (L.pw || 0).toFixed(1)).join(' and ') + (e._in && e._in.off ? ', easing a jump' : '') + (Math.hypot(e.kx || 0, e.ky || 0) > 1 ? ', shoved' : '') + ')'; } } prev.set(e, cur); e._walk = walking; } }
      for (const e of pack) e.dead = true; GS.enemies = GS.enemies.filter(e => !pack.includes(e));
      out.pack = { worst: +worst.toFixed(2), who };
    }
    keys.clear();
    // dogs and brutes after him too: no bone of theirs snaps (a dog's leap and a brute's charge are quick, but eased)
    {
      P.x = open[0]; P.y = open[1]; P.vx = P.vy = 0;
      const pack = ['hound', 'hound', 'beetle', 'beetle'].map((T, i) => { const a = i * 1.57 + 0.4, e = makeEnemy(T, P.x + 220 * Math.cos(a), P.y + 220 * Math.sin(a)); e.emerge = 1; e.aw = 9; e.dmg = 0; e.hp = e.maxHp = 1e6; return e; });
      const prev = new Map(); let worst = 0, who = '';
      for (let f = 0; f < 240; f++) { keys.clear(); keys.add('dsaw'[Math.floor(f / 40) % 4]); cam.x = P.x - viewW / 2; cam.y = P.y - viewH / 2; mouse.x = viewW * ZOOM / 2 + 300; mouse.y = viewH * ZOOM / 2;
        frame([P, ...pack]);
        for (const e of pack) { if (e.dead) continue; const nb = FIG.models[modelOf(e)].rest.length, cur = []; for (let b = 0; b < nb; b++) cur.push(RB(e, b));
          if (prev.has(e) && f > 5) for (let b = 0; b < nb; b++) { let tr = 0; for (let j = 0; j < 3; j++) for (let l = 0; l < 3; l++) tr += prev.get(e)[b][j][l] * cur[b][j][l]; const a = Math.acos(Math.max(-1, Math.min(1, (tr - 1) / 2))); if (a > worst) { worst = a; who = (e.type === 'hound' ? 'dog' : 'brute') + ' ' + e.st + ', bone ' + b; } }
          prev.set(e, cur); } }
      for (const e of pack) e.dead = true; GS.enemies = GS.enemies.filter(e => !pack.includes(e));
      out.beasts = { worst: +worst.toFixed(2), who };
    }
    keys.clear();
    // a crawler hauls itself along hand over hand: a hand put down holds where it is, and each hand goes from out ahead
    // to back by its shoulder and out again
    {
      P.x = open[0] + 150; P.y = open[1];
      const e = makeEnemy('skitter', open[0] - 100, open[1]); e.emerge = 1; e.aw = 9; e.dmg = 0; e.hp = e.maxHp = 1e6; e.crawl = true; e.cfall = 0; e.lyG = 1; e.fallA = e.a; e.run = false;
      const MZ = () => FIG.models[modelOf(e)], hand = b => { const q = e._r3 * TWn * 4 + b * 12, v = MZ().ends[b], D = DATA; return [D[q] * v[0] + D[q + 1] * v[1] + D[q + 2] * v[2] + D[q + 3], D[q + 4] * v[0] + D[q + 5] * v[1] + D[q + 6] * v[2] + D[q + 7]]; };
      let slip = 0, prev = null; const ahead = [[1e9, -1e9], [1e9, -1e9]];
      for (let f = 0; f < 180; f++) { keys.clear(); P.vx = P.vy = 0; cam.x = P.x - viewW / 2; cam.y = P.y - viewH / 2; frame([P, e]);
        const hs = [hand(9), hand(13)], q = e._r3 * TWn * 4, hp = [DATA[q + 3], DATA[q + 7]], a = e._chd ? e._chd.a : e.a;
        if (f > 20) for (let i = 0; i < 2; i++) { const fa = (hs[i][0] - hp[0]) * Math.cos(a) + (hs[i][1] - hp[1]) * Math.sin(a); ahead[i][0] = Math.min(ahead[i][0], fa); ahead[i][1] = Math.max(ahead[i][1], fa);
          if (prev && e._cr && e._cr.h[i] && e._cr.h[i].on && prev[2][i]) slip = Math.max(slip, Math.hypot(hs[i][0] - prev[i][0], hs[i][1] - prev[i][1])); }
        prev = [hs[0], hs[1], e._cr ? e._cr.h.map(h => !!(h && h.on)) : [0, 0]]; }
      e.dead = true; GS.enemies = GS.enemies.filter(x => x !== e);
      out.crawl = { slip: +slip.toFixed(2), reach: ahead.map(r => +(r[1] - r[0]).toFixed(0)) };
    }
    keys.clear();
    // one of the dead hit: it reels (its spring kicked), and the bend takes its head away from the shot, whichever
    // side the shot comes from
    {
      const e = makeEnemy('skitter', open[0] - 200, open[1]); e.emerge = 1; e.aw = 0; e.dmg = 0; e.hp = e.maxHp = 100;
      for (let f = 0; f < 4; f++) frame([P, e]);
      e.hp = 100; hurtEnemy(e, 25, false, -1, 0, 1, 'bolt', e.x, e.y - 20);
      let peak = 0; for (let f = 0; f < 8; f++) { e.hp = 100; frame([P, e]); peak = Math.max(peak, e._hs ? e._hs.x : 0); }
      const MZ = FIG.models[modelOf(e)], o = e._r3 * TWn * 4, away = [];
      for (const from of [0, 90, 180, 270]) { const D2 = DATA.slice(), ps = from * Math.PI / 180;
        e._hs = { x: 1, v: 0, t: GS.time, psi: ps, head: 0, hk: 0 }; e.hitAcc = 0; flinch(e, D2, o, MZ);
        const q = o + 5 * 12, v = MZ.rest[5], hx = D => D[q] * v[0] + D[q + 1] * v[1] + D[q + 2] * v[2] + D[q + 3], hy = D => D[q + 4] * v[0] + D[q + 5] * v[1] + D[q + 6] * v[2] + D[q + 7];
        away.push(+(-(hx(D2) - hx(DATA)) * Math.cos(ps) - (hy(D2) - hy(DATA)) * Math.sin(ps)).toFixed(1)); }
      e.dead = true; GS.enemies = GS.enemies.filter(x => x !== e);
      out.hit = { peak: +peak.toFixed(2), away };
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
    // (what it was up to, frame by frame, for the message if this fails: idle, feeding, kneeling, aware, lured, crawling, pinned, a bad number in its feet)
    const zs = new Set(); out.zombie = legsOf(z, FIG.models[modelOf(z)] || FIG.models.zombie, 110, () => { P.x = spot[0] - 320; P.y = spot[1]; zs.add([z.idle ? z.idle.k : '-', z.feed ? z.feed.st : '-', z._fkS || '-', z.aw > 0 ? 'A' : 'u', z.lure ? 'L' : '', z.crawl ? 'C' : '', z.pin ? 'P' : '', Number.isFinite(DATA[z._r3 * TWn * 4 + 16 * 12 + 3]) ? '' : 'NaN'].join('')); }); out.zombie.dbg = [...zs];
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
  // (smooth, his turn at most 0.36 a frame, reversing a run sideways, the dead's 0.4; a foot let go in a frame, a
  // leg's twist taken from its hips, or a straight leg's knee flipping, turned them 0.5 to 0.86)
  check(
    o.turns.worst < 0.45,
    `the hero's legs should not snap as he sets off, stops, reverses or turns: a thigh or shin turned ${o.turns.worst} rad in one frame (${o.turns.at})`
  );
  check(
    o.pack.worst < 0.45,
    `the legs of the dead after him should not snap as they set off and turn: a thigh or shin turned ${o.pack.worst} rad in one frame (a ${o.pack.who})`
  );
  check(
    // (a fingertip can sweep a little, up to 7 cm in a frame now and then, as the forearm turns over a planted hand;
    // a hand sliding along with the body would go several units a frame)
    o.crawl.slip < 1.5 && o.crawl.reach.every(r => r > 10),
    `a crawler should haul itself hand over hand: a hand put down slid ${o.crawl.slip} in a frame, its hands went ${o.crawl.reach.join(' and ')} along its body`
  );
  check(
    o.beasts.worst < 0.9,
    `dogs and brutes after him should not snap: a bone turned ${o.beasts.worst} rad in one frame (a ${o.beasts.who})`
  );
  check(
    o.hit.peak > 0.5 && o.hit.away.every(a => a > 2),
    `one of the dead hit should reel away from the shot: its bend reached ${o.hit.peak}, its head went ${o.hit.away.join(', ')} away from shots from the east, south, west, north`
  );
  check(
    o.survivor.went > 1.2 && o.survivor.stride > 0.3 && o.survivor.on > 0.6,
    `one of your people following you should walk, not glide: went ${o.survivor.went} legs, feet ${o.survivor.stride} back and forth, walking ${o.survivor.on}`
  );
  check(
    o.zombie.went > 1.2 && o.zombie.stride > 0.3 && o.zombie.on > 0.6,
    `one of the dead coming at you should walk, not glide: went ${o.zombie.went} legs, feet ${o.zombie.stride} back and forth, its legs at ${o.zombie.on} of its pace (states seen: ${o.zombie.dbg.join(' ')})`
  );
  check(
    o.lying.down && o.lying.legMove < 3,
    `one of the dead knocked down should lie still: its legs move ${o.lying.legMove} a frame`
  );
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  const R = o.run;
  return `crawls, hands go ${o.crawl.reach.join('/')}, a planted one slides ≤ ${o.crawl.slip}; hit, reels ${o.hit.peak}, head ${Math.min(...o.hit.away)}+ away; legs turn ≤ ${o.turns.worst} a frame (his), ${o.pack.worst} (the dead's), ${o.beasts.worst} (dogs' and brutes'); run: jumps ≤ ${Math.max(...Object.values(R).map(v => v.jump))}, sway ≤ ${Math.max(...Object.values(R).map(v => v.sway))}; strides ${o.survivor.stride} (yours) ${o.zombie.stride} (the dead); down, legs move ${o.lying.legMove}`;
}
