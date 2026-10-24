/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
function startEvac() {
  const [x, y] = freeSpot(420, 700);
  evac = {
    x,
    y,
    t: 0,
    land: RUN.relayOk === true ? 30 : RUN.relayOk === false ? 44 : 36,
    hold: 0,
    spawnT: 1.5,
    hx: x + 900,
    hy: y - 700,
    z: 300,
    ha: 2.48,
    leave: 0,
    gunT: 2,
    burst: 0,
    tr: [],
    said: 0,
    th0: Math.atan2(-700, 900),
  };
  for (const L of lamps) {
    if (L.bflick) L.broken = L.bflick = false;
    if (L.off) {
      L.off = 0;
      L.on = time;
    }
  }
  FOGBT = 0;
  banner('Evac inbound', 'Hold the landing zone until the bird is down', false);
  sfx.roar();
  startHeli();
  radio(RADIO.evac);
  if (RUN.relayOk !== undefined)
    radio(
      RUN.relayOk
        ? 'Hawk here. Relay is strong, I am coming straight in on your signal.'
        : 'Hawk here. No relay, I am flying blind. Give me time, nine.',
      'Hawk'
    );
}
const EVAC_ORB = 340,
  EVAC_IN = 6,
  EVAC_DOWN = 7;
function evacTarget(e) {
  // the door gunner covers the landing zone, and you if you are near it
  let best = null,
    bd = 1e12;
  for (const z of enemies) {
    if (z.dead || z.type === 'queen' || z.emerge < 0.6 || z.dying !== undefined) continue;
    const dl = d2(z.x, z.y, e.x, e.y);
    if (dl > 520 * 520) continue;
    const dp = d2(z.x, z.y, P.x, P.y),
      sc = Math.min(dl, dp * 0.6);
    if (sc < bd) {
      bd = sc;
      best = z;
    }
  }
  return best;
}
function updateEvac(dt) {
  const e = evac;
  e.t += dt;
  for (const t of e.tr) t.t -= dt;
  if (e.tr.length && e.tr[0].t <= 0) e.tr = e.tr.filter(t => t.t > 0);
  if (e.leave > 0) {
    e.leave += dt;
    e.z = Math.min(400, e.z + dt * 140);
    e.hx += dt * 420;
    e.hy -= dt * 260;
    e.ha = Math.atan2(-260, 420);
    if (e.leave > 4) {
      evac = null;
      stopHeli();
    }
    return;
  }
  // the flight: in from the edge of the map, a slow orbit over the landing zone while the gunner works, then a spiral down onto the smoke
  const px = e.hx,
    py = e.hy,
    wOrb = 0.32,
    th = e.th0 + Math.max(0, e.t - EVAC_IN) * wOrb,
    tDown = e.land - EVAC_DOWN;
  if (e.t < EVAC_IN) {
    const k = e.t / EVAC_IN,
      kk = 1 - (1 - k) ** 2,
      ox = e.x + Math.cos(e.th0) * EVAC_ORB,
      oy = e.y + Math.sin(e.th0) * EVAC_ORB;
    e.hx = lerp(e.x + 900, ox, kk);
    e.hy = lerp(e.y - 700, oy, kk);
    e.z = lerp(300, 240, kk);
  } else if (e.t < tDown) {
    e.hx = e.x + Math.cos(th) * EVAC_ORB;
    e.hy = e.y + Math.sin(th) * EVAC_ORB;
    e.z = 240 + Math.sin(e.t * 0.7) * 8;
  } else {
    const k = Math.min(1, (e.t - tDown) / EVAC_DOWN),
      kk = k * k * (3 - 2 * k),
      r = EVAC_ORB * (1 - kk);
    e.hx = e.x + Math.cos(th) * r;
    e.hy = e.y + Math.sin(th) * r;
    e.z = 240 * (1 - kk);
  }
  if (e.t < e.land) {
    const mx = e.hx - px,
      my = e.hy - py;
    if (mx * mx + my * my > 0.01) e.ha += angDiff(e.ha, Math.atan2(my, mx)) * damp(3, dt);
  }
  if (e.z < 140 && Math.random() < dt * 30 * (1 - e.z / 140)) {
    const a = rand(0, TAU),
      r = rand(30, 90);
    part({
      k: 2,
      x: e.x + Math.cos(a) * r,
      y: e.y + Math.sin(a) * r,
      vx: Math.cos(a) * rand(120, 220),
      vy: Math.sin(a) * rand(120, 220),
      life: rand(0.8, 1.4),
      max: 1.4,
      size: rand(0.6, 1),
      grow: 1.6,
      drag: 1.6,
      rot: rand(0, TAU),
      vr: rand(-2, 2),
      c: [0.42, 0.42, 0.4],
    });
  } // rotor wash
  if (e.t < e.land && Math.random() < dt * 9)
    part({
      k: 2,
      x: e.x + 40,
      y: e.y + 26,
      vx: WINDX * 1.6 + rand(-8, 8),
      vy: rand(-26, -12),
      life: rand(2, 3.2),
      max: 3.2,
      size: rand(0.6, 1),
      grow: 2,
      drag: 0.5,
      rot: rand(0, TAU),
      vr: rand(-1, 1),
      c: [0.6, 0.27, 0.25],
      wind: 1,
    }); // the flare's red smoke marks the landing zone
  if (state !== 'play') return;
  // radio and pressure: the rotors are the loudest thing in the county
  if (e.said < 1 && e.t > 10) {
    e.said = 1;
    radio(RADIO.evacGun);
  }
  if (e.said < 2 && e.t > tDown) {
    e.said = 2;
    radio(RADIO.evacDown);
    banner('Coming in to land', 'Keep the landing zone clear', false);
  }
  e.spawnT -= dt;
  if (e.spawnT <= 0 && enemies.length < 70) {
    const k = clamp(e.t / e.land, 0, 1);
    e.spawnT = lerp(0.8, 0.3, k);
    const pool =
      k < 0.33
        ? ['skitter', 'skitter', 'skitter', 'hound']
        : k < 0.66
          ? ['skitter', 'skitter', 'hound', 'mini', 'beetle']
          : ['skitter', 'skitter', 'hound', 'hound', 'mini', 'beetle', 'beetle'];
    const t = pick(pool),
      [sx, sy] = spawnPoint(380, false),
      n = t === 'skitter' ? randi(1, 2 + Math.round(k * 2)) : 1;
    for (let i = 0; i < n; i++) {
      const z = makeEnemy(t, sx + rand(-14, 14), sy + rand(-14, 14));
      if (t === 'skitter' && Math.random() < 0.4 + k * 0.3) {
        z.run = true;
        z.sp *= 2.05;
      }
    }
    dust(sx, sy, 5, 50, 1, 1);
  }
  // the door gunner: short bursts from the open side door while the bird circles
  if (e.t > EVAC_IN && e.t < e.land - 1.5) {
    e.gunT -= dt;
    if (e.gunT <= 0 && !e.burst) {
      const tg = evacTarget(e);
      if (tg) {
        e.burst = 4;
        e.bT = 0;
        e.tg = tg;
      } else e.gunT = 0.4;
    }
    if (e.burst) {
      e.bT -= dt;
      if (e.bT <= 0) {
        e.bT = 0.08;
        e.burst--;
        const tg = e.tg;
        if (!e.burst) e.gunT = rand(0.8, 1.1);
        if (tg && !tg.dead) {
          const gx = e.hx - Math.sin(e.ha) * 18,
            gy = e.hy - e.z * 0.35 + Math.cos(e.ha) * 18,
            hit = Math.random() < 0.72,
            tx = tg.x + (hit ? rand(-6, 6) : rand(-40, 40)),
            ty = tg.y + (hit ? rand(-6, 6) : rand(-40, 40));
          e.tr.push({ x0: gx, y0: gy, x1: tx, y1: ty, t: 0.07 });
          if (!playS('lmg_m', 0.2, 0.95, 0, 0.5)) noise(0.05, 0.06, 2400, 600, 'bandpass', 0, spat(e.hx, e.hy));
          if (hit) hurtEnemy(tg, 34 + wave, false, tx - gx, ty - gy, 1.2, 'gunner');
          else {
            dust(tx, ty, 2, 50, 0.6, 0.5);
            sparks(tx, ty, [1, 0.8, 0.5], 2, 140);
          }
        }
      }
    }
  }
  if (e.t >= e.land) {
    if (!e.down) {
      e.down = true;
      banner('Wheels down', 'Chopper down · get in', false);
      shake(0.15);
    }
    if (d2(P.x, P.y, e.x, e.y) < 80 * 80) {
      e.hold += dt;
      const late = buddies.find(b => !(b.down > 0) && d2(b.x, b.y, e.x, e.y) < 500 * 500);
      if (late && e.hold >= 2.4 && (e.waitT = (e.waitT || 0) + dt) < 8) e.hold = 2.4;
      /* the pilot holds for a teammate on the way */ e.waiting = late && e.hold >= 2.4 && e.waitT < 8 ? late.nm : null;
      if (e.hold >= 2.5) winRun();
    } else e.hold = Math.max(0, e.hold - dt * 0.6);
  }
}
let heliNodes = null;
function startHeli() {
  if (!AC || heliNodes) return;
  const src = AC.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = AC.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 420;
  const g = AC.createGain();
  g.gain.value = 0;
  const lfo = AC.createOscillator(),
    lg = AC.createGain();
  lfo.frequency.value = 17;
  lg.gain.value = 0.18;
  lfo.connect(lg);
  lg.connect(g.gain);
  src.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  src.start();
  lfo.start();
  heliNodes = { src, g, lfo, base: AC.createConstantSource ? null : null };
  const bias = AC.createConstantSource();
  bias.offset.value = 0.2;
  bias.connect(g.gain);
  bias.start();
  heliNodes.bias = bias;
}
function heliVolume() {
  if (!heliNodes || !evac) return;
  const d = Math.hypot(evac.hx - P.x, evac.hy - P.y);
  heliNodes.bias.offset.setTargetAtTime(clamp(1 - d / 1400, 0.05, 1) * 0.3, AC.currentTime, 0.2);
}
function stopHeli() {
  if (!heliNodes) return;
  try {
    heliNodes.src.stop();
    heliNodes.lfo.stop();
    heliNodes.bias.stop();
  } catch (e) {}
  heliNodes = null;
}
function winRun() {
  if (state !== 'play') return;

  state = 'won';
  evac.hold = 2.5;
  sfx.level();
  slowmo = 0.6;
  stab([0, 7, 12], 1.6);
  tone(41, 1.8, 'sine', 0.22, 0.7);
  noise(1.4, 0.08, 900, 120, 'lowpass'); /* wheels up: one last chord from the band */
  const inf = RUN.inf || 0;
  bump('evacs');
  meta.evacDist = meta.evacDist || {};
  meta.evacDist[RUN.district] = true;
  statMax('bestInf', inf);
  if (inf >= (meta.infMax || 0)) meta.infMax = Math.min(10, inf + 1);
  const out = RUN.aboard.slice(),
    left = buddies.slice();
  runSeeds += 40 * out.length;
  for (const b of out) bump('saved'); // every one you bring out pays
  $('wCrew').innerHTML =
    out.length || left.length
      ? (out.length
          ? `Made it out with you: <b>${out.map(b => `${b.nm} (${TRAITS[b.tr].name.toLowerCase()})`).join(', ')}</b> · +${40 * out.length} scrap.`
          : 'Nobody else made it aboard.') +
        (left.length ? ` Left behind: ${left.map(b => b.nm).join(', ')}.` : '') +
        ((RUN.lost || []).length ? ` Lost on the way: ${RUN.lost.join(', ')}.` : '')
      : (RUN.lost || []).length
        ? `Lost on the way: ${RUN.lost.join(', ')}.`
        : '';
  $('wCrew').hidden = !$('wCrew').innerHTML;
  {
    const [who, t] = storyEnd();
    $('wRadio').innerHTML = `<b>CH 9 · ${who.toUpperCase()} · LAST TRANSMISSION</b>“${t}”`;
    setTimeout(() => {
      if (state === 'won') radioVoice(t, who);
    }, 1100);
  } /* and you hear it, over the win screen */
  RUN.paid = { k: kills, w: wave, s: runSeeds };
  /* what the win already paid: endless only pays on top of this */ const earned = Math.round(
    (kills * 0.5 + wave * 10 + runSeeds + 200 + inf * 60) *
      (1 + 0.15 * (PK().vault || 0)) *
      (RUN.clean ? 1.25 : 1) *
      DIFF().seeds *
      (1 + 0.12 * inf) *
      twistK()
  );
  meta.seeds += earned;
  statMax('maxLevel', level);
  checkChal(true);
  saveMeta();
  const nb = score > rec.score;
  if (nb) {
    rec.score = score;
    store.set('rr_best', score);
  }
  $('wScore').textContent = score.toLocaleString();
  $('wKills').textContent = kills;
  $('wLevel').textContent = level;
  $('wInf').textContent = inf ? inf : 'Clean';
  $('wSeeds').innerHTML = `+${earned} scrap · <b>${meta.seeds.toLocaleString()}</b> banked`;
  renderRunReport('wBreakdown');
  $('wUnlock').innerHTML =
    bossLogHtml() +
    chalRunSummary() +
    ' ' +
    (inf + 1 <= 10 && meta.infMax === inf + 1
      ? `Infection ${inf + 1} unlocked: <b>${INFECTION[inf + 1].name}</b>. ${INFECTION[inf + 1].desc}`
      : '');
  $('wTitle').textContent = `You made it out of ${DISTRICTS[RUN.district].name}`;
  $('bossBox').hidden = true;
  setTimeout(() => {
    if (state === 'won') {
      $('won').hidden = false;
      $('wonMenuBtn').focus({ preventScroll: true });
      $('wonMenuBtn').scrollIntoView({ block: 'nearest' });
    }
  }, 1400);
}
function goEndless() {
  $('won').hidden = true;
  RUN.endless = true;
  state = 'play';
  for (const b of RUN.aboard) {
    const sp = regroupSpot(P, buddies.length) || [P.x - 50, P.y + 40];
    b.x = sp[0];
    b.y = sp[1];
    b.slot = null;
    buddies.push(b);
  }
  RUN.aboard = [];
  if (evac) evac.leave = 0.01;
  enemies.length = 0;
  interT = 3;
  nightDone = true;
  banner('Endless nights', 'You waved the chopper off. How long can you last?', true);
}
/* ---------- weather and events ---------- */
