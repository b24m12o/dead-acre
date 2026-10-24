/* Dead Acre · Copyright (c) 2026 b24m12o. All rights reserved. See LICENSE. */
const sfx = {
  chitter(x, y, dur = 0.5) { if (!thr('chitter', 200)) return; const b = spat(x, y); let t = 0, g = 0.04; while (t < dur) { tone(rand(2200, 3000), 0.012, 'square', 0.02, 1, t, 0, b); t += g; g = Math.max(0.014, g * 0.9); } noise(0.05, 0.05, 5000, 3000, 'highpass', 0, b); }, // insect clicks speeding up: the Abomination is about to jump
  signClang(x, y) { if (!thr('clang', 120)) return; if (playR('fclang', 0.24, x, y, 0.9)) return; const b = spat(x, y); tone(620, 0.25, 'triangle', 0.06, 0.98, 0, 0, b); tone(1480, 0.4, 'sine', 0.025, 1, 0, 0, b); noise(0.04, 0.06, 6000, 3000, 'highpass', 0, b); }, // steel sign on asphalt
  tyre(x, y) { const b = spat(x, y); noise(0.5, 0.08, 320, 120, 'lowpass', 0, b); tone(70, 0.2, 'sine', 0.08, 0.7, 0, 0, b); },
  bell(x, y) { if (!thr('bell', 600)) return; const b = spat(x, y); tone(196, 2.4, 'sine', 0.05, 1, 0, 0, b); tone(541, 1.6, 'sine', 0.025, 1, 0, 0, b); tone(1058, 0.9, 'sine', 0.012, 1, 0, 0, b); noise(0.05, 0.05, 2500, 1500, 'bandpass', 0, b); }, // a cemetery bell: the Gravekeeper raises the spade
  dirt(x, y) { const b = spat(x, y); noise(0.35, 0.16, 900, 250, 'bandpass', 0, b); noise(0.2, 0.08, 3000, 1200, 'highpass', 0.04, b); },
  lampPop(x, y) { if (!thr('lpop', 90)) return; playR('fglass', 0.18, x, y, 1.1); const b = spat(x, y); tone(110, 0.3, 'sawtooth', 0.02, 0.5, 0, 500, b); noise(0.07, 0.07, 5000, 2500, 'highpass', 0, b); tone(60, 0.25, 'sine', 0.05, 0.6, 0.02, 0, b); }, // a streetlight dies: buzz, pop, thunk
  siren(x, y, n = 2, far) { if (!AC) return; const b = spat(x, y), v = far ? 0.018 : 0.032; for (let i = 0; i < n; i++) { alarmNote(470, 1080, 1.15, 'sawtooth', v, b, i * 2.3); alarmNote(1080, 470, 1.15, 'sawtooth', v, b, i * 2.3 + 1.15); alarmNote(476, 1092, 1.15, 'triangle', v * 0.6, b, i * 2.3); alarmNote(1092, 476, 1.15, 'triangle', v * 0.6, b, i * 2.3 + 1.15); } }, // a wailing siren
  creak(x, y) { const b = spat(x, y); tone(180, 0.9, 'sawtooth', 0.025, 0.7, 0, 700, b); tone(240, 0.7, 'sawtooth', 0.015, 0.8, 0.25, 900, b); noise(0.5, 0.05, 400, 150, 'lowpass', 0.6, b); }, // a crypt door dragging open
  breath(x, y, hard) { if (!thr('breath', 300)) return; const b = spat(x, y); noise(0.3, hard ? 0.07 : 0.04, 3000, 2000, 'highpass', 0, b); noise(0.45, hard ? 0.08 : 0.05, 1200, 600, 'bandpass', 0.32, b); }, // air through a mask
  axeRing(x, y) { const b = spat(x, y); tone(1850, 0.5, 'sine', 0.03, 1, 0, 0, b); tone(2760, 0.3, 'sine', 0.015, 1, 0, 0, b); noise(0.6, 0.06, 300, 1100, 'bandpass', 0, b); },
  radio(x, y) { const b = spat(x, y); noise(0.22, 0.08, 2200, 1700, 'bandpass', 0, b); tone(1000, 0.04, 'sine', 0.03, 1, 0.24, 0, b); for (let i = 0; i < 3; i++) tone(rand(300, 500), 0.07, 'sawtooth', 0.02, 1, 0.34 + i * 0.09, 1200, b); },
  flareLight(x, y) { const b = spat(x, y); noise(0.3, 0.1, 4000, 2500, 'highpass', 0, b); noise(0.9, 0.035, 6000, 3000, 'highpass', 0.28, b); },
  poleWhoosh(x, y) { const b = spat(x, y); noise(0.65, 0.08, 600, 2500, 'bandpass', 0, b); tone(2400, 0.08, 'sine', 0.015, 1.15, 0.05, 0, b); },
  grunt(x, y, hard) { if (!thr('grunt', 250)) return; const b = spat(x, y); noise(hard ? 0.45 : 0.3, hard ? 0.16 : 0.09, 520, 160, 'bandpass', 0, b); tone(rand(66, 86), hard ? 0.42 : 0.26, 'sawtooth', hard ? 0.05 : 0.03, 0.7, 0, 380, b); }, // a heavy breath out: the boss is open
  windup(x, y) { if (!thr('windup', 300)) return; const b = spat(x, y); tone(55, 0.7, 'sawtooth', 0.06, 1.75, 0, 900, b); noise(0.65, 0.07, 300, 1200, 'bandpass', 0, b); },
  molotov() { if (!thr('molo', 120)) return; noise(0.12, 0.25, 7000, 3000, 'highpass'); [2600, 3400, 4100].forEach((f, i) => tone(f * rand(0.95, 1.05), 0.12, 'sine', 0.03, 1, i * 0.02)); noise(0.9, 0.22, 300, 1600, 'bandpass', 0.04); },
  supp() { if (playS('supp', 0.7, 1, 0, 0.12)) return; if (!thr('supp', 35)) return; noise(0.07, 0.4, 1100, 380, 'bandpass'); noise(0.025, 0.16, 5200, 2400, 'highpass'); tone(rand(70, 86), 0.09, 'sine', 0.26, 0.5); tone(rand(1700, 2000), 0.014, 'square', 0.03, 0.5); noise(0.03, 0.12, 3200, 1800, 'bandpass', 0.03); }, // a suppressed shot: a cough and the slide
  smg() { if (playS('smg', 0.45, 1.05, 0, 0.2)) return; if (!thr('smg', 30)) return; noise(0.05, 0.16, 3800, 900, 'bandpass'); noise(0.015, 0.12, 8000, 4500, 'highpass'); tone(rand(140, 165), 0.05, 'square', 0.04, 0.5, 0, 1200); tone(85, 0.06, 'sine', 0.1, 0.6); },
  autoshot() { if (playS('auto', 0.65, 1.05, 0, 0.3)) return; if (!thr('autoshot', 90)) return; noise(0.34, 0.36, 2200, 100); noise(0.05, 0.22, 6000, 2500, 'highpass'); tone(66, 0.25, 'sine', 0.26, 0.45); tone(140, 0.14, 'sawtooth', 0.05, 0.4, 0, 700); },
  hunter() { if (playS('hunter', 0.85, 1, 0, 0.45) && (playS('bolt', 0.5, SBV.bolt ? 1 : 1.15, 0.42, 0.1), true)) return; if (!thr('hunter', 200)) return; noise(0.12, 0.4, 4000, 700, 'bandpass'); noise(0.03, 0.3, 9000, 5000, 'highpass'); tone(55, 0.45, 'sine', 0.32, 0.4); tone(160, 0.12, 'sawtooth', 0.07, 0.4, 0, 1200); noise(1.1, 0.09, 1600, 150, 'lowpass', 0.04);
    noise(0.05, 0.1, 3200, 1600, 'bandpass', 0.42); noise(0.05, 0.12, 4600, 2400, 'bandpass', 0.56); tone(1000, 0.03, 'square', 0.02, 0.6, 0.56); },
  lmg() { if (playS('lmg', 0.5, 0.93, 0, 0.25)) return; if (!thr('lmg', 35)) return; noise(0.08, 0.26, 2600, 500, 'bandpass'); noise(0.02, 0.16, 7000, 4000, 'highpass'); tone(rand(90, 110), 0.09, 'sawtooth', 0.05, 0.5, 0, 800); tone(58, 0.12, 'sine', 0.22, 0.55); },
  pistol() { if (playS('pistol', 0.68, 1, 0, 0.3)) return; if (!thr('pistol', 60)) return; noise(0.09, 0.22, 4200, 900, 'bandpass'); noise(0.025, 0.2, 7000, 4000, 'highpass'); tone(rand(150, 175), 0.08, 'square', 0.06, 0.45, 0, 1400); tone(95, 0.1, 'sine', 0.16, 0.5); noise(0.35, 0.05, 1500, 300, 'lowpass', 0.03); },
  rifle() { if (playS('rifle', 0.58, 1, 0, 0.25)) return; if (!thr('rifle', 40)) return; noise(0.07, 0.24, 3200, 600, 'bandpass'); noise(0.02, 0.18, 8000, 4000, 'highpass'); tone(rand(105, 125), 0.08, 'sawtooth', 0.05, 0.5, 0, 900); tone(70, 0.11, 'sine', 0.2, 0.55); noise(0.3, 0.05, 1200, 250, 'lowpass', 0.02); },
  lever() { if (SBV.lever && playS('lever', 0.8, 1, 0, 0.4)) { playS('leverAct', 0.55, 1, 0.36, 0.08); return; } if (playS('hunter', 0.7, 1.15, 0, 0.4) && (playS('pump', 0.45, 1.4, 0.3, 0.08), true)) return; if (!thr('lever', 200)) return; noise(0.1, 0.36, 3600, 700, 'bandpass'); tone(110, 0.2, 'sine', 0.14, 0.6); noise(0.05, 0.1, 3000, 1500, 'bandpass', 0.3); }, // a .30-30 crack, then the lever racks
  launcher() { if (!thr('launcher', 120)) return; noise(0.2, 0.24, 900, 160, 'lowpass'); tone(150, 0.18, 'sine', 0.14, 0.45); noise(0.05, 0.08, 2600, 1400, 'bandpass', 0.06); }, // the hollow thoomp of a 40 mm round leaving the tube
  shotgun() { if (playS('shotgun', 0.75, 1, 0, 0.35) && (playS('pump', 0.55, 1, 0.32, 0.1), true)) return; if (!thr('shotgun', 120)) return; noise(0.42, 0.42, 2200, 90); noise(0.05, 0.25, 6000, 2500, 'highpass'); tone(62, 0.3, 'sine', 0.3, 0.45); tone(130, 0.18, 'sawtooth', 0.06, 0.4, 0, 700); noise(0.7, 0.07, 900, 120, 'lowpass', 0.05);
    noise(0.05, 0.1, 3000, 1500, 'bandpass', 0.32); noise(0.04, 0.12, 4500, 2500, 'bandpass', 0.44); tone(900, 0.03, 'square', 0.02, 0.6, 0.44); },
  dry() { if (playS(DRYS[P && P.gun] || 'dryP', 0.6, 1, 0, 0) || playS('dry', 0.6, 1, 0, 0)) return; if (!thr('dry', 200)) return; noise(0.02, 0.1, 6000, 4000, 'highpass'); tone(2400, 0.02, 'square', 0.02); },
  magOut() { const r = RLD[P && P.gun]; if (r && SBV[r[0]] && playS(r[0], 0.6, 1, 0, 0.05)) return; if (playS(P && (P.gun === 'pistol' || P.gun === 'smg') ? 'magOutP' : 'magOutR', 0.6, 1, 0, 0.05)) return; noise(0.04, 0.09, 3500, 2000, 'bandpass'); tone(700, 0.03, 'square', 0.02, 0.7); },
  magIn() { const r = RLD[P && P.gun]; if (r && SBV[r[1]] && playS(r[1], 0.65, 1, 0, 0.05)) { playS(r[2], 0.6, 1, 0.16, 0.05); return; } if (playS(P && P.gun === 'pistol' ? 'magInP' : 'magInR', 0.65, 1.2, 0, 0.05) && (P && P.gun !== 'pistol' ? playS('rack', 0.6, 1, 0.12, 0.05) : true)) return; noise(0.05, 0.12, 2600, 1500, 'bandpass'); tone(500, 0.04, 'square', 0.03, 0.8); noise(0.04, 0.12, 4500, 2500, 'bandpass', 0.14); tone(1100, 0.02, 'square', 0.02, 0.6, 0.14); },
  shell() { if (P && P.gun === 'lever' && playS('shellL', 0.6, 1, 0, 0.05)) return; if (playS('shell', 0.55, 1.1, 0, 0.05)) return; noise(0.04, 0.08, 2800, 1800, 'bandpass'); tone(rand(600, 700), 0.03, 'triangle', 0.025, 0.8); },
  pump() { if (playS('pump', 0.6, 1, 0, 0.08)) return; noise(0.05, 0.12, 3000, 1500, 'bandpass'); noise(0.05, 0.14, 4500, 2500, 'bandpass', 0.11); tone(900, 0.03, 'square', 0.02, 0.6, 0.11); },
  swap() { noise(0.06, 0.06, 1800, 900, 'bandpass'); tone(1200, 0.025, 'square', 0.015, 0.8, 0.07); },
  ammo() { noise(0.08, 0.1, 2400, 1200, 'bandpass'); tone(880, 0.05, 'square', 0.02, 1, 0.03); tone(1320, 0.05, 'square', 0.02, 1, 0.08); },
  groan(x, y) { if (!thr('groan', 900)) return; if (playR('zgroan', 0.09, x, y)) return; const b = spat(x, y); tone(rand(80, 125), rand(0.6, 0.9), 'sawtooth', 0.022, rand(0.6, 0.85), 0, 420, b); noise(0.5, 0.025, 380, 140, 'bandpass', 0, b); },
  growl(x, y) { if (!thr('growl', 300)) return; if (playR('zgrowl', 0.14, x, y)) return; const b = spat(x, y); tone(rand(100, 140), 0.32, 'sawtooth', 0.035, 0.7, 0, 650, b); noise(0.3, 0.05, 700, 200, 'bandpass', 0, b); },
  wet(x, y) { if (!thr('wet', 75)) return; const b = spat(x, y); noise(0.09, 0.05, 1300, 220, 'bandpass', 0, b); tone(rand(170, 240), 0.07, 'sine', 0.025, 0.5, 0, 0, b); },
  gib(x, y) { if (!thr('gib', 90)) return; const b = spat(x, y); noise(0.35, 0.2, 1000, 80, 'lowpass', 0, b); tone(rand(65, 95), 0.25, 'sine', 0.12, 0.4, 0, 0, b); },
  fall(x, y) { if (!thr('fall', 70)) return; const b = spat(x, y), d = rand(0.18, 0.3); if (playR('fbody', 0.14, x, y, 1, d)) return; noise(0.18, 0.12, 600, 120, 'lowpass', d, b); tone(rand(62, 78), 0.16, 'sine', 0.1, 0.6, d, 0, b); }, // a body hitting the ground
  retch(x, y) { if (!thr('retch', 300)) return; if (playR('zretch', 0.11, x, y)) return; const b = spat(x, y); noise(0.45, 0.09, 700, 150, 'bandpass', 0, b); tone(150, 0.4, 'sawtooth', 0.025, 1.4, 0, 600, b); },
  inhale(x, y) { if (!thr('inhale', 300)) return; if (playR('zinhale', 0.12, x, y)) return; noise(0.4, 0.05, 2400, 800, 'bandpass', 0, spat(x, y)); },
  scream(x, y) { if (!thr('scream', 250)) return; if (playR('zscream', 0.21, x, y)) return; const b = spat(x, y); tone(rand(680, 860), 0.5, 'sawtooth', 0.03, 1.25, 0, 2600, b); noise(0.4, 0.07, 3200, 1200, 'bandpass', 0, b); },
  hit() { if (!thr('hit', 45)) return; if (playR('fhit', 0.075, undefined, undefined, rand(0.9, 1.15))) return; noise(0.05, 0.08, rand(700, 1400), 400, 'bandpass'); tone(rand(80, 100), 0.06, 'sine', 0.05, 0.6); }, // wet, not clicky; the centre moves so no two hits match
  tink(x, y) { if (!thr('tink', 70)) return; if (playR('ftink', 0.23, x, y, rand(0.95, 1.2))) return; const b = spat(x, y); tone(rand(2300, 2900), 0.12, 'sine', 0.03, 1, 0, 0, b); tone(rand(4200, 5200), 0.06, 'sine', 0.015, 1, 0, 0, b); }, // a round glancing off armour plate
  crit() { if (!thr('crit', 60)) return; tone(1500, 0.07, 'sine', 0.04, 1.5); },
  squelch() { if (!thr('squelch', 400)) return; noise(0.12, 0.045, 2600, 1500, 'bandpass'); noise(0.05, 0.03, 3200, 2200, 'bandpass', 0.18); },
  crunch(x, y) { if (!thr('crunch', 50)) return; const b = spat(x, y); noise(0.16, 0.16, 2400, 300, 'bandpass', 0, b); tone(rand(160, 220), 0.12, 'triangle', 0.05, 0.4, 0, 0, b); },
  splat() { if (!thr('splat', 60)) return; noise(0.2, 0.16, 800, 100); tone(rand(110, 160), 0.18, 'sine', 0.08, 0.4); },
  boing() { if (!thr('boing', 110)) return; tone(rand(180, 220), 0.18, 'sine', 0.05, 2.2); },
  buzz() { if (!thr('buzz', 350)) return; tone(160, 0.25, 'sawtooth', 0.018, 1.05, 0, 900); },
  pop() { if (!thr('pop', 70)) return; tone(rand(500, 600), 0.08, 'sine', 0.05, 0.5); },
  boom(x, y) { if (!thr('boom', 70)) return; const b = spat(x, y); noise(0.8, 0.4, 1800, 50, 'lowpass', 0, b); tone(75, 0.6, 'sine', 0.26, 0.35, 0, 0, b); duck(); },
  gem() { if (!thr('gem', 45)) return; tone([1318, 1568, 1760, 2093][randi(0, 3)], 0.08, 'sine', 0.035, 1.02); },
  heal() { noise(0.16, 0.08, 2600, 900, 'bandpass'); noise(0.12, 0.06, 1800, 700, 'bandpass', 0.12); tone(180, 0.12, 'sine', 0.05, 0.8, 0.05); }, // tape torn off a dressing
  level() { stab([0, 7], 0.32); },
  hurt() { noise(0.25, 0.28, 1200, 120); tone(140, 0.25, 'square', 0.05, 0.5, 0, 900); duck(); },
  dash() { noise(0.22, 0.14, 600, 4800, 'bandpass'); },
  step() { if (!thr('step', 160)) return; if (playR('fstep', 0.045, undefined, undefined, rand(0.9, 1.1))) return; noise(0.05, 0.03, 900, 300, 'bandpass'); },
  roar(x, y, bt = x === undefined ? null : (curBoss && curBoss.btype) || (boss && boss.btype)) { if (!thr('roar', 400)) return; const b = spat(x, y), k = rand(0.9, 1.1); duck(); // each boss has its own voice
    if (bt === 'roadkill') { tone(42 * k, 1.0, 'sawtooth', 0.11, 2.4, 0, 420, b); tone(44 * k, 1.0, 'square', 0.05, 2.2, 0.02, 300, b); noise(0.9, 0.22, 600, 120, 'lowpass', 0, b); for (let i = 0; i < 6; i++) noise(0.06, 0.08, 300, 100, 'lowpass', 0.15 + i * 0.11, b); return; } // a bellow like an engine revving against the limiter
    if (bt === 'grave') { tone(96 * k, 1.8, 'sine', 0.1, 0.7, 0, 0, b); tone(144 * k, 1.6, 'triangle', 0.04, 0.72, 0.05, 600, b); noise(1.6, 0.12, 700, 300, 'bandpass', 0, b); return; } // a hollow moan through a cracked chest
    if (bt === 'chief') { noise(0.9, 0.22, 1100, 500, 'bandpass', 0, b); tone(110 * k, 0.9, 'square', 0.05, 0.75, 0, 650, b); noise(0.5, 0.1, 5000, 3000, 'highpass', 0.85, b); return; } // a shout trapped in the mask, then the regulator hisses
    if (bt === 'pz') { tone(330 * k, 1.1, 'sawtooth', 0.06, 0.55, 0, 1800, b); tone(495 * k, 0.9, 'sawtooth', 0.03, 0.5, 0.03, 2200, b); noise(1.0, 0.16, 2600, 700, 'bandpass', 0, b); return; } // almost a human scream
    noise(1.1, 0.3, 380 * k, 60, 'lowpass', 0, b); tone(70 * k, 1.1, 'sawtooth', 0.09, 0.6, 0, 500, b); if (bt === 'abom') noise(0.7, 0.08, 1900, 900, 'bandpass', 0.1, b); },
  bossArmor(x, y, bt) { if (!thr('barm', 80)) return; const b = spat(x, y); // what the armour is made of, by ear
    if (bt === 'roadkill') return sfx.signClang(x, y);
    if (bt === 'chief') { tone(2200, 0.22, 'sine', 0.025, 1, 0, 0, b); tone(3300, 0.12, 'sine', 0.012, 1, 0, 0, b); noise(0.03, 0.05, 6000, 3000, 'highpass', 0, b); return; } // rounds pinging off the helmet
    if (bt === 'grave') { tone(170, 0.08, 'triangle', 0.06, 0.6, 0, 0, b); noise(0.05, 0.08, 900, 300, 'lowpass', 0, b); return; } // into thick oilskin
    if (bt === 'pz') { tone(120, 0.1, 'sine', 0.07, 0.5, 0, 0, b); noise(0.06, 0.05, 500, 200, 'lowpass', 0, b); return; } // swollen flesh soaking it up
    tone(760, 0.05, 'triangle', 0.05, 0.6, 0, 0, b); noise(0.035, 0.07, 3200, 1500, 'bandpass', 0, b); }, // chitin
  monitor(x, y) { const b = spat(x, y); tone(988, 0.09, 'sine', 0.035, 1, 0, 0, b); }, // Patient Zero's heart monitor, still clipped to it
  flatline(x, y) { if (!AC) return; alarmNote(988, 988, 2.8, 'sine', 0.03, spat(x, y)); },
  pass(x, y, n = 1) { const b = spat(x, y); for (let j = 0; j < n; j++) for (let i = 0; i < 3; i++) tone(2900 + i * 260, 0.12, 'square', 0.016, 1, j * 0.5 + i * 0.13, 4200, b); }, // the PASS alarm on a firefighter's harness: it shrieks when the wearer stops moving
  chain(x, y) { const b = spat(x, y); tone(rand(2600, 3200), 0.06, 'triangle', 0.012, 1, 0, 0, b); tone(rand(1800, 2200), 0.05, 'triangle', 0.008, 1, 0.05, 0, b); }, // the lantern swinging on its chain
  rumble(x, y) { const b = spat(x, y); tone(48, 0.7, 'sawtooth', 0.05, 1.3, 0, 260, b); noise(0.6, 0.06, 250, 90, 'lowpass', 0, b); }, // idling like an old diesel
  gurgle(x, y) { const b = spat(x, y); noise(0.4, 0.06, 320, 120, 'lowpass', 0, b); tone(62, 0.4, 'sine', 0.04, 0.7, 0, 0, b); }, // wet breathing through too many mouths
  zap() { if (!thr('zap', 60)) return; noise(0.1, 0.1, 9000, 3500, 'highpass'); },
  pulse() { },
  flashbang() { noise(0.25, 0.5, 6000, 900, 'highpass'); noise(0.5, 0.3, 1600, 80); tone(80, 0.3, 'sine', 0.25, 0.5); tone(3400, 1.4, 'sine', 0.02, 0.98, 0.05); },
  dart() { if (!thr('dart', 90)) return; noise(0.2, 0.06, 3000, 900, 'bandpass'); },
  spit(x, y) { if (!thr('spit', 80)) return; if (playR('zspit', 0.16, x, y)) return; const b = spat(x, y); tone(420, 0.12, 'sine', 0.045, 0.5, 0, 0, b); noise(0.1, 0.04, 1600, 500, 'bandpass', 0, b); },
  dig(x, y) { if (!thr('dig', 140)) return; noise(0.3, 0.1, 500, 120, 'lowpass', 0, spat(x, y)); },
  blast() { if (!thr('blast', 120)) return; noise(0.18, 0.14, 1800, 300); tone(rand(150, 180), 0.14, 'triangle', 0.08, 0.45); noise(0.04, 0.05, 6000, 2000, 'highpass'); },
  thump(x, y) { if (!thr('thump', 120)) return; const b = spat(x, y); tone(110, 0.16, 'sine', 0.16, 0.5, 0, 0, b); noise(0.1, 0.05, 900, 200, 'lowpass', 0, b); },
  boom2(x, y) { if (!thr('boom2', 60)) return; const b = spat(x, y); noise(0.45, 0.25, 1400, 60, 'lowpass', 0, b); tone(90, 0.35, 'sine', 0.16, 0.4, 0, 0, b); },
  streak() { stab([5], 0.28); },
  crate(x, y) { const b = spat(x, y); noise(0.22, 0.2, 400, 100, 'lowpass', 0, b); tone(65, 0.2, 'sine', 0.15, 0.7, 0, 0, b); noise(0.05, 0.08, 800, 600, 'bandpass', 0.015, b); }, // a wooden thud, not a boing
  elite() { stab([3, 0], 0.26); },
  beat(k) { const v = 0.05 + 0.05 * k; tone(58, 0.11, 'sine', v, 0.6); tone(52, 0.13, 'sine', v * 0.8, 0.6, 0.17); }, // a heartbeat under the mix when you are close to dying
  clear() { tone(392, 0.5, 'sine', 0.035, 1, 0, 0); tone(523, 0.7, 'sine', 0.03, 1, 0.16, 0); tone(659, 0.9, 'sine', 0.022, 1, 0.32, 0); }, // the last one down: a soft rising chord before the radio
  ting() { if (!thr('ting', 50)) return; tone(rand(2200, 2800), 0.12, 'sine', 0.03, 1.02); },
  shatter() { [1568, 2093, 2637, 3136].forEach((f, i) => tone(f * rand(0.98, 1.02), 0.5, 'sine', 0.05, 1, i * 0.03)); noise(0.5, 0.25, 9000, 1500, 'highpass'); tone(110, 0.4, 'sine', 0.2, 0.5); duck(); }
};
// soundtrack: down-tuned horror metal in E minor; layers follow the action (menu, calm, fight, boss)
