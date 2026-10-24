/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
function updateQueen(e, dt, ux, uy, dist) {
  curBoss = e; bossVoice(e, dt);
  if (e.st !== e.cueSt) { e.cueSt = e.st; if (WIND_ST.has(e.st)) { e.cueT = e.cueMax = clamp(e.stT || 0.4, 0.3, 0.6); e.cueA = Math.atan2(P.y - e.y, P.x - e.x); } } e.cueT = Math.max(0, (e.cueT || 0) - dt); // the tell: as a move begins its head snaps to you and its eyes catch the light
  crushCrystals(e.x, e.y, e.r * 0.8);
  const hpr = e.hp / e.maxHp, ph = hpr > 0.66 ? 0 : hpr > 0.33 ? 1 : 2, G = e.giant, bt = e.btype;
  if (ph !== e.ph) { if (e.ph >= 0) { banner(ph === 1 ? `${bossName()} is hurt` : `${bossName()} is frenzied`, bossPhaseText(e, ph), true); sfx.roar(e.x, e.y); shake(0.4); interruptBoss(e); e.st = 'roar'; e.stT = 1.5; e.busyT = 1.5; e.summonT = Math.max(e.summonT, 2); for (const b of ebullets) if (!b.owner || b.owner === e) { b.life = 0; glowBurst(b.x, b.y, b.c || BILE, 2, 60, 0.2, 0.3); } for (let k = Math.max(1, e.ph + 1); k <= ph; k++) arenaPhase(e, k, k < ph); MUS.phJump = ph; } e.ph = ph; } // a stinger, and the band moves on to a harder part
  const spMul = [1, 1.12, 1.3][ph];
  e.face = Math.atan2(P.y - e.y, P.x - e.x);
  e.clawT = Math.max(0, e.clawT - dt); const cw = e.clawW || 0.75; e.claw = e.clawT > cw - 0.55 ? 0 : e.clawT > 0 ? Math.min(1, (cw - 0.55 - e.clawT) / 0.12 + 0.02) : 0; // wind-up (arm back), then the swing
  e.busyT = Math.max(0, (e.busyT || 0) - dt); e.recT = Math.max(0, (e.recT || 0) - dt); if (e.recT > 0 && e.recT < 0.35 && !e.huff) { e.huff = 1; const b = spat(e.x, e.y); noise(0.3, 0.09, 520, 140, 'lowpass', 0, b); tone(70, 0.25, 'sine', 0.05, 0.7, 0, 0, b); } else if (!(e.recT > 0)) e.huff = 0; /* a heavy breath out: it is about to turn back on you */ e.rcx = (e.rcx || 0) * Math.exp(-dt * 9); e.rcy = (e.rcy || 0) * Math.exp(-dt * 9); e.wind = e.clawT > (e.clawW || 0.75) - 0.55 ? ((e.clawW || 0.75) - e.clawT) / 0.55 : 0; e.stg = Math.max(0, (e.stg || 0) - dt * e.maxHp * 0.008); e.turnT = Math.max(0, (e.turnT || 0) - dt); if (e.recT > 0.25 && !e.recWas) sfx.grunt(e.x, e.y); e.recWas = e.recT > 0.25; // an opening: it sags and catches its breath
  e.tvx = e.tvy = 0;
  if (G) { const sp = Math.hypot(e.vx, e.vy), sd = Math.floor((e.stride || 0) * 2); if (sp > 30 && sd !== e.stepI) { e.stepI = sd; const d = Math.hypot(P.x - e.x, P.y - e.y); if (d < 520) shake(0.03 * (1 - d / 520) * (bt === 'roadkill' ? 1.4 : 1)); { const fa = e.a ?? 0, side = (sd & 1) ? 1 : -1, off = e.r * 1.05; dust(e.x - Math.sin(fa) * side * off - Math.cos(fa) * 10, e.y + Math.cos(fa) * side * off - Math.sin(fa) * 10, 2, 30, 0.8, 0.6); } /* kicked up beside the foot, not over the body */ if (thr('gstep', 160)) noise(0.14, 0.12 * clamp(1 - d / 900, 0, 1), 180, 50, 'lowpass', 0, spat(e.x, e.y)); } } // weight: every footfall
  if (e.spinT > 0) { e.spinT -= dt; e.stunT -= dt; const k = Math.min(1, e.spinT); e.a += dt * 7 * k; e.face = e.a; const va = e.a + Math.PI * 0.9; e.tvx = Math.cos(va) * 240 * k; e.tvy = Math.sin(va) * 240 * k; // the venting tank throws it around
    if (Math.random() < 0.7) { const bx = e.x - Math.cos(e.a) * 40, by = e.y - Math.sin(e.a) * 40; part({ k: 2, x: bx, y: by, vx: -Math.cos(e.a) * 220 + rand(-30, 30), vy: -Math.sin(e.a) * 220 + rand(-30, 30), life: rand(0.5, 0.9), max: 0.9, size: rand(0.5, 0.9), grow: 2.2, drag: 2, rot: rand(0, TAU), vr: rand(-2, 2), c: [0.82, 0.82, 0.8] }); }
    if (state === 'play' && hitsP(e.x, e.y, e.r * 0.9) && thr('spinhit', 600)) hurtPlayer(e.dmg * 0.6, e.x, e.y);
    if (e.spinT <= 0) { e.stunT = Math.max(e.stunT, 0.9); } return; }
  if (e.stunT > 0) { e.stunT -= dt; e.vx *= 0.8; e.vy *= 0.8; if (e.stunT <= 0) e.recT = 0.6; return; } // reeling: armour down
  if (e.st === 'roar') { e.stT -= dt; if (e.stT <= 0) { e.st = 'move'; e.recT = 0; } return; }
  // ---- the charge (Abomination from phase 2, Roadkill always): rear up, a lane on the ground shows the line, then it comes
  if (e.st === 'rear') { if (Math.random() < 0.5) dust(e.x - e.lx * e.r * 0.8 + rand(-14, 14), e.y - e.ly * e.r * 0.8 + rand(-14, 14), 1, 50, 1, 0.6); /* pawing the ground before it goes */ e.stT -= dt; if (!e.bait && state === 'play') { const a = Math.atan2(P.y - e.y, P.x - e.x); e.lx = Math.cos(a); e.ly = Math.sin(a); } e.face = Math.atan2(e.ly, e.lx);
    if (e.stT <= 0 && !e.bait && state === 'play') { const pv = Math.hypot(P.vx, P.vy), vk = pv > 260 ? 260 / pv : 1, t = clamp(Math.hypot(P.x - e.x, P.y - e.y) / 760, 0.1, 0.45), a = Math.atan2(P.y + P.vy * vk * t - e.y, P.x + P.vx * vk * t - e.x); e.lx = Math.cos(a); e.ly = Math.sin(a); } // it watches you the whole time it paws the ground, and goes where you are heading: running sideways is not enough, roll as it comes
    if (e.stT <= 0) { e.st = 'charge'; e.stT = 0.95; sfx.roar(e.x, e.y); } return; }
  if (e.st === 'charge') return bossCharge(G, bt, dt, e, ph);
  // ---- Abomination's leap
  if (e.st === 'crouch') { e.stT -= dt; e.face = Math.atan2(e.ty - e.y, e.tx - e.x); if (e.stT <= 0) { e.st = 'leap'; e.stT = e.ldur; e.sx = e.x; e.sy = e.y; sfx.roar(e.x, e.y); dust(e.x, e.y, 12, 120, 1.6, 1); } return; }
  if (e.st === 'leap') return bossLeap(dist, dt, e, ph);
  // ---- the Gravekeeper's grave slam: the spade goes up, then down; the ground splits toward you and the dead climb out along the crack
  if (e.st === 'gslam') { e.stT -= dt; e.face = e.ga; if (e.stT <= 0) { e.st = 'move'; e.recT = 1.3; graveCrack(e, e.ga, ph, true); if (e.gfan) { e.gfan = false; graveCrack(e, e.ga - 0.42, ph, false); graveCrack(e, e.ga + 0.42, ph, false); }
      if (ph >= 1 && !e.gs2 && state === 'play') { e.gs2 = true; e.recT = 0; e.ga = Math.atan2(P.y - e.y, P.x - e.x); e.st = 'gslam'; e.stT = 0.55; e.busyT = 0.55 + 1.3; e.clawW = 0.55; e.clawT = 0.55; bossWarn({ lane: true, x: e.x, y: e.y, a: e.ga, len: 300, w: 46, dur: 0.55, k: 'dead' }); sfx.bell(e.x, e.y); } else e.gs2 = false; // hurt, it wrenches the spade free and brings it down again where you went
    } return; }
  // ---- Patient Zero: the scream (a long breath in first) and the IV-pole swing
  if (e.st === 'inhale') { e.stT -= dt; e.squash = 0.1; if (Math.random() < 0.3) part({ k: 2, x: e.x + Math.cos(e.a) * 40, y: e.y + Math.sin(e.a) * 40, vx: -Math.cos(e.a) * 40, vy: -Math.sin(e.a) * 40, life: 0.5, max: 0.5, size: 0.4, grow: 0.5, drag: 1, c: [0.5, 0.52, 0.5] });
    if (e.stT <= 0) { e.st = 'move'; e.recT = bt === 'pz' ? 1.4 : 1.0; if (bt === 'pz') pzScream(e, ph); else { screamAt(e); makeNoise(e.x, e.y, 1600); sfx.roar(e.x, e.y); } shake(0.35); } return; }
  // ---- the Fire Chief's overhead chop: the axe goes back over the helmet, then down along a line; it sticks in the ground for a moment
  if (e.st === 'brace') { e.stT -= dt; if (Math.random() < 0.4) dust(e.x - Math.cos(e.face) * 40, e.y - Math.sin(e.face) * 40, 1, 40, 1, 0.6); if (e.stT <= 0) { const tx = P.x + P.vx * 0.25, ty = P.y + P.vy * 0.25, a = Math.atan2(ty - e.y, tx - e.x); e.lx = Math.cos(a); e.ly = Math.sin(a); e.st = 'rush'; e.stT = 0.55; sfx.roar(e.x, e.y); } return; }
  if (e.st === 'rush') { e.stT -= dt; e.face = Math.atan2(e.ly, e.lx); e.tvx = e.vx = e.lx * 600; e.tvy = e.vy = e.ly * 600; if (Math.random() < 0.6) dust(e.x, e.y, 1, 40, 1.2, 0.7);
    if (state === 'play' && hitsP(e.x + e.lx * 30, e.y + e.ly * 30, e.r * 0.9) && !e.rushHit) { e.rushHit = true; hurtPlayer(e.dmg * 0.9, e.x, e.y); P.vx += e.lx * 520; P.vy += e.ly * 520; shake(0.3); sfx.crunch(P.x, P.y); }
    const edge = (e.x < 3 * TILE + e.r && e.lx < 0) || (e.x > WW - 3 * TILE - e.r && e.lx > 0) || (e.y < 3 * TILE + e.r && e.ly < 0) || (e.y > WH - 3 * TILE - e.r && e.ly > 0);
    if (e.stT <= 0 || edge) { e.st = 'move'; e.rushHit = false; e.recT = 0.7; e.turnT = 0.9; e.vx *= 0.3; e.vy *= 0.3; } return; } // it overshoots and has to turn round: a window
  if (e.st === 'chop') return bossChop(dt, e, ph);
  if (e.st === 'pswing') { e.stT -= dt; e.spin = (e.spin || 0) + dt * (e.stT < 0.35 ? 18 : 2); if (e.stT <= 0) { const R0 = e.ps2 ? 175 : 135; e.st = 'move'; e.recT = 1.0; e.spin = 0; if (hitsP(e.x, e.y, R0)) hurtPlayer(e.dmg * 1.15, e.x, e.y); ring(e.x, e.y, 12, R0, 0.3, [1.4, 1.4, 1.2], 0.7); sfx.crunch(e.x, e.y); shake(0.3);
      if (bt === 'pz' && ph >= 1 && !e.ps2 && state === 'play') { e.ps2 = true; e.recT = 0; e.st = 'pswing'; e.stT = 0.5; e.busyT = 0.5 + 1.4; bossWarn({ x: e.x, y: e.y, r: 175, dur: 0.5, k: 'slam', follow: e }); sfx.poleWhoosh(e.x, e.y); } else e.ps2 = false; } return; } // hurt, it steps into a second, wider swing: don't walk back in after the first
  if (e.st === 'sprint') return bossSprint(dt, e, ph);
  if (e.st === 'act') { e.stT -= dt; if (e.actFace !== undefined) e.face = e.actFace; if (e.actTick) e.actTick(dt); if (e.stT <= 0) { const f = e.actFn; e.st = 'move'; e.actFn = e.actTick = null; e.actFace = undefined; if (e.actRec) e.recT = Math.max(e.recT, e.actRec); if (f) f(); } return; }
  // the Gravekeeper with its lantern smashed: blind, it goes for the last gunshot it heard
  if (bt === 'grave' && e.blindT > 0) { e.blindT -= dt; const heard = time - NOISE.t < 2.5 && d2(NOISE.x, NOISE.y, e.x, e.y) < (NOISE.r || 900) ** 2; if (heard) { e.hx2 = NOISE.x; e.hy2 = NOISE.y; }
    if (e.blindT <= 0) showStreak('It can see again', 'Its lantern is gone, but it found you');
    else if (dist > 130) { const tx = e.hx2 ?? e.x, ty = e.hy2 ?? e.y, a = Math.atan2(ty - e.y, tx - e.x), d = Math.hypot(tx - e.x, ty - e.y); if (d > 40) { e.face = a; e.tvx = Math.cos(a) * e.sp * 1.2; e.tvy = Math.sin(a) * e.sp * 1.2; } else e.face += dt * 0.8; if (Math.random() < dt * 0.8) sfx.grunt(e.x, e.y); return; } }
  // ---- walking and choosing the next move
  if (bt === 'pz' && ph >= 1 && Math.hypot(e.vx, e.vy) > 20 && (e.trailT = (e.trailT || 0) - dt) <= 0 && pools.length < 40) { e.trailT = 0.5; pools.push({ x: e.x - Math.cos(e.a) * 30, y: e.y - Math.sin(e.a) * 30, r: 28, life: 4.5, max: 4.5, dmg: 5 * (1 + 0.04 * wave), rot: rand(0, TAU), v: randi(0, 3) }); } // it bleeds infection where it walks: the room to move shrinks
  if (bt === 'grave' && ph >= 1) for (const fg of freshGraves) if (!fg.used && d2(fg.x, fg.y, P.x, P.y) < 30 * 30) { fg.used = true; const z = makeEnemy('mini', fg.x, fg.y); z.emerge = 0.4; z.aw = 9; hurtPlayer(8 * (1 + 0.04 * wave), fg.x, fg.y, 'the Gravekeeper'); P.daze = Math.max(P.daze || 0, 0.6); dust(fg.x, fg.y, 8, 80, 1.2, 1); chips(fg.x, fg.y, 6, [0.4, 0.3, 0.2], 4, 200); sfx.dig(fg.x, fg.y); } // a hand out of a fresh grave
  const k = dist > 240 ? 1 : dist < 150 ? -0.35 : 0.25, slow = e.recT > 0 ? 0.25 : 1;
  e.tvx = (ux * k - uy * 0.3) * e.sp * spMul * slow; e.tvy = (uy * k + ux * 0.3) * e.sp * spMul * slow;
  if (e.emerge < 1) return;
  // close-range swing: no circle on the ground; the arm (or spade, or sign) is drawn back first
  const sweep = bt === 'grave' || bt === 'chief', reach = bt === 'grave' ? 165 : bt === 'roadkill' || bt === 'chief' ? 150 : 130, swingR = bt === 'grave' ? 150 : bt === 'chief' ? 140 : 95; e.stuckT = Math.max(0, (e.stuckT || 0) - dt);
  if (dist < reach + 30 && e.clawT <= 0 && e.recT <= 0 && time > (e.swingCd || 0)) {
    e.clawW = 0.85; e.clawT = 0.85; e.swingCd = time + (sweep ? 1.6 : 1.1); const lockA = e.face, tok = e.atk = (e.atk || 0) + 1; sfx.grunt(e.x, e.y);
    later.push({ t: 0.55, fn: () => { if (e.dead || e.atk !== tok || e.stunT > 0 || state !== 'play') return; if (sweep) { const d = Math.hypot(P.x - e.x, P.y - e.y), da = Math.abs(angDiff(lockA, Math.atan2(P.y - e.y, P.x - e.x))); ring(e.x + Math.cos(lockA) * 80, e.y + Math.sin(lockA) * 80, 10, 120, 0.25, [1.2, 1.0, 0.7], 0.7); if (d < (bt === 'grave' ? 130 : swingR) + 40 + P.r * 0.3 && da < 0.9) hurtPlayer(e.dmg * (bt === 'grave' ? 0.9 : 1.1), e.x, e.y); }
      else { const [cx, cy] = toWorld(e, bt === 'roadkill' ? 120 : 130, 0); ring(cx, cy, 10, 90, 0.25, [2.2, 0.5, 0.4], 0.9); if (hitsP(cx, cy, swingR)) hurtPlayer(e.dmg * 1.1, e.x, e.y); }
      sfx.crunch(e.x, e.y); shake(0.2); } });
  }
  if (e.busyT > 0) return;
  // bosses only start a big move when nothing else big is going on; each one leaves an opening afterwards
  e.leapT -= dt; e.mortT -= dt; e.summonT -= dt; e.chargeT -= dt; e.scrT = (e.scrT ?? 5) - dt; e.swT = (e.swT ?? 3) - dt; e.tailT -= dt; e.k2T = (e.k2T ?? 7) - dt;
  const lead = (t, spread = 0) => { const a = rand(0, TAU), d = spread ? rand(0, spread) : 0, pv = Math.hypot(P.vx, P.vy), vk = pv > 260 ? 260 / pv : 1; return [clamp(P.x + P.vx * vk * t + Math.cos(a) * d, 3 * TILE + 20, WW - 3 * TILE - 20), clamp(P.y + P.vy * vk * t + Math.sin(a) * d, 3 * TILE + 20, WH - 3 * TILE - 20)]; };
  // ================= ABOMINATION: the acid hose, lamp-smashing leaps, egg pods =================
  if (bt === 'abom') return bossAbom(dist, dt, e, lead, ph);
  // ================= ROADKILL: hunts whatever screams, rolls tyres, throws its sign =================
  if (bt === 'roadkill') return bossRoadkill(dist, dt, e, lead, ph, spMul);
  // ================= GRAVEKEEPER: the lantern, the spade, the graves =================
  if (bt === 'grave') return bossGrave(dist, dt, e, lead, ph);
  // ================= FIRE CHIEF: the rush, the axe, the flares and extinguishers, the crew on the radio =================
  if (bt === 'chief') return bossChief(dist, dt, e, lead, ph);
  // ================= PATIENT ZERO: the scream you hide from, thrown bodies, the pole, the infection it leaves =================
  if (bt === 'pz') return bossPz(dist, dt, e, lead, ph);
}

